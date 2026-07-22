import type { ContentModule } from "../types";

export function composeMarkdown(body: string, modules: ContentModule[]): string {
  const before = modules.filter((module) => module.enabled && module.placement === "before");
  const beforeTable = modules.filter((module) => module.enabled && module.placement === "before-first-table");
  const afterTable = modules.filter((module) => module.enabled && module.placement === "after-first-table");
  const after = modules.filter((module) => module.enabled && module.placement === "after");
  const tableModules = injectFirstTableModules(
    body.trim(),
    beforeTable.map((module) => module.markdown.trim()).filter(Boolean),
    afterTable.map((module) => module.markdown.trim()).filter(Boolean)
  );
  const sections = [
    ...before.map((module) => module.markdown.trim()),
    tableModules,
    ...after.map((module) => module.markdown.trim())
  ].filter(Boolean);
  return sections.join("\n\n");
}

function isTableDivider(line: string): boolean {
  const cells = line.trim().replace(/^\||\|$/g, "").split("|");
  return cells.length > 0 && cells.every((cell) => /^\s*:?-{3,}:?\s*$/.test(cell));
}

function firstTableRange(markdown: string): { start: number; end: number } | null {
  const lines = markdown.split("\n");
  let fence = "";
  for (let index = 1; index < lines.length; index += 1) {
    const fenceMatch = lines[index - 1].match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (!fence) fence = marker;
      else if (fence === marker) fence = "";
    }
    if (fence) continue;
    if (!lines[index - 1].includes("|") || !isTableDivider(lines[index])) continue;
    let end = index + 1;
    while (end < lines.length && lines[end].includes("|") && lines[end].trim()) end += 1;
    return { start: index - 1, end };
  }
  return null;
}

export function injectFirstTableModules(markdown: string, before: string[], after: string[]): string {
  if (!before.length && !after.length) return markdown;
  const lines = markdown.split("\n");
  const range = firstTableRange(markdown);
  if (!range) return [markdown, ...before, ...after].filter(Boolean).join("\n\n");
  return [
    lines.slice(0, range.start).join("\n").trimEnd(),
    ...before,
    lines.slice(range.start, range.end).join("\n"),
    ...after,
    lines.slice(range.end).join("\n").trimStart()
  ].filter(Boolean).join("\n\n");
}

export function moveModule(modules: ContentModule[], id: string, direction: -1 | 1): ContentModule[] {
  const next = modules.map((module) => ({ ...module }));
  const currentIndex = next.findIndex((module) => module.id === id);
  if (currentIndex < 0) return next;
  const targetIndex = currentIndex + direction;
  if (targetIndex < 0 || targetIndex >= next.length) return next;
  if (next[targetIndex].placement !== next[currentIndex].placement) return next;
  [next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]];
  return next;
}

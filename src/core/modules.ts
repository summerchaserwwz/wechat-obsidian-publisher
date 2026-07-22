import type { ContentModule } from "../types";

export function composeMarkdown(body: string, modules: ContentModule[]): string {
  const before = modules.filter((module) => module.enabled && module.placement === "before");
  const after = modules.filter((module) => module.enabled && module.placement === "after");
  const sections = [
    ...before.map((module) => module.markdown.trim()),
    body.trim(),
    ...after.map((module) => module.markdown.trim())
  ].filter(Boolean);
  return sections.join("\n\n");
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

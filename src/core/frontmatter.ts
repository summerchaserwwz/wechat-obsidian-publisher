import { parseYaml } from "obsidian";
import type { ArticleMeta } from "../types";

export interface ParsedDocument {
  body: string;
  meta: ArticleMeta;
}

function firstText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map(String).join("、").trim();
  return "";
}

function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~|\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseDocument(markdown: string, fallbackTitle: string, defaultAuthor: string): ParsedDocument {
  let body = markdown;
  let data: Record<string, unknown> = {};
  const match = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (match) {
    body = markdown.slice(match[0].length);
    try {
      data = (parseYaml(match[1]) as Record<string, unknown> | null) ?? {};
    } catch {
      data = {};
    }
  }

  const firstHeading = body.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "";
  const digest = firstText(data.digest ?? data.description ?? data.summary) || stripMarkdown(body).slice(0, 120);
  return {
    body,
    meta: {
      title: firstText(data.title) || firstHeading || fallbackTitle,
      author: firstText(data.author) || defaultAuthor,
      digest,
      cover: firstText(data.cover ?? data.banner),
      sourceUrl: firstText(data.source_url ?? data.sourceUrl)
    }
  };
}

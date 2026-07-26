import hljs from "highlight.js/lib/common";
import katex from "katex";
import { Marked } from "marked";
import mermaid from "mermaid";
import type { ArticleLayoutTuning, ContentModule, PublisherTemplate, RenderedArticle } from "../types";
import { parseDocument } from "./frontmatter";
import { applyLayoutTuning, DEFAULT_MOBILE_LAYOUT_TUNING } from "./layout-tuning";
import { composeMarkdown } from "./modules";
import { applyTemplateStyles } from "./template-style-engine";

export interface RenderInput {
  markdown: string;
  fallbackTitle: string;
  defaultAuthor: string;
  template: PublisherTemplate;
  modules: ContentModule[];
  layoutTuning?: ArticleLayoutTuning | null;
  resolvePreviewImage?: (source: string) => string | null;
}

function normalizeObsidianEmbeds(markdown: string): string {
  return markdown.replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, source: string, alt: string | undefined) => {
    return `![${alt ?? ""}](${encodeURI(source.trim())})`;
  });
}

function renderMath(markdown: string, warnings: string[]): string {
  let next = markdown.replace(/\$\$\s*([\s\S]+?)\s*\$\$/g, (_match, expression: string) => {
    try {
      return `\n<section data-wop-math="block" style="overflow-x:auto;text-align:center;margin:1.5em 0">${katex.renderToString(expression, { displayMode: true, throwOnError: false })}</section>\n`;
    } catch {
      warnings.push("有一个块级公式未能渲染。");
      return `\n<pre>${expression}</pre>\n`;
    }
  });
  next = next.replace(/(?<!\\)\$([^$\n]+?)\$/g, (_match, expression: string) => {
    if (!/[\\^_{}=+*/<>]/.test(expression)) return _match;
    try {
      return katex.renderToString(expression, { displayMode: false, throwOnError: false });
    } catch {
      warnings.push("有一个行内公式未能渲染。");
      return expression;
    }
  });
  return next;
}

function applyTemplate(root: HTMLElement, template: PublisherTemplate): void {
  applyTemplateStyles(root, template);
  root.dataset.template = template.id;
  root.dataset.themeGroup = template.group;
}

function enhanceStructure(root: HTMLElement, resolvePreviewImage?: (source: string) => string | null): string[] {
  const sources: string[] = [];
  root.querySelectorAll<HTMLElement>("pre code").forEach((code) => {
    const language = [...code.classList].find((name) => name.startsWith("language-"))?.slice(9);
    if (language === "mermaid") return;
    const text = code.textContent ?? "";
    try {
      code.innerHTML = language && hljs.getLanguage(language)
        ? hljs.highlight(text, { language }).value
        : hljs.highlightAuto(text).value;
      code.classList.add("hljs");
    } catch {
      code.textContent = text;
    }
  });

  root.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
    const source = decodeURI(image.getAttribute("src") ?? "");
    if (!source) return;
    image.dataset.source = source;
    if (!sources.includes(source)) sources.push(source);
    const preview = resolvePreviewImage?.(source);
    if (preview) image.src = preview;
    const parent = image.parentElement;
    if (parent?.tagName === "P" && parent.childNodes.length === 1) {
      const figure = document.createElement("figure");
      parent.replaceWith(figure);
      figure.appendChild(image);
      if (image.alt) {
        const caption = document.createElement("figcaption");
        caption.textContent = image.alt;
        figure.appendChild(caption);
      }
    }
  });
  return sources;
}

let mermaidInitialized = false;
async function renderMermaid(root: HTMLElement, warnings: string[]): Promise<void> {
  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "neutral",
      flowchart: { htmlLabels: false }
    });
    mermaidInitialized = true;
  }
  const blocks = [...root.querySelectorAll<HTMLElement>("code.language-mermaid")];
  for (const [index, block] of blocks.entries()) {
    try {
      const result = await mermaid.render(`wop-diagram-${Date.now()}-${index}`, block.textContent ?? "");
      const container = document.createElement("section");
      container.className = "wop-mermaid";
      container.dataset.wopMermaid = "true";
      container.style.margin = "1.6em 0";
      container.style.textAlign = "center";
      container.innerHTML = result.svg;
      block.closest("pre")?.replaceWith(container);
    } catch {
      warnings.push("有一个 Mermaid 图表未能渲染，已保留源码。");
    }
  }
}

export class RenderEngine {
  private readonly parser = new Marked({ gfm: true, breaks: false });

  async render(input: RenderInput): Promise<RenderedArticle> {
    const warnings: string[] = [];
    const parsed = parseDocument(input.markdown, input.fallbackTitle, input.defaultAuthor);
    const normalized = normalizeObsidianEmbeds(composeMarkdown(parsed.body, input.modules));
    const withMath = renderMath(normalized, warnings);
    const rawHtml = await this.parser.parse(withMath);
    const root = document.createElement("section");
    root.className = "wop-article";
    root.innerHTML = rawHtml;
    const imageSources = enhanceStructure(root, input.resolvePreviewImage);
    await renderMermaid(root, warnings);
    applyTemplate(root, input.template);
    // `undefined` means the plugin default: compact, phone-safe output.
    // `null` is an explicit user choice to retain the upstream source layout.
    const layoutTuning = input.layoutTuning === undefined ? DEFAULT_MOBILE_LAYOUT_TUNING : input.layoutTuning;
    if (layoutTuning) applyLayoutTuning(root, layoutTuning);
    return { html: root.outerHTML, meta: parsed.meta, imageSources, warnings };
  }
}

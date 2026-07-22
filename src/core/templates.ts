import type { PublisherTemplate, TemplateTokens } from "../types";
import { MD2_THEME_DEFINITIONS } from "./md2-theme-catalog";
import { compileTheme } from "./theme-compiler";

export const BUILT_IN_TEMPLATES: PublisherTemplate[] = MD2_THEME_DEFINITIONS.map(compileTheme);

const ALLOWED_STYLE_PROPERTIES = new Set([
  "color", "background", "backgroundColor", "backgroundImage", "fontFamily", "fontSize", "fontWeight",
  "fontStyle", "lineHeight", "letterSpacing", "textAlign", "textDecoration", "textIndent", "textTransform",
  "margin", "marginTop", "marginRight", "marginBottom", "marginLeft", "padding", "paddingTop", "paddingRight",
  "paddingBottom", "paddingLeft", "border", "borderTop", "borderRight", "borderBottom", "borderLeft",
  "borderColor", "borderStyle", "borderWidth", "borderRadius", "boxSizing", "boxShadow", "display", "width",
  "minWidth", "maxWidth", "height", "minHeight", "maxHeight", "overflow", "overflowX", "whiteSpace",
  "wordBreak", "overflowWrap", "verticalAlign", "opacity", "borderCollapse", "listStyleType"
]);

const SAFE_SELECTOR = /^(body|[a-z][a-z0-9]*(?:\s+[a-z][a-z0-9]*)?(?:,\s*[a-z][a-z0-9]*(?:\s+[a-z][a-z0-9]*)?)*)$/i;

function text(value: unknown, fallback: string, maxLength = 160): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : fallback;
}

function safeColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\)|[a-z]+)$/i.test(trimmed) ? trimmed : fallback;
}

function sanitizeTokens(value: unknown, accent: string, canvas: string): TemplateTokens {
  const tokens = value && typeof value === "object" ? value as Partial<TemplateTokens> : {};
  return {
    variant: text(tokens.variant, "custom", 48),
    style: typeof tokens.style === "string" ? tokens.style.slice(0, 48) : undefined,
    series: typeof tokens.series === "string" ? tokens.series.slice(0, 48) : undefined,
    color: typeof tokens.color === "string" ? tokens.color.slice(0, 48) : undefined,
    shape: typeof tokens.shape === "string" ? tokens.shape.slice(0, 48) : undefined,
    accent,
    accentSoft: safeColor(tokens.accentSoft, accent),
    tint: safeColor(tokens.tint, canvas),
    heading: safeColor(tokens.heading, "#1f2933"),
    body: safeColor(tokens.body, "#2d3338"),
    link: safeColor(tokens.link, accent),
    strong: safeColor(tokens.strong, accent),
    surface: typeof tokens.surface === "string" ? tokens.surface.slice(0, 80) : undefined,
    gradient: typeof tokens.gradient === "string" ? tokens.gradient.slice(0, 180) : undefined,
    glow: typeof tokens.glow === "string" ? tokens.glow.slice(0, 180) : undefined
  };
}

export function findTemplate(id: string, customTemplates: PublisherTemplate[]): PublisherTemplate {
  return [...customTemplates, ...BUILT_IN_TEMPLATES].find((template) => template.id === id) ?? BUILT_IN_TEMPLATES[0];
}

export function cloneTemplate(template: PublisherTemplate, name?: string): PublisherTemplate {
  return {
    ...structuredClone(template),
    id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: name ?? `${template.name} 副本`,
    source: "custom",
    group: "用户模板",
    sourceLabel: "用户模板",
    license: "user-defined",
    tags: [...new Set([...(template.tags ?? []), "用户模板"])]
  };
}

export function validateTemplate(candidate: unknown): PublisherTemplate {
  if (!candidate || typeof candidate !== "object") throw new Error("模板必须是 JSON 对象。");
  const value = candidate as Partial<PublisherTemplate>;
  if (!value.id || !value.name || !value.accent || !value.canvas || !value.styles) {
    throw new Error("模板缺少 id、name、accent、canvas 或 styles。");
  }
  const accent = safeColor(value.accent, "#356348");
  const canvas = safeColor(value.canvas, "#f3f0e9");
  const sanitizedStyles: PublisherTemplate["styles"] = {};
  for (const [selector, declarations] of Object.entries(value.styles)) {
    if (!SAFE_SELECTOR.test(selector) || !declarations || typeof declarations !== "object") continue;
    sanitizedStyles[selector] = {};
    for (const [property, raw] of Object.entries(declarations)) {
      if (ALLOWED_STYLE_PROPERTIES.has(property) && typeof raw === "string" && raw.length <= 240 && !/(?:url|expression)\s*\(/i.test(raw)) {
        sanitizedStyles[selector][property] = raw;
      }
    }
  }
  if (!Object.keys(sanitizedStyles).length) throw new Error("模板没有可用的样式规则。");
  return {
    id: text(value.id, `custom-${Date.now().toString(36)}`, 80).replace(/[^a-z0-9_-]/gi, "-"),
    name: text(value.name, "用户模板", 64),
    description: text(value.description, "用户自定义模板", 180),
    source: "custom",
    group: "用户模板",
    sourceLabel: "用户模板",
    license: "user-defined",
    upstream: typeof value.upstream === "string" ? value.upstream.slice(0, 240) : undefined,
    tags: Array.isArray(value.tags) ? value.tags.filter((tag): tag is string => typeof tag === "string").slice(0, 16) : ["用户模板"],
    accent,
    canvas,
    tokens: sanitizeTokens(value.tokens, accent, canvas),
    styles: sanitizedStyles
  };
}

export function parseTemplateBundle(json: string): PublisherTemplate[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch {
    throw new Error("JSON 文件无法解析，请检查格式。");
  }
  const candidates = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as { templates?: unknown }).templates)
      ? (parsed as { templates: unknown[] }).templates
      : [parsed];
  if (!candidates.length) throw new Error("JSON 文件中没有模板。");
  return candidates.map(validateTemplate);
}

export function serializeTemplateBundle(templates: PublisherTemplate[]): string {
  return JSON.stringify({
    format: "wechat-obsidian-publisher.templates",
    version: 1,
    exportedAt: new Date().toISOString(),
    templates
  }, null, 2);
}

export function makeUniqueTemplate(template: PublisherTemplate, existingIds: Set<string>): PublisherTemplate {
  const next = structuredClone(template);
  const base = next.id.replace(/^custom-/, "") || "template";
  let id = next.id.startsWith("custom-") ? next.id : `custom-${base}`;
  let suffix = 2;
  while (existingIds.has(id)) {
    id = `custom-${base}-${suffix}`;
    suffix += 1;
  }
  next.id = id;
  next.source = "custom";
  next.group = "用户模板";
  next.sourceLabel = "用户模板";
  next.license = "user-defined";
  existingIds.add(id);
  return next;
}

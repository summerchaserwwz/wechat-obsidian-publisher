import type { PublisherTemplate } from "../types";

const baseStyles: PublisherTemplate["styles"] = {
  body: {
    color: "#26312d",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: "16px",
    lineHeight: "1.85",
    letterSpacing: "0.02em",
    padding: "28px 34px 52px",
    backgroundColor: "#ffffff",
    boxSizing: "border-box"
  },
  p: { margin: "1.15em 0", textAlign: "justify" },
  h1: { fontSize: "28px", lineHeight: "1.35", margin: "0 0 1.4em", fontWeight: "750" },
  h2: { fontSize: "22px", lineHeight: "1.45", margin: "2.3em 0 1em", fontWeight: "750" },
  h3: { fontSize: "18px", lineHeight: "1.5", margin: "1.8em 0 0.8em", fontWeight: "700" },
  blockquote: { margin: "1.4em 0", padding: "0.9em 1.1em", borderRadius: "10px" },
  strong: { fontWeight: "750" },
  a: { textDecoration: "none" },
  img: { display: "block", maxWidth: "100%", height: "auto", margin: "1.5em auto", borderRadius: "10px" },
  figure: { margin: "1.6em 0" },
  figcaption: { marginTop: "0.6em", color: "#7a8580", fontSize: "13px", textAlign: "center" },
  pre: { margin: "1.4em 0", padding: "18px", borderRadius: "10px", overflowX: "auto", lineHeight: "1.65" },
  code: { fontFamily: "'SFMono-Regular', Consolas, monospace", fontSize: "0.88em" },
  "p code, li code": { padding: "0.18em 0.38em", borderRadius: "4px" },
  ul: { paddingLeft: "1.35em", margin: "1.1em 0" },
  ol: { paddingLeft: "1.35em", margin: "1.1em 0" },
  li: { margin: "0.48em 0" },
  hr: { border: "none", margin: "2.2em auto", width: "64px" },
  table: { width: "100%", borderCollapse: "collapse", margin: "1.5em 0", fontSize: "14px" },
  "th, td": { padding: "9px 10px", textAlign: "left" }
};

function withStyles(
  identity: Omit<PublisherTemplate, "styles">,
  styles: PublisherTemplate["styles"]
): PublisherTemplate {
  return {
    ...identity,
    styles: Object.fromEntries(
      [...new Set([...Object.keys(baseStyles), ...Object.keys(styles)])].map((selector) => [
        selector,
        { ...(baseStyles[selector] ?? {}), ...(styles[selector] ?? {}) }
      ])
    )
  };
}

export const BUILT_IN_TEMPLATES: PublisherTemplate[] = [
  withStyles(
    {
      id: "md2-forest",
      name: "MD2 森林绿",
      description: "纸张感与克制的深绿色，适合研究和长文",
      source: "md2-inspired",
      accent: "#356348",
      canvas: "#f3f0e9"
    },
    {
      body: { color: "#26342d" },
      h1: { color: "#1d3326" },
      h2: {
        color: "#ffffff",
        backgroundColor: "#356348",
        padding: "0.3em 0.9em",
        borderRadius: "18px",
        textAlign: "center"
      },
      h3: { color: "#356348", borderBottom: "1px solid #b9cbbb", paddingBottom: "0.35em" },
      blockquote: { color: "#284534", backgroundColor: "#eef5ef", borderLeft: "6px solid #356348" },
      strong: { color: "#356348" },
      a: { color: "#356348", borderBottom: "1px solid #9ab69f" },
      pre: { color: "#e8f2eb", backgroundColor: "#203229" },
      "p code, li code": { color: "#315c43", backgroundColor: "#edf4ef" },
      hr: { borderTop: "3px solid #356348" },
      table: { border: "1px solid #c9d7cb" },
      "th, td": { border: "1px solid #c9d7cb" },
      th: { color: "#ffffff", backgroundColor: "#356348" }
    }
  ),
  withStyles(
    {
      id: "md2-mint",
      name: "MD2 薄荷",
      description: "轻盈的薄荷色块，适合教程和产品说明",
      source: "md2-inspired",
      accent: "#2f8f83",
      canvas: "#edf7f5"
    },
    {
      body: { color: "#243c39" },
      h1: { color: "#163d37" },
      h2: { color: "#18675e", backgroundColor: "#dff3ee", padding: "0.55em 0.8em", borderRadius: "8px" },
      h3: { color: "#2f8f83" },
      blockquote: { color: "#285a54", backgroundColor: "#ebf8f5", borderLeft: "5px solid #56aa9d" },
      strong: { color: "#247b70" },
      a: { color: "#247b70", borderBottom: "1px solid #7fc2b8" },
      pre: { color: "#dff8f2", backgroundColor: "#153e38" },
      "p code, li code": { color: "#246f65", backgroundColor: "#e1f4f0" },
      hr: { borderTop: "2px solid #65b7aa" },
      "th, td": { border: "1px solid #b9dcd6" },
      th: { backgroundColor: "#dff3ee" }
    }
  ),
  withStyles(
    {
      id: "wenyan-redline",
      name: "文颜 红线",
      description: "参考 Wenyan Pie 的节奏重新设计，强调标题层级",
      source: "wenyan-inspired",
      accent: "#b33a3a",
      canvas: "#f7f1eb"
    },
    {
      body: { color: "#342b29" },
      h1: { color: "#852f2f", textAlign: "center" },
      h2: { color: "#9d3030", borderLeft: "8px solid #b33a3a", padding: "0.15em 0 0.15em 0.75em" },
      h3: { color: "#a33b32", borderBottom: "2px solid #dca39b", paddingBottom: "0.32em" },
      blockquote: { color: "#65413c", backgroundColor: "#fbf1ef", borderLeft: "5px solid #c75c50" },
      strong: { color: "#a33834" },
      a: { color: "#a33834", borderBottom: "1px solid #d9a29b" },
      pre: { color: "#f8eae6", backgroundColor: "#3b2725" },
      "p code, li code": { color: "#a13a35", backgroundColor: "#faece9" },
      hr: { borderTop: "2px solid #b33a3a" },
      "th, td": { border: "1px solid #e0beb8" },
      th: { color: "#ffffff", backgroundColor: "#b33a3a" }
    }
  ),
  withStyles(
    {
      id: "wenyan-minimal",
      name: "文颜 留白",
      description: "参考 Wenyan 的内联样式策略，突出阅读留白",
      source: "wenyan-inspired",
      accent: "#315d8a",
      canvas: "#f2f4f7"
    },
    {
      body: { color: "#242a30", lineHeight: "1.95", padding: "36px 42px 60px" },
      h1: { color: "#17293b", textAlign: "center", marginBottom: "2em" },
      h2: { color: "#244f78", borderBottom: "1px solid #95acc1", paddingBottom: "0.42em" },
      h3: { color: "#315d8a" },
      blockquote: { color: "#536474", backgroundColor: "#f4f7fa", borderLeft: "4px solid #7695b2" },
      strong: { color: "#244f78" },
      a: { color: "#315d8a", borderBottom: "1px solid #9fb3c7" },
      pre: { color: "#eaf1f7", backgroundColor: "#1e2b38" },
      "p code, li code": { color: "#315d8a", backgroundColor: "#edf2f7" },
      hr: { borderTop: "1px solid #7695b2" },
      "th, td": { border: "1px solid #c7d2dc" },
      th: { backgroundColor: "#edf2f7" }
    }
  )
];

const ALLOWED_STYLE_PROPERTIES = new Set([
  "color", "backgroundColor", "fontFamily", "fontSize", "fontWeight", "fontStyle", "lineHeight",
  "letterSpacing", "textAlign", "textDecoration", "margin", "marginTop", "marginRight", "marginBottom",
  "marginLeft", "padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "border",
  "borderTop", "borderRight", "borderBottom", "borderLeft", "borderRadius", "boxSizing", "display",
  "width", "maxWidth", "height", "overflowX", "whiteSpace", "wordBreak", "verticalAlign"
]);

export function findTemplate(id: string, customTemplates: PublisherTemplate[]): PublisherTemplate {
  return [...customTemplates, ...BUILT_IN_TEMPLATES].find((template) => template.id === id) ?? BUILT_IN_TEMPLATES[0];
}

export function cloneTemplate(template: PublisherTemplate, name?: string): PublisherTemplate {
  return {
    ...structuredClone(template),
    id: `custom-${Date.now().toString(36)}`,
    name: name ?? `${template.name} 副本`,
    source: "custom"
  };
}

export function validateTemplate(candidate: unknown): PublisherTemplate {
  if (!candidate || typeof candidate !== "object") throw new Error("模板必须是 JSON 对象。");
  const value = candidate as Partial<PublisherTemplate>;
  if (!value.id || !value.name || !value.accent || !value.canvas || !value.styles) {
    throw new Error("模板缺少 id、name、accent、canvas 或 styles。");
  }
  const sanitizedStyles: PublisherTemplate["styles"] = {};
  for (const [selector, declarations] of Object.entries(value.styles)) {
    if (!declarations || typeof declarations !== "object") continue;
    sanitizedStyles[selector] = {};
    for (const [property, raw] of Object.entries(declarations)) {
      if (ALLOWED_STYLE_PROPERTIES.has(property) && typeof raw === "string") {
        sanitizedStyles[selector][property] = raw;
      }
    }
  }
  return {
    id: value.id,
    name: value.name,
    description: value.description ?? "用户自定义模板",
    source: "custom",
    accent: value.accent,
    canvas: value.canvas,
    styles: sanitizedStyles
  };
}

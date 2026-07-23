import type { PublisherTemplate } from "../types";
import type { Md2ThemeDefinition } from "./md2-theme-catalog";
import { WENYAN_THEME_CSS, isWenyanThemeVariant } from "./wenyan-theme-css";

type StyleMap = PublisherTemplate["styles"];

const baseStyles: StyleMap = {
  body: {
    color: "#2d3338",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    fontSize: "16px",
    lineHeight: "1.78",
    letterSpacing: "0",
    wordSpacing: "0",
    padding: "28px 24px 48px",
    backgroundColor: "#ffffff",
    boxSizing: "border-box"
  },
  p: { margin: "0 0 1em", textAlign: "left", letterSpacing: "0", wordSpacing: "0" },
  h1: { fontSize: "27px", lineHeight: "1.4", margin: "0 0 1.3em", fontWeight: "750", textAlign: "left" },
  h2: { fontSize: "21px", lineHeight: "1.45", margin: "1.9em 0 0.72em", fontWeight: "750", textAlign: "left" },
  h3: { fontSize: "18px", lineHeight: "1.5", margin: "1.5em 0 0.58em", fontWeight: "700", textAlign: "left" },
  h4: { fontSize: "16px", lineHeight: "1.5", margin: "1.3em 0 0.45em", fontWeight: "700", textAlign: "left" },
  blockquote: { margin: "1.25em 0", padding: "0.8em 1em", borderRadius: "6px", textAlign: "left" },
  "blockquote p": { margin: "0.35em 0", textAlign: "left", letterSpacing: "0", wordSpacing: "0" },
  strong: { fontWeight: "750" },
  a: { textDecoration: "none" },
  img: { display: "block", maxWidth: "100%", height: "auto", margin: "1.5em auto", borderRadius: "8px" },
  figure: { margin: "1.6em 0" },
  figcaption: { marginTop: "0.6em", color: "#7a8580", fontSize: "13px", textAlign: "center" },
  pre: { margin: "1.4em 0", padding: "18px", borderRadius: "8px", overflowX: "auto", lineHeight: "1.65" },
  code: { fontFamily: "'SFMono-Regular', Consolas, monospace", fontSize: "0.88em" },
  "p code, li code": { padding: "0.18em 0.38em", borderRadius: "4px" },
  ul: { paddingLeft: "1.35em", margin: "1em 0" },
  ol: { paddingLeft: "1.35em", margin: "1em 0" },
  li: { margin: "0.42em 0", textAlign: "left", letterSpacing: "0", wordSpacing: "0" },
  hr: { border: "none", margin: "2em 0", width: "64px" },
  table: { width: "100%", borderCollapse: "collapse", margin: "1.5em 0", fontSize: "14px" },
  "th, td": { padding: "9px 10px", textAlign: "left" }
};

const leftReadingStyles: StyleMap = {
  p: { textAlign: "left", letterSpacing: "0", wordSpacing: "0" },
  h1: { textAlign: "left" },
  h2: { textAlign: "left" },
  h3: { textAlign: "left" },
  h4: { textAlign: "left" },
  blockquote: { textAlign: "left" },
  "blockquote p": { textAlign: "left", letterSpacing: "0", wordSpacing: "0" },
  li: { textAlign: "left", letterSpacing: "0", wordSpacing: "0" },
  "th, td": { textAlign: "left" }
};

function mergeStyles(...maps: StyleMap[]): StyleMap {
  const selectors = new Set(maps.flatMap((map) => Object.keys(map)));
  return Object.fromEntries([...selectors].map((selector) => [
    selector,
    Object.assign({}, ...maps.map((map) => map[selector] ?? {}))
  ]));
}

function genericStyles(theme: Md2ThemeDefinition): StyleMap {
  const t = theme.tokens;
  return {
    body: { color: t.body },
    h1: { color: t.heading },
    h2: { color: t.heading, borderLeft: `6px solid ${t.accent}`, paddingLeft: "0.72em" },
    h3: { color: t.accent, borderBottom: `1px solid ${t.accentSoft}`, paddingBottom: "0.35em" },
    h4: { color: t.heading },
    blockquote: { color: t.heading, backgroundColor: t.tint, borderLeft: `5px solid ${t.accent}` },
    strong: { color: t.strong },
    a: { color: t.link, borderBottom: `1px solid ${t.accentSoft}` },
    pre: { color: "#edf7f3", backgroundColor: t.heading },
    "p code, li code": { color: t.strong, backgroundColor: t.tint },
    hr: { borderTop: `2px solid ${t.accent}` },
    table: { border: `1px solid ${t.accentSoft}` },
    "th, td": { border: `1px solid ${t.accentSoft}` },
    th: { color: t.heading, backgroundColor: t.tint }
  };
}

function md2CatalogStyles(theme: Md2ThemeDefinition): StyleMap {
  const t = theme.tokens;
  switch (t.series) {
    case "minimal":
      return {
        body: { lineHeight: "1.92" },
        h1: { textAlign: "center", color: t.heading },
        h2: { color: t.accent, borderLeft: "none", borderBottom: `2px solid ${t.accent}`, padding: "0 0 0.38em" },
        h3: { color: t.heading, borderBottom: "none" },
        blockquote: { backgroundColor: "#ffffff", borderLeft: `3px solid ${t.accent}`, borderRadius: "0" }
      };
    case "focus":
      return {
        h1: { textAlign: "center", letterSpacing: "0.08em" },
        h2: { color: t.heading, textAlign: "center", borderLeft: "none", borderTop: `2px solid ${t.accent}`, borderBottom: `2px solid ${t.accent}`, padding: "0.48em 0" },
        h3: { color: t.accent, textAlign: "center", borderBottom: "none" },
        blockquote: { textAlign: "center", borderLeft: "none", borderTop: `1px solid ${t.accentSoft}`, borderBottom: `1px solid ${t.accentSoft}` }
      };
    case "elegant":
      return {
        h1: { color: t.heading, textAlign: "center" },
        h2: { color: t.heading, backgroundColor: t.tint, borderLeft: `8px solid ${t.accent}`, padding: "0.5em 0.8em", borderRadius: "0 8px 8px 0" },
        h3: { color: t.accent, borderLeft: `4px solid ${t.accentSoft}`, borderBottom: "none", padding: "0.2em 0 0.2em 0.65em" },
        blockquote: { backgroundColor: t.tint, borderLeft: `6px solid ${t.accent}`, boxShadow: `0 5px 18px ${t.accentSoft}` }
      };
    case "bold":
      return {
        h1: { color: t.heading, textAlign: "center" },
        h2: { color: "#ffffff", backgroundColor: t.accent, borderLeft: "none", padding: "0.48em 0.82em", borderRadius: "10px", boxShadow: `4px 4px 0 ${t.accentSoft}` },
        h3: { color: t.heading, backgroundColor: t.tint, borderBottom: "none", padding: "0.35em 0.65em", borderRadius: "6px" },
        blockquote: { color: t.heading, backgroundColor: t.tint, border: `2px solid ${t.accent}`, boxShadow: `3px 3px 0 ${t.accentSoft}` },
        th: { color: "#ffffff", backgroundColor: t.accent }
      };
    case "featured":
      return {
        h1: { textAlign: "center" },
        h2: { color: "#ffffff", backgroundColor: t.accent, borderLeft: "none", padding: "0.35em 0.8em", borderRadius: "3px" },
        h3: { color: t.accent, borderBottom: `2px solid ${t.accent}` }
      };
    default:
      return {
        h1: { textAlign: "center" },
        h2: { color: "#ffffff", backgroundColor: t.accent, borderLeft: "none", padding: "0.38em 0.8em", borderRadius: "18px", textAlign: "center" },
        h3: { color: t.accent, borderBottom: `1px solid ${t.accentSoft}` }
      };
  }
}

function wenyanStyles(theme: Md2ThemeDefinition): StyleMap {
  const t = theme.tokens;
  const variant = t.variant;
  const common: StyleMap = { body: { lineHeight: "1.9" }, h1: { textAlign: "center" } };
  if (variant === "pie") return mergeStyles(common, {
    h2: { color: t.accent, borderLeft: `8px solid ${t.accent}`, padding: "0.12em 0 0.12em 0.72em" },
    h3: { color: t.accent, borderBottom: `2px dashed ${t.accentSoft}` },
    blockquote: { backgroundColor: t.tint, borderLeft: `5px solid ${t.accent}` }
  });
  if (variant === "lapis") return mergeStyles(common, {
    h2: { color: "#ffffff", backgroundColor: t.accent, borderLeft: "none", borderRadius: "20px", padding: "0.28em 0.9em", textAlign: "center" },
    h3: { color: t.accent, borderBottom: `1px solid ${t.accentSoft}` }
  });
  if (variant === "orangeheart") return mergeStyles(common, {
    h2: { color: "#ffffff", backgroundColor: t.accent, borderLeft: "none", display: "inline-block", padding: "0.25em 0.72em", borderRadius: "4px" },
    h3: { color: t.accent, borderBottom: `2px solid ${t.accent}` }
  });
  if (variant === "rainbow") return mergeStyles(common, {
    h2: { color: t.heading, backgroundColor: t.tint, border: `2px solid ${t.accent}`, borderRadius: "8px", padding: "0.45em 0.75em" },
    blockquote: { borderLeft: `6px solid ${t.accentSoft}`, backgroundColor: t.tint }
  });
  if (variant === "phycat") return mergeStyles(common, {
    h2: { color: "#ffffff", backgroundImage: `linear-gradient(90deg, ${t.accent}, ${t.accentSoft})`, borderLeft: "none", padding: "0.42em 0.82em", borderRadius: "8px" }
  });
  if (variant === "medium_default") return mergeStyles(common, {
    body: { fontFamily: "Georgia, 'Times New Roman', 'Songti SC', serif", lineHeight: "1.95" },
    h2: { borderLeft: "none", borderBottom: `1px solid ${t.accentSoft}`, paddingBottom: "0.35em" }
  });
  return mergeStyles(common, {
    h2: { color: t.heading, borderLeft: `5px solid ${t.accent}`, paddingLeft: "0.7em" },
    blockquote: { backgroundColor: t.tint, borderLeft: `4px solid ${t.accent}` }
  });
}

function sourceThemeStyles(theme: Md2ThemeDefinition): StyleMap {
  const t = theme.tokens;
  const style = t.style ?? "default";
  if (t.variant === "markdown-nice" || t.variant === "mdnice" || t.variant === "mdnice-forest" || style === "mdnice-blue") {
    return {
      h1: { textAlign: "center", color: t.heading },
      h2: { color: t.accent, borderLeft: "none", borderBottom: `2px solid ${t.accent}`, paddingBottom: "0.38em" },
      h3: { color: t.heading, borderBottom: `1px solid ${t.accentSoft}` },
      blockquote: { color: t.heading, backgroundColor: t.tint, borderLeft: `5px solid ${t.accent}` }
    };
  }
  if (t.variant === "doocs-md" || t.variant === "doocs" || t.variant === "doocs-blue" || style === "doocs-grace") {
    return {
      h1: { textAlign: "center", borderBottom: `2px solid ${t.accent}`, paddingBottom: "0.45em" },
      h2: { color: "#ffffff", backgroundColor: t.accent, borderLeft: "none", padding: "0.35em 0.78em", borderRadius: style === "grace" || style === "doocs-grace" ? "18px" : "3px" },
      h3: { color: t.accent, borderBottom: `1px dashed ${t.accentSoft}` }
    };
  }
  if (t.variant === "wemd" || style === "wemd-aurora") {
    const square = ["bauhaus", "neo-brutalism", "receipt"].includes(style);
    return {
      body: { fontFamily: style === "academic-paper" ? "Georgia, 'Songti SC', serif" : baseStyles.body.fontFamily },
      h1: { textAlign: "center", color: t.heading },
      h2: { color: square ? t.heading : "#ffffff", backgroundColor: square ? t.tint : t.accent, border: square ? `2px solid ${t.heading}` : "none", borderLeft: square ? `8px solid ${t.accent}` : "none", padding: "0.42em 0.78em", borderRadius: square ? "0" : "8px", boxShadow: square ? `4px 4px 0 ${t.accentSoft}` : "none" },
      h3: { color: t.accent, borderBottom: `1px solid ${t.accentSoft}` },
      blockquote: { backgroundColor: t.tint, borderLeft: `5px solid ${t.accent}` }
    };
  }
  if (t.variant === "design-lab") {
    if (style === "github-readme") return {
      h1: { borderBottom: `1px solid ${t.accentSoft}`, paddingBottom: "0.35em" },
      h2: { borderLeft: "none", borderBottom: `1px solid ${t.accentSoft}`, paddingBottom: "0.35em" },
      h3: { color: t.heading, borderBottom: "none" },
      blockquote: { color: "#57606a", backgroundColor: "#ffffff", borderLeft: `4px solid ${t.accentSoft}`, borderRadius: "0" },
      pre: { color: t.heading, backgroundColor: t.tint }
    };
    if (style === "typora-newsprint") return {
      body: { fontFamily: "Georgia, 'Songti SC', serif", backgroundColor: "#fffaf0" },
      h1: { textAlign: "center", textTransform: "uppercase", borderTop: `4px solid ${t.heading}`, borderBottom: `1px solid ${t.heading}`, padding: "0.5em 0" },
      h2: { borderLeft: "none", borderTop: `2px solid ${t.heading}`, borderBottom: `1px solid ${t.heading}`, padding: "0.35em 0" }
    };
    if (style === "typora-eloquent") return {
      body: { fontFamily: "Georgia, 'Songti SC', serif" },
      h1: { textAlign: "center", textTransform: "uppercase", letterSpacing: "0.12em" },
      h2: { borderLeft: "none", borderTop: `3px solid ${t.accent}`, padding: "0.5em 0 0" }
    };
  }
  if (["github", "wired", "sspai", "verge", "juejin"].includes(t.variant)) {
    const hard = t.variant === "wired" || t.variant === "sspai";
    return {
      h1: { textAlign: hard ? "left" : "center", color: t.heading, borderBottom: hard ? `4px solid ${t.accent}` : "none", paddingBottom: hard ? "0.35em" : "0" },
      h2: { color: t.heading, backgroundColor: t.variant === "verge" ? t.accent : "transparent", borderLeft: `7px solid ${t.accent}`, padding: "0.25em 0.65em", borderRadius: "0" },
      h3: { color: t.accent, borderBottom: `1px solid ${t.accentSoft}` }
    };
  }
  if (t.variant === "neurapress" && style === "creative") return {
    h1: { textAlign: "center" },
    h2: { color: "#ffffff", backgroundImage: `linear-gradient(90deg, ${t.accent}, ${t.accentSoft})`, borderLeft: "none", padding: "0.45em 0.8em", borderRadius: "8px" }
  };
  return {};
}

function signatureStyles(theme: Md2ThemeDefinition): StyleMap {
  const t = theme.tokens;
  const shape = t.shape ?? "docs";
  const hard = ["terminal", "neon", "mono", "blueprint"].includes(shape);
  return {
    h1: { color: t.heading, textAlign: hard ? "left" : "center", borderBottom: hard ? `3px solid ${t.accent}` : "none", paddingBottom: hard ? "0.45em" : "0" },
    h2: { color: hard ? t.heading : "#ffffff", backgroundColor: hard ? t.tint : t.accent, border: hard ? `1px solid ${t.accent}` : "none", borderLeft: hard ? `7px solid ${t.accent}` : "none", padding: "0.45em 0.75em", borderRadius: hard ? "0" : "8px", boxShadow: hard ? `4px 4px 0 ${t.accentSoft}` : "none" },
    h3: { color: t.accent, borderBottom: `1px solid ${t.accentSoft}` },
    blockquote: { color: t.heading, backgroundColor: t.tint, border: hard ? `1px solid ${t.accentSoft}` : "none", borderLeft: `5px solid ${t.accent}`, borderRadius: hard ? "0" : "8px" },
    pre: { color: t.accentSoft, backgroundColor: shape === "terminal" || shape === "neon" ? "#101414" : t.heading, border: `1px solid ${t.accent}` },
    "p code, li code": { color: t.strong, backgroundColor: t.tint, border: `1px solid ${t.accentSoft}` }
  };
}

function wenyanSourceChrome(theme: Md2ThemeDefinition): StyleMap {
  return {
    body: {
      color: theme.tokens.body,
      fontFamily: baseStyles.body.fontFamily,
      backgroundColor: "#ffffff",
      padding: "28px 24px 48px",
      boxSizing: "border-box"
    }
  };
}

export function compileTheme(theme: Md2ThemeDefinition): PublisherTemplate {
  const sourceWenyan = isWenyanThemeVariant(theme.tokens.variant);
  const variantStyles = sourceWenyan
    ? wenyanSourceChrome(theme)
    : theme.tokens.variant === "md2wechat-api"
    ? md2CatalogStyles(theme)
    : theme.tokens.variant === "signature"
      ? signatureStyles(theme)
      : ["default", "orangeheart", "rainbow", "pie", "lapis", "maize", "purple", "phycat", "juejin_default", "medium_default", "toutiao_default", "zhihu_default"].includes(theme.tokens.variant)
        ? wenyanStyles(theme)
        : sourceThemeStyles(theme);
  return {
    id: theme.id,
    name: theme.name,
    description: theme.description,
    source: "md2-catalog",
    group: theme.group,
    sourceLabel: theme.sourceLabel,
    license: theme.license,
    upstream: theme.upstream,
    tags: theme.tags,
    accent: theme.tokens.accent,
    canvas: theme.tokens.tint,
    tokens: structuredClone(theme.tokens),
    rawCss: isWenyanThemeVariant(theme.tokens.variant)
      ? WENYAN_THEME_CSS[theme.tokens.variant]
      : undefined,
    alignment: "left",
    structureAdapter: sourceWenyan ? "wenyan" : "none",
    styles: sourceWenyan
      ? variantStyles
      : mergeStyles(baseStyles, genericStyles(theme), variantStyles, leftReadingStyles)
  };
}

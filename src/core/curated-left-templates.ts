import type { PublisherTemplate, TemplateTokens } from "../types";
import { MDB_KNOWLEDGE_BASE_CSS, WEMD_MODERN_EDITORIAL_CSS, WENYAN_PIE_CSS } from "./source-theme-css";

type StyleMap = PublisherTemplate["styles"];

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
const MONO = "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace";

function tokens(accent: string, accentSoft: string, tint: string, heading: string, body: string): TemplateTokens {
  return { variant: "curated", accent, accentSoft, tint, heading, body, link: accent, strong: heading };
}

const leftReadingBase: StyleMap = {
  body: {
    color: "#2d3338",
    backgroundColor: "#ffffff",
    boxSizing: "border-box",
    fontFamily: SANS,
    fontSize: "16px",
    lineHeight: "1.78",
    letterSpacing: "0",
    wordSpacing: "0",
    padding: "0 8px"
  },
  p: { margin: "0 0 1em", textAlign: "left", letterSpacing: "0", wordSpacing: "0" },
  h1: { margin: "0 0 1.3em", fontSize: "27px", fontWeight: "750", lineHeight: "1.4", textAlign: "left" },
  h2: { margin: "1.9em 0 0.72em", fontSize: "21px", fontWeight: "750", lineHeight: "1.45", textAlign: "left" },
  h3: { margin: "1.5em 0 0.58em", fontSize: "18px", fontWeight: "700", lineHeight: "1.5", textAlign: "left" },
  h4: { margin: "1.3em 0 0.45em", fontSize: "16px", fontWeight: "700", lineHeight: "1.5", textAlign: "left" },
  blockquote: { margin: "1.25em 0", padding: "0.8em 1em", textAlign: "left" },
  "blockquote p": { margin: "0.3em 0", textAlign: "left" },
  ul: { margin: "1em 0", paddingLeft: "1.35em" },
  ol: { margin: "1em 0", paddingLeft: "1.35em" },
  li: { margin: "0.42em 0", textAlign: "left", letterSpacing: "0", wordSpacing: "0" },
  img: { display: "block", maxWidth: "100%", height: "auto", margin: "1.4em auto" },
  figure: { margin: "1.45em 0" },
  figcaption: { marginTop: "0.55em", color: "#7a8580", fontSize: "13px", textAlign: "center" },
  table: { width: "100%", margin: "1.4em 0", borderCollapse: "collapse", fontSize: "14px" },
  "th, td": { textAlign: "left" },
  pre: { margin: "1.25em 0", overflowX: "auto" },
  code: { fontFamily: MONO }
};

function withBase(overrides: StyleMap): StyleMap {
  const selectors = new Set([...Object.keys(leftReadingBase), ...Object.keys(overrides)]);
  return Object.fromEntries([...selectors].map((selector) => [
    selector,
    { ...(leftReadingBase[selector] ?? {}), ...(overrides[selector] ?? {}) }
  ]));
}

const pieChrome: StyleMap = {
  body: { ...leftReadingBase.body, color: "#262626", padding: "0 8px" }
};

export const CURATED_LEFT_TEMPLATES: PublisherTemplate[] = [
  {
    id: "curated-pie-original",
    name: "Pie 原版",
    description: "Wenyan Pie 的红线标题、虚线题饰、圆点三级标题和引号引用。保留原版两端对齐。",
    source: "curated",
    group: "阅读精选",
    sourceLabel: "Wenyan Core",
    license: "Apache-2.0",
    upstream: "https://github.com/caol64/wenyan-core/blob/main/src/assets/themes/pie.css",
    tags: ["阅读精选", "Wenyan", "Pie", "原版"],
    accent: "#da282a",
    canvas: "#fff2f0",
    tokens: tokens("#da282a", "#f27f79", "#fff2f0", "#262626", "#262626"),
    rawCss: WENYAN_PIE_CSS,
    alignment: "source",
    structureAdapter: "none",
    styles: pieChrome
  },
  {
    id: "curated-pie-left",
    name: "Pie 左读",
    description: "保留 Pie 的红线和引号结构，正文与标题统一左对齐，适合中文长文。",
    source: "curated",
    group: "阅读精选",
    sourceLabel: "Wenyan Core",
    license: "Apache-2.0",
    upstream: "https://github.com/caol64/wenyan-core/blob/main/src/assets/themes/pie.css",
    tags: ["阅读精选", "Wenyan", "Pie", "左对齐"],
    accent: "#da282a",
    canvas: "#fff2f0",
    tokens: tokens("#da282a", "#f27f79", "#fff2f0", "#262626", "#262626"),
    rawCss: WENYAN_PIE_CSS,
    alignment: "left",
    structureAdapter: "none",
    styles: withBase({
      body: { ...pieChrome.body, lineHeight: "1.75" },
      h1: { color: "#262626" },
      h2: { color: "#262626" },
      h3: { color: "#262626" },
      h4: { color: "#262626" },
      "h1 section": { margin: "0.2em 0 0" }
    })
  },
  {
    id: "curated-modern-editorial-left",
    name: "编辑部手记",
    description: "WeMD Modern Editorial 的刊物式层次、章节编号和克制表格，改为左读正文。",
    source: "curated",
    group: "阅读精选",
    sourceLabel: "WeMD",
    license: "MIT",
    upstream: "https://github.com/tenngoxars/WeMD/tree/main/packages/core/src/themes",
    tags: ["阅读精选", "WeMD", "编辑部", "左对齐"],
    accent: "#c76237",
    canvas: "#efeee7",
    tokens: tokens("#c76237", "#d3d3c8", "#f1f0e9", "#242720", "#34362f"),
    rawCss: WEMD_MODERN_EDITORIAL_CSS,
    alignment: "left",
    structureAdapter: "publication",
    styles: { body: { backgroundColor: "#ffffff" } }
  },
  {
    id: "curated-knowledge-base-left",
    name: "知识库",
    description: "MD Beautify Knowledge Base 的笔记页层次、低干扰引用和数据库式表格，适合教程与清单。",
    source: "curated",
    group: "阅读精选",
    sourceLabel: "MD Beautify",
    license: "MIT",
    upstream: "https://github.com/sliiu/md-beautify/blob/vue/packages/core/src/themes/knowledge-base.ts",
    tags: ["阅读精选", "MD Beautify", "知识库", "左对齐"],
    accent: "#37352f",
    canvas: "#f1f1ef",
    tokens: tokens("#37352f", "#e3e2e0", "#f7f6f3", "#37352f", "#37352f"),
    rawCss: MDB_KNOWLEDGE_BASE_CSS,
    alignment: "left",
    structureAdapter: "publication",
    styles: { body: { backgroundColor: "#ffffff" } }
  },
  {
    id: "curated-github-docs-left",
    name: "GitHub 文档",
    description: "紧凑、低装饰的技术文档样式，标题和表格都靠左，适合工具说明与项目复盘。",
    source: "curated",
    group: "阅读精选",
    sourceLabel: "github-markdown-css",
    license: "MIT",
    upstream: "https://github.com/sindresorhus/github-markdown-css",
    tags: ["阅读精选", "GitHub", "技术文档", "左对齐"],
    accent: "#0969da",
    canvas: "#f6f8fa",
    tokens: tokens("#0969da", "#d1d9e0", "#f6f8fa", "#1f2328", "#1f2328"),
    alignment: "left",
    structureAdapter: "none",
    styles: withBase({
      body: { color: "#1f2328", lineHeight: "1.7", padding: "0 8px" },
      h1: { color: "#1f2328", borderBottom: "1px solid #d1d9e0", paddingBottom: "0.42em" },
      h2: { color: "#1f2328", borderBottom: "1px solid #d1d9e0", paddingBottom: "0.35em" },
      h3: { color: "#1f2328" },
      blockquote: { color: "#59636e", backgroundColor: "#f6f8fa", borderLeft: "4px solid #d1d9e0", borderRadius: "0" },
      a: { color: "#0969da", textDecoration: "underline" },
      strong: { color: "#1f2328", fontWeight: "700" },
      "p code, li code": { padding: "0.15em 0.35em", borderRadius: "4px", color: "#cf222e", backgroundColor: "#f6f8fa", fontSize: "0.88em" },
      pre: { padding: "16px", border: "1px solid #d1d9e0", borderRadius: "6px", color: "#1f2328", backgroundColor: "#f6f8fa", lineHeight: "1.55" },
      hr: { width: "100%", margin: "2em 0", border: "none", borderTop: "1px solid #d1d9e0" },
      table: { border: "1px solid #d1d9e0" },
      "th, td": { padding: "9px 10px", border: "1px solid #d1d9e0" },
      th: { backgroundColor: "#f6f8fa", color: "#1f2328", fontWeight: "700" },
      img: { border: "1px solid #d1d9e0", borderRadius: "6px" }
    })
  },
  {
    id: "curated-doocs-simple-left",
    name: "清简",
    description: "借鉴 doocs/md 的轻量阅读节奏，保留层级但避免满底色标题和居中排版。",
    source: "curated",
    group: "阅读精选",
    sourceLabel: "doocs/md",
    license: "WTFPL",
    upstream: "https://github.com/doocs/md/tree/main/packages/shared/src/configs/theme-css",
    tags: ["阅读精选", "Doocs", "轻量", "左对齐"],
    accent: "#356348",
    canvas: "#f1f5f1",
    tokens: tokens("#356348", "#bed1c2", "#f3f8f5", "#23372b", "#2d3338"),
    alignment: "left",
    structureAdapter: "none",
    styles: withBase({
      body: { color: "#2d3338", lineHeight: "1.8" },
      h1: { color: "#23372b", borderBottom: "2px solid #356348", paddingBottom: "0.42em" },
      h2: { color: "#23372b", borderLeft: "5px solid #356348", paddingLeft: "0.68em" },
      h3: { color: "#356348", borderBottom: "1px solid #bed1c2", paddingBottom: "0.32em" },
      h4: { color: "#23372b" },
      blockquote: { color: "#405a49", backgroundColor: "#f3f8f5", borderLeft: "4px solid #356348", borderRadius: "0" },
      a: { color: "#356348", borderBottom: "1px solid #8aad92", textDecoration: "none" },
      strong: { color: "#23372b", fontWeight: "750" },
      "p code, li code": { padding: "0.15em 0.35em", borderRadius: "3px", color: "#2f6040", backgroundColor: "#e8f2ea", fontSize: "0.88em" },
      pre: { padding: "16px", borderLeft: "4px solid #356348", borderRadius: "0", color: "#e6f0e8", backgroundColor: "#26372d", lineHeight: "1.6" },
      hr: { width: "72px", margin: "2em 0", border: "none", borderTop: "2px solid #356348" },
      table: { border: "1px solid #bed1c2" },
      "th, td": { padding: "9px 10px", border: "1px solid #bed1c2" },
      th: { color: "#23372b", backgroundColor: "#f3f8f5", fontWeight: "700" },
      img: { borderRadius: "4px" }
    })
  }
];

export const CURATED_TEMPLATE_GROUPS = [...new Set(CURATED_LEFT_TEMPLATES.map((template) => template.group))];

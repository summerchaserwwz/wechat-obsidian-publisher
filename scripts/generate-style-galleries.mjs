import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const sourceRoot = fileURLToPath(new URL("../../sources/style-gallery-sources/", import.meta.url));
const outputRoot = fileURLToPath(new URL("../../images/style-gallery/", import.meta.url));

const healthThemeIds = [
  "minimal-white", "gray-elegant", "neo-chinese", "morandi-art", "street-hype",
  "cyber-neon", "magazine-editorial", "french-romance", "warm-healing", "fresh-nature",
  "moyu-green", "graphite-minimal",
  "zen-whitespace", "moyu-ticket", "olive-journal", "warm-ink", "ai-notebook", "purple-ink"
];

const wemdTemplates = [
  ["academic-paper", "学术论文", "Academic-Paper.css", "正式、清晰、论文式长文"],
  ["aurora-glass", "极光玻璃", "Aurora-Glass.css", "渐变标题与柔和层次"],
  ["bauhaus", "包豪斯", "Bauhaus.css", "红蓝几何与强编辑感"],
  ["cyberpunk-neon", "霓虹赛博", "Cyberpunk-Neon.css", "科技报道与高对比标题"],
  ["knowledge-base", "知识库", "Knowledge-Base.css", "Notion 式知识整理"],
  ["luxury-gold", "黑金叙事", "Luxury-Gold.css", "衬线、金色与人物故事"],
  ["morandi-forest", "莫兰迪森林", "Morandi-Forest.css", "低饱和绿与安静长文"],
  ["neo-brutalism", "新粗野主义", "Neo-Brutalism.css", "粗黑线和醒目标签"],
  ["receipt", "购物小票", "Receipt.css", "等宽清单和复盘"],
  ["sunset-film", "落日胶片", "Sunset-Film.css", "棕红胶片与故事感"]
];

const wenyanThemes = [
  ["default", "清白", "default.css", "经典长文与细分隔线"],
  ["orangeheart", "橙签", "orangeheart.css", "珊瑚橙标题牌"],
  ["rainbow", "彩笺", "rainbow.css", "轻松笔记和柔色表格"],
  ["lapis", "蓝印", "lapis.css", "冷蓝技术阅读"],
  ["pie", "Pie", "pie.css", "红线标题和引用符号"],
  ["maize", "麦穗", "maize.css", "玉米黄与图形标记"],
  ["purple", "紫藤", "purple.css", "低饱和紫色知识整理"],
  ["phycat", "薄荷", "phycat.css", "多级图形标题"],
  ["juejin_default", "掘金", "juejin_default.css", "紧凑技术文"],
  ["medium_default", "中版", "medium_default.css", "大字号编辑节奏"],
  ["toutiao_default", "头条", "toutiao_default.css", "橙色箭头标题标记"],
  ["zhihu_default", "知乎", "zhihu_default.css", "解释型文章和表格"]
];

const externalStyleOrder = [
  "mopai-minimal-white", "wemd-modern-editorial", "mopai-neo-chinese", "wemd-whitespace-gallery", "mopai-magazine-editorial",
  "wemd-eastern-notes", "mopai-olive-journal", "wemd-luxury-gold", "mopai-gray-elegant", "wemd-academic-paper",
  "mopai-street-hype", "wemd-bauhaus", "mopai-cyber-neon", "wemd-cyberpunk-neon", "mopai-morandi-art",
  "wemd-morandi-forest", "mopai-french-romance", "wemd-sunset-film", "mopai-warm-healing", "wemd-aurora-glass",
  "mopai-fresh-nature", "wemd-clear-guide", "mopai-moyu-green", "wemd-data-blueprint", "mopai-graphite-minimal",
  "wemd-knowledge-base", "mopai-zen-whitespace", "wemd-neo-brutalism", "mopai-moyu-ticket", "wemd-receipt",
  "mopai-warm-ink", "neurapress-simple", "mopai-ai-notebook", "neurapress-elegant", "mopai-purple-ink",
  "neurapress-creative", "neurapress-smartisan", "doocs-classic", "doocs-grace", "doocs-simple"
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeStyle(value) {
  return escapeHtml(value).replaceAll("`", "&#96;");
}

function cleanCss(css) {
  return css.replace(/@import\s+[^;]+;/gi, "");
}

function leftReadingCss(root) {
  return `${root} p, ${root} li, ${root} blockquote, ${root} blockquote p, ${root} td { text-align:left !important; text-justify:auto !important; letter-spacing:0 !important; word-spacing:normal !important; }`;
}

function articleMarkup({ rootId, source = "wemd" }) {
  const heading = source === "wenyan"
    ? (level, text) => `<h${level}><span>${text}</span></h${level}>`
    : (level, text) => `<h${level}><span class="content">${text}</span></h${level}>`;
  return `<article id="${rootId}">
    ${heading(1, "把一篇笔记，读成一篇文章")}
    <p>不是所有排版都需要更热闹。好的正文让读者先看到<strong>意思</strong>，再注意到样式。</p>
    ${heading(2, "一个可扫读的章节")}
    <p>段落靠左，行距舒展。链接、<code>代码</code>和强调只在真正需要时出现。</p>
    <blockquote class="multiquote-1"><p>读者不需要猜重点在哪。层级应该在第一眼就站出来。</p></blockquote>
    ${heading(3, "两条简单原则")}
    <ul><li>正文连贯，不被两端对齐拉散</li><li>标题有节制，保留自己的性格</li></ul>
    <pre><code>publish({ draft: true })</code></pre>
    <table><thead><tr><th>内容</th><th>节奏</th></tr></thead><tbody><tr><td>正文</td><td>左读</td></tr><tr><td>标题</td><td>有层级</td></tr></tbody></table>
  </article>`;
}

function documentFor(css, markup, rootSelector) {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
    * { box-sizing: border-box; }
    html, body { margin:0; min-height:100%; background:#fff; }
    body { overflow:hidden; }
    ${cleanCss(css)}
    ${leftReadingCss(rootSelector)}
  </style></head><body>${markup}</body></html>`;
}

function frame(document, title) {
  return `<div class="phone"><iframe title="${escapeHtml(title)}" srcdoc="${escapeHtml(document)}" loading="eager"></iframe></div>`;
}

function galleryPage({ title, kicker, cards, current, total, kind }) {
  const navigation = Array.from({ length: total }, (_value, index) => {
    const page = index + 1;
    const href = `${kind}-${String(page).padStart(2, "0")}.html`;
    return `<a ${page === current ? 'aria-current="page"' : ""} href="${href}">${page}</a>`;
  }).join("");
  const cardMarkup = cards.map((card, index) => `<article class="gallery-card">
    <header><span class="number">${String((current - 1) * 10 + index + 1).padStart(2, "0")}</span><div><h2>${escapeHtml(card.name)}</h2><p>${escapeHtml(card.source)} · ${escapeHtml(card.license)}</p></div></header>
    ${frame(card.document, card.name)}
    <p class="direction">${escapeHtml(card.direction)}</p>
  </article>`).join("\n");
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light; --ink:#17221c; --muted:#64716a; --line:#cdd5cd; --paper:#f4f5f1; --accent:#087b5a; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--paper); color:var(--ink); font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif; }
    main { max-width:1440px; margin:0 auto; padding:30px 28px 56px; }
    .masthead { display:flex; align-items:flex-end; justify-content:space-between; gap:24px; padding:0 0 22px; border-bottom:2px solid var(--ink); }
    .masthead p { margin:0 0 7px; color:var(--accent); font-size:13px; font-weight:700; }
    h1 { margin:0; font-size:28px; line-height:1.25; font-weight:760; letter-spacing:0; }
    nav { display:flex; gap:4px; flex-wrap:wrap; }
    nav a { display:grid; place-items:center; width:28px; height:28px; border:1px solid var(--line); color:var(--muted); text-decoration:none; font-size:13px; font-weight:700; }
    nav a[aria-current="page"] { background:var(--accent); border-color:var(--accent); color:#fff; }
    .gallery { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:24px; padding-top:28px; }
    .gallery-card { min-width:0; margin:0; padding:0 0 15px; border-bottom:1px solid var(--line); }
    .gallery-card header { min-height:52px; display:flex; gap:12px; align-items:flex-start; }
    .number { display:grid; place-items:center; flex:0 0 auto; width:28px; height:28px; background:var(--ink); color:#fff; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:11px; }
    .gallery-card h2 { margin:0; font-size:16px; line-height:1.3; font-weight:750; letter-spacing:0; }
    .gallery-card header p, .direction { margin:4px 0 0; color:var(--muted); font-size:12px; line-height:1.5; }
    .phone { width:375px; height:650px; margin:12px auto 0; overflow:hidden; background:#fff; border:1px solid #aeb8af; box-shadow:8px 8px 0 rgba(23,34,28,.11); }
    iframe { display:block; width:100%; height:100%; border:0; background:#fff; }
    .direction { max-width:375px; margin:13px auto 0; }
    @media (max-width:860px) { main { padding:20px 16px 40px; } .masthead { align-items:flex-start; flex-direction:column; } .gallery { grid-template-columns:1fr; gap:28px; } }
    @media (max-width:430px) { .phone { width:100%; height:650px; } h1 { font-size:23px; } }
  </style>
</head>
<body><main><header class="masthead"><div><p>${escapeHtml(kicker)}</p><h1>${escapeHtml(title)}</h1></div><nav aria-label="画廊分页">${navigation}</nav></header><section class="gallery">${cardMarkup}</section></main></body>
</html>`;
}

async function loadTypescriptModule(file) {
  const source = await readFile(file, "utf8");
  const javascript = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`);
}

function styleObjectToCss(value, themeColor) {
  if (!value || typeof value !== "object") return "";
  return Object.entries(value).map(([property, raw]) => {
    const name = property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    const text = String(raw)
      .replaceAll("var(--themeColor)", themeColor)
      .replaceAll("hsl(var(--foreground))", "#29312c")
      .replaceAll("var(--fontSize)", "16px")
      .replaceAll("var(--blockquote-background)", "#f3f5f2");
    return `${name}:${text};`;
  }).join("");
}

function healthDocument(theme) {
  const styles = theme.styles;
  const markup = `<article style="${escapeStyle(styles.container)}">
    <h1 style="${escapeStyle(styles.h1)}">把一篇笔记，读成一篇文章</h1>
    <p style="${escapeStyle(`${styles.paragraph};text-align:left!important;letter-spacing:0!important;`)}">内容先于装饰。读者应该先读到<strong style="${escapeStyle(styles.strong)}">真正重要的句子</strong>。</p>
    <h2 style="${escapeStyle(styles.h2)}">一个可扫读的章节</h2>
    <p style="${escapeStyle(`${styles.paragraph};text-align:left!important;letter-spacing:0!important;`)}">段落靠左，行距舒展，<code style="${escapeStyle(styles.code)}">代码</code>只做必要的区分。</p>
    <blockquote style="${escapeStyle(`${styles.blockquote};text-align:left!important;`)}">读者不需要猜重点在哪。层级应当在第一眼就站出来。</blockquote>
    <h3 style="${escapeStyle(styles.h3)}">两条简单原则</h3>
    <ul style="${escapeStyle(styles.ul)}"><li style="${escapeStyle(`${styles.li};text-align:left!important;`)}">正文连贯</li><li style="${escapeStyle(`${styles.li};text-align:left!important;`)}">标题有节制</li></ul>
    <pre style="${escapeStyle(styles.pre)}"><code style="${escapeStyle(styles.codeBlock)}">publish({ draft: true })</code></pre>
    <table style="${escapeStyle(styles.table)}"><thead><tr><th style="${escapeStyle(styles.th)}">内容</th><th style="${escapeStyle(styles.th)}">节奏</th></tr></thead><tbody><tr><td style="${escapeStyle(`${styles.td};text-align:left!important;`)}">正文</td><td style="${escapeStyle(`${styles.td};text-align:left!important;`)}">左读</td></tr></tbody></table>
  </article>`;
  return documentFor("", markup, "article");
}

function neurapressDocument(template) {
  const options = template.options;
  const color = options.base?.themeColor ?? "#356348";
  const base = styleObjectToCss(options.base, color);
  const block = options.block ?? {};
  const inline = options.inline ?? {};
  const markup = `<article style="${escapeStyle(`${base};--themeColor:${color};`)}">
    <h1 style="${escapeStyle(styleObjectToCss(block.h1, color))}">把一篇笔记，读成一篇文章</h1>
    <p style="${escapeStyle(`${styleObjectToCss(block.p, color)};text-align:left!important;letter-spacing:0!important;`)}">内容先于装饰。读者应该先读到<strong style="${escapeStyle(styleObjectToCss(inline.strong, color))}">真正重要的句子</strong>。</p>
    <h2 style="${escapeStyle(styleObjectToCss(block.h2, color))}">一个可扫读的章节</h2>
    <p style="${escapeStyle(`${styleObjectToCss(block.p, color)};text-align:left!important;letter-spacing:0!important;`)}">段落靠左，行距舒展，<code style="${escapeStyle(styleObjectToCss(inline.codespan, color))}">代码</code>只做必要的区分。</p>
    <blockquote style="${escapeStyle(`${styleObjectToCss(block.blockquote, color)};text-align:left!important;`)}">读者不需要猜重点在哪。层级应当在第一眼就站出来。</blockquote>
    <h3 style="${escapeStyle(styleObjectToCss(block.h3, color))}">两条简单原则</h3>
    <ul style="${escapeStyle(styleObjectToCss(block.ul, color))}"><li style="${escapeStyle(`${styleObjectToCss(inline.listitem, color)};text-align:left!important;`)}">正文连贯</li><li style="${escapeStyle(`${styleObjectToCss(inline.listitem, color)};text-align:left!important;`)}">标题有节制</li></ul>
  </article>`;
  return documentFor("", markup, "article");
}

function directThemeDocument(css, rootId, source) {
  return documentFor(css, articleMarkup({ rootId, source }), `#${rootId}`);
}

async function extractThemeCss(file) {
  const source = await readFile(file, "utf8");
  const match = source.match(/export const \w+ = `([\s\S]*?)`;\s*$/);
  if (!match) throw new Error(`Could not extract theme CSS: ${file}`);
  return match[1];
}

async function getExternalCards() {
  const health = await loadTypescriptModule(`${sourceRoot}wechat-article-formatter/src/utils/themes.ts`);
  const healthById = new Map(health.themes.map((theme) => [theme.id, theme]));
  const healthCards = healthThemeIds.map((id) => {
    const theme = healthById.get(id);
    if (!theme) throw new Error(`Missing Health theme: ${id}`);
    return {
      id: `mopai-${id}`,
      name: `墨排 · ${theme.name}`,
      source: "wechat-article-formatter",
      license: "MIT",
      direction: theme.description,
      document: healthDocument(theme)
    };
  });

  const wemdCards = await Promise.all(wemdTemplates.map(async ([id, name, file, direction]) => {
    const css = await readFile(`${sourceRoot}WeMD/templates/${file}`, "utf8");
    return {
      id: `wemd-${id}`,
      name: `WeMD · ${name}`,
      source: "WeMD",
      license: "MIT",
      direction,
      document: directThemeDocument(css, "wemd", "wemd")
    };
  }));

  const wemdCore = await Promise.all([
    ["data-blueprint", "数据蓝图", ["data-blueprint.ts"], "海军蓝数据复盘与表格节奏"],
    ["eastern-notes", "东方笺谱", ["eastern-notes.ts"], "宋体留白与现代随笔"],
    ["clear-guide", "清晰指南", ["clear-guide.ts"], "深绿步骤和操作手册结构"],
    ["whitespace-gallery", "留白画册", ["whitespace-gallery.ts"], "人文留白和图片叙事节奏"],
    ["modern-editorial", "编辑部手记", ["modern-editorial-foundation.ts", "modern-editorial-content.ts", "modern-editorial-components.ts"], "分栏感章节、刊头和内刊级层次"],
  ].map(async ([id, name, files, direction]) => {
    const css = (await Promise.all(files.map((file) => extractThemeCss(`${sourceRoot}WeMD/packages/core/src/themes/${file}`)))).join("\n");
    return {
      id: `wemd-${id}`,
      name: `WeMD · ${name}`,
      source: "WeMD",
      license: "MIT",
      direction,
      document: directThemeDocument(css, "wemd", "wemd")
    };
  }));

  const neurapress = await loadTypescriptModule(`${sourceRoot}neurapress/src/config/wechat-templates.ts`);
  const neurapressCards = ["simple", "elegant", "creative", "smartisan"].map((id) => {
    const template = neurapress.templates.find((item) => item.id === id);
    if (!template) throw new Error(`Missing NeuraPress template: ${id}`);
    return {
      id: `neurapress-${id}`,
      name: `NeuraPress · ${template.name}`,
      source: "NeuraPress",
      license: "MIT",
      direction: template.description,
      document: neurapressDocument(template)
    };
  });

  const doocsCards = await Promise.all([
    ["classic", "经典", "default.css", "色条标题与稳定的公众号层级"],
    ["grace", "优雅", "grace.css", "圆角标题与虚线层级"],
    ["simple", "清简", "simple.css", "柔和框线和异形圆角"],
  ].map(async ([id, name, file, direction]) => {
    const base = await readFile(`${sourceRoot}doocs-md/packages/shared/src/configs/theme-css/base.css`, "utf8");
    const css = await readFile(`${sourceRoot}doocs-md/packages/shared/src/configs/theme-css/${file}`, "utf8");
    const markup = articleMarkup({ rootId: "doocs", source: "wemd" });
    const variables = "body{--md-primary-color:#356348;--md-font-size:16px;--foreground:210 18% 18%;--blockquote-background:#f2f7f3;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;line-height:1.8;}";
    return {
      id: `doocs-${id}`,
      name: `Doocs · ${name}`,
      source: "doocs/md",
      license: "WTFPL-2.0",
      direction,
      document: documentFor(`${variables}\n${base}\n${css}`, markup, "#doocs")
    };
  }));

  const cards = [...healthCards, ...wemdCards, ...wemdCore, ...neurapressCards, ...doocsCards];
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  return externalStyleOrder.map((id) => {
    const card = cardsById.get(id);
    if (!card) throw new Error(`Missing curated external style: ${id}`);
    return card;
  });
}

async function getWenyanCards() {
  return Promise.all(wenyanThemes.map(async ([id, name, file, direction]) => {
    const css = await readFile(`${sourceRoot}wenyan-core/src/assets/themes/${file}`, "utf8");
    const markup = `${articleMarkup({ rootId: "wenyan", source: "wenyan" })}<section id="footnotes"><p><span class="footnote-num">[1]</span><span class="footnote-txt">https://example.com</span></p></section>`;
    return {
      id: `wenyan-${id}`,
      name: `Wenyan · ${name}`,
      source: "Wenyan Core",
      license: "Apache-2.0",
      direction,
      document: documentFor(css, markup, "#wenyan")
    };
  }));
}

async function writePages(cards, { kind, title, kicker }) {
  const total = Math.ceil(cards.length / 10);
  for (let index = 0; index < total; index += 1) {
    const page = index + 1;
    const pageCards = cards.slice(index * 10, (index + 1) * 10);
    const file = `${outputRoot}${kind}-${String(page).padStart(2, "0")}.html`;
    await writeFile(file, galleryPage({ title, kicker, cards: pageCards, current: page, total, kind }), "utf8");
  }
}

await mkdir(outputRoot, { recursive: true });
const externalCards = await getExternalCards();
const wenyanCards = await getWenyanCards();
if (externalCards.length !== 40) throw new Error(`Expected 40 external candidates, got ${externalCards.length}`);
if (wenyanCards.length !== 12) throw new Error(`Expected 12 Wenyan candidates, got ${wenyanCards.length}`);
await writePages(externalCards, {
  kind: "external-style-gallery",
  title: "40 套不同排版语言的公众号正文候选",
  kicker: "正文统一左读，筛掉同构换色，标题保留各自构图"
});
await writePages(wenyanCards, {
  kind: "wenyan-source-gallery",
  title: "Wenyan 12 套原主题结构校验",
  kicker: "源码结构预览，正文统一左读"
});
await writeFile(`${outputRoot}external-style-catalog.json`, JSON.stringify(externalCards.map(({ document, ...card }) => card), null, 2), "utf8");

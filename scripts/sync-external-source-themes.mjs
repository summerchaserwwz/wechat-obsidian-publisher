import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const sourceRoot = fileURLToPath(new URL("../../sources/style-gallery-sources/", import.meta.url));
const catalogFile = fileURLToPath(new URL("../../images/style-gallery/external-style-catalog.json", import.meta.url));
const outputFile = fileURLToPath(new URL("../src/core/external-source-themes.ts", import.meta.url));

const MAX_CSS_BYTES = 48 * 1024;

const mopaiThemeIds = [
  "minimal-white", "neo-chinese", "magazine-editorial", "olive-journal", "gray-elegant", "street-hype",
  "cyber-neon", "morandi-art", "french-romance", "warm-healing", "fresh-nature", "moyu-green",
  "graphite-minimal", "zen-whitespace", "moyu-ticket", "warm-ink", "ai-notebook", "purple-ink"
];

const wemdCssThemes = [
  ["academic-paper", "Academic-Paper.css"], ["aurora-glass", "Aurora-Glass.css"], ["bauhaus", "Bauhaus.css"],
  ["cyberpunk-neon", "Cyberpunk-Neon.css"], ["knowledge-base", "Knowledge-Base.css"], ["luxury-gold", "Luxury-Gold.css"],
  ["morandi-forest", "Morandi-Forest.css"], ["neo-brutalism", "Neo-Brutalism.css"], ["receipt", "Receipt.css"],
  ["sunset-film", "Sunset-Film.css"]
];

const wemdCoreThemes = [
  ["data-blueprint", ["data-blueprint.ts"]],
  ["eastern-notes", ["eastern-notes.ts"]],
  ["clear-guide", ["clear-guide.ts"]],
  ["whitespace-gallery", ["whitespace-gallery.ts"]],
  ["modern-editorial", ["modern-editorial-foundation.ts", "modern-editorial-content.ts", "modern-editorial-components.ts"]]
];

const palette = {
  mopai: { accent: "#356348", canvas: "#f7faf7", body: "#2f3832", heading: "#202820" },
  wemd: { accent: "#356348", canvas: "#f7f7f4", body: "#34362f", heading: "#20221e" },
  neurapress: { accent: "#00b38a", canvas: "#f7fbfa", body: "#333333", heading: "#29312c" },
  doocs: { accent: "#356348", canvas: "#f3f8f5", body: "#29342e", heading: "#1f352b" }
};

function cssProperty(name) {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function styleObjectToCss(style) {
  if (!style || typeof style !== "object") return "";
  return Object.entries(style)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([property, value]) => `${cssProperty(property)}:${String(value)};`)
    .join("");
}

function normalizeCss(css) {
  return css
    .replace(/@import\s+(?:url\()?[^;]+;\s*/gi, "")
    .replace(/url\(\s*(['"]?)https?:[^)]+\1\s*\)/gi, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

function replaceRootSelector(css, sourceRootSelector, targetRootSelector) {
  return css.replaceAll(sourceRootSelector, targetRootSelector);
}

function scopeBareDoocsCss(css, root) {
  return css
    .replace(/#output\s+\.container\b/g, root)
    .replace(/#output\s+section\b/g, root)
    .replace(/#output\b/g, root)
    .replace(/(^|[,{]\s*)section(?=\s|,|\{|>|\.|#|:)/gm, `$1${root}`);
}

function downgradeDoocsColorMix(css) {
  const primary = [53, 99, 72];
  const foreground = [38, 46, 54];
  const toRgba = (channels, percent) => `rgba(${channels.join(",")},${Number(percent) / 100})`;
  return css
    .replace(/color-mix\(\s*in\s+srgb\s*,\s*var\(--md-primary-color\)\s+(\d+(?:\.\d+)?)%\s*,\s*transparent\s*\)/gi, (_match, percent) => toRgba(primary, percent))
    .replace(/color-mix\(\s*in\s+srgb\s*,\s*hsl\(var\(--foreground\)\)\s+(\d+(?:\.\d+)?)%\s*,\s*transparent\s*\)/gi, (_match, percent) => toRgba(foreground, percent));
}

function mopaiCss(theme, root) {
  const s = theme.styles;
  const rule = (selector, value) => value ? `${selector}{${value}}` : "";
  return normalizeCss([
    rule(root, s.container),
    rule(`${root} .article-title`, s.title),
    rule(`${root} .article-subtitle`, s.subtitle),
    rule(`${root} h1`, s.h1), rule(`${root} h2`, s.h2), rule(`${root} h3`, s.h3),
    rule(`${root} p`, s.paragraph), rule(`${root} blockquote`, s.blockquote),
    rule(`${root} pre`, s.pre), rule(`${root} pre code`, s.codeBlock),
    rule(`${root} :not(pre)>code`, s.code), rule(`${root} ul`, s.ul), rule(`${root} ol`, s.ol),
    rule(`${root} li`, s.li), rule(`${root} strong`, s.strong), rule(`${root} em`, s.em),
    rule(`${root} a`, s.a), rule(`${root} img`, s.img), rule(`${root} table`, s.table),
    rule(`${root} th`, s.th), rule(`${root} td`, s.td), rule(`${root} hr`, s.hr)
  ].join("\n"));
}

function neurapressCss(template, root) {
  const options = template.options ?? {};
  const base = options.base ?? {};
  const themeColor = base.themeColor ?? palette.neurapress.accent;
  const block = options.block ?? {};
  const inline = options.inline ?? {};
  const rule = (selector, value) => `${selector}{${styleObjectToCss(value)}}`;
  return normalizeCss([
    `${root}{--themeColor:${themeColor};${styleObjectToCss(base)}}`,
    rule(`${root} h1`, block.h1), rule(`${root} h2`, block.h2), rule(`${root} h3`, block.h3),
    rule(`${root} h4`, block.h4), rule(`${root} h5`, block.h5), rule(`${root} h6`, block.h6),
    rule(`${root} p`, block.p), rule(`${root} blockquote`, block.blockquote),
    rule(`${root} pre`, block.code_pre), rule(`${root} pre code`, block.code),
    rule(`${root} img`, block.image), rule(`${root} ul`, block.ul), rule(`${root} ol`, block.ol),
    rule(`${root} table`, block.table), rule(`${root} thead`, block.thead), rule(`${root} td`, block.td),
    rule(`${root} li`, inline.listitem), rule(`${root} :not(pre)>code`, inline.codespan),
    rule(`${root} em`, inline.em), rule(`${root} a`, inline.link), rule(`${root} strong`, inline.strong)
  ].join("\n"));
}

async function loadTypescriptModule(file) {
  const source = await readFile(file, "utf8");
  const javascript = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`);
}

async function extractThemeCss(file) {
  const source = await readFile(file, "utf8");
  const match = source.match(/export const \w+ = `([\s\S]*?)`;\s*$/);
  if (!match) throw new Error(`无法提取 WeMD CSS：${file}`);
  return match[1];
}

function catalogMeta(catalog, id) {
  const meta = catalog.find((item) => item.id === id);
  if (!meta) throw new Error(`画廊目录缺少主题：${id}`);
  return meta;
}

function makeDefinition(meta, details) {
  const base = palette[details.group];
  return {
    id: meta.id,
    name: meta.name,
    description: meta.direction,
    group: details.group,
    sourceLabel: details.sourceLabel,
    license: details.license,
    upstream: details.upstream,
    tags: [details.group, "source-backed", "wechat", ...(details.tags ?? [])],
    accent: details.accent ?? base.accent,
    canvas: details.canvas ?? base.canvas,
    body: details.body ?? base.body,
    heading: details.heading ?? base.heading,
    rawCss: details.rawCss,
    structureAdapter: details.structureAdapter
  };
}

async function generateDefinitions() {
  const catalog = JSON.parse(await readFile(catalogFile, "utf8"));
  if (catalog.length !== 40) throw new Error(`画廊目录应有 40 项，实际为 ${catalog.length}`);

  const formatter = await loadTypescriptModule(`${sourceRoot}wechat-article-formatter/src/utils/themes.ts`);
  const formatterById = new Map(formatter.themes.map((theme) => [theme.id, theme]));
  const mopai = mopaiThemeIds.map((themeId) => {
    const theme = formatterById.get(themeId);
    if (!theme) throw new Error(`缺少墨排主题：${themeId}`);
    const id = `mopai-${themeId}`;
    return makeDefinition(catalogMeta(catalog, id), {
      group: "mopai",
      sourceLabel: "wechat-article-formatter",
      license: "MIT",
      upstream: `https://github.com/Health-525/wechat-article-formatter/blob/main/src/utils/themes.ts#${themeId}`,
      tags: ["inline-style-object"],
      rawCss: mopaiCss(theme, "#wemd"),
      structureAdapter: "publication"
    });
  });

  const wemdCss = await Promise.all(wemdCssThemes.map(async ([themeId, file]) => {
    const id = `wemd-${themeId}`;
    const rawCss = replaceRootSelector(
      normalizeCss(await readFile(`${sourceRoot}WeMD/templates/${file}`, "utf8")),
      "#wemd",
      "#wemd"
    );
    return makeDefinition(catalogMeta(catalog, id), {
      group: "wemd", sourceLabel: "WeMD", license: "MIT",
      upstream: `https://github.com/tenngoxars/WeMD/blob/main/templates/${file}`,
      tags: ["raw-css-template"], rawCss, structureAdapter: "publication"
    });
  }));

  const wemdCore = await Promise.all(wemdCoreThemes.map(async ([themeId, files]) => {
    const id = `wemd-${themeId}`;
    const rawCss = replaceRootSelector(
      normalizeCss((await Promise.all(files.map((file) => extractThemeCss(`${sourceRoot}WeMD/packages/core/src/themes/${file}`)))).join("\n")),
      "#wemd",
      "#wemd"
    );
    return makeDefinition(catalogMeta(catalog, id), {
      group: "wemd", sourceLabel: "WeMD", license: "MIT",
      upstream: `https://github.com/tenngoxars/WeMD/tree/main/packages/core/src/themes`,
      tags: ["core-theme"], rawCss, structureAdapter: "publication"
    });
  }));

  const neurapressModule = await loadTypescriptModule(`${sourceRoot}neurapress/src/config/wechat-templates.ts`);
  const neurapress = ["simple", "elegant", "creative", "smartisan"].map((themeId) => {
    const template = neurapressModule.templates.find((item) => item.id === themeId);
    if (!template) throw new Error(`缺少 NeuraPress 主题：${themeId}`);
    const id = `neurapress-${themeId}`;
    return makeDefinition(catalogMeta(catalog, id), {
      group: "neurapress", sourceLabel: "NeuraPress", license: "MIT",
      upstream: `https://github.com/tianyaxiang/neurapress/blob/main/src/config/wechat-templates.ts#${themeId}`,
      tags: ["renderer-options-object"], rawCss: neurapressCss(template, "#wemd"), structureAdapter: "publication"
    });
  });

  const doocsBase = await readFile(`${sourceRoot}doocs-md/packages/shared/src/configs/theme-css/base.css`, "utf8");
  const doocs = await Promise.all([
    ["classic", "default.css"], ["grace", "grace.css"], ["simple", "simple.css"]
  ].map(async ([themeId, file]) => {
    const id = `doocs-${themeId}`;
    const root = "#wemd";
    const themeCss = await readFile(`${sourceRoot}doocs-md/packages/shared/src/configs/theme-css/${file}`, "utf8");
    const variables = `:root{--md-primary-color:#356348;--md-font-size:16px;--md-font-family:-apple-system,BlinkMacSystemFont,\"PingFang SC\",\"Microsoft YaHei\",sans-serif;--foreground:210 18% 18%;--blockquote-background:#f2f7f3;}`;
    const rawCss = normalizeCss(downgradeDoocsColorMix(`${variables}\n${scopeBareDoocsCss(normalizeCss(doocsBase), root)}\n${scopeBareDoocsCss(normalizeCss(themeCss), root)}`));
    return makeDefinition(catalogMeta(catalog, id), {
      group: "doocs", sourceLabel: "doocs/md", license: "WTFPL-2.0",
      upstream: `https://github.com/doocs/md/blob/main/packages/shared/src/configs/theme-css/${file}`,
      tags: ["raw-css-template", "css-variables"], rawCss, structureAdapter: "publication"
    });
  }));

  const definitions = [...mopai, ...wemdCss, ...wemdCore, ...neurapress, ...doocs]
    .sort((left, right) => catalog.findIndex((item) => item.id === left.id) - catalog.findIndex((item) => item.id === right.id));

  const duplicateIds = definitions.map((theme) => theme.id).filter((id, index, ids) => ids.indexOf(id) !== index);
  const externalCss = definitions.filter((theme) => /@import|url\(\s*['\"]?https?:/i.test(theme.rawCss));
  const oversized = definitions.filter((theme) => Buffer.byteLength(theme.rawCss, "utf8") >= MAX_CSS_BYTES);
  if (definitions.length !== 40) throw new Error(`应生成 40 项，实际为 ${definitions.length}`);
  if (duplicateIds.length) throw new Error(`重复主题 ID：${[...new Set(duplicateIds)].join(", ")}`);
  if (externalCss.length) throw new Error(`主题 CSS 含外链：${externalCss.map((theme) => theme.id).join(", ")}`);
  if (oversized.length) throw new Error(`主题 CSS 超过 48KB：${oversized.map((theme) => theme.id).join(", ")}`);
  return definitions;
}

const definitions = await generateDefinitions();
const output = [
  "/* Generated from the vendored source repositories. Run npm run sync:external-source-themes to refresh. */",
  "",
  "export interface ExternalSourceThemeDefinition {",
  "  id: string;",
  "  name: string;",
  "  description: string;",
  "  group: \"mopai\" | \"wemd\" | \"neurapress\" | \"doocs\";",
  "  sourceLabel: string;",
  "  license: string;",
  "  upstream: string;",
  "  tags: string[];",
  "  accent: string;",
  "  canvas: string;",
  "  body: string;",
  "  heading: string;",
  "  rawCss: string;",
  "  structureAdapter: \"none\" | \"publication\";",
  "}",
  "",
  `export const EXTERNAL_SOURCE_THEME_DEFINITIONS: ExternalSourceThemeDefinition[] = ${JSON.stringify(definitions, null, 2)};`,
  ""
].join("\n");

await writeFile(outputFile, output, "utf8");
const counts = Object.groupBy(definitions, (theme) => theme.group);
console.log(JSON.stringify({ total: definitions.length, counts: Object.fromEntries(Object.entries(counts).map(([group, themes]) => [group, themes.length])), duplicateIds: 0 }, null, 2));

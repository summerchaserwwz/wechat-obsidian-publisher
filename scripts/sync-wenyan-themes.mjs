import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const themeNames = [
  "default",
  "juejin_default",
  "lapis",
  "maize",
  "medium_default",
  "orangeheart",
  "phycat",
  "pie",
  "purple",
  "rainbow",
  "toutiao_default",
  "zhihu_default"
];

const sourceDirectory = fileURLToPath(new URL("../../sources/wenyan-core/src/assets/themes/", import.meta.url));
const outputFile = fileURLToPath(new URL("../src/core/wenyan-theme-css.ts", import.meta.url));

const sourceByTheme = await Promise.all(themeNames.map(async (name) => {
  const css = await readFile(`${sourceDirectory}${name}.css`, "utf8");
  return [name, css];
}));

const output = [
  "/*",
  " * Generated from caol64/wenyan-core/src/assets/themes (Apache-2.0).",
  " * Run `npm run sync:wenyan-themes` after updating the vendored source.",
  " * The source comments, including original theme-author attribution, are retained.",
  " */",
  "",
  `export const WENYAN_THEME_VARIANTS = ${JSON.stringify(themeNames)} as const;`,
  "",
  "export type WenyanThemeVariant = (typeof WENYAN_THEME_VARIANTS)[number];",
  "",
  "export const WENYAN_THEME_CSS: Record<WenyanThemeVariant, string> = {",
  ...sourceByTheme.map(([name, css]) => `  ${JSON.stringify(name)}: ${JSON.stringify(css)},`),
  "};",
  "",
  "export function isWenyanThemeVariant(value: string): value is WenyanThemeVariant {",
  "  return (WENYAN_THEME_VARIANTS as readonly string[]).includes(value);",
  "}",
  ""
].join("\n");

await writeFile(outputFile, output, "utf8");

import esbuild from "esbuild";
import process from "node:process";
import builtins from "builtin-modules";

const production = process.argv[2] === "production";
const context = await esbuild.context({
  entryPoints: { main: "src/main.ts", styles: "src/styles.css" },
  bundle: true,
  external: ["obsidian", "electron", "node:*", "@codemirror/state", "@codemirror/view", "@codemirror/language", "@codemirror/search", ...builtins],
  format: "cjs",
  platform: "browser",
  target: "es2023",
  logLevel: "info",
  sourcemap: production ? false : "inline",
  treeShaking: true,
  loader: { ".woff2": "dataurl", ".woff": "dataurl", ".ttf": "dataurl" },
  outdir: ".",
  entryNames: "[name]"
});

if (production) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}

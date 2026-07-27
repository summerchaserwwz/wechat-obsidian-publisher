import type { CodeBlockProfile, CodeBlockPreset } from "../types";

const MONO = "'SFMono-Regular', SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace";

type HighlightRole = "keyword" | "string" | "function" | "number" | "comment" | "tag" | "emphasis" | "addition" | "deletion";

const HIGHLIGHT_CLASS_ROLES: Record<string, HighlightRole> = {
  "hljs-doctag": "keyword",
  "hljs-keyword": "keyword",
  "hljs-template-tag": "keyword",
  "hljs-template-variable": "keyword",
  "hljs-type": "keyword",
  "language_": "keyword",
  "hljs-title": "function",
  "hljs-title.function_": "function",
  "hljs-variable": "number",
  "hljs-attr": "number",
  "hljs-attribute": "number",
  "hljs-literal": "number",
  "hljs-meta": "number",
  "hljs-number": "number",
  "hljs-operator": "number",
  "hljs-selector-attr": "number",
  "hljs-selector-class": "number",
  "hljs-selector-id": "number",
  "hljs-regexp": "string",
  "hljs-string": "string",
  "hljs-built_in": "string",
  "hljs-symbol": "string",
  "hljs-comment": "comment",
  "hljs-code": "comment",
  "hljs-formula": "comment",
  "hljs-name": "tag",
  "hljs-quote": "tag",
  "hljs-selector-tag": "tag",
  "hljs-selector-pseudo": "tag",
  "hljs-subst": "emphasis",
  "hljs-emphasis": "emphasis",
  "hljs-strong": "emphasis",
  "hljs-addition": "addition",
  "hljs-deletion": "deletion"
};

export const CODE_BLOCK_PRESETS: Record<CodeBlockPreset, CodeBlockProfile> = {
  "macos-dark": {
    preset: "macos-dark",
    showChrome: true,
    showLanguage: true,
    background: "#1e1e1e",
    headerBackground: "#2b3038",
    foreground: "#e6edf3",
    muted: "#9aa4b2",
    border: "#3b4350",
    dotRed: "#ff5f57",
    dotYellow: "#febc2e",
    dotGreen: "#28c840",
    keyword: "#ff7b72",
    string: "#a5d6ff",
    function: "#d2a8ff",
    number: "#79c0ff",
    comment: "#8b949e",
    tag: "#7ee787"
  },
  "macos-light": {
    preset: "macos-light",
    showChrome: true,
    showLanguage: true,
    background: "#f6f8fa",
    headerBackground: "#eef1f4",
    foreground: "#1f2937",
    muted: "#6b7280",
    border: "#d7dde5",
    dotRed: "#ff5f57",
    dotYellow: "#febc2e",
    dotGreen: "#28c840",
    keyword: "#b42318",
    string: "#0f766e",
    function: "#6d28d9",
    number: "#1d4ed8",
    comment: "#6b7280",
    tag: "#0f766e"
  },
  plain: {
    preset: "plain",
    showChrome: false,
    showLanguage: false,
    background: "#f5f7fa",
    headerBackground: "#f5f7fa",
    foreground: "#202938",
    muted: "#667085",
    border: "#dde3ea",
    dotRed: "#ff5f57",
    dotYellow: "#febc2e",
    dotGreen: "#28c840",
    keyword: "#b42318",
    string: "#087443",
    function: "#5b21b6",
    number: "#175cd3",
    comment: "#667085",
    tag: "#087443"
  }
};

export const DEFAULT_CODE_BLOCK_PROFILE = CODE_BLOCK_PRESETS["macos-dark"];

const COLOR_PROFILE_KEYS = [
  "background", "headerBackground", "foreground", "muted", "border", "dotRed", "dotYellow", "dotGreen",
  "keyword", "string", "function", "number", "comment", "tag"
] as const;

function safeColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const color = value.trim();
  return /^(?:#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\))$/i.test(color) ? color : fallback;
}

export function resolveCodeBlockProfile(value?: Partial<CodeBlockProfile> | null): CodeBlockProfile {
  const preset: CodeBlockPreset = value?.preset === "macos-light" || value?.preset === "plain" || value?.preset === "macos-dark"
    ? value.preset
    : "macos-dark";
  const base = CODE_BLOCK_PRESETS[preset];
  const profile: CodeBlockProfile = {
    ...base,
    showChrome: typeof value?.showChrome === "boolean" ? value.showChrome : base.showChrome,
    showLanguage: typeof value?.showLanguage === "boolean" ? value.showLanguage : base.showLanguage
  };
  for (const key of COLOR_PROFILE_KEYS) profile[key] = safeColor(value?.[key], base[key]);
  return profile;
}

function important(element: HTMLElement, property: string, value: string): void {
  element.style.setProperty(property, value, "important");
}

function languageLabel(code: HTMLElement): string {
  const language = [...code.classList]
    .find((className) => className.startsWith("language-"))
    ?.slice("language-".length)
    .toLowerCase();
  if (!language) return "";
  const labels: Record<string, string> = {
    ts: "TypeScript",
    tsx: "TSX",
    js: "JavaScript",
    jsx: "JSX",
    json: "JSON",
    html: "HTML",
    css: "CSS",
    scss: "SCSS",
    bash: "Bash",
    shell: "Shell",
    sh: "Shell",
    zsh: "Zsh",
    python: "Python",
    py: "Python",
    java: "Java",
    go: "Go",
    rust: "Rust",
    sql: "SQL",
    yaml: "YAML",
    yml: "YAML",
    markdown: "Markdown",
    md: "Markdown"
  };
  return labels[language] ?? language.toUpperCase();
}

function createDot(document: Document, color: string): HTMLSpanElement {
  const dot = document.createElement("span");
  important(dot, "display", "inline-block");
  important(dot, "width", "8px");
  important(dot, "height", "8px");
  important(dot, "margin-right", "5px");
  important(dot, "border-radius", "999px");
  important(dot, "background-color", color);
  important(dot, "vertical-align", "middle");
  return dot;
}

function applyHighlightProfile(code: HTMLElement, profile: CodeBlockProfile): void {
  const colors: Record<HighlightRole, string> = {
    keyword: profile.keyword,
    string: profile.string,
    function: profile.function,
    number: profile.number,
    comment: profile.comment,
    tag: profile.tag,
    emphasis: profile.foreground,
    addition: profile.foreground,
    deletion: profile.foreground
  };
  code.querySelectorAll<HTMLElement>("[class]").forEach((element) => {
    const role = [...element.classList]
      .map((className) => HIGHLIGHT_CLASS_ROLES[className])
      .find((value): value is HighlightRole => Boolean(value));
    if (!role) return;
    important(element, "color", colors[role]);
    if (role === "addition") important(element, "background-color", "#033a16");
    if (role === "deletion") important(element, "background-color", "#67060c");
  });
}

/**
 * Materializes code chrome into the same inline DOM sent to WeChat. CSS
 * pseudo-elements, custom fonts and filters are deliberately avoided because
 * the draft editor may discard them.
 */
export function applyCodeBlockProfile(root: HTMLElement, value?: Partial<CodeBlockProfile> | null): void {
  const profile = resolveCodeBlockProfile(value);
  root.querySelectorAll<HTMLElement>("pre > code").forEach((code) => {
    const pre = code.parentElement;
    if (!(pre instanceof HTMLElement)) return;
    const existingWindow = pre.parentElement?.matches("[data-wop-code-window]");
    if (existingWindow) return;

    const frame = root.ownerDocument.createElement("section");
    frame.className = "wop-code-window";
    frame.dataset.wopCodeWindow = "true";
    important(frame, "box-sizing", "border-box");
    important(frame, "width", "100%");
    important(frame, "margin", "1em 0");
    important(frame, "overflow", "hidden");
    important(frame, "border", `1px solid ${profile.border}`);
    important(frame, "border-radius", profile.showChrome ? "10px" : "7px");
    important(frame, "background-color", profile.background);

    pre.replaceWith(frame);
    if (profile.showChrome) {
      const toolbar = root.ownerDocument.createElement("section");
      toolbar.dataset.wopCodeToolbar = "true";
      important(toolbar, "box-sizing", "border-box");
      important(toolbar, "display", "block");
      important(toolbar, "min-height", "28px");
      important(toolbar, "padding", "8px 11px");
      important(toolbar, "border-bottom", `1px solid ${profile.border}`);
      important(toolbar, "background-color", profile.headerBackground);
      toolbar.append(createDot(root.ownerDocument, profile.dotRed), createDot(root.ownerDocument, profile.dotYellow), createDot(root.ownerDocument, profile.dotGreen));
      const language = profile.showLanguage ? languageLabel(code) : "";
      if (language) {
        const label = root.ownerDocument.createElement("span");
        label.dataset.wopCodeLanguage = "true";
        label.textContent = language;
        important(label, "display", "inline-block");
        important(label, "margin-left", "5px");
        important(label, "color", profile.muted);
        important(label, "font-family", MONO);
        important(label, "font-size", "10px");
        important(label, "line-height", "1");
        important(label, "vertical-align", "middle");
        toolbar.appendChild(label);
      }
      frame.appendChild(toolbar);
    }
    frame.appendChild(pre);

    important(pre, "box-sizing", "border-box");
    important(pre, "width", "100%");
    important(pre, "margin", "0");
    important(pre, "padding", "13px 15px 15px");
    important(pre, "overflow-x", "auto");
    important(pre, "background", profile.background);
    important(pre, "color", profile.foreground);
    important(pre, "font-family", MONO);
    important(pre, "font-size", "13px");
    important(pre, "line-height", "1.65");
    important(pre, "white-space", "pre");
    important(pre, "word-break", "normal");
    important(pre, "text-align", "left");

    important(code, "display", "block");
    important(code, "min-width", "max-content");
    important(code, "padding", "0");
    important(code, "background", "transparent");
    important(code, "color", profile.foreground);
    important(code, "font-family", MONO);
    important(code, "font-size", "inherit");
    important(code, "line-height", "inherit");
    important(code, "white-space", "pre");
    applyHighlightProfile(code, profile);
  });
}

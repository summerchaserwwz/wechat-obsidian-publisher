import * as cssTree from "css-tree";
import type { PublisherTemplate } from "../types";

type StyleMap = PublisherTemplate["styles"];
type Variables = Map<string, string>;

interface ParsedDeclaration {
  value: string;
  important: boolean;
}

type ParsedDeclarations = Record<string, ParsedDeclaration>;

interface PseudoRule {
  selector: string;
  placement: "before" | "after";
  declarations: ParsedDeclarations;
}

const PARSE_OPTIONS: cssTree.ParseOptions = {
  context: "stylesheet",
  positions: false,
  parseAtrulePrelude: false,
  parseCustomProperty: false,
  parseValue: false
};

const ROOT_IDS = /^(?:#wenyan|#wemd|#mdb)\b\s*/i;
const OUTPUT_ROOT = /^#output\b\s*/i;
const ROOT_CONTEXT = /^(?::root|body|section(?:\.(?:wop-article|container))?)(?=$|\s|>)/i;
const SAFE_PSEUDO_CLASSES = new Set([
  "scope",
  "nth-child",
  "nth-of-type",
  "first-child",
  "last-child",
  "first-of-type",
  "last-of-type",
  "only-child",
  "only-of-type",
  "not"
]);

function toCssProperty(property: string): string {
  return property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function isSafeCssValue(value: string): boolean {
  if (/(?:expression|javascript|behavior)\s*\(/i.test(value)) return false;
  // Custom templates are still forbidden from carrying URLs. This only permits
  // data-image values already bundled with the reviewed Wenyan source themes.
  for (const match of value.matchAll(/url\(\s*(?:(["'])([\s\S]*?)\1|([^\s)]+))\s*\)/gi)) {
    const source = (match[2] ?? match[3] ?? "").trim();
    if (!/^data:image\/(?:svg\+xml|png|jpe?g|gif|webp)(?:;[^,]*)?,/i.test(source)) return false;
  }
  return true;
}

function applyDeclarations(element: HTMLElement, declarations: Record<string, string>): void {
  for (const [property, value] of Object.entries(declarations)) {
    if (!isSafeCssValue(value)) continue;
    element.style.setProperty(toCssProperty(property), value);
  }
}

function applyParsedDeclarations(element: HTMLElement, declarations: ParsedDeclarations): void {
  for (const [property, declaration] of Object.entries(declarations)) {
    if (property.startsWith("--") || !isSafeCssValue(declaration.value)) continue;
    const cssProperty = toCssProperty(property);
    if (element.style.getPropertyPriority(cssProperty) === "important" && !declaration.important) continue;
    element.style.setProperty(cssProperty, declaration.value, declaration.important ? "important" : "");
  }
}

function parseStylesheet(css: string): cssTree.StyleSheet | null {
  try {
    const parsed = cssTree.parse(css, PARSE_OPTIONS);
    return parsed.type === "StyleSheet" ? parsed : null;
  } catch {
    return null;
  }
}

function ruleSelectors(rule: cssTree.Rule): string[] {
  if (rule.prelude.type !== "SelectorList") return [];
  return rule.prelude.children.toArray().map((selector) => cssTree.generate(selector));
}

function resolveVariables(value: string, variables: Variables): string {
  let resolved = value;
  for (let index = 0; index < 8 && resolved.includes("var("); index += 1) {
    const next = resolved.replace(/var\(\s*(--[a-z0-9_-]+)\s*(?:,\s*([^()]+))?\)/gi, (_match, key: string, fallback?: string) => {
      return variables.get(key) ?? fallback?.trim() ?? "";
    });
    if (next === resolved) break;
    resolved = next;
  }
  return resolved;
}

function normaliseInlineDataSvg(value: string): string {
  return value.replace(/data:image\/svg\+xml;utf8,([^"]+)/gi, (_match, svg: string) => {
    const bytes = new TextEncoder().encode(svg);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return `data:image/svg+xml;base64,${btoa(binary)}`;
  });
}

function ruleDeclarations(rule: cssTree.Rule, variables: Variables): ParsedDeclarations {
  const declarations: ParsedDeclarations = {};
  for (const node of rule.block.children.toArray()) {
    if (node.type !== "Declaration") continue;
    declarations[node.property] = {
      value: normaliseInlineDataSvg(resolveVariables(cssTree.generate(node.value), variables)),
      important: Boolean(node.important)
    };
  }
  return declarations;
}

function collectVariables(stylesheet: cssTree.StyleSheet): Variables {
  const variables: Variables = new Map();
  cssTree.walk(stylesheet, {
    visit: "Rule",
    enter(node) {
      if (
        node.type !== "Rule" ||
        !ruleSelectors(node).some((selector) => normaliseSelector(selector) === "body")
      ) {
        return;
      }
      for (const declaration of node.block.children.toArray()) {
        if (declaration.type === "Declaration" && declaration.property.startsWith("--")) {
          variables.set(declaration.property, cssTree.generate(declaration.value));
        }
      }
    }
  });
  return variables;
}

function hasUnsupportedPseudoClass(selector: string): boolean {
  return [...selector.matchAll(/:(?!:)([a-z-]+)(?:\([^)]*\))?/gi)]
    .some((match) => !SAFE_PSEUDO_CLASSES.has(match[1].toLowerCase()));
}

function normaliseSelector(selector: string): string | null {
  let normalised = selector.trim().replace(ROOT_IDS, "").trim();
  const isOutputSelector = OUTPUT_ROOT.test(normalised);
  if (isOutputSelector) normalised = normalised.replace(OUTPUT_ROOT, "").trim();

  // Doocs styles target either #output, #output .container, or a standalone
  // section.container. The rendered article is itself the only container, so
  // treat those source wrappers as the root instead of querying a child that
  // does not exist in the publishable HTML.
  if (isOutputSelector) {
    normalised = normalised.replace(/^(?:>\s*)?\.container(?=$|\s|>)/i, "").trim();
  }
  normalised = normalised.replace(ROOT_CONTEXT, "").trim();

  if (!normalised) return "body";
  if (/::?(?:before|after)\s*$/i.test(normalised) || hasUnsupportedPseudoClass(normalised)) return null;
  return normalised;
}

function targetsFor(root: HTMLElement, selector: string): HTMLElement[] {
  if (selector === "body" || selector === ":scope") return [root];
  const scopedSelector = selector.startsWith(">") ? `:scope ${selector}` : selector;
  try {
    return [...root.querySelectorAll<HTMLElement>(scopedSelector)];
  } catch {
    return [];
  }
}

function applyStyleMap(root: HTMLElement, styles: StyleMap): void {
  for (const [selector, declarations] of Object.entries(styles)) {
    for (const target of targetsFor(root, selector)) applyDeclarations(target, declarations);
  }
}

function pseudoDetails(selector: string): { selector: string; placement: "before" | "after" } | null {
  const match = selector.trim().match(/::?(before|after)\s*$/i);
  if (!match || match.index === undefined) return null;
  const targetSelector = normaliseSelector(selector.slice(0, match.index));
  return targetSelector ? { selector: targetSelector, placement: match[1].toLowerCase() as "before" | "after" } : null;
}

function mergeDeclarations(current: ParsedDeclarations, next: ParsedDeclarations): void {
  for (const [property, declaration] of Object.entries(next)) {
    const previous = current[property];
    if (!previous || declaration.important || !previous.important) current[property] = declaration;
  }
}

function pseudoContent(content: string | undefined, index: number): string {
  if (!content) return "";
  if (/counter\([^)]*editorial-section/i.test(content)) return String(index + 1).padStart(2, "0");
  const trimmed = content.trim();
  const quote = trimmed.match(/^(['"])([\s\S]*)\1$/);
  return (quote ? quote[2] : trimmed).replace(/\\(["'])/g, "$1");
}

function hasVisualPseudoStyle(declarations: ParsedDeclarations): boolean {
  return Object.keys(declarations).some((property) => !["content", "counter-increment", "counter-reset"].includes(property));
}

function materializePseudoRules(root: HTMLElement, stylesheet: cssTree.StyleSheet, variables: Variables): void {
  const rules = new Map<string, PseudoRule>();
  cssTree.walk(stylesheet, {
    visit: "Rule",
    enter(node) {
      if (node.type !== "Rule") return;
      const declarations = ruleDeclarations(node, variables);
      for (const sourceSelector of ruleSelectors(node)) {
        const pseudo = pseudoDetails(sourceSelector);
        if (!pseudo) continue;
        const key = `${pseudo.placement}:${pseudo.selector}`;
        const existing = rules.get(key) ?? { ...pseudo, declarations: {} };
        mergeDeclarations(existing.declarations, declarations);
        rules.set(key, existing);
      }
    }
  });

  for (const rule of rules.values()) {
    const content = rule.declarations.content?.value;
    if (content === undefined || (!pseudoContent(content, 0) && !hasVisualPseudoStyle(rule.declarations))) continue;
    for (const [index, target] of targetsFor(root, rule.selector).entries()) {
      const decoration = target.ownerDocument.createElement("span");
      decoration.dataset.wopThemeDecoration = rule.placement;
      decoration.dataset.wopThemeTarget = rule.selector;
      decoration.setAttribute("aria-hidden", "true");
      decoration.textContent = pseudoContent(content, index);
      const style = { ...rule.declarations };
      delete style.content;
      delete style["counter-increment"];
      delete style["counter-reset"];
      applyParsedDeclarations(decoration, style);
      if (rule.placement === "before") target.insertBefore(decoration, target.firstChild);
      else target.appendChild(decoration);
    }
  }
}

function applyRawCss(root: HTMLElement, rawCss: string): void {
  const stylesheet = parseStylesheet(rawCss);
  if (!stylesheet) return;
  const variables = collectVariables(stylesheet);
  cssTree.walk(stylesheet, {
    visit: "Rule",
    enter(node) {
      if (node.type !== "Rule") return;
      const declarations = ruleDeclarations(node, variables);
      for (const sourceSelector of ruleSelectors(node)) {
        if (pseudoDetails(sourceSelector)) continue;
        const selector = normaliseSelector(sourceSelector);
        if (!selector) continue;
        for (const target of targetsFor(root, selector)) applyParsedDeclarations(target, declarations);
      }
    }
  });
  materializePseudoRules(root, stylesheet, variables);
}

function adaptHeadingContent(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6").forEach((heading) => {
    if (heading.querySelector(":scope > .wop-heading-content")) return;
    const content = heading.ownerDocument.createElement("section");
    content.className = "content wop-heading-content";
    while (heading.firstChild) content.appendChild(heading.firstChild);
    heading.appendChild(content);
  });
}

function adaptWenyanHeadingContent(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6").forEach((heading) => {
    if (heading.querySelector(":scope > span[data-wop-wenyan-heading-content]")) return;
    const content = heading.ownerDocument.createElement("span");
    content.dataset.wopWenyanHeadingContent = "true";
    while (heading.firstChild) content.appendChild(heading.firstChild);
    heading.appendChild(content);
  });
}

function adaptWenyanFootnotes(root: HTMLElement): void {
  if (root.querySelector("[data-wop-wenyan-footnotes]")) return;
  const links = [...root.querySelectorAll<HTMLAnchorElement>("a[href]")].filter((link) => {
    const href = link.getAttribute("href")?.trim() ?? "";
    return /^(?:https?:\/\/|mailto:)/i.test(href);
  });
  if (!links.length) return;

  const footnotes = root.ownerDocument.createElement("section");
  footnotes.id = "footnotes";
  footnotes.dataset.wopWenyanFootnotes = "true";
  links.forEach((link, index) => {
    const marker = root.ownerDocument.createElement("sup");
    marker.className = "footnote";
    marker.textContent = `[${index + 1}]`;
    link.parentNode?.insertBefore(marker, link.nextSibling);

    const row = root.ownerDocument.createElement("p");
    const number = root.ownerDocument.createElement("span");
    number.className = "footnote-num";
    number.textContent = `[${index + 1}]`;
    const text = root.ownerDocument.createElement("span");
    text.className = "footnote-txt";
    text.textContent = link.href;
    row.append(number, text);
    footnotes.appendChild(row);
  });
  root.appendChild(footnotes);
}

function adaptListContent(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>("li").forEach((item) => {
    if (item.querySelector(":scope > .wop-list-content")) return;
    const contentNodes = [...item.childNodes].filter((node) => {
      return !(node instanceof HTMLElement && (node.tagName === "UL" || node.tagName === "OL"));
    });
    if (!contentNodes.length) return;
    const content = item.ownerDocument.createElement("section");
    content.className = "content wop-list-content";
    item.insertBefore(content, contentNodes[0]);
    contentNodes.forEach((node) => content.appendChild(node));
  });
}

function adaptQuoteLevels(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>("blockquote").forEach((quote) => {
    let depth = 1;
    let parent = quote.parentElement;
    while (parent) {
      if (parent.tagName === "BLOCKQUOTE") depth += 1;
      parent = parent.parentElement;
    }
    quote.classList.add(`multiquote-${Math.min(depth, 3)}`);
  });
}

function applyStructureAdapter(root: HTMLElement, template: PublisherTemplate): void {
  if (template.structureAdapter === "wenyan") {
    adaptWenyanHeadingContent(root);
    adaptWenyanFootnotes(root);
    return;
  }
  if (template.structureAdapter !== "publication") return;
  adaptHeadingContent(root);
  adaptListContent(root);
  adaptQuoteLevels(root);
}

function applyLeftReadingAlignment(root: HTMLElement, template: PublisherTemplate): void {
  if (template.alignment === "source") return;
  root.style.setProperty("letter-spacing", "0", "important");
  root.style.setProperty("word-spacing", "normal", "important");
  root.querySelectorAll<HTMLElement>("p, li, blockquote, blockquote p, th, td, figcaption, #footnotes p").forEach((element) => {
    element.style.setProperty("text-align", "left", "important");
    element.style.setProperty("letter-spacing", "0", "important");
    element.style.setProperty("word-spacing", "normal", "important");
  });
}

function ensureRootTypography(root: HTMLElement): void {
  // A source stylesheet may deliberately omit its root declaration. The
  // fallback keeps exported WeChat HTML readable without overriding source
  // typography that was successfully applied above.
  if (!root.style.getPropertyValue("font-family")) {
    root.style.setProperty("font-family", "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif");
  }
  if (!root.style.getPropertyValue("font-size")) root.style.setProperty("font-size", "16px");
  if (!root.style.getPropertyValue("line-height")) root.style.setProperty("line-height", "1.8");
}

export function applyTemplateStyles(root: HTMLElement, template: PublisherTemplate): void {
  applyStructureAdapter(root, template);
  if (template.rawCss) applyRawCss(root, template.rawCss);
  ensureRootTypography(root);
  applyStyleMap(root, template.styles);
  // Decorations are materialized after the initial inline pass. Apply the map
  // once more so a user template can style its generated marker nodes.
  applyStyleMap(root, template.styles);
  applyLeftReadingAlignment(root, template);
}

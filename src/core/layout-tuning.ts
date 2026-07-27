import type { ArticleLayoutTuning } from "../types";

export type LayoutPresetId = "mobile" | "balanced" | "relaxed";

export const LAYOUT_PRESETS: Record<LayoutPresetId, { name: string; tuning: ArticleLayoutTuning }> = {
  mobile: {
    name: "手机阅读",
    tuning: { fontSize: 15, lineHeight: 1.72, paragraphSpacing: 10, headingSpacing: 20, verticalPadding: 0, contentPadding: 4 }
  },
  balanced: {
    name: "微信标准",
    tuning: { fontSize: 16, lineHeight: 1.85, paragraphSpacing: 20, headingSpacing: 32, verticalPadding: 14, contentPadding: 14 }
  },
  relaxed: {
    name: "舒展",
    tuning: { fontSize: 17, lineHeight: 1.95, paragraphSpacing: 26, headingSpacing: 40, verticalPadding: 18, contentPadding: 18 }
  }
};

/**
 * Mobile reading is the product default. Source themes may opt back into their
 * original layout, but imported CSS must not silently restore wide web margins.
 */
export const DEFAULT_MOBILE_LAYOUT_TUNING = LAYOUT_PRESETS.mobile.tuning;

function numberInRange(value: unknown, fallback: number, min: number, max: number, step = 1): number {
  const parsed = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  const bounded = Math.min(max, Math.max(min, parsed));
  return Math.round(bounded / step) * step;
}

export function normalizeLayoutTuning(value: unknown): ArticleLayoutTuning | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<ArticleLayoutTuning>;
  return {
    fontSize: numberInRange(candidate.fontSize, LAYOUT_PRESETS.balanced.tuning.fontSize, 12, 22),
    lineHeight: numberInRange(candidate.lineHeight, LAYOUT_PRESETS.balanced.tuning.lineHeight, 1.5, 2.1, 0.05),
    paragraphSpacing: numberInRange(candidate.paragraphSpacing, LAYOUT_PRESETS.balanced.tuning.paragraphSpacing, 8, 32),
    headingSpacing: numberInRange(candidate.headingSpacing, LAYOUT_PRESETS.balanced.tuning.headingSpacing, 14, 56),
    verticalPadding: numberInRange(candidate.verticalPadding, LAYOUT_PRESETS.balanced.tuning.verticalPadding, 0, 32),
    contentPadding: numberInRange(candidate.contentPadding, LAYOUT_PRESETS.balanced.tuning.contentPadding, 0, 32)
  };
}

export function normalizeLayoutMap(value: unknown): Record<string, ArticleLayoutTuning> {
  if (!value || typeof value !== "object") return {};
  const result: Record<string, ArticleLayoutTuning> = {};
  for (const [templateId, tuning] of Object.entries(value)) {
    const normalized = normalizeLayoutTuning(tuning);
    if (normalized && /^[a-z0-9_-]{1,120}$/i.test(templateId)) result[templateId] = normalized;
  }
  return result;
}

export function layoutPresetId(tuning: ArticleLayoutTuning | null): LayoutPresetId | "custom" | "source" {
  if (!tuning) return "source";
  for (const [id, preset] of Object.entries(LAYOUT_PRESETS) as Array<[LayoutPresetId, typeof LAYOUT_PRESETS[LayoutPresetId]]>) {
    if (Object.entries(preset.tuning).every(([key, value]) => tuning[key as keyof ArticleLayoutTuning] === value)) return id;
  }
  return "custom";
}

function setLayoutStyle(element: HTMLElement, property: string, value: string): void {
  element.style.setProperty(property, value, "important");
}

/**
 * This runs after a template's source CSS has been materialized. The values
 * therefore become part of the same HTML used for preview and draft creation.
 */
export function applyLayoutTuning(root: HTMLElement, tuning: ArticleLayoutTuning): void {
  setLayoutStyle(root, "box-sizing", "border-box");
  setLayoutStyle(root, "font-size", `${tuning.fontSize}px`);
  setLayoutStyle(root, "line-height", String(tuning.lineHeight));
  setLayoutStyle(root, "padding", `${tuning.verticalPadding}px ${tuning.contentPadding}px`);
  setLayoutStyle(root, "margin", "0");
  setLayoutStyle(root, "max-width", "none");

  const applyBlockSpacing = (selector: string, bottom: number) => {
    root.querySelectorAll<HTMLElement>(selector).forEach((element) => {
      setLayoutStyle(element, "margin", `0 0 ${bottom}px`);
    });
  };

  applyBlockSpacing("p", tuning.paragraphSpacing);
  root.querySelectorAll<HTMLElement>("blockquote p, li > p").forEach((paragraph) => {
    setLayoutStyle(paragraph, "margin", "0");
  });
  applyBlockSpacing("blockquote, ul, ol, figure, pre, table, hr", tuning.paragraphSpacing);

  // Source themes commonly set these values directly on p/li/quote/table
  // nodes. Root inheritance alone therefore cannot make a real draft react
  // to the controls. Keep code blocks untouched so their readability stays
  // under the template's control.
  root.querySelectorAll<HTMLElement>("p, li, blockquote, figcaption, table, th, td").forEach((element) => {
    setLayoutStyle(element, "font-size", `${tuning.fontSize}px`);
    setLayoutStyle(element, "line-height", String(tuning.lineHeight));
  });
  const listItemSpacing = Math.max(4, Math.round(tuning.paragraphSpacing * 0.5));
  root.querySelectorAll<HTMLElement>("li").forEach((item) => {
    setLayoutStyle(item, "margin", `0 0 ${listItemSpacing}px`);
  });

  const headingBottom = Math.max(8, Math.round(tuning.headingSpacing * 0.45));
  const headingSizes = [
    tuning.fontSize + 8,
    tuning.fontSize + 5,
    tuning.fontSize + 3,
    tuning.fontSize + 2,
    tuning.fontSize + 1,
    tuning.fontSize
  ];
  root.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6").forEach((heading) => {
    const level = Number(heading.tagName.slice(1));
    setLayoutStyle(heading, "font-size", `${headingSizes[level - 1]}px`);
    setLayoutStyle(heading, "line-height", level === 1 ? "1.35" : "1.45");
    setLayoutStyle(heading, "margin", `${tuning.headingSpacing}px 0 ${headingBottom}px`);
  });
  root.querySelectorAll<HTMLElement>(":scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6").forEach((heading) => {
    if (!heading.previousElementSibling) setLayoutStyle(heading, "margin-top", "0");
  });
  const lastChild = root.lastElementChild;
  if (lastChild instanceof HTMLElement) setLayoutStyle(lastChild, "margin-bottom", "0");
}

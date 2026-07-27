export interface TemplateScrollAnchor {
  scrollTop: number;
  templateId: string | null;
  offset: number;
}

/** Capture the first visible template rather than only a raw scrollTop. */
export function captureTemplateScrollAnchor(results: HTMLElement): TemplateScrollAnchor {
  const resultsRect = results.getBoundingClientRect();
  const visibleLine = resultsRect.top + Math.min(28, Math.max(1, results.clientHeight) / 2);
  const rows = [...results.querySelectorAll<HTMLElement>("[data-template-id]")];
  const row = rows.find((candidate) => {
    const rect = candidate.getBoundingClientRect();
    return rect.bottom > visibleLine && (resultsRect.height === 0 || rect.top < resultsRect.bottom);
  }) ?? rows[0];
  return {
    scrollTop: results.scrollTop,
    templateId: row?.dataset.templateId ?? null,
    offset: row ? row.getBoundingClientRect().top - resultsRect.top : 0
  };
}

/** Restore by row identity, so a favourite moving to a new section stays visible. */
export function restoreTemplateScrollAnchor(results: HTMLElement, anchor: TemplateScrollAnchor): void {
  const row = anchor.templateId
    ? [...results.querySelectorAll<HTMLElement>("[data-template-id]")].find((candidate) => candidate.dataset.templateId === anchor.templateId)
    : undefined;
  if (!row) {
    results.scrollTop = anchor.scrollTop;
    return;
  }
  const contentOffset = results.scrollTop + row.getBoundingClientRect().top - results.getBoundingClientRect().top;
  results.scrollTop = Math.max(0, contentOffset - anchor.offset);
}

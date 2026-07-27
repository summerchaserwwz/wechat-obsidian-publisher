/** @vitest-environment happy-dom */

import { describe, expect, it } from "vitest";
import { captureTemplateScrollAnchor, restoreTemplateScrollAnchor } from "../src/ui/template-scroll-anchor";

function setRect(element: HTMLElement, top: number, height: number): void {
  Object.defineProperty(element, "getBoundingClientRect", {
    configurable: true,
    value: () => ({ top, bottom: top + height, height, left: 0, right: 0, width: 0, x: 0, y: top, toJSON: () => ({}) })
  });
}

function row(parent: HTMLElement, id: string, top: number): HTMLElement {
  const element = document.createElement("div");
  parent.appendChild(element);
  element.dataset.templateId = id;
  setRect(element, top, 36);
  return element;
}

describe("模板列表滚动锚点", () => {
  it("刷新后仍将原来可见的模板留在同一视口位置", () => {
    const before = document.createElement("div");
    Object.defineProperty(before, "clientHeight", { value: 240 });
    setRect(before, 100, 240);
    before.scrollTop = 500;
    row(before, "top", 64);
    row(before, "middle", 116);
    row(before, "next", 156);

    const anchor = captureTemplateScrollAnchor(before);
    expect(anchor).toEqual({ scrollTop: 500, templateId: "middle", offset: 16 });

    const after = document.createElement("div");
    Object.defineProperty(after, "clientHeight", { value: 240 });
    setRect(after, 100, 240);
    row(after, "top", 100);
    row(after, "middle", 412);
    row(after, "next", 452);
    restoreTemplateScrollAnchor(after, anchor);

    expect(after.scrollTop).toBe(296);
  });

  it("筛选结果里找不到原模板时回退到原始滚动数值", () => {
    const results = document.createElement("div");
    Object.defineProperty(results, "clientHeight", { value: 240 });
    setRect(results, 100, 240);
    row(results, "another", 100);

    restoreTemplateScrollAnchor(results, { scrollTop: 188, templateId: "removed", offset: 12 });
    expect(results.scrollTop).toBe(188);
  });
});

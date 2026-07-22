import { describe, expect, it } from "vitest";
import { composeMarkdown, moveModule } from "../src/core/modules";
import { BUILT_IN_TEMPLATES, cloneTemplate, validateTemplate } from "../src/core/templates";
import type { ContentModule } from "../src/types";

const modules: ContentModule[] = [
  { id: "a", name: "前一", placement: "before", enabled: true, markdown: "前一" },
  { id: "b", name: "前二", placement: "before", enabled: false, markdown: "前二" },
  { id: "c", name: "后一", placement: "after", enabled: true, markdown: "后一" }
];

describe("内容模块编排", () => {
  it("只组合启用的模块并保持前后顺序", () => {
    expect(composeMarkdown("正文", modules)).toBe("前一\n\n正文\n\n后一");
  });

  it("不会把模块跨越正文前后分组移动", () => {
    expect(moveModule(modules, "a", 1).map((module) => module.id)).toEqual(["b", "a", "c"]);
    expect(moveModule(modules, "c", -1).map((module) => module.id)).toEqual(["a", "b", "c"]);
  });
});

describe("模板令牌", () => {
  it("内置模板覆盖 MD2 和 Wenyan 两类风格", () => {
    expect(BUILT_IN_TEMPLATES.some((template) => template.source === "md2-inspired")).toBe(true);
    expect(BUILT_IN_TEMPLATES.some((template) => template.source === "wenyan-inspired")).toBe(true);
  });

  it("复制模板时生成独立的用户模板", () => {
    const cloned = cloneTemplate(BUILT_IN_TEMPLATES[0]);
    expect(cloned.id).not.toBe(BUILT_IN_TEMPLATES[0].id);
    expect(cloned.source).toBe("custom");
    cloned.styles.body.color = "#000000";
    expect(BUILT_IN_TEMPLATES[0].styles.body.color).not.toBe("#000000");
  });

  it("导入模板时移除不受支持的样式属性", () => {
    const candidate = cloneTemplate(BUILT_IN_TEMPLATES[0]);
    candidate.styles.p.position = "fixed";
    const validated = validateTemplate(candidate);
    expect(validated.styles.p.position).toBeUndefined();
    expect(validated.styles.p.margin).toBeTruthy();
  });
});

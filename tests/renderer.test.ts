/** @vitest-environment happy-dom */

import { describe, expect, it } from "vitest";
import { RenderEngine } from "../src/core/renderer";
import { BUILT_IN_TEMPLATES } from "../src/core/templates";
import type { ContentModule } from "../src/types";

const markdown = `---
title: 全量主题渲染测试
author: Test
---

# 一级标题

正文包含 **重点**、[链接](https://example.com) 和 \`代码\`。

## 二级标题

> 引用段落

| 项目 | 状态 |
| --- | --- |
| 主题 | 通过 |

\`\`\`ts
const ready = true;
\`\`\`
`;

const tableModules: ContentModule[] = [
  { id: "before-table", name: "表格说明", placement: "before-first-table", enabled: true, markdown: "表格前说明" },
  { id: "after-table", name: "表格结论", placement: "after-first-table", enabled: true, markdown: "表格后结论" }
];

describe("100 套主题真实渲染", () => {
  it("每套主题都能生成带完整内联样式的公众号 HTML", async () => {
    const engine = new RenderEngine();
    for (const template of BUILT_IN_TEMPLATES) {
      const rendered = await engine.render({
        markdown,
        fallbackTitle: "测试",
        defaultAuthor: "Test",
        template,
        modules: tableModules
      });
      const root = document.createElement("div");
      root.innerHTML = rendered.html;
      const article = root.querySelector<HTMLElement>(".wop-article");
      const heading = root.querySelector<HTMLElement>("h2");
      expect(article?.dataset.template).toBe(template.id);
      expect(article?.dataset.themeGroup).toBe(template.group);
      expect(article?.style.fontFamily).toBeTruthy();
      expect(heading?.style.color).toBeTruthy();
      expect(rendered.html.indexOf("表格前说明")).toBeLessThan(rendered.html.indexOf("<table"));
      expect(rendered.html.indexOf("表格后结论")).toBeGreaterThan(rendered.html.indexOf("</table>"));
    }
  });
});

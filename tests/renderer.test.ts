/** @vitest-environment happy-dom */

import { describe, expect, it } from "vitest";
import { RenderEngine } from "../src/core/renderer";
import { ALL_TEMPLATES, BUILT_IN_TEMPLATES } from "../src/core/templates";
import { serializeSvgForCanvas } from "../src/publish/wechat-client";
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

describe("内置主题真实渲染", () => {
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
      expect(heading?.getAttribute("style")).toBeTruthy();
      expect(rendered.html.indexOf("表格前说明")).toBeLessThan(rendered.html.indexOf("<table"));
      expect(rendered.html.indexOf("表格后结论")).toBeGreaterThan(rendered.html.indexOf("</table>"));
    }
  });

  it("40 套来源原版会保留原 CSS，并输出左读的可发布 HTML", async () => {
    const engine = new RenderEngine();
    const sourceTemplates = BUILT_IN_TEMPLATES.filter((template) => template.source === "source-theme");
    expect(sourceTemplates).toHaveLength(40);

    for (const template of sourceTemplates) {
      const rendered = await engine.render({
        markdown,
        fallbackTitle: "测试",
        defaultAuthor: "Test",
        template,
        modules: []
      });
      const root = document.createElement("div");
      root.innerHTML = rendered.html;
      const article = root.querySelector<HTMLElement>(".wop-article");
      const paragraph = root.querySelector<HTMLElement>("p");
      const tableCell = root.querySelector<HTMLElement>("td");

      expect(template.rawCss, template.id).toBeTruthy();
      expect(template.rawCss, template.id).not.toMatch(/@import|url\(\s*['\"]?https?:/i);
      expect(article?.style.fontFamily, template.id).toBeTruthy();
      expect(root.querySelector<HTMLElement>("h2")?.getAttribute("style"), template.id).toBeTruthy();
      expect(paragraph?.style.getPropertyValue("text-align"), template.id).toBe("left");
      expect(paragraph?.style.getPropertyPriority("text-align"), template.id).toBe("important");
      expect(tableCell?.style.getPropertyValue("text-align"), template.id).toBe("left");
      expect(rendered.html, template.id).not.toContain("var(");
    }
  });

  it("Mermaid 发布 SVG 不使用会污染 Canvas 的 foreignObject", async () => {
    const engine = new RenderEngine();
    const rendered = await engine.render({
      markdown: `---
title: Mermaid 发布测试
author: Test
---

\`\`\`mermaid
flowchart LR
  A[Markdown 笔记] --> B[主题与模块]
  B --> C[微信兼容 HTML]
  C --> D[草稿箱]
\`\`\`
`,
      fallbackTitle: "测试",
      defaultAuthor: "Test",
      template: BUILT_IN_TEMPLATES[0],
      modules: []
    });
    expect(rendered.warnings).toEqual([]);
    expect(rendered.html).toContain("data-wop-mermaid");
    expect(rendered.html).not.toContain("foreignObject");
  });

  it("Pie 会物化标题和引用装饰，左读版会把正文改为左对齐", async () => {
    const engine = new RenderEngine();
    const source = ALL_TEMPLATES.find((template) => template.id === "curated-pie-original")!;
    const left = ALL_TEMPLATES.find((template) => template.id === "curated-pie-left")!;
    const sample = `# 一级标题

正文不应该被两端对齐拉开。

## 二级标题

### 三级标题

#### 四级标题

> 这是一段引用。`;

    const sourceRendered = await engine.render({ markdown: sample, fallbackTitle: "测试", defaultAuthor: "Test", template: source, modules: [] });
    const leftRendered = await engine.render({ markdown: sample, fallbackTitle: "测试", defaultAuthor: "Test", template: left, modules: [] });
    const sourceRoot = document.createElement("div");
    const leftRoot = document.createElement("div");
    sourceRoot.innerHTML = sourceRendered.html;
    leftRoot.innerHTML = leftRendered.html;

    expect(sourceRoot.querySelector<HTMLElement>("p")?.style.textAlign).toBe("justify");
    expect(sourceRoot.querySelector("h1 [data-wop-theme-decoration='after']")).toBeTruthy();
    expect(sourceRoot.querySelector("h3 [data-wop-theme-decoration='before']")).toBeTruthy();
    expect(sourceRoot.querySelector("h4 [data-wop-theme-decoration='before']")).toBeTruthy();
    expect(sourceRoot.querySelector("blockquote [data-wop-theme-decoration='before']")?.textContent).toBe("“");
    expect(leftRoot.querySelector<HTMLElement>("p")?.style.textAlign).toBe("left");
    expect(leftRoot.querySelector<HTMLElement>("h2")?.style.textAlign).toBe("left");
  });

  it("12 套 Wenyan 原始主题会保留结构细节，同时将中文正文改为左读", async () => {
    const engine = new RenderEngine();
    const wenyanTemplates = BUILT_IN_TEMPLATES.filter((template) => template.group === "Wenyan 原版");
    const sample = `# 一级标题含 \`code\`

正文含 [链接](https://example.com)、**强调** 和 \`行内代码\`。

## 二级标题
### 三级标题
#### 四级标题
##### 五级标题
###### 六级标题

> 一级引用
>
>> 嵌套引用

- 顶层项目
  - 嵌套项目
1. 顶层编号
   1. 嵌套编号

| 列 | 值 |
| --- | --- |
| 第一行 | A |
| 第二行 | B |
| 第三行 | C |

\`\`\`ts
const theme = "wenyan";
\`\`\``;

    expect(wenyanTemplates).toHaveLength(12);
    for (const template of wenyanTemplates) {
      expect(template.rawCss).toBeTruthy();
      expect(template.structureAdapter).toBe("wenyan");
      const rendered = await engine.render({ markdown: sample, fallbackTitle: "测试", defaultAuthor: "Test", template, modules: [] });
      const root = document.createElement("div");
      root.innerHTML = rendered.html;
      const article = root.querySelector<HTMLElement>(".wop-article")!;
      const paragraph = root.querySelector<HTMLElement>("p")!;
      expect(root.querySelector("h2 > span[data-wop-wenyan-heading-content]")).toBeTruthy();
      expect(paragraph.style.getPropertyValue("text-align")).toBe("left");
      expect(paragraph.style.getPropertyPriority("text-align")).toBe("important");
      expect(root.querySelector("#footnotes .footnote-num")).toBeTruthy();
      expect(root.querySelector(".footnote")?.textContent).toBe("[1]");
      expect(root.querySelector<HTMLElement>("ul")?.style.paddingLeft).toBe("1rem");
      expect(root.querySelector<HTMLElement>("ul ul")?.style.listStyleType).toBe("circle");
      expect(root.querySelector<HTMLElement>("pre code")?.style.display).toBe("block");
      expect([...article.querySelectorAll<HTMLElement>("[style]")].some((node) => node.getAttribute("style")?.includes("var("))).toBe(false);
    }

    const templateById = new Map(wenyanTemplates.map((template) => [template.id, template]));
    const render = async (id: string) => {
      const rendered = await engine.render({ markdown: sample, fallbackTitle: "测试", defaultAuthor: "Test", template: templateById.get(id)!, modules: [] });
      const root = document.createElement("div");
      root.innerHTML = rendered.html;
      return root;
    };

    const defaultTheme = await render("wenyan-default");
    const rainbow = await render("wenyan-rainbow");
    const maize = await render("wenyan-maize");
    expect(defaultTheme.querySelectorAll<HTMLElement>("tbody tr")[1]?.style.backgroundColor).toBe("#f8f8f8");
    expect(rainbow.querySelectorAll<HTMLElement>("tbody tr")[1]?.style.backgroundColor).toBe("rgb(255, 249, 242)");
    expect(maize.querySelectorAll<HTMLElement>("tbody tr")[1]?.style.background).toBe("#fff9f9");
    expect(maize.querySelector("h2 > span")).toBeTruthy();
    expect(maize.querySelector<HTMLElement>("h2 [data-wop-theme-decoration='before']")?.style.backgroundImage).toContain("data:image/svg+xml");

    const orangeHeart = await render("wenyan-orange-heart");
    expect(orangeHeart.querySelector("h2 > span")).toBeTruthy();
    expect(orangeHeart.querySelector("h2 [data-wop-theme-decoration='after']")).toBeTruthy();

    const phycat = await render("wenyan-mint");
    for (const heading of ["h3", "h4", "h5", "h6"]) {
      const decorations = phycat.querySelectorAll(`${heading} [data-wop-theme-decoration='after']`);
      expect(decorations).toHaveLength(1);
      expect((decorations[0] as HTMLElement).getAttribute("style")).toContain("data:image/svg+xml");
    }

    const toutiao = await render("wenyan-toutiao-default");
    expect(toutiao.querySelectorAll("h1 [data-wop-theme-decoration='before'], h2 [data-wop-theme-decoration='before'], h3 [data-wop-theme-decoration='before'], h4 [data-wop-theme-decoration='before'], h5 [data-wop-theme-decoration='before'], h6 [data-wop-theme-decoration='before']")).toHaveLength(6);
    expect(toutiao.querySelector("blockquote [data-wop-theme-decoration='before']")).toBeTruthy();

    const juejin = await render("wenyan-juejin-default");
    expect(juejin.querySelector<HTMLElement>("table")?.style.getPropertyValue("display")).toBe("inline-block");
    expect(juejin.querySelector<HTMLElement>("table")?.style.getPropertyPriority("display")).toBe("important");
  });

  it("编辑部手记会补足上游主题所需的内容节点和章节编号", async () => {
    const engine = new RenderEngine();
    const template = ALL_TEMPLATES.find((item) => item.id === "curated-modern-editorial-left")!;
    const rendered = await engine.render({
      markdown: "# 刊头\n\n正文。\n\n## 第一节\n\n内容。\n\n## 第二节\n\n内容。",
      fallbackTitle: "测试",
      defaultAuthor: "Test",
      template,
      modules: []
    });
    const root = document.createElement("div");
    root.innerHTML = rendered.html;
    expect(root.querySelector("h1 > .wop-heading-content")).toBeTruthy();
    expect(root.querySelector("h2 > .wop-heading-content")).toBeTruthy();
    expect(root.querySelector("h2 [data-wop-theme-decoration='before']")?.textContent).toBe("01");
    expect(root.querySelectorAll("h2 [data-wop-theme-decoration='before']")[1]?.textContent).toBe("02");
    expect(root.querySelector<HTMLElement>("p")?.style.textAlign).toBe("left");
  });

  it("发布前会移除导致 Canvas 污染的 SVG 内容", () => {
    const namespace = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(namespace, "svg") as SVGSVGElement;
    svg.setAttribute("viewBox", "0 0 320 120");
    const style = document.createElementNS(namespace, "style");
    style.textContent = '@import url("https://example.com/font.css"); .label { fill: #111; }';
    svg.appendChild(style);
    const foreign = document.createElementNS(namespace, "foreignObject");
    foreign.setAttribute("x", "20");
    foreign.setAttribute("y", "20");
    foreign.textContent = "主题与模块";
    svg.appendChild(foreign);
    const image = document.createElementNS(namespace, "image");
    image.setAttribute("href", "https://example.com/external.png");
    svg.appendChild(image);
    const serialized = serializeSvgForCanvas(svg);
    expect(serialized).not.toContain("foreignObject");
    expect(serialized).not.toContain("https://example.com");
    expect(serialized).toContain("主题与模块");
  });
});

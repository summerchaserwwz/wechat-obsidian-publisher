/** @vitest-environment happy-dom */

import { describe, expect, it } from "vitest";
import { LAYOUT_PRESETS } from "../src/core/layout-tuning";
import { RenderEngine } from "../src/core/renderer";
import { ALL_TEMPLATES, BUILT_IN_TEMPLATES } from "../src/core/templates";
import { compareWechatVisualHtml, prepareWechatHtml, prepareWechatPreviewHtml, serializeSvgForCanvas } from "../src/publish/wechat-client";
import { createWechatPreviewDocument } from "../src/ui/wechat-preview";
import type { ContentModule, ImageAsset } from "../src/types";

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
  it("预览和草稿箱使用同一份可视化 HTML 规则", async () => {
    const engine = new RenderEngine();
    const rendered = await engine.render({
      markdown,
      fallbackTitle: "测试",
      defaultAuthor: "Test",
      template: BUILT_IN_TEMPLATES[0],
      modules: []
    });
    const preview = await prepareWechatPreviewHtml(rendered.html);
    const publishReady = await prepareWechatHtml(rendered.html);
    const root = document.createElement("div");
    root.innerHTML = preview;
    const highlighted = root.querySelector<HTMLElement>("code.hljs");

    expect(preview).not.toContain("data-wop");
    expect(preview).not.toContain("data-source");
    expect(compareWechatVisualHtml(preview, publishReady).matches).toBe(true);
    expect(root.querySelector<HTMLElement>(".wop-article")?.style.overflowWrap).toBe("anywhere");
    expect(highlighted?.style.color).toBeTruthy();
    expect(highlighted?.style.getPropertyValue("background")).toBeTruthy();
    expect(root.querySelector("a")?.style.textDecoration).toBe("none");
    expect(root.querySelector("blockquote")?.style.margin).toBeTruthy();

    const expected = '<section class="wop-article"><p style="color:#1f2937;text-align:left">正文</p><img src="app://local/image.png" alt="示例"></section>';
    const returned = '<section id="wx-root"><p style="text-align: left; color: #1f2937">正文</p><img src="https://mmbiz.qpic.cn/example.png" alt="示例"></section>';
    expect(compareWechatVisualHtml(expected, returned).matches).toBe(true);

    const changed = '<section><p style="text-align:right;color:#1f2937">正文</p><img src="https://mmbiz.qpic.cn/example.png" alt="示例"></section>';
    expect(compareWechatVisualHtml(expected, changed).matches).toBe(false);
  });

  it("图表和正文图片在预览与草稿中保持同构", async () => {
    const source = `
<section class="wop-article" data-wop-theme-group="test">
  <section class="wop-mermaid" data-wop-mermaid="true"><svg viewBox="0 0 320 120"><text>流程图</text></svg></section>
  <figure><img src="app://local/original.png" data-source="images/original.png" alt="原图"><figcaption>图注</figcaption></figure>
</section>`;
    const rasterize = async (): Promise<ImageAsset> => ({
      source: "mermaid-0",
      bytes: new Uint8Array([137, 80, 78, 71]).buffer,
      mimeType: "image/png",
      filename: "mermaid-0.png"
    });
    const preview = await prepareWechatHtml(source, {
      rasterizeMermaid: rasterize,
      replaceMermaid: async () => "data:image/png;base64,iVBORw0KGgo=",
      replaceImage: async () => "app://local/original.png"
    });
    const draft = await prepareWechatHtml(source, {
      rasterizeMermaid: rasterize,
      replaceMermaid: async () => "https://mmbiz.qpic.cn/mermaid.png",
      replaceImage: async () => "https://mmbiz.qpic.cn/original.png"
    });
    const root = document.createElement("div");
    root.innerHTML = preview;

    expect(preview).not.toContain("<svg");
    expect(preview).not.toContain("data-wop");
    expect(preview).not.toContain("data-source");
    expect(root.querySelectorAll("img")).toHaveLength(2);
    expect(root.querySelector<HTMLElement>("img")?.style.margin).toBe("1.5em auto");
    expect(root.querySelector("figcaption")?.textContent).toBe("图注");
    expect(compareWechatVisualHtml(preview, draft).matches).toBe(true);
  });

  it("正文图片会去重上传，并限制同时进行的上传数量", async () => {
    const source = `
<section class="wop-article">
  <img data-source="images/one.png" alt="一">
  <img data-source="images/two.png" alt="二">
  <img data-source="images/one.png" alt="重复的一">
  <img data-source="images/three.png" alt="三">
  <img data-source="images/four.png" alt="四">
</section>`;
    const calls: string[] = [];
    let activeUploads = 0;
    let peakUploads = 0;

    const prepared = await prepareWechatHtml(source, {
      replaceImage: async (imageSource) => {
        calls.push(imageSource);
        activeUploads += 1;
        peakUploads = Math.max(peakUploads, activeUploads);
        await new Promise((resolve) => setTimeout(resolve, 8));
        activeUploads -= 1;
        return `https://mmbiz.qpic.cn/${imageSource}`;
      }
    });
    const root = document.createElement("div");
    root.innerHTML = prepared;

    expect(calls).toHaveLength(4);
    expect(new Set(calls)).toEqual(new Set(["images/one.png", "images/two.png", "images/three.png", "images/four.png"]));
    expect(peakUploads).toBe(3);
    expect([...root.querySelectorAll<HTMLImageElement>("img")].map((image) => image.src)).toEqual([
      "https://mmbiz.qpic.cn/images/one.png",
      "https://mmbiz.qpic.cn/images/two.png",
      "https://mmbiz.qpic.cn/images/one.png",
      "https://mmbiz.qpic.cn/images/three.png",
      "https://mmbiz.qpic.cn/images/four.png"
    ]);
  });

  it("隔离预览文档只承载已准备的公众号 HTML", async () => {
    const prepared = '<section class="wop-article" style="font-size:16px"><p style="text-align:left">正文</p></section>';
    const documentHtml = createWechatPreviewDocument(prepared);

    expect(documentHtml).toContain(`<body>${prepared}</body>`);
    expect(documentHtml).not.toContain("wop-paper");
    expect(documentHtml).not.toContain("obsidian");
  });

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
      const preview = await prepareWechatPreviewHtml(rendered.html);
      const publishReady = await prepareWechatHtml(rendered.html);
      expect(compareWechatVisualHtml(preview, publishReady).matches, template.id).toBe(true);
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

  it("微信标准布局会覆盖 Pie、MD2 和来源主题，并在预览与草稿中保持同构", async () => {
    const engine = new RenderEngine();
    const tuning = LAYOUT_PRESETS.balanced.tuning;
    const samples = [
      { name: "Wenyan Pie", template: BUILT_IN_TEMPLATES.find((template) => template.id === "wenyan")! },
      { name: "普通 MD2 catalog", template: BUILT_IN_TEMPLATES.find((template) => template.id === "md2wechat-wechat-native")! },
      { name: "source-theme", template: BUILT_IN_TEMPLATES.find((template) => template.source === "source-theme")! }
    ];
    const layoutMarkdown = `# 布局标题

这是需要统一字号、行距和段距的正文。

## 二级标题

- 第一项
- 第二项`;

    const expectImportantStyle = (element: HTMLElement | null, property: string, value: string, label: string) => {
      expect(element, `${label} 缺失`).toBeTruthy();
      expect(element?.style.getPropertyValue(property), `${label} ${property}`).toBe(value);
      expect(element?.style.getPropertyPriority(property), `${label} ${property}`).toBe("important");
    };

    for (const { name, template } of samples) {
      expect(template, `${name} 模板不存在`).toBeTruthy();
      const rendered = await engine.render({
        markdown: layoutMarkdown,
        fallbackTitle: "布局测试",
        defaultAuthor: "Test",
        template,
        modules: [],
        layoutTuning: tuning
      });
      const preview = await prepareWechatPreviewHtml(rendered.html);
      const publishReady = await prepareWechatHtml(rendered.html);
      const root = document.createElement("div");
      root.innerHTML = preview;

      const article = root.querySelector<HTMLElement>(".wop-article");
      const paragraph = root.querySelector<HTMLElement>("p");
      const listItem = root.querySelector<HTMLElement>("li");
      const heading = root.querySelector<HTMLElement>("h2");

      const expectedPadding = tuning.verticalPadding === tuning.contentPadding
        ? `${tuning.contentPadding}px`
        : `${tuning.verticalPadding}px ${tuning.contentPadding}px`;
      expectImportantStyle(article, "padding", expectedPadding, name);
      for (const [element, label] of [[paragraph, "正文"], [listItem, "列表项"]] as const) {
        expectImportantStyle(element, "font-size", `${tuning.fontSize}px`, `${name} ${label}`);
        expectImportantStyle(element, "line-height", String(tuning.lineHeight), `${name} ${label}`);
      }
      expectImportantStyle(paragraph, "margin", `0px 0px ${tuning.paragraphSpacing}px`, `${name} 正文`);
      expectImportantStyle(listItem, "margin", `0px 0px ${Math.max(4, Math.round(tuning.paragraphSpacing * 0.5))}px`, `${name} 列表项`);
      expectImportantStyle(heading, "margin", `${tuning.headingSpacing}px 0px ${Math.max(8, Math.round(tuning.headingSpacing * 0.45))}px`, `${name} 二级标题`);
      expect(compareWechatVisualHtml(preview, publishReady).matches, `${name} 预览与草稿`).toBe(true);
    }
  });

  it("未配置模板时默认使用手机阅读密度，并写入预览和草稿", async () => {
    const engine = new RenderEngine();
    const template = BUILT_IN_TEMPLATES.find((item) => item.id === "wenyan")!;
    const rendered = await engine.render({
      markdown: `# 手机阅读标题

这是手机端需要更紧凑显示的正文段落。

第二段内容用于验证段落间距。`,
      fallbackTitle: "手机阅读",
      defaultAuthor: "Test",
      template,
      modules: []
    });
    const preview = await prepareWechatPreviewHtml(rendered.html);
    const draft = await prepareWechatHtml(rendered.html);
    const root = document.createElement("div");
    root.innerHTML = preview;
    const article = root.querySelector<HTMLElement>(".wop-article");
    const paragraph = root.querySelector<HTMLElement>("p");

    expect(article?.style.getPropertyValue("padding")).toBe("10px");
    expect(article?.style.getPropertyPriority("padding")).toBe("important");
    expect(paragraph?.style.getPropertyValue("font-size")).toBe("16px");
    expect(paragraph?.style.getPropertyValue("line-height")).toBe("1.78");
    expect(paragraph?.style.getPropertyValue("margin")).toBe("0px 0px 16px");
    expect(compareWechatVisualHtml(preview, draft).matches).toBe(true);
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

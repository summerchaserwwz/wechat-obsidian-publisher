import { describe, expect, it } from "vitest";
import { composeMarkdown, injectFirstTableModules, moveModule } from "../src/core/modules";
import { MD2_THEME_DEFINITIONS, MD2_THEME_GROUPS } from "../src/core/md2-theme-catalog";
import { EXTERNAL_SOURCE_THEME_DEFINITIONS } from "../src/core/external-source-themes";
import {
  ALL_TEMPLATE_GROUPS,
  ALL_TEMPLATES,
  BUILT_IN_TEMPLATES,
  cloneTemplate,
  makeUniqueTemplate,
  parseTemplateBundle,
  serializeTemplateBundle,
  validateTemplate
} from "../src/core/templates";
import type { ContentModule } from "../src/types";
import { extractRejectedIp } from "../src/publish/wechat-client";
import { CredentialVault } from "../src/publish/credential-vault";

const modules: ContentModule[] = [
  { id: "a", name: "前一", placement: "before", enabled: true, markdown: "前一" },
  { id: "b", name: "前二", placement: "before", enabled: false, markdown: "前二" },
  { id: "tb", name: "表格前", placement: "before-first-table", enabled: true, markdown: "表格说明" },
  { id: "ta", name: "表格后", placement: "after-first-table", enabled: true, markdown: "表格结论" },
  { id: "c", name: "后一", placement: "after", enabled: true, markdown: "后一" }
];

describe("内容模块编排", () => {
  it("只组合启用的模块并保持四个位置的顺序", () => {
    const body = "正文\n\n| 项目 | 状态 |\n| --- | --- |\n| 图片 | 通过 |\n\n收束";
    expect(composeMarkdown(body, modules)).toBe(
      "前一\n\n正文\n\n表格说明\n\n| 项目 | 状态 |\n| --- | --- |\n| 图片 | 通过 |\n\n表格结论\n\n收束\n\n后一"
    );
  });

  it("没有表格时把表格模块接到正文末尾且不丢失", () => {
    expect(injectFirstTableModules("正文", ["说明"], ["结论"])).toBe("正文\n\n说明\n\n结论");
  });

  it("不会把模块跨越不同插入位置移动", () => {
    expect(moveModule(modules, "a", 1).map((module) => module.id)).toEqual(["b", "a", "tb", "ta", "c"]);
    expect(moveModule(modules, "tb", -1).map((module) => module.id)).toEqual(["a", "b", "tb", "ta", "c"]);
  });
});

describe("主题目录", () => {
  it("保留 100 套 MD2 目录，并以 40 套原版替换同 ID 的模拟主题", () => {
    expect(MD2_THEME_DEFINITIONS).toHaveLength(100);
    expect(EXTERNAL_SOURCE_THEME_DEFINITIONS).toHaveLength(40);
    expect(BUILT_IN_TEMPLATES).toHaveLength(123);
    expect(new Set(BUILT_IN_TEMPLATES.map((template) => template.id)).size).toBe(123);
  });

  it("来源原版和阅读精选都在模板库中可追溯", () => {
    expect(ALL_TEMPLATES).toHaveLength(129);
    expect(ALL_TEMPLATE_GROUPS[0]).toBe("阅读精选");
    expect(ALL_TEMPLATES.filter((template) => template.group === "阅读精选").map((template) => template.id)).toEqual(expect.arrayContaining([
      "curated-pie-original",
      "curated-pie-left",
      "curated-modern-editorial-left",
      "curated-knowledge-base-left"
    ]));
    expect(ALL_TEMPLATE_GROUPS).toEqual(expect.arrayContaining([
      "Wenyan 原版", "墨排原版", "WeMD 原版", "NeuraPress 原版", "Doocs 原版"
    ]));
    expect(EXTERNAL_SOURCE_THEME_DEFINITIONS.map((theme) => theme.id)).toEqual(expect.arrayContaining([
      "mopai-minimal-white", "wemd-modern-editorial", "neurapress-elegant", "doocs-grace"
    ]));
    for (const theme of EXTERNAL_SOURCE_THEME_DEFINITIONS) {
      const template = ALL_TEMPLATES.find((item) => item.id === theme.id);
      expect(template?.source).toBe("source-theme");
      expect(template?.rawCss).toBe(theme.rawCss);
      expect(template?.alignment).toBe("left");
    }
    expect(new Set(ALL_TEMPLATES.map((template) => template.id)).size).toBe(ALL_TEMPLATES.length);
  });

  it("覆盖 MD2 的全部来源分组和 40 套 API 目录主题", () => {
    expect(MD2_THEME_GROUPS).toEqual(expect.arrayContaining([
      "设计实验室", "独家签名", "Wenyan 原版", "开源主题", "WeMD", "微信排版", "NeuraPress", "MD2 全量", "编辑精选"
    ]));
    expect(BUILT_IN_TEMPLATES.filter((template) => template.group === "MD2 全量")).toHaveLength(40);
    expect(BUILT_IN_TEMPLATES.map((template) => template.id)).toEqual(expect.arrayContaining([
      "wenyan", "wenyan-mint", "markdown-nice-default", "doocs-grace", "wemd-aurora-glass",
      "wechat-format-lupeng", "neurapress-smartisan", "md2wechat-elegant-green", "github", "verge"
    ]));
  });

  it("每套主题都编译为可发布的完整内联样式", () => {
    for (const template of BUILT_IN_TEMPLATES) {
      expect(["md2-catalog", "source-theme"]).toContain(template.source);
      expect(template.rawCss ?? template.styles.h2?.color).toBeTruthy();
      expect(template.rawCss ?? template.styles.blockquote?.borderLeft).toBeTruthy();
      expect(template.tokens.variant).toBeTruthy();
      expect(template.license).toBeTruthy();
    }
  });
});

describe("模板 JSON 闭环", () => {
  it("复制内置模板时生成独立且可编辑的用户模板", () => {
    const builtIn = BUILT_IN_TEMPLATES.find((template) => template.id === "design-github-readme")!;
    const cloned = cloneTemplate(builtIn);
    expect(cloned.id).not.toBe(builtIn.id);
    expect(cloned.source).toBe("custom");
    expect(cloned.group).toBe("用户模板");
    cloned.styles.body.color = "#000000";
    expect(builtIn.styles.body.color).not.toBe("#000000");
  });

  it("导入模板时移除危险选择器和不受支持的样式属性", () => {
    const candidate = cloneTemplate(BUILT_IN_TEMPLATES.find((template) => template.id === "design-github-readme")!);
    candidate.styles.p.position = "fixed";
    candidate.styles["div[data-secret]"] = { color: "red" };
    const validated = validateTemplate(candidate);
    expect(validated.styles.p.position).toBeUndefined();
    expect(validated.styles["div[data-secret]"]).toBeUndefined();
    expect(validated.styles.p.margin).toBeTruthy();
  });

  it("支持单模板、数组和导出包的导入导出", () => {
    const first = cloneTemplate(BUILT_IN_TEMPLATES.find((template) => template.id === "design-github-readme")!);
    const second = cloneTemplate(BUILT_IN_TEMPLATES.find((template) => template.id === "design-doocs-grace")!);
    expect(parseTemplateBundle(JSON.stringify(first))).toHaveLength(1);
    expect(parseTemplateBundle(JSON.stringify([first, second]))).toHaveLength(2);
    const bundle = serializeTemplateBundle([first, second]);
    expect(parseTemplateBundle(bundle).map((template) => template.name)).toEqual([first.name, second.name]);
  });

  it("导入 ID 冲突时自动生成稳定的用户模板 ID", () => {
    const existing = new Set(["design-github-readme", "custom-design-github-readme"]);
    const imported = makeUniqueTemplate(validateTemplate(BUILT_IN_TEMPLATES.find((template) => template.id === "design-github-readme")!), existing);
    expect(imported.id).toBe("custom-design-github-readme-2");
    expect(imported.source).toBe("custom");
  });

  it("原始 CSS 模板可导入，但不允许带入外部资源", () => {
    const candidate = cloneTemplate(ALL_TEMPLATES.find((template) => template.id === "curated-pie-left")!);
    const validated = validateTemplate(candidate);
    expect(validated.rawCss).toContain("#wenyan h1::after");
    candidate.rawCss = "p { background: url(https://example.com/pixel.png); }";
    expect(() => validateTemplate(candidate)).toThrow("外部资源");
  });

  it("带安全内嵌 SVG 的 Wenyan 模板可以完整导出再导入", () => {
    for (const id of ["wenyan-maize", "wenyan-mint", "wenyan-toutiao-default"]) {
      const template = BUILT_IN_TEMPLATES.find((item) => item.id === id)!;
      const imported = parseTemplateBundle(serializeTemplateBundle([cloneTemplate(template)]))[0];
      expect(imported.rawCss).toContain("data:image/svg+xml");
      expect(imported.structureAdapter).toBe("wenyan");
    }
  });

  it("来源原版模板可以复制、导出并安全导入", () => {
    for (const id of ["mopai-olive-journal", "wemd-modern-editorial", "neurapress-elegant", "doocs-grace"]) {
      const template = BUILT_IN_TEMPLATES.find((item) => item.id === id)!;
      const imported = parseTemplateBundle(serializeTemplateBundle([cloneTemplate(template)]))[0];
      expect(imported.rawCss).toBe(template.rawCss);
      expect(imported.alignment).toBe("left");
      expect(imported.structureAdapter).toBe("publication");
    }
  });
});

describe("微信白名单诊断", () => {
  it("从 40164 错误中提取可复制的公网 IP", () => {
    expect(extractRejectedIp("invalid ip 36.249.156.41 ipv6 ::ffff:36.249.156.41, not in whitelist rid: 6a60908f-3211467f-14a54b34")).toBe("36.249.156.41");
  });
});

describe("账号密钥存储", () => {
  it("配置中只保存 Obsidian SecretStorage 引用", () => {
    const secrets = new Map<string, string>();
    const vault = new CredentialVault(() => ({
      setSecret: (id: string, secret: string) => { secrets.set(id, secret); },
      getSecret: (id: string) => secrets.get(id) ?? null
    } as never));
    const reference = vault.store("account-demo", "  test-secret  ");
    expect(reference).toBe("obsidian-secret:wechat-obsidian-publisher-account-demo");
    expect(reference).not.toContain("test-secret");
    expect(vault.read(reference)).toBe("test-secret");
    vault.clear(reference);
    expect(() => vault.read(reference)).toThrow("系统密钥存储中找不到 AppSecret");
  });
});

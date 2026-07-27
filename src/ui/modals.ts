import { App, Modal, Notice, Setting, setIcon } from "obsidian";
import type { ContentModule, PublisherTemplate } from "../types";
import { applyCodeBlockProfile, CODE_BLOCK_PRESETS, resolveCodeBlockProfile } from "../core/code-block-profile";
import { validateTemplate } from "../core/templates";

export class ModuleEditorModal extends Modal {
  private draft: ContentModule;

  constructor(app: App, module: ContentModule | null, private readonly onSave: (module: ContentModule) => void) {
    super(app);
    this.draft = module ? { ...module } : {
      id: `module-${Date.now().toString(36)}`,
      name: "自定义模块",
      placement: "after",
      enabled: true,
      markdown: ""
    };
  }

  onOpen(): void {
    this.titleEl.setText(this.draft.id.startsWith("module-") ? "新增内容模块" : "编辑内容模块");
    this.contentEl.addClass("wop-modal");
    const intro = this.contentEl.createDiv({ cls: "wop-modal-intro" });
    setIcon(intro.createSpan(), "blocks");
    intro.createEl("p", { text: "模块会跟随文章保存顺序，在预览和微信草稿中保持一致。" });
    new Setting(this.contentEl)
      .setName("模块名称")
      .setDesc("例如：往期推荐、作者介绍、关注提示")
      .addText((text) => text.setValue(this.draft.name).onChange((value) => { this.draft.name = value; }));
    new Setting(this.contentEl)
      .setName("插入位置")
      .setDesc("选择这段内容在正文中的出现位置")
      .addDropdown((dropdown) => dropdown
        .addOption("before", "正文前")
        .addOption("before-first-table", "首个表格前")
        .addOption("after-first-table", "首个表格后")
        .addOption("after", "正文后")
        .setValue(this.draft.placement)
        .onChange((value) => { this.draft.placement = value as ContentModule["placement"]; }));
    new Setting(this.contentEl)
      .setName("启用模块")
      .setDesc("关闭后保留内容，但不会插入文章")
      .addToggle((toggle) => toggle.setValue(this.draft.enabled).onChange((value) => { this.draft.enabled = value; }));
    this.contentEl.createEl("label", { text: "Markdown 内容", cls: "wop-field-label" });
    this.contentEl.createEl("p", { text: "可以使用标题、链接、图片和引用，效果会立即体现在文章预览中。", cls: "wop-field-help" });
    const textarea = this.contentEl.createEl("textarea", { cls: "wop-code-editor" });
    textarea.value = this.draft.markdown;
    textarea.placeholder = "例如：\n\n## 往期推荐\n\n- [上一篇文章](https://example.com)";
    textarea.rows = 12;
    textarea.addEventListener("input", () => { this.draft.markdown = textarea.value; });
    const actions = this.contentEl.createDiv({ cls: "wop-modal-actions" });
    const cancel = actions.createEl("button", { text: "取消" });
    cancel.addEventListener("click", () => this.close());
    const save = actions.createEl("button", { text: "保存模块", cls: "mod-cta" });
    save.addEventListener("click", () => {
      if (!this.draft.name.trim() || !this.draft.markdown.trim()) {
        new Notice("请填写模块名称和内容。");
        return;
      }
      this.onSave({ ...this.draft, name: this.draft.name.trim() });
      this.close();
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class TemplateEditorModal extends Modal {
  private draft: PublisherTemplate;
  private json: string;
  private advancedDirty = false;
  private advancedInvalid = false;
  private advancedTextarea: HTMLTextAreaElement | null = null;
  private previewEl: HTMLElement | null = null;

  constructor(app: App, template: PublisherTemplate, private readonly onSave: (template: PublisherTemplate) => void) {
    super(app);
    this.draft = structuredClone(template);
    this.json = JSON.stringify(this.draft, null, 2);
  }

  onOpen(): void {
    this.titleEl.setText("编辑用户模板");
    this.modalEl.addClass("wop-template-modal-shell");
    this.contentEl.addClass("wop-modal", "wop-template-modal");
    const intro = this.contentEl.createDiv({ cls: "wop-modal-intro" });
    setIcon(intro.createSpan(), "palette");
    intro.createEl("p", { text: "先调整常用样式。需要控制全部选择器时，再打开高级 JSON。" });

    const workspace = this.contentEl.createDiv({ cls: "wop-template-editor-workspace" });
    const form = workspace.createDiv({ cls: "wop-template-editor-form" });
    this.previewEl = workspace.createDiv({ cls: "wop-template-mini-preview" });

    form.createEl("h3", { text: "基本信息" });
    new Setting(form)
      .setName("模板名称")
      .addText((text) => text.setValue(this.draft.name).onChange((value) => {
        this.draft.name = value;
        this.syncAdvancedJson();
      }));
    new Setting(form)
      .setName("说明")
      .addText((text) => text.setPlaceholder("这套模板适合什么内容").setValue(this.draft.description).onChange((value) => {
        this.draft.description = value;
        this.syncAdvancedJson();
      }));

    form.createEl("h3", { text: "颜色" });
    this.addColorSetting(form, "主题色", "标题、链接和强调内容", this.draft.accent, (value) => {
      const previous = this.draft.accent;
      this.draft.accent = value;
      this.draft.tokens.accent = value;
      this.draft.tokens.link = value;
      this.draft.tokens.strong = value;
      this.replaceStyleValue(previous, value);
    });
    this.addColorSetting(form, "纸张外侧", "预览画布的背景色", this.draft.canvas, (value) => {
      const previous = this.draft.canvas;
      this.draft.canvas = value;
      this.draft.tokens.tint = value;
      this.replaceStyleValue(previous, value);
    });
    this.addColorSetting(form, "标题文字", "一级到四级标题的主要文字色", this.draft.tokens.heading, (value) => {
      const previous = this.draft.tokens.heading;
      this.draft.tokens.heading = value;
      this.replaceStyleValue(previous, value);
    });
    this.addColorSetting(form, "正文文字", "长文阅读的主要文字色", this.draft.tokens.body, (value) => {
      const previous = this.draft.tokens.body;
      this.draft.tokens.body = value;
      this.replaceStyleValue(previous, value);
    });

    form.createEl("h3", { text: "正文排版" });
    new Setting(form)
      .setName("正文字号")
      .setDesc("建议使用 15 到 17 像素")
      .addDropdown((dropdown) => {
        for (const size of ["14px", "15px", "16px", "17px", "18px"]) dropdown.addOption(size, size);
        dropdown.setValue(this.draft.styles.body?.fontSize ?? "16px").onChange((value) => {
          this.ensureBodyStyle().fontSize = value;
          this.renderMiniPreview();
          this.syncAdvancedJson();
        });
      });
    new Setting(form)
      .setName("正文行高")
      .setDesc("长文建议使用 1.8 以上")
      .addDropdown((dropdown) => {
        for (const lineHeight of ["1.65", "1.75", "1.85", "1.95", "2.05"]) dropdown.addOption(lineHeight, lineHeight);
        dropdown.setValue(this.draft.styles.body?.lineHeight ?? "1.85").onChange((value) => {
          this.ensureBodyStyle().lineHeight = value;
          this.renderMiniPreview();
          this.syncAdvancedJson();
        });
      });
    new Setting(form)
      .setName("正文字体")
      .addDropdown((dropdown) => dropdown
        .addOption("system", "系统无衬线")
        .addOption("serif", "中文衬线")
        .addOption("mono", "等宽字体")
        .setValue(this.fontChoice())
        .onChange((value) => {
          this.ensureBodyStyle().fontFamily = value === "serif"
            ? "Georgia, 'Songti SC', 'SimSun', serif"
            : value === "mono"
              ? "'SFMono-Regular', Consolas, monospace"
              : "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
          this.renderMiniPreview();
          this.syncAdvancedJson();
        }));

    form.createEl("h3", { text: "代码块" });
    new Setting(form)
      .setName("代码块外观")
      .setDesc("Mac 窗口会把三色按钮、语言名和高对比度语法颜色一起写入微信草稿。")
      .addDropdown((dropdown) => dropdown
        .addOption("macos-dark", "macOS 深色")
        .addOption("macos-light", "macOS 浅色")
        .addOption("plain", "朴素安全")
        .setValue(resolveCodeBlockProfile(this.draft.codeBlockProfile).preset)
        .onChange((value) => {
          const preset = value === "macos-light" || value === "plain" ? value : "macos-dark";
          this.draft.codeBlockProfile = { ...CODE_BLOCK_PRESETS[preset] };
          this.renderMiniPreview();
          this.syncAdvancedJson();
        }));
    new Setting(form)
      .setName("显示窗口栏")
      .setDesc("关闭后仍保留高对比度代码块，只隐藏 macOS 顶栏。")
      .addToggle((toggle) => toggle
        .setValue(resolveCodeBlockProfile(this.draft.codeBlockProfile).showChrome)
        .onChange((value) => {
          this.draft.codeBlockProfile = { ...resolveCodeBlockProfile(this.draft.codeBlockProfile), showChrome: value };
          this.renderMiniPreview();
          this.syncAdvancedJson();
        }));
    new Setting(form)
      .setName("显示语言名称")
      .setDesc("例如 TypeScript、Python。只在窗口栏开启时显示。")
      .addToggle((toggle) => toggle
        .setValue(resolveCodeBlockProfile(this.draft.codeBlockProfile).showLanguage)
        .onChange((value) => {
          this.draft.codeBlockProfile = { ...resolveCodeBlockProfile(this.draft.codeBlockProfile), showLanguage: value };
          this.renderMiniPreview();
          this.syncAdvancedJson();
        }));

    const advanced = this.contentEl.createEl("details", { cls: "wop-advanced-editor" });
    advanced.createEl("summary", { text: "高级：编辑完整模板 JSON" });
    advanced.createEl("p", { text: "适合修改边框、间距和单个 Markdown 元素。保存时会自动校验微信兼容样式。" });
    const textarea = advanced.createEl("textarea", { cls: "wop-code-editor" });
    this.advancedTextarea = textarea;
    textarea.value = this.json;
    textarea.rows = 14;
    textarea.addEventListener("input", () => {
      this.json = textarea.value;
      this.advancedDirty = true;
      try {
        this.draft = validateTemplate(JSON.parse(this.json) as unknown);
        this.advancedInvalid = false;
        this.renderMiniPreview();
      } catch {
        this.advancedInvalid = true;
      }
    });
    advanced.addEventListener("toggle", () => {
      if (advanced.open && !this.advancedDirty) {
        this.json = JSON.stringify(this.draft, null, 2);
        textarea.value = this.json;
      }
    });

    this.renderMiniPreview();
    const actions = this.contentEl.createDiv({ cls: "wop-modal-actions" });
    const cancel = actions.createEl("button", { text: "取消" });
    cancel.addEventListener("click", () => this.close());
    const save = actions.createEl("button", { text: "校验并保存", cls: "mod-cta" });
    save.addEventListener("click", () => {
      try {
        if (this.advancedInvalid) throw new Error("高级 JSON 格式有误，请修正后再保存。");
        const template = validateTemplate(this.draft);
        this.onSave(template);
        this.close();
      } catch (error) {
        new Notice(error instanceof Error ? error.message : "模板 JSON 无效。");
      }
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private addColorSetting(parent: HTMLElement, name: string, description: string, value: string, onChange: (value: string) => void): void {
    new Setting(parent)
      .setName(name)
      .setDesc(description)
      .addColorPicker((picker) => picker.setValue(value).onChange((next) => {
        onChange(next);
        this.renderMiniPreview();
        this.syncAdvancedJson();
      }))
      .addText((text) => {
        text.inputEl.addClass("wop-color-value");
        text.setValue(value).onChange((next) => {
          if (!/^#[0-9a-f]{6}$/i.test(next.trim())) return;
          onChange(next.trim());
          this.renderMiniPreview();
          this.syncAdvancedJson();
        });
      });
  }

  private ensureBodyStyle(): Record<string, string> {
    this.draft.styles.body ??= {};
    return this.draft.styles.body;
  }

  private replaceStyleValue(previous: string, next: string): void {
    if (!previous || previous === next) return;
    for (const declarations of Object.values(this.draft.styles)) {
      for (const [property, value] of Object.entries(declarations)) {
        declarations[property] = value.split(previous).join(next);
      }
    }
  }

  private fontChoice(): "system" | "serif" | "mono" {
    const font = this.draft.styles.body?.fontFamily ?? "";
    if (/mono|consolas/i.test(font)) return "mono";
    if (/sans-serif|system-ui|segoe|pingfang|microsoft yahei/i.test(font)) return "system";
    if (/georgia|songti|simsun/i.test(font)) return "serif";
    return "system";
  }

  private syncAdvancedJson(): void {
    if (!this.advancedDirty || this.advancedInvalid || !this.advancedTextarea) return;
    this.json = JSON.stringify(this.draft, null, 2);
    this.advancedTextarea.value = this.json;
  }

  private renderMiniPreview(): void {
    if (!this.previewEl) return;
    this.previewEl.empty();
    this.previewEl.style.backgroundColor = this.draft.canvas;
    const label = this.previewEl.createDiv({ cls: "wop-template-mini-label" });
    label.createSpan({ text: "实时示意" });
    const paper = this.previewEl.createDiv({ cls: "wop-template-mini-paper" });
    Object.assign(paper.style, this.draft.styles.body ?? {});
    const heading = paper.createEl("h2", { text: "让好内容更好读" });
    Object.assign(heading.style, this.draft.styles.h2 ?? {});
    const paragraph = paper.createEl("p", { text: "这是一段正文示意，用来检查字号、行距和颜色是否适合长文阅读。" });
    Object.assign(paragraph.style, this.draft.styles.p ?? {});
    const quote = paper.createEl("blockquote");
    quote.createEl("p", { text: "模板只负责表达，不应该打断写作。" });
    Object.assign(quote.style, this.draft.styles.blockquote ?? {});
    const pre = paper.createEl("pre");
    Object.assign(pre.style, this.draft.styles.pre ?? {});
    const code = pre.createEl("code", { text: "const publish = await draft.save();" });
    code.addClass("hljs", "language-ts");
    Object.assign(code.style, this.draft.styles.code ?? {});
    applyCodeBlockProfile(paper, this.draft.codeBlockProfile);
  }
}

export class ConfirmPublishModal extends Modal {
  private resolve: ((confirmed: boolean) => void) | null = null;
  private settled = false;

  static ask(app: App, title: string, operation: "add" | "update"): Promise<boolean> {
    const modal = new ConfirmPublishModal(app, title, operation);
    const answer = new Promise<boolean>((resolve) => { modal.resolve = resolve; });
    modal.open();
    return answer;
  }

  constructor(app: App, private readonly articleTitle: string, private readonly operation: "add" | "update") {
    super(app);
  }

  onOpen(): void {
    this.titleEl.setText(this.operation === "update" ? "确认更新微信草稿" : "确认创建微信草稿");
    this.contentEl.addClass("wop-modal", "wop-confirm-modal");
    const intro = this.contentEl.createDiv({ cls: "wop-modal-intro is-warning" });
    setIcon(intro.createSpan(), "send");
    intro.createEl("p", { text: `即将${this.operation === "update" ? "更新" : "创建"}《${this.articleTitle}》。提交后会自动回读草稿进行校验。` });
    const actions = this.contentEl.createDiv({ cls: "wop-modal-actions" });
    const cancel = actions.createEl("button", { text: "取消" });
    cancel.addEventListener("click", () => this.finish(false));
    const confirm = actions.createEl("button", { text: this.operation === "update" ? "确认更新" : "确认发布草稿", cls: "mod-cta" });
    confirm.addEventListener("click", () => this.finish(true));
  }

  onClose(): void {
    if (!this.settled) this.resolve?.(false);
    this.contentEl.empty();
  }

  private finish(confirmed: boolean): void {
    this.settled = true;
    this.resolve?.(confirmed);
    this.close();
  }
}

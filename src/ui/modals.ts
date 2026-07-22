import { App, Modal, Notice, Setting } from "obsidian";
import type { ContentModule, PublisherTemplate } from "../types";
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
    new Setting(this.contentEl)
      .setName("模块名称")
      .addText((text) => text.setValue(this.draft.name).onChange((value) => { this.draft.name = value; }));
    new Setting(this.contentEl)
      .setName("插入位置")
      .addDropdown((dropdown) => dropdown
        .addOption("before", "正文前")
        .addOption("before-first-table", "首个表格前")
        .addOption("after-first-table", "首个表格后")
        .addOption("after", "正文后")
        .setValue(this.draft.placement)
        .onChange((value) => { this.draft.placement = value as ContentModule["placement"]; }));
    this.contentEl.createEl("label", { text: "Markdown 内容", cls: "wop-field-label" });
    const textarea = this.contentEl.createEl("textarea", { cls: "wop-code-editor" });
    textarea.value = this.draft.markdown;
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
  private json: string;

  constructor(app: App, template: PublisherTemplate, private readonly onSave: (template: PublisherTemplate) => void) {
    super(app);
    this.json = JSON.stringify(template, null, 2);
  }

  onOpen(): void {
    this.titleEl.setText("编辑用户模板");
    this.contentEl.addClass("wop-modal", "wop-template-modal");
    this.contentEl.createEl("p", {
      text: "修改颜色、字号、间距和边框。为保证微信兼容性，只会保留受支持的内联样式属性。",
      cls: "setting-item-description"
    });
    const textarea = this.contentEl.createEl("textarea", { cls: "wop-code-editor" });
    textarea.value = this.json;
    textarea.rows = 22;
    textarea.addEventListener("input", () => { this.json = textarea.value; });
    const actions = this.contentEl.createDiv({ cls: "wop-modal-actions" });
    const cancel = actions.createEl("button", { text: "取消" });
    cancel.addEventListener("click", () => this.close());
    const save = actions.createEl("button", { text: "校验并保存", cls: "mod-cta" });
    save.addEventListener("click", () => {
      try {
        const template = validateTemplate(JSON.parse(this.json) as unknown);
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
    this.contentEl.createEl("p", { text: `即将${this.operation === "update" ? "更新" : "创建"}《${this.articleTitle}》。提交后会自动回读草稿进行校验。` });
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

import { ItemView, Notice, WorkspaceLeaf, setIcon } from "obsidian";
import type WechatObsidianPublisherPlugin from "../main";
import type { ContentModule, PublisherTab, PublisherTemplate, RenderedArticle } from "../types";
import { VIEW_TYPE_PUBLISHER } from "../defaults";
import { BUILT_IN_TEMPLATES, cloneTemplate, findTemplate } from "../core/templates";
import { ModuleEditorModal, TemplateEditorModal } from "./modals";

function iconButton(parent: HTMLElement, icon: string, label: string, action: () => void | Promise<void>): HTMLButtonElement {
  const button = parent.createEl("button", { cls: "wop-icon-button", attr: { "aria-label": label } });
  setIcon(button, icon);
  button.addEventListener("click", () => void action());
  return button;
}

function textButton(parent: HTMLElement, text: string, action: () => void | Promise<void>, cta = false): HTMLButtonElement {
  const button = parent.createEl("button", { text, cls: cta ? "wop-button wop-button-primary" : "wop-button" });
  button.addEventListener("click", () => void action());
  return button;
}

export class PublisherView extends ItemView {
  private generation = 0;

  constructor(leaf: WorkspaceLeaf, private readonly host: WechatObsidianPublisherPlugin) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_PUBLISHER;
  }

  getDisplayText(): string {
    return "微信发布工作台";
  }

  getIcon(): string {
    return "send";
  }

  async onOpen(): Promise<void> {
    this.contentEl.addClass("wop-view");
    await this.refresh();
  }

  async refresh(): Promise<void> {
    const generation = ++this.generation;
    this.contentEl.empty();
    const loading = this.contentEl.createDiv({ cls: "wop-loading" });
    loading.createDiv({ cls: "wop-loading-line is-wide" });
    loading.createDiv({ cls: "wop-loading-line" });
    try {
      const { file, article } = await this.host.renderActiveArticle();
      if (generation !== this.generation) return;
      this.renderWorkspace(file.path, file.basename, article);
    } catch (error) {
      if (generation !== this.generation) return;
      this.renderWorkspace("", "未选择 Markdown 笔记", null, error instanceof Error ? error.message : "无法生成预览。");
    }
  }

  private renderWorkspace(path: string, basename: string, article: RenderedArticle | null, error = ""): void {
    this.contentEl.empty();
    const toolbar = this.contentEl.createDiv({ cls: "wop-toolbar" });
    const identity = toolbar.createDiv({ cls: "wop-document-identity" });
    const mark = identity.createDiv({ cls: "wop-document-mark" });
    setIcon(mark, "file-text");
    const titleGroup = identity.createDiv({ cls: "wop-document-title-group" });
    titleGroup.createEl("strong", { text: article?.meta.title || basename });
    titleGroup.createEl("span", { text: path || "打开文章后自动预览" });

    const controls = toolbar.createDiv({ cls: "wop-toolbar-controls" });
    this.renderAccountSelect(controls);
    this.renderTemplateSelect(controls);
    iconButton(controls, "refresh-cw", "刷新预览", () => this.refresh());
    const copy = iconButton(controls, "copy", "复制公众号 HTML", async () => {
      if (!article) return;
      await navigator.clipboard.writeText(article.html);
      new Notice("已复制公众号 HTML。");
    });
    copy.disabled = !article;
    const publish = textButton(controls, "发布草稿", () => article ? this.host.publishCurrent(article) : undefined, true);
    publish.disabled = !article;
    iconButton(controls, "settings", "打开设置", () => this.host.openSettings());

    const tabs = this.contentEl.createDiv({ cls: "wop-tabs", attr: { role: "tablist" } });
    const tabItems: Array<[PublisherTab, string]> = [
      ["preview", "预览"],
      ["modules", "前后模块"],
      ["templates", "模板"],
      ["publish", "发布检查"]
    ];
    for (const [id, label] of tabItems) {
      const tab = tabs.createEl("button", { text: label, cls: this.host.settings.activeTab === id ? "is-active" : "" });
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", String(this.host.settings.activeTab === id));
      tab.addEventListener("click", async () => {
        this.host.settings.activeTab = id;
        await this.host.saveSettings();
      });
    }

    const panel = this.contentEl.createDiv({ cls: "wop-panel" });
    if (error) {
      const empty = panel.createDiv({ cls: "wop-empty-state" });
      const icon = empty.createDiv({ cls: "wop-empty-icon" });
      setIcon(icon, "file-search");
      empty.createEl("h3", { text: "等待一篇文章" });
      empty.createEl("p", { text: error });
      return;
    }
    if (!article) return;
    if (this.host.settings.activeTab === "preview") this.renderPreview(panel, path, article);
    if (this.host.settings.activeTab === "modules") this.renderModules(panel);
    if (this.host.settings.activeTab === "templates") this.renderTemplates(panel);
    if (this.host.settings.activeTab === "publish") this.renderPublishCheck(panel, path, article);
  }

  private renderAccountSelect(parent: HTMLElement): void {
    const wrap = parent.createDiv({ cls: "wop-select-wrap" });
    const icon = wrap.createSpan();
    setIcon(icon, "badge-check");
    const select = wrap.createEl("select", { attr: { "aria-label": "发布账号" } });
    select.createEl("option", { text: "未配置账号", value: "" });
    for (const account of this.host.settings.accounts) {
      select.createEl("option", { text: account.name, value: account.id });
    }
    select.value = this.host.settings.defaultAccountId;
    select.addEventListener("change", async () => {
      this.host.settings.defaultAccountId = select.value;
      await this.host.saveSettings();
    });
  }

  private renderTemplateSelect(parent: HTMLElement): void {
    const wrap = parent.createDiv({ cls: "wop-select-wrap" });
    const icon = wrap.createSpan();
    setIcon(icon, "palette");
    const select = wrap.createEl("select", { attr: { "aria-label": "排版模板" } });
    for (const template of [...BUILT_IN_TEMPLATES, ...this.host.settings.customTemplates]) {
      select.createEl("option", { text: template.name, value: template.id });
    }
    select.value = this.host.settings.activeTemplateId;
    select.addEventListener("change", async () => {
      this.host.settings.activeTemplateId = select.value;
      await this.host.saveSettings();
    });
  }

  private renderPreview(panel: HTMLElement, path: string, article: RenderedArticle): void {
    const meta = panel.createDiv({ cls: "wop-preview-meta" });
    meta.createEl("span", { text: `${article.imageSources.length} 张图片` });
    meta.createEl("span", { text: findTemplate(this.host.settings.activeTemplateId, this.host.settings.customTemplates).name });
    meta.createEl("span", { text: path });
    const devices = meta.createDiv({ cls: "wop-segmented" });
    for (const device of ["phone", "desktop"] as const) {
      const button = devices.createEl("button", { text: device === "phone" ? "手机" : "桌面", cls: this.host.settings.previewDevice === device ? "is-active" : "" });
      button.addEventListener("click", async () => {
        this.host.settings.previewDevice = device;
        await this.host.saveSettings();
      });
    }
    if (article.warnings.length) {
      const warning = panel.createDiv({ cls: "wop-warning" });
      setIcon(warning.createSpan(), "triangle-alert");
      warning.createSpan({ text: article.warnings.join(" ") });
    }
    const template = findTemplate(this.host.settings.activeTemplateId, this.host.settings.customTemplates);
    const stage = panel.createDiv({ cls: "wop-preview-stage" });
    stage.dataset.device = this.host.settings.previewDevice;
    stage.style.setProperty("--wop-template-canvas", template.canvas);
    const paper = stage.createDiv({ cls: "wop-paper" });
    paper.innerHTML = article.html;
  }

  private renderModules(panel: HTMLElement): void {
    const header = panel.createDiv({ cls: "wop-panel-header" });
    const copy = header.createDiv();
    copy.createEl("h3", { text: "文章前后模块" });
    copy.createEl("p", { text: "模块与正文一起经过模板编译，预览即最终排版。" });
    textButton(header, "新增模块", () => this.openModuleEditor(null), true);
    for (const placement of ["before", "after"] as const) {
      const section = panel.createDiv({ cls: "wop-module-section" });
      section.createEl("h4", { text: placement === "before" ? "正文前" : "正文后" });
      const modules = this.host.settings.modules.filter((module) => module.placement === placement);
      if (!modules.length) section.createEl("p", { text: "暂无模块", cls: "wop-empty" });
      modules.forEach((module, index) => this.renderModuleRow(section, module, index, modules.length));
    }
  }

  private renderModuleRow(parent: HTMLElement, module: ContentModule, index: number, count: number): void {
    const row = parent.createDiv({ cls: `wop-module-row${module.enabled ? " is-enabled" : ""}` });
    const toggle = row.createEl("input", { type: "checkbox", attr: { "aria-label": `启用${module.name}` } });
    toggle.checked = module.enabled;
    toggle.addEventListener("change", async () => {
      module.enabled = toggle.checked;
      await this.host.saveSettings();
    });
    const text = row.createDiv({ cls: "wop-module-copy" });
    text.createEl("strong", { text: module.name });
    text.createEl("span", { text: module.markdown.replace(/\s+/g, " ").slice(0, 72) || "空模块" });
    const actions = row.createDiv({ cls: "wop-row-actions" });
    const up = iconButton(actions, "chevron-up", "上移", async () => {
      const currentIndex = this.host.settings.modules.findIndex((item) => item.id === module.id);
      const previous = [...this.host.settings.modules].slice(0, currentIndex).findLast((item) => item.placement === module.placement);
      if (previous) this.swapModules(module.id, previous.id);
    });
    up.disabled = index === 0;
    const down = iconButton(actions, "chevron-down", "下移", async () => {
      const currentIndex = this.host.settings.modules.findIndex((item) => item.id === module.id);
      const next = this.host.settings.modules.slice(currentIndex + 1).find((item) => item.placement === module.placement);
      if (next) this.swapModules(module.id, next.id);
    });
    down.disabled = index === count - 1;
    iconButton(actions, "pencil", "编辑", () => this.openModuleEditor(module));
    iconButton(actions, "trash-2", "删除", async () => {
      this.host.settings.modules = this.host.settings.modules.filter((item) => item.id !== module.id);
      await this.host.saveSettings();
    });
  }

  private swapModules(firstId: string, secondId: string): void {
    const first = this.host.settings.modules.findIndex((item) => item.id === firstId);
    const second = this.host.settings.modules.findIndex((item) => item.id === secondId);
    if (first < 0 || second < 0) return;
    [this.host.settings.modules[first], this.host.settings.modules[second]] = [this.host.settings.modules[second], this.host.settings.modules[first]];
    void this.host.saveSettings();
  }

  private openModuleEditor(module: ContentModule | null): void {
    new ModuleEditorModal(this.app, module, (saved) => {
      const index = this.host.settings.modules.findIndex((item) => item.id === saved.id);
      if (index >= 0) this.host.settings.modules[index] = saved;
      else this.host.settings.modules.push(saved);
      void this.host.saveSettings();
    }).open();
  }

  private renderTemplates(panel: HTMLElement): void {
    const header = panel.createDiv({ cls: "wop-panel-header" });
    const copy = header.createDiv();
    copy.createEl("h3", { text: "排版模板" });
    copy.createEl("p", { text: "内置模板保持稳定。复制后可编辑令牌，也可导入或导出 JSON。" });
    const actions = header.createDiv({ cls: "wop-header-actions" });
    textButton(actions, "导出当前", async () => {
      const active = findTemplate(this.host.settings.activeTemplateId, this.host.settings.customTemplates);
      await navigator.clipboard.writeText(JSON.stringify(active, null, 2));
      new Notice("模板 JSON 已复制。");
    });
    textButton(actions, "导入 JSON", () => {
      const seed = cloneTemplate(findTemplate(this.host.settings.activeTemplateId, this.host.settings.customTemplates), "导入模板");
      new TemplateEditorModal(this.app, seed, (template) => void this.saveCustomTemplate(template)).open();
    }, true);
    const grid = panel.createDiv({ cls: "wop-template-grid" });
    for (const template of [...BUILT_IN_TEMPLATES, ...this.host.settings.customTemplates]) {
      this.renderTemplateCard(grid, template);
    }
  }

  private renderTemplateCard(parent: HTMLElement, template: PublisherTemplate): void {
    const active = template.id === this.host.settings.activeTemplateId;
    const card = parent.createDiv({ cls: `wop-template-card${active ? " is-active" : ""}` });
    card.style.setProperty("--wop-accent", template.accent);
    card.style.setProperty("--wop-canvas", template.canvas);
    const preview = card.createDiv({ cls: "wop-template-swatch" });
    preview.createDiv({ cls: "wop-swatch-heading" });
    preview.createDiv({ cls: "wop-swatch-line is-long" });
    preview.createDiv({ cls: "wop-swatch-line" });
    const info = card.createDiv({ cls: "wop-template-info" });
    info.createEl("strong", { text: template.name });
    info.createEl("span", { text: template.description });
    const source = template.source === "custom" ? "用户模板" : template.source === "md2-inspired" ? "MD2 风格" : template.source === "wenyan-inspired" ? "Wenyan 风格" : "内置";
    info.createEl("small", { text: source });
    card.addEventListener("click", async () => {
      this.host.settings.activeTemplateId = template.id;
      await this.host.saveSettings();
    });
    const actions = card.createDiv({ cls: "wop-template-actions" });
    const duplicate = iconButton(actions, "copy-plus", "复制为用户模板", () => {
      const cloned = cloneTemplate(template);
      new TemplateEditorModal(this.app, cloned, (saved) => void this.saveCustomTemplate(saved)).open();
    });
    duplicate.addEventListener("click", (event) => event.stopPropagation());
    if (template.source === "custom") {
      const edit = iconButton(actions, "pencil", "编辑模板", () => {
        new TemplateEditorModal(this.app, template, (saved) => void this.saveCustomTemplate(saved)).open();
      });
      edit.addEventListener("click", (event) => event.stopPropagation());
      const remove = iconButton(actions, "trash-2", "删除模板", async () => {
        this.host.settings.customTemplates = this.host.settings.customTemplates.filter((item) => item.id !== template.id);
        if (active) this.host.settings.activeTemplateId = BUILT_IN_TEMPLATES[0].id;
        await this.host.saveSettings();
      });
      remove.addEventListener("click", (event) => event.stopPropagation());
    }
  }

  private async saveCustomTemplate(template: PublisherTemplate): Promise<void> {
    const index = this.host.settings.customTemplates.findIndex((item) => item.id === template.id);
    if (index >= 0) this.host.settings.customTemplates[index] = template;
    else this.host.settings.customTemplates.push(template);
    this.host.settings.activeTemplateId = template.id;
    await this.host.saveSettings();
  }

  private renderPublishCheck(panel: HTMLElement, path: string, article: RenderedArticle): void {
    const header = panel.createDiv({ cls: "wop-panel-header" });
    const copy = header.createDiv();
    copy.createEl("h3", { text: "发布前检查" });
    copy.createEl("p", { text: "创建或更新后自动调用 draft/get 回读校验。" });
    const list = panel.createDiv({ cls: "wop-check-list" });
    const account = this.host.settings.accounts.find((item) => item.id === this.host.settings.defaultAccountId);
    this.renderCheck(list, "公众号账号", account?.name ?? "未配置", Boolean(account));
    this.renderCheck(list, "文章标题", article.meta.title, Boolean(article.meta.title));
    this.renderCheck(list, "作者", article.meta.author || "未填写", Boolean(article.meta.author));
    this.renderCheck(list, "正文图片", `${article.imageSources.length} 张`, true);
    this.renderCheck(list, "封面", article.meta.cover || article.imageSources[0] || "未设置", Boolean(article.meta.cover || article.imageSources[0]));
    this.renderCheck(list, "草稿操作", this.host.settings.lastDraftByFile[path] ? "更新已关联草稿" : "创建新草稿", true);
    if (article.warnings.length) this.renderCheck(list, "渲染提示", article.warnings.join(" "), false);
    const footer = panel.createDiv({ cls: "wop-publish-footer" });
    footer.createEl("p", { text: "点击后仍会弹出最终确认。AppSecret 不会出现在日志或提示中。" });
    const button = textButton(footer, this.host.settings.lastDraftByFile[path] ? "更新微信草稿" : "发布到微信草稿箱", () => this.host.publishCurrent(article), true);
    button.disabled = !account || !article.meta.title || !Boolean(article.meta.cover || article.imageSources[0]);
  }

  private renderCheck(parent: HTMLElement, label: string, value: string, ok: boolean): void {
    const row = parent.createDiv({ cls: `wop-check-row ${ok ? "is-ok" : "is-warning"}` });
    const icon = row.createDiv({ cls: "wop-check-icon" });
    setIcon(icon, ok ? "circle-check" : "circle-alert");
    const copy = row.createDiv();
    copy.createEl("strong", { text: label });
    copy.createEl("span", { text: value });
  }
}

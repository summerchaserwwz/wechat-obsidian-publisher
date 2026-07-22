import { ItemView, Notice, WorkspaceLeaf, setIcon } from "obsidian";
import type WechatObsidianPublisherPlugin from "../main";
import type { ContentModule, ModulePlacement, PublisherTab, PublisherTemplate, RenderedArticle } from "../types";
import { VIEW_TYPE_PUBLISHER } from "../defaults";
import { MD2_THEME_GROUPS } from "../core/md2-theme-catalog";
import {
  BUILT_IN_TEMPLATES,
  cloneTemplate,
  findTemplate,
  makeUniqueTemplate,
  parseTemplateBundle,
  serializeTemplateBundle
} from "../core/templates";
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
  private templateQuery = "";
  private templateGroup = "全部";

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
    if (this.host.settings.activeTab === "templates") this.renderTemplates(panel, path, article);
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
    for (const groupName of [...MD2_THEME_GROUPS, "用户模板"]) {
      const templates = groupName === "用户模板"
        ? this.host.settings.customTemplates
        : BUILT_IN_TEMPLATES.filter((template) => template.group === groupName);
      if (!templates.length) continue;
      const group = select.createEl("optgroup", { attr: { label: `${groupName} · ${templates.length}` } });
      for (const template of templates) group.createEl("option", { text: template.name, value: template.id });
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
    copy.createEl("h3", { text: "内容模块" });
    copy.createEl("p", { text: "完整支持 MD2 的 9 类模块。可以新增、编辑、启用和排序。" });
    textButton(header, "新增模块", () => this.openModuleEditor(null), true);
    const placements: Array<[ModulePlacement, string, string]> = [
      ["before", "正文前", "导语与开头模块"],
      ["before-first-table", "首个表格前", "表格口径与阅读提示"],
      ["after-first-table", "首个表格后", "表格结论与补充说明"],
      ["after", "正文后", "结尾、推荐、作者、关注、版权和自定义模块"]
    ];
    for (const [placement, title, description] of placements) {
      const section = panel.createDiv({ cls: "wop-module-section" });
      const sectionTitle = section.createDiv({ cls: "wop-module-section-title" });
      sectionTitle.createEl("h4", { text: title });
      sectionTitle.createEl("span", { text: description });
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

  private renderTemplates(panel: HTMLElement, path: string, article: RenderedArticle): void {
    panel.addClass("wop-template-workbench");
    const template = findTemplate(this.host.settings.activeTemplateId, this.host.settings.customTemplates);
    const preview = panel.createDiv({ cls: "wop-template-live-preview" });
    const meta = preview.createDiv({ cls: "wop-preview-meta" });
    meta.createEl("span", { text: template.name });
    meta.createEl("span", { text: `${article.imageSources.length} 张图片` });
    meta.createEl("span", { text: path });
    const stage = preview.createDiv({ cls: "wop-preview-stage", attr: { "data-device": this.host.settings.previewDevice } });
    stage.style.setProperty("--wop-template-canvas", template.canvas);
    const paper = stage.createDiv({ cls: "wop-paper" });
    paper.innerHTML = article.html;

    const drawer = panel.createDiv({ cls: "wop-template-drawer" });
    const header = drawer.createDiv({ cls: "wop-template-drawer-header" });
    const copy = header.createDiv();
    copy.createEl("strong", { text: "模板" });
    copy.createEl("span", { text: `${BUILT_IN_TEMPLATES.length} 内置` });
    const actions = header.createDiv({ cls: "wop-template-drawer-actions" });
    iconButton(actions, "download", "导出当前模板", () => {
      const active = findTemplate(this.host.settings.activeTemplateId, this.host.settings.customTemplates);
      this.downloadJson(`${active.id}.json`, JSON.stringify(active, null, 2));
      new Notice("模板 JSON 已导出。");
    });
    iconButton(actions, "archive", "导出全部用户模板", () => {
      if (!this.host.settings.customTemplates.length) {
        new Notice("还没有用户模板可导出。");
        return;
      }
      this.downloadJson("wechat-publisher-templates.json", serializeTemplateBundle(this.host.settings.customTemplates));
      new Notice(`已导出 ${this.host.settings.customTemplates.length} 个用户模板。`);
    });
    const importInput = actions.createEl("input", {
      type: "file",
      cls: "wop-hidden-input",
      attr: { accept: ".json,application/json", "aria-label": "选择模板 JSON 文件" }
    });
    importInput.addEventListener("change", () => void this.importTemplateFiles(importInput.files));
    iconButton(actions, "upload", "导入模板 JSON", () => importInput.click());

    const filters = drawer.createDiv({ cls: "wop-template-filters" });
    const searchWrap = filters.createDiv({ cls: "wop-template-search" });
    setIcon(searchWrap.createSpan(), "search");
    const search = searchWrap.createEl("input", { type: "search", attr: { placeholder: "搜索主题、来源或标签", "aria-label": "搜索模板" } });
    search.value = this.templateQuery;
    const groupSelect = filters.createEl("select", { attr: { "aria-label": "筛选模板分组" } });
    for (const group of ["全部", ...MD2_THEME_GROUPS, "用户模板"]) groupSelect.createEl("option", { text: group, value: group });
    groupSelect.value = this.templateGroup;
    const results = drawer.createDiv({ cls: "wop-template-results" });
    const updateResults = () => {
      this.templateQuery = search.value.trim();
      this.templateGroup = groupSelect.value;
      this.renderTemplateResults(results);
    };
    search.addEventListener("input", updateResults);
    groupSelect.addEventListener("change", updateResults);
    this.renderTemplateResults(results);
  }

  private renderTemplateResults(parent: HTMLElement): void {
    parent.empty();
    const query = this.templateQuery.toLocaleLowerCase("zh-CN");
    const templates = [...BUILT_IN_TEMPLATES, ...this.host.settings.customTemplates].filter((template) => {
      const groupMatches = this.templateGroup === "全部" || template.group === this.templateGroup;
      const haystack = [template.name, template.description, template.group, template.sourceLabel, ...template.tags].join(" ").toLocaleLowerCase("zh-CN");
      return groupMatches && (!query || haystack.includes(query));
    });
    const summary = parent.createDiv({ cls: "wop-template-summary" });
    summary.createEl("span", { text: `${templates.length} 个 · ${this.templateGroup === "全部" ? "全目录" : this.templateGroup}` });
    if (!templates.length) {
      parent.createEl("p", { text: "没有匹配的模板。", cls: "wop-empty wop-template-empty" });
      return;
    }
    const list = parent.createDiv({ cls: "wop-template-strip-list" });
    for (const template of templates) this.renderTemplateStrip(list, template);
  }

  private renderTemplateStrip(parent: HTMLElement, template: PublisherTemplate): void {
    const active = template.id === this.host.settings.activeTemplateId;
    const row = parent.createDiv({ cls: `wop-template-strip${active ? " is-active" : ""}` });
    row.style.setProperty("--wop-accent", template.accent);
    row.createDiv({ cls: "wop-template-color" });
    const info = row.createDiv({ cls: "wop-template-strip-copy" });
    info.createEl("strong", { text: template.name });
    info.createEl("span", { text: template.source === "custom" ? "用户模板" : template.group });
    if (template.upstream) row.title = `来源：${template.upstream}`;
    row.addEventListener("click", async () => {
      this.host.settings.activeTemplateId = template.id;
      await this.host.saveSettings();
    });
    const actions = row.createDiv({ cls: "wop-template-strip-actions" });
    const duplicate = iconButton(actions, "copy-plus", "复制为用户模板", () => {
      const cloned = cloneTemplate(template);
      new TemplateEditorModal(this.app, cloned, (saved) => void this.saveCustomTemplate(saved)).open();
    });
    duplicate.addEventListener("click", (event) => event.stopPropagation());
    if (template.source === "custom") {
      const edit = iconButton(actions, "pencil", "编辑模板", () => {
        new TemplateEditorModal(this.app, template, (saved) => void this.saveCustomTemplate(saved, template.id)).open();
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

  private async saveCustomTemplate(template: PublisherTemplate, replaceId?: string): Promise<void> {
    const existingIds = new Set([
      ...BUILT_IN_TEMPLATES.map((item) => item.id),
      ...this.host.settings.customTemplates.filter((item) => item.id !== replaceId).map((item) => item.id)
    ]);
    const saved = existingIds.has(template.id) ? makeUniqueTemplate(template, existingIds) : template;
    const index = replaceId ? this.host.settings.customTemplates.findIndex((item) => item.id === replaceId) : -1;
    if (index >= 0) this.host.settings.customTemplates[index] = saved;
    else this.host.settings.customTemplates.push(saved);
    this.host.settings.activeTemplateId = saved.id;
    await this.host.saveSettings();
  }

  private async importTemplateFiles(files: FileList | null): Promise<void> {
    const file = files?.[0];
    if (!file) return;
    try {
      const imported = parseTemplateBundle(await file.text());
      const existingIds = new Set([...BUILT_IN_TEMPLATES, ...this.host.settings.customTemplates].map((template) => template.id));
      const templates = imported.map((template) => makeUniqueTemplate(template, existingIds));
      this.host.settings.customTemplates.push(...templates);
      this.host.settings.activeTemplateId = templates[0].id;
      this.templateGroup = "用户模板";
      await this.host.saveSettings();
      new Notice(`已导入 ${templates.length} 个用户模板。`);
    } catch (error) {
      new Notice(error instanceof Error ? error.message : "模板导入失败。");
    }
  }

  private downloadJson(filename: string, content: string): void {
    const url = URL.createObjectURL(new Blob([content], { type: "application/json;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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

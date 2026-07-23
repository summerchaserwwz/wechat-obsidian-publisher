import { ItemView, Menu, Notice, WorkspaceLeaf, setIcon } from "obsidian";
import type WechatObsidianPublisherPlugin from "../main";
import type { ContentModule, ModulePlacement, PublisherTab, PublisherTemplate, RenderedArticle } from "../types";
import { VIEW_TYPE_PUBLISHER } from "../defaults";
import {
  ALL_TEMPLATE_GROUPS,
  ALL_TEMPLATES,
  cloneTemplate,
  findTemplate,
  makeUniqueTemplate,
  parseTemplateBundle,
  serializeTemplateBundle
} from "../core/templates";
import { ModuleEditorModal, TemplateEditorModal } from "./modals";

function iconButton(parent: HTMLElement, icon: string, label: string, action: (event: MouseEvent) => void | Promise<void>): HTMLButtonElement {
  const button = parent.createEl("button", { cls: "wop-icon-button", attr: { "aria-label": label } });
  setIcon(button, icon);
  button.addEventListener("click", (event) => void action(event));
  return button;
}

function textButton(parent: HTMLElement, text: string, action: () => void | Promise<void>, cta = false, icon?: string): HTMLButtonElement {
  const button = parent.createEl("button", { text, cls: cta ? "wop-button wop-button-primary" : "wop-button" });
  if (icon) {
    const mark = button.createSpan({ cls: "wop-button-icon" });
    button.prepend(mark);
    setIcon(mark, icon);
  }
  button.addEventListener("click", () => void action());
  return button;
}

export class PublisherView extends ItemView {
  private generation = 0;
  private templateQuery = "";
  private templateGroup = "全部";
  private templateLibraryOpen: boolean | null = null;

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
    const publish = textButton(controls, "检查发布", async () => {
      this.host.settings.activeTab = "publish";
      await this.host.saveSettings();
    }, true, "send");
    publish.disabled = !article;
    iconButton(controls, "settings", "打开设置", () => this.host.openSettings());

    const tabs = this.contentEl.createDiv({ cls: "wop-tabs", attr: { role: "tablist" } });
    const tabItems: Array<[PublisherTab, string, string]> = [
      ["preview", "预览", "scan-eye"],
      ["modules", "模块", "blocks"],
      ["templates", "模板", "palette"],
      ["publish", "检查", "list-checks"]
    ];
    for (const [id, label, icon] of tabItems) {
      const tab = tabs.createEl("button", { cls: this.host.settings.activeTab === id ? "is-active" : "" });
      const mark = tab.createSpan({ cls: "wop-tab-icon" });
      setIcon(mark, icon);
      tab.createSpan({ text: label });
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
    const wrap = parent.createDiv({ cls: "wop-select-wrap", attr: { "data-kind": "account" } });
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
    const wrap = parent.createDiv({ cls: "wop-select-wrap", attr: { "data-kind": "template" } });
    const icon = wrap.createSpan();
    setIcon(icon, "palette");
    const select = wrap.createEl("select", { attr: { "aria-label": "排版模板" } });
    for (const groupName of [...ALL_TEMPLATE_GROUPS, "用户模板"]) {
      const templates = groupName === "用户模板"
        ? this.host.settings.customTemplates
        : ALL_TEMPLATES.filter((template) => template.group === groupName);
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
    const summary = meta.createDiv({ cls: "wop-preview-summary" });
    this.renderMetaItem(summary, "palette", findTemplate(this.host.settings.activeTemplateId, this.host.settings.customTemplates).name);
    this.renderMetaItem(summary, "images", `${article.imageSources.length} 张图片`);
    this.renderMetaItem(summary, "file-text", path, true);
    const actions = meta.createDiv({ cls: "wop-preview-actions" });
    const devices = actions.createDiv({ cls: "wop-segmented" });
    for (const device of ["phone", "desktop"] as const) {
      const button = devices.createEl("button", { text: device === "phone" ? "手机" : "桌面", cls: this.host.settings.previewDevice === device ? "is-active" : "" });
      button.addEventListener("click", async () => {
        this.host.settings.previewDevice = device;
        await this.host.saveSettings();
      });
    }
    const copy = iconButton(actions, "copy", "复制公众号 HTML", async () => {
      await navigator.clipboard.writeText(article.html);
      new Notice("公众号 HTML 已复制，可以直接粘贴到其他编辑器。");
    });
    copy.addClass("wop-meta-action");
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
    copy.createEl("h3", { text: "文章模块" });
    copy.createEl("p", { text: "把固定内容插入正文前后。关闭模块不会删除内容。" });
    textButton(header, "新建模块", () => this.openModuleEditor(null), true, "plus");
    const placements: Array<[ModulePlacement, string, string]> = [
      ["before", "正文前", "导语与开头模块"],
      ["before-first-table", "首个表格前", "表格口径与阅读提示"],
      ["after-first-table", "首个表格后", "表格结论与补充说明"],
      ["after", "正文后", "结尾、推荐、作者、关注、版权和自定义模块"]
    ];
    for (const [placement, title, description] of placements) {
      const modules = this.host.settings.modules.filter((module) => module.placement === placement);
      const section = panel.createDiv({ cls: "wop-module-section" });
      const sectionTitle = section.createDiv({ cls: "wop-module-section-title" });
      const titleGroup = sectionTitle.createDiv();
      titleGroup.createEl("h4", { text: title });
      titleGroup.createEl("span", { text: `${modules.length} 个模块` });
      sectionTitle.createEl("span", { text: description });
      const list = section.createDiv({ cls: "wop-module-list" });
      if (!modules.length) list.createEl("p", { text: "这里还没有模块", cls: "wop-empty wop-module-empty" });
      modules.forEach((module, index) => this.renderModuleRow(list, module, index, modules.length));
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
    iconButton(actions, "ellipsis", "更多操作", (event) => {
      const menu = new Menu();
      menu.addItem((item) => item.setTitle("编辑模块").setIcon("pencil").onClick(() => this.openModuleEditor(module)));
      menu.addSeparator();
      menu.addItem((item) => item.setTitle("删除模块").setIcon("trash-2").onClick(async () => {
        this.host.settings.modules = this.host.settings.modules.filter((item) => item.id !== module.id);
        await this.host.saveSettings();
      }));
      menu.showAtMouseEvent(event);
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
    if (this.templateLibraryOpen === null) this.templateLibraryOpen = this.contentEl.clientWidth >= 760;
    panel.toggleClass("is-library-open", this.templateLibraryOpen);
    const template = findTemplate(this.host.settings.activeTemplateId, this.host.settings.customTemplates);
    const drawer = panel.createDiv({ cls: "wop-template-drawer" });
    const rail = drawer.createDiv({ cls: "wop-template-rail" });
    const railToggle = iconButton(rail, this.templateLibraryOpen ? "panel-left-close" : "panel-left-open", this.templateLibraryOpen ? "收起模板库" : "展开模板库", () => {
      this.templateLibraryOpen = !this.templateLibraryOpen;
      this.renderWorkspace(path, article.meta.title, article);
    });
    railToggle.addClass("wop-library-toggle");
    const railLabel = rail.createSpan({ text: "模板" });
    railLabel.setAttribute("aria-hidden", "true");

    const drawerBody = drawer.createDiv({ cls: "wop-template-drawer-body" });
    const header = drawerBody.createDiv({ cls: "wop-template-drawer-header" });
    const copy = header.createDiv();
    copy.createEl("strong", { text: "模板库" });
    copy.createEl("span", { text: `${ALL_TEMPLATES.length} 内置` });
    const actions = header.createDiv({ cls: "wop-template-drawer-actions" });
    iconButton(actions, "download", "导出当前模板", () => {
      const active = findTemplate(this.host.settings.activeTemplateId, this.host.settings.customTemplates);
      this.downloadJson(`${active.id}.json`, JSON.stringify(active, null, 2));
      new Notice("当前模板已导出为 JSON。");
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

    const filters = drawerBody.createDiv({ cls: "wop-template-filters" });
    const searchWrap = filters.createDiv({ cls: "wop-template-search" });
    setIcon(searchWrap.createSpan(), "search");
    const search = searchWrap.createEl("input", { type: "search", attr: { placeholder: "搜索模板", "aria-label": "搜索模板" } });
    search.value = this.templateQuery;
    const groupSelect = filters.createEl("select", { attr: { "aria-label": "筛选模板分组" } });
    for (const group of ["全部", ...ALL_TEMPLATE_GROUPS, "用户模板"]) groupSelect.createEl("option", { text: group, value: group });
    groupSelect.value = this.templateGroup;
    const results = drawerBody.createDiv({ cls: "wop-template-results" });
    const updateResults = () => {
      this.templateQuery = search.value.trim();
      this.templateGroup = groupSelect.value;
      this.renderTemplateResults(results);
    };
    search.addEventListener("input", updateResults);
    groupSelect.addEventListener("change", updateResults);
    this.renderTemplateResults(results);

    const preview = panel.createDiv({ cls: "wop-template-live-preview" });
    const meta = preview.createDiv({ cls: "wop-preview-meta" });
    const previewSummary = meta.createDiv({ cls: "wop-preview-summary" });
    this.renderMetaItem(previewSummary, "palette", template.name);
    this.renderMetaItem(previewSummary, "images", `${article.imageSources.length} 张图片`);
    this.renderMetaItem(previewSummary, "file-text", path, true);
    const previewActions = meta.createDiv({ cls: "wop-preview-actions" });
    const editTemplate = textButton(previewActions, template.source === "custom" ? "编辑" : "复制并编辑", () => {
      const target = template.source === "custom" ? template : cloneTemplate(template);
      new TemplateEditorModal(this.app, target, (saved) => void this.saveCustomTemplate(saved, template.source === "custom" ? template.id : undefined)).open();
    }, false, "pencil");
    editTemplate.addClass("wop-button-quiet");
    const stage = preview.createDiv({ cls: "wop-preview-stage", attr: { "data-device": this.host.settings.previewDevice } });
    stage.style.setProperty("--wop-template-canvas", template.canvas);
    const paper = stage.createDiv({ cls: "wop-paper" });
    paper.innerHTML = article.html;

  }

  private renderTemplateResults(parent: HTMLElement): void {
    parent.empty();
    const query = this.templateQuery.toLocaleLowerCase("zh-CN");
    const templates = [...ALL_TEMPLATES, ...this.host.settings.customTemplates].filter((template) => {
      const groupMatches = this.templateGroup === "全部" || template.group === this.templateGroup;
      const haystack = [template.name, template.description, template.group, template.sourceLabel, ...template.tags].join(" ").toLocaleLowerCase("zh-CN");
      return groupMatches && (!query || haystack.includes(query));
    });
    const summary = parent.createDiv({ cls: "wop-template-summary" });
    summary.createEl("span", { text: `${templates.length} 个模板 · ${this.templateGroup === "全部" ? "全部来源" : this.templateGroup}` });
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
      const more = iconButton(actions, "ellipsis", "用户模板操作", (event) => {
        const menu = new Menu();
        menu.addItem((item) => item.setTitle("编辑模板").setIcon("pencil").onClick(() => {
          new TemplateEditorModal(this.app, template, (saved) => void this.saveCustomTemplate(saved, template.id)).open();
        }));
        menu.addSeparator();
        menu.addItem((item) => item.setTitle("删除模板").setIcon("trash-2").onClick(async () => {
          this.host.settings.customTemplates = this.host.settings.customTemplates.filter((item) => item.id !== template.id);
          if (active) this.host.settings.activeTemplateId = ALL_TEMPLATES[0].id;
          await this.host.saveSettings();
        }));
        menu.showAtMouseEvent(event);
      });
      more.addEventListener("click", (event) => event.stopPropagation());
    }
  }

  private async saveCustomTemplate(template: PublisherTemplate, replaceId?: string): Promise<void> {
    const existingIds = new Set([
      ...ALL_TEMPLATES.map((item) => item.id),
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
      const existingIds = new Set([...ALL_TEMPLATES, ...this.host.settings.customTemplates].map((template) => template.id));
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
    panel.addClass("wop-publish-panel");
    const account = this.host.settings.accounts.find((item) => item.id === this.host.settings.defaultAccountId);
    const checks = [
      Boolean(account),
      Boolean(article.meta.title),
      Boolean(article.meta.author),
      true,
      Boolean(article.meta.cover || article.imageSources[0]),
      true,
      article.warnings.length === 0
    ];
    const issueCount = checks.filter((ok) => !ok).length;
    const header = panel.createDiv({ cls: "wop-panel-header wop-publish-header" });
    const copy = header.createDiv();
    copy.createEl("h3", { text: "发布前检查" });
    copy.createEl("p", { text: "确认账号、标题和封面后，再创建微信草稿。" });
    const readiness = header.createDiv({ cls: `wop-readiness ${issueCount ? "has-issues" : "is-ready"}` });
    setIcon(readiness.createSpan(), issueCount ? "circle-alert" : "circle-check");
    readiness.createSpan({ text: issueCount ? `${issueCount} 项需要处理` : "可以发布" });
    const list = panel.createDiv({ cls: "wop-check-list" });
    this.renderCheck(list, "公众号账号", account?.name ?? "未配置", Boolean(account));
    this.renderCheck(list, "文章标题", article.meta.title, Boolean(article.meta.title));
    this.renderCheck(list, "作者", article.meta.author || "未填写", Boolean(article.meta.author));
    this.renderCheck(list, "正文图片", `${article.imageSources.length} 张`, true);
    this.renderCheck(list, "封面", article.meta.cover || article.imageSources[0] || "未设置", Boolean(article.meta.cover || article.imageSources[0]));
    this.renderCheck(list, "草稿操作", this.host.settings.lastDraftByFile[path] ? "更新已关联草稿" : "创建新草稿", true);
    if (article.warnings.length) this.renderCheck(list, "渲染提示", article.warnings.join(" "), false);
    const footer = panel.createDiv({ cls: "wop-publish-footer" });
    const safety = footer.createDiv({ cls: "wop-publish-safety" });
    setIcon(safety.createSpan(), "shield-check");
    safety.createEl("p", { text: "下一步会再次确认，并在提交后回读草稿。AppSecret 不会显示在界面或日志中。" });
    const button = textButton(footer, this.host.settings.lastDraftByFile[path] ? "确认更新草稿" : "确认发布草稿", () => this.host.publishCurrent(article), true, "send");
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

  private renderMetaItem(parent: HTMLElement, icon: string, text: string, grow = false): void {
    const item = parent.createDiv({ cls: `wop-meta-item${grow ? " is-grow" : ""}`, attr: { title: text } });
    setIcon(item.createSpan(), icon);
    item.createSpan({ text });
  }
}

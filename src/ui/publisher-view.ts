import { ItemView, Menu, Notice, WorkspaceLeaf, setIcon } from "obsidian";
import type WechatObsidianPublisherPlugin from "../main";
import type {
  ArticleLayoutTuning,
  ContentModule,
  ModulePlacement,
  PreviewDevice,
  PublisherTab,
  PublisherTemplate,
  RenderedArticle
} from "../types";
import { VIEW_TYPE_PUBLISHER } from "../defaults";
import {
  DEFAULT_MOBILE_LAYOUT_TUNING,
  LAYOUT_PRESETS,
  layoutPresetId,
  type LayoutPresetId
} from "../core/layout-tuning";
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
import { mountWechatPreview } from "./wechat-preview";

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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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
    const publish = textButton(controls, "检查", async () => {
      this.host.settings.activeTab = "publish";
      await this.host.saveSettings();
    }, false, "list-checks");
    publish.addClass("wop-toolbar-check");
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
    const template = findTemplate(this.host.settings.activeTemplateId, this.host.settings.customTemplates);
    const meta = panel.createDiv({ cls: "wop-preview-meta" });
    const summary = meta.createDiv({ cls: "wop-preview-summary" });
    this.renderMetaItem(summary, "palette", template.name);
    this.renderMetaItem(summary, "images", `${article.imageSources.length} 张图片`);
    this.renderMetaItem(summary, "file-text", path, true);
    const actions = meta.createDiv({ cls: "wop-preview-actions" });
    this.renderQuickLayoutControls(actions, template);
    this.renderLayoutPresetControls(actions, template);
    this.renderDeviceControls(actions);
    const copy = iconButton(actions, "copy", "复制公众号 HTML", async () => {
      if (!article.previewHtml) {
        new Notice("当前文章无法生成草稿一致预览，请先处理渲染提示。");
        return;
      }
      await navigator.clipboard.writeText(article.previewHtml);
      new Notice("公众号 HTML 已复制，可以直接粘贴到其他编辑器。");
    });
    copy.addClass("wop-meta-action");
    copy.disabled = !article.previewHtml;
    if (article.warnings.length) {
      const warning = panel.createDiv({ cls: "wop-warning" });
      setIcon(warning.createSpan(), "triangle-alert");
      warning.createSpan({ text: article.warnings.join(" ") });
    }
    this.renderPreviewStage(panel, template, article);
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
    const drawerBody = drawer.createDiv({ cls: "wop-template-drawer-body" });
    const header = drawerBody.createDiv({ cls: "wop-template-drawer-header" });
    const copy = header.createDiv();
    copy.createEl("strong", { text: "模板库" });
    copy.createEl("span", { text: `${ALL_TEMPLATES.length} 内置` });
    const actions = header.createDiv({ cls: "wop-template-drawer-actions" });
    const importInput = actions.createEl("input", {
      type: "file",
      cls: "wop-hidden-input",
      attr: { accept: ".json,application/json", "aria-label": "选择模板 JSON 文件" }
    });
    importInput.addEventListener("change", () => void this.importTemplateFiles(importInput.files));
    const importButton = textButton(actions, "导入", () => importInput.click(), false, "upload");
    importButton.addClass("wop-template-import-button");
    iconButton(actions, "download", "导出模板", (event) => {
      const menu = new Menu();
      menu.addItem((item) => item.setTitle("导出当前模板").setIcon("download").onClick(() => {
        const active = findTemplate(this.host.settings.activeTemplateId, this.host.settings.customTemplates);
        this.downloadJson(`${active.id}.json`, JSON.stringify(active, null, 2));
        new Notice("当前模板已导出为 JSON。");
      }));
      menu.addItem((item) => item.setTitle("导出全部用户模板").setIcon("archive").onClick(() => {
        if (!this.host.settings.customTemplates.length) {
          new Notice("还没有用户模板可导出。");
          return;
        }
        this.downloadJson("wechat-publisher-templates.json", serializeTemplateBundle(this.host.settings.customTemplates));
        new Notice(`已导出 ${this.host.settings.customTemplates.length} 个用户模板。`);
      }));
      menu.showAtMouseEvent(event);
    });

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
    const railToggle = iconButton(previewActions, this.templateLibraryOpen ? "panel-left-close" : "panel-left-open", this.templateLibraryOpen ? "收起模板库" : "展开模板库", () => {
      this.templateLibraryOpen = !this.templateLibraryOpen;
      this.renderWorkspace(path, article.meta.title, article);
    });
    railToggle.addClass("wop-library-toggle");
    const editTemplate = iconButton(previewActions, "pencil", template.source === "custom" ? "编辑当前模板" : "复制为用户模板并编辑", () => {
      const target = template.source === "custom" ? template : cloneTemplate(template);
      new TemplateEditorModal(this.app, target, (saved) => void this.saveCustomTemplate(saved, template.source === "custom" ? template.id : undefined)).open();
    });
    editTemplate.addClass("wop-button-quiet");
    this.renderQuickLayoutControls(previewActions, template);
    this.renderLayoutPresetControls(previewActions, template);
    this.renderDeviceControls(previewActions);
    this.renderPreviewStage(preview, template, article);

  }

  private renderTemplateResults(parent: HTMLElement): void {
    parent.empty();
    const query = this.templateQuery.toLocaleLowerCase("zh-CN");
    const favoriteIds = new Set(this.host.settings.favoriteTemplateIds);
    const templates = [...ALL_TEMPLATES, ...this.host.settings.customTemplates].filter((template) => {
      const groupMatches = this.templateGroup === "全部" || template.group === this.templateGroup;
      const haystack = [template.name, template.description, template.group, template.sourceLabel, ...template.tags].join(" ").toLocaleLowerCase("zh-CN");
      return groupMatches && (!query || haystack.includes(query));
    }).sort((left, right) => Number(favoriteIds.has(right.id)) - Number(favoriteIds.has(left.id)));
    const summary = parent.createDiv({ cls: "wop-template-summary" });
    summary.createEl("span", { text: `${templates.length} 个模板 · ${this.templateGroup === "全部" ? "全部来源" : this.templateGroup}` });
    if (!templates.length) {
      parent.createEl("p", { text: "没有匹配的模板。", cls: "wop-empty wop-template-empty" });
      return;
    }
    const list = parent.createDiv({ cls: "wop-template-strip-list" });
    const favoriteCount = templates.filter((template) => favoriteIds.has(template.id)).length;
    if (favoriteCount) list.createDiv({ cls: "wop-template-section-label", text: `收藏 ${favoriteCount}` });
    let renderedFavorites = 0;
    let listedAll = false;
    for (const template of templates) {
      if (favoriteIds.has(template.id)) renderedFavorites += 1;
      if (!listedAll && favoriteCount && renderedFavorites === favoriteCount && templates.length > favoriteCount) {
        this.renderTemplateStrip(list, template);
        list.createDiv({ cls: "wop-template-section-label is-all", text: `全部模板 ${templates.length - favoriteCount}` });
        listedAll = true;
        continue;
      }
      this.renderTemplateStrip(list, template);
    }
  }

  private renderTemplateStrip(parent: HTMLElement, template: PublisherTemplate): void {
    const active = template.id === this.host.settings.activeTemplateId;
    const favorite = this.host.settings.favoriteTemplateIds.includes(template.id);
    const row = parent.createDiv({ cls: `wop-template-strip${active ? " is-active" : ""}` });
    row.setAttribute("role", "button");
    row.tabIndex = 0;
    const info = row.createDiv({ cls: "wop-template-strip-copy" });
    info.createEl("strong", { text: template.name });
    row.title = `${template.name}\n来源：${template.upstream || (template.source === "custom" ? "用户模板" : template.group)}`;
    const selectTemplate = async () => {
      this.host.settings.activeTemplateId = template.id;
      await this.host.saveSettings();
    };
    row.addEventListener("click", () => void selectTemplate());
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        void selectTemplate();
      }
    });
    const actions = row.createDiv({ cls: "wop-template-strip-actions" });
    const favoriteButton = iconButton(actions, "star", favorite ? `取消收藏${template.name}` : `收藏${template.name}`, async () => {
      await this.toggleFavorite(template.id);
    });
    favoriteButton.addClass("wop-template-favorite");
    favoriteButton.toggleClass("is-favorite", favorite);
    favoriteButton.addEventListener("click", (event) => event.stopPropagation());
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
          this.host.settings.favoriteTemplateIds = this.host.settings.favoriteTemplateIds.filter((id) => id !== template.id);
          this.host.settings.sourceLayoutTemplateIds = this.host.settings.sourceLayoutTemplateIds.filter((id) => id !== template.id);
          delete this.host.settings.layoutByTemplate[template.id];
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
    if (replaceId && replaceId !== saved.id) {
      this.host.settings.favoriteTemplateIds = this.host.settings.favoriteTemplateIds.map((id) => id === replaceId ? saved.id : id);
      this.host.settings.sourceLayoutTemplateIds = this.host.settings.sourceLayoutTemplateIds.map((id) => id === replaceId ? saved.id : id);
      const previousTuning = this.host.settings.layoutByTemplate[replaceId];
      if (previousTuning) {
        delete this.host.settings.layoutByTemplate[replaceId];
        this.host.settings.layoutByTemplate[saved.id] = previousTuning;
      }
    }
    this.host.settings.activeTemplateId = saved.id;
    await this.host.saveSettings();
  }

  private async toggleFavorite(templateId: string): Promise<void> {
    const favorites = this.host.settings.favoriteTemplateIds;
    this.host.settings.favoriteTemplateIds = favorites.includes(templateId)
      ? favorites.filter((id) => id !== templateId)
      : [...favorites, templateId];
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
      Boolean(article.previewHtml),
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
    this.renderCheck(list, "草稿一致预览", article.previewHtml ? "已使用发布前处理链路" : "生成失败，请先处理渲染提示", Boolean(article.previewHtml));
    this.renderCheck(list, "正文图片", `${article.imageSources.length} 张`, true);
    this.renderCheck(list, "封面", article.meta.cover || article.imageSources[0] || "未设置", Boolean(article.meta.cover || article.imageSources[0]));
    this.renderCheck(list, "草稿操作", this.host.settings.lastDraftByFile[path] ? "更新已关联草稿" : "创建新草稿", true);
    if (article.warnings.length) this.renderCheck(list, "渲染提示", article.warnings.join(" "), false);
    const footer = panel.createDiv({ cls: "wop-publish-footer" });
    const safety = footer.createDiv({ cls: "wop-publish-safety" });
    setIcon(safety.createSpan(), "shield-check");
    safety.createEl("p", { text: "下一步会再次确认，并在提交后回读草稿。AppSecret 不会显示在界面或日志中。" });
    const button = textButton(footer, this.host.settings.lastDraftByFile[path] ? "确认更新草稿" : "确认发布草稿", () => this.host.publishCurrent(), true, "send");
    button.disabled = !account
      || !article.meta.title
      || !Boolean(article.meta.cover || article.imageSources[0])
      || !article.previewHtml
      || article.warnings.length > 0;
  }

  private renderCheck(parent: HTMLElement, label: string, value: string, ok: boolean): void {
    const row = parent.createDiv({ cls: `wop-check-row ${ok ? "is-ok" : "is-warning"}` });
    const icon = row.createDiv({ cls: "wop-check-icon" });
    setIcon(icon, ok ? "circle-check" : "circle-alert");
    const copy = row.createDiv();
    copy.createEl("strong", { text: label });
    copy.createEl("span", { text: value });
  }

  private mountArticlePreview(paper: HTMLElement, article: RenderedArticle): void {
    if (!article.previewHtml) {
      const unavailable = paper.createDiv({ cls: "wop-preview-unavailable" });
      setIcon(unavailable.createSpan(), "triangle-alert");
      unavailable.createEl("p", { text: "无法生成与微信草稿一致的预览。请先处理上方渲染提示。" });
      return;
    }
    mountWechatPreview(paper, article.previewHtml);
  }

  private renderLayoutPresetControls(parent: HTMLElement, template: PublisherTemplate): void {
    const current = this.host.getLayoutTuning(template.id);
    const activePreset = current === undefined ? "mobile" : layoutPresetId(current);
    const group = parent.createDiv({
      cls: "wop-segmented wop-layout-presets",
      attr: { "aria-label": "阅读模式" }
    });
    const options: Array<["source" | LayoutPresetId, string]> = [
      ["source", "原版"],
      ["mobile", "手机"],
      ["balanced", "标准"],
      ["relaxed", "舒展"]
    ];
    for (const [id, label] of options) {
      const button = group.createEl("button", {
        text: label,
        cls: activePreset === id ? "is-active" : "",
        attr: { title: id === "source" ? "使用模板原始排版" : LAYOUT_PRESETS[id].name }
      });
      button.addEventListener("click", () => {
        const tuning = id === "source" ? null : structuredClone(LAYOUT_PRESETS[id].tuning);
        void this.host.setLayoutTuning(template.id, tuning);
      });
    }
  }

  private renderDeviceControls(parent: HTMLElement): void {
    const group = parent.createDiv({
      cls: "wop-segmented wop-device-switcher",
      attr: { "aria-label": "预览设备" }
    });
    const devices: Array<[PreviewDevice, string, string]> = [
      ["phone", "手机", "smartphone"],
      ["wechat", "微信", "message-circle"],
      ["desktop", "桌面", "monitor"]
    ];
    for (const [device, label, icon] of devices) {
      const button = group.createEl("button", {
        cls: this.host.settings.previewDevice === device ? "is-active" : "",
        attr: { "aria-label": `${label}预览`, title: `${label}预览` }
      });
      const mark = button.createSpan({ cls: "wop-segmented-icon" });
      setIcon(mark, icon);
      button.createSpan({ text: label });
      button.addEventListener("click", async () => {
        this.host.settings.previewDevice = device;
        await this.host.saveSettings();
      });
    }
  }

  private renderPreviewStage(parent: HTMLElement, template: PublisherTemplate, article: RenderedArticle): void {
    const device = this.host.settings.previewDevice;
    const stage = parent.createDiv({
      cls: "wop-preview-stage",
      attr: { "data-device": device }
    });
    const frame = stage.createDiv({ cls: `wop-device-frame is-${device}` });
    const chrome = frame.createDiv({ cls: "wop-device-chrome" });
    if (device === "desktop") {
      const windowControls = chrome.createDiv({ cls: "wop-desktop-window-controls", attr: { "aria-hidden": "true" } });
      windowControls.createSpan();
      windowControls.createSpan();
      windowControls.createSpan();
      const title = chrome.createDiv({ cls: "wop-device-title" });
      setIcon(title.createSpan(), "monitor");
      title.createSpan({ text: "公众号预览" });
      chrome.createSpan({ cls: "wop-device-chrome-spacer" });
    } else if (device === "wechat") {
      const back = chrome.createSpan({ cls: "wop-device-chrome-icon", attr: { "aria-hidden": "true" } });
      setIcon(back, "chevron-left");
      chrome.createSpan({ cls: "wop-device-title", text: "公众号文章" });
      const more = chrome.createSpan({ cls: "wop-device-chrome-icon", attr: { "aria-hidden": "true" } });
      setIcon(more, "ellipsis");
    } else {
      chrome.createSpan({ text: "9:41", cls: "wop-phone-time" });
      chrome.createSpan({ cls: "wop-phone-notch", attr: { "aria-hidden": "true" } });
      const signal = chrome.createSpan({ cls: "wop-phone-signal", attr: { "aria-hidden": "true" } });
      setIcon(signal, "wifi");
    }

    const viewport = frame.createDiv({ cls: "wop-device-viewport" });
    const paper = viewport.createDiv({ cls: "wop-paper" });
    this.mountArticlePreview(paper, article);
    if (device !== "desktop") frame.createDiv({ cls: "wop-device-home-indicator", attr: { "aria-hidden": "true" } });
  }

  private renderQuickLayoutControls(parent: HTMLElement, template: PublisherTemplate): void {
    const tuning = this.effectiveLayoutTuning(template.id);
    const padding = tuning.verticalPadding === tuning.contentPadding
      ? `${tuning.contentPadding}px`
      : `${tuning.verticalPadding}/${tuning.contentPadding}px`;
    const dock = parent.createDiv({
      cls: "wop-inline-layout-controls",
      attr: { "aria-label": "文章排版快速调整" }
    });
    this.renderStepper(dock, "字号", `${tuning.fontSize}px`, "type", () => {
      const current = this.effectiveLayoutTuning(template.id);
      return this.host.setLayoutTuning(template.id, {
        ...current,
        fontSize: clamp(current.fontSize - 1, 12, 22)
      });
    }, () => {
      const current = this.effectiveLayoutTuning(template.id);
      return this.host.setLayoutTuning(template.id, {
        ...current,
        fontSize: clamp(current.fontSize + 1, 12, 22)
      });
    });
    this.renderStepper(dock, "边距", padding, "square-dashed", () => {
      const current = this.effectiveLayoutTuning(template.id);
      const value = clamp(Math.round((current.verticalPadding + current.contentPadding) / 2) - 2, 0, 32);
      return this.host.setLayoutTuning(template.id, {
        ...current,
        verticalPadding: value,
        contentPadding: value
      });
    }, () => {
      const current = this.effectiveLayoutTuning(template.id);
      const value = clamp(Math.round((current.verticalPadding + current.contentPadding) / 2) + 2, 0, 32);
      return this.host.setLayoutTuning(template.id, {
        ...current,
        verticalPadding: value,
        contentPadding: value
      });
    });
  }

  private renderStepper(
    parent: HTMLElement,
    label: string,
    value: string,
    icon: string,
    decrement: () => Promise<void>,
    increment: () => Promise<void>
  ): void {
    const group = parent.createDiv({ cls: "wop-preview-stepper" });
    const name = group.createDiv({ cls: "wop-preview-stepper-label" });
    setIcon(name.createSpan(), icon);
    name.createSpan({ text: label });
    const controls = group.createDiv({ cls: "wop-preview-stepper-controls" });
    const minus = controls.createEl("button", {
      text: "−",
      attr: { "aria-label": `减小${label}`, title: `减小${label}` }
    });
    minus.addEventListener("click", () => void decrement());
    controls.createEl("output", { text: value, attr: { "aria-label": `${label} ${value}` } });
    const plus = controls.createEl("button", {
      text: "+",
      attr: { "aria-label": `增大${label}`, title: `增大${label}` }
    });
    plus.addEventListener("click", () => void increment());
  }

  private effectiveLayoutTuning(templateId: string): ArticleLayoutTuning {
    const tuning = this.host.getLayoutTuning(templateId);
    return structuredClone(tuning ?? DEFAULT_MOBILE_LAYOUT_TUNING);
  }

  private renderMetaItem(parent: HTMLElement, icon: string, text: string, grow = false): void {
    const item = parent.createDiv({ cls: `wop-meta-item${grow ? " is-grow" : ""}`, attr: { title: text } });
    setIcon(item.createSpan(), icon);
    item.createSpan({ text });
  }
}

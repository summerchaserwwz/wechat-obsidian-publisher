import { chmod } from "node:fs/promises";
import { join } from "node:path";
import { FileSystemAdapter, Notice, Plugin, TFile, normalizePath } from "obsidian";
import { DEFAULT_SETTINGS, VIEW_TYPE_PUBLISHER } from "./defaults";
import { RenderEngine } from "./core/renderer";
import { BUILT_IN_TEMPLATES } from "./core/templates";
import { CredentialVault } from "./publish/credential-vault";
import { WechatClient } from "./publish/wechat-client";
import { PublisherSettingTab } from "./settings-tab";
import type { ImageAsset, PluginSettings, PublisherTemplate, RenderedArticle } from "./types";
import { ConfirmPublishModal } from "./ui/modals";
import { PublisherView } from "./ui/publisher-view";

const MIME_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp"
};

export default class WechatObsidianPublisherPlugin extends Plugin {
  settings: PluginSettings = structuredClone(DEFAULT_SETTINGS);
  readonly renderer = new RenderEngine();
  readonly credentials = new CredentialVault();
  readonly wechat = new WechatClient();
  private refreshTimer = 0;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.registerView(VIEW_TYPE_PUBLISHER, (leaf) => new PublisherView(leaf, this));
    this.addRibbonIcon("send", "打开微信发布工作台", () => void this.activateView());
    this.addCommand({
      id: "open-publisher",
      name: "打开微信发布工作台",
      callback: () => void this.activateView()
    });
    this.addCommand({
      id: "publish-current-note-to-draft",
      name: "发布当前笔记到微信草稿箱",
      callback: () => void this.publishCurrent()
    });
    this.addSettingTab(new PublisherSettingTab(this));
    this.registerEvent(this.app.workspace.on("file-open", () => this.scheduleRefresh()));
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.scheduleRefresh()));
    this.registerEvent(this.app.vault.on("modify", (file) => {
      if (file.path === this.app.workspace.getActiveFile()?.path) this.scheduleRefresh();
    }));
  }

  onunload(): void {
    window.clearTimeout(this.refreshTimer);
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_PUBLISHER);
  }

  async loadSettings(): Promise<void> {
    const loaded = await this.loadData() as Partial<PluginSettings> | null;
    this.settings = {
      ...structuredClone(DEFAULT_SETTINGS),
      ...(loaded ?? {}),
      accounts: loaded?.accounts ?? [],
      modules: loaded?.modules ?? structuredClone(DEFAULT_SETTINGS.modules),
      customTemplates: loaded?.customTemplates ?? [],
      lastDraftByFile: loaded?.lastDraftByFile ?? {}
    };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    if (this.manifest.dir && this.app.vault.adapter instanceof FileSystemAdapter) {
      const dataPath = join(this.app.vault.adapter.getBasePath(), this.manifest.dir, "data.json");
      await chmod(dataPath, 0o600).catch(() => undefined);
    }
    this.refreshViews();
  }

  async activateView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_PUBLISHER)[0];
    const leaf = existing ?? this.app.workspace.getRightLeaf(false);
    if (!leaf) {
      new Notice("无法打开右侧发布工作台。");
      return;
    }
    if (!existing) await leaf.setViewState({ type: VIEW_TYPE_PUBLISHER, active: true });
    await this.app.workspace.revealLeaf(leaf);
  }

  openSettings(): void {
    const app = this.app as typeof this.app & {
      setting: { open(): void; openTabById(id: string): void };
    };
    app.setting.open();
    app.setting.openTabById(this.manifest.id);
  }

  async renderActiveArticle(): Promise<{ file: TFile; article: RenderedArticle }> {
    const file = this.app.workspace.getActiveFile();
    if (!(file instanceof TFile) || file.extension !== "md") throw new Error("请先打开一篇 Markdown 笔记。");
    const markdown = await this.app.vault.cachedRead(file);
    const template = this.getActiveTemplate();
    const article = await this.renderer.render({
      markdown,
      fallbackTitle: file.basename,
      defaultAuthor: this.settings.defaultAuthor,
      template,
      modules: this.settings.modules,
      resolvePreviewImage: (source) => this.resolvePreviewImage(source, file.path)
    });
    if (!article.meta.cover) article.meta.cover = this.settings.defaultCoverPath;
    return { file, article };
  }

  getActiveTemplate(): PublisherTemplate {
    const all = [...this.settings.customTemplates, ...BUILT_IN_TEMPLATES];
    return all.find((template) => template.id === this.settings.activeTemplateId) ?? all[0];
  }

  async publishCurrent(articleOverride?: RenderedArticle): Promise<void> {
    try {
      const file = this.app.workspace.getActiveFile();
      if (!(file instanceof TFile)) throw new Error("请先打开一篇 Markdown 笔记。");
      const account = this.settings.accounts.find((item) => item.id === this.settings.defaultAccountId);
      if (!account) {
        this.openSettings();
        throw new Error("请先配置公众号账号。");
      }
      const article = articleOverride ?? (await this.renderActiveArticle()).article;
      const existingMediaId = this.settings.lastDraftByFile[file.path];
      const confirmed = await ConfirmPublishModal.ask(this.app, article.meta.title, existingMediaId ? "update" : "add");
      if (!confirmed) return;
      const progress = new Notice(existingMediaId ? "正在更新并回读微信草稿…" : "正在创建并回读微信草稿…", 0);
      const receipt = await this.wechat.publish({
        account,
        secret: this.credentials.decrypt(account.encryptedSecret),
        article,
        sourcePath: file.path,
        existingMediaId,
        resolveImage: (source) => this.resolveImageAsset(source, file.path)
      }).finally(() => progress.hide());
      this.settings.lastDraftByFile[file.path] = receipt.mediaId;
      await this.saveSettings();
      new Notice(`${receipt.operation === "update" ? "草稿已更新" : "草稿已创建"}并通过回读校验：${receipt.title}`, 8000);
    } catch (error) {
      new Notice(error instanceof Error ? error.message : "发布失败。", 10000);
    }
  }

  private scheduleRefresh(): void {
    window.clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => this.refreshViews(), 260);
  }

  private refreshViews(): void {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_PUBLISHER)) {
      if (leaf.view instanceof PublisherView) void leaf.view.refresh();
    }
  }

  private resolvePreviewImage(source: string, sourcePath: string): string | null {
    if (/^(https?:|data:|blob:)/i.test(source)) return source;
    const file = this.findVaultImage(source, sourcePath);
    return file ? this.app.vault.getResourcePath(file) : null;
  }

  private findVaultImage(source: string, sourcePath: string): TFile | null {
    let decoded = source.trim().replace(/^<|>$/g, "").split("#")[0];
    try { decoded = decodeURI(decoded); } catch { /* 保留原始路径 */ }
    const linked = this.app.metadataCache.getFirstLinkpathDest(decoded, sourcePath);
    if (linked instanceof TFile) return linked;
    const direct = this.app.vault.getAbstractFileByPath(normalizePath(decoded));
    return direct instanceof TFile ? direct : null;
  }

  private async resolveImageAsset(source: string, sourcePath: string): Promise<ImageAsset> {
    if (/^(https?:|data:)/i.test(source)) {
      const response = await fetch(source);
      if (!response.ok) throw new Error(`无法读取图片：HTTP ${response.status}`);
      const pathname = source.startsWith("data:") ? "image.png" : new URL(source).pathname;
      const filename = decodeURIComponent(pathname.split("/").pop() || "image.png");
      return {
        source,
        bytes: await response.arrayBuffer(),
        mimeType: response.headers.get("content-type")?.split(";")[0] || "image/png",
        filename
      };
    }
    const file = this.findVaultImage(source, sourcePath);
    if (!file) throw new Error(`找不到本地图片：${source}`);
    return {
      source,
      bytes: await this.app.vault.readBinary(file),
      mimeType: MIME_BY_EXTENSION[file.extension.toLowerCase()] ?? "application/octet-stream",
      filename: file.name
    };
  }
}

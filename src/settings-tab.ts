import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { Notice, PluginSettingTab, Setting, setIcon } from "obsidian";
import type WechatObsidianPublisherPlugin from "./main";
import type { WechatAccount } from "./types";
import { WechatApiError } from "./publish/wechat-client";

function parseEnv(content: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

export class PublisherSettingTab extends PluginSettingTab {
  constructor(private readonly host: WechatObsidianPublisherPlugin) {
    super(host.app, host);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("wop-settings");
    const hero = containerEl.createDiv({ cls: "wop-settings-hero" });
    const heroIcon = hero.createDiv({ cls: "wop-settings-hero-icon" });
    setIcon(heroIcon, "send");
    const heroCopy = hero.createDiv();
    heroCopy.createEl("h2", { text: "微信发布" });
    heroCopy.createEl("p", { text: "先完成文章默认值和公众号连接，其他设置可以以后再改。" });

    const safety = containerEl.createDiv({ cls: "wop-settings-safety" });
    setIcon(safety.createSpan(), "shield-check");
    safety.createEl("p", { text: "AppSecret 由 Obsidian SecretStorage 管理，系统钥匙串可用时由操作系统加密。插件配置只记录引用。" });

    const defaults = containerEl.createDiv({ cls: "wop-settings-section" });
    this.renderSectionHeader(defaults, "文章默认值", "只在文章 frontmatter 没有填写时使用");

    new Setting(defaults)
      .setName("默认作者")
      .setDesc("文章 frontmatter 未填写 author 时使用")
      .addText((text) => text
        .setPlaceholder("公众号作者")
        .setValue(this.host.settings.defaultAuthor)
        .onChange(async (value) => {
          this.host.settings.defaultAuthor = value.trim();
          await this.host.saveSettings();
        }));

    new Setting(defaults)
      .setName("默认封面路径")
      .setDesc("支持库内相对路径。frontmatter 的 cover 优先级更高")
      .addText((text) => text
        .setPlaceholder("images/cover.png")
        .setValue(this.host.settings.defaultCoverPath)
        .onChange(async (value) => {
          this.host.settings.defaultCoverPath = value.trim();
          await this.host.saveSettings();
        }));

    const accountSection = containerEl.createDiv({ cls: "wop-settings-section" });
    this.renderSectionHeader(accountSection, "公众号账号", "发布时使用默认账号，也可以在工作台顶部临时切换");
    const accounts = accountSection.createDiv({ cls: "wop-account-settings" });
    if (this.host.settings.accounts.length === 0) {
      accounts.createEl("p", { text: "还没有配置账号。可从现有 Wenyan 配置导入，或手动添加。", cls: "wop-empty" });
    }
    for (const account of this.host.settings.accounts) this.renderAccount(accounts, account);

    const importCard = accountSection.createDiv({ cls: "wop-import-card" });
    const importIcon = importCard.createDiv({ cls: "wop-import-icon" });
    setIcon(importIcon, "import");
    const importCopy = importCard.createDiv({ cls: "wop-import-copy" });
    importCopy.createEl("strong", { text: "已经用过 Wenyan？" });
    importCopy.createEl("span", { text: "一键读取本机账号并转存到 Obsidian 密钥存储。" });
    const importButton = importCard.createEl("button", { text: "安全导入", cls: "mod-cta" });
    importButton.addEventListener("click", async () => {
      importButton.disabled = true;
      importButton.setText("导入中");
      try {
        const envPath = join(homedir(), "Library", "Application Support", "wechat-official-account-publisher", ".env");
        const values = parseEnv(await readFile(envPath, "utf8"));
        const appId = values.WECHAT_APP_ID;
        const secret = values.WECHAT_APP_SECRET;
        if (!appId || !secret) throw new Error("Wenyan 配置中缺少 WECHAT_APP_ID 或 WECHAT_APP_SECRET。");
        const existing = this.host.settings.accounts.find((item) => item.appId === appId);
        if (existing) {
          existing.encryptedSecret = this.host.credentials.store(existing.id, secret);
          this.host.settings.defaultAccountId = existing.id;
        } else {
          const accountId = `account-${Date.now().toString(36)}`;
          const account: WechatAccount = {
            id: accountId,
            name: "Wenyan 账号",
            appId,
            encryptedSecret: this.host.credentials.store(accountId, secret)
          };
          this.host.settings.accounts.push(account);
          this.host.settings.defaultAccountId = account.id;
        }
        await this.host.saveSettings();
        new Notice("账号已导入，AppSecret 已转存到 Obsidian SecretStorage。");
        this.display();
      } catch (error) {
        new Notice(error instanceof Error ? error.message : "导入失败。");
      } finally {
        importButton.disabled = false;
        importButton.setText("安全导入");
      }
    });

    this.renderAddAccount(accountSection);
  }

  private renderAccount(container: HTMLElement, account: WechatAccount): void {
    const card = container.createDiv({ cls: "wop-settings-card" });
    const header = card.createDiv({ cls: "wop-settings-card-header" });
    const identity = header.createDiv({ cls: "wop-account-identity" });
    const mark = identity.createDiv({ cls: "wop-account-mark" });
    setIcon(mark, "badge-check");
    const copy = identity.createDiv();
    copy.createEl("strong", { text: account.name });
    copy.createEl("span", { text: account.appId.replace(/^(.{4}).*(.{4})$/, "$1••••$2") });
    if (this.host.settings.defaultAccountId === account.id) header.createEl("span", { text: "默认账号", cls: "wop-status-badge" });
    new Setting(card)
      .setName("设为默认")
      .addToggle((toggle) => toggle
        .setValue(this.host.settings.defaultAccountId === account.id)
        .onChange(async (value) => {
          if (value) this.host.settings.defaultAccountId = account.id;
          await this.host.saveSettings();
          this.display();
        }));
    let replacementSecret = "";
    new Setting(card)
      .setName("更新 AppSecret")
      .setDesc("留空不会修改现有密钥")
      .addText((text) => {
        text.inputEl.type = "password";
        text.setPlaceholder("输入新的 AppSecret").onChange((value) => { replacementSecret = value; });
      })
      .addButton((button) => button.setButtonText("更新").onClick(async () => {
        if (!replacementSecret.trim()) {
          new Notice("请输入新的 AppSecret。");
          return;
        }
        account.encryptedSecret = this.host.credentials.store(account.id, replacementSecret);
        await this.host.saveSettings();
        replacementSecret = "";
        new Notice("AppSecret 已更新到 Obsidian SecretStorage。");
        this.display();
      }));
    new Setting(card)
      .setName("连接检查")
      .setDesc("只获取 access token，不创建或修改草稿")
      .addButton((button) => button.setButtonText("测试连接").onClick(async () => {
        button.setDisabled(true).setButtonText("检查中");
        try {
          await this.host.wechat.testConnection(account.appId, this.host.credentials.read(account.encryptedSecret));
          this.host.settings.connectionDiagnostics[account.id] = {
            status: "ok",
            message: "账号凭据可用，当前 IP 已通过微信接口检查。",
            rejectedIp: "",
            checkedAt: Date.now()
          };
          await this.host.saveSettings();
          new Notice("连接成功，账号凭据可用。");
        } catch (error) {
          const blocked = error instanceof WechatApiError && error.code === 40164;
          this.host.settings.connectionDiagnostics[account.id] = {
            status: blocked ? "ip-blocked" : "error",
            message: error instanceof Error ? error.message : "连接失败。",
            rejectedIp: blocked ? error.rejectedIp : "",
            checkedAt: Date.now()
          };
          await this.host.saveSettings();
          new Notice(error instanceof Error ? error.message : "连接失败。");
        } finally {
          button.setDisabled(false).setButtonText("测试连接");
          this.display();
        }
      }))
      .addButton((button) => button.setButtonText("删除").setWarning().onClick(async () => {
        if (!window.confirm(`确定删除账号“${account.name}”吗？已保存的 AppSecret 也会从密钥存储中移除。`)) return;
        this.host.credentials.clear(account.encryptedSecret);
        this.host.settings.accounts = this.host.settings.accounts.filter((item) => item.id !== account.id);
        delete this.host.settings.connectionDiagnostics[account.id];
        if (this.host.settings.defaultAccountId === account.id) {
          this.host.settings.defaultAccountId = this.host.settings.accounts[0]?.id ?? "";
        }
        await this.host.saveSettings();
        this.display();
      }));
    this.renderConnectionDiagnostic(card, account);
  }

  private renderConnectionDiagnostic(container: HTMLElement, account: WechatAccount): void {
    const diagnostic = this.host.settings.connectionDiagnostics[account.id];
    if (!diagnostic) return;
    const panel = container.createDiv({ cls: `wop-connection-diagnostic is-${diagnostic.status}` });
    const copy = panel.createDiv({ cls: "wop-connection-copy" });
    copy.createEl("strong", { text: diagnostic.status === "ok" ? "连接正常" : diagnostic.status === "ip-blocked" ? "IP 白名单未通过" : "连接检查失败" });
    copy.createEl("span", { text: diagnostic.status === "ip-blocked" && diagnostic.rejectedIp ? `微信拒绝的 IP：${diagnostic.rejectedIp}` : diagnostic.message });
    if (diagnostic.status === "ip-blocked") {
      copy.createEl("span", { text: "复制后前往：微信开发者平台 → 公众号 → 开发配置 → IP 白名单。" });
    }
    const actions = panel.createDiv({ cls: "wop-connection-actions" });
    if (diagnostic.rejectedIp) {
      const copyIp = actions.createEl("button", { text: "复制 IP" });
      copyIp.addEventListener("click", async () => {
        await navigator.clipboard.writeText(diagnostic.rejectedIp);
        new Notice(`已复制 IP：${diagnostic.rejectedIp}`);
      });
    }
    const openPlatform = actions.createEl("button", { text: "打开开发者平台", cls: "mod-cta" });
    openPlatform.addEventListener("click", () => window.open("https://developers.weixin.qq.com/platform", "_blank", "noopener,noreferrer"));
  }

  private renderAddAccount(container: HTMLElement): void {
    const details = container.createEl("details", { cls: "wop-add-account" });
    const summary = details.createEl("summary");
    const icon = summary.createSpan();
    setIcon(icon, "plus");
    summary.createSpan({ text: "手动添加其他账号" });
    const form = details.createDiv({ cls: "wop-add-account-form" });
    let name = "我的公众号";
    let appId = "";
    let secret = "";
    new Setting(form).setName("账号名称").setDesc("仅用于在 Obsidian 中区分账号").addText((text) => text.setValue(name).onChange((value) => { name = value; }));
    new Setting(form).setName("AppID").addText((text) => text.setPlaceholder("wx...").onChange((value) => { appId = value; }));
    new Setting(form).setName("AppSecret").setDesc("由 Obsidian SecretStorage 管理").addText((text) => {
      text.inputEl.type = "password";
      text.setPlaceholder("不会写入插件配置").onChange((value) => { secret = value; });
    });
    new Setting(form).addButton((button) => button.setButtonText("添加账号").setCta().onClick(async () => {
      if (!name.trim() || !appId.trim() || !secret.trim()) {
        new Notice("请填写账号名称、AppID 和 AppSecret。");
        return;
      }
      const accountId = `account-${Date.now().toString(36)}`;
      const account: WechatAccount = {
        id: accountId,
        name: name.trim(),
        appId: appId.trim(),
        encryptedSecret: this.host.credentials.store(accountId, secret)
      };
      this.host.settings.accounts.push(account);
      if (!this.host.settings.defaultAccountId) this.host.settings.defaultAccountId = account.id;
      await this.host.saveSettings();
      new Notice("账号已添加。");
      this.display();
    }));
  }

  private renderSectionHeader(parent: HTMLElement, title: string, description: string): void {
    const header = parent.createDiv({ cls: "wop-settings-section-header" });
    header.createEl("h3", { text: title });
    header.createEl("p", { text: description });
  }
}

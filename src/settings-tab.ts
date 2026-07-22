import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { Notice, PluginSettingTab, Setting } from "obsidian";
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
    containerEl.createEl("h2", { text: "WeChat Obsidian Publisher" });
    containerEl.createEl("p", {
      text: "AppSecret 保存到 Obsidian 专用密钥存储，插件配置只保留引用，不写入明文。发布前仍会显示确认窗口。",
      cls: "setting-item-description"
    });

    new Setting(containerEl)
      .setName("默认作者")
      .setDesc("文章 frontmatter 未填写 author 时使用")
      .addText((text) => text
        .setPlaceholder("公众号作者")
        .setValue(this.host.settings.defaultAuthor)
        .onChange(async (value) => {
          this.host.settings.defaultAuthor = value.trim();
          await this.host.saveSettings();
        }));

    new Setting(containerEl)
      .setName("默认封面路径")
      .setDesc("支持库内相对路径。frontmatter 的 cover 优先级更高")
      .addText((text) => text
        .setPlaceholder("images/cover.png")
        .setValue(this.host.settings.defaultCoverPath)
        .onChange(async (value) => {
          this.host.settings.defaultCoverPath = value.trim();
          await this.host.saveSettings();
        }));

    containerEl.createEl("h3", { text: "公众号账号" });
    const accounts = containerEl.createDiv({ cls: "wop-account-settings" });
    if (this.host.settings.accounts.length === 0) {
      accounts.createEl("p", { text: "还没有配置账号。可从现有 Wenyan 配置导入，或手动添加。", cls: "wop-empty" });
    }
    for (const account of this.host.settings.accounts) this.renderAccount(accounts, account);

    const importSetting = new Setting(containerEl)
      .setName("导入现有 Wenyan 账号")
      .setDesc("读取本机 Wenyan 发布配置并立即转存到 Obsidian 专用密钥存储");
    importSetting.addButton((button) => button.setButtonText("安全导入").onClick(async () => {
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
        new Notice("账号已安全导入，AppSecret 未以明文保存。");
        this.display();
      } catch (error) {
        new Notice(error instanceof Error ? error.message : "导入失败。");
      }
    }));

    this.renderAddAccount(containerEl);
  }

  private renderAccount(container: HTMLElement, account: WechatAccount): void {
    const card = container.createDiv({ cls: "wop-settings-card" });
    const header = card.createDiv({ cls: "wop-settings-card-header" });
    header.createEl("strong", { text: account.name });
    header.createEl("span", { text: account.appId.replace(/^(.{4}).*(.{4})$/, "$1••••$2") });
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
        new Notice("AppSecret 已加密更新。");
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
      copy.createEl("span", { text: "复制后前往：设置与开发 → 基本配置 → IP 白名单。" });
    }
    const actions = panel.createDiv({ cls: "wop-connection-actions" });
    if (diagnostic.rejectedIp) {
      const copyIp = actions.createEl("button", { text: "复制 IP" });
      copyIp.addEventListener("click", async () => {
        await navigator.clipboard.writeText(diagnostic.rejectedIp);
        new Notice(`已复制 IP：${diagnostic.rejectedIp}`);
      });
    }
    const openPlatform = actions.createEl("button", { text: "打开公众号后台", cls: "mod-cta" });
    openPlatform.addEventListener("click", () => window.open("https://mp.weixin.qq.com/", "_blank", "noopener,noreferrer"));
  }

  private renderAddAccount(container: HTMLElement): void {
    container.createEl("h3", { text: "手动添加账号" });
    let name = "我的公众号";
    let appId = "";
    let secret = "";
    new Setting(container).setName("账号名称").addText((text) => text.setValue(name).onChange((value) => { name = value; }));
    new Setting(container).setName("AppID").addText((text) => text.setPlaceholder("wx...").onChange((value) => { appId = value; }));
    new Setting(container).setName("AppSecret").addText((text) => {
      text.inputEl.type = "password";
      text.setPlaceholder("仅在本机加密保存").onChange((value) => { secret = value; });
    });
    new Setting(container).addButton((button) => button.setButtonText("添加账号").setCta().onClick(async () => {
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
}

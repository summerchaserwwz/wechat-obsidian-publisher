export type PublisherTab = "preview" | "modules" | "templates" | "publish";
export type PreviewDevice = "phone" | "desktop";
export type ModulePlacement = "before" | "after";

export interface ArticleMeta {
  title: string;
  author: string;
  digest: string;
  cover: string;
  sourceUrl: string;
}

export interface ContentModule {
  id: string;
  name: string;
  placement: ModulePlacement;
  enabled: boolean;
  markdown: string;
}

export type TemplateSource = "built-in" | "wenyan-inspired" | "md2-inspired" | "custom";

export interface PublisherTemplate {
  id: string;
  name: string;
  description: string;
  source: TemplateSource;
  accent: string;
  canvas: string;
  styles: Record<string, Record<string, string>>;
}

export interface WechatAccount {
  id: string;
  name: string;
  appId: string;
  encryptedSecret: string;
}

export interface PublishReceipt {
  mediaId: string;
  verified: boolean;
  title: string;
  publishedAt: number;
  operation: "add" | "update";
}

export interface RenderedArticle {
  html: string;
  meta: ArticleMeta;
  imageSources: string[];
  warnings: string[];
}

export interface PluginSettings {
  version: 1;
  activeTemplateId: string;
  previewDevice: PreviewDevice;
  activeTab: PublisherTab;
  defaultAccountId: string;
  defaultAuthor: string;
  defaultCoverPath: string;
  accounts: WechatAccount[];
  modules: ContentModule[];
  customTemplates: PublisherTemplate[];
  lastDraftByFile: Record<string, string>;
}

export interface ImageAsset {
  source: string;
  bytes: ArrayBuffer;
  mimeType: string;
  filename: string;
}

export interface PublishInput {
  account: WechatAccount;
  secret: string;
  article: RenderedArticle;
  sourcePath: string;
  resolveImage: (source: string) => Promise<ImageAsset>;
  existingMediaId?: string;
}

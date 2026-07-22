export type PublisherTab = "preview" | "modules" | "templates" | "publish";
export type PreviewDevice = "phone" | "desktop";
export type ModulePlacement = "before" | "before-first-table" | "after-first-table" | "after";
export type ModuleKind =
  | "intro"
  | "table-before"
  | "table-after"
  | "ending"
  | "recommendations"
  | "author"
  | "follow"
  | "copyright"
  | "custom";

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
  kind?: ModuleKind;
  placement: ModulePlacement;
  enabled: boolean;
  markdown: string;
}

export type TemplateSource = "md2-catalog" | "custom";

export interface TemplateTokens {
  variant: string;
  style?: string;
  series?: string;
  color?: string;
  shape?: string;
  accent: string;
  accentSoft: string;
  tint: string;
  heading: string;
  body: string;
  link: string;
  strong: string;
  surface?: string;
  gradient?: string;
  glow?: string;
}

export interface PublisherTemplate {
  id: string;
  name: string;
  description: string;
  source: TemplateSource;
  group: string;
  sourceLabel: string;
  license: string;
  upstream?: string;
  tags: string[];
  accent: string;
  canvas: string;
  tokens: TemplateTokens;
  styles: Record<string, Record<string, string>>;
}

export interface WechatAccount {
  id: string;
  name: string;
  appId: string;
  encryptedSecret: string;
}

export interface WechatConnectionDiagnostic {
  status: "ok" | "ip-blocked" | "error";
  message: string;
  rejectedIp: string;
  checkedAt: number;
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
  version: 2;
  activeTemplateId: string;
  previewDevice: PreviewDevice;
  activeTab: PublisherTab;
  defaultAccountId: string;
  defaultAuthor: string;
  defaultCoverPath: string;
  accounts: WechatAccount[];
  connectionDiagnostics: Record<string, WechatConnectionDiagnostic>;
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

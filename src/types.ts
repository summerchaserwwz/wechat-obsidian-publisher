export type PublisherTab = "preview" | "modules" | "templates" | "publish";
export type PreviewDevice = "phone" | "wechat" | "desktop";
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

export type TemplateSource = "md2-catalog" | "source-theme" | "curated" | "custom";
export type TemplateAlignment = "left" | "source";
export type TemplateStructureAdapter = "none" | "publication" | "wenyan";
export type CodeBlockPreset = "macos-dark" | "macos-light" | "plain";

export interface CodeBlockProfile {
  preset: CodeBlockPreset;
  showChrome: boolean;
  showLanguage: boolean;
  background: string;
  headerBackground: string;
  foreground: string;
  muted: string;
  border: string;
  dotRed: string;
  dotYellow: string;
  dotGreen: string;
  keyword: string;
  string: string;
  function: string;
  number: string;
  comment: string;
  tag: string;
}

export interface ArticleLayoutTuning {
  fontSize: number;
  lineHeight: number;
  paragraphSpacing: number;
  headingSpacing: number;
  verticalPadding: number;
  contentPadding: number;
}

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
  /**
   * Source-backed CSS is parsed into inline declarations before publishing.
   * It lets a template keep the small structural details that a token palette
   * cannot represent, such as Pie's heading marks and quote glyph.
   */
  rawCss?: string;
  alignment?: TemplateAlignment;
  structureAdapter?: TemplateStructureAdapter;
  /** Defaults to a WeChat-safe macOS window, even for imported source themes. */
  codeBlockProfile?: CodeBlockProfile;
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
  /**
   * The same export-safe markup rendered by the preview surface. It differs
   * from `html` only where a publish-only format must be materialized, such
   * as Mermaid SVG being rasterized for WeChat.
   */
  previewHtml?: string;
  meta: ArticleMeta;
  imageSources: string[];
  warnings: string[];
}

export interface PluginSettings {
  version: 3;
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
  /** Built-in or user templates pinned to the top of the picker. */
  favoriteTemplateIds: string[];
  layoutByTemplate: Record<string, ArticleLayoutTuning>;
  /** Templates explicitly restored to their upstream spacing and typography. */
  sourceLayoutTemplateIds: string[];
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

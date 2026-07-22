import type { ContentModule, PluginSettings } from "./types";

export const VIEW_TYPE_PUBLISHER = "wechat-obsidian-publisher-view";

export const DEFAULT_MODULES: ContentModule[] = [
  {
    id: "series-intro",
    name: "系列导语",
    placement: "before",
    enabled: false,
    markdown: "> 这是一个持续更新的专题系列。本篇从问题、方法和实践三个层面展开。"
  },
  {
    id: "reader-note",
    name: "阅读提示",
    placement: "before",
    enabled: false,
    markdown: "**阅读提示**：建议先收藏，完整阅读约需 8 分钟。"
  },
  {
    id: "follow-card",
    name: "关注引导",
    placement: "after",
    enabled: false,
    markdown: "---\n\n如果这篇文章对你有帮助，欢迎关注并分享给需要的人。"
  },
  {
    id: "copyright",
    name: "版权说明",
    placement: "after",
    enabled: false,
    markdown: "> 本文由作者原创，转载请联系授权并保留出处。"
  }
];

export const DEFAULT_SETTINGS: PluginSettings = {
  version: 1,
  activeTemplateId: "md2-forest",
  previewDevice: "desktop",
  activeTab: "preview",
  defaultAccountId: "",
  defaultAuthor: "",
  defaultCoverPath: "",
  accounts: [],
  modules: DEFAULT_MODULES,
  customTemplates: [],
  lastDraftByFile: {}
};

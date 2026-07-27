import type { ContentModule, PluginSettings } from "./types";

export const VIEW_TYPE_PUBLISHER = "wechat-obsidian-publisher-view";

export const DEFAULT_MODULES: ContentModule[] = [
  {
    id: "md2-intro",
    name: "开头",
    kind: "intro",
    placement: "before",
    enabled: true,
    markdown: "> 写在前面：这篇文章来自本地 Markdown 工作流，可以在这里补充导语、栏目说明或活动提示。"
  },
  {
    id: "md2-table-before",
    name: "表格前插入",
    kind: "table-before",
    placement: "before-first-table",
    enabled: true,
    markdown: "## 数据说明\n\n下面这张表是发布前检查项，可以在这里补充口径、样本范围或读者提示。"
  },
  {
    id: "md2-table-after",
    name: "表格后插入",
    kind: "table-after",
    placement: "after-first-table",
    enabled: true,
    markdown: "表格结论：优先处理失败项，再进入草稿箱发布。"
  },
  {
    id: "md2-ending",
    name: "结尾",
    kind: "ending",
    placement: "after",
    enabled: true,
    markdown: "## 结尾\n\n以上是这次的主要内容。如果这套流程对你有帮助，欢迎继续关注后续更新。"
  },
  {
    id: "md2-recommendations",
    name: "往期推荐",
    kind: "recommendations",
    placement: "after",
    enabled: true,
    markdown: "## 延伸阅读\n\n- [本地优先工具链复盘](https://example.com/local-first)\n- [Obsidian 发布流的图片处理](https://example.com/obsidian-images)"
  },
  {
    id: "md2-author",
    name: "作者介绍",
    kind: "author",
    placement: "after",
    enabled: true,
    markdown: "## 作者介绍\n\n长期写作产品、工具和本地工作流，关注让创作更稳定的工程细节。"
  },
  {
    id: "md2-follow",
    name: "关注卡片",
    kind: "follow",
    placement: "after",
    enabled: false,
    markdown: "## 关注我\n\n如果这篇文章对你有帮助，欢迎关注并分享给需要的人。"
  },
  {
    id: "md2-copyright",
    name: "版权声明",
    kind: "copyright",
    placement: "after",
    enabled: true,
    markdown: "> 本文由作者原创发布，转载请联系授权并保留来源链接。"
  },
  {
    id: "md2-custom",
    name: "自定义模块",
    kind: "custom",
    placement: "after",
    enabled: false,
    markdown: "## 自定义模块\n\n这里可以放活动提醒、资料领取、社群入口或其他固定内容。"
  }
];

export const DEFAULT_SETTINGS: PluginSettings = {
  version: 3,
  activeTemplateId: "curated-modern-editorial-left",
  previewDevice: "wechat",
  activeTab: "preview",
  defaultAccountId: "",
  defaultAuthor: "",
  defaultCoverPath: "",
  accounts: [],
  connectionDiagnostics: {},
  modules: DEFAULT_MODULES,
  customTemplates: [],
  favoriteTemplateIds: [],
  layoutByTemplate: {},
  sourceLayoutTemplateIds: [],
  lastDraftByFile: {}
};

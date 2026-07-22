import type { TemplateTokens } from "../types";

export interface Md2ThemeDefinition {
  id: string;
  name: string;
  description: string;
  group: string;
  sourceLabel: string;
  license: string;
  upstream?: string;
  tags: string[];
  tokens: TemplateTokens;
}

type ThemeRow = [
  id: string,
  name: string,
  group: string,
  source: string,
  license: string,
  variant: string,
  style: string,
  shape: string,
  accent: string,
  accentSoft: string,
  tint: string,
  heading: string,
  body: string,
  link?: string,
  strong?: string
];

const UPSTREAM_BY_SOURCE: Record<string, string> = {
  "Design Lab": "Adapted from doocs/md, mdnice/markdown-nice, WeMD, Typora Gallery and github-markdown-css",
  Wenyan: "caol64/wenyan-core @wenyan-md/core 3.0.10",
  "markdown-nice": "mdnice/markdown-nice src/template/basic.js and markdown/normal.js",
  "doocs/md": "doocs/md packages/shared/src/configs/theme-css",
  WeMD: "tenngoxars/WeMD packages/core/src/themes",
  "WeChat Format": "lyricat/wechat-format src/assets/scripts/themes",
  NeuraPress: "tianyaxiang/neurapress src/config/wechat-templates.ts",
  "MD2 Catalog": "geekjourneyx/md2wechat-skill themes/api.yaml"
};

const rows: ThemeRow[] = [
  ["design-github-readme", "GitHub README", "设计实验室", "Design Lab", "source-informed", "design-lab", "github-readme", "", "#0969da", "#d1d9e0", "#f6f8fa", "#1f2328", "#1f2328"],
  ["design-doocs-grace", "Doocs Grace", "设计实验室", "Design Lab", "source-informed", "design-lab", "doocs-grace", "", "#77639b", "#c7bddc", "#f7f4fb", "#2e2938", "#34303d", "#665287"],
  ["design-mdnice-blue", "Mdnice Blue", "设计实验室", "Design Lab", "source-informed", "design-lab", "mdnice-blue", "", "#426a8f", "#b8c9d8", "#f5f8fa", "#1d252c", "#2b343a", "#315f8f"],
  ["design-wemd-aurora", "Aurora Glass", "设计实验室", "Design Lab", "source-informed", "design-lab", "wemd-aurora", "", "#5267a8", "#9c72a5", "#f7f4fb", "#2d3348", "#34364d"],
  ["design-typora-nord", "Nord Note", "设计实验室", "Design Lab", "source-informed", "design-lab", "typora-nord", "", "#5e81ac", "#b7c7d8", "#eceff4", "#2e3440", "#3b4252", "#4c729f"],
  ["design-typora-cobalt", "Cobalt Code", "设计实验室", "Design Lab", "source-informed", "design-lab", "typora-cobalt", "", "#193549", "#0088cc", "#edf7ff", "#193549", "#213748", "#0088cc"],
  ["design-typora-eloquent", "Eloquent", "设计实验室", "Design Lab", "source-informed", "design-lab", "typora-eloquent", "", "#404040", "#dfe2e5", "#f8f8f8", "#404040", "#333333", "#0d6efd"],
  ["design-typora-newsprint", "Newsprint", "设计实验室", "Design Lab", "source-informed", "design-lab", "typora-newsprint", "", "#2f2a24", "#d7c7ad", "#f5efe2", "#2f2a24", "#3a332c", "#9b2c2c"],

  ["signal-forge", "绿脉终端", "独家签名", "MD2 Signature", "internal", "signature", "", "terminal", "#00d992", "#2fd6a1", "#eafff7", "#0b2b22", "#24352f", "#00a878", "#008f70"],
  ["terracotta-brief", "陶土手札", "独家签名", "MD2 Signature", "internal", "signature", "", "editorial", "#c86f4a", "#f3c6aa", "#fff3ea", "#33231d", "#3f312b", "#a94f31", "#a9583e"],
  ["waveform-night", "声纹夜航", "独家签名", "MD2 Signature", "internal", "signature", "", "cinematic", "#7c5cff", "#25d7ff", "#f4f1ff", "#1f1b46", "#302b4b", "#6b4eff", "#5a46cc"],
  ["neon-ledger", "霓虹黑箱", "独家签名", "MD2 Signature", "internal", "signature", "", "neon", "#00a8b8", "#ff4fd8", "#ecfeff", "#101828", "#25313a", "#008ea0", "#006d7a"],
  ["violet-blueprint", "紫雾蓝图", "独家签名", "MD2 Signature", "internal", "signature", "", "blueprint", "#8b5cf6", "#38bdf8", "#eef2ff", "#312e81", "#26324a", "#6d4bd1", "#5b3fc1"],
  ["mono-command", "黑白命令", "独家签名", "MD2 Signature", "internal", "signature", "", "mono", "#111111", "#a3a3a3", "#f5f5f5", "#111111", "#242424"],
  ["mint-docs", "薄荷文档", "独家签名", "MD2 Signature", "internal", "signature", "", "docs", "#10b981", "#a7f3d0", "#ecfdf5", "#064e3b", "#1f3a34", "#059669", "#047857"],
  ["paper-cinema", "胶片白稿", "独家签名", "MD2 Signature", "internal", "signature", "", "cinema-paper", "#111111", "#e5484d", "#faf7f2", "#111111", "#292524", "#b42318", "#b42318"],

  ["wenyan-default", "清白", "Wenyan 兼容", "Wenyan", "Apache-2.0", "default", "", "", "#0069c2", "#d8d8d8", "#f8f8f8", "#222222", "#222222"],
  ["wenyan-orange-heart", "橙签", "Wenyan 兼容", "Wenyan", "Apache-2.0", "orangeheart", "", "", "#ef7060", "#efebe9", "#fff9f9", "#222222", "#222222"],
  ["wenyan-rainbow", "彩笺", "Wenyan 兼容", "Wenyan", "Apache-2.0", "rainbow", "", "", "#ffbfbf", "#ffe8e8", "#fff9f2", "#666666", "#222222", "#1f75ff"],
  ["wenyan", "红线", "Wenyan 兼容", "Wenyan", "Apache-2.0", "pie", "", "", "#da282a", "#f27f79", "#fff2f0", "#262626", "#262626"],
  ["wenyan-lapis", "蓝印", "Wenyan 兼容", "Wenyan", "Apache-2.0", "lapis", "", "", "#4870ac", "#d9dfe4", "#f6f8fa", "#4870ac", "#40464f"],
  ["wenyan-maize", "麦穗", "Wenyan 兼容", "Wenyan", "Apache-2.0", "maize", "", "", "#ffb11b", "#ffd8b5", "#fff9f9", "#222222", "#222222", "#e49123"],
  ["wenyan-purple", "紫藤", "Wenyan 兼容", "Wenyan", "Apache-2.0", "purple", "", "", "#8064a9", "#b9add7", "#f4f2f9", "#8064a9", "#444444", "#2aa899"],
  ["wenyan-mint", "薄荷", "Wenyan 兼容", "Wenyan", "Apache-2.0", "phycat", "", "", "#3db8bf", "#7aeaf0", "#edfafa", "#3db8bf", "#222222", "#089ba3"],
  ["wenyan-juejin-default", "掘金", "Wenyan 兼容", "Wenyan", "Apache-2.0", "juejin_default", "", "", "#1e80ff", "#ececec", "#f8f8f8", "#111111", "#222222", "#0069c2"],
  ["wenyan-medium-default", "中版", "Wenyan 兼容", "Wenyan", "Apache-2.0", "medium_default", "", "", "#111111", "#c4c7ce", "#f9f9f9", "#111111", "#222222"],
  ["wenyan-toutiao-default", "头条", "Wenyan 兼容", "Wenyan", "Apache-2.0", "toutiao_default", "", "", "#ff403a", "#d8d8d8", "#f8f8f8", "#222222", "#222222", "#0069c2"],
  ["wenyan-zhihu-default", "知乎", "Wenyan 兼容", "Wenyan", "Apache-2.0", "zhihu_default", "", "", "#0069c2", "#c4c7ce", "#f8f8fa", "#191b1f", "#222222", "#0069c2"],

  ["markdown-nice-default", "Mdnice 默认", "开源主题", "markdown-nice", "GPL-3.0", "markdown-nice", "", "", "#426a8f", "#d9e3ea", "#f7f9fa", "#1d252c", "#2b343a", "#315f8f"],
  ["doocs-classic", "Doocs 经典", "开源主题", "doocs/md", "WTFPL", "doocs-md", "default", "", "#315f8f", "#a8c6d5", "#f4f8fa", "#213342", "#2d3338"],
  ["doocs-grace", "Doocs 优雅", "开源主题", "doocs/md", "WTFPL", "doocs-md", "grace", "", "#77639b", "#c7bddc", "#f7f4fb", "#2e2938", "#2d3338"],
  ["doocs-simple", "Doocs 简洁", "开源主题", "doocs/md", "WTFPL", "doocs-md", "simple", "", "#4f8068", "#b7d3c2", "#f3f8f5", "#1f352b", "#2d3338"],
  ["wemd-default", "WeMD 默认", "WeMD", "WeMD", "MIT", "wemd", "default", "", "#315f8f", "#b7c7d8", "#f7f8f8", "#1f2933", "#333333"],
  ["wemd-academic-paper", "学术论文", "WeMD", "WeMD", "MIT", "wemd", "academic-paper", "", "#8a3f4d", "#d7b8ac", "#faf7f4", "#2f2a28", "#333333"],
  ["wemd-aurora-glass", "极光玻璃", "WeMD", "WeMD", "MIT", "wemd", "aurora-glass", "", "#5267a8", "#9c72a5", "#f7f4fb", "#2d3348", "#333333"],
  ["wemd-bauhaus", "包豪斯", "WeMD", "WeMD", "MIT", "wemd", "bauhaus", "", "#b85b4a", "#426a8f", "#fbf4e8", "#1f1f1f", "#333333"],
  ["wemd-cyberpunk-neon", "赛博朋克", "WeMD", "WeMD", "MIT", "wemd", "cyberpunk-neon", "", "#2d9da9", "#a65b9a", "#f4fbfb", "#17262a", "#333333"],
  ["wemd-knowledge-base", "知识库", "WeMD", "WeMD", "MIT", "wemd", "knowledge-base", "", "#b08a3c", "#d8d0bd", "#f7f5f0", "#37352f", "#333333"],
  ["wemd-luxury-gold", "黑金奢华", "WeMD", "WeMD", "MIT", "wemd", "luxury-gold", "", "#a88a54", "#d9c690", "#fbf6ea", "#171717", "#333333"],
  ["wemd-morandi-forest", "莫兰迪森林", "WeMD", "WeMD", "MIT", "wemd", "morandi-forest", "", "#5c735f", "#9caf95", "#f3f5f1", "#25312a", "#3a4d39"],
  ["wemd-neo-brutalism", "新粗野主义", "WeMD", "WeMD", "MIT", "wemd", "neo-brutalism", "", "#6e5b8f", "#c76f45", "#f6f1d8", "#161616", "#333333"],
  ["wemd-receipt", "购物小票", "WeMD", "WeMD", "MIT", "wemd", "receipt", "", "#2a2a2a", "#c9c9c9", "#fafafa", "#111111", "#333333"],
  ["wemd-sunset-film", "落日胶片", "WeMD", "WeMD", "MIT", "wemd", "sunset-film", "", "#a75f4b", "#d9a08d", "#fbf2e8", "#43322d", "#5d4037"],
  ["wechat-format-default", "WF 默认", "微信排版", "WeChat Format", "source-available", "wechat-format", "default", "", "#b45f42", "#d7cdc2", "#f8f5ec", "#2f2f2f", "#3f3f3f"],
  ["wechat-format-lupeng", "鲁鹏", "微信排版", "WeChat Format", "source-available", "wechat-format", "lupeng", "", "#8f5f4a", "#d8cbc0", "#fbfaf7", "#3a3836", "#595959"],
  ["neurapress-default", "NP 默认", "NeuraPress", "NeuraPress", "MIT", "neurapress", "default", "", "#4f8068", "#b7d3c2", "#f3f8f5", "#26342d", "#333333"],
  ["neurapress-simple", "雷军风格", "NeuraPress", "NeuraPress", "MIT", "neurapress", "simple", "", "#bd6a45", "#e1b394", "#fbf4ee", "#3c302a", "#333333"],
  ["neurapress-elegant", "文学优雅", "NeuraPress", "NeuraPress", "MIT", "neurapress", "elegant", "", "#4f8068", "#b7d3c2", "#f7faf7", "#2c3e50", "#2c3e50"],
  ["neurapress-creative", "科技渐变", "NeuraPress", "NeuraPress", "MIT", "neurapress", "creative", "", "#426a8f", "#b2c2dc", "#f4f8fa", "#26364b", "#333333"],
  ["neurapress-smartisan", "锤子便签", "NeuraPress", "NeuraPress", "MIT", "neurapress", "smartisan", "", "#7b665f", "#e0d2c5", "#fbf7ee", "#333333", "#333333"],

  ["mdnice", "海盐", "编辑精选", "MD2 Editorial", "inspired preset", "mdnice", "", "", "#246bfe", "#bfdbfe", "#eff5ff", "#1b2a41", "#334155"],
  ["mdnice-forest", "青森", "编辑精选", "MD2 Editorial", "inspired preset", "mdnice-forest", "", "", "#0f9f7a", "#b7ead6", "#ecfdf5", "#1d332d", "#293a35", "#057f63"],
  ["doocs", "竹简", "编辑精选", "MD2 Editorial", "inspired preset", "doocs", "", "", "#0f766e", "#99f6e4", "#f2fbf8", "#22313f", "#263442"],
  ["doocs-blue", "蓝图", "编辑精选", "MD2 Editorial", "inspired preset", "doocs-blue", "", "", "#1d4ed8", "#bfdbfe", "#eef4ff", "#1e3a8a", "#253142"],
  ["github", "灰页", "编辑精选", "MD2 Editorial", "inspired preset", "github", "", "", "#0969da", "#d0d7de", "#f6f8fa", "#24292f", "#24292f"],
  ["juejin", "星蓝", "编辑精选", "MD2 Editorial", "inspired preset", "juejin", "", "", "#1e80ff", "#cce3ff", "#f4f8ff", "#1d3557", "#252933"],
  ["sspai", "红评", "编辑精选", "MD2 Editorial", "inspired preset", "sspai", "", "", "#d71920", "#ffd1d1", "#fff5f5", "#202020", "#2d2d2d"],
  ["wired", "黑铅", "编辑精选", "MD2 Editorial", "inspired preset", "wired", "", "", "#000000", "#d9d9d9", "#f5f5f5", "#000000", "#202020", "#057dbc"],
  ["verge", "电波", "编辑精选", "MD2 Editorial", "inspired preset", "verge", "", "", "#3cffd0", "#bffdef", "#effffb", "#131313", "#1f2428", "#3860be"],
  ["internal", "素笺", "编辑精选", "MD2 Editorial", "internal", "internal", "", "", "#394150", "#d0d5dd", "#f7f8fa", "#101828", "#344054"]
];

const palette = {
  gold: ["#b88928", "#fff8e6", "#2f2615", "#e8c56a"],
  green: ["#0f9f7a", "#ecfdf5", "#213a33", "#9ee7d2"],
  blue: ["#246bfe", "#eff5ff", "#1b2a41", "#a9c7ff"],
  orange: ["#e86f35", "#fff3e8", "#3f2d24", "#f4b38a"],
  red: ["#d71920", "#fff2f2", "#341c1c", "#ffb3b6"],
  navy: ["#233b63", "#eef3fa", "#172033", "#9aa9c7"],
  gray: ["#5f6874", "#f3f5f7", "#25292f", "#c9d0d8"],
  sky: ["#38a8ff", "#edf8ff", "#183548", "#b6e4ff"]
} as const;

const colorNames: Record<keyof typeof palette, string> = {
  gold: "金", green: "绿", blue: "蓝", orange: "橙", red: "红", navy: "藏青", gray: "灰", sky: "天蓝"
};

const md2Basics = [
  ["default", "微信原生", "basic", "green", "微信经典风格，温暖舒适"],
  ["bytedance", "字节蓝", "basic", "blue", "科技现代风格，简洁利落"],
  ["apple", "苹果渐变", "basic", "sky", "视觉渐变风格，精致优雅"],
  ["sports", "运动橙", "basic", "orange", "活力动感风格，充满能量"],
  ["chinese", "宋韵", "basic", "red", "古典雅致风格，书卷气息"],
  ["cyber", "赛博青", "basic", "sky", "未来科技风格，霓虹光影"],
  ["sspai-red", "少数派红", "featured", "red", "少数派红色风格，利落醒目"],
  ["wechat-native", "原生绿", "featured", "green", "微信公众号原生，稳妥耐读"]
] as const;

const seriesNames = { minimal: "极简", focus: "聚焦", elegant: "雅致", bold: "醒目" } as const;
const seriesDescriptions = {
  minimal: "干净克制，纯色文字无装饰",
  focus: "居中对称，标题上下双横线",
  elegant: "层次丰富，左边框递减和渐变背景",
  bold: "视觉冲击，标题满底色和圆角投影"
} as const;

function fromRow(row: ThemeRow): Md2ThemeDefinition {
  const [id, name, group, sourceLabel, license, variant, style, shape, accent, accentSoft, tint, heading, body, link, strong] = row;
  return {
    id,
    name,
    description: `${name}主题，完整兼容 MD2 主题目录。`,
    group,
    sourceLabel,
    license,
    upstream: UPSTREAM_BY_SOURCE[sourceLabel],
    tags: [group, sourceLabel, variant, style, shape].filter(Boolean),
    tokens: {
      variant,
      style: style || undefined,
      shape: shape || undefined,
      accent,
      accentSoft,
      tint,
      heading,
      body,
      link: link || accent,
      strong: strong || link || accent
    }
  };
}

function md2Definition(slug: string, name: string, series: string, color: keyof typeof palette, description: string): Md2ThemeDefinition {
  const [accent, tint, heading, accentSoft] = palette[color];
  return {
    id: `md2wechat-${slug}`,
    name,
    description,
    group: "MD2 全量",
    sourceLabel: "MD2 Catalog",
    license: "MIT",
    upstream: UPSTREAM_BY_SOURCE["MD2 Catalog"],
    tags: ["md2wechat", series, color],
    tokens: {
      variant: "md2wechat-api",
      series,
      color,
      accent,
      accentSoft,
      tint,
      heading,
      body: "#2d3338",
      link: accent,
      strong: accent
    }
  };
}

const md2Generated = [
  ...md2Basics.map(([slug, name, series, color, description]) => md2Definition(slug, name, series, color, description)),
  ...Object.entries(seriesNames).flatMap(([series, seriesName]) =>
    (Object.keys(palette) as Array<keyof typeof palette>).map((color) =>
      md2Definition(`${series}-${color}`, `${seriesName}${colorNames[color]}`, series, color, seriesDescriptions[series as keyof typeof seriesDescriptions])
    )
  )
];

export const MD2_THEME_DEFINITIONS: Md2ThemeDefinition[] = [
  ...rows.slice(0, 50).map(fromRow),
  ...md2Generated,
  ...rows.slice(50).map(fromRow)
];

export const MD2_THEME_GROUPS = [...new Set(MD2_THEME_DEFINITIONS.map((theme) => theme.group))];

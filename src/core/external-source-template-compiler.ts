import type { PublisherTemplate, TemplateTokens } from "../types";
import { EXTERNAL_SOURCE_THEME_DEFINITIONS, type ExternalSourceThemeDefinition } from "./external-source-themes";

const GROUP_LABELS: Record<ExternalSourceThemeDefinition["group"], string> = {
  mopai: "墨排原版",
  wemd: "WeMD 原版",
  neurapress: "NeuraPress 原版",
  doocs: "Doocs 原版"
};

const STRONG_VISUAL_IDS = new Set([
  "mopai-street-hype",
  "mopai-cyber-neon",
  "wemd-bauhaus",
  "wemd-cyberpunk-neon",
  "wemd-aurora-glass",
  "wemd-neo-brutalism",
  "wemd-receipt"
]);

const SPACIOUS_READING_IDS = new Set([
  "mopai-magazine-editorial",
  "mopai-french-romance",
  "wemd-eastern-notes",
  "wemd-whitespace-gallery",
  "neurapress-elegant",
  "neurapress-smartisan"
]);

function readingProfile(id: string): { suffix: string; tags: string[] } {
  if (STRONG_VISUAL_IDS.has(id)) {
    return { suffix: "适合短内容、活动预告或需要强标题视觉的文章。", tags: ["强视觉", "短内容"] };
  }
  if (SPACIOUS_READING_IDS.has(id)) {
    return { suffix: "保留更强的留白和叙事节奏，适合图文随笔与人物故事。", tags: ["留白叙事", "图文长文"] };
  }
  return { suffix: "正文、列表、引用和表格统一左读，适合持续阅读。", tags: ["长文优先", "左读"] };
}

function tokens(theme: ExternalSourceThemeDefinition): TemplateTokens {
  return {
    variant: "source-original",
    style: theme.id,
    series: theme.group,
    accent: theme.accent,
    accentSoft: theme.accent,
    tint: theme.canvas,
    heading: theme.heading,
    body: theme.body,
    link: theme.accent,
    strong: theme.heading
  };
}

export function compileExternalSourceTheme(theme: ExternalSourceThemeDefinition): PublisherTemplate {
  const profile = readingProfile(theme.id);
  return {
    id: theme.id,
    name: theme.name,
    description: `${theme.description}。${profile.suffix}`,
    source: "source-theme",
    group: GROUP_LABELS[theme.group],
    sourceLabel: theme.sourceLabel,
    license: theme.license,
    upstream: theme.upstream,
    tags: [...new Set(["原版样式", "正文左读", ...theme.tags, ...profile.tags])],
    accent: theme.accent,
    canvas: theme.canvas,
    tokens: tokens(theme),
    rawCss: theme.rawCss,
    alignment: "left",
    structureAdapter: theme.structureAdapter,
    // The raw source stylesheet owns the visual system. Keep this final map
    // deliberately tiny so it does not flatten source-specific typography.
    styles: { body: { boxSizing: "border-box" } }
  };
}

export const EXTERNAL_SOURCE_TEMPLATES = EXTERNAL_SOURCE_THEME_DEFINITIONS.map(compileExternalSourceTheme);
export const EXTERNAL_SOURCE_TEMPLATE_GROUPS = [...new Set(EXTERNAL_SOURCE_TEMPLATES.map((theme) => theme.group))];

import type { PatternType, VisualAssetHint, VisualAssetMood } from "@/types/schema";

export interface VisualAssetDefinition {
  tag: string;
  pattern: PatternType;
  title: string;
  description: string;
  emoji: string;
  tone: VisualAssetMood;
  accentVar: string;
}

const patternDefaults: Record<PatternType, VisualAssetDefinition> = {
  probability: {
    tag: "probability-card",
    pattern: "probability",
    title: "概率卡",
    description: "用不确定结果看清收益和风险边界。",
    emoji: "☆",
    tone: "idle",
    accentVar: "var(--pattern-probability)",
  },
  parameter_explore: {
    tag: "parameter-knob",
    pattern: "parameter_explore",
    title: "参数旋钮",
    description: "拖动变量，看结果怎样被推着变化。",
    emoji: "◇",
    tone: "idle",
    accentVar: "var(--pattern-parameter)",
  },
  concept_memory: {
    tag: "memory-terms",
    pattern: "concept_memory",
    title: "术语卡",
    description: "把抽象名词压成可翻开的短卡。",
    emoji: "◈",
    tone: "idle",
    accentVar: "var(--pattern-memory)",
  },
  process_timeline: {
    tag: "timeline-path",
    pattern: "process_timeline",
    title: "时间线",
    description: "沿着阶段看见因果怎样展开。",
    emoji: "→",
    tone: "idle",
    accentVar: "var(--pattern-timeline)",
  },
  comparison: {
    tag: "comparison-lens",
    pattern: "comparison",
    title: "对比镜",
    description: "把两个对象按维度拆开看。",
    emoji: "≠",
    tone: "idle",
    accentVar: "var(--pattern-comparison)",
  },
  knowledge_check: {
    tag: "check-spark",
    pattern: "knowledge_check",
    title: "理解检查",
    description: "用一道题确认机制是否真的连上了。",
    emoji: "✓",
    tone: "reward",
    accentVar: "var(--pattern-check)",
  },
  system_builder: {
    tag: "system-blocks",
    pattern: "system_builder",
    title: "系统积木",
    description: "把模块、连接和反馈拼成整体。",
    emoji: "▦",
    tone: "idle",
    accentVar: "var(--pattern-system)",
  },
  narrative_branch: {
    tag: "branch-choice",
    pattern: "narrative_branch",
    title: "选择分支",
    description: "通过一次选择看见后果和原则。",
    emoji: "⌁",
    tone: "idle",
    accentVar: "var(--pattern-branch)",
  },
  classification_sort: {
    tag: "classification-buckets",
    pattern: "classification_sort",
    title: "分一分类",
    description: "把案例放回正确边界里。",
    emoji: "□",
    tone: "idle",
    accentVar: "var(--pattern-classification)",
  },
  simulation_play: {
    tag: "simulation-loop",
    pattern: "simulation_play",
    title: "模拟器",
    description: "调整参数，播放机制随时间变化。",
    emoji: "△",
    tone: "idle",
    accentVar: "var(--pattern-simulation)",
  },
};

const assetsByTag = Object.fromEntries(
  Object.values(patternDefaults).map((asset) => [asset.tag, asset]),
) as Record<string, VisualAssetDefinition>;

export function getVisualAsset(pattern: PatternType, hint?: VisualAssetHint): VisualAssetDefinition {
  const matched = hint?.tag ? assetsByTag[hint.tag] : null;
  if (matched) {
    return {
      ...matched,
      tone: hint?.mood || matched.tone,
      emoji: hint?.emoji || matched.emoji,
    };
  }

  const fallback = patternDefaults[pattern];
  return {
    ...fallback,
    tone: hint?.mood || fallback.tone,
    emoji: hint?.emoji || fallback.emoji,
    tag: hint?.tag || fallback.tag,
  };
}

export const VISUAL_ASSET_REGISTRY = patternDefaults;

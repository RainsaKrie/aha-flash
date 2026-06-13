import type { PatternType } from "@/types/schema";

export type FlowPatternPreference = PatternType | "auto";

export const PATTERN_LABELS: Record<PatternType, string> = {
  probability: "概率抽卡",
  parameter_explore: "参数探索",
  concept_memory: "概念卡片",
  process_timeline: "时间线",
  comparison: "左右对比",
  knowledge_check: "小测验",
  system_builder: "系统搭建",
  narrative_branch: "情境分支",
  classification_sort: "分类归位",
  simulation_play: "模拟推演",
};

export const FLOW_PATTERN_OPTIONS = [
  { value: "auto", label: "AI 推荐" },
  ...Object.entries(PATTERN_LABELS).map(([value, label]) => ({ value, label })),
] as Array<{ value: FlowPatternPreference; label: string }>;

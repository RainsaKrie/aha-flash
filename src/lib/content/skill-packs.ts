import type { KnowledgeStructureType } from "./knowledge-blueprint.ts";
import type { PatternType } from "../../types/schema.ts";

export interface KnowledgeSkeleton {
  id: string;
  structure_type: KnowledgeStructureType;
  hints: string[];
  required_core_terms: string[];
  required_teaching_steps: string[];
  common_misconceptions: string[];
  forbidden_framings: string[];
  suitable_patterns: PatternType[];
  unsuitable_patterns: PatternType[];
  canonical_examples: string[];
}

export const KNOWLEDGE_SKILL_PACKS: KnowledgeSkeleton[] = [
  {
    id: "optimization-linear-programming",
    structure_type: "optimization_model",
    hints: ["linear programming", "integer programming", "optimization", "resource allocation", "production planning", "线性规划", "整数规划", "资源分配", "生产计划"],
    required_core_terms: ["decision variable", "objective function", "constraint", "feasible region", "optimum", "决策变量", "目标函数", "约束条件", "可行域", "最优解"],
    required_teaching_steps: ["define decision variables", "set objective function", "apply constraints", "search feasible region", "compare optimum"],
    common_misconceptions: ["treating optimization as a random draw", "only changing one slider without defining constraints", "只把线性规划当成随机选择"],
    forbidden_framings: ["看涨期权券", "期权费", "奖池", "抽取", "random prize"],
    suitable_patterns: ["system_builder", "parameter_explore", "simulation_play"],
    unsuitable_patterns: ["probability"],
    canonical_examples: ["factory product mix", "diet problem", "transportation planning", "资源分配"],
  },
  {
    id: "system-dns-resolution",
    structure_type: "system_process",
    hints: ["dns", "domain resolution", "域名解析", "DNS 解析"],
    required_core_terms: ["browser", "recursive resolver", "root server", "authoritative server", "cache", "IP address", "浏览器", "递归解析器", "根服务器", "权威服务器", "缓存", "IP 地址"],
    required_teaching_steps: ["request starts", "resolver asks hierarchy", "authoritative answer returns", "cache shortens next lookup"],
    common_misconceptions: ["DNS is just one database lookup", "recursive resolver and authoritative server are the same role"],
    forbidden_framings: ["single lookup only", "one-step lookup"],
    suitable_patterns: ["system_builder", "process_timeline", "knowledge_check"],
    unsuitable_patterns: ["probability"],
    canonical_examples: ["open example.com", "cache hit vs cache miss"],
  },
  {
    id: "probability-bayes-update",
    structure_type: "probabilistic_reasoning",
    hints: ["bayes", "bayesian", "贝叶斯", "条件概率"],
    required_core_terms: ["prior", "likelihood", "posterior", "evidence", "conditional probability", "先验", "似然", "后验", "证据", "条件概率"],
    required_teaching_steps: ["start from prior", "weigh evidence", "update posterior", "make decision"],
    common_misconceptions: ["new evidence erases the prior", "posterior is just the same as likelihood"],
    forbidden_framings: ["memorize formula only", "只背公式"],
    suitable_patterns: ["probability", "parameter_explore", "knowledge_check"],
    unsuitable_patterns: ["system_builder"],
    canonical_examples: ["medical test", "spam filtering", "weather forecast"],
  },
  {
    id: "history-industrial-revolution",
    structure_type: "historical_change",
    hints: ["industrial revolution", "agricultural revolution", "urbanization", "工业革命", "农业革命", "城市化"],
    required_core_terms: ["steam engine", "factory system", "urbanization", "machine", "energy", "蒸汽机", "工厂制度", "城市化", "机器", "能源"],
    required_teaching_steps: ["initial condition", "trigger", "driver separation", "turning point", "long-term consequence"],
    common_misconceptions: ["one invention alone caused the whole change", "history is just a date list"],
    forbidden_framings: ["pure date memorization", "只背年份"],
    suitable_patterns: ["process_timeline", "classification_sort", "narrative_branch"],
    unsuitable_patterns: ["probability"],
    canonical_examples: ["steam power changes factory rhythm", "rural workers move to cities"],
  },
  {
    id: "comparison-inflation-deflation",
    structure_type: "comparison_frame",
    hints: ["inflation deflation", "inflation vs deflation", "tcp udp", "stocks options", "通胀", "通缩", "股票", "期权"],
    required_core_terms: ["shared problem", "dimension", "tradeoff", "boundary case", "共同问题", "维度", "权衡", "边界情况"],
    required_teaching_steps: ["define shared problem", "compare stable dimensions", "test boundary case"],
    common_misconceptions: ["two terms are compared only by definition", "one side is always better"],
    forbidden_framings: ["always choose A", "always choose B", "A 一定更好", "B 一定更好"],
    suitable_patterns: ["comparison", "classification_sort", "knowledge_check"],
    unsuitable_patterns: ["probability"],
    canonical_examples: ["inflation vs deflation", "TCP vs UDP", "stocks vs options"],
  },
  {
    id: "classification-rule-boundaries",
    structure_type: "classification_rule",
    hints: ["classification", "taxonomy", "waste sorting", "legal liability", "分类", "归类", "垃圾分类", "责任类型"],
    required_core_terms: ["rule", "category", "boundary case", "anchor example", "规则", "类别", "边界样本", "典型样本"],
    required_teaching_steps: ["define categories by rule", "sort examples", "test boundary cases", "remember anchors"],
    common_misconceptions: ["category names are enough without rules", "borderline examples can be guessed by feeling"],
    forbidden_framings: ["guess by name only", "只看名称"],
    suitable_patterns: ["classification_sort", "knowledge_check", "concept_memory"],
    unsuitable_patterns: ["probability"],
    canonical_examples: ["trash sorting", "legal liability", "email classification"],
  },
  {
    id: "causal-compound-interest",
    structure_type: "causal_mechanism",
    hints: ["compound interest", "supply demand", "network effect", "incentive mechanism", "复利", "供需", "网络效应", "激励机制"],
    required_core_terms: ["input", "mechanism", "feedback", "outcome", "intervention", "输入", "机制", "反馈", "结果", "干预点"],
    required_teaching_steps: ["identify input", "connect mechanism", "change one factor", "observe feedback/outcome"],
    common_misconceptions: ["correlation is enough to prove causation", "one factor explains everything"],
    forbidden_framings: ["single cause only", "唯一原因"],
    suitable_patterns: ["system_builder", "parameter_explore", "simulation_play"],
    unsuitable_patterns: ["concept_memory"],
    canonical_examples: ["interest compounds over time", "price changes demand", "network value increases with users"],
  },
  {
    id: "procedure-binary-search",
    structure_type: "procedure_algorithm",
    hints: ["binary search", "gradient descent", "dijkstra", "merge sort", "breadth first search", "二分查找", "梯度下降", "归并排序", "广度优先搜索"],
    required_core_terms: ["state", "iteration", "rule", "termination", "edge case", "状态", "迭代", "规则", "终止条件", "边界情况"],
    required_teaching_steps: ["state problem and rule", "step through process", "track state", "test edge case"],
    common_misconceptions: ["algorithm is only code syntax", "edge cases do not matter"],
    forbidden_framings: ["just memorize code", "只背代码"],
    suitable_patterns: ["process_timeline", "simulation_play", "knowledge_check"],
    unsuitable_patterns: ["probability"],
    canonical_examples: ["find target in sorted list", "update gradient step", "merge two sorted lists"],
  },
];

function norm(value: string) {
  return value.toLowerCase().replace(/[\s\-_，。、：“”‘’：:；;,.!?()[\]{}<>]+/g, "");
}

function containsAny(text: string, hints: string[]) {
  const normalized = norm(text);
  return hints.some((hint) => normalized.includes(norm(hint)));
}

export function selectKnowledgeSkeleton(topic: string, structureType?: KnowledgeStructureType) {
  return KNOWLEDGE_SKILL_PACKS.find((pack) => {
    if (structureType && structureType !== "unclassified" && pack.structure_type !== structureType) return false;
    return containsAny(topic, pack.hints);
  });
}

export function topicSkeletonTerms(topic: string) {
  const terms: string[] = [];
  for (const pack of KNOWLEDGE_SKILL_PACKS) {
    if (containsAny(topic, pack.hints)) terms.push(...pack.required_core_terms);
  }
  return Array.from(new Set(terms));
}

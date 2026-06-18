import { validateSchema } from "../llm/schema-validator.ts";
import { selectKnowledgeSkeleton, topicSkeletonTerms } from "./skill-packs.ts";
import type { FlowPatternPreference } from "./flow-pattern-options.ts";
import type { KnowledgeFlow } from "./mock-flows.ts";
import type { PatternType } from "../../types/schema.ts";

export type KnowledgeStructureType =
  | "optimization_model"
  | "system_process"
  | "probabilistic_reasoning"
  | "historical_change"
  | "comparison_frame"
  | "classification_rule"
  | "causal_mechanism"
  | "procedure_algorithm"
  | "unclassified";

export type KnowledgeStructurePreference = Exclude<KnowledgeStructureType, "unclassified"> | "auto";

export type BlueprintUserAction = "choose" | "sort" | "connect" | "adjust" | "simulate" | "compare" | "recall";

export interface BlueprintStep {
  goal: string;
  must_explain: string[];
  user_action: BlueprintUserAction;
  recommended_pattern: PatternType;
  success_criteria: string;
}

export interface KnowledgeBlueprint {
  topic: string;
  structure_type: KnowledgeStructureType;
  learning_objective: string;
  prerequisite_terms: string[];
  core_terms: string[];
  misconceptions: string[];
  teaching_sequence: BlueprintStep[];
  pattern_strategy: PatternType[];
  avoid_patterns: PatternType[];
  failure_risks: string[];
  confidence: number;
  skill_skeleton_id?: string;
  required_core_terms?: string[];
  required_teaching_steps?: string[];
  forbidden_framings?: string[];
}

export interface QualityGateResult {
  ok: boolean;
  score: number;
  failures: string[];
  warnings: string[];
  covered_terms: string[];
  reason?: string;
}

export interface FlowFailureState {
  code: "quality_gate_failed" | "unclassified" | "generation_unavailable";
  title: string;
  message: string;
  retryable: boolean;
  actions: Array<"retry" | "change_topic" | "choose_structure" | "try_showcase">;
  curated_flow_ids: string[];
  quality_gate?: QualityGateResult;
}

export interface BlueprintPlanInput {
  topic: string;
  domain?: string;
  core_question?: string;
  grounding_terms?: string[];
  knowledge_structure?: string;
  recommended_patterns?: PatternType[];
  avoid_patterns?: PatternType[];
  learning_path?: string[];
}

const ALIASES: Record<string, KnowledgeStructureType> = {
  optimization_model: "optimization_model",
  optimizationmodel: "optimization_model",
  deterministic_model: "optimization_model",
  optimization: "optimization_model",
  planning_model: "optimization_model",
  system_process: "system_process",
  systemprocess: "system_process",
  process_system: "system_process",
  system_flow: "system_process",
  probabilistic_reasoning: "probabilistic_reasoning",
  probabilisticreasoning: "probabilistic_reasoning",
  probability_reasoning: "probabilistic_reasoning",
  probability: "probabilistic_reasoning",
  historical_change: "historical_change",
  historicalchange: "historical_change",
  timeline_change: "historical_change",
  history_change: "historical_change",
  comparison_frame: "comparison_frame",
  comparisonframe: "comparison_frame",
  comparison: "comparison_frame",
  classification_rule: "classification_rule",
  classificationrule: "classification_rule",
  classification: "classification_rule",
  causal_mechanism: "causal_mechanism",
  causalmechanism: "causal_mechanism",
  concept_mechanism: "causal_mechanism",
  mechanism: "causal_mechanism",
  simulation_model: "causal_mechanism",
  procedure_algorithm: "procedure_algorithm",
  procedurealgorithm: "procedure_algorithm",
  algorithm: "procedure_algorithm",
  unclassified: "unclassified",
};

const HINTS: Record<KnowledgeStructureType, string[]> = {
  optimization_model: ["linear programming", "integer programming", "optimization", "constraint", "objective function", "feasible region", "simplex", "resource allocation", "production planning", "portfolio optimization", "transportation problem", "\u7ebf\u6027\u89c4\u5212", "\u6574\u6570\u89c4\u5212", "\u6700\u4f18\u5316", "\u4f18\u5316", "\u76ee\u6807\u51fd\u6570", "\u7ea6\u675f", "\u53ef\u884c\u57df", "\u6700\u4f18\u89e3", "\u5355\u7eaf\u5f62", "\u8d44\u6e90\u5206\u914d", "diet problem", "assignment problem", "knapsack problem", "project scheduling"],
  system_process: ["dns", "http request", "kubernetes", "operator", "agent", "compiler", "oauth", "message queue", "workflow", "\u89e3\u6790", "\u8c03\u5ea6", "\u7f16\u8bd1\u5668", "\u6d41\u7a0b", "\u7cfb\u7edf", "http request", "tcp handshake", "ci/cd", "pipeline", "payment checkout", "database replication"],
  probabilistic_reasoning: ["bayes", "probability", "distribution", "expected value", "risk", "sampling", "monte carlo", "a/b testing", "ab testing", "\u8d1d\u53f6\u65af", "\u6982\u7387", "\u671f\u671b\u503c", "\u5206\u5e03", "\u98ce\u9669", "\u62bd\u6837", "hypothesis testing", "confidence interval", "markov chain", "risk assessment", "random sampling"],
  historical_change: ["industrial revolution", "cold war", "urbanization", "history", "revolution", "\u5de5\u4e1a\u9769\u547d", "\u519c\u4e1a\u9769\u547d", "\u51b7\u6218", "\u57ce\u5e02\u5316", "\u53d8\u8fc1", "\u5386\u53f2", "renaissance", "meiji restoration", "internet evolution", "electrification", "reform and opening-up"],
  comparison_frame: [" vs ", " versus ", "difference", "compare", "tcp udp", "inflation deflation", "\u533a\u522b", "\u5bf9\u6bd4", "\u76f8\u6bd4", "\u901a\u80c0", "\u901a\u7f29", "\u80a1\u7968", "\u671f\u6743", "sql nosql", "supervised unsupervised", "cpu gpu", "renewable fossil", "renting buying"],
  classification_rule: ["classification", "taxonomy", "category", "legal liability", "biological taxonomy", "email sorting", "sort", "\u5206\u7c7b", "\u5783\u573e\u5206\u7c7b", "\u7c7b\u578b", "\u5f52\u7c7b", "bloom taxonomy", "rock types", "design pattern types", "http status", "customer segmentation"],
  causal_mechanism: ["compound interest", "network effect", "supply demand", "supply and demand", "incentive", "dopamine", "\u590d\u5229", "\u4f9b\u9700", "\u56e0\u679c", "\u673a\u5236", "\u7f51\u7edc\u6548\u5e94", "\u6fc0\u52b1", "inflation spiral", "greenhouse effect", "habit formation", "viral spread", "price elasticity"],
  procedure_algorithm: ["binary search", "gradient descent", "a star", "astar", "dijkstra", "merge sort", "breadth first search", "sorting algorithm", "algorithm", "\u4e8c\u5206\u67e5\u627e", "\u68af\u5ea6\u4e0b\u964d", "\u5355\u7eaf\u5f62\u6cd5", "\u6392\u5e8f\u7b97\u6cd5", "\u7b97\u6cd5", "a* search", "quicksort", "dynamic programming", "topological sort", "backpropagation"],
  unclassified: [],
};

const STRUCTURE_PRIORITY: Exclude<KnowledgeStructureType, "unclassified">[] = [
  "optimization_model",
  "system_process",
  "probabilistic_reasoning",
  "historical_change",
  "comparison_frame",
  "procedure_algorithm",
  "classification_rule",
  "causal_mechanism",
];
const STRATEGY: Record<KnowledgeStructureType, PatternType[]> = {
  optimization_model: ["system_builder", "parameter_explore", "simulation_play"],
  system_process: ["system_builder", "process_timeline", "knowledge_check"],
  probabilistic_reasoning: ["probability", "parameter_explore", "knowledge_check"],
  historical_change: ["process_timeline", "classification_sort", "narrative_branch"],
  comparison_frame: ["comparison", "classification_sort", "knowledge_check"],
  classification_rule: ["classification_sort", "knowledge_check", "concept_memory"],
  causal_mechanism: ["system_builder", "parameter_explore", "simulation_play"],
  procedure_algorithm: ["process_timeline", "simulation_play", "knowledge_check"],
  unclassified: ["knowledge_check", "concept_memory", "comparison"],
};

const DEFAULT_STEPS: Record<Exclude<KnowledgeStructureType, "unclassified">, Array<[string, string[], BlueprintUserAction, PatternType, string]>> = {
  optimization_model: [
    ["define decision variables", ["decision variables", "决策变量", "变量", "x", "y"], "connect", "system_builder", "user can identify what is being chosen"],
    ["connect objective and constraints", ["objective function", "constraints", "feasible region", "目标函数", "约束", "约束条件", "可行域"], "adjust", "parameter_explore", "user sees constraints change the feasible region"],
    ["search for optimum", ["optimum", "tradeoff", "最优解", "最优", "权衡", "顶点"], "simulate", "simulation_play", "user can explain why the best point is constrained"],
  ],
  system_process: [
    ["identify actors/modules", ["actors", "modules", "角色", "模块", "参与者", "服务器", "客户端"], "connect", "system_builder", "user can name the main parts"],
    ["follow information flow", ["request", "response", "handoff", "请求", "响应", "流转", "递归", "转交"], "recall", "process_timeline", "user can put handoffs in order"],
    ["test failure or boundary", ["failure path", "cache", "feedback", "失败路径", "缓存", "反馈", "边界"], "choose", "knowledge_check", "user can explain what breaks or speeds up"],
  ],
  probabilistic_reasoning: [
    ["start from uncertainty", ["prior", "uncertainty", "先验", "不确定", "概率"], "choose", "probability", "user can identify the prior state"],
    ["adjust evidence strength", ["evidence", "likelihood", "证据", "似然", "证据强度"], "adjust", "parameter_explore", "user sees evidence move the result"],
    ["make updated decision", ["posterior", "decision", "后验", "更新", "判断", "决策"], "choose", "knowledge_check", "user can explain the update"],
  ],
  historical_change: [
    ["see initial condition and trigger", ["initial condition", "trigger", "初始条件", "触发", "起点"], "recall", "process_timeline", "user can place the trigger"],
    ["separate drivers", ["driver", "accelerator", "驱动因素", "加速器", "推动"], "sort", "classification_sort", "user can sort causes from noise"],
    ["choose a turning path", ["turning point", "consequence", "转折点", "后果", "结果"], "choose", "narrative_branch", "user can explain a branch consequence"],
  ],
  comparison_frame: [
    ["define shared problem", ["shared problem", "共同问题", "同一问题", "共同目标"], "compare", "comparison", "user sees both sides answer the same problem"],
    ["compare stable dimensions", ["dimension", "tradeoff", "维度", "权衡", "差异"], "sort", "classification_sort", "user can classify examples by dimension"],
    ["test misconception", ["boundary case", "misconception", "边界情况", "误区", "反例"], "choose", "knowledge_check", "user avoids a false contrast"],
  ],
  classification_rule: [
    ["define categories by rule", ["rule", "category", "规则", "类别", "分类标准"], "sort", "classification_sort", "user sorts by rule"],
    ["test boundary cases", ["boundary", "confusing case", "边界", "易混", "特殊情况"], "choose", "knowledge_check", "user can explain a tricky case"],
    ["remember category anchors", ["anchor", "example", "锚点", "例子", "典型样本"], "recall", "concept_memory", "user remembers category anchors"],
  ],
  causal_mechanism: [
    ["identify input and mechanism", ["input", "mechanism", "输入", "机制", "原因"], "connect", "system_builder", "user connects cause to mechanism"],
    ["change one factor", ["factor", "effect", "因素", "影响", "变化"], "adjust", "parameter_explore", "user sees one factor move the result"],
    ["observe outcome", ["outcome", "feedback", "结果", "反馈", "输出"], "simulate", "simulation_play", "user explains the outcome"],
  ],
  procedure_algorithm: [
    ["state problem and rule", ["problem", "rule", "问题", "规则", "目标"], "recall", "process_timeline", "user can state the repeated rule"],
    ["step through process", ["iteration", "state", "迭代", "状态", "步骤"], "simulate", "simulation_play", "user can advance one step"],
    ["test edge case", ["edge case", "termination", "边界情况", "终止", "停止条件"], "choose", "knowledge_check", "user knows when the process stops"],
  ],
};

const CURATED_FLOW_IDS = ["bayes-starter", "dns-router", "industrial-revolution"];
const PLACEHOLDERS = [/\{\s*(result|output\d*|value|variable|term|concept)\s*\}/i, /similar concept/i, /key variable/i, /generic mechanism/i, /output1/i, /\u76f8\u8fd1\u6982\u5ff5/];

function norm(value: string) {
  return value.toLowerCase().replace(/[\s\-_，。、“”‘’：:；;,.!?()[\]{}<>]+/g, "");
}

function unique(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const text = String(value || "").trim();
    const key = norm(text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(text.slice(0, 32));
  }
  return result;
}

function containsAny(text: string, hints: string[]) {
  const normalized = norm(text);
  return hints.some((hint) => normalized.includes(norm(hint)));
}

export function normalizeKnowledgeStructure(value: unknown): KnowledgeStructureType {
  if (typeof value !== "string") return "unclassified";
  const raw = value.toLowerCase().trim();
  const snake = raw.replace(/[\s-]+/g, "_").replace(/[^a-z_]/g, "");
  if (ALIASES[snake]) return ALIASES[snake];
  const compact = raw.replace(/[^a-z]/g, "");
  if (ALIASES[compact]) return ALIASES[compact];
  const key = norm(value).replace(/[^a-z_]/g, "");
  return ALIASES[key] || "unclassified";
}

export function inferKnowledgeStructure(plan: BlueprintPlanInput): KnowledgeStructureType {
  const explicit = normalizeKnowledgeStructure(plan.knowledge_structure);
  const topicEvidence = [plan.topic].filter(Boolean).join(" ");
  for (const structure of STRUCTURE_PRIORITY) {
    if (containsAny(topicEvidence, HINTS[structure])) return structure;
  }
  if (explicit !== "unclassified") return explicit;
  const evidence = [plan.topic, plan.domain, plan.core_question, ...(plan.grounding_terms || []), ...(plan.learning_path || [])].filter(Boolean).join(" ");
  for (const structure of STRUCTURE_PRIORITY) {
    if (containsAny(evidence, HINTS[structure])) return structure;
  }
  return "unclassified";
}

function makeSteps(structure: Exclude<KnowledgeStructureType, "unclassified">): BlueprintStep[] {
  return DEFAULT_STEPS[structure].map(([goal, must_explain, user_action, recommended_pattern, success_criteria]) => ({ goal, must_explain, user_action, recommended_pattern, success_criteria }));
}

function protectBlueprintAvoidPatterns(structure: KnowledgeStructureType, patterns: PatternType[] = []) {
  if (structure === "unclassified") return patterns;
  const protectedPatterns = new Set(STRATEGY[structure]);
  return patterns.filter((pattern) => !protectedPatterns.has(pattern));
}

export function selectBlueprintPatternStrategy(blueprint: KnowledgeBlueprint, preferredPattern: FlowPatternPreference): PatternType[] {
  const blueprintAvoidPatterns = protectBlueprintAvoidPatterns(blueprint.structure_type, blueprint.avoid_patterns);
  const avoid = new Set(preferredPattern === "auto" ? blueprintAvoidPatterns : blueprintAvoidPatterns.filter((pattern) => pattern !== preferredPattern));
  const result: PatternType[] = [];
  for (const pattern of blueprint.pattern_strategy) {
    if (!avoid.has(pattern) && !result.includes(pattern)) result.push(pattern);
    if (result.length === 3) break;
  }
  while (result.length < 3) result.push("knowledge_check");
  if (preferredPattern !== "auto" && !result.includes(preferredPattern)) result[1] = preferredPattern;
  return result.slice(0, 3);
}

const TOPIC_CORE_TERM_SKELETONS: Array<{ hints: string[]; terms: string[] }> = [
  {
    hints: ["industrial revolution", "\u5de5\u4e1a\u9769\u547d"],
    terms: ["steam engine", "factory system", "urbanization", "machine", "energy", "\u84b8\u6c7d\u673a", "\u5de5\u5382\u5236\u5ea6", "\u57ce\u5e02\u5316", "\u673a\u5668", "\u80fd\u6e90"],
  },
  {
    hints: ["linear programming", "\u7ebf\u6027\u89c4\u5212"],
    terms: ["decision variable", "objective function", "constraint", "feasible region", "optimum", "\u51b3\u7b56\u53d8\u91cf", "\u76ee\u6807\u51fd\u6570", "\u7ea6\u675f\u6761\u4ef6", "\u53ef\u884c\u57df", "\u6700\u4f18\u89e3"],
  },
  {
    hints: ["bayes", "\u8d1d\u53f6\u65af"],
    terms: ["prior", "likelihood", "posterior", "evidence", "conditional probability", "\u5148\u9a8c", "\u4f3c\u7136", "\u540e\u9a8c", "\u8bc1\u636e", "\u6761\u4ef6\u6982\u7387"],
  },
  {
    hints: ["dns"],
    terms: ["browser", "recursive resolver", "root server", "authoritative server", "cache", "IP address", "\u6d4f\u89c8\u5668", "\u9012\u5f52\u89e3\u6790\u5668", "\u6839\u670d\u52a1\u5668", "\u6743\u5a01\u670d\u52a1\u5668", "\u7f13\u5b58", "IP \u5730\u5740"],
  },
];

function topicCoreTerms(topic: string) {
  const result: string[] = [...topicSkeletonTerms(topic)];
  for (const item of TOPIC_CORE_TERM_SKELETONS) {
    if (containsAny(topic, item.hints)) result.push(...item.terms);
  }
  return unique(result);
}

export function buildKnowledgeBlueprint(
  plan: BlueprintPlanInput,
  preferredPattern: FlowPatternPreference = "auto",
  preferredStructure: KnowledgeStructurePreference = "auto",
): KnowledgeBlueprint {
  const structure = preferredStructure === "auto" ? inferKnowledgeStructure(plan) : preferredStructure;
  const skeleton = selectKnowledgeSkeleton(plan.topic, structure);
  const grounding = unique(plan.grounding_terms || []);
  if (structure === "unclassified") {
    return {
      topic: plan.topic,
      structure_type: "unclassified",
      learning_objective: plan.core_question || `Find a reliable teaching structure for ${plan.topic}`,
      prerequisite_terms: [],
      core_terms: grounding.slice(0, 5),
      misconceptions: [],
      teaching_sequence: [],
      pattern_strategy: STRATEGY.unclassified,
      avoid_patterns: plan.avoid_patterns || [],
      failure_risks: ["No stable teaching structure matched this concept"],
      confidence: 0.2,
    };
  }
  const steps = makeSteps(structure);
  const coreTerms = unique([...(skeleton?.required_core_terms || []), ...topicCoreTerms(plan.topic), ...grounding, ...steps.flatMap((step) => step.must_explain)]).slice(0, 14);
  const avoidPatterns = protectBlueprintAvoidPatterns(structure, Array.from(new Set([...(plan.avoid_patterns || []), ...(skeleton?.unsuitable_patterns || [])])));
  const draft: KnowledgeBlueprint = {
    topic: plan.topic,
    structure_type: structure,
    learning_objective: plan.core_question || `Understand ${plan.topic}`,
    prerequisite_terms: [],
    core_terms: coreTerms,
    misconceptions: skeleton?.common_misconceptions || [],
    teaching_sequence: steps,
    pattern_strategy: STRATEGY[structure],
    avoid_patterns: avoidPatterns,
    failure_risks: skeleton?.forbidden_framings || [],
    confidence: Math.min(0.96, 0.72 + Math.min(grounding.length, 5) * 0.04 + (plan.recommended_patterns?.length ? 0.04 : 0) + (skeleton ? 0.04 : 0)),
    skill_skeleton_id: skeleton?.id,
    required_core_terms: skeleton?.required_core_terms,
    required_teaching_steps: skeleton?.required_teaching_steps,
    forbidden_framings: skeleton?.forbidden_framings,
  };
  return { ...draft, pattern_strategy: selectBlueprintPatternStrategy(draft, preferredPattern) };
}

function termHits(text: string, terms: string[]) {
  const normalized = norm(text);
  return terms.filter((term) => {
    const key = norm(term);
    return key.length > 0 && normalized.includes(key);
  });
}

function flowPlayText(play: KnowledgeFlow["plays"][number]) {
  return JSON.stringify({
    title: play.title,
    concept: play.concept,
    reward_copy: play.reward_copy,
    schema: play.schema,
  });
}

function visibleFlowText(flow: KnowledgeFlow) {
  return JSON.stringify({
    title: flow.title,
    concept: flow.concept,
    hook: flow.hook,
    description: flow.description,
    summary: flow.summary,
    concepts: flow.concepts,
    plays: flow.plays.map((play) => ({
      title: play.title,
      concept: play.concept,
      reward_copy: play.reward_copy,
      schema: play.schema,
    })),
  });
}
function expectedBlueprintPattern(blueprint: KnowledgeBlueprint, preferredPattern: FlowPatternPreference, index: number) {
  return selectBlueprintPatternStrategy(blueprint, preferredPattern)[index] || blueprint.teaching_sequence[index]?.recommended_pattern;
}

export function evaluateFlowAgainstBlueprint(flow: KnowledgeFlow, blueprint: KnowledgeBlueprint, preferredPattern: FlowPatternPreference = "auto"): QualityGateResult {
  const failures: string[] = [];
  const warnings: string[] = [];
  const text = visibleFlowText(flow);
  const patterns = flow.plays.map((play) => play.schema.pattern).filter((pattern): pattern is PatternType => typeof pattern === "string");
  const allowed = new Set(selectBlueprintPatternStrategy(blueprint, preferredPattern));
  const blueprintAvoidPatterns = protectBlueprintAvoidPatterns(blueprint.structure_type, blueprint.avoid_patterns);
  const avoid = new Set(preferredPattern === "auto" ? blueprintAvoidPatterns : blueprintAvoidPatterns.filter((pattern) => pattern !== preferredPattern));
  const coveredTerms = termHits(text, blueprint.core_terms);
  const requiredCoreTerms = blueprint.required_core_terms || [];
  const requiredCoreHits = termHits(text, requiredCoreTerms);
  const forbiddenFrameHits = termHits(text, blueprint.forbidden_framings || []);
  const disallowed = patterns.filter((pattern) => !allowed.has(pattern));
  const avoided = patterns.filter((pattern) => avoid.has(pattern));
  const placeholderHits = PLACEHOLDERS.filter((pattern) => pattern.test(text));
  const expectedSteps = blueprint.teaching_sequence.slice(0, Math.min(3, blueprint.teaching_sequence.length));
  const schemaFailures: string[] = [];
  const stepFailures: string[] = [];

  if (blueprint.structure_type === "unclassified") failures.push("KnowledgeBlueprint is unclassified");
  if (flow.plays.length < Math.max(3, Math.min(blueprint.teaching_sequence.length, 3))) failures.push(`Flow has ${flow.plays.length} steps, below Blueprint minimum`);
  if (blueprint.core_terms.length >= 3 && coveredTerms.length < Math.min(3, blueprint.core_terms.length)) failures.push(`Flow covers ${coveredTerms.length}/${Math.min(3, blueprint.core_terms.length)} required core terms`);
  if (requiredCoreTerms.length >= 3 && requiredCoreHits.length < Math.min(3, requiredCoreTerms.length)) failures.push(`Flow covers ${requiredCoreHits.length}/${Math.min(3, requiredCoreTerms.length)} Skill Pack required terms`);
  if (forbiddenFrameHits.length) failures.push(`Flow hits forbidden Skill Pack framings: ${forbiddenFrameHits.join(", ")}`);
  if (disallowed.length) failures.push(`Flow uses patterns outside Blueprint strategy: ${disallowed.join(" -> ")}`);
  if (avoided.length) failures.push(`Flow uses avoided patterns: ${avoided.join(" -> ")}`);
  if (preferredPattern !== "auto" && !patterns.includes(preferredPattern)) failures.push(`Flow misses user-selected pattern: ${preferredPattern}`);

  flow.plays.forEach((play, index) => {
    if (!validateSchema(play.schema)) schemaFailures.push(`Step ${index + 1} schema failed validation`);
  });

  expectedSteps.forEach((step, index) => {
    const play = flow.plays[index];
    if (!play) {
      stepFailures.push(`Step ${index + 1} missing for Blueprint goal: ${step.goal}`);
      return;
    }
    const expectedPattern = expectedBlueprintPattern(blueprint, preferredPattern, index);
    if (expectedPattern && play.schema.pattern !== expectedPattern) {
      stepFailures.push(`Step ${index + 1} pattern ${play.schema.pattern} != Blueprint pattern ${expectedPattern}`);
    }
    const trace = play.teaching_trace;
    if (!trace) {
      stepFailures.push(`Step ${index + 1} missing teaching_trace for Blueprint goal "${step.goal}"`);
    } else {
      if (trace.blueprint_step_goal !== step.goal) {
        stepFailures.push(`Step ${index + 1} trace goal "${trace.blueprint_step_goal}" != Blueprint goal "${step.goal}"`);
      }
      if (trace.intended_user_action !== step.user_action) {
        stepFailures.push(`Step ${index + 1} trace action "${trace.intended_user_action}" != Blueprint action "${step.user_action}"`);
      }
      const traceHits = termHits(JSON.stringify(trace.covered_terms), step.must_explain);
      if (trace.covered_terms.length === 0 || traceHits.length === 0) {
        stepFailures.push(`Step ${index + 1} trace does not cover Blueprint terms for goal "${step.goal}"`);
      }
    }
    const visibleTerms = unique([...step.must_explain, ...blueprint.core_terms]);
    const stepHits = termHits(flowPlayText(play), visibleTerms);
    if (visibleTerms.length > 0 && stepHits.length === 0) {
      stepFailures.push(`Step ${index + 1} does not cover visible Blueprint or core terms for goal "${step.goal}": ${visibleTerms.slice(0, 5).join(", ")}`);
    }
  });

  failures.push(...schemaFailures, ...stepFailures);
  if (placeholderHits.length) failures.push("Flow contains generic placeholders or unreplaced variables");

  if (expectedSteps.length < 3 && blueprint.structure_type !== "unclassified") warnings.push("Blueprint has fewer than 3 teaching steps");

  const checks = [
    flow.plays.length >= 3,
    coveredTerms.length >= Math.min(3, Math.max(1, blueprint.core_terms.length)),
    disallowed.length === 0,
    avoided.length === 0,
    placeholderHits.length === 0,
    forbiddenFrameHits.length === 0,
    requiredCoreTerms.length < 3 || requiredCoreHits.length >= Math.min(3, requiredCoreTerms.length),
    schemaFailures.length === 0,
    stepFailures.length === 0,
    blueprint.structure_type !== "unclassified",
  ];
  return {
    ok: failures.length === 0,
    score: Number((checks.filter(Boolean).length / checks.length).toFixed(3)),
    failures,
    warnings,
    covered_terms: coveredTerms,
    reason: failures.join("; ") || warnings.join("; ") || undefined,
  };
}

export function makeFlowFailure(code: FlowFailureState["code"], topic: string, qualityGate?: QualityGateResult): FlowFailureState {
  if (code === "generation_unavailable") {
    return {
      code,
      title: "\u73b0\u5728\u8fd8\u4e0d\u80fd\u73b0\u573a\u751f\u6210",
      message: `\u6211\u6682\u65f6\u8fde\u4e0d\u4e0a\u751f\u6210\u5f15\u64ce\uff0c\u4e0d\u80fd\u53ef\u9760\u5730\u4e3a ${topic} \u73b0\u62c6\u4e09\u5173\u3002\u53ef\u4ee5\u7a0d\u540e\u518d\u8bd5\uff0c\u6216\u5148\u4ece\u4e0b\u9762\u8fd9\u4e9b\u7a33\u5b9a\u8d77\u70b9\u5f00\u59cb\u3002`,
      retryable: true,
      actions: ["retry", "change_topic", "try_showcase"],
      curated_flow_ids: CURATED_FLOW_IDS,
      quality_gate: qualityGate,
    };
  }

  return code === "unclassified"
    ? {
      code,
      title: "\u8fd9\u4e2a\u6982\u5ff5\u9700\u8981\u6362\u4e2a\u89d2\u5ea6",
      message: `\u6211\u8fd8\u6ca1\u627e\u5230 ${topic} \u7684\u7a33\u5b9a\u62c6\u89e3\u65b9\u5f0f\u3002\u53ef\u4ee5\u6362\u4e00\u4e2a\u66f4\u5177\u4f53\u7684\u95ee\u9898\uff0c\u6216\u8005\u5148\u4ece\u4e0b\u9762\u8fd9\u4e9b\u7a33\u5b9a\u8d77\u70b9\u5f00\u59cb\u3002`,
      retryable: true,
      actions: ["choose_structure", "change_topic", "try_showcase"],
      curated_flow_ids: CURATED_FLOW_IDS,
      quality_gate: qualityGate,
    }
    : {
      code,
      title: "\u8fd9\u6761\u8def\u5f84\u8fd8\u6ca1\u6559\u6e05\u695a",
      message: `\u6211\u5df2\u7ecf\u8bd5\u7740\u628a ${topic} \u62c6\u6210\u4e92\u52a8\u8def\u5f84\uff0c\u4f46\u8fd9\u6b21\u8986\u76d6\u7684\u5173\u952e\u70b9\u8fd8\u4e0d\u591f\u7a33\u3002\u53ef\u4ee5\u6362\u4e00\u79cd\u62c6\u6cd5\uff0c\u6216\u8005\u6362\u4e2a\u66f4\u5177\u4f53\u7684\u6982\u5ff5\u3002`,
      retryable: true,
      actions: ["retry", "choose_structure", "change_topic", "try_showcase"],
      curated_flow_ids: CURATED_FLOW_IDS,
      quality_gate: qualityGate,
    };
}

import { generateText } from "ai";
import { getLLMProvider } from "../llm/provider.ts";
import { PATTERN_LABELS, type FlowPatternPreference } from "./flow-pattern-options.ts";
import { validateSchema } from "../llm/schema-validator.ts";
import {
  type FollowUpTopic,
  type KnowledgeFlow,
  type KnowledgePlay,
  type TopicCategory,
  type TopicDifficulty,
} from "./mock-flows.ts";
import { SCHEMA_CATALOG, type PatternType, type TemplateId, type UISchema } from "../../types/schema.ts";

export interface DynamicFlowInput {
  topic: string;
  preferredPattern?: FlowPatternPreference;
}

export interface ConceptPlan {
  topic: string;
  domain: string;
  core_question: string;
  grounding_terms: string[];
  knowledge_structure: string;
  recommended_patterns: PatternType[];
  avoid_patterns: PatternType[];
  learning_path: string[];
  category: TopicCategory;
  topic_area: string;
  difficulty: TopicDifficulty;
}

export interface DynamicFlowGenerationResult {
  flow: KnowledgeFlow;
  source: "llm" | "mock";
  validation_error?: string;
  raw_output?: string;
  raw_plan_output?: string;
  concept_plan?: ConceptPlan;
}

const VISUAL_TAGS: Record<PatternType, string> = {
  probability: "check-spark",
  parameter_explore: "parameter-knob",
  concept_memory: "memory-terms",
  process_timeline: "timeline-path",
  comparison: "compare-lens",
  knowledge_check: "check-spark",
  system_builder: "system-blocks",
  narrative_branch: "branch-choice",
  classification_sort: "classification-buckets",
  simulation_play: "simulation-loop",
};

const CATEGORIES: TopicCategory[] = ["科技", "经济", "哲学", "心理", "历史", "数理"];
const DIFFICULTIES: TopicDifficulty[] = ["轻松", "进阶", "烧脑一点"];

function cleanText(value: unknown, fallback: string, maxLength = 80) {
  if (typeof value !== "string") return fallback;
  const text = value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, maxLength) : fallback;
}

function cleanTopic(topic: string) {
  return cleanText(topic, "这个概念", 40);
}

function coerceCategory(value: unknown, fallback: TopicCategory = "数理"): TopicCategory {
  return CATEGORIES.includes(value as TopicCategory) ? (value as TopicCategory) : fallback;
}

function coerceDifficulty(value: unknown, fallback: TopicDifficulty = "轻松"): TopicDifficulty {
  return DIFFICULTIES.includes(value as TopicDifficulty) ? (value as TopicDifficulty) : fallback;
}

function isPattern(value: unknown): value is PatternType {
  return typeof value === "string" && value in SCHEMA_CATALOG;
}

function normalizePreference(value: unknown): FlowPatternPreference {
  return value === "auto" || isPattern(value) ? value : "auto";
}

function makeDynamicId(topic: string) {
  let hash = 0;
  for (const char of topic) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return `custom-${Date.now().toString(36)}-${hash.toString(36).slice(0, 6)}`;
}

function pickAnchor(groundingTerms: string[], index: number, fallback: string) {
  return cleanText(groundingTerms[index], fallback, 18);
}

function baseSchema(pattern: PatternType, topic: string, groundingTerms: string[] = []): UISchema {
  const title = `把${topic}玩明白`;
  const anchorA = pickAnchor(groundingTerms, 0, `${topic}入口`);
  const anchorB = pickAnchor(groundingTerms, 1, `${topic}动力`);
  const anchorC = pickAnchor(groundingTerms, 2, `${topic}边界`);
  const common = {
    version: "2.0",
    depth: "rapid" as const,
    visual_asset: { tag: VISUAL_TAGS[pattern], mood: "idle" as const },
    next_concepts: [],
  };

  if (isOptimizationTeachingTopic(topic, groundingTerms)) {
    const optimizationSchema = baseOptimizationSchema(pattern, topic, common);
    if (optimizationSchema) return optimizationSchema;
  }

  if (pattern === "probability") {
    return {
      ...common,
      pattern,
      template: "card_flip_reveal",
      payload: {
        title,
        pool: [
          { name: anchorA, rarity: "5", probability: 20, value: 90 },
          { name: anchorB, rarity: "4", probability: 50, value: 55 },
          { name: anchorC, rarity: "3", probability: 30, value: 20 },
        ],
        option_cost: 10,
        strike_price: 60,
        pulls_per_try: 1,
        explanation_map: {
          win: `你抓住了${topic}里最值得保留的选择。`,
          lose: `这次选择还没碰到${topic}的关键条件。`,
        },
      },
    };
  }

  if (pattern === "parameter_explore") {
    return {
      ...common,
      pattern,
      template: "single_slider",
      payload: {
        title,
        variable_label: anchorA,
        min: 0,
        max: 100,
        default_value: 50,
        unit: "%",
        explanation_template: `拖动变量时，观察${topic}的结果如何跟着变化。`,
        scenarios: [
          { label: "低", value: 20 },
          { label: "中", value: 50 },
          { label: "高", value: 85 },
        ],
        outputs: [
          { label: "结果变化", model: "linear", min: 0, max: 100, default: 50 },
          { label: "影响幅度", model: "logarithmic", min: 0, max: 40, default: 12 },
        ],
        insight_rules: [
          { when: "low", text: "变量较低时，结果变化还不明显。" },
          { when: "mid", text: "变量进入中段后，机制开始显形。" },
          { when: "high", text: "变量较高时，结果会明显偏向它推动的方向。" },
        ],
      },
    };
  }

  if (pattern === "concept_memory") {
    return {
      ...common,
      pattern,
      template: "term_cards",
      payload: {
        title,
        cards: [
          { front: anchorA, back: `先看${anchorA}怎样让${topic}进入具体场景。` },
          { front: anchorB, back: `${anchorB}通常决定${topic}会朝哪个方向发展。` },
          { front: anchorC, back: `理解${anchorC}，才知道${topic}什么时候不适用。` },
        ],
      },
    };
  }

  if (pattern === "process_timeline") {
    return {
      ...common,
      pattern,
      template: "horizontal_timeline",
      payload: {
        title,
        events: [
          { label: "起点", description: `${topic}先从一个初始条件出现。` },
          { label: "触发", description: "关键因素开始推动变化。" },
          { label: "放大", description: "影响被更多条件继续放大。" },
          { label: "结果", description: "最后形成可观察的结果或判断。" },
        ],
      },
    };
  }

  if (pattern === "comparison") {
    return {
      ...common,
      pattern,
      template: "split_panel",
      payload: {
        title,
        subject_a: "只看名称",
        subject_b: "看见动作",
        left: { label: "只看名称", content: `只记住${topic}叫什么，容易停在解释层。` },
        right: { label: "看见动作", content: `把${anchorA}、${anchorB}和${anchorC}连起来，才知道它怎么起作用。` },
        dimensions: [
          { label: "关注点", a: "名词解释", b: "动作和机制", insight: "先看它做了什么，再记它叫什么。" },
          { label: "使用方式", a: "背答案", b: "解释新情境", insight: "能迁移到新情境才算真的懂。" },
          { label: "误区", a: "以为定义就是全部", b: "知道定义只是入口", insight: "概念的价值在于帮助判断。" },
        ],
        summary: `${topic}要从定义走向机制。`,
      },
    };
  }

  if (pattern === "knowledge_check") {
    return {
      ...common,
      pattern,
      template: "single_question",
      payload: {
        title,
        question: `理解${topic}时，最应该先抓住什么？`,
        options: [
          { label: `先抓住${anchorA}`, correct: true, explanation: `${anchorA}能把${topic}从名词变成可判断的线索。` },
          { label: "只背它叫什么", correct: false, explanation: "名字只是入口，不足以解释它怎样起作用。" },
          { label: "堆更多术语", correct: false, explanation: "术语变多不代表理解更准，关键是能把线索连起来。" },
        ],
      },
    };
  }

  if (pattern === "system_builder") {
    return {
      ...common,
      pattern,
      template: "module_sandbox",
      payload: {
        title,
        target: `拼出${topic}的核心结构`,
        modules: [
          { id: "goal", label: "目标", description: "先明确这套结构要解决的问题。", role: "start" },
          { id: "input", label: "输入", description: "进入系统的条件、材料或信号。", role: "input" },
          { id: "mechanism", label: "机制", description: "真正推动变化的核心环节。", role: "core" },
          { id: "feedback", label: "反馈", description: "让系统修正或继续运转的回路。", role: "loop" },
          { id: "output", label: "结果", description: "最后能被观察到的变化。", role: "result" },
          { id: "noise", label: "表象", description: "看起来相关，但不是当前目标必需模块。", role: "distractor" },
        ],
        required_module_ids: ["goal", "input", "mechanism", "feedback", "output"],
        expected_sequence: ["goal", "input", "mechanism", "feedback", "output"],
        connections: [
          { from: "goal", to: "input", label: "先确定入口" },
          { from: "input", to: "mechanism", label: "条件进入机制" },
          { from: "mechanism", to: "feedback", label: "变化产生反馈" },
          { from: "feedback", to: "output", label: "反馈沉淀结果" },
        ],
        success_summary: `你把${topic}拆成了条件、机制和结果。`,
      },
    };
  }

  if (pattern === "narrative_branch") {
    return {
      ...common,
      pattern,
      template: "branch_story",
      payload: {
        title,
        opening: `你正在用${topic}做一个判断，先选一种走法。`,
        branches: [
          { choice_label: "只看表面", outcome_description: "你得到一个很快但容易误判的答案。", insight: "表面线索常常不够。" },
          { choice_label: "看机制", outcome_description: "你开始找到结果背后的推动因素。", insight: "机制能帮你迁移。" },
          { choice_label: "看边界", outcome_description: "你知道这个概念什么时候不适用。", insight: "边界让理解更可靠。" },
        ],
      },
    };
  }

  if (pattern === "classification_sort") {
    return {
      ...common,
      pattern,
      template: "category_buckets",
      payload: {
        title,
        categories: [
          { id: "core", name: "核心机制" },
          { id: "noise", name: "表面噪音" },
        ],
        items: [
          { label: "推动变化的条件", correct_category: "core", explanation: "它决定概念怎么起作用。" },
          { label: "只像关键词的描述", correct_category: "noise", explanation: "它可能有帮助，但不是核心。" },
          { label: "适用边界", correct_category: "core", explanation: "知道边界才能正确使用概念。" },
        ],
      },
    };
  }

  return {
    ...common,
    pattern,
    template: "parameter_simulation",
    payload: {
      title,
      params: [
        { label: "条件强度", min: 0, max: 100, default: 50, unit: "%" },
        { label: "反馈速度", min: 0, max: 100, default: 40, unit: "%" },
      ],
      compute_formula_description: `观察${topic}在不同条件下如何一步步演化。`,
      steps: 5,
    },
  };
}

function isOptimizationTeachingTopic(topic: string, groundingTerms: string[]) {
  const evidence = [topic, ...groundingTerms].join(" ");
  const anchors = ["目标函数", "约束条件", "可行域", "最优解", "资源分配"];
  return hasAnyHint(evidence, DETERMINISTIC_MODELING_HINTS) || groundingTerms.some((term) => anchors.some((anchor) => term.includes(anchor)));
}

function baseOptimizationSchema(
  pattern: PatternType,
  topic: string,
  common: Pick<UISchema, "version" | "depth" | "visual_asset" | "next_concepts">,
): UISchema | null {
  const title = "用工厂例子理解" + topic;

  if (pattern === "system_builder") {
    return {
      ...common,
      pattern,
      template: "module_sandbox",
      payload: {
        title,
        target: "把线性规划拼成一个模型",
        modules: [
          { id: "variables", label: "决策变量 x,y", description: "先定义要决定的量：桌子数 x，椅子数 y。", role: "start" },
          { id: "objective", label: "目标函数", description: "要最大化的利润：40x + 30y。", role: "core" },
          { id: "labor", label: "工时约束", description: "桌子需 2 小时，椅子需 1 小时，总工时不能超过 100。", role: "constraint" },
          { id: "wood", label: "木材约束", description: "桌子用 1 份木材，椅子用 2 份木材，总木材不能超过 80。", role: "constraint" },
          { id: "feasible", label: "可行域", description: "同时满足所有约束的 x,y 组合。最优解通常出现在可行域的顶点。", role: "result" },
          { id: "unit", label: "单件利润", description: "单件利润高不一定总利润最高，还要看约束卡在哪里。", role: "distractor" },
        ],
        required_module_ids: ["variables", "objective", "labor", "wood", "feasible"],
        expected_sequence: ["variables", "objective", "labor", "wood", "feasible"],
        connections: [
          { from: "variables", to: "objective", label: "用 x,y 写出目标" },
          { from: "objective", to: "labor", label: "再加工时限制" },
          { from: "labor", to: "wood", label: "继续加木材限制" },
          { from: "wood", to: "feasible", label: "约束围出可行域" },
        ],
        success_summary: "先定 x,y，再写目标函数，最后用约束切出可行域。",
      },
    };
  }

  if (pattern === "parameter_explore") {
    return {
      ...common,
      pattern,
      template: "single_slider",
      payload: {
        title: "调整约束条件",
        variable_label: "工时上限",
        min: 60,
        max: 140,
        default_value: 100,
        unit: "小时",
        explanation_template: "约束放宽时，可行域变大，最优解可能移到新的顶点。",
        scenarios: [
          { label: "紧约束", value: 70 },
          { label: "基准", value: 100 },
          { label: "宽约束", value: 130 },
        ],
        outputs: [
          { label: "可行域大小", model: "linear", min: 20, max: 100, default: 60, unit: "%", description: "能选的 x,y 组合变多了。" },
          { label: "估计最大利润", model: "linear", min: 1600, max: 4200, default: 3000, unit: "元", description: "可行域扩大后，有机会找到更高利润的顶点。" },
        ],
        insight_rules: [
          { when: "low", text: "工时很紧时，约束会把可行域压得很小。" },
          { when: "mid", text: "约束放宽后，最优点可能从一个顶点跳到另一个顶点。" },
          { when: "high", text: "继续放宽未必一直提升，因为另一条约束可能成为新的瓶颈。" },
        ],
      },
    };
  }

  if (pattern === "simulation_play") {
    return {
      ...common,
      pattern,
      template: "parameter_simulation",
      payload: {
        title: "试着推一次最优解",
        params: [
          { label: "工时上限", min: 60, max: 140, default: 100, unit: "小时" },
          { label: "木材上限", min: 50, max: 120, default: 80, unit: "份" },
          { label: "桌子利润", min: 20, max: 80, default: 40, unit: "元" },
        ],
        compute_formula_description: "先排除不满足约束的方案，再在可行域顶点中找目标函数最大的一个。",
        steps: 5,
      },
    };
  }

  if (pattern === "concept_memory") {
    return {
      ...common,
      pattern,
      template: "term_cards",
      payload: {
        title: "记住三个骨架词",
        cards: [
          { front: "决策变量", back: "要决定的量，例如桌子数 x 和椅子数 y。" },
          { front: "目标函数", back: "想最大化或最小化的式子，例如利润 40x+30y。" },
          { front: "可行域", back: "所有同时满足约束的方案集合，最优解常在顶点。" },
        ],
      },
    };
  }

  if (pattern === "knowledge_check") {
    return {
      ...common,
      pattern,
      template: "single_question",
      payload: {
        title: "先抓住建模顺序",
        question: "做线性规划时，最先应该明确什么？",
        options: [
          { label: "先定义决策变量 x,y", correct: true, explanation: "没有 x,y，目标函数和约束都写不出来。" },
          { label: "先找结果是多少", correct: false, explanation: "结果要通过目标函数和约束推出来。" },
          { label: "先记住单纯形法名字", correct: false, explanation: "算法名字不等于理解建模问题。" },
        ],
      },
    };
  }

  return null;
}

function makeFallbackPlay(topic: string, pattern: PatternType, index: number, groundingTerms: string[] = []): KnowledgePlay {
  const titles = ["先猜一下", "看见机制", "动手验证"];
  return {
    id: `dynamic-${index + 1}`,
    title: titles[index] || "继续探索",
    concept: topic,
    schema: baseSchema(pattern, topic, groundingTerms),
    estimated_minutes: index === 1 ? 2 : 1,
    reward_copy: ["你先抓住了问题的入口。", "你看见机制开始动起来了。", "这一关把线索连起来了。"][index] || "你又想通了一层。",
  };
}

function fallbackPatternChain(preferredPattern: FlowPatternPreference): PatternType[] {
  if (preferredPattern !== "auto") return ["knowledge_check", preferredPattern, "parameter_explore"];
  return ["knowledge_check", "concept_memory", "parameter_explore"];
}


const GENERIC_GROUNDING_TERMS = [
  "概念",
  "机制",
  "关键",
  "变量",
  "结果",
  "影响",
  "系统",
  "结构",
  "流程",
  "变化",
  "理解",
  "应用",
  "边界",
  "条件",
  "动作",
  "问题",
  "答案",
  "定义",
  "核心",
  "表面",
  "topic",
  "concept",
  "thing",
  "system",
  "process",
  "factor",
  "result",
  "change",
  "mechanism",
];

const PLACEHOLDER_PHRASES = [
  "相近概念",
  "这个概念",
  "关键变量",
  "核心机会",
  "普通路径",
  "误判风险",
  "表面理解",
  "机制理解",
  "它改变了什么",
  "它的字面名字",
  "越复杂越准确",
];

const PROBABILITY_HINTS = [
  "概率",
  "随机",
  "不确定",
  "风险",
  "保险",
  "期权",
  "贝叶斯",
  "预测",
  "抽样",
  "分布",
  "置信",
  "彩票",
  "抽卡",
  "波动",
  "可能性",
  "probability",
  "random",
  "uncertain",
  "risk",
  "option",
  "bayes",
];

const DETERMINISTIC_MODELING_HINTS = [
  "线性规划",
  "规划",
  "最优化",
  "优化",
  "目标函数",
  "约束",
  "可行域",
  "最优解",
  "单纯形",
  "运筹",
  "资源分配",
  "算法",
  "模型",
  "linearprogramming",
  "optimization",
  "constraint",
  "objectivefunction",
];

function normalizeGroundingText(value: string) {
  return value.toLowerCase().replace(/[\s\-_，。,.。:：;；、/()（）\[\]【】]+/g, "");
}

function uniqueCleanStrings(value: unknown, fallback: string[] = [], maxLength = 24) {
  const source = Array.isArray(value) ? value : fallback;
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of source) {
    const text = cleanText(item, "", maxLength);
    if (!text) continue;
    const key = normalizeGroundingText(text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(text);
  }

  return result;
}

function isGenericGroundingTerm(term: string, topic: string) {
  const normalized = normalizeGroundingText(term);
  const topicKey = normalizeGroundingText(topic);
  if (!normalized || normalized === topicKey) return true;
  if (normalized.length <= 1) return true;
  return GENERIC_GROUNDING_TERMS.some((generic) => normalized === normalizeGroundingText(generic));
}

function normalizeGroundingTerms(value: unknown, topic: string, concepts: string[]) {
  const candidates = uniqueCleanStrings(value, concepts, 28);
  return candidates
    .filter((term) => !isGenericGroundingTerm(term, topic))
    .slice(0, 5);
}

function countIncludes(text: string, term: string) {
  const normalizedText = normalizeGroundingText(text);
  const normalizedTerm = normalizeGroundingText(term);
  if (!normalizedTerm) return 0;
  return normalizedText.includes(normalizedTerm) ? 1 : 0;
}

function hasAnyHint(text: string, hints: string[]) {
  const normalizedText = normalizeGroundingText(text);
  return hints.some((hint) => normalizedText.includes(normalizeGroundingText(hint)));
}

function usesPattern(flow: KnowledgeFlow, pattern: PatternType) {
  return flow.plays.some((play) => play.schema.pattern === pattern);
}

function probabilityPatternLooksMisapplied(flow: KnowledgeFlow, topic: string, groundingTerms: string[]) {
  if (!usesPattern(flow, "probability")) return false;
  const evidence = [topic, ...groundingTerms, flow.title, flow.hook, flow.description, ...flow.concepts].join(" ");
  if (hasAnyHint(evidence, PROBABILITY_HINTS)) return false;
  return hasAnyHint(evidence, DETERMINISTIC_MODELING_HINTS);
}

function evaluateFlowGrounding(flow: KnowledgeFlow, topic: string, groundingTerms: string[], preferredPattern: FlowPatternPreference = "auto") {
  const text = JSON.stringify(flow);
  const failures: string[] = [];
  const cleanTerms = normalizeGroundingTerms(groundingTerms, topic, []);
  const placeholderHits = PLACEHOLDER_PHRASES.filter((phrase) => text.includes(phrase));
  const topicVisible = countIncludes(text, topic) > 0;
  const presentTerms = cleanTerms.filter((term) => countIncludes(text, term) > 0);

  if (!topicVisible && presentTerms.length < 2) {
    failures.push("内容没有明显围绕用户输入的主题展开");
  }

  if (cleanTerms.length < 2) {
    failures.push("缺少足够具体的 grounding_terms");
  }

  if (cleanTerms.length >= 2 && presentTerms.length < Math.min(2, cleanTerms.length)) {
    failures.push(`专业锚点没有进入关卡内容: ${cleanTerms.join("、")}`);
  }

  if (placeholderHits.includes("相近概念") || placeholderHits.length >= 3) {
    failures.push(`出现占位式泛化文案: ${placeholderHits.join("、")}`);
  }

  if (preferredPattern === "auto" && probabilityPatternLooksMisapplied(flow, topic, cleanTerms)) {
    failures.push("Pattern 选择不合适：确定性建模/系统结构类主题不应使用 probability 抽卡模板");
  }

  return {
    ok: failures.length === 0,
    reason: failures.join("；"),
    groundingTerms: cleanTerms,
  };
}

function heuristicPatternChain(topic: string, preferredPattern: FlowPatternPreference): PatternType[] {
  if (preferredPattern !== "auto") return ["knowledge_check", preferredPattern, "parameter_explore"];
  if (hasAnyHint(topic, DETERMINISTIC_MODELING_HINTS)) return ["knowledge_check", "parameter_explore", "simulation_play"];
  if (hasAnyHint(topic, PROBABILITY_HINTS)) return ["probability", "parameter_explore", "knowledge_check"];
  return fallbackPatternChain(preferredPattern);
}

function fallbackGroundingTerms(topic: string) {
  if (hasAnyHint(topic, DETERMINISTIC_MODELING_HINTS)) {
    return ["目标函数", "约束条件", "可行域", "最优解", "资源分配"];
  }
  if (hasAnyHint(topic, PROBABILITY_HINTS)) {
    return ["先验概率", "新证据", "后验判断", "不确定性", "概率更新"];
  }
  return [`${topic}入口`, `${topic}关键动作`, `${topic}适用边界`, `${topic}真实场景`];
}

function normalizePatternList(value: unknown, fallback: PatternType[]) {
  const source = Array.isArray(value) ? value : fallback;
  const seen = new Set<PatternType>();
  const result: PatternType[] = [];
  for (const item of source) {
    if (!isPattern(item) || seen.has(item)) continue;
    seen.add(item);
    result.push(item);
  }
  return result;
}

function makeFallbackConceptPlan(topicInput: string, preferredPattern: FlowPatternPreference): ConceptPlan {
  const topic = cleanTopic(topicInput);
  const recommended = heuristicPatternChain(topic, preferredPattern);
  return {
    topic,
    domain: hasAnyHint(topic, DETERMINISTIC_MODELING_HINTS) ? "建模与优化" : "通用知识",
    core_question: `怎样真正理解${topic}，并把它用在判断里？`,
    grounding_terms: fallbackGroundingTerms(topic),
    knowledge_structure: hasAnyHint(topic, DETERMINISTIC_MODELING_HINTS) ? "optimization_model" : "concept_mechanism",
    recommended_patterns: recommended,
    avoid_patterns: hasAnyHint(topic, DETERMINISTIC_MODELING_HINTS) ? ["probability"] : [],
    learning_path: ["先判断入口", "再看关键机制", "最后动手验证"],
    category: "数理",
    topic_area: "自由生成",
    difficulty: "轻松",
  };
}

function normalizeConceptPlan(raw: unknown, topicInput: string, preferredPattern: FlowPatternPreference): ConceptPlan {
  const fallback = makeFallbackConceptPlan(topicInput, preferredPattern);
  const root = asRecord(raw);
  const candidate = asRecord(root?.concept_plan) || asRecord(root?.plan) || root;
  if (!candidate) return fallback;

  const topic = cleanTopic(topicInput);
  const rawTerms = uniqueCleanStrings(candidate.grounding_terms ?? candidate.groundingTerms, fallback.grounding_terms, 28);
  const groundingTerms = rawTerms.filter((term) => !isGenericGroundingTerm(term, topic)).slice(0, 5);
  const recommended = normalizePatternList(candidate.recommended_patterns ?? candidate.recommendedPatterns, fallback.recommended_patterns);
  const avoid = normalizePatternList(candidate.avoid_patterns ?? candidate.avoidPatterns, fallback.avoid_patterns);
  const preferredRecommended: PatternType[] = preferredPattern !== "auto" && !recommended.includes(preferredPattern)
    ? ([recommended[0] || "knowledge_check", preferredPattern, ...recommended.slice(1)].filter(Boolean) as PatternType[])
    : recommended;

  return {
    topic,
    domain: cleanText(candidate.domain, fallback.domain, 24),
    core_question: cleanText(candidate.core_question ?? candidate.coreQuestion, fallback.core_question, 60),
    grounding_terms: groundingTerms.length >= 3 ? groundingTerms : fallback.grounding_terms,
    knowledge_structure: cleanText(candidate.knowledge_structure ?? candidate.knowledgeStructure, fallback.knowledge_structure, 32),
    recommended_patterns: preferredRecommended.slice(0, 4),
    avoid_patterns: avoid.filter((pattern) => preferredPattern === "auto" || pattern !== preferredPattern).slice(0, 4),
    learning_path: uniqueCleanStrings(candidate.learning_path ?? candidate.learningPath, fallback.learning_path, 36).slice(0, 4),
    category: coerceCategory(candidate.category, fallback.category),
    topic_area: cleanText(candidate.topic_area ?? candidate.topicArea, fallback.topic_area, 16),
    difficulty: coerceDifficulty(candidate.difficulty, fallback.difficulty),
  };
}

function evaluateConceptPlan(plan: ConceptPlan, preferredPattern: FlowPatternPreference) {
  const failures: string[] = [];
  const cleanTerms = normalizeGroundingTerms(plan.grounding_terms, plan.topic, []);
  if (!plan.topic) failures.push("plan.topic 缺失");
  if (cleanTerms.length < 3) failures.push("ConceptPlan 缺少至少 3 个专业锚点");
  if (plan.learning_path.length < 3) failures.push("ConceptPlan 缺少三步学习路径");
  if (plan.recommended_patterns.length < 2) failures.push("ConceptPlan 缺少推荐 Pattern 链");
  if (preferredPattern !== "auto" && !plan.recommended_patterns.includes(preferredPattern)) {
    failures.push(`ConceptPlan 未包含用户指定 Pattern: ${preferredPattern}`);
  }
  if (preferredPattern === "auto" && plan.recommended_patterns.includes("probability") && hasAnyHint([plan.topic, plan.knowledge_structure, ...cleanTerms].join(" "), DETERMINISTIC_MODELING_HINTS)) {
    failures.push("ConceptPlan 把确定性建模/系统结构类主题误判为 probability");
  }
  return {
    ok: failures.length === 0,
    reason: failures.join("；"),
    groundingTerms: cleanTerms,
  };
}

function patternChainFromPlan(plan: ConceptPlan, preferredPattern: FlowPatternPreference): PatternType[] {
  const optimizationEvidence = [plan.topic, plan.knowledge_structure, ...plan.grounding_terms].join(" ");
  if (plan.knowledge_structure === "optimization_model" || hasAnyHint(optimizationEvidence, DETERMINISTIC_MODELING_HINTS)) {
    const chain: PatternType[] = ["system_builder", "parameter_explore", "simulation_play"];
    if (preferredPattern !== "auto" && !chain.includes(preferredPattern)) chain[1] = preferredPattern;
    return chain;
  }

  const avoid = new Set(preferredPattern === "auto" ? plan.avoid_patterns : plan.avoid_patterns.filter((pattern) => pattern !== preferredPattern));
  const candidates = [
    ...plan.recommended_patterns,
    ...heuristicPatternChain(plan.topic, preferredPattern),
    "knowledge_check" as const,
    "concept_memory" as const,
    "parameter_explore" as const,
  ].filter((pattern) => !avoid.has(pattern));
  const result: PatternType[] = [];
  for (const pattern of candidates) {
    if (result.includes(pattern)) continue;
    result.push(pattern);
    if (result.length === 3) break;
  }
  while (result.length < 3) result.push("knowledge_check");
  if (preferredPattern !== "auto" && !result.includes(preferredPattern)) result[1] = preferredPattern;
  return result.slice(0, 3);
}

function makeFallbackFlowFromPlan(plan: ConceptPlan, preferredPattern: FlowPatternPreference): KnowledgeFlow {
  const patterns = patternChainFromPlan(plan, preferredPattern);
  return {
    id: makeDynamicId(plan.topic),
    title: `${plan.topic}入门`,
    concept: plan.topic,
    hook: plan.core_question,
    description: `${plan.learning_path.slice(0, 3).join("，")}。`,
    category: plan.category,
    topic_area: plan.topic_area,
    difficulty: plan.difficulty,
    estimated_minutes: 4,
    summary: `你已经把${plan.topic}拆成了可以继续探索的理解路径。`,
    concepts: plan.grounding_terms.slice(0, 5),
    plays: patterns.map((pattern, index) => makeFallbackPlay(plan.topic, pattern, index, plan.grounding_terms)),
    follow_ups: makeFallbackFollowUps(plan.topic),
    source: "generated",
  };
}

function evaluateFlowAgainstPlan(flow: KnowledgeFlow, plan: ConceptPlan, preferredPattern: FlowPatternPreference) {
  const failures: string[] = [];
  const flowText = JSON.stringify(flow);
  const patterns = flow.plays.map((play) => play.schema.pattern).filter((pattern): pattern is PatternType => isPattern(pattern));
  const avoid = preferredPattern === "auto" ? plan.avoid_patterns : plan.avoid_patterns.filter((pattern) => pattern !== preferredPattern);
  const avoidedUsed = avoid.filter((pattern) => patterns.includes(pattern));
  const anchorHits = plan.grounding_terms.filter((term) => countIncludes(flowText, term) > 0);

  if (!flow.concept.includes(plan.topic) && !plan.topic.includes(flow.concept)) failures.push("Flow concept 没有服从 ConceptPlan topic");
  if (anchorHits.length < Math.min(3, plan.grounding_terms.length)) failures.push(`Flow 未覆盖足够 ConceptPlan 锚点: ${plan.grounding_terms.join("、")}`);
  if (avoidedUsed.length) failures.push(`Flow 使用了 ConceptPlan 禁用 Pattern: ${avoidedUsed.join("、")}`);
  if (preferredPattern !== "auto" && !patterns.includes(preferredPattern)) failures.push(`Flow 未包含用户指定 Pattern: ${preferredPattern}`);
  if (preferredPattern === "auto" && !patterns.some((pattern) => plan.recommended_patterns.includes(pattern))) failures.push("Flow 没有使用 ConceptPlan 推荐 Pattern");

  return {
    ok: failures.length === 0,
    reason: failures.join("；"),
  };
}

function buildConceptPlanSystemPrompt(topic: string, preferredPattern: FlowPatternPreference) {
  const patternList = Object.entries(PATTERN_LABELS)
    .map(([pattern, label]) => `- ${pattern}: ${label}`)
    .join("\n");
  const preferred = preferredPattern === "auto" ? "AI 推荐" : `用户指定核心 Pattern: ${preferredPattern}`;
  return `你是趣灵的知识结构规划器。先不要生成 UI，也不要生成三关 payload。
你的任务是把用户输入的概念转成一个可校验的 ConceptPlan，后续 UI 只能根据这个计划生成。
只输出合法 JSON，不要 Markdown。

用户输入：${topic}
Pattern 偏好：${preferred}

可用 Pattern：
${patternList}

输出 JSON：
{
  "topic": "保留用户原词或极短同义名",
  "domain": "学科/领域",
  "core_question": "这个概念真正要回答的问题",
  "grounding_terms": ["3-5个专业锚点"],
  "knowledge_structure": "optimization_model|system_process|probabilistic_reasoning|comparison_frame|timeline_change|concept_mechanism|classification_rule|simulation_model",
  "recommended_patterns": ["3个最适合的 Pattern"],
  "avoid_patterns": ["不适合的 Pattern"],
  "learning_path": ["第1关学习目标", "第2关学习目标", "第3关学习目标"],
  "category": "科技|经济|哲学|心理|历史|数理",
  "topic_area": "短领域名",
  "difficulty": "轻松|进阶|烧脑一点"
}

规则：
- topic 不要写定义，必须保留用户输入原词，例如“线性规划”不能写成“线性规划是在约束条件下...”
- grounding_terms 必须是专业锚点，不能写“概念/机制/变量/关键/结果”这类空词。
- recommended_patterns 必须解释知识结构：优化/规划/约束/目标函数/可行域/算法类优先 parameter_explore、simulation_play、system_builder、knowledge_check；概率/随机/风险/贝叶斯/预测类才用 probability。
- avoid_patterns 明确写出不适合的模式，例如确定性优化问题通常避免 probability。
- learning_path 必须形成递进：先判断入口，再建立结构，最后动手验证。`;
}

function buildConceptPlanRepairPrompt(topic: string, preferredPattern: FlowPatternPreference, reason: string, previousOutput: string) {
  return `上一次 ConceptPlan 没有通过校验。
主题：${topic}
Pattern 偏好：${preferredPattern}
失败原因：${reason}

请重新输出完整 ConceptPlan JSON。不要生成 UI。不要解释。
要求：保留 topic 原词，给出 3-5 个专业锚点，推荐 Pattern 与知识结构匹配，避免不适合的 Pattern。

上一次输出：
${previousOutput.slice(0, 3000)}`;
}

function buildFlowUserPrompt(topic: string, plan: ConceptPlan) {
  return `根据下面的 ConceptPlan 生成 exactly 3 个互动关卡 Flow。不得偏离计划。
ConceptPlan:
${JSON.stringify(plan, null, 2)}

生成要求：
- flow.concept 必须是 "${topic}"。
- plays 的 schema.pattern 必须优先使用 recommended_patterns，不得使用 avoid_patterns。
- 每一关必须覆盖 grounding_terms，并对应 learning_path 的一个阶段。
- 不要把定义塞进标题。`;
}

async function generateConceptPlan(
  model: NonNullable<ReturnType<typeof getLLMProvider>>,
  topic: string,
  preferredPattern: FlowPatternPreference,
  includeRaw: boolean,
) {
  const fallback = makeFallbackConceptPlan(topic, preferredPattern);
  const system = buildConceptPlanSystemPrompt(topic, preferredPattern);
  const result = await retryGenerateText({
    model,
    system,
    messages: [{ role: "user", content: `为「${topic}」生成 ConceptPlan。` }],
  });
  const plan = normalizeConceptPlan(parseJson(result.text), topic, preferredPattern);
  const evaluation = evaluateConceptPlan(plan, preferredPattern);
  if (evaluation.ok) {
    return { plan, source: "llm" as const, raw_output: includeRaw ? result.text : undefined };
  }

  const repair = await retryGenerateText({
    model,
    system,
    messages: [{ role: "user", content: buildConceptPlanRepairPrompt(topic, preferredPattern, evaluation.reason, result.text) }],
  });
  const repairedPlan = normalizeConceptPlan(parseJson(repair.text), topic, preferredPattern);
  const repairedEvaluation = evaluateConceptPlan(repairedPlan, preferredPattern);
  if (repairedEvaluation.ok) {
    return {
      plan: repairedPlan,
      source: "llm" as const,
      error: `ConceptPlan 初次失败，已自动修复: ${evaluation.reason}`,
      raw_output: includeRaw ? repair.text : undefined,
    };
  }

  return {
    plan: fallback,
    source: "mock" as const,
    error: `ConceptPlan 失败: ${evaluation.reason} | 修复失败: ${repairedEvaluation.reason}`,
    raw_output: includeRaw ? repair.text : undefined,
  };
}
function buildRepairUserPrompt(
  topic: string,
  preferredPattern: FlowPatternPreference,
  reason: string,
  previousOutput: string,
  plan?: ConceptPlan,
) {
  const preferred = preferredPattern === "auto" ? "AI recommends patterns" : "User requires core pattern: " + preferredPattern;
  const clippedOutput = previousOutput.slice(0, 6000);
  const planBlock = plan ? "\nConceptPlan, follow it exactly:\n" + JSON.stringify(plan, null, 2) + "\n" : "";
  return [
    "The previous Flow JSON failed validation. Repair it and output valid JSON only.",
    "Topic: " + topic,
    "Pattern preference: " + preferred,
    "Failure reason: " + reason,
    planBlock,
    "Rules:",
    "- Keep flow.concept equal to the user topic.",
    "- Generate exactly 3 plays.",
    "- Every play must use concrete terms from grounding_terms.",
    "- Do not use patterns listed in ConceptPlan.avoid_patterns.",
    "- If the user selected a pattern, at least one play.schema.pattern must equal it.",
    "- Do not use placeholder copy such as similar concept, key variable, mechanism, result, output1, result, or {value}.",
    "- User-facing text should be concise Simplified Chinese.",
    "Previous output, for repair reference only:",
    clippedOutput,
  ].filter(Boolean).join("\n");
}
function makeFallbackFollowUps(topic: string): FollowUpTopic[] {
  return [
    {
      id: "dynamic-follow-up-mechanism",
      title: "换个角度看机制",
      concept: `${topic}的关键机制`,
      hook: "把刚才的理解拆成条件、动作和结果。",
      relation: "从当前概念走向底层机制",
      kind: "ai_seed",
      suggestedPattern: "system_builder",
    },
    {
      id: "dynamic-follow-up-compare",
      title: "看清适用边界",
      concept: `${topic}的适用边界`,
      hook: "知道它什么时候有用，什么时候会误导。",
      relation: "从单点理解走向边界判断",
      kind: "ai_seed",
      suggestedPattern: "comparison",
    },
    {
      id: "dynamic-follow-up-apply",
      title: "放进真实场景",
      concept: `${topic}的真实应用`,
      hook: "用一个场景测试你是否真的理解。",
      relation: "从概念理解走向场景使用",
      kind: "ai_seed",
      suggestedPattern: "narrative_branch",
    },
  ];
}

function makeFallbackFlow(topicInput: string, preferredPattern: FlowPatternPreference): KnowledgeFlow {
  const topic = cleanTopic(topicInput);
  const patterns = fallbackPatternChain(preferredPattern);
  const groundingTerms = [`${topic}入口`, `${topic}动力`, `${topic}边界`];
  return {
    id: makeDynamicId(topic),
    title: `${topic}入门`,
    concept: topic,
    hook: `用三关看懂${topic}。`,
    description: `先猜、再看机制、最后动手验证${topic}。`,
    category: "数理",
    topic_area: "自由生成",
    difficulty: "轻松",
    estimated_minutes: 4,
    summary: `你已经把${topic}从一个名词变成了一条能操作的理解路径。`,
    concepts: groundingTerms,
    plays: patterns.map((pattern, index) => makeFallbackPlay(topic, pattern, index, groundingTerms)),
    follow_ups: makeFallbackFollowUps(topic),
    source: "generated",
  };
}

function extractJsonObjects(text: string) {
  const candidates: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") {
      if (depth === 0) start = index;
      depth += 1;
      continue;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        candidates.push(text.slice(start, index + 1));
        start = -1;
      }
    }
  }
  return candidates;
}

function parseJson(text: string) {
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
  const candidates = [
    ...[...text.matchAll(jsonBlockRegex)].map((match) => match[1]),
    text.trim(),
    ...extractJsonObjects(text),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      // Try next candidate.
    }
  }
  return null;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function templateOwner(template: string) {
  for (const [pattern, item] of Object.entries(SCHEMA_CATALOG)) {
    if ((item.templates as readonly string[]).includes(template as TemplateId)) return pattern as PatternType;
  }
  return null;
}

function normalizePayloadTitle(payload: unknown, topic: string) {
  const record = asRecord(payload);
  if (!record) return payload;
  const current = cleanText(record.title, "", 42);
  const looksLikeDefinition = current.length > 24 || current.includes(`${topic}是`) || current.includes(`${topic}是在`);
  return {
    ...record,
    title: current && !looksLikeDefinition ? current : `把${topic}玩明白`,
  };
}

function normalizeProbabilityPayload(payload: unknown, topic: string) {
  const record = asRecord(normalizePayloadTitle(payload, topic));
  if (!record || !Array.isArray(record.pool)) return record || payload;
  const pool = record.pool.map((item) => {
    const itemRecord = asRecord(item) || {};
    return {
      ...itemRecord,
      probability: typeof itemRecord.probability === "number" && Number.isFinite(itemRecord.probability) ? itemRecord.probability : 0,
    };
  });
  const total = pool.reduce((sum, item) => sum + Math.max(0, item.probability), 0);
  const normalizedPool = total > 1.5
    ? pool.map((item) => ({ ...item, probability: total > 0 ? Math.max(0, item.probability) / total : 0 }))
    : pool;
  return { ...record, pool: normalizedPool };
}

function normalizeSchemaPayload(pattern: PatternType, payload: unknown, topic: string) {
  if (pattern === "probability") return normalizeProbabilityPayload(payload, topic);
  return normalizePayloadTitle(payload, topic);
}

function repairSchema(rawSchema: unknown, fallbackPattern: PatternType, topic: string, groundingTerms: string[] = []): UISchema {
  const record = asRecord(rawSchema);
  if (!record) return baseSchema(fallbackPattern, topic, groundingTerms);

  let pattern = typeof record.pattern === "string" ? record.pattern : "";
  let template = typeof record.template === "string" ? record.template : "";
  if (template.startsWith("v2_")) template = template.slice(3);

  if (!isPattern(pattern)) {
    const owner = templateOwner(pattern) || templateOwner(template);
    pattern = owner || fallbackPattern;
  }

  const catalog = SCHEMA_CATALOG[pattern as PatternType];
  if (!catalog) return baseSchema(fallbackPattern, topic, groundingTerms);
  if (!template || !(catalog.templates as readonly string[]).includes(template)) template = catalog.defaultTemplate;

  const candidate = {
    ...record,
    pattern,
    template,
    version: typeof record.version === "string" ? record.version : "2.0",
    depth: record.depth === "scenario" || record.depth === "mapping" ? record.depth : "rapid",
    payload: normalizeSchemaPayload(
      pattern as PatternType,
      record.payload || record.config || baseSchema(pattern as PatternType, topic, groundingTerms).payload,
      topic,
    ),
  } as UISchema;

  return validateSchema(candidate) || baseSchema(pattern as PatternType, topic, groundingTerms);
}

function normalizeFollowUps(value: unknown, topic: string): FollowUpTopic[] {
  if (!Array.isArray(value)) return makeFallbackFollowUps(topic);
  const followUps = value.slice(0, 3).map((item, index) => {
    const record = asRecord(item) || {};
    const concept = cleanText(record.concept, `${topic}的延伸方向`, 36);
    const suggestedPattern = normalizePreference(record.suggestedPattern ?? record.suggested_pattern);
    return {
      id: cleanText(record.id, `dynamic-follow-up-${index + 1}`, 48),
      title: cleanText(record.title, concept, 18),
      concept,
      hook: cleanText(record.hook, `继续探索${concept}。`, 42),
      relation: cleanText(record.relation, "从当前理解继续向外走。", 42),
      kind: record.kind === "curated" ? "curated" : "ai_seed",
      suggestedPattern,
      target_flow_id: typeof record.target_flow_id === "string" ? record.target_flow_id : undefined,
    } satisfies FollowUpTopic;
  });
  return followUps.length > 0 ? followUps : makeFallbackFollowUps(topic);
}

function normalizeGeneratedFlow(
  raw: unknown,
  topicInput: string,
  preferredPattern: FlowPatternPreference,
  plan?: ConceptPlan,
) {
  const fallback = plan ? makeFallbackFlowFromPlan(plan, preferredPattern) : makeFallbackFlow(topicInput, preferredPattern);
  const root = asRecord(raw);
  const candidate = asRecord(root?.flow) || root;
  if (!candidate) return { flow: fallback, error: "LLM output is not an object", groundingTerms: plan?.grounding_terms || [] };

  const topic = plan?.topic || cleanTopic(topicInput);
  const concepts = Array.isArray(candidate.concepts)
    ? candidate.concepts.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 5)
    : fallback.concepts;
  const groundingTerms = normalizeGroundingTerms(
    candidate.grounding_terms ?? candidate.groundingTerms,
    topic,
    plan?.grounding_terms || concepts,
  );
  const patternChain = plan ? patternChainFromPlan(plan, preferredPattern) : fallbackPatternChain(preferredPattern);
  const avoid = new Set(plan ? (preferredPattern === "auto" ? plan.avoid_patterns : plan.avoid_patterns.filter((pattern) => pattern !== preferredPattern)) : []);
  const allowedPatterns = new Set(patternChain);
  const rawPlays = Array.isArray(candidate.plays) ? candidate.plays.slice(0, 3) : [];
  const plays = rawPlays.map((rawPlay, index) => {
    const record = asRecord(rawPlay) || {};
    const fallbackPattern = patternChain[index] || "knowledge_check";
    let schema = repairSchema(record.schema, fallbackPattern, topic, groundingTerms);
    if (!isPattern(schema.pattern) || avoid.has(schema.pattern) || (plan && !allowedPatterns.has(schema.pattern))) {
      schema = baseSchema(fallbackPattern, topic, groundingTerms);
    }
    return {
      id: cleanText(record.id, "dynamic-" + (index + 1), 48),
      title: cleanText(record.title, fallback.plays[index]?.title || "Step " + (index + 1), 18),
      concept: cleanText(record.concept, topic, 28),
      schema,
      estimated_minutes: typeof record.estimated_minutes === "number" ? Math.max(1, Math.min(3, Math.round(record.estimated_minutes))) : 1,
      reward_copy: cleanText(record.reward_copy, fallback.plays[index]?.reward_copy || "Nice, this step is clearer.", 48),
    } satisfies KnowledgePlay;
  });

  while (plays.length < 3) {
    const fallbackPattern: PatternType = patternChain[plays.length] ?? "knowledge_check";
    plays.push(makeFallbackPlay(topic, fallbackPattern, plays.length, groundingTerms));
  }

  const selectedPattern: PatternType | null = preferredPattern === "auto" ? null : preferredPattern;
  if (selectedPattern && !plays.some((play) => play.schema.pattern === selectedPattern)) {
    plays[1] = makeFallbackPlay(topic, selectedPattern, 1, groundingTerms);
  }

  return {
    flow: {
      id: makeDynamicId(topic),
      title: cleanText(candidate.title, fallback.title, 18),
      concept: topic,
      hook: cleanText(candidate.hook, plan?.core_question || fallback.hook, 42),
      description: cleanText(candidate.description, fallback.description, 80),
      category: coerceCategory(candidate.category, plan?.category || fallback.category),
      topic_area: cleanText(candidate.topic_area ?? candidate.topicArea, plan?.topic_area || fallback.topic_area, 16),
      difficulty: coerceDifficulty(candidate.difficulty, plan?.difficulty || fallback.difficulty),
      estimated_minutes: plays.reduce((total, play) => total + play.estimated_minutes, 0),
      summary: cleanText(candidate.summary, fallback.summary, 100),
      concepts: concepts.length > 0 ? concepts : fallback.concepts,
      plays,
      follow_ups: normalizeFollowUps(candidate.follow_ups, topic),
      source: "generated",
    } satisfies KnowledgeFlow,
    groundingTerms,
  };
}

async function retryGenerateText(options: Parameters<typeof generateText>[0], maxRetries = 1) {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await generateText(options);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const message = error instanceof Error ? error.message : String(error);
      if (!/(500|502|503|timeout|ECONNRESET|ETIMEDOUT|fetch failed)/i.test(message)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
    }
  }
  throw new Error("unreachable");
}

function buildDynamicSystemPrompt(topic: string, preferredPattern: FlowPatternPreference, plan?: ConceptPlan) {
  const patternDirectory = Object.entries(SCHEMA_CATALOG)
    .map(([pattern, item]) => "- " + pattern + ": " + PATTERN_LABELS[pattern as PatternType] + "; templates: " + item.templates.join(" | "))
    .join("\n");
  const preferenceRule = preferredPattern === "auto"
    ? "Choose patterns from the ConceptPlan recommended_patterns."
    : "The user selected core pattern " + preferredPattern + "; at least one play.schema.pattern must equal " + preferredPattern + ".";
  const planBlock = plan ? "\nConceptPlan, mandatory source of truth:\n" + JSON.stringify(plan, null, 2) + "\n" : "";

  return [
    "You are the Flow designer for aha-flash. Generate a 3-step interactive learning Flow from the ConceptPlan. Output valid JSON only, no Markdown.",
    "Topic: " + topic,
    preferenceRule,
    planBlock,
    "Allowed patterns and templates:",
    patternDirectory,
    "",
    "Return this JSON shape:",
    "{",
    "  \"title\": \"short title\",",
    "  \"concept\": \"same as ConceptPlan.topic\",",
    "  \"hook\": \"short question\",",
    "  \"description\": \"one sentence\",",
    "  \"category\": \"same as ConceptPlan.category\",",
    "  \"topic_area\": \"short area\",",
    "  \"difficulty\": \"same as ConceptPlan.difficulty\",",
    "  \"summary\": \"completion summary\",",
    "  \"grounding_terms\": [\"term1\", \"term2\", \"term3\"],",
    "  \"concepts\": [\"term1\", \"term2\", \"term3\"],",
    "  \"follow_ups\": [{ \"title\": \"next\", \"concept\": \"follow-up concept\", \"relation\": \"relation\", \"hook\": \"question\", \"suggestedPattern\": \"comparison\" }],",
    "  \"plays\": [{ \"id\": \"step-1\", \"title\": \"short action title\", \"concept\": \"step concept\", \"estimated_minutes\": 1, \"reward_copy\": \"warm but not gamey\", \"schema\": { \"pattern\": \"...\", \"template\": \"...\", \"version\": \"2.0\", \"depth\": \"rapid\", \"payload\": {}, \"visual_asset\": {\"tag\":\"...\",\"mood\":\"idle\"} } }]",
    "}",
    "",
    "Hard rules:",
    "- plays must contain exactly 3 items.",
    "- flow.concept must equal ConceptPlan.topic.",
    "- Use ConceptPlan.grounding_terms in visible titles, questions, options, labels, modules, slider outputs, or explanations. Listing terms only in arrays is not enough.",
    "- Do not use ConceptPlan.avoid_patterns.",
    "- Keep UI text concise Simplified Chinese.",
    "- Never use raw placeholders, HTML, Markdown, {result}, {output1}, or generic labels like key variable / similar concept / mechanism / result as the actual educational content.",
    "- Pattern choice must match knowledge structure: deterministic optimization/planning/constraints should avoid probability unless the topic itself is about uncertainty.",
    "- Each step should ask the user to do something: guess, choose, sort, connect, slide, compare, or simulate.",
  ].filter(Boolean).join("\n");
}

export async function generateDynamicFlow(
  input: DynamicFlowInput,
  { includeRaw = false } = {},
): Promise<DynamicFlowGenerationResult> {
  const topic = cleanTopic(input.topic);
  const preferredPattern = normalizePreference(input.preferredPattern || "auto");
  const fallbackPlan = makeFallbackConceptPlan(topic, preferredPattern);
  const fallback = makeFallbackFlowFromPlan(fallbackPlan, preferredPattern);
  const model = getLLMProvider();

  if (!model) {
    return {
      flow: fallback,
      source: "mock",
      validation_error: "DEEPSEEK_API_KEY is not configured; using a topic-aware fallback Flow.",
      concept_plan: fallbackPlan,
    };
  }

  try {
    const planResult = await generateConceptPlan(model, topic, preferredPattern, includeRaw);
    const plan = planResult.plan;
    const plannedFallback = makeFallbackFlowFromPlan(plan, preferredPattern);

    if (planResult.source === "mock") {
      return {
        flow: plannedFallback,
        source: "mock",
        validation_error: planResult.error,
        raw_plan_output: planResult.raw_output,
        concept_plan: plan,
      };
    }

    const system = buildDynamicSystemPrompt(topic, preferredPattern, plan);
    const result = await retryGenerateText({
      model,
      system,
      messages: [{ role: "user", content: buildFlowUserPrompt(topic, plan) }],
    });
    const parsed = parseJson(result.text);
    const normalized = normalizeGeneratedFlow(parsed, topic, preferredPattern, plan);
    const grounding = evaluateFlowGrounding(normalized.flow, topic, normalized.groundingTerms, preferredPattern);
    const planFit = evaluateFlowAgainstPlan(normalized.flow, plan, preferredPattern);

    if (grounding.ok && planFit.ok) {
      return {
        flow: normalized.flow,
        source: "llm",
        validation_error: [planResult.error, normalized.error].filter(Boolean).join(" | ") || undefined,
        raw_output: includeRaw ? result.text : undefined,
        raw_plan_output: planResult.raw_output,
        concept_plan: plan,
      };
    }

    const repairReason = [grounding.reason, planFit.reason].filter(Boolean).join("; ");
    const repair = await retryGenerateText({
      model,
      system,
      messages: [{ role: "user", content: buildRepairUserPrompt(topic, preferredPattern, repairReason, result.text, plan) }],
    });
    const repaired = normalizeGeneratedFlow(parseJson(repair.text), topic, preferredPattern, plan);
    const repairedGrounding = evaluateFlowGrounding(repaired.flow, topic, repaired.groundingTerms, preferredPattern);
    const repairedPlanFit = evaluateFlowAgainstPlan(repaired.flow, plan, preferredPattern);

    if (repairedGrounding.ok && repairedPlanFit.ok) {
      return {
        flow: repaired.flow,
        source: "llm",
        validation_error: [
          planResult.error,
          normalized.error,
          "Initial Flow validation failed and was repaired: " + repairReason,
        ].filter(Boolean).join(" | ") || undefined,
        raw_output: includeRaw ? repair.text : undefined,
        raw_plan_output: planResult.raw_output,
        concept_plan: plan,
      };
    }

    return {
      flow: plannedFallback,
      source: "mock",
      validation_error: [
        planResult.error,
        "Flow validation failed: " + repairReason,
        "Repair failed: " + [repairedGrounding.reason, repairedPlanFit.reason].filter(Boolean).join("; "),
      ].filter(Boolean).join(" | "),
      raw_output: includeRaw ? repair.text : undefined,
      raw_plan_output: planResult.raw_output,
      concept_plan: plan,
    };
  } catch (error) {
    return {
      flow: fallback,
      source: "mock",
      validation_error: "Dynamic Flow generation exception: " + (error instanceof Error ? error.message : String(error)),
      concept_plan: fallbackPlan,
    };
  }
}

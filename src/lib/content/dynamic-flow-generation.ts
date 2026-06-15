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

export interface DynamicFlowGenerationResult {
  flow: KnowledgeFlow;
  source: "llm" | "mock";
  validation_error?: string;
  raw_output?: string;
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

function buildRepairUserPrompt(topic: string, preferredPattern: FlowPatternPreference, reason: string, previousOutput: string) {
  const preferred = preferredPattern === "auto" ? "AI 推荐 Pattern" : `用户指定 Pattern: ${preferredPattern}`;
  const clippedOutput = previousOutput.slice(0, 6000);
  return `上一次输出没有通过趣灵的贴题校验。
失败原因：${reason}
主题：${topic}
Pattern 要求：${preferred}

请重新生成完整 JSON，不要解释。
修复要求：
- 先提炼 3-5 个 grounding_terms，它们必须是这个主题的专业锚点，不要写“概念/机制/变量/结果/关键”这类空词。
- 三关的题目、选项、模块、滑块、解析都要围绕这些专业锚点展开。
- 如果失败原因提到 Pattern 选择不合适，必须换成更贴合主题结构的 Pattern，不要继续使用 probability 抽卡模板。
- 不要出现“相近概念”“这个概念”“关键变量”这类占位文案。
- 如果主题是英文或缩写，保留原词，同时给出对应的专业语义。

上一次输出如下，只作为反例参考：
${clippedOutput}`;
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

function normalizeGeneratedFlow(raw: unknown, topicInput: string, preferredPattern: FlowPatternPreference) {
  const fallback = makeFallbackFlow(topicInput, preferredPattern);
  const root = asRecord(raw);
  const candidate = asRecord(root?.flow) || root;
  if (!candidate) return { flow: fallback, error: "LLM 输出不是对象", groundingTerms: [] };

  const topic = cleanTopic(topicInput);
  const concepts = Array.isArray(candidate.concepts)
    ? candidate.concepts.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 5)
    : fallback.concepts;
  const groundingTerms = normalizeGroundingTerms(candidate.grounding_terms ?? candidate.groundingTerms, topic, concepts);
  const patternChain = fallbackPatternChain(preferredPattern);
  const rawPlays = Array.isArray(candidate.plays) ? candidate.plays.slice(0, 3) : [];
  const plays = rawPlays.map((rawPlay, index) => {
    const record = asRecord(rawPlay) || {};
    const fallbackPattern = patternChain[index] || "knowledge_check";
    const schema = repairSchema(record.schema, fallbackPattern, topic, groundingTerms);
    return {
      id: cleanText(record.id, `dynamic-${index + 1}`, 48),
      title: cleanText(record.title, fallback.plays[index]?.title || `第 ${index + 1} 关`, 18),
      concept: cleanText(record.concept, topic, 28),
      schema,
      estimated_minutes: typeof record.estimated_minutes === "number" ? Math.max(1, Math.min(3, Math.round(record.estimated_minutes))) : 1,
      reward_copy: cleanText(record.reward_copy, fallback.plays[index]?.reward_copy || "你又想通了一层。", 48),
    } satisfies KnowledgePlay;
  });

  while (plays.length < 3) {
    plays.push(makeFallbackPlay(topic, patternChain[plays.length] || "knowledge_check", plays.length, groundingTerms));
  }

  if (preferredPattern !== "auto" && !plays.some((play) => "pattern" in play.schema && play.schema.pattern === preferredPattern)) {
    plays[1] = makeFallbackPlay(topic, preferredPattern, 1, groundingTerms);
  }


  return {
    flow: {
      id: makeDynamicId(topic),
      title: cleanText(candidate.title, `${topic}入门`, 18),
      concept: topic,
      hook: cleanText(candidate.hook, `用三关看懂${topic}。`, 42),
      description: cleanText(candidate.description, `把${topic}拆成能动手理解的三关。`, 80),
      category: coerceCategory(candidate.category),
      topic_area: cleanText(candidate.topic_area, "自由生成", 16),
      difficulty: coerceDifficulty(candidate.difficulty),
      estimated_minutes: plays.reduce((total, play) => total + play.estimated_minutes, 0),
      summary: cleanText(candidate.summary, fallback.summary, 100),
      concepts,
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

function buildDynamicSystemPrompt(topic: string, preferredPattern: FlowPatternPreference) {
  const patternDirectory = Object.entries(SCHEMA_CATALOG)
    .map(([pattern, item]) => `- ${pattern}: ${PATTERN_LABELS[pattern as PatternType]}；templates: ${item.templates.join(" | ")}`)
    .join("\n");
  const preferenceRule = preferredPattern === "auto"
    ? "Pattern 由你根据知识结构自动选择，三关必须形成「先猜 -> 建立理解 -> 动手验证」的链条。"
    : `用户指定核心 Pattern 为 ${preferredPattern}（${PATTERN_LABELS[preferredPattern]}），plays 中至少一关的 schema.pattern 必须等于 ${preferredPattern}。`;

  return `你是趣灵 aha-flash 的动态 Flow 设计器。
用户输入任何想理解的知识，你要把它变成 exactly 3 个可以互动的微挑战关卡。
只输出合法 JSON，不要 Markdown，不要解释。

用户想理解的主题：${topic}
${preferenceRule}

允许的 Pattern：
${patternDirectory}

输出 JSON 结构：
{
  "title": "2-8字标题",
  "concept": "核心概念",
  "hook": "一句短问题",
  "description": "一句说明",
  "category": "科技|经济|哲学|心理|历史|数理",
  "topic_area": "短领域名",
  "difficulty": "轻松|进阶|烧脑一点",
  "summary": "完成三关后的总结",
  "grounding_terms": ["专业锚点1", "专业锚点2", "专业锚点3"],
  "concepts": ["概念1", "概念2", "概念3"],
  "follow_ups": [
    { "title": "下一步标题", "concept": "延伸概念", "relation": "和当前概念的关系", "hook": "一句吸引人的问题", "suggestedPattern": "comparison" }
  ],
  "plays": [
    {
      "id": "step-1",
      "title": "2-6字动作标题",
      "concept": "本关概念",
      "estimated_minutes": 1,
      "reward_copy": "克制的完成反馈",
      "schema": { "pattern": "...", "template": "...", "version": "2.0", "depth": "rapid", "payload": {...}, "visual_asset": {"tag":"...","mood":"idle"} }
    }
  ]
}

硬性规则：
- plays 必须 exactly 3 项。
- 每个 schema 必须能通过对应 Pattern 的 payload 校验。
- 所有文本必须是纯文本，禁止 HTML、Markdown、花括号占位符。
- 每一关都要让用户做动作，不要只输出定义。
- concept 必须保留用户输入的原词或极短同义名；不要把完整定义塞进 concept 或 payload.title。
- Pattern 选择要匹配知识结构：probability 只用于概率/随机/风险/期权/保险/贝叶斯/预测/分布；优化、规划、约束、目标函数、可行域、算法、系统流程类主题优先用 system_builder、parameter_explore、simulation_play、knowledge_check，禁止套抽卡/期权隐喻。
- grounding_terms 必须是 3-5 个专业锚点，禁止写“概念/机制/变量/结果/关键”这类空词。
- 三关内容必须实际使用 grounding_terms，不能只在数组里列出来。
- follow_ups 必须给 2-3 个 AI 延伸方向，suggestedPattern 必须是允许的 Pattern 之一。
- 标题和 hook 要短，不要靠省略号截断。`;
}

export async function generateDynamicFlow(
  input: DynamicFlowInput,
  { includeRaw = false } = {},
): Promise<DynamicFlowGenerationResult> {
  const topic = cleanTopic(input.topic);
  const preferredPattern = normalizePreference(input.preferredPattern || "auto");
  const fallback = makeFallbackFlow(topic, preferredPattern);
  const model = getLLMProvider();

  if (!model) {
    return {
      flow: fallback,
      source: "mock",
      validation_error: "DEEPSEEK_API_KEY 未配置，使用按输入主题生成的 fallback Flow。",
    };
  }

  try {
    const system = buildDynamicSystemPrompt(topic, preferredPattern);
    const result = await retryGenerateText({
      model,
      system,
      messages: [{ role: "user", content: `为「${topic}」生成三关 Flow。` }],
    });
    const parsed = parseJson(result.text);
    const normalized = normalizeGeneratedFlow(parsed, topic, preferredPattern);
    const grounding = evaluateFlowGrounding(normalized.flow, topic, normalized.groundingTerms, preferredPattern);

    if (grounding.ok) {
      return {
        flow: normalized.flow,
        source: "llm",
        validation_error: normalized.error,
        raw_output: includeRaw ? result.text : undefined,
      };
    }

    const repair = await retryGenerateText({
      model,
      system,
      messages: [{ role: "user", content: buildRepairUserPrompt(topic, preferredPattern, grounding.reason, result.text) }],
    });
    const repaired = normalizeGeneratedFlow(parseJson(repair.text), topic, preferredPattern);
    const repairedGrounding = evaluateFlowGrounding(repaired.flow, topic, repaired.groundingTerms, preferredPattern);

    if (repairedGrounding.ok) {
      return {
        flow: repaired.flow,
        source: "llm",
        validation_error: [normalized.error, `初次贴题校验失败，已自动修复: ${grounding.reason}`].filter(Boolean).join(" | ") || undefined,
        raw_output: includeRaw ? repair.text : undefined,
      };
    }

    return {
      flow: fallback,
      source: "mock",
      validation_error: `贴题校验失败: ${grounding.reason} | 修复失败: ${repairedGrounding.reason}`,
      raw_output: includeRaw ? repair.text : undefined,
    };
  } catch (error) {
    return {
      flow: fallback,
      source: "mock",
      validation_error: `动态 Flow 生成异常: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

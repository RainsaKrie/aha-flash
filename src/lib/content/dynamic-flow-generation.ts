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

function baseSchema(pattern: PatternType, topic: string): UISchema {
  const title = `把${topic}玩明白`;
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
          { name: "核心机会", rarity: "5", probability: 20, value: 90 },
          { name: "普通路径", rarity: "4", probability: 50, value: 55 },
          { name: "误判风险", rarity: "3", probability: 30, value: 20 },
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
        variable_label: "关键变量",
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
          { front: "核心动作", back: `${topic}真正重要的是它让什么发生变化。` },
          { front: "关键条件", back: `先找出${topic}成立时必须具备的条件。` },
          { front: "常见误区", back: `不要只背定义，要看它在具体情境里怎么起作用。` },
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
        subject_a: "表面理解",
        subject_b: "机制理解",
        left: { label: "表面理解", content: `只记住${topic}的定义。` },
        right: { label: "机制理解", content: `看见${topic}如何改变选择、结果或系统。` },
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
          { label: "它改变了什么", correct: true, explanation: "概念的核心通常藏在它推动的变化里。" },
          { label: "它的字面名字", correct: false, explanation: "名字只是入口，不是理解本身。" },
          { label: "越复杂越准确", correct: false, explanation: "复杂不等于更接近机制。" },
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
          { id: "input", label: "输入条件", description: "事情开始前已有的条件。" },
          { id: "mechanism", label: "作用机制", description: "真正推动变化的部分。" },
          { id: "output", label: "结果反馈", description: "最后被观察到的变化。" },
        ],
        required_module_ids: ["input", "mechanism", "output"],
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

function makeFallbackPlay(topic: string, pattern: PatternType, index: number): KnowledgePlay {
  const titles = ["先猜一下", "看见机制", "动手验证"];
  return {
    id: `dynamic-${index + 1}`,
    title: titles[index] || "继续探索",
    concept: topic,
    schema: baseSchema(pattern, topic),
    estimated_minutes: index === 1 ? 2 : 1,
    reward_copy: ["你先抓住了问题的入口。", "你看见机制开始动起来了。", "这一关把线索连起来了。"][index] || "你又想通了一层。",
  };
}

function fallbackPatternChain(preferredPattern: FlowPatternPreference): PatternType[] {
  if (preferredPattern !== "auto") return ["knowledge_check", preferredPattern, "parameter_explore"];
  return ["knowledge_check", "concept_memory", "parameter_explore"];
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
      title: "找一个相近概念比较",
      concept: `${topic} vs 相近概念`,
      hook: "通过对比看清边界。",
      relation: "从单点理解走向边界辨析",
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
    concepts: [topic, "关键机制", "适用边界"],
    plays: patterns.map((pattern, index) => makeFallbackPlay(topic, pattern, index)),
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

function repairSchema(rawSchema: unknown, fallbackPattern: PatternType, topic: string): UISchema {
  const record = asRecord(rawSchema);
  if (!record) return baseSchema(fallbackPattern, topic);

  let pattern = typeof record.pattern === "string" ? record.pattern : "";
  let template = typeof record.template === "string" ? record.template : "";
  if (template.startsWith("v2_")) template = template.slice(3);

  if (!isPattern(pattern)) {
    const owner = templateOwner(pattern) || templateOwner(template);
    pattern = owner || fallbackPattern;
  }

  const catalog = SCHEMA_CATALOG[pattern as PatternType];
  if (!catalog) return baseSchema(fallbackPattern, topic);
  if (!template || !(catalog.templates as readonly string[]).includes(template)) template = catalog.defaultTemplate;

  const candidate = {
    ...record,
    pattern,
    template,
    version: typeof record.version === "string" ? record.version : "2.0",
    depth: record.depth === "scenario" || record.depth === "mapping" ? record.depth : "rapid",
    payload: record.payload || record.config || baseSchema(pattern as PatternType, topic).payload,
  } as UISchema;

  return validateSchema(candidate) || baseSchema(pattern as PatternType, topic);
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
  if (!candidate) return { flow: fallback, error: "LLM 输出不是对象" };

  const topic = cleanTopic(typeof candidate.concept === "string" ? candidate.concept : topicInput);
  const patternChain = fallbackPatternChain(preferredPattern);
  const rawPlays = Array.isArray(candidate.plays) ? candidate.plays.slice(0, 3) : [];
  const plays = rawPlays.map((rawPlay, index) => {
    const record = asRecord(rawPlay) || {};
    const fallbackPattern = patternChain[index] || "knowledge_check";
    const schema = repairSchema(record.schema, fallbackPattern, topic);
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
    plays.push(makeFallbackPlay(topic, patternChain[plays.length] || "knowledge_check", plays.length));
  }

  if (preferredPattern !== "auto" && !plays.some((play) => "pattern" in play.schema && play.schema.pattern === preferredPattern)) {
    plays[1] = makeFallbackPlay(topic, preferredPattern, 1);
  }

  const concepts = Array.isArray(candidate.concepts)
    ? candidate.concepts.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 5)
    : fallback.concepts;

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
    const result = await retryGenerateText({
      model,
      system: buildDynamicSystemPrompt(topic, preferredPattern),
      messages: [{ role: "user", content: `为「${topic}」生成三关 Flow。` }],
    });
    const parsed = parseJson(result.text);
    const normalized = normalizeGeneratedFlow(parsed, topic, preferredPattern);
    return {
      flow: normalized.flow,
      source: "llm",
      validation_error: normalized.error,
      raw_output: includeRaw ? result.text : undefined,
    };
  } catch (error) {
    return {
      flow: fallback,
      source: "mock",
      validation_error: `动态 Flow 生成异常: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

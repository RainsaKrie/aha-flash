import { retryGenerateText } from "@/lib/llm/retry-generate-text";
import { getLLMProvider } from "@/lib/llm/provider";
import { getSchemaErrors, validateSchema } from "@/lib/llm/schema-validator";
import {
  findFlowById,
  type KnowledgeFlow,
  type KnowledgePlay,
  type TopicCategory,
  type TopicDifficulty,
} from "@/lib/content/mock-flows";
import { SCHEMA_CATALOG, type PatternType, type UISchema } from "@/types/schema";

export interface FlowGenerationResult {
  flow: KnowledgeFlow;
  source: "llm" | "mock";
  validation_error?: string;
  raw_output?: string;
}

interface RawFlowCandidate {
  summary?: unknown;
  concepts?: unknown;
  plays?: unknown;
}

interface FlowTopicSpec {
  id: string;
  title: string;
  concept: string;
  hook: string;
  description: string;
  category: TopicCategory;
  topic_area: string;
  difficulty: TopicDifficulty;
  defaultConcepts: string[];
  flowPlan: string;
  schemaConstraints: string;
  contentConstraints: string;
  visualTags: string;
  userPrompt: string;
}

const BAYES_FLOW_ID = "bayes-starter";

const FLOW_TOPIC_SPECS: Record<string, FlowTopicSpec> = {
  "bayes-starter": {
    id: "bayes-starter",
    title: "贝叶斯入门",
    concept: "贝叶斯定理",
    hook: "看到新证据时，怎样更新原来的判断？",
    description: "用三关把先验、证据和后验连成一条判断更新链。",
    category: "数理",
    topic_area: "数理",
    difficulty: "轻松",
    defaultConcepts: ["先验", "证据强度", "后验"],
    flowPlan: `三关必须按这个节奏：
1. 引起好奇：knowledge_check / single_question。让用户先猜“看到新证据应该怎么更新判断”。
2. 建立术语：concept_memory / term_cards。三张卡分别解释先验、似然/证据强度、后验。
3. 看见机制：parameter_explore / single_slider。让用户调“证据强度”或“初始相信程度”，看判断如何变化。`,
    schemaConstraints: `- knowledge_check payload: title, question, options；options exactly 3 项，且只有一个 correct=true，每项必须使用 label 字段，不要用 text/name/content，每项都有 explanation。
- concept_memory payload: title, cards；cards exactly 3 项，每项 front/back。
- parameter_explore payload: title, variable_label, min, max, default_value, unit, explanation_template；scenarios exactly 3 项且每项只能是 { label, value }；outputs 至少 2 项且 model 只能是 linear/quadratic/exponential/inverse/logarithmic；insight_rules exactly 3 项且 when 只能是 low/mid/high、正文必须写在 text 字段。`,
    contentConstraints: `- 解释必须围绕“旧判断 + 新证据 -> 新判断”。
- 不要把贝叶斯写成单纯公式背诵。
- 滑块解释必须是完整自然语句；禁止输出 {result}、{output1}、{calculated} 这类未替换占位符。
- explanation_template 可以完全不依赖变量，优先写成“拖动滑块时，证据越强，更新后的判断越明显。”这种完整句子。`,
    visualTags: "check-spark / memory-terms / parameter-knob",
    userPrompt: "生成 bayes-starter 的 3 关 Flow Steps。",
  },
  "industrial-revolution": {
    id: "industrial-revolution",
    title: "工业革命",
    concept: "工业革命",
    hook: "为什么几台机器会改变整个社会的节奏？",
    description: "沿着时间线看能源、工厂和城市如何互相推着走。",
    category: "历史",
    topic_area: "历史",
    difficulty: "进阶",
    defaultConcepts: ["能源", "工厂制", "城市化"],
    flowPlan: `三关必须按这个节奏：
1. 引起好奇：knowledge_check / single_question。让用户先猜工业革命不是“某台机器突然出现”，而是一组机制互相推动。
2. 沿时间走：process_timeline / horizontal_timeline。用 4-5 个节点串起能源、机器、工厂制、城市化、市场扩张。
3. 抓住连锁反应：concept_memory / term_cards 或 process_timeline / vertical_scroll。让用户理解能源、机器、组织方式如何互相放大。`,
    schemaConstraints: `- knowledge_check payload: title, question, options；options exactly 3 项，且只有一个 correct=true，每项必须使用 label 字段，不要用 text/name/content，每项都有 explanation。
- process_timeline payload: title, events；events 4-5 项，每项必须是 { label, description }，label 是短阶段名，description 是这个阶段如何推动下一阶段的因果句。
- concept_memory payload: title, cards；cards exactly 3 项，每项 front/back。`,
    contentConstraints: `- 不要写成年表背诵；每个节点都要解释“它如何推着下一步发生”。
- 必须让用户看见“能源 -> 机器 -> 工厂组织 -> 城市与市场”的连锁反应。
- 禁止只归因于瓦特、蒸汽机或某一年份。`,
    visualTags: "check-spark / timeline-path / memory-terms",
    userPrompt: "生成 industrial-revolution 的 3 关 Flow Steps。",
  },
  "inflation-deflation": {
    id: "inflation-deflation",
    title: "通胀 vs 通缩",
    concept: "通货膨胀与通货紧缩",
    hook: "价格整体上涨和整体下跌，为什么都会影响普通人的选择？",
    description: "用对比维度看价格、现金、债务和消费决策如何一起变化。",
    category: "经济",
    topic_area: "经济",
    difficulty: "轻松",
    defaultConcepts: ["价格水平", "购买力", "债务压力"],
    flowPlan: `三关必须按这个节奏：
1. 引起好奇：knowledge_check / single_question。让用户先猜“物价普遍上涨/下跌”会怎样影响现金和债务。
2. 左右对比：comparison / split_panel。对比通胀和通缩，至少 4 个 dimensions：价格方向、现金购买力、债务负担、消费/投资行为。
3. 把误区拆开：comparison / overlay_fade 或 knowledge_check / single_question。强调通缩不是“东西便宜所以一定好”，通胀也不是“所有人都同样受损”。`,
    schemaConstraints: `- knowledge_check payload: title, question, options；options exactly 3 项，且只有一个 correct=true，每项必须使用 label 字段，不要用 text/name/content，每项都有 explanation。
- comparison payload: title, left, right, subject_a, subject_b, dimensions, summary。
- comparison left/right 必须是 { label, content }；subject_a 固定写“通货膨胀”，subject_b 固定写“通货紧缩”。
- dimensions 至少 4 项，每项必须是 { label, a, b, insight }，label 是维度名，a 写通胀侧，b 写通缩侧，insight 写一句可行动理解。`,
    contentConstraints: `- 不要把通胀简单写成坏、通缩简单写成好；重点解释它们如何改变购买力、债务和行为。
- 对比维度要互相平行，避免一边讲定义、一边讲案例。
- 每关都必须能让用户做选择或切换维度，不要只读定义。`,
    visualTags: "check-spark / compare-lens",
    userPrompt: "生成 inflation-deflation 的 3 关 Flow Steps。",
  },
};

const COMMON_OUTPUT_PROMPT = `输出结构：
{
  "summary": "一句话总结这个 Flow 让用户理解了什么",
  "concepts": ["概念1", "概念2", "概念3"],
  "plays": [
    {
      "id": "flow-step-1",
      "title": "2-6 字动作标题",
      "concept": "本关概念",
      "estimated_minutes": 1,
      "reward_copy": "用户完成后的轻量奖励文案",
      "schema": { 一个合法 V2 Generative UI Schema }
    }
  ]
}`;

const COMMON_SCHEMA_PROMPT = `Schema 通用硬约束：
- 每个 schema 必须包含 pattern, template, version, depth, payload。
- depth 固定为 "rapid"。
- 不输出 HTML 标签；所有文本必须是纯文本。
- 每个 payload 尽量包含 metaphor_trace，但缺失不影响。
- visual_asset 可选，tag 只能从本话题允许的 tag 中选择。`;

const COMMON_COPY_PROMPT = `文案约束：
- 文案要像小游戏提示，不像教材定义。
- 每关都必须让用户做动作，而不是只读解释。
- reward_copy 要克制，像“你又想通了一层”“你看见机制动起来了”“这一步把线索连起来了”。禁止“工具箱更新了”“卡片已入库”“魔力”“升级版”等过度游戏化说法。`;

function getFlowTopicSpec(flowId: string) {
  return FLOW_TOPIC_SPECS[flowId] || null;
}

export function isLLMFlowSupported(flowId: string) {
  return Boolean(getFlowTopicSpec(flowId));
}

function buildSystemPrompt(spec: FlowTopicSpec) {
  return `你是趣灵 aha-flash 的 Flow Steps 设计器。

产品定位：知识版休闲游戏，不是教材、不是考试辅导。用户想在 3-5 分钟里轻松获得“啊哈，我好像懂了”的感觉。

任务：为“${spec.concept}”生成 exactly 3 个微挑战关卡。只输出合法 JSON，不要 Markdown，不要解释。

${COMMON_OUTPUT_PROMPT}

默认概念词：${spec.defaultConcepts.join(" / ")}

${spec.flowPlan}

${COMMON_SCHEMA_PROMPT}
- 本话题允许的 visual_asset tag：${spec.visualTags}。

本话题 schema 约束：
${spec.schemaConstraints}

${COMMON_COPY_PROMPT}

本话题内容约束：
${spec.contentConstraints}`;
}

function fallbackFlow(spec: FlowTopicSpec) {
  return findFlowById(spec.id) || findFlowById(BAYES_FLOW_ID);
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

function parseFlowJson(text: string) {
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

function isAllowedOutputModel(value: unknown) {
  return value === "linear" || value === "quadratic" || value === "exponential" || value === "inverse" || value === "logarithmic";
}

function coerceString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function coerceNumber(value: unknown, fallback: number) {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(number) ? number : fallback;
}

function hasUnresolvedPlaceholder(value: unknown) {
  return typeof value === "string" && /\{[^{}]+\}|\{\{[^{}]+\}\}/.test(value);
}

function sanitizeSliderExplanation(value: unknown) {
  if (typeof value !== "string" || !value.trim() || hasUnresolvedPlaceholder(value)) {
    return "拖动滑块时，证据越强，更新后的判断越明显。";
  }
  return value.trim();
}

function sanitizePlainText(value: unknown, fallback: string) {
  const text = coerceString(value);
  if (!text || hasUnresolvedPlaceholder(text)) return fallback;
  return text.replace(/<[^>]+>/g, "").trim() || fallback;
}

function sanitizeRewardCopy(value: unknown, index: number) {
  const fallback = [
    "你又想通了一层。",
    "你看见机制动起来了。",
    "这一步把线索连起来了。",
  ][index] || "你又想通了一层。";

  if (typeof value !== "string" || !value.trim()) return fallback;

  const cleaned = value
    .replace(/[🎉👏🧠⚡✨✓✅]/g, "")
    .replace(/卡片已入库|工具箱更新了|贝叶斯工具箱更新了|升级版|魔力|跳舞/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || /(工具箱|入库|魔力|升级|跳舞)/.test(cleaned)) return fallback;
  return cleaned.slice(0, 60);
}

function repairTimelinePayload(next: Record<string, unknown>) {
  if (!Array.isArray(next.events) && Array.isArray(next.timeline)) next.events = next.timeline;
  if (!Array.isArray(next.events) && Array.isArray(next.stages)) next.events = next.stages;
  if (!Array.isArray(next.events) && Array.isArray(next.milestones)) next.events = next.milestones;

  if (Array.isArray(next.events)) {
    next.events = next.events.slice(0, 6).map((raw, index) => {
      const event = asRecord(raw) || {};
      return {
        label: sanitizePlainText(event.label ?? event.title ?? event.name ?? event.year, `阶段 ${index + 1}`),
        description: sanitizePlainText(
          event.description ?? event.text ?? event.content ?? event.detail,
          "这一阶段推动了后续变化。",
        ),
      };
    });
  }
}

function repairComparisonPayload(next: Record<string, unknown>) {
  const subjects = Array.isArray(next.subjects) ? next.subjects.map((item) => asRecord(item) || item) : [];
  const subjectA = coerceString(next.subject_a, next.a_label, next.left_label, asRecord(next.left)?.label, asRecord(subjects[0])?.label, subjects[0]);
  const subjectB = coerceString(next.subject_b, next.b_label, next.right_label, asRecord(next.right)?.label, asRecord(subjects[1])?.label, subjects[1]);

  function repairSide(value: unknown, fallbackLabel: string, fallbackContent: string) {
    const side = asRecord(value);
    if (side) {
      return {
        label: sanitizePlainText(side.label ?? side.title ?? side.name, fallbackLabel),
        content: sanitizePlainText(side.content ?? side.description ?? side.text ?? side.summary, fallbackContent),
      };
    }
    if (typeof value === "string" && value.trim()) {
      return { label: fallbackLabel, content: sanitizePlainText(value, fallbackContent) };
    }
    return { label: fallbackLabel, content: fallbackContent };
  }

  next.subject_a = subjectA || "左侧概念";
  next.subject_b = subjectB || "右侧概念";
  next.left = repairSide(next.left, String(next.subject_a), coerceString(next.a, next.left_content) || "这一侧代表第一种机制。");
  next.right = repairSide(next.right, String(next.subject_b), coerceString(next.b, next.right_content) || "这一侧代表第二种机制。");

  if (!Array.isArray(next.dimensions) && Array.isArray(next.comparison_dimensions)) next.dimensions = next.comparison_dimensions;
  if (!Array.isArray(next.dimensions) && Array.isArray(next.rows)) next.dimensions = next.rows;

  if (Array.isArray(next.dimensions)) {
    next.dimensions = next.dimensions.slice(0, 6).map((raw, index) => {
      const dimension = asRecord(raw) || {};
      return {
        label: sanitizePlainText(dimension.label ?? dimension.name ?? dimension.dimension, `维度 ${index + 1}`),
        a: sanitizePlainText(dimension.a ?? dimension.left ?? dimension.subject_a ?? dimension.inflation, "第一侧在这个维度上的表现。"),
        b: sanitizePlainText(dimension.b ?? dimension.right ?? dimension.subject_b ?? dimension.deflation, "第二侧在这个维度上的表现。"),
        insight: sanitizePlainText(dimension.insight ?? dimension.summary ?? dimension.takeaway, "这个维度帮助你看清两者的关键差异。"),
      };
    });
  }

  next.summary = sanitizePlainText(next.summary, `${String(next.subject_a)} 和 ${String(next.subject_b)} 的差异会改变人的选择。`);
}

function repairPayload(payload: unknown) {
  const record = asRecord(payload);
  if (!record) return payload;
  const next = { ...record };

  next.title = sanitizePlainText(next.title, "互动小关");

  if (Array.isArray(next.options)) {
    next.options = next.options.map((raw) => {
      const option = asRecord(raw) || {};
      return {
        ...option,
        label: sanitizePlainText(option.label ?? option.text ?? option.title ?? option.content ?? option.choice_label, "一个选项"),
        correct: option.correct === true,
        explanation: sanitizePlainText(option.explanation ?? option.reason ?? option.feedback, "这一步帮助你区分概念真正的动作。"),
      };
    });
  }

  if (Array.isArray(next.cards)) {
    next.cards = next.cards.map((raw) => {
      const card = asRecord(raw) || {};
      return {
        ...card,
        front: sanitizePlainText(card.front ?? card.term ?? card.label ?? card.title, "关键词"),
        back: sanitizePlainText(card.back ?? card.meaning ?? card.description ?? card.content, "把这个词放回机制链里理解。"),
      };
    });
  }

  repairTimelinePayload(next);
  repairComparisonPayload(next);

  if (!Array.isArray(next.scenarios) && Array.isArray(next.scenario_buttons)) next.scenarios = next.scenario_buttons;
  if (!Array.isArray(next.scenarios) && Array.isArray(next.presets)) next.scenarios = next.presets;
  if (Array.isArray(next.scenarios)) {
    const fallbackValues = [20, 60, 90];
    next.scenarios = next.scenarios.map((raw, index) => {
      const scenario = asRecord(raw) || {};
      return {
        ...scenario,
        label: sanitizePlainText(scenario.label ?? scenario.name ?? scenario.title, ["低", "中", "高"][index] || `场景 ${index + 1}`),
        value: coerceNumber(scenario.value, fallbackValues[index] ?? 50),
      };
    });
  }

  if (!Array.isArray(next.outputs) && Array.isArray(next.results)) next.outputs = next.results;
  if (!Array.isArray(next.outputs) && Array.isArray(next.metrics)) next.outputs = next.metrics;
  if (Array.isArray(next.outputs)) {
    const fallbackModels = ["linear", "exponential", "quadratic"];
    next.outputs = next.outputs.map((raw, index) => {
      const output = asRecord(raw) || {};
      return {
        ...output,
        label: sanitizePlainText(output.label ?? output.name ?? output.title, ["结果变化", "影响幅度", "不确定性"][index] || `结果 ${index + 1}`),
        model: isAllowedOutputModel(output.model) ? output.model : fallbackModels[index] || "linear",
        expression_label: coerceString(output.expression_label, output.expression, output.formula) || undefined,
        description: coerceString(output.description, output.explanation, output.text) || undefined,
      };
    });
  }

  if (!Array.isArray(next.insight_rules) && Array.isArray(next.insights)) next.insight_rules = next.insights;
  if (!Array.isArray(next.insight_rules) && Array.isArray(next.feedback_rules)) next.insight_rules = next.feedback_rules;
  if (Array.isArray(next.insight_rules)) {
    const fallbackWhen = ["low", "mid", "high"] as const;
    next.insight_rules = next.insight_rules.map((raw, index) => {
      const rule = asRecord(raw) || {};
      const when = rule.when === "low" || rule.when === "mid" || rule.when === "high" ? rule.when : fallbackWhen[index] || "mid";
      return {
        ...rule,
        when,
        text: sanitizePlainText(rule.text ?? rule.description ?? rule.insight ?? rule.content ?? rule.message, "变量变化会推动结果朝一个方向移动。"),
      };
    });
  }

  next.explanation_template = sanitizeSliderExplanation(next.explanation_template);

  return next;
}

function applyPatternDefaults(pattern: unknown, payload: unknown) {
  const next = asRecord(payload);
  if (!next) return payload;

  if (pattern === "parameter_explore") {
    next.variable_label = sanitizePlainText(next.variable_label, "关键变量");
    next.min = typeof next.min === "number" ? next.min : 0;
    next.max = typeof next.max === "number" ? next.max : 100;
    next.default_value = typeof next.default_value === "number" ? next.default_value : 50;
    next.unit = typeof next.unit === "string" ? next.unit : "%";
    next.explanation_template = sanitizeSliderExplanation(next.explanation_template);

    if (!Array.isArray(next.scenarios) || next.scenarios.length < 3) {
      next.scenarios = [
        { label: "低", value: 20 },
        { label: "中", value: 50 },
        { label: "高", value: 85 },
      ];
    }
    if (!Array.isArray(next.outputs) || next.outputs.length < 2) {
      next.outputs = [
        { label: "结果变化", model: "linear", min: 0, max: 100, default: 50 },
        { label: "影响幅度", model: "logarithmic", min: 0, max: 40, default: 12 },
      ];
    }
    if (!Array.isArray(next.insight_rules) || next.insight_rules.length < 3) {
      next.insight_rules = [
        { when: "low", text: "变量较低时，结果变化不明显。" },
        { when: "mid", text: "变量处在中间时，结果开始出现可见变化。" },
        { when: "high", text: "变量较高时，结果会明显偏向被它推动的一侧。" },
      ];
    }
  }

  if (pattern === "process_timeline" && (!Array.isArray(next.events) || next.events.length < 4)) {
    next.events = [
      { label: "起点", description: "第一个条件出现，推动后续变化开始。" },
      { label: "放大", description: "新的机制形成，促使变化继续扩大。" },
      { label: "组织", description: "更多人和资源被卷入，使变化从局部走向系统。" },
      { label: "反馈", description: "系统结果反过来推动起点继续增强。" },
    ];
  }

  if (pattern === "comparison") {
    if (!Array.isArray(next.dimensions) || next.dimensions.length < 4) {
      const subjectA = coerceString(next.subject_a, asRecord(next.left)?.label) || "A";
      const subjectB = coerceString(next.subject_b, asRecord(next.right)?.label) || "B";
      next.dimensions = [
        { label: "方向", a: `${subjectA} 的主要方向`, b: `${subjectB} 的主要方向`, insight: "先看方向，才能避免把两者混成一个概念。" },
        { label: "影响", a: `${subjectA} 的直接影响`, b: `${subjectB} 的直接影响`, insight: "影响对象不同，实际选择也会不同。" },
        { label: "风险", a: `${subjectA} 的风险`, b: `${subjectB} 的风险`, insight: "风险维度帮助判断它们各自的问题。" },
        { label: "行为", a: `${subjectA} 会推动一种行为`, b: `${subjectB} 会推动另一种行为`, insight: "真正重要的是它们如何改变人的行为。" },
      ];
    }
  }

  return next;
}
function getPatternForTemplate(template: string) {
  for (const [pattern, item] of Object.entries(SCHEMA_CATALOG)) {
    if ((item.templates as readonly string[]).includes(template)) return pattern as PatternType;
  }
  return null;
}

function normalizePatternTemplate(record: Record<string, unknown>): Record<string, unknown> {
  let pattern = typeof record.pattern === "string" ? record.pattern : "";
  let template = typeof record.template === "string" ? record.template : "";

  if (template.startsWith("v2_")) template = template.slice(3);

  const patternCatalog = SCHEMA_CATALOG[pattern as PatternType];
  const templateAsPattern = SCHEMA_CATALOG[template as PatternType];
  const patternAsTemplateOwner = pattern ? getPatternForTemplate(pattern) : null;

  if (!patternCatalog && templateAsPattern && patternAsTemplateOwner) {
    const originalPattern = pattern;
    pattern = template;
    template = originalPattern;
  } else if (!patternCatalog && patternAsTemplateOwner) {
    template = pattern;
    pattern = patternAsTemplateOwner;
  }

  const nextCatalog = SCHEMA_CATALOG[pattern as PatternType];
  if (nextCatalog) {
    const allowedTemplates = nextCatalog.templates as readonly string[];
    if (!template || template === "v1" || template === "v2" || !allowedTemplates.includes(template)) {
      template = nextCatalog.defaultTemplate;
    }
  }

  return {
    ...record,
    pattern,
    template,
    version: typeof record.version === "string" && record.version.trim() ? record.version : "2.0",
  };
}

function repairSchemaCandidate(rawSchema: unknown) {
  const record = asRecord(rawSchema);
  if (!record) return rawSchema;
  const normalized = normalizePatternTemplate(record);
  if (normalized.payload) {
    const repairedPayload = repairPayload(normalized.payload);
    return { ...normalized, payload: applyPatternDefaults(normalized.pattern, repairedPayload) };
  }
  if (normalized.config) {
    const repairedConfig = repairPayload(normalized.config);
    return { ...normalized, config: applyPatternDefaults(normalized.pattern, repairedConfig) };
  }
  return normalized;
}

function normalizePlay(rawPlay: unknown, index: number, spec: FlowTopicSpec): { play: KnowledgePlay | null; error?: string } {
  const record = asRecord(rawPlay);
  if (!record) return { play: null, error: `plays[${index}] 不是对象` };

  const repairedSchema = repairSchemaCandidate(record.schema);
  const schema = validateSchema(repairedSchema);
  if (!schema) {
    return {
      play: null,
      error: `plays[${index}].schema 无法通过校验: ${getSchemaErrors(repairedSchema)}`,
    };
  }

  const title = typeof record.title === "string" && record.title.trim() ? record.title.trim().slice(0, 18) : `第 ${index + 1} 关`;
  const concept = typeof record.concept === "string" && record.concept.trim() ? record.concept.trim().slice(0, 24) : spec.concept;
  const minutes = typeof record.estimated_minutes === "number" && Number.isFinite(record.estimated_minutes)
    ? Math.max(1, Math.min(3, Math.round(record.estimated_minutes)))
    : 1;

  return {
    play: {
      id: typeof record.id === "string" && record.id.trim() ? record.id.trim().slice(0, 40) : `${spec.id}-llm-${index + 1}`,
      title,
      concept,
      schema: schema as UISchema,
      estimated_minutes: minutes,
      reward_copy: sanitizeRewardCopy(record.reward_copy, index),
    },
  };
}

function normalizeGeneratedFlow(raw: unknown, spec: FlowTopicSpec): { flow: KnowledgeFlow | null; error?: string } {
  const root = asRecord(raw);
  const candidate = (asRecord(root?.flow) || root) as RawFlowCandidate | null;
  if (!candidate) return { flow: null, error: "Flow 输出不是对象" };

  if (!Array.isArray(candidate.plays)) return { flow: null, error: "Flow 缺少 plays 数组" };
  if (candidate.plays.length !== 3) return { flow: null, error: `plays 数量必须为 3，实际为 ${candidate.plays.length}` };

  const plays: KnowledgePlay[] = [];
  const errors: string[] = [];
  candidate.plays.forEach((rawPlay, index) => {
    const result = normalizePlay(rawPlay, index, spec);
    if (result.play) plays.push(result.play);
    if (result.error) errors.push(result.error);
  });

  if (errors.length > 0 || plays.length !== 3) return { flow: null, error: errors.join("\n") };

  return {
    flow: {
      id: spec.id,
      title: spec.title,
      concept: spec.concept,
      hook: spec.hook,
      description: spec.description,
      category: spec.category,
      topic_area: spec.topic_area,
      difficulty: spec.difficulty,
      estimated_minutes: plays.reduce((total, play) => total + play.estimated_minutes, 0),
      summary: typeof candidate.summary === "string" && candidate.summary.trim()
        ? candidate.summary.trim().slice(0, 100)
        : spec.description,
      concepts: Array.isArray(candidate.concepts)
        ? candidate.concepts.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 5)
        : spec.defaultConcepts,
      plays,
    },
  };
}

export async function generateFlowSteps(flowId = BAYES_FLOW_ID, { includeRaw = false } = {}): Promise<FlowGenerationResult> {
  const spec = getFlowTopicSpec(flowId);
  if (!spec) {
    const fallback = findFlowById(flowId) || findFlowById(BAYES_FLOW_ID);
    if (!fallback) throw new Error(`${flowId} mock flow is missing`);
    return {
      flow: fallback,
      source: "mock",
      validation_error: `${flowId} 尚未接入 LLM Flow Steps。`,
    };
  }

  const fallback = fallbackFlow(spec);
  if (!fallback) throw new Error(`${spec.id} mock flow is missing`);

  const model = getLLMProvider();
  if (!model) {
    return {
      flow: fallback,
      source: "mock",
      validation_error: "DEEPSEEK_API_KEY 未配置，使用 mock Flow。",
    };
  }

  try {
    const result = await retryGenerateText({
      model,
      system: buildSystemPrompt(spec),
      messages: [{ role: "user", content: spec.userPrompt }],
    }, { jsonOutput: true, jsonName: "knowledge_flow" });
    const parsed = parseFlowJson(result.text);
    const normalized = normalizeGeneratedFlow(parsed, spec);

    if (!normalized.flow) {
      return {
        flow: fallback,
        source: "mock",
        validation_error: normalized.error || "LLM Flow 输出无法解析。",
        raw_output: includeRaw ? result.text : undefined,
      };
    }

    return {
      flow: normalized.flow,
      source: "llm",
      raw_output: includeRaw ? result.text : undefined,
    };
  } catch (error) {
    return {
      flow: fallback,
      source: "mock",
      validation_error: `LLM Flow 生成异常: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function generateBayesFlowSteps({ includeRaw = false } = {}): Promise<FlowGenerationResult> {
  return generateFlowSteps(BAYES_FLOW_ID, { includeRaw });
}
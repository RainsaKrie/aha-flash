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


const AGENT_RELEVANCE_TERMS = [
  "agent",
  "智能体",
  "目标",
  "规划",
  "计划",
  "工具",
  "调用",
  "执行",
  "观察",
  "反馈",
  "记忆",
  "环境",
  "工作流",
  "workflow",
  "chatbot",
  "自主",
];

function isAgentTopic(topic: string) {
  const normalized = topic.toLowerCase().replace(/\s+/g, "");
  return /\bagents?\b/i.test(topic) || normalized.includes("aiagent") || topic.includes("智能体") || topic.includes("工具调用");
}

function canonicalAgentConcept(topic: string) {
  if (/workflow|工作流|相近|类似|vs|VS|对比/.test(topic)) return "AI Agent vs 工作流";
  if (/chatbot|聊天|机器人/.test(topic)) return "AI Agent vs 聊天机器人";
  return "AI Agent";
}

function agentPatternChain(preferredPattern: FlowPatternPreference): PatternType[] {
  if (preferredPattern === "auto" || preferredPattern === "knowledge_check") return ["knowledge_check", "system_builder", "comparison"];
  return ["knowledge_check", preferredPattern, preferredPattern === "comparison" ? "system_builder" : "comparison"];
}

function agentCommon(pattern: PatternType) {
  return {
    version: "2.0",
    depth: "rapid" as const,
    visual_asset: { tag: VISUAL_TAGS[pattern], mood: "idle" as const },
    next_concepts: [],
  };
}

function agentSchema(pattern: PatternType, concept: string): UISchema {
  const common = agentCommon(pattern);

  if (pattern === "knowledge_check") {
    return {
      ...common,
      pattern,
      template: "single_question",
      payload: {
        title: "先分清 Agent",
        question: "AI Agent 和普通聊天机器人最关键的区别是什么？",
        options: [
          { label: "围绕目标规划步骤，并能调用工具执行", correct: true, explanation: "Agent 不只是回答文本，而是把目标拆成行动，调用工具，观察结果再调整。" },
          { label: "回答更长、更像真人", correct: false, explanation: "语气像不像人不是 Agent 的核心，能否行动和反馈才是关键。" },
          { label: "提前写好固定流程", correct: false, explanation: "固定流程更像 workflow；Agent 的特点是根据目标和反馈动态决策。" },
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
        title: "搭一个 Agent 执行闭环",
        target: "拼出 AI Agent 从目标到行动的核心结构",
        modules: [
          { id: "goal", label: "目标", description: "用户给出的任务或要达成的结果。", role: "start" },
          { id: "planner", label: "规划器", description: "把目标拆成可以执行的步骤。", role: "plan" },
          { id: "tool", label: "工具调用", description: "搜索、写文件、查数据库等外部能力。", role: "act" },
          { id: "observe", label: "观察反馈", description: "读取工具结果，判断下一步是否要调整。", role: "observe" },
          { id: "memory", label: "记忆状态", description: "保存上下文、偏好和已经完成的步骤。", role: "state" },
          { id: "tone", label: "说话风格", description: "会影响体验，但不是 Agent 能行动的必需模块。", role: "optional" },
        ],
        required_module_ids: ["goal", "planner", "tool", "observe", "memory"],
        expected_sequence: ["goal", "planner", "tool", "observe", "memory"],
        connections: [
          { from: "goal", to: "planner", label: "拆成步骤" },
          { from: "planner", to: "tool", label: "选择工具" },
          { from: "tool", to: "observe", label: "拿到结果" },
          { from: "observe", to: "memory", label: "更新下一步" },
        ],
        success_summary: "你把 Agent 看成了目标、规划、工具、反馈和记忆组成的行动闭环。",
      },
    };
  }

  if (pattern === "comparison") {
    return {
      ...common,
      pattern,
      template: "split_panel",
      payload: {
        title: "Agent 和工作流差在哪",
        subject_a: "固定工作流",
        subject_b: "AI Agent",
        left: { label: "固定工作流", content: "人提前写好每一步，系统按顺序执行。遇到新情况时，需要人改流程。" },
        right: { label: "AI Agent", content: "系统围绕目标做规划，调用工具，观察反馈，再决定下一步。" },
        dimensions: [
          { label: "决策方式", a: "预设规则", b: "基于目标和上下文动态规划", insight: "Agent 的关键不是自动化，而是能根据反馈调整。" },
          { label: "外部能力", a: "通常只跑内部步骤", b: "可以调用搜索、代码、数据库等工具", insight: "工具调用让 Agent 从会说变成会做。" },
          { label: "失败处理", a: "失败后停住或报错", b: "观察结果后重试、换工具或改计划", insight: "反馈循环决定它是不是像一个行动者。" },
        ],
        summary: "工作流强调预设步骤，Agent 强调围绕目标的动态行动闭环。",
      },
    };
  }

  if (pattern === "parameter_explore") {
    return {
      ...common,
      pattern,
      template: "single_slider",
      payload: {
        title: "调一调 Agent 的自主度",
        variable_label: "自主程度",
        min: 0,
        max: 100,
        default_value: 55,
        unit: "%",
        explanation_template: "自主度越高，Agent 越会自己拆任务和调用工具，但也越需要边界和审核。",
        scenarios: [
          { label: "只回答", value: 20 },
          { label: "能用工具", value: 55 },
          { label: "能自调", value: 85 },
        ],
        outputs: [
          { label: "任务完成度", model: "linear", min: 0, max: 100, default: 55 },
          { label: "失控风险", model: "logarithmic", min: 0, max: 60, default: 18 },
        ],
        insight_rules: [
          { when: "low", text: "低自主度更像聊天机器人：稳定，但很难独立完成复杂任务。" },
          { when: "mid", text: "中等自主度会开始调用工具，Agent 的行动能力变得明显。" },
          { when: "high", text: "高自主度需要权限边界、观察反馈和人类审核一起约束。" },
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
        title: "记住 Agent 三件事",
        cards: [
          { front: "目标", back: "Agent 必须围绕一个明确目标行动，而不是随便聊天。" },
          { front: "工具调用", back: "Agent 通过搜索、代码、数据库等工具把想法变成动作。" },
          { front: "反馈循环", back: "Agent 会观察执行结果，再决定继续、重试还是换策略。" },
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
        title: "Agent 如何跑一轮任务",
        events: [
          { label: "接收目标", description: "用户给出想完成的任务，而不是只问一个问题。" },
          { label: "规划步骤", description: "Agent 把目标拆成可执行的小任务。" },
          { label: "调用工具", description: "它选择搜索、代码、文件或 API 等工具去执行。" },
          { label: "观察反馈", description: "读取执行结果，判断是否达成目标。" },
          { label: "调整继续", description: "如果结果不够好，就改计划再试。" },
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
        title: "分清 Agent 的核心和表象",
        categories: [
          { id: "core", name: "Agent 核心" },
          { id: "surface", name: "表面特征" },
        ],
        items: [
          { label: "目标驱动", correct_category: "core", explanation: "没有目标，Agent 就只是在回应输入。" },
          { label: "工具调用", correct_category: "core", explanation: "工具让 Agent 能执行真实动作。" },
          { label: "反馈调整", correct_category: "core", explanation: "观察结果并修正计划，是 Agent 区别于固定流程的关键。" },
          { label: "语气像人", correct_category: "surface", explanation: "拟人语气能改善体验，但不是 Agent 的本质。" },
        ],
      },
    };
  }

  if (pattern === "narrative_branch") {
    return {
      ...common,
      pattern,
      template: "branch_story",
      payload: {
        title: "遇到任务时怎么选",
        opening: "你想让系统帮你整理一份竞品报告，现在有三种做法。",
        branches: [
          { choice_label: "只问聊天机器人", outcome_description: "它能解释思路，但不会主动查资料和整理来源。", insight: "聊天机器人偏回答，行动能力有限。" },
          { choice_label: "跑固定工作流", outcome_description: "它能按固定步骤抓取和汇总，但遇到异常时容易停住。", insight: "工作流稳定，但灵活性来自人提前设计。" },
          { choice_label: "交给 Agent", outcome_description: "它会拆任务、查资料、观察结果，再调整下一步。", insight: "Agent 的价值在动态规划和反馈循环。" },
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
        title: "模拟 Agent 能力边界",
        params: [
          { label: "工具权限", min: 0, max: 100, default: 60, unit: "%" },
          { label: "人类审核", min: 0, max: 100, default: 55, unit: "%" },
          { label: "任务复杂度", min: 0, max: 100, default: 45, unit: "%" },
        ],
        compute_formula_description: "工具权限提高行动能力，人类审核降低风险，任务复杂度会放大规划和反馈的重要性。",
        steps: 5,
      },
    };
  }

  return {
    ...common,
    pattern: "probability",
    template: "card_flip_reveal",
    payload: {
      title: "抽一次 Agent 执行结果",
      pool: [
        { name: "目标清楚", flavor_label: "规划顺利", rarity: "5", probability: 25, value: 90 },
        { name: "工具可用", flavor_label: "行动成功", rarity: "4", probability: 35, value: 70 },
        { name: "反馈含糊", flavor_label: "需要重试", rarity: "3", probability: 25, value: 35 },
        { name: "权限不足", flavor_label: "只能停住", rarity: "3", probability: 15, value: 10 },
      ],
      option_cost: 10,
      strike_price: 60,
      pulls_per_try: 1,
      explanation_map: {
        win: "目标、工具和反馈都对齐时，Agent 才像一个可靠行动者。",
        lose: "缺少权限或反馈时，Agent 会退化成只会回答的助手。",
      },
    },
  };
}

function makeAgentFallbackPlay(concept: string, pattern: PatternType, index: number): KnowledgePlay {
  const titles = ["先分清", "搭闭环", "看边界"];
  const rewards = [
    "你抓住了 Agent 和普通聊天的区别。",
    "你把 Agent 的行动闭环拼起来了。",
    "你看清了 Agent 和工作流的边界。",
  ];
  return {
    id: `agent-${index + 1}`,
    title: titles[index] || "继续理解",
    concept,
    schema: agentSchema(pattern, concept),
    estimated_minutes: index === 1 ? 2 : 1,
    reward_copy: rewards[index] || "你又想通了一层。",
  };
}

function makeAgentFallbackFollowUps(): FollowUpTopic[] {
  return [
    {
      id: "agent-follow-up-workflow",
      title: "和工作流比较",
      concept: "AI Agent vs 工作流",
      hook: "看清动态决策和固定流程的边界。",
      relation: "从 Agent 本体走向相近概念辨析。",
      kind: "ai_seed",
      suggestedPattern: "comparison",
    },
    {
      id: "agent-follow-up-tools",
      title: "看工具调用闭环",
      concept: "Agent 工具调用",
      hook: "理解它怎样从会说变成会做。",
      relation: "从概念定义走向执行结构。",
      kind: "ai_seed",
      suggestedPattern: "system_builder",
    },
    {
      id: "agent-follow-up-memory",
      title: "看记忆与规划",
      concept: "Agent 记忆与规划",
      hook: "为什么长期任务需要状态和计划？",
      relation: "从一次执行走向持续任务。",
      kind: "ai_seed",
      suggestedPattern: "process_timeline",
    },
  ];
}

function makeAgentFallbackFlow(topicInput: string, preferredPattern: FlowPatternPreference): KnowledgeFlow {
  const concept = canonicalAgentConcept(topicInput);
  const patterns = agentPatternChain(preferredPattern);
  return {
    id: makeDynamicId(concept),
    title: concept.includes("vs") ? "Agent 对比" : "Agent 入门",
    concept,
    hook: "它不只是会聊天，而是会围绕目标行动。",
    description: "用三关看懂 Agent 的目标、工具调用和反馈循环。",
    category: "科技",
    topic_area: "AI",
    difficulty: "进阶",
    estimated_minutes: 4,
    summary: "AI Agent 的核心是目标驱动、工具调用、观察反馈和状态记忆组成的行动闭环。",
    concepts: ["目标驱动", "工具调用", "反馈循环", "记忆状态"],
    plays: patterns.map((pattern, index) => makeAgentFallbackPlay(concept, pattern, index)),
    follow_ups: makeAgentFallbackFollowUps(),
    source: "generated",
  };
}

function agentFlowLooksRelevant(flow: KnowledgeFlow) {
  const text = JSON.stringify(flow).toLowerCase();
  const hits = AGENT_RELEVANCE_TERMS.filter((term) => text.includes(term.toLowerCase())).length;
  return hits >= 4;
}
function makeFallbackFollowUps(topic: string): FollowUpTopic[] {
  if (isAgentTopic(topic)) return makeAgentFallbackFollowUps();
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
  if (isAgentTopic(topic)) return makeAgentFallbackFlow(topic, preferredPattern);
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
  if (isAgentTopic(topic)) return makeAgentFallbackFollowUps();
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
    if (isAgentTopic(topic) && !agentFlowLooksRelevant(normalized.flow)) {
      return {
        flow: makeAgentFallbackFlow(topic, preferredPattern),
        source: "mock",
        validation_error: "Agent 相关性不足，已使用 Agent 专用兜底。",
        raw_output: includeRaw ? result.text : undefined,
      };
    }
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

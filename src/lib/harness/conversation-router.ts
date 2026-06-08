import { generateText, type LanguageModel } from "ai";
import type { CurrentThread } from "@/types/state";

export type ConversationRoute = "knowledge" | "preference" | "casual";

export interface RouteClassification {
  route: ConversationRoute;
  confidence: number;
  reason?: string;
  source: "llm" | "rules";
}

export interface FollowupDetection {
  is_followup: boolean;
  confidence: number;
  reason: string;
  source: "llm" | "rules";
  concept?: string;
}

const knowledgeWords = [
  "是什么",
  "如何",
  "为什么",
  "怎么",
  "解释",
  "理解",
  "概念",
  "原理",
  "区别",
  "对比",
  "测验",
  "期权",
  "算法",
  "架构",
];
const preferenceWords = [
  "我喜欢",
  "我不喜欢",
  "我习惯",
  "偏好",
  "背景",
  "爱好",
  "我是",
  "我学",
  "我做",
  "换个方式",
  "之后用",
  "以后用",
  "我想用",
  "我希望用",
];
const casualWords = ["你好", "谢谢", "再见", "在吗", "哈哈"];
const followupWords = [
  "继续",
  "接着",
  "刚才",
  "上面",
  "这个",
  "那个",
  "它",
  "这",
  "那",
  "为什么",
  "怎么",
  "再",
  "展开",
  "详细",
  "举例",
  "换个",
  "如果",
  "所以",
  "行权",
  "收益",
  "风险",
];

function parseClassification(text: string): Pick<RouteClassification, "route" | "confidence" | "reason"> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]) as Partial<RouteClassification>;
    if (
      (parsed.route === "knowledge" || parsed.route === "preference" || parsed.route === "casual") &&
      typeof parsed.confidence === "number"
    ) {
      return {
        route: parsed.route,
        confidence: Math.max(0, Math.min(1, parsed.confidence)),
        reason: parsed.reason,
      };
    }
  } catch {
    return null;
  }

  return null;
}

function inferQuestionSubject(input: string) {
  const cleaned = input
    .replace(/请|帮我|给我|一下|用.*(?:讲|解释|对比|演示|模拟)/g, "")
    .replace(/[，,：:\s]/g, "")
    .trim();
  if (/^(为什么|怎么|有什么区别|区别|对比|继续|接着|再)/.test(cleaned)) return "";
  const match = cleaned.match(/^(.{1,18}?)(是什么|为什么|怎么|有什么区别|区别|对比)/);
  const subject = match?.[1]?.trim();
  if (!subject || /^(这|那|它|这个|那个|刚才|上面)$/.test(subject)) return "";
  return subject;
}

function sameTextSubject(left: string, right: string) {
  const normalize = (value: string) => value.replace(/\s+/g, "").toLowerCase();
  return normalize(left) === normalize(right);
}

function isPureNounPhrase(input: string) {
  const compact = input.trim();
  if (!compact || compact.length > 10) return false;
  if (casualWords.some((word) => compact.includes(word))) return false;
  if (/[？?。！!，,；;：:、]/.test(compact)) return false;
  if (/(我是|我想|我喜欢|请|帮我|解释|怎么|为什么|是什么|区别|对比|测试|测验|继续|再讲)/.test(compact)) return false;
  return /^[\p{Script=Han}A-Za-z0-9\s·（）()\-]+$/u.test(compact);
}

export function classifyConversationByRules(input: string): RouteClassification {
  const normalizedInput = input.trim();
  const hasKnowledgeSignal = knowledgeWords.some((word) => normalizedInput.includes(word));
  const hasExplicitKnowledgeQuestion = /(是什么|如何|为什么|怎么|解释|理解|原理|区别|对比|测验|测试|题目|时间线|分类|模拟|推演|架构|滑块)/.test(
    normalizedInput,
  );
  const hasPreferenceSignal =
    /(我喜欢|我习惯|我是|用.{1,12}讲)/.test(normalizedInput) || preferenceWords.some((word) => input.includes(word));

  if (hasExplicitKnowledgeQuestion) {
    return { route: "knowledge", confidence: 0.92, source: "rules", reason: "命中知识探索关键词" };
  }

  if (hasPreferenceSignal) {
    return { route: "preference", confidence: 0.92, source: "rules", reason: "命中偏好表达关键词" };
  }

  if (casualWords.some((word) => normalizedInput.includes(word))) {
    return { route: "casual", confidence: 0.92, source: "rules", reason: "命中闲聊关键词" };
  }

  if (isPureNounPhrase(input)) {
    return { route: "knowledge", confidence: 0.92, source: "rules", reason: "纯名词短语默认按知识概念处理" };
  }

  if (hasKnowledgeSignal) {
    return { route: "knowledge", confidence: 0.92, source: "rules", reason: "命中知识探索关键词" };
  }

  return { route: "casual", confidence: 0.72, source: "rules", reason: "未命中知识或偏好信号" };
}

export async function classifyConversationIntent(
  input: string,
  model?: LanguageModel | null,
): Promise<RouteClassification> {
  const ruleResult = classifyConversationByRules(input);
  if (!model || ruleResult.confidence >= 0.9) return ruleResult;

  try {
    const result = await generateText({
      model,
      system: [
        "你是趣灵（aha-flash）的对话路由器。",
        "只输出 JSON，不要 Markdown，不要解释。",
        '格式: {"route":"knowledge|preference|casual","confidence":0-1,"reason":"短原因"}',
        "knowledge: 用户想理解概念、对比、做测验、学习知识。",
        "preference: 用户表达背景、爱好、偏好、希望换一种讲法。",
        "casual: 与学习和偏好无关的闲聊。",
      ].join("\n"),
      messages: [{ role: "user", content: input }],
    });
    const parsed = parseClassification(result.text);
    if (parsed) return { ...parsed, source: "llm" };
  } catch {
    // fall through to deterministic fallback
  }

  return ruleResult;
}

function parseFollowup(text: string): Pick<FollowupDetection, "is_followup" | "confidence" | "reason" | "concept"> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]) as Partial<FollowupDetection>;
    if (typeof parsed.is_followup === "boolean" && typeof parsed.confidence === "number") {
      return {
        is_followup: parsed.is_followup,
        confidence: Math.max(0, Math.min(1, parsed.confidence)),
        reason: parsed.reason || "LLM 判定",
        concept: parsed.concept,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function detectFollowupByRules(input: string, currentThread?: CurrentThread): FollowupDetection {
  if (!currentThread?.concept) {
    return {
      is_followup: false,
      confidence: 0.82,
      reason: "当前没有可延续的学习线程",
      source: "rules",
    };
  }

  const normalizedInput = input.trim();
  const concept = currentThread.concept.trim();
  if (concept && normalizedInput.includes(concept)) {
    return {
      is_followup: true,
      confidence: 0.86,
      reason: "输入再次提到当前概念",
      source: "rules",
      concept,
    };
  }

  const subject = inferQuestionSubject(normalizedInput);
  if (subject && !sameTextSubject(subject, concept)) {
    return {
      is_followup: false,
      confidence: 0.84,
      reason: "输入包含新的明确概念主语",
      source: "rules",
      concept: subject,
    };
  }

  if (followupWords.some((word) => normalizedInput.includes(word))) {
    return {
      is_followup: true,
      confidence: 0.78,
      reason: "命中追问/延展表达",
      source: "rules",
      concept,
    };
  }

  return {
    is_followup: false,
    confidence: 0.7,
    reason: "未命中当前概念或追问信号",
    source: "rules",
  };
}

export async function detectFollowupIntent(
  input: string,
  currentThread?: CurrentThread,
  model?: LanguageModel | null,
): Promise<FollowupDetection> {
  const ruleResult = detectFollowupByRules(input, currentThread);
  if (!model || !currentThread?.concept || ruleResult.confidence >= 0.84) return ruleResult;

  try {
    const result = await generateText({
      model,
      system: [
        "你是趣灵（aha-flash）的追问判别器。",
        "判断用户输入是在延续当前学习线程，还是开启新概念。",
        "只输出 JSON，不要 Markdown，不要解释。",
        '格式: {"is_followup":true|false,"confidence":0-1,"reason":"短原因","concept":"线程概念或新概念"}',
        `当前线程概念: ${currentThread.concept}`,
        `当前线程深度: ${currentThread.depth}`,
      ].join("\n"),
      messages: [{ role: "user", content: input }],
    });
    const parsed = parseFollowup(result.text);
    if (parsed) return { ...parsed, source: "llm" };
  } catch {
    // fall through to deterministic fallback
  }

  return ruleResult;
}

export function routeConversation(input: string): ConversationRoute {
  return classifyConversationByRules(input).route;
}

export function inferTopic(input: string) {
  const compact = input.replace(/https?:\/\/[^\s)）]+/g, "").replace(/[？?。！!,，]/g, " ").trim();
  return compact.split(/\s+/)[0]?.slice(0, 24) || "新概念";
}

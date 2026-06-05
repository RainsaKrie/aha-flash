import { generateText, type LanguageModel } from "ai";

export type ConversationRoute = "knowledge" | "preference" | "casual";

export interface RouteClassification {
  route: ConversationRoute;
  confidence: number;
  reason?: string;
  source: "llm" | "rules";
}

const knowledgeWords = [
  "是什么",
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

export function classifyConversationByRules(input: string): RouteClassification {
  if (preferenceWords.some((word) => input.includes(word))) {
    return { route: "preference", confidence: 0.82, source: "rules", reason: "命中偏好表达关键词" };
  }

  if (knowledgeWords.some((word) => input.includes(word))) {
    return { route: "knowledge", confidence: 0.86, source: "rules", reason: "命中知识探索关键词" };
  }

  return { route: "casual", confidence: 0.72, source: "rules", reason: "未命中知识或偏好信号" };
}

export async function classifyConversationIntent(
  input: string,
  model?: LanguageModel | null,
): Promise<RouteClassification> {
  if (!model) return classifyConversationByRules(input);

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

  return classifyConversationByRules(input);
}

export function routeConversation(input: string): ConversationRoute {
  return classifyConversationByRules(input).route;
}

export function inferTopic(input: string) {
  const compact = input.replace(/https?:\/\/[^\s)）]+/g, "").replace(/[？?。！!,，]/g, " ").trim();
  return compact.split(/\s+/)[0]?.slice(0, 24) || "新概念";
}

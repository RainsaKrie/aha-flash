import { generateText } from "ai";
import { NextResponse } from "next/server";
import {
  classifyConversationIntent,
  detectFollowupIntent,
  inferTopic,
} from "@/lib/harness/conversation-router";
import { buildSystemPrompt } from "@/lib/harness/prompt-composer";
import { reflectTurn } from "@/lib/harness/state-reflection";
import { initUserState } from "@/lib/harness/state-machine";
import { stateStore } from "@/lib/harness/state-store";
import { createMockSchema } from "@/lib/llm/mock-schema";
import { getLLMProvider } from "@/lib/llm/provider";
import { extractSchemaFromText, getSchemaFailureReason } from "@/lib/llm/schema-validator";
import {
  DEFAULT_LEARNING_DEPTH,
  isLearningDepth,
  normalizeUISchema,
  type LearningDepth,
  type PatternType,
  type UISchema,
  type TemplateId,
} from "@/types/schema";
import type { KnowledgeAsset } from "@/types/state";
import type { RecentMessage } from "@/types/chat";

interface SchemaIntent {
  pattern: PatternType;
  template?: TemplateId;
  reason: string;
}

function inferConcept(input: string) {
  const withoutUrls = input.replace(/https?:\/\/[^\s)）]+/g, "");
  const firstSentence = withoutUrls.split(/[。！？!?]/)[0] || withoutUrls;
  const concept = firstSentence
    .replace(/请|帮我|给我|一下|一个|做成|做一个/g, "")
    .replace(/是什么.*$/g, "")
    .replace(/怎么.*$/g, "")
    .replace(/为什么.*$/g, "")
    .replace(/有什么区别.*$/g, "")
    .replace(/用.*(?:讲|解释|对比|演示|模拟).*$/g, "")
    .replace(/让我.*$/g, "")
    .replace(/[，,：:\s]/g, "")
    .trim();

  return concept.slice(0, 40) || inferTopic(input);
}

function inferTopicArea(input: string) {
  if (/[期权股票投资金融保险复利利率通胀]/.test(input)) return "金融";
  if (/[算法复杂度编程系统架构模块]/.test(input)) return "科技";
  if (/[历史发展演化时间线]/.test(input)) return "历史";
  if (/[沉没成本决策逻辑谬误]/.test(input)) return "认知";
  return "通识";
}

function normalizeDepth(value: unknown): LearningDepth {
  return isLearningDepth(value) ? value : DEFAULT_LEARNING_DEPTH;
}

function normalizeRecentMessages(value: unknown): RecentMessage[] {
  if (!Array.isArray(value)) return [];

  const messages: RecentMessage[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const message = raw as Record<string, unknown>;
    const role = message.role === "assistant" ? "assistant" : message.role === "user" ? "user" : null;
    const content = typeof message.content === "string" ? message.content.trim() : "";
    if (!role || !content) continue;

    messages.push({
      role,
      content: content.slice(0, 500),
      created_at: typeof message.created_at === "string" ? message.created_at : undefined,
    });
  }

  return messages.slice(-6);
}

function depthToUnderstanding(depth: LearningDepth): KnowledgeAsset["understanding"] {
  if (depth === "mapping") return "deep";
  if (depth === "scenario") return "moderate";
  return "shallow";
}

function attachDepth(schema: UISchema, depth: LearningDepth): UISchema {
  return { ...schema, depth };
}

function inferSchemaIntent(input: string): SchemaIntent | null {
  if (/(区别|对比|比较|VS|vs| versus )/.test(input)) {
    return {
      pattern: "comparison",
      template: /(叠加|淡入|overlay|fade)/i.test(input) ? "overlay_fade" : "split_panel",
      reason: "用户明确要求对比或辨析",
    };
  }

  if (/(测验|测试|小测|题目|quiz)/i.test(input)) {
    return { pattern: "knowledge_check", reason: "用户明确要求理解检查" };
  }

  if (/(时间线|历史|发展|演化)/.test(input)) {
    return { pattern: "process_timeline", reason: "用户明确要求阶段或时间演化" };
  }

  if (/(分类|分桶|归类|sort)/i.test(input)) {
    return { pattern: "classification_sort", reason: "用户明确要求分类判断" };
  }

  if (/(复利|模拟|推演|仿真|simulation)/i.test(input)) {
    return { pattern: "simulation_play", reason: "用户明确要求模拟推演" };
  }

  if (/(架构|模块|系统|搭建|builder)/i.test(input)) {
    return { pattern: "system_builder", reason: "用户明确要求系统或模块搭建" };
  }

  if (/(滑块|参数|变量|slider)/i.test(input)) {
    return { pattern: "parameter_explore", reason: "用户明确要求参数探索" };
  }

  return null;
}

function buildIntentDirective(intent: SchemaIntent | null) {
  if (!intent) return "";

  return [
    "<schema_intent_guard>",
    `reason: ${intent.reason}`,
    `required_pattern: ${intent.pattern}`,
    intent.template ? `required_template: ${intent.template}` : "",
    "如果用户要求与 required_pattern 冲突，以 required_pattern 为准。",
    "输出必须满足 required_pattern / required_template；不要改用记忆卡、泛化解释或其他 pattern。",
    "</schema_intent_guard>",
  ]
    .filter(Boolean)
    .join("\n");
}

function schemaMatchesIntent(schema: UISchema | null, intent: SchemaIntent | null) {
  if (!schema || !intent) return Boolean(schema);
  const normalized = normalizeUISchema(schema);
  if (normalized.pattern !== intent.pattern) return false;
  if (intent.template && normalized.template !== intent.template) return false;
  return true;
}

async function generateSchemaWithLLM({
  model,
  system,
  input,
  intent,
}: {
  model: NonNullable<ReturnType<typeof getLLMProvider>>;
  system: string;
  input: string;
  intent: SchemaIntent | null;
}): Promise<UISchema | null> {
  const userContent = [input, buildIntentDirective(intent)].filter(Boolean).join("\n\n");
  const first = await generateText({
    model,
    system,
    messages: [{ role: "user", content: userContent }],
  });

  const firstSchema = extractSchemaFromText(first.text);
  if (schemaMatchesIntent(firstSchema, intent)) return firstSchema;

  const failureReason = firstSchema
    ? `Schema pattern/template 与用户意图不匹配，必须满足 ${intent?.pattern}${intent?.template ? `/${intent.template}` : ""}。`
    : getSchemaFailureReason(first.text);
  const repair = await generateText({
    model,
    system,
    messages: [
      { role: "user", content: userContent },
      {
        role: "assistant",
        content: first.text,
      },
      {
        role: "user",
        content: [
          "上一次输出无法被前端解析。",
          "请只输出一个合法 JSON 对象，不要输出 Markdown，不要解释。",
          `校验错误: ${failureReason}`,
        ].join("\n"),
      },
    ],
  });

  const repairedSchema = extractSchemaFromText(repair.text);
  return schemaMatchesIntent(repairedSchema, intent) ? repairedSchema : null;
}

export async function POST(req: Request) {
  const { message, userId, depth: rawDepth, recent_messages } = await req.json();
  const input = String(message || "").trim();
  const depth = normalizeDepth(rawDepth);
  const recentMessages = normalizeRecentMessages(recent_messages);

  if (!input) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const state = await initUserState(userId);
  const model = getLLMProvider();
  const schemaIntent = inferSchemaIntent(input);
  const followupInfo = await detectFollowupIntent(
    input,
    state.conversation_compressed.current_thread,
    model,
  );
  const classifiedRoute = await classifyConversationIntent(input, model);
  const routeInfo =
    followupInfo.is_followup && classifiedRoute.route === "casual"
      ? {
          ...classifiedRoute,
          route: "knowledge" as const,
          reason: `延续当前线程：${followupInfo.reason}`,
        }
      : classifiedRoute;
  const routeContext = `<route_context route="${routeInfo.route}" confidence="${routeInfo.confidence}" source="${routeInfo.source}" />`;
  const systemPrompt = [
    buildSystemPrompt(state, depth, { recentMessages, followup: followupInfo }),
    routeContext,
  ]
    .filter(Boolean)
    .join("\n\n");

  let schema = attachDepth(createMockSchema(input, depth), depth);
  let source: "mock" | "llm" = "mock";

  if (model) {
    try {
      const generated = await generateSchemaWithLLM({ model, system: systemPrompt, input, intent: schemaIntent });
      if (generated) {
        schema = attachDepth(generated, depth);
        source = "llm";
      }
    } catch {
      source = "mock";
    }
  }

  const normalizedSchema = normalizeUISchema(schema);
  const concept =
    followupInfo.is_followup && state.conversation_compressed.current_thread?.concept
      ? state.conversation_compressed.current_thread.concept
      : inferConcept(input);
  const topic =
    routeInfo.route === "preference"
      ? "用户偏好"
      : routeInfo.route === "casual"
        ? "闲聊"
        : concept || inferTopic(input);
  const rawReflection = await reflectTurn({
    input,
    route: routeInfo.route,
    schemaType: normalizedSchema.type,
    state,
    model,
  });
  const reflection = {
    ...rawReflection,
    understanding_level: depthToUnderstanding(normalizedSchema.depth),
    summary:
      routeInfo.route === "knowledge"
        ? `用户以 ${normalizedSchema.depth} 深度学习了 ${normalizedSchema.type} 互动组件。`
        : rawReflection.summary,
  };
  let updatedState = state;
  if (routeInfo.route === "knowledge") {
    updatedState = await stateStore.updateCurrentThread(state.user_id, {
      concept: topic,
      input,
      isFollowup: followupInfo.is_followup,
    });
  }

  updatedState = await stateStore.applyTurnReflection(
    state.user_id,
    topic,
    `已生成 ${normalizedSchema.pattern}/${normalizedSchema.template} 互动组件`,
    reflection,
  );

  if (routeInfo.route === "knowledge") {
    updatedState = await stateStore.addKnowledgeAsset(state.user_id, {
      concept,
      pattern: normalizedSchema.pattern,
      template: normalizedSchema.template,
      understanding: depthToUnderstanding(normalizedSchema.depth),
      topic_area: inferTopicArea(input),
    });
  }

  return NextResponse.json({
    id: crypto.randomUUID(),
    role: "assistant",
    content:
      source === "llm"
        ? "已根据你的状态生成互动组件。"
        : model
          ? "模型输出没有通过组件约束，先用稳定组件兜底。"
          : "先用本地示例把交互跑起来，配置 API Key 后会改由 LLM 实时生成。",
    schema,
    route: routeInfo,
    followup: followupInfo,
    userId: state.user_id,
    userState: updatedState,
    source,
    created_at: new Date().toISOString(),
  });
}

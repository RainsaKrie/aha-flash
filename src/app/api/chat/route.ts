import { generateText } from "ai";
import { NextResponse } from "next/server";
import { classifyConversationIntent, inferTopic } from "@/lib/harness/conversation-router";
import { buildSystemPrompt } from "@/lib/harness/prompt-composer";
import { reflectTurn } from "@/lib/harness/state-reflection";
import { initUserState } from "@/lib/harness/state-machine";
import { stateStore } from "@/lib/harness/state-store";
import { createMockSchema } from "@/lib/llm/mock-schema";
import { getLLMProvider } from "@/lib/llm/provider";
import { extractSchemaFromText, getSchemaFailureReason } from "@/lib/llm/schema-validator";
import { buildSourcePromptContext, collectSourceContexts } from "@/lib/tools/source-router";
import { normalizeUISchema, type UISchema } from "@/types/schema";

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

async function generateSchemaWithLLM({
  model,
  system,
  input,
}: {
  model: NonNullable<ReturnType<typeof getLLMProvider>>;
  system: string;
  input: string;
}): Promise<UISchema | null> {
  const first = await generateText({
    model,
    system,
    messages: [{ role: "user", content: input }],
  });

  const firstSchema = extractSchemaFromText(first.text);
  if (firstSchema) return firstSchema;

  const failureReason = getSchemaFailureReason(first.text);
  const repair = await generateText({
    model,
    system,
    messages: [
      { role: "user", content: input },
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

  return extractSchemaFromText(repair.text);
}

export async function POST(req: Request) {
  const { message, userId } = await req.json();
  const input = String(message || "").trim();

  if (!input) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const state = await initUserState(userId);
  const model = getLLMProvider();
  const routeInfo = await classifyConversationIntent(input, model);
  const sources = await collectSourceContexts(input);
  const sourcePromptContext = buildSourcePromptContext(sources);
  const routeContext = `<route_context route="${routeInfo.route}" confidence="${routeInfo.confidence}" source="${routeInfo.source}" />`;
  const systemPrompt = [buildSystemPrompt(state), routeContext, sourcePromptContext]
    .filter(Boolean)
    .join("\n\n");

  let schema = createMockSchema(input);
  let source: "mock" | "llm" = "mock";

  if (model) {
    try {
      const generated = await generateSchemaWithLLM({ model, system: systemPrompt, input });
      if (generated) {
        schema = generated;
        source = "llm";
      }
    } catch {
      source = "mock";
    }
  }

  const normalizedSchema = normalizeUISchema(schema);
  const topic =
    routeInfo.route === "preference"
      ? "用户偏好"
      : routeInfo.route === "casual"
        ? "闲聊"
        : inferTopic(input);
  const reflection = await reflectTurn({
    input,
    route: routeInfo.route,
    schemaType: normalizedSchema.type,
    state,
    model,
  });
  let updatedState = await stateStore.applyTurnReflection(
    state.user_id,
    topic,
    `已生成 ${normalizedSchema.pattern}/${normalizedSchema.template} 互动组件`,
    reflection,
  );

  if (routeInfo.route === "knowledge") {
    updatedState = await stateStore.addKnowledgeAsset(state.user_id, {
      concept: inferConcept(input),
      pattern: normalizedSchema.pattern,
      template: normalizedSchema.template,
      understanding: reflection.understanding_level || "shallow",
      topic_area: inferTopicArea(input),
    });
  }

  return NextResponse.json({
    id: crypto.randomUUID(),
    role: "assistant",
    content:
      source === "llm"
        ? "已根据你的状态生成互动组件。"
        : "先用本地示例把交互跑起来，配置 API Key 后会改由 LLM 实时生成。",
    schema,
    sources,
    route: routeInfo,
    userId: state.user_id,
    userState: updatedState,
    source,
    created_at: new Date().toISOString(),
  });
}

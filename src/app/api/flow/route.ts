import { NextResponse } from "next/server";
import { generateDynamicFlow, type DynamicFlowGenerationResult } from "@/lib/content/dynamic-flow-generation";
import { getFlowById } from "@/lib/content/mock-flows";
import { generateFlowSteps, isLLMFlowSupported } from "@/lib/content/flow-generation";
import { normalizeKnowledgeStructure, type KnowledgeStructurePreference } from "@/lib/content/knowledge-blueprint";
import { checkRateLimit, getRequestRateLimitKey } from "@/lib/harness/rate-limit";
import { SCHEMA_CATALOG, type PatternType } from "@/types/schema";

const MAX_FLOW_TOPIC_CHARS = 80;
const FLOW_RATE_LIMIT = { limit: 8, windowMs: 10 * 60 * 1000 };

function canExposeDebug(req: Request) {
  const url = new URL(req.url);
  const isLocalDebug = url.searchParams.get("debug") === "1" && ["127.0.0.1", "localhost", "::1"].includes(url.hostname);
  return process.env.NODE_ENV !== "production" || isLocalDebug;
}

function normalizePreferredPattern(value: unknown): PatternType | "auto" {
  if (value === "auto") return "auto";
  if (typeof value === "string" && value in SCHEMA_CATALOG) return value as PatternType;
  return "auto";
}

function normalizePreferredStructure(value: unknown): KnowledgeStructurePreference {
  if (value === "auto") return "auto";
  const structure = normalizeKnowledgeStructure(value);
  return structure === "unclassified" ? "auto" : structure;
}

const STRUCTURE_LABELS: Record<string, string> = {
  optimization_model: "优化建模",
  system_process: "系统流程",
  probabilistic_reasoning: "概率推理",
  historical_change: "历史变迁",
  comparison_frame: "对比框架",
  classification_rule: "分类规则",
  causal_mechanism: "因果机制",
  procedure_algorithm: "步骤算法",
  unclassified: "待确认结构",
};

const PREVIEW_STAGE_FALLBACKS = ["先看清关键条件", "动手验证关键变化", "把结果连回概念"];

function makePreviewStepLabel(title: unknown, topic: string, index: number) {
  const value = typeof title === "string" ? title.trim() : "";
  const fallback = PREVIEW_STAGE_FALLBACKS[index] || "开始这一关";
  if (value) return value;
  return `${topic}：${fallback}`;
}

function makeFlowPreview(result: DynamicFlowGenerationResult) {
  const blueprint = result.blueprint;
  const plan = result.concept_plan;
  const flow = result.flow;
  const structureKey = blueprint?.structure_type || plan?.knowledge_structure || "";
  const structure = STRUCTURE_LABELS[structureKey] || structureKey || "AI 推荐";
  const topic = flow.concept || plan?.topic || blueprint?.topic || flow.title;

  return {
    topic,
    structure,
    steps: flow.plays.slice(0, 4).map((play, index) => ({
      label: makePreviewStepLabel(play.title, topic, index),
    })),
    gate: result.quality_gate?.ok === false ? "warn" : "pass",
    source: result.source,
  };
}
function makeDynamicFlowPayload(result: DynamicFlowGenerationResult, exposeDebug: boolean) {
  return {
    flow: result.flow,
    source: result.source,
    validation_error: exposeDebug ? result.validation_error : undefined,
    raw_output: exposeDebug ? result.raw_output : undefined,
    raw_plan_output: exposeDebug ? result.raw_plan_output : undefined,
    concept_plan: exposeDebug ? result.concept_plan : undefined,
    blueprint: exposeDebug ? result.blueprint : undefined,
    quality_gate: exposeDebug ? result.quality_gate : undefined,
    preview: makeFlowPreview(result),
    failure: result.failure,
  };
}

function createDynamicFlowStream(
  input: Parameters<typeof generateDynamicFlow>[0],
  exposeDebug: boolean,
) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const emit = (event: string, payload: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`));
        } catch {
          closed = true;
        }
      };
      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // The client can close the stream before generation ends.
        }
      };

      void generateDynamicFlow(input, {
        includeRaw: exposeDebug,
        onStage: (stage) => emit("stage", { stage }),
      })
        .then((result) => emit("result", makeDynamicFlowPayload(result, exposeDebug)))
        .catch((error) => emit("error", { error: error instanceof Error ? error.message : String(error) }))
        .finally(close);
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "text/event-stream; charset=utf-8",
    },
  });
}
export async function GET(req: Request) {
  const url = new URL(req.url);
  const flowId = url.searchParams.get("flowId") || "bayes-starter";
  const exposeDebug = canExposeDebug(req);

  if (!isLLMFlowSupported(flowId)) {
    return NextResponse.json({
      flow: getFlowById(flowId),
      source: "mock",
      validation_error: exposeDebug ? `${flowId} 尚未接入 LLM Flow Steps。` : undefined,
    });
  }

  const result = await generateFlowSteps(flowId, { includeRaw: exposeDebug });

  return NextResponse.json(
    {
      flow: result.flow,
      source: result.source,
      validation_error: exposeDebug ? result.validation_error : undefined,
      raw_output: exposeDebug ? result.raw_output : undefined,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  const exposeDebug = canExposeDebug(req);
  const rateLimit = checkRateLimit(getRequestRateLimitKey(req, "flow"), FLOW_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "生成请求过于频繁，请稍后再试。" },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "请求格式不正确。" }, { status: 400 });
  }

  const topic = typeof body.topic === "string"
    ? body.topic.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim()
    : "";
  if (topic.length < 2) {
    return NextResponse.json({ error: "请输入至少 2 个字的主题。" }, { status: 400 });
  }
  if (topic.length > MAX_FLOW_TOPIC_CHARS) {
    return NextResponse.json({ error: `主题请保持在 ${MAX_FLOW_TOPIC_CHARS} 个字以内。` }, { status: 413 });
  }

  const input = {
    topic,
    preferredPattern: normalizePreferredPattern(body.preferredPattern),
    preferredStructure: normalizePreferredStructure(body.preferredStructure),
  };

  try {
    if (body.stream === true) {
      const response = createDynamicFlowStream(input, exposeDebug);
      response.headers.set("X-RateLimit-Remaining", String(rateLimit.remaining));
      return response;
    }

    const result = await generateDynamicFlow(input, { includeRaw: exposeDebug });
    return NextResponse.json(makeDynamicFlowPayload(result, exposeDebug), {
      headers: {
        "Cache-Control": "no-store",
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: `动态 Flow 请求失败: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

import { NextResponse } from "next/server";
import {
  generateDynamicFlow,
  type DynamicFlowGenerationResult,
  type DynamicFlowInput,
} from "@/lib/content/dynamic-flow-generation";
import { getFlowById } from "@/lib/content/mock-flows";
import {
  normalizeKnowledgeStructure,
  type KnowledgeStructurePreference,
} from "@/lib/content/knowledge-blueprint";
import { getPublicBetaConfig } from "@/lib/public-beta/config";
import {
  createModelAccessContext,
  runWithModelAccess,
  type ModelAccessContext,
} from "@/lib/public-beta/model-context";
import {
  consumeDynamicAccess,
  getCachedFlow,
  inspectDynamicAccess,
  recordAccessAnalyticsEvent,
  recordGenerationRun,
  setCachedFlow,
  type DynamicAccessCode,
  type DynamicAccessDecision,
} from "@/lib/public-beta/repository";
import { SCHEMA_CATALOG, type PatternType } from "@/types/schema";

const MAX_FLOW_TOPIC_CHARS = 80;

function canExposeDebug(req: Request) {
  const url = new URL(req.url);
  const isLocalDebug =
    url.searchParams.get("debug") === "1"
    && ["127.0.0.1", "localhost", "::1"].includes(url.hostname);
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
  return value || topic + "：" + fallback;
}

type PublicFlowSource = "llm" | "cache" | "fallback";

function makeFlowPreview(result: DynamicFlowGenerationResult, source: PublicFlowSource) {
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
    source,
  };
}

function publicSource(result: DynamicFlowGenerationResult): PublicFlowSource {
  return result.source === "llm" && !result.failure ? "llm" : "fallback";
}

function makeDynamicFlowPayload(
  result: DynamicFlowGenerationResult,
  exposeDebug: boolean,
  source: PublicFlowSource = publicSource(result),
) {
  return {
    flow: result.flow,
    source,
    validation_error: exposeDebug ? result.validation_error : undefined,
    raw_output: exposeDebug ? result.raw_output : undefined,
    raw_plan_output: exposeDebug ? result.raw_plan_output : undefined,
    concept_plan: exposeDebug ? result.concept_plan : undefined,
    blueprint: exposeDebug ? result.blueprint : undefined,
    quality_gate: exposeDebug ? result.quality_gate : undefined,
    preview: makeFlowPreview(result, source),
    failure: result.failure,
  };
}

function isValidCachedFlow(
  result: DynamicFlowGenerationResult | null,
): result is DynamicFlowGenerationResult {
  return Boolean(
    result
    && result.flow
    && result.blueprint
    && result.quality_gate?.ok
    && !result.failure,
  );
}

const ACCESS_MESSAGES: Record<Exclude<DynamicAccessCode, "allowed">, {
  status: number;
  message: string;
  action: string;
}> = {
  static_mode: {
    status: 403,
    message: "当前公开测试只开放精选主题，动态生成仍在小范围验证。",
    action: "请先体验下方精选主题。",
  },
  storage_unavailable: {
    status: 503,
    message: "动态生成暂时不可用，精选主题仍可正常体验。",
    action: "请稍后再试，或先体验精选主题。",
  },
  invite_required: {
    status: 401,
    message: "动态生成目前需要内测邀请码。",
    action: "请输入有效邀请码，或先体验精选主题。",
  },
  invite_invalid: {
    status: 403,
    message: "这个邀请码无法使用。",
    action: "请检查邀请码，或先体验精选主题。",
  },
  invite_expired: {
    status: 403,
    message: "这个邀请码已经过期。",
    action: "请使用新的邀请码，或先体验精选主题。",
  },
  invite_exhausted: {
    status: 429,
    message: "这个邀请码的体验次数已经用完。",
    action: "请先体验精选主题。",
  },
  request_limit: {
    status: 429,
    message: "今天的动态生成额度已经用完。",
    action: "精选主题仍可正常体验，请明天再来试动态生成。",
  },
  client_limit: {
    status: 429,
    message: "你这一小时的动态生成次数已经用完。",
    action: "请稍后再试，精选主题不受影响。",
  },
  token_budget: {
    status: 429,
    message: "今天的动态生成预算已经用完。",
    action: "精选主题仍可正常体验，请明天再来试动态生成。",
  },
};

function blockedResponse(code: Exclude<DynamicAccessCode, "allowed">) {
  const detail = ACCESS_MESSAGES[code];
  return NextResponse.json({
    error: detail.message,
    code,
    action: detail.action,
    dynamic_available: false,
  }, {
    status: detail.status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function safelyRecordRun(
  context: ModelAccessContext,
  result: DynamicFlowGenerationResult,
  startedAt: number,
  source: PublicFlowSource,
) {
  try {
    await recordGenerationRun({
      requestId: context.requestId,
      flowId: result.flow.id,
      source,
      success: source === "llm",
      cacheHit: false,
      fallback: source === "fallback",
      repairCount: context.repairCount,
      modelCallCount: context.modelCallCount,
      latencyMs: Date.now() - startedAt,
      errorCategory: result.failure?.code,
      createdAt: new Date().toISOString(),
    });
  } catch {
    // Metrics persistence must not break an otherwise usable response.
  }
}

async function safelyRecordBlockedAccess(
  req: Request,
  decision: DynamicAccessDecision,
  code: Exclude<DynamicAccessCode, 'allowed'>,
) {
  const events: Array<'dynamic_generation_blocked' | 'rate_limited' | 'budget_exhausted'> = [
    'dynamic_generation_blocked',
  ];
  if (code === 'request_limit' || code === 'client_limit') events.push('rate_limited');
  if (code === 'token_budget') events.push('budget_exhausted');
  await Promise.allSettled(events.map((eventName) => recordAccessAnalyticsEvent({
    req,
    decision,
    eventName,
    route: '/api/flow',
    errorCategory: code,
  })));
}

async function safelyRecordCacheRun(flowId: string, latencyMs: number) {
  try {
    await recordGenerationRun({
      requestId: crypto.randomUUID(),
      flowId,
      source: 'cache',
      success: true,
      cacheHit: true,
      fallback: false,
      repairCount: 0,
      modelCallCount: 0,
      latencyMs,
      createdAt: new Date().toISOString(),
    });
  } catch {
    // Metrics persistence must not break a valid cache response.
  }
}

async function generateAuthorizedFlow(
  input: DynamicFlowInput,
  decision: DynamicAccessDecision,
  exposeDebug: boolean,
  onStage?: (stage: string) => void,
) {
  const context = createModelAccessContext({
    requestId: crypto.randomUUID(),
    callType: "flow",
    anonymousUserId: decision.identity.anonymousUserId,
    sessionId: decision.identity.sessionId,
    allowed: true,
  });
  const startedAt = Date.now();
  const result = await runWithModelAccess(context, () => generateDynamicFlow(input, {
    includeRaw: exposeDebug,
    onStage,
  }));
  if (context.budgetExhausted) {
    return { blocked: "token_budget" as const, context, result };
  }
  const source = publicSource(result);
  if (source === "llm" && result.quality_gate?.ok && !result.failure) {
    try {
      await setCachedFlow(input, result, decision.config, decision.store);
    } catch {
      // Cache failures do not invalidate a completed generation.
    }
  }
  await safelyRecordRun(context, result, startedAt, source);
  return { context, result, source };
}

function createResultStream(payload: unknown) {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode("event: result\ndata: " + JSON.stringify(payload) + "\n\n"));
      controller.close();
    },
  }), {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "text/event-stream; charset=utf-8",
    },
  });
}

function createDynamicFlowStream(
  input: DynamicFlowInput,
  decision: DynamicAccessDecision,
  exposeDebug: boolean,
  req: Request,
) {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const emit = (event: string, payload: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(
          "event: " + event + "\ndata: " + JSON.stringify(payload) + "\n\n",
        ));
      };
      void generateAuthorizedFlow(input, decision, exposeDebug, (stage) => {
        emit("stage", { stage });
      })
        .then(async (generated) => {
          if (generated.blocked) {
            await safelyRecordBlockedAccess(req, decision, generated.blocked);
            emit("error", {
              code: generated.blocked,
              error: ACCESS_MESSAGES.token_budget.message,
              action: ACCESS_MESSAGES.token_budget.action,
            });
            return;
          }
          emit("result", makeDynamicFlowPayload(
            generated.result,
            exposeDebug,
            generated.source,
          ));
        })
        .catch(() => {
          emit("error", {
            code: "generation_failed",
            error: "这次动态生成没有完成。",
            action: "请换一个表达，或先体验精选主题。",
          });
        })
        .finally(() => {
          closed = true;
          controller.close();
        });
    },
  }), {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "text/event-stream; charset=utf-8",
    },
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const flowId = url.searchParams.get("flowId") || "bayes-starter";
  return NextResponse.json({
    flow: getFlowById(flowId),
    source: "static",
  }, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      "X-Aha-Flow-Source": "static",
    },
  });
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json() as Record<string, unknown>;
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
    return NextResponse.json({
      error: "主题请保持在 " + MAX_FLOW_TOPIC_CHARS + " 个字以内。",
    }, { status: 413 });
  }

  const input: DynamicFlowInput = {
    topic,
    preferredPattern: normalizePreferredPattern(body.preferredPattern),
    preferredStructure: normalizePreferredStructure(body.preferredStructure),
  };
  const inviteCode = typeof body.inviteCode === "string" ? body.inviteCode : undefined;
  const config = getPublicBetaConfig();
  let access: DynamicAccessDecision;
  try {
    access = await inspectDynamicAccess({ req, body, inviteCode, config });
  } catch {
    return blockedResponse("storage_unavailable");
  }
  if (!access.allowed) {
    await safelyRecordBlockedAccess(
      req,
      access,
      access.code as Exclude<DynamicAccessCode, 'allowed'>,
    );
    return blockedResponse(access.code as Exclude<DynamicAccessCode, "allowed">);
  }

  const cacheStartedAt = Date.now();
  try {
    const cached = await getCachedFlow(input, access.config, access.store);
    if (isValidCachedFlow(cached)) {
      await safelyRecordCacheRun(cached.flow.id, Date.now() - cacheStartedAt);
      const payload = makeDynamicFlowPayload(cached as DynamicFlowGenerationResult, false, "cache");
      if (body.stream === true) return createResultStream(payload);
      return NextResponse.json(payload, {
        headers: {
          "Cache-Control": "no-store",
          "X-Aha-Flow-Source": "cache",
        },
      });
    }
  } catch {
    return blockedResponse("storage_unavailable");
  }

  try {
    access = await consumeDynamicAccess(access);
  } catch {
    return blockedResponse("storage_unavailable");
  }
  if (!access.allowed) {
    await safelyRecordBlockedAccess(
      req,
      access,
      access.code as Exclude<DynamicAccessCode, 'allowed'>,
    );
    return blockedResponse(access.code as Exclude<DynamicAccessCode, "allowed">);
  }

  const exposeDebug = canExposeDebug(req);
  if (body.stream === true) {
    return createDynamicFlowStream(input, access, exposeDebug, req);
  }

  try {
    const generated = await generateAuthorizedFlow(input, access, exposeDebug);
    if (generated.blocked) {
      await safelyRecordBlockedAccess(req, access, generated.blocked);
      return blockedResponse(generated.blocked);
    }
    return NextResponse.json(
      makeDynamicFlowPayload(generated.result, exposeDebug, generated.source),
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Aha-Flow-Source": generated.source,
        },
      },
    );
  } catch {
    return NextResponse.json({
      error: "这次动态生成没有完成。",
      code: "generation_failed",
      action: "请换一个表达，或先体验精选主题。",
    }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

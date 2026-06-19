import { NextResponse } from "next/server";
import { generateDynamicFlow, type DynamicFlowGenerationResult } from "@/lib/content/dynamic-flow-generation";
import { getFlowById } from "@/lib/content/mock-flows";
import { generateFlowSteps, isLLMFlowSupported } from "@/lib/content/flow-generation";
import { PATTERN_LABELS } from "@/lib/content/flow-pattern-options";
import { normalizeKnowledgeStructure, type KnowledgeStructurePreference } from "@/lib/content/knowledge-blueprint";
import { SCHEMA_CATALOG, type PatternType } from "@/types/schema";

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

function compactUnique(values: Array<unknown>, limit: number) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const text = value.trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    result.push(text.slice(0, 20));
    if (result.length >= limit) break;
  }
  return result;
}

function patternLabel(value: unknown) {
  if (typeof value === "string" && value in PATTERN_LABELS) return PATTERN_LABELS[value as keyof typeof PATTERN_LABELS];
  return typeof value === "string" && value.trim() ? value : "互动组件";
}

function makeFlowPreview(result: DynamicFlowGenerationResult) {
  const blueprint = result.blueprint;
  const plan = result.concept_plan;
  const flow = result.flow;
  const structureKey = blueprint?.structure_type || plan?.knowledge_structure || "";
  const structure = STRUCTURE_LABELS[structureKey] || structureKey || "AI 推荐";
  const terms = compactUnique([...(blueprint?.core_terms || []), ...(plan?.grounding_terms || []), ...flow.concepts], 5);
  const blueprintSteps = blueprint?.teaching_sequence?.slice(0, 3).map((step, index) => ({
    label: step.goal,
    pattern: patternLabel(step.recommended_pattern),
    terms: compactUnique(step.must_explain || [], 3),
    title: flow.plays[index]?.title,
  })) || [];
  const steps = blueprintSteps.length > 0
    ? blueprintSteps
    : flow.plays.slice(0, 3).map((play) => ({
        label: play.teaching_trace?.blueprint_step_goal || play.title,
        pattern: patternLabel(play.schema.pattern),
        terms: compactUnique(play.teaching_trace?.covered_terms || [], 3),
        title: play.title,
      }));

  return {
    topic: flow.concept || plan?.topic || blueprint?.topic || flow.title,
    structure,
    terms,
    steps,
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

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    if (topic.length < 2) {
      return NextResponse.json({ error: "请输入至少 2 个字的主题。" }, { status: 400 });
    }

    const input = {
      topic: topic.slice(0, 80),
      preferredPattern: normalizePreferredPattern(body.preferredPattern),
      preferredStructure: normalizePreferredStructure(body.preferredStructure),
    };

    if (body.stream === true) {
      return createDynamicFlowStream(input, exposeDebug);
    }

    const result = await generateDynamicFlow(input, { includeRaw: exposeDebug });

    return NextResponse.json(makeDynamicFlowPayload(result, exposeDebug), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: `动态 Flow 请求失败: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

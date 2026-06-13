import { NextResponse } from "next/server";
import { generateDynamicFlow } from "@/lib/content/dynamic-flow-generation";
import { getFlowById } from "@/lib/content/mock-flows";
import { generateFlowSteps, isLLMFlowSupported } from "@/lib/content/flow-generation";
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

    const result = await generateDynamicFlow(
      {
        topic: topic.slice(0, 80),
        preferredPattern: normalizePreferredPattern(body.preferredPattern),
      },
      { includeRaw: exposeDebug },
    );

    return NextResponse.json(
      {
        flow: result.flow,
        source: result.source,
        validation_error: exposeDebug ? result.validation_error : undefined,
        raw_output: exposeDebug ? result.raw_output : undefined,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: `动态 Flow 请求失败: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

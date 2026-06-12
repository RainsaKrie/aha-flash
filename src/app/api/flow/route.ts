import { NextResponse } from "next/server";
import { getFlowById } from "@/lib/content/mock-flows";
import { generateFlowSteps, isLLMFlowSupported } from "@/lib/content/flow-generation";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const flowId = url.searchParams.get("flowId") || "bayes-starter";
  const isLocalDebug = url.searchParams.get("debug") === "1" && ["127.0.0.1", "localhost", "::1"].includes(url.hostname);
  const canExposeDebug = process.env.NODE_ENV !== "production" || isLocalDebug;

  if (!isLLMFlowSupported(flowId)) {
    return NextResponse.json({
      flow: getFlowById(flowId),
      source: "mock",
      validation_error: canExposeDebug ? `${flowId} 尚未接入 LLM Flow Steps。` : undefined,
    });
  }

  const result = await generateFlowSteps(flowId, { includeRaw: canExposeDebug });

  return NextResponse.json(
    {
      flow: result.flow,
      source: result.source,
      validation_error: canExposeDebug ? result.validation_error : undefined,
      raw_output: canExposeDebug ? result.raw_output : undefined,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
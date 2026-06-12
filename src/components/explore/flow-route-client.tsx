"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { KnowledgeFlowPlayer } from "@/components/explore/knowledge-flow";
import { SpiritHint } from "@/components/spirit-hint";
import type { KnowledgeFlow } from "@/lib/content/mock-flows";

interface FlowApiResponse {
  flow: KnowledgeFlow;
  source: "llm" | "mock";
  validation_error?: string;
}

const LLM_FLOW_IDS = new Set(["bayes-starter", "industrial-revolution", "inflation-deflation"]);

export function FlowRouteClient({ flowId, fallbackFlow }: { flowId: string; fallbackFlow: KnowledgeFlow }) {
  const [flow, setFlow] = useState<KnowledgeFlow>(fallbackFlow);
  const [source, setSource] = useState<"llm" | "mock">("mock");
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(LLM_FLOW_IDS.has(flowId));

  useEffect(() => {
    let cancelled = false;

    async function loadGeneratedFlow() {
      if (!LLM_FLOW_IDS.has(flowId)) return;
      setIsGenerating(true);
      setError(null);

      try {
        const response = await fetch(`/api/flow?flowId=${encodeURIComponent(flowId)}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`flow request failed: ${response.status}`);
        const payload = (await response.json()) as FlowApiResponse;
        if (cancelled) return;
        setFlow(payload.flow || fallbackFlow);
        setSource(payload.source || "mock");
        setError(payload.validation_error || null);
      } catch (nextError) {
        if (cancelled) return;
        setFlow(fallbackFlow);
        setSource("mock");
        setError(nextError instanceof Error ? nextError.message : String(nextError));
      } finally {
        if (!cancelled) setIsGenerating(false);
      }
    }

    void loadGeneratedFlow();

    return () => {
      cancelled = true;
    };
  }, [fallbackFlow, flowId]);

  if (isGenerating) {
    return (
      <main className="v5-flow-loading">
        <div className="v5-flow-loading__card">
          <Loader2 size={26} className="animate-spin" />
          <p>趣灵正在临时生成三关挑战</p>
          <h1>先把问题变成能玩的挑战</h1>
          <SpiritHint tone="loading" compact title="趣灵">
            我会先做 3 个小关：先试一下，再看机制，最后抓住关键差异。
          </SpiritHint>
        </div>
      </main>
    );
  }

  return (
    <>
      {process.env.NODE_ENV !== "production" && (source === "mock" || error) && (
        <div className="v5-flow-dev-banner" role="status">
          Flow source: {source}{error ? ` · ${error}` : ""}
        </div>
      )}
      <KnowledgeFlowPlayer flow={flow} />
    </>
  );
}

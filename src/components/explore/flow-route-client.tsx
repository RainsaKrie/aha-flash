"use client";

import { KnowledgeFlowPlayer } from "@/components/explore/knowledge-flow";
import type { KnowledgeFlow } from "@/lib/content/mock-flows";

export function FlowRouteClient({
  fallbackFlow,
}: {
  flowId: string;
  fallbackFlow: KnowledgeFlow;
}) {
  return <KnowledgeFlowPlayer flow={fallbackFlow} flowSource="static" />;
}

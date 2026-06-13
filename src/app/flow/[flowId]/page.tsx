import { notFound } from "next/navigation";
import { FlowRouteClient } from "@/components/explore/flow-route-client";
import { findFlowById, getAllFlows } from "@/lib/content/mock-flows";

export function generateStaticParams() {
  return getAllFlows().map((flow) => ({ flowId: flow.id }));
}

export default async function FlowPage({ params }: { params: Promise<{ flowId: string }> }) {
  const { flowId } = await params;
  const flow = findFlowById(flowId);

  if (!flow) notFound();

  return <FlowRouteClient flowId={flowId} fallbackFlow={flow} />;
}

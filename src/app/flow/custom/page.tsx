"use client";

import { BrainCircuit, Home } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { KnowledgeFlowPlayer } from "@/components/explore/knowledge-flow";
import { SpiritHint } from "@/components/spirit-hint";
import { readFlowDraft } from "@/lib/utils/storage";
import type { KnowledgeFlow } from "@/lib/content/mock-flows";

function CustomFlowFallback({ hasLoaded = false }: { hasLoaded?: boolean }) {
  return (
    <main className="v5-flow-loading">
      <div className="v5-flow-loading__card">
        <BrainCircuit size={30} />
        <p>{hasLoaded ? "没有找到这次生成的 Flow" : "正在读取你的 Flow"}</p>
        <h1>回到首页重新生成一个话题</h1>
        <SpiritHint tone={hasLoaded ? "error" : "loading"} compact title="趣灵">
          动态 Flow 只保存在当前浏览器会话里。如果刷新或换设备丢失，回首页再输入一次就好。
        </SpiritHint>
        <Link href="/explore" className="v5-flow-secondary-action">
          <Home size={17} /> 回到首页
        </Link>
      </div>
    </main>
  );
}

function CustomFlowContent() {
  const searchParams = useSearchParams();
  const draftId = searchParams.get("draftId");
  const [flow, setFlow] = useState<KnowledgeFlow | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    setFlow(readFlowDraft(draftId));
    setHasLoaded(true);
  }, [draftId]);

  if (flow) return <KnowledgeFlowPlayer key={flow.id} flow={flow} />;
  return <CustomFlowFallback hasLoaded={hasLoaded} />;
}

export default function CustomFlowPage() {
  return (
    <Suspense fallback={<CustomFlowFallback />}>
      <CustomFlowContent />
    </Suspense>
  );
}

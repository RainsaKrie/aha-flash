"use client";

import { BrainCircuit, Home } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { KnowledgeFlowPlayer } from "@/components/explore/knowledge-flow";
import { SpiritHint } from "@/components/spirit-hint";
import { readFlowDraftRecord, type FlowDraftRecord } from "@/lib/utils/storage";

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
  const [draft, setDraft] = useState<FlowDraftRecord | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    setDraft(readFlowDraftRecord(draftId));
    setHasLoaded(true);
  }, [draftId]);

  if (draft) return <KnowledgeFlowPlayer key={draft.flow.id} flow={draft.flow} debug={draft.debug} />;
  return <CustomFlowFallback hasLoaded={hasLoaded} />;
}

export default function CustomFlowPage() {
  return (
    <Suspense fallback={<CustomFlowFallback />}>
      <CustomFlowContent />
    </Suspense>
  );
}

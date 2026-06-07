"use client";

import { ArrowLeft, BrainCircuit, Boxes, Clock3, Download, Layers3, Map, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { readUserId, writeUserId } from "@/lib/utils/storage";
import type { KnowledgeAsset, UserState } from "@/types/state";

const understandingLabel: Record<KnowledgeAsset["understanding"], string> = {
  shallow: "浅层",
  moderate: "中等",
  deep: "深入",
};

const EMPTY_ASSETS: KnowledgeAsset[] = [];

function groupAssets(assets: KnowledgeAsset[]) {
  return assets.reduce<Record<string, KnowledgeAsset[]>>((groups, asset) => {
    const key = asset.topic_area || "未分组";
    groups[key] = [...(groups[key] || []), asset];
    return groups;
  }, {});
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未知时间";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function buildKnowledgeCardMarkdown(asset: KnowledgeAsset) {
  return [
    `# ${asset.concept}`,
    "",
    `- 主题：${asset.topic_area || "未分组"}`,
    `- 理解深度：${understandingLabel[asset.understanding]}`,
    `- Pattern：${asset.pattern}`,
    `- Template：${asset.template}`,
    `- 学习时间：${formatDate(asset.learned_at)}`,
    "",
    "## 回看提示",
    "",
    `用「${asset.pattern}/${asset.template}」重新生成互动组件，复盘这个概念的关键机制。`,
    "",
  ].join("\n");
}

function safeFilename(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "-").slice(0, 48) || "knowledge-card";
}

function downloadKnowledgeCard(asset: KnowledgeAsset) {
  const blob = new Blob([buildKnowledgeCardMarkdown(asset)], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFilename(asset.concept)}.md`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function SandboxPage() {
  const [state, setState] = useState<UserState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function boot() {
      try {
        const stored = readUserId();
        const response = await fetch(`/api/state${stored ? `?userId=${stored}` : ""}`);
        if (!response.ok) throw new Error("state request failed");
        const nextState = (await response.json()) as UserState;
        writeUserId(nextState.user_id);
        setState(nextState);
      } catch {
        setError("知识沙盒暂时无法读取状态。");
      }
    }

    void boot();
  }, []);

  const assets = state?.knowledge_assets ?? EMPTY_ASSETS;
  const groups = useMemo(() => groupAssets(assets), [assets]);
  const groupEntries = Object.entries(groups);
  const patterns = new Set(assets.map((asset) => asset.pattern));
  const deepCount = assets.filter((asset) => asset.understanding === "deep").length;

  return (
    <main className="min-h-screen p-5 md:p-6">
      <div className="mx-auto grid max-w-6xl gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent)]">knowledge sandbox</p>
            <h1 className="mt-1 text-3xl font-semibold">知识沙盒</h1>
          </div>
          <Link href="/" className="tool-button px-3">
            <ArrowLeft size={16} />
            返回
          </Link>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          <Card className="grid gap-2 p-4">
            <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <BrainCircuit size={16} />
              已学概念
            </div>
            <div className="text-3xl font-semibold">{assets.length}</div>
          </Card>
          <Card className="grid gap-2 p-4">
            <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <Layers3 size={16} />
              交互模式
            </div>
            <div className="text-3xl font-semibold">{patterns.size}</div>
          </Card>
          <Card className="grid gap-2 p-4">
            <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <Sparkles size={16} />
              深入理解
            </div>
            <div className="text-3xl font-semibold">{deepCount}</div>
          </Card>
        </section>

        {error && (
          <Card className="border-[rgba(255,107,107,0.45)] bg-[rgba(255,107,107,0.08)] p-4 text-sm text-[var(--danger)]">
            {error}
          </Card>
        )}

        {!error && !state && (
          <Card className="grid min-h-[360px] place-items-center p-6 text-center">
            <div className="grid gap-2">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-[8px] border border-[var(--line)] bg-[#07120f]">
                <Map size={24} />
              </div>
              <div className="text-lg font-semibold">正在整理知识地图</div>
            </div>
          </Card>
        )}

        {state && assets.length === 0 && (
          <Card className="grid min-h-[360px] place-items-center p-6 text-center">
            <div className="max-w-md">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-[8px] border border-[var(--line)] bg-[#07120f]">
                <Boxes size={24} />
              </div>
              <h2 className="mt-4 text-xl font-semibold">还没有已学概念</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                回到首页生成几个互动组件后，这里会自动形成概念卡片。
              </p>
            </div>
          </Card>
        )}

        {groupEntries.length > 0 && (
          <section className="grid gap-5">
            {groupEntries.map(([topic, topicAssets]) => (
              <div key={topic} className="grid gap-3">
                <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-2">
                  <div className="flex items-center gap-2">
                    <Map size={17} className="text-[var(--accent)]" />
                    <h2 className="text-lg font-semibold">{topic}</h2>
                  </div>
                  <span className="text-sm text-[var(--muted)]">{topicAssets.length} 个概念</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {topicAssets.map((asset) => (
                    <Card key={`${asset.concept}-${asset.learned_at}`} className="grid gap-4 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-semibold">{asset.concept}</h3>
                          <p className="mt-1 text-xs text-[var(--muted)]">{asset.pattern}</p>
                        </div>
                        <span className="rounded-[8px] border border-[rgba(247,201,72,0.4)] bg-[rgba(247,201,72,0.1)] px-2 py-1 text-xs text-[var(--accent-2)]">
                          {understandingLabel[asset.understanding]}
                        </span>
                      </div>

                      <dl className="grid gap-2 text-sm">
                        <div className="flex justify-between gap-3">
                          <dt className="text-[var(--muted)]">Pattern</dt>
                          <dd className="truncate">{asset.pattern}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-[var(--muted)]">Template</dt>
                          <dd className="truncate">{asset.template}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-[var(--muted)]">理解深度</dt>
                          <dd>{understandingLabel[asset.understanding]}</dd>
                        </div>
                      </dl>

                      <div className="flex items-center gap-2 border-t border-[var(--line)] pt-3 text-xs text-[var(--muted)]">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <Clock3 size={14} />
                          {formatDate(asset.learned_at)}
                        </div>
                        <button
                          type="button"
                          className="tool-button min-h-9 px-3 text-xs"
                          title={`导出 ${asset.concept} 知识卡`}
                          onClick={() => downloadKnowledgeCard(asset)}
                        >
                          <Download size={14} />
                          导出
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

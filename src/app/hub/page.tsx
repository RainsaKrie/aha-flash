"use client";

import { ArrowLeft, BookOpen, BrainCircuit, CheckCircle2, Compass, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readCompletedFlows, readUserId, writeUserId, type CompletedFlowRecord } from "@/lib/utils/storage";
import type { KnowledgeAsset, UserState } from "@/types/state";

type HubCard = {
  id: string;
  title: string;
  subtitle: string;
  summary: string;
  concepts: string[];
  kind: "flow" | "asset";
  learnedAt: string;
  meta: string;
};

const EMPTY_ASSETS: KnowledgeAsset[] = [];

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function assetSummary(asset: KnowledgeAsset) {
  const patternCopy: Record<string, string> = {
    probability: "你用一次概率互动看见了不确定性如何被选择和成本包住。",
    parameter_explore: "你拖动过关键变量，看见结果如何跟着变化。",
    concept_memory: "你把几个关键词翻成了容易回忆的概念卡。",
    process_timeline: "你沿着阶段走了一遍，看见变化不是孤立发生。",
    comparison: "你把两个相近概念拆到不同维度里比较。",
    knowledge_check: "你通过一次判断题确认了概念边界。",
    system_builder: "你把模块拼进系统里，看见部分如何协作。",
    narrative_branch: "你走过一次选择分支，看见决策后果。",
    classification_sort: "你把例子分进类别，练了一次边界判断。",
    simulation_play: "你跑过一次模拟，看见机制在时间里滚动。",
  };
  return patternCopy[asset.pattern] || "你完成过一次互动理解，可以快速回看这个概念。";
}

function buildHubCards(flows: CompletedFlowRecord[], assets: KnowledgeAsset[]): HubCard[] {
  const flowCards = flows.map((flow) => ({
    id: `flow-${flow.flow_id}`,
    title: flow.title,
    subtitle: flow.category,
    summary: flow.summary,
    concepts: flow.concepts,
    kind: "flow" as const,
    learnedAt: flow.completed_at,
    meta: `${flow.completed_play_count} 关已点亮`,
  }));

  const flowConcepts = new Set(flows.flatMap((flow) => [flow.concept, ...flow.concepts]));
  const assetCards = assets
    .filter((asset) => !flowConcepts.has(asset.concept))
    .map((asset) => ({
      id: `asset-${asset.concept}-${asset.learned_at}`,
      title: asset.concept,
      subtitle: asset.topic_area || "概念",
      summary: assetSummary(asset),
      concepts: [asset.concept],
      kind: "asset" as const,
      learnedAt: asset.learned_at,
      meta: `${asset.pattern} / ${asset.template}`,
    }));

  return [...flowCards, ...assetCards].sort((a, b) => new Date(b.learnedAt).getTime() - new Date(a.learnedAt).getTime());
}

export default function HubPage() {
  const [state, setState] = useState<UserState | null>(null);
  const [completedFlows, setCompletedFlows] = useState<CompletedFlowRecord[]>([]);
  const [activeCard, setActiveCard] = useState<HubCard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCompletedFlows(readCompletedFlows());

    async function boot() {
      try {
        const stored = readUserId();
        const response = await fetch(`/api/state${stored ? `?userId=${stored}` : ""}`);
        if (!response.ok) throw new Error("state request failed");
        const nextState = (await response.json()) as UserState;
        writeUserId(nextState.user_id);
        setState(nextState);
      } catch {
        setError("个人图鉴暂时无法读取状态，但本机通关记录仍可查看。歇一下再来，它会自己恢复。");
      }
    }

    void boot();
  }, []);

  const assets = state?.knowledge_assets ?? EMPTY_ASSETS;
  const cards = useMemo(() => buildHubCards(completedFlows, assets), [assets, completedFlows]);
  const conceptCount = unique([...completedFlows.flatMap((flow) => flow.concepts), ...assets.map((asset) => asset.concept)]).length;
  const completedPlayCount = completedFlows.reduce((sum, flow) => sum + flow.completed_play_count, 0);
  const latest = cards[0] || null;

  return (
    <main className="hub-v5-screen">
      <div className="hub-v5-shell">
        <header className="hub-v5-topbar">
          <Link href="/explore" className="hub-v5-back" aria-label="返回探索">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p>MY HUB</p>
            <h1>个人图鉴</h1>
          </div>
        </header>

        <section className="hub-v5-hero">
          <div className="hub-v5-hero__copy">
            <p className="hub-v5-eyebrow">轻量回顾</p>
            <h2>看看你刚刚点亮了什么。</h2>
            <span>这里不做知识管理，只帮你在 30 秒内把已经玩过的机制重新捡起来。</span>
          </div>
          <div className="hub-v5-stats" aria-label="学习成就">
            <article>
              <CheckCircle2 size={20} />
              <strong>{completedPlayCount}</strong>
              <span>已闯过关卡</span>
            </article>
            <article>
              <BrainCircuit size={20} />
              <strong>{conceptCount}</strong>
              <span>邂逅概念</span>
            </article>
            <article>
              <Sparkles size={20} />
              <strong>{completedFlows.length}</strong>
              <span>完成话题</span>
            </article>
          </div>
        </section>

        {error && <div className="hub-v5-notice" role="status">{error}</div>}

        {cards.length === 0 ? (
          <section className="hub-v5-empty">
            <div className="hub-v5-orb"><Compass size={30} /></div>
            <h2>图鉴还没点亮</h2>
            <p>去 Explore 选一个话题，完成三关后这里会出现你的第一张回顾卡。</p>
            <Link href="/explore" className="hub-v5-primary-action">
              去探索话题
            </Link>
          </section>
        ) : (
          <section className="hub-v5-content">
            {latest && (
              <button type="button" className="hub-v5-feature-card" onClick={() => setActiveCard(latest)}>
                <span>最近点亮</span>
                <h2>{latest.title}</h2>
                <p>{latest.summary}</p>
                <div>
                  {latest.concepts.slice(0, 4).map((concept) => <strong key={concept}>{concept}</strong>)}
                </div>
              </button>
            )}

            <div className="hub-v5-card-grid">
              {cards.map((card) => (
                <button key={card.id} type="button" className="hub-v5-card" onClick={() => setActiveCard(card)}>
                  <div className="hub-v5-card__topline">
                    <span>{card.subtitle}</span>
                    <small>{formatDate(card.learnedAt)}</small>
                  </div>
                  <h3>{card.title}</h3>
                  <p>{card.summary}</p>
                  <div className="hub-v5-card__footer">
                    <span>{card.meta}</span>
                    <BookOpen size={16} />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {activeCard && (
        <div className="hub-v5-review" role="dialog" aria-modal="true" aria-label={`${activeCard.title} 快速回顾`}>
          <button type="button" className="hub-v5-review__scrim" aria-label="关闭回顾" onClick={() => setActiveCard(null)} />
          <section className="hub-v5-review__panel">
            <div className="hub-v5-review__icon"><RotateCcw size={24} /></div>
            <p>30 秒回顾</p>
            <h2>{activeCard.title}</h2>
            <strong>{activeCard.summary}</strong>
            <div className="hub-v5-review__chips">
              {activeCard.concepts.map((concept) => <span key={concept}>{concept}</span>)}
            </div>
            <button type="button" className="hub-v5-primary-action" onClick={() => setActiveCard(null)}>
              记起来了
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
"use client";

import { BookOpen, BrainCircuit, CheckCircle2, Compass, Home, LibraryBig, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readCompletedFlows, readUserId, writeUserId, type CompletedFlowRecord } from "@/lib/utils/storage";
import type { KnowledgeAsset, UserState } from "@/types/state";

type HubTone = "blue" | "purple" | "orange" | "green";

type HubCard = {
  id: string;
  title: string;
  subtitle: string;
  summary: string;
  concepts: string[];
  kind: "flow" | "asset";
  learnedAt: string;
  meta: string;
  tone: HubTone;
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

function resolveHubTone(values: Array<string | undefined | null>, fallback: HubTone = "blue"): HubTone {
  const text = values.filter(Boolean).join(" ").toLowerCase();

  if (/(\u91d1\u878d|\u7ecf\u6d4e|\u80a1\u7968|\u671f\u6743|\u901a\u80c0|\u901a\u7f29|\u4f9b\u9700|\u4ef7\u683c|\u503a\u52a1|\u8d2d\u4e70\u529b|inflation|deflation|supply|demand|finance|stock|option)/i.test(text)) {
    return "green";
  }

  if (/(\u5386\u53f2|\u5de5\u4e1a|\u9769\u547d|\u65f6\u95f4|\u6f14\u5316|process_timeline|narrative_branch|history|timeline|industrial)/i.test(text)) {
    return "orange";
  }

  if (/(\u6570\u7406|\u6982\u7387|\u8d1d\u53f6\u65af|\u590d\u5229|\u7edf\u8ba1|\u5047\u8bbe|\u5206\u5e03|probability|simulation_play|bayes|statistics)/i.test(text)) {
    return "purple";
  }

  if (/(\u79d1\u6280|\u7cfb\u7edf|\u6280\u672f|\u7f51\u7edc|dns|system_builder|concept_memory|knowledge_check|parameter_explore|technology|network|system)/i.test(text)) {
    return "blue";
  }

  return fallback;
}

function assetSummary(asset: KnowledgeAsset) {
  const patternCopy: Record<string, string> = {
    probability: "你看见了不确定性如何被选择和成本包住。",
    parameter_explore: "你拖动过关键变量，看见结果如何跟着变化。",
    concept_memory: "你把关键词翻成了容易回忆的概念卡。",
    process_timeline: "你沿着阶段走了一遍，看见变化如何发生。",
    comparison: "你把相近概念拆到不同维度里比较。",
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
    tone: resolveHubTone([flow.category, flow.title, flow.concept, flow.summary, ...flow.concepts]),
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
      tone: resolveHubTone([asset.topic_area, asset.concept, asset.pattern, asset.template]),
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
    const timer = window.setTimeout(() => setCompletedFlows(readCompletedFlows()), 0);

    async function boot() {
      try {
        const stored = readUserId();
        const response = await fetch(`/api/state${stored ? `?userId=${stored}` : ""}`);
        if (!response.ok) throw new Error("state request failed");
        const nextState = (await response.json()) as UserState;
        writeUserId(nextState.user_id);
        setState(nextState);
      } catch {
        setError("图鉴暂时无法同步，本机记录仍可查看。");
      }
    }

    void boot();

    return () => window.clearTimeout(timer);
  }, []);

  const assets = state?.knowledge_assets ?? EMPTY_ASSETS;
  const cards = useMemo(() => buildHubCards(completedFlows, assets), [assets, completedFlows]);
  const journeyCards = useMemo(() => [...cards].reverse(), [cards]);
  const conceptCount = unique([...completedFlows.flatMap((flow) => flow.concepts), ...assets.map((asset) => asset.concept)]).length;
  const completedPlayCount = completedFlows.reduce((sum, flow) => sum + flow.completed_play_count, 0);
  const latest = cards[0] || null;

  return (
    <main className="hub-v5-screen v5-showcase-shell hub-v5-book hub-v5-journey-book">
      <header className="v5-topbar">
        <Link href="/explore" className="brand-mark" aria-label="趣灵首页">
          <span className="brand-mark__icon">
            <BrainCircuit size={20} />
          </span>
          <span className="brand-mark__text">趣灵</span>
        </Link>
        <nav className="topbar-actions" aria-label="主导航">
          <Link href="/explore" className="tool-button" title="回到首页">
            <Home size={17} /> 首页
          </Link>
          <Link href="/hub" className="tool-button tool-button--active" aria-current="page" title="打开我的图鉴">
            <LibraryBig size={16} /> 我的图鉴
          </Link>
        </nav>
      </header>

      <div className="hub-v5-shell">
        <section className="hub-v5-cover" aria-labelledby="hub-title">
          <div className="hub-v5-cover__copy">
            <p className="hub-v5-eyebrow">我的路径</p>
            <h1 id="hub-title">你走过了 {cards.length} 个节点</h1>
            <p>这里不是卡片仓库，而是你的知识足迹。</p>
            <div className="hub-v5-cover__chips" aria-label="学习成就">
              <span><CheckCircle2 size={17} /> {completedPlayCount} 关</span>
              <span><BrainCircuit size={17} /> {conceptCount} 概念</span>
              <span><Sparkles size={17} /> {completedFlows.length} 话题</span>
            </div>
          </div>
          <div className="hub-v5-cover__badge" aria-hidden="true">
            <LibraryBig size={38} />
            <strong>{cards.length || "0"}</strong>
            <span>个节点</span>
          </div>
        </section>

        {error && <div className="hub-v5-notice" role="status">{error}</div>}

        {cards.length === 0 ? (
          <section className="hub-v5-empty">
            <div className="hub-v5-orb"><Compass size={30} /></div>
            <h2>还没有走过的节点</h2>
            <p>完成一个话题后，这里会生成你的路径。</p>
            <Link href="/explore" className="hub-v5-primary-action">
              去点亮第一关
            </Link>
          </section>
        ) : (
          <section className="hub-v5-journey" aria-label="知识路径足迹">
            <header className="hub-v5-journey__header">
              <div>
                <p className="hub-v5-eyebrow">Journey Trail</p>
                <h2>走过的路径</h2>
              </div>
              {latest && (
                <button type="button" className="hub-v5-current-node" onClick={() => setActiveCard(latest)}>
                  <span>最近点亮</span>
                  <strong>{latest.title}</strong>
                </button>
              )}
            </header>

            <div className="hub-v5-journey__rail">
              {journeyCards.map((card, index) => (
                <button key={card.id} type="button" className={`hub-v5-journey-node hub-v5-journey-node--${card.tone}`} onClick={() => setActiveCard(card)}>
                  <span className="hub-v5-journey-node__index">{String(index + 1).padStart(2, "0")}</span>
                  <div className="hub-v5-journey-node__body">
                    <div className="hub-v5-journey-node__topline">
                      <span>{card.subtitle}</span>
                      <small>{formatDate(card.learnedAt)}</small>
                    </div>
                    <h3>{card.title}</h3>
                    <p>{card.summary}</p>
                    <div className="hub-v5-card__concepts">
                      {card.concepts.slice(0, 3).map((concept) => <span key={concept}>{concept}</span>)}
                    </div>
                  </div>
                  <span className="hub-v5-journey-node__meta">
                    {card.meta}
                    <BookOpen size={16} />
                  </span>
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
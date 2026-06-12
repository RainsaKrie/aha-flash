"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Home, RotateCcw, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { renderBySchema } from "@/components/generative-ui/registry";
import { SpiritHint } from "@/components/spirit-hint";
import { getVisualAsset } from "@/lib/content/visual-assets";
import { recordCompletedFlow } from "@/lib/utils/storage";
import type { KnowledgeFlow } from "@/lib/content/mock-flows";
import { normalizeUISchema, type InteractionEvent } from "@/types/schema";

export function KnowledgeFlowPlayer({ flow }: { flow: KnowledgeFlow }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [hasTouchedStage, setHasTouchedStage] = useState(false);

  const activePlay = flow.plays[activeIndex] || flow.plays[0];
  const normalized = useMemo(() => normalizeUISchema(activePlay.schema), [activePlay.schema]);
  const asset = getVisualAsset(normalized.pattern, normalized.visual_asset);
  const isCompleted = completedIds.includes(activePlay.id);
  const hasNext = activeIndex < flow.plays.length - 1;
  const progress = Math.round(((activeIndex + (isCompleted ? 1 : 0)) / flow.plays.length) * 100);
  const showSummary = isCompleted && !hasNext;

  useEffect(() => {
    setHasTouchedStage(completedIds.includes(activePlay.id));
  }, [activePlay.id, completedIds]);

  useEffect(() => {
    if (!showSummary) return;
    recordCompletedFlow({
      flow_id: flow.id,
      title: flow.title,
      concept: flow.concept,
      category: flow.category,
      summary: flow.summary,
      concepts: flow.concepts,
      completed_play_count: flow.plays.length,
    });
  }, [flow, showSummary]);

  function markComplete(_event?: InteractionEvent) {
    setHasTouchedStage(true);
    setCompletedIds((ids) => (ids.includes(activePlay.id) ? ids : [...ids, activePlay.id]));
  }

  function goNext() {
    if (!hasNext) return;
    setActiveIndex((index) => index + 1);
  }

  function restart() {
    setActiveIndex(0);
    setCompletedIds([]);
    setHasTouchedStage(false);
  }

  return (
    <main className="v5-flow-screen" style={{ "--flow-accent": asset.accentVar } as CSSProperties}>
      <header className="v5-flow-topbar">
        <Link href="/explore" className="v5-flow-exit" aria-label="退出当前 Flow">
          <X size={18} />
        </Link>
        <div className="v5-flow-progress" aria-label={`当前进度 ${activeIndex + 1}/${flow.plays.length}`}>
          <div className="v5-flow-progress__meta">
            <span>{flow.title}</span>
            <strong>{activeIndex + 1} / {flow.plays.length}</strong>
          </div>
          <div className="v5-flow-progress__track">
            <motion.span animate={{ width: `${progress}%` }} transition={{ duration: 0.28, ease: "easeOut" }} />
          </div>
        </div>
      </header>

      <section className="v5-flow-stage" aria-label="当前关卡">
        <div className="v5-flow-stage__heading">
          <div className="visual-asset-token" aria-hidden="true">
            <span>{asset.emoji}</span>
          </div>
          <div>
            <p>{flow.category} · {flow.estimated_minutes} 分钟</p>
            <h1>{activePlay.title}</h1>
            <span>{flow.hook}</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {showSummary ? (
            <motion.div
              key="summary"
              className="v5-flow-summary"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              <Sparkles size={30} />
              <p>本话题完成</p>
              <h2>已掌握 {flow.concepts.length} 个概念</h2>
              <div className="v5-flow-summary__chips">
                {flow.concepts.map((concept) => (
                  <span key={concept}>{concept}</span>
                ))}
              </div>
              <strong>{flow.summary}</strong>
            </motion.div>
          ) : (
            <motion.div
              key={activePlay.id}
              className="v5-flow-component-card"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              onPointerDown={() => setHasTouchedStage(true)}
            >
              {renderBySchema(activePlay.schema, {
                onInteraction: () => setHasTouchedStage(true),
                onComplete: (event) => markComplete(event),
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <footer className="v5-flow-actionbar" data-state={isCompleted ? "success" : hasTouchedStage ? "ready" : "idle"}>
        <SpiritHint tone={isCompleted ? "reward" : hasTouchedStage ? "idle" : "neutral"} compact title="趣灵">
          {isCompleted
            ? activePlay.reward_copy
            : hasTouchedStage
              ? "准备好了就检查这一关。"
              : "先和中间的卡片互动一下，再看反馈。"}
        </SpiritHint>

        <div className="v5-flow-actionbar__buttons">
          {!isCompleted && (
            <button type="button" className="v5-flow-main-action" disabled={!hasTouchedStage} onClick={() => markComplete()}>
              <CheckCircle2 size={18} /> {hasTouchedStage ? "检查这一关" : "先互动一下"}
            </button>
          )}
          {isCompleted && hasNext && (
            <button type="button" className="v5-flow-main-action" onClick={goNext}>
              继续下一关 <ArrowRight size={18} />
            </button>
          )}
          {showSummary && (
            <>
              <Link href="/explore" className="v5-flow-main-action">
                <Home size={18} /> 继续探索
              </Link>
              <button type="button" className="v5-flow-secondary-action" onClick={restart}>
                <RotateCcw size={17} /> 再玩一遍
              </button>
            </>
          )}
        </div>
      </footer>
    </main>
  );
}

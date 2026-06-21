"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, GitBranch, Home, Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { renderBySchema } from "@/components/generative-ui/registry";
import { SpiritHint } from "@/components/spirit-hint";
import { getFlowFollowUps, type FollowUpTopic, type KnowledgeFlow } from "@/lib/content/mock-flows";
import { getVisualAsset } from "@/lib/content/visual-assets";
import { recordCompletedFlow, writeFlowDraft, type FlowDraftDebug } from "@/lib/utils/storage";
import { normalizeUISchema, type InteractionEvent } from "@/types/schema";

interface FlowApiResponse {
  flow: KnowledgeFlow;
  source: "llm" | "mock";
  validation_error?: string;
  raw_output?: string;
  raw_plan_output?: string;
  concept_plan?: unknown;
  blueprint?: unknown;
  quality_gate?: unknown;
  failure?: { message: string; title?: string; code?: string };
}

export function KnowledgeFlowPlayer({ flow, debug }: { flow: KnowledgeFlow; debug?: FlowDraftDebug }) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [touchedPlayIds, setTouchedPlayIds] = useState<string[]>([]);
  const [branchGeneratingId, setBranchGeneratingId] = useState<string | null>(null);
  const [branchError, setBranchError] = useState<string | null>(null);

  const activePlay = flow.plays[activeIndex] || flow.plays[0];
  const normalized = useMemo(() => normalizeUISchema(activePlay.schema), [activePlay.schema]);
  const followUps = useMemo(() => (flow.follow_ups?.length ? flow.follow_ups : getFlowFollowUps(flow.id)), [flow.follow_ups, flow.id]);
  const asset = getVisualAsset(normalized.pattern, normalized.visual_asset);
  const isCompleted = completedIds.includes(activePlay.id);
  const hasTouchedStage = isCompleted || touchedPlayIds.includes(activePlay.id);
  const hasNext = activeIndex < flow.plays.length - 1;
  const progress = Math.round(((activeIndex + (isCompleted ? 1 : 0)) / flow.plays.length) * 100);
  const showBranches = isCompleted && !hasNext;
  const debugGate =
    debug?.quality_gate && typeof debug.quality_gate === "object"
      ? (debug.quality_gate as { ok?: boolean; score?: number })
      : null;

  const persistCompletion = useCallback(() => {
    recordCompletedFlow({
      flow_id: flow.id,
      title: flow.title,
      concept: flow.concept,
      category: flow.category,
      summary: flow.summary,
      concepts: flow.concepts,
      completed_play_count: flow.plays.length,
      source: flow.source || (flow.id.startsWith("custom-") ? "generated" : "curated"),
    });
  }, [flow]);

  useEffect(() => {
    if (!showBranches) return;
    persistCompletion();
  }, [persistCompletion, showBranches]);

  function touchStage() {
    setTouchedPlayIds((ids) => (ids.includes(activePlay.id) ? ids : [...ids, activePlay.id]));
  }

  function markComplete(_event?: InteractionEvent) {
    touchStage();
    setCompletedIds((ids) => (ids.includes(activePlay.id) ? ids : [...ids, activePlay.id]));
  }

  function goNext() {
    if (!hasNext) return;
    setActiveIndex((index) => index + 1);
  }

  function restart() {
    setActiveIndex(0);
    setCompletedIds([]);
    setTouchedPlayIds([]);
    setBranchError(null);
  }

  async function generateFollowUp(topic: FollowUpTopic) {
    setBranchGeneratingId(topic.id);
    setBranchError(null);
    persistCompletion();

    try {
      const response = await fetch("/api/flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.concept || topic.title,
          preferredPattern: topic.suggestedPattern || "auto",
        }),
      });
      if (!response.ok) throw new Error(`flow request failed: ${response.status}`);
      const payload = (await response.json()) as FlowApiResponse;
      if (payload.failure) throw new Error(payload.failure.message);
      const nextFlow = payload.flow;
      const draftId = nextFlow.id || crypto.randomUUID();
      const debug: FlowDraftDebug = {
        source: payload.source,
        validation_error: payload.validation_error,
        raw_output: payload.raw_output,
        raw_plan_output: payload.raw_plan_output,
        concept_plan: payload.concept_plan,
        blueprint: payload.blueprint,
        quality_gate: payload.quality_gate,
      };
      if (!writeFlowDraft(draftId, nextFlow, debug)) throw new Error("无法保存下一段学习路径，请允许浏览器会话存储后重试。");
      router.push(`/flow/custom?draftId=${encodeURIComponent(draftId)}`);
    } catch (error) {
      setBranchError(error instanceof Error ? error.message : String(error));
    } finally {
      setBranchGeneratingId(null);
    }
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
          {showBranches ? (
            <motion.div
              key="branches"
              className="v5-flow-summary v5-flow-branch-panel"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              <Sparkles size={30} />
              <p>这个节点已点亮</p>
              <h2>现在往哪里走？</h2>
              <strong>{flow.summary}</strong>
              <div className="v5-flow-summary__chips">
                {flow.concepts.map((concept) => (
                  <span key={concept}>{concept}</span>
                ))}
              </div>
              <div className="v5-flow-branches" aria-label="下一步知识分支">
                {followUps.map((topic) => {
                  const content = (
                    <>
                      <span><GitBranch size={16} /> {topic.kind === "ai_seed" ? "AI 延伸" : "精选路径"}</span>
                      <h3>{topic.title}</h3>
                      <p>{topic.hook}</p>
                      <small>{topic.relation}</small>
                      {branchGeneratingId === topic.id && <em><Loader2 size={14} className="animate-spin" /> 正在生成</em>}
                    </>
                  );

                  if (topic.target_flow_id) {
                    return (
                      <Link key={topic.id} href={`/flow/${topic.target_flow_id}`} className="v5-flow-branch-card" onClick={persistCompletion}>
                        {content}
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={topic.id}
                      type="button"
                      className="v5-flow-branch-card"
                      disabled={Boolean(branchGeneratingId)}
                      onClick={() => void generateFollowUp(topic)}
                    >
                      {content}
                    </button>
                  );
                })}
              </div>
              {branchError && <p className="v5-flow-branch-error">延伸生成失败：{branchError}</p>}
            </motion.div>
          ) : (
            <motion.div
              key={activePlay.id}
              className="v5-flow-component-card"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              onPointerDown={touchStage}
            >
              {renderBySchema(activePlay.schema, {
                onInteraction: touchStage,
                onComplete: (event) => markComplete(event),
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <footer className="v5-flow-actionbar" data-state={isCompleted ? "success" : hasTouchedStage ? "ready" : "idle"}>
        <SpiritHint tone={isCompleted ? "reward" : hasTouchedStage ? "idle" : "neutral"} compact title="趣灵">
          {showBranches
            ? "选一个分支继续走；只有想换领域时，再回首页。"
            : isCompleted
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
          {showBranches && (
            <>
              <Link href="/explore" className="v5-flow-secondary-action" onClick={persistCompletion}>
                <Home size={17} /> 换个起点
              </Link>
              <button type="button" className="v5-flow-secondary-action" onClick={restart}>
                <RotateCcw size={17} /> 再走一遍
              </button>
            </>
          )}
        </div>
      </footer>

      {process.env.NODE_ENV !== "production" && debug && (
        <details className="v6-flow-inspector">
          <summary>
            <span>V6 Inspector</span>
            <strong data-state={debugGate?.ok === false ? "fail" : "pass"}>
              {debug.source || "unknown"}
              {typeof debugGate?.score === "number" ? ` score ${debugGate.score}` : ""}
            </strong>
          </summary>
          <pre>
            {JSON.stringify(
              {
                source: debug.source,
                validation_error: debug.validation_error,
                concept_plan: debug.concept_plan,
                blueprint: debug.blueprint,
                quality_gate: debug.quality_gate,
                raw_plan_output: debug.raw_plan_output,
                raw_output: debug.raw_output,
              },
              null,
              2,
            )}
          </pre>
        </details>
      )}
    </main>
  );
}

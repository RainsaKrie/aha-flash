"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, GitBranch, Home, LibraryBig, Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { renderBySchema } from "@/components/generative-ui/registry";
import { SpiritHint } from "@/components/spirit-hint";
import {
  getAnalyticsHeaders,
  markFlowCompletedForSession,
  shouldTrackSecondFlow,
  submitFeedback,
  trackEvent,
} from "@/lib/analytics/client";
import { getFlowFollowUps, type FollowUpTopic, type KnowledgeFlow } from "@/lib/content/mock-flows";
import { getVisualAsset } from "@/lib/content/visual-assets";
import { recordCompletedFlow, writeFlowDraft, type FlowDraftDebug } from "@/lib/utils/storage";
import { normalizeUISchema, type InteractionEvent } from "@/types/schema";

import {
  clearPublicBetaInviteCode,
  readPublicBetaInviteCode,
} from '@/lib/public-beta/client';

const completionHints: Record<string, string> = {
  probability: "你已经把自己的判断和出现的结果放在一起看过了。",
  parameter_explore: "你刚才改了一个条件，也看见它会怎样影响后面的结果。",
  concept_memory: "你已经把容易混淆的几个概念分开了。",
  process_timeline: "你已经沿着这条路径走完了一遍。",
  comparison: "把两边放在同一个问题里看，差别就更清楚了。",
  knowledge_check: "你已经用自己的判断验证了这一关。",
  system_builder: "你已经把关键环节连起来了。",
  narrative_branch: "你已经做出一个选择，也看到了它会把问题带向哪里。",
  classification_sort: "每张卡都按同一条标准分清楚了。",
  simulation_play: "你已经走完整个推演，可以回头看看是哪一个条件改变了结果。",
};

function completionHint(pattern: string) {
  return completionHints[pattern] || "你已经完成这一关，可以带着刚才的判断继续往下走。";
}
interface FlowApiResponse {
  flow: KnowledgeFlow;
  source: "llm" | "cache" | "fallback";
  validation_error?: string;
  raw_output?: string;
  raw_plan_output?: string;
  concept_plan?: unknown;
  blueprint?: unknown;
  quality_gate?: unknown;
  failure?: { message: string; title?: string; code?: string };
}

type PublicFlowSource = "static" | "llm" | "cache" | "fallback";

export function KnowledgeFlowPlayer({
  flow,
  debug,
  flowSource,
}: {
  flow: KnowledgeFlow;
  debug?: FlowDraftDebug;
  flowSource?: PublicFlowSource;
}) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [touchedPlayIds, setTouchedPlayIds] = useState<string[]>([]);
  const [branchGeneratingId, setBranchGeneratingId] = useState<string | null>(null);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [showDebugInspector, setShowDebugInspector] = useState(false);
  const [publicMode, setPublicMode] = useState<"static" | "invite" | "open">("static");
  const [feedbackRating, setFeedbackRating] = useState<"understood" | "mostly" | "confused" | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const startedAtRef = useRef<number | null>(null);
  const completedTrackedRef = useRef(false);
  const exitTrackedRef = useRef(false);

  const activePlay = flow.plays[activeIndex] || flow.plays[0];
  const normalized = useMemo(() => normalizeUISchema(activePlay.schema), [activePlay.schema]);
  const followUps = useMemo(() => (flow.follow_ups?.length ? flow.follow_ups : getFlowFollowUps(flow.id)), [flow.follow_ups, flow.id]);
  const visibleFollowUps = useMemo(
    () => followUps.filter((topic) => Boolean(topic.target_flow_id) || publicMode !== "static"),
    [followUps, publicMode],
  );
  const resolvedFlowSource: PublicFlowSource = flowSource
    || (debug?.source === "llm" || debug?.source === "cache" || debug?.source === "fallback"
      ? debug.source
      : flow.id.startsWith("custom-")
        ? "fallback"
        : "static");
  const asset = getVisualAsset(normalized.pattern, normalized.visual_asset);
  const isCompleted = completedIds.includes(activePlay.id);
  const hasTouchedStage = isCompleted || touchedPlayIds.includes(activePlay.id);
  const hasNext = activeIndex < flow.plays.length - 1;
  const internallyCompletedPatterns = [
    "probability",
    "concept_memory",
    "comparison",
    "knowledge_check",
    "system_builder",
    "classification_sort",
    "simulation_play",
    "narrative_branch",
  ];
  const requiresInternalCompletion =
    internallyCompletedPatterns.includes(normalized.pattern) ||
    normalized.template === "sequence_order" ||
    normalized.template === "parameter_simulation";
  const progress = Math.round(((activeIndex + (isCompleted ? 1 : 0)) / flow.plays.length) * 100);
  const showBranches = isCompleted && !hasNext;
  const debugGate =
    debug?.quality_gate && typeof debug.quality_gate === "object"
      ? (debug.quality_gate as { ok?: boolean; score?: number })
      : null;

  const trackExit = useCallback(() => {
    if (completedTrackedRef.current || exitTrackedRef.current) return;
    exitTrackedRef.current = true;
    void trackEvent('flow_exited', {
      flow_id: flow.id,
      flow_source: resolvedFlowSource,
      step_index: activeIndex,
      elapsed_ms: Date.now() - (startedAtRef.current || Date.now()),
    });
  }, [activeIndex, flow.id, resolvedFlowSource]);

  const persistCompletion = useCallback(() => {
    recordCompletedFlow({
      flow_id: flow.id,
      title: flow.title,
      concept: flow.concept,
      category: flow.category,
      summary: flow.summary,
      concepts: flow.concepts?.length ? flow.concepts : [flow.concept || flow.title],
      completed_play_count: flow.plays.length,
      source: flow.source || (flow.id.startsWith("custom-") ? "generated" : "curated"),
    });
  }, [flow]);

  useEffect(() => {
    // This client-only flag mirrors the debug query parameter after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowDebugInspector(new URLSearchParams(window.location.search).get("debug") === "1");
    void fetch("/api/public-beta/config", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload: { mode?: "static" | "invite" | "open" } | null) => {
        if (payload?.mode) setPublicMode(payload.mode);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    startedAtRef.current = Date.now();
    void trackEvent("flow_started", {
      flow_id: flow.id,
      flow_source: resolvedFlowSource,
    });
    if (shouldTrackSecondFlow(flow.id)) {
      void trackEvent("second_flow_started", {
        flow_id: flow.id,
        flow_source: resolvedFlowSource,
      });
    }
  }, [flow.id, resolvedFlowSource]);

  useEffect(() => {
    const exitLink = document.querySelector('.v5-flow-exit');
    const handleExit = () => trackExit();
    exitLink?.addEventListener('click', handleExit);
    window.addEventListener('pagehide', handleExit);
    return () => {
      exitLink?.removeEventListener('click', handleExit);
      window.removeEventListener('pagehide', handleExit);
    };
  }, [trackExit]);

  useEffect(() => {
    if (!showBranches) return;
    persistCompletion();
    if (completedTrackedRef.current) return;
    completedTrackedRef.current = true;
    markFlowCompletedForSession(flow.id);
    void trackEvent("flow_completed", {
      flow_id: flow.id,
      flow_source: resolvedFlowSource,
      elapsed_ms: Date.now() - (startedAtRef.current || Date.now()),
    });
  }, [flow.id, persistCompletion, resolvedFlowSource, showBranches]);

  function touchStage() {
    setTouchedPlayIds((ids) => {
      if (ids.includes(activePlay.id)) return ids;
      void trackEvent("step_interacted", {
        flow_id: flow.id,
        flow_source: resolvedFlowSource,
        step_index: activeIndex,
      });
      return [...ids, activePlay.id];
    });
  }

  function markComplete(_event?: InteractionEvent) {
    touchStage();
    setCompletedIds((ids) => {
      if (ids.includes(activePlay.id)) return ids;
      void trackEvent("step_completed", {
        flow_id: flow.id,
        flow_source: resolvedFlowSource,
        step_index: activeIndex,
        elapsed_ms: Date.now() - (startedAtRef.current || Date.now()),
      });
      return [...ids, activePlay.id];
    });
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
    setFeedbackRating(null);
    setFeedbackComment("");
    setFeedbackStatus("idle");
    completedTrackedRef.current = false;
    exitTrackedRef.current = false;
    startedAtRef.current = Date.now();
  }

  function trackNextTopic() {
    persistCompletion();
    void trackEvent("next_topic_clicked", {
      flow_id: flow.id,
      flow_source: resolvedFlowSource,
    });
  }

  async function generateFollowUp(topic: FollowUpTopic) {
    const inviteCode = readPublicBetaInviteCode();
    if (publicMode === 'invite' && !inviteCode) {
      setBranchError('本次邀请已经失效，请返回探索页重新输入邀请码。');
      return;
    }
    setBranchGeneratingId(topic.id);
    setBranchError(null);
    trackNextTopic();

    try {
      const response = await fetch("/api/flow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAnalyticsHeaders(),
        },
        body: JSON.stringify({
          inviteCode: publicMode === 'invite' ? inviteCode : undefined,
          topic: topic.concept || topic.title,
          preferredPattern: topic.suggestedPattern || "auto",
        }),
      });
      if (!response.ok) {
        if ((response.status === 401 || response.status === 403) && publicMode === 'invite') {
          clearPublicBetaInviteCode();
          throw new Error('邀请码已失效，请返回探索页重新验证。');
        }
        throw new Error(`flow request failed: ${response.status}`);
      }
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

  async function sendFeedback() {
    if (!feedbackRating || feedbackStatus === "sending" || feedbackStatus === "sent") return;
    setFeedbackStatus("sending");
    const accepted = await submitFeedback({
      rating: feedbackRating,
      comment: feedbackComment.trim() || undefined,
      flow_id: flow.id,
      flow_source: resolvedFlowSource,
    });
    setFeedbackStatus(accepted ? "sent" : "error");
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
              <div className="v5-flow-branches" aria-label="下一步知识分支">
                {visibleFollowUps.map((topic) => {
                  const content = (
                    <>
                      <span><GitBranch size={16} /> {topic.kind === "ai_seed" ? "继续探索" : "精选路径"}</span>
                      <h3>{topic.title}</h3>
                      <p>{topic.hook}</p>
                      <small>{topic.relation}</small>
                      {branchGeneratingId === topic.id && <em><Loader2 size={14} className="animate-spin" /> 正在生成</em>}
                    </>
                  );

                  if (topic.target_flow_id) {
                    return (
                      <Link key={topic.id} href={`/flow/${topic.target_flow_id}`} className="v5-flow-branch-card" onClick={trackNextTopic}>
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
              <section className="v5-flow-feedback" aria-labelledby="flow-feedback-title">
                <div>
                  <p>快速反馈</p>
                  <h3 id="flow-feedback-title">这次你感觉自己真的懂了吗？</h3>
                </div>
                <div className="v5-flow-feedback__choices">
                  {([
                    ["understood", "懂了"],
                    ["mostly", "大概懂了"],
                    ["confused", "还是有点懵"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={feedbackRating === value}
                      onClick={() => {
                        setFeedbackRating(value);
                        if (feedbackStatus === "error") setFeedbackStatus("idle");
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {feedbackRating && feedbackStatus !== "sent" && (
                  <>
                    <textarea
                      value={feedbackComment}
                      maxLength={240}
                      onChange={(event) => setFeedbackComment(event.target.value)}
                      placeholder="哪里最清楚，或哪里还没讲明白？（可选）"
                    />
                    <button
                      type="button"
                      className="v5-flow-feedback__submit"
                      disabled={feedbackStatus === "sending"}
                      onClick={() => void sendFeedback()}
                    >
                      {feedbackStatus === "sending" ? "正在提交" : "提交反馈"}
                    </button>
                  </>
                )}
                {feedbackStatus === "sent" && <small>收到，谢谢你帮趣灵讲得更清楚。</small>}
                {feedbackStatus === "error" && <small>反馈暂时没送达，但不影响本次完成。</small>}
              </section>
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

      <footer className="v5-flow-actionbar" data-state={isCompleted ? "success" : hasTouchedStage && !requiresInternalCompletion ? "ready" : "idle"}>
        <SpiritHint tone={isCompleted ? "reward" : hasTouchedStage && !requiresInternalCompletion ? "idle" : "neutral"} compact title="趣灵">
          {showBranches
            ? "选一个分支继续走；只有想换领域时，再回首页。"
            : isCompleted
              ? completionHint(normalized.pattern)
              : hasTouchedStage
                ? requiresInternalCompletion
                  ? "按卡片里的提示完成这一步。"
                  : "准备好了就检查这一关。"
                : "先和中间的卡片互动一下，再看反馈。"}
        </SpiritHint>

        <div className="v5-flow-actionbar__buttons">
          {!isCompleted && !requiresInternalCompletion && (
            <button type="button" className="v5-flow-main-action" disabled={!hasTouchedStage} onClick={() => markComplete()}>
              <CheckCircle2 size={18} /> {hasTouchedStage ? "检查这一关" : "先互动一下"}
            </button>
          )}
          {!isCompleted && requiresInternalCompletion && (
            <span className="v5-flow-actionbar__hint">
              {hasTouchedStage ? "继续完成卡片内任务。" : "先在卡片内完成互动。"}
            </span>
          )}
          {isCompleted && hasNext && (
            <button type="button" className="v5-flow-main-action" onClick={goNext}>
              继续下一关 <ArrowRight size={18} />
            </button>
          )}
          {showBranches && (
            <>
              <Link href="/hub" className="v5-flow-main-action" onClick={persistCompletion}>
                <LibraryBig size={17} /> 查看我的图鉴
              </Link>
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

      {process.env.NODE_ENV !== "production" && showDebugInspector && debug && (
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

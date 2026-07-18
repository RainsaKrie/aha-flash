"use client";

import { motion } from "framer-motion";
import { ArrowRight, BrainCircuit, Gauge, Home, LibraryBig, Loader2, Sparkles, Timer } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { getAnalyticsHeaders, trackEvent } from "@/lib/analytics/client";
import { getShowcaseFlows, type KnowledgeFlow } from "@/lib/content/mock-flows";
import { writeFlowDraft, type FlowDraftDebug } from "@/lib/utils/storage";

import { rememberPublicBetaInviteCode } from '@/lib/public-beta/client';

const SHOWCASE_FLOWS = getShowcaseFlows();

interface QualityGateSummary {
  score?: number;
  reason?: string;
  failures?: string[];
  warnings?: string[];
}

interface FlowFailureResponse {
  message: string;
  title?: string;
  code?: string;
  retryable?: boolean;
  quality_gate?: QualityGateSummary;
  actions?: string[];
  curated_flow_ids?: string[];
}

interface GenerationPreviewStep {
  label: string;
}

interface GenerationPreview {
  topic: string;
  structure: string;
  steps: GenerationPreviewStep[];
  gate: "pass" | "warn" | "unknown";
  source: "llm" | "cache" | "fallback";
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
  preview?: GenerationPreview;
  failure?: FlowFailureResponse;
}

interface PublicRuntimeConfig {
  mode: "static" | "invite" | "open";
  dynamic_enabled: boolean;
  requires_invite: boolean;
  reason?: "disabled" | "storage_unavailable" | "request_limit" | "token_budget";
}

const INPUT_EXAMPLES = ["\u7ebf\u6027\u89c4\u5212", "DNS \u89e3\u6790", "\u8d1d\u53f6\u65af\u5b9a\u7406", "\u590d\u5229\u6548\u5e94"];
const GENERATION_STEPS = [
  { id: "concept_plan", label: "先找一个好入口" },
  { id: "blueprint", label: "把它拆成几步" },
  { id: "flow", label: "准备动手试试" },
  { id: "quality_gate", label: "确认这条路讲得通" },
] as const;

type GenerationStage = (typeof GENERATION_STEPS)[number]["id"] | "repair" | "fallback";

class FlowRequestError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
    this.name = "FlowRequestError";
  }
}

function isGenerationStage(value: unknown): value is GenerationStage {
  return value === "concept_plan"
    || value === "blueprint"
    || value === "flow"
    || value === "quality_gate"
    || value === "repair"
    || value === "fallback";
}

async function readFlowEventStream(
  response: Response,
  onStage: (stage: GenerationStage) => void,
): Promise<FlowApiResponse> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("生成连接意外中断，请再试一次。");

  const decoder = new TextDecoder();
  let buffer = "";
  let result: FlowApiResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });

    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const event = block.match(/^event:\s*(.+)$/m)?.[1]?.trim();
      const data = block.match(/^data:\s*(.+)$/m)?.[1];

      if (event && data) {
        const payload: unknown = JSON.parse(data);
        if (event === "stage" && typeof payload === "object" && payload && "stage" in payload && isGenerationStage(payload.stage)) {
          onStage(payload.stage);
        }
        if (event === "result") result = payload as FlowApiResponse;
        if (event === "error") {
          const message = typeof payload === "object" && payload && "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "生成连接意外中断，请再试一次。";
          const code = typeof payload === "object" && payload && "code" in payload && typeof payload.code === "string"
            ? payload.code
            : undefined;
          throw new FlowRequestError(message, code);
        }
      }
      boundary = buffer.indexOf("\n\n");
    }

    if (done) break;
  }

  if (!result) throw new Error("没有收到可用的生成结果，请再试一次。");
  return result;
}
const STRUCTURE_CHOICES = [
  { id: "system_process", label: "\u770b\u6d41\u7a0b", hint: "\u4e00\u4ef6\u4e8b\u600e\u4e48\u4e00\u6b65\u6b65\u8d70\u5b8c" },
  { id: "comparison_frame", label: "\u770b\u5bf9\u6bd4", hint: "\u4e24\u4e2a\u6982\u5ff5\u5230\u5e95\u5dee\u5728\u54ea" },
  { id: "causal_mechanism", label: "\u770b\u56e0\u679c", hint: "\u539f\u56e0\u600e\u4e48\u63a8\u5230\u7ed3\u679c" },
  { id: "procedure_algorithm", label: "\u770b\u6b65\u9aa4", hint: "\u6309\u987a\u5e8f\u52a8\u624b\u505a\u4e00\u6b21" },
  { id: "optimization_model", label: "\u770b\u5efa\u6a21", hint: "\u76ee\u6807\u3001\u9650\u5236\u548c\u53d6\u820d" },
] as const;

function makePreviewStepLabel(title: unknown, topic: string, index: number) {
  const value = typeof title === "string" ? title.trim() : "";
  const fallback = ["先抓住关键条件", "试着改变一个因素", "看看会发生什么", "用一道题确认理解"][index] || "继续往下走";
  if (value) return value;
  return `${topic}：${fallback}`;
}

function makeFallbackPreview(flow: KnowledgeFlow, source: "llm" | "cache" | "fallback"): GenerationPreview {
  const topic = flow.concept || flow.title;
  return {
    topic,
    structure: "AI 推荐",
    steps: flow.plays.slice(0, 4).map((play, index) => ({
      label: makePreviewStepLabel(play.title, topic, index),
    })),
    gate: "unknown",
    source,
  };
}
function makeFriendlyFailureReasons(failure: FlowFailureResponse | null) {
  const rawReasons = failure?.quality_gate?.failures?.length
    ? failure.quality_gate.failures
    : failure?.quality_gate?.reason
      ? [failure.quality_gate.reason]
      : [];
  const friendly = rawReasons.map((reason) => {
    const value = reason.toLowerCase();
    if (/visibly connect|action terms|topic grounding|grounding/.test(value)) {
      return "\u6709\u51e0\u6b65\u4e92\u52a8\u8fd8\u6ca1\u548c\u8fd9\u4e2a\u6982\u5ff5\u6263\u7d27\u3002";
    }
    if (/core terms|required core terms|anchor|term|\u951a\u70b9|\u4e13\u4e1a\u951a\u70b9/.test(value)) {
      return "\u5173\u952e\u6982\u5ff5\u8fd8\u6ca1\u6709\u7a33\u5b9a\u8fdb\u5165\u5173\u5361\u3002";
    }
    if (/pattern|template|\u6a21\u677f|\u4e0d\u5408\u9002|\u7981\u7528/.test(value)) {
      return "\u4e92\u52a8\u65b9\u5f0f\u548c\u8fd9\u4e2a\u6982\u5ff5\u8fd8\u4e0d\u591f\u5339\u914d\u3002";
    }
    if (/schema|payload|validation|\u5b57\u6bb5|\u6821\u9a8c/.test(value)) {
      return "\u5173\u5361\u7ed3\u6784\u8fd8\u4e0d\u591f\u5b8c\u6574\u3002";
    }
    if (/formula|\u516c\u5f0f|\u8ba1\u7b97/.test(value)) {
      return "\u9700\u8981\u7b97\u6e05\u695a\u7684\u516c\u5f0f\u6216\u7ed3\u679c\u8fd8\u4e0d\u591f\u53ef\u9760\u3002";
    }
    if (/placeholder|\u5360\u4f4d|\u6cdb\u5316/.test(value)) {
      return "\u6587\u6848\u8fd8\u6709\u70b9\u6cdb\uff0c\u4e0d\u80fd\u76f4\u63a5\u62ff\u6765\u6559\u4f60\u3002";
    }
    return "\u6709\u51e0\u6b65\u8fd8\u6ca1\u6709\u8bb2\u5230\u4f4d\u3002";
  });

  return Array.from(new Set(friendly)).slice(0, 3);
}
export default function ExplorePage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [topic, setTopic] = useState("贝叶斯定理");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState<GenerationStage | null>(null);
  const [generationPreview, setGenerationPreview] = useState<GenerationPreview | null>(null);
  const [pendingDraftId, setPendingDraftId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failureState, setFailureState] = useState<FlowFailureResponse | null>(null);
  const [failureAttempts, setFailureAttempts] = useState(0);
  const [lastFailedTopic, setLastFailedTopic] = useState<string | null>(null);
  const [runtimeConfig, setRuntimeConfig] = useState<PublicRuntimeConfig>({
    mode: "static",
    dynamic_enabled: false,
    requires_invite: false,
  });
  const [inviteCode, setInviteCode] = useState("");

  useEffect(() => {
    void trackEvent("page_view", { route: "/explore" });
    void fetch("/api/public-beta/config", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload: PublicRuntimeConfig | null) => {
        if (payload) setRuntimeConfig(payload);
      })
      .catch(() => undefined);
  }, []);

  async function startGeneratedFlow(nextTopic = topic, preferredStructure = "auto") {
    const trimmed = nextTopic.trim();
    if (!runtimeConfig.dynamic_enabled) {
      setErrorMessage("动态生成仍在小范围内测，请先体验下面的精选主题。");
      void trackEvent("dynamic_generation_blocked", {
        error_category: runtimeConfig.reason || "static_mode",
      });
      return;
    }
    if (runtimeConfig.requires_invite && !inviteCode.trim()) {
      setErrorMessage("请输入内测邀请码，或先体验下面的精选主题。");
      void trackEvent("dynamic_generation_blocked", {
        error_category: "invite_required",
      });
      return;
    }
    if (trimmed.length < 2) {
      setErrorMessage("先输入一个你想理解的知识点。");
      return;
    }

    setIsGenerating(true);
    setGenerationStage(null);
    setErrorMessage(null);
    setFailureState(null);
    setGenerationPreview(null);
    setPendingDraftId(null);
    const generationStartedAt = Date.now();
    void trackEvent("dynamic_generation_started");

    try {
      const response = await fetch("/api/flow", {
        method: "POST",
        headers: {
          "Accept": "text/event-stream",
          "Content-Type": "application/json",
          ...getAnalyticsHeaders(),
        },
        body: JSON.stringify({
          topic: trimmed,
          preferredPattern: "auto",
          preferredStructure,
          stream: true,
          inviteCode: runtimeConfig.requires_invite ? inviteCode.trim() : undefined,
        }),
      });
      if (!response.ok) {
        const blocked = await response.json().catch(() => null) as {
          error?: string;
          code?: string;
        } | null;
        const errorCategory = blocked?.code || "request_failed";
        throw new FlowRequestError(
          blocked?.error || "动态生成暂时不可用，请先体验精选主题。",
          errorCategory,
        );
      }
      const payload = await readFlowEventStream(response, setGenerationStage);
      if (payload.failure) {
        void trackEvent("dynamic_generation_failed", {
          error_category: payload.failure.code || "quality_gate_failed",
          generation_latency_ms: Date.now() - generationStartedAt,
        });
        setFailureState(payload.failure);
        setGenerationPreview(null);
        setFailureAttempts((count) => (lastFailedTopic === trimmed ? count + 1 : 1));
        setLastFailedTopic(trimmed);
        return;
      }
      const flow = payload.flow;
      if (payload.source === "cache") {
        void trackEvent("cache_hit", {
          flow_id: flow.id,
          flow_source: "cache",
          generation_latency_ms: Date.now() - generationStartedAt,
        });
      }
      void trackEvent("dynamic_generation_succeeded", {
        flow_id: flow.id,
        flow_source: payload.source,
        generation_latency_ms: Date.now() - generationStartedAt,
      });
      if (runtimeConfig.requires_invite && inviteCode.trim()) {
        rememberPublicBetaInviteCode(inviteCode);
      }
      setGenerationPreview(payload.preview || makeFallbackPreview(flow, payload.source));
      setFailureAttempts(0);
      setLastFailedTopic(null);
      const draftId = flow.id || crypto.randomUUID();
      const debug: FlowDraftDebug = {
        source: payload.source,
        validation_error: payload.validation_error,
        raw_output: payload.raw_output,
        raw_plan_output: payload.raw_plan_output,
        concept_plan: payload.concept_plan,
        blueprint: payload.blueprint,
        quality_gate: payload.quality_gate,
      };
      if (!writeFlowDraft(draftId, flow, debug)) throw new Error("无法保存本次学习路径，请允许浏览器会话存储后重试。");
      setPendingDraftId(draftId);
    } catch (error) {
      const errorCategory = error instanceof FlowRequestError && error.code
        ? error.code
        : "request_failed";
      const switchToStatic = errorCategory === "request_limit" || errorCategory === "token_budget";
      const accessBlocked = [
        "static_mode",
        "storage_unavailable",
        "invite_required",
        "invite_invalid",
        "invite_expired",
        "invite_exhausted",
        "request_limit",
        "client_limit",
        "token_budget",
      ].includes(errorCategory);
      void trackEvent(accessBlocked ? "dynamic_generation_blocked" : "dynamic_generation_failed", {
        error_category: errorCategory,
        generation_latency_ms: Date.now() - generationStartedAt,
      });
      if (errorCategory === "request_limit" || errorCategory === "client_limit") {
        void trackEvent("rate_limited", { error_category: errorCategory });
      }
      if (errorCategory === "token_budget") {
        void trackEvent("budget_exhausted", { error_category: errorCategory });
      }
      if (switchToStatic) {
        setRuntimeConfig({
          mode: "static",
          dynamic_enabled: false,
          requires_invite: false,
          reason: "token_budget",
        });
      }
      setGenerationPreview(null);
      setPendingDraftId(null);
      setGenerationStage(null);
      setErrorMessage(switchToStatic ? null : error instanceof Error ? error.message : String(error));
    } finally {
      setIsGenerating(false);
    }
  }

  const failureReasons = makeFriendlyFailureReasons(failureState);
  const shouldPreferShowcase = failureAttempts >= 2;
  const generationStepIndex = generationStage === "repair"
    ? GENERATION_STEPS.length - 1
    : GENERATION_STEPS.findIndex((step) => step.id === generationStage);
  const generationNotice = generationStage === "repair"
    ? "有一处没对上，我再整理一下。"
    : generationStage === "fallback"
      ? "这次暂时没法讲清楚，正在收尾。"
      : null;

  return (
    <main className="v5-shell v5-showcase-shell">
      <header className="v5-topbar">
        <Link href="/explore" className="brand-mark" aria-label="趣灵探索页">
          <span className="brand-mark__icon">
            <BrainCircuit size={20} />
          </span>
          <span className="brand-mark__text">趣灵</span>
        </Link>
        <nav className="topbar-actions" aria-label="主导航">
          <Link href="/explore" className="tool-button tool-button--active" aria-current="page" title="回到首页">
            <Home size={17} /> 首页
          </Link>
          <Link href="/hub" className="tool-button" title="打开我的图鉴">
            <LibraryBig size={16} /> 我的图鉴
          </Link>
        </nav>
      </header>

      <section className="v5-explore-hero v5-showcase-hero v5-ai-hero" aria-labelledby="explore-title">
        <p className="v5-eyebrow">
          {runtimeConfig.mode === "static"
            ? "公开测试 · 精选主题"
            : runtimeConfig.mode === "invite"
              ? "小范围内测 · 邀请生成"
              : "公开测试 · 动态生成"}
        </p>
        <h1 id="explore-title">想学什么，走一条互动路径。</h1>
        <p>
          {runtimeConfig.dynamic_enabled
            ? "用 3-5 分钟，把一个概念放进互动里想明白。"
            : "无需注册，选择一个精选主题，先完成一条 3-5 分钟互动路径。"}
        </p>

        <div className="v5-flow-generator">
          <label className="v5-flow-generator__input">
            <span>我想理解</span>
            <input
              ref={inputRef}
              value={topic}
              onChange={(event) => {
                setTopic(event.target.value);
                setErrorMessage(null);
                setFailureState(null);
                setGenerationPreview(null);
                setPendingDraftId(null);
                setFailureAttempts(0);
                setLastFailedTopic(null);
              }}
              placeholder="比如：光合作用、DNS 解析、沉没成本"
              disabled={isGenerating || !runtimeConfig.dynamic_enabled}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void startGeneratedFlow();
                }
              }}
            />
          </label>
          <button
            type="button"
            className="v5-primary-button"
            disabled={isGenerating || !runtimeConfig.dynamic_enabled}
            onClick={() => void startGeneratedFlow()}
          >
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {runtimeConfig.dynamic_enabled ? "开始闯关" : "动态生成小范围内测"}
          </button>
        </div>

        {runtimeConfig.requires_invite && (
          <label className="v5-public-beta-invite">
            <span>内测邀请码</span>
            <input
              type="password"
              value={inviteCode}
              autoComplete="off"
              onChange={(event) => {
                setInviteCode(event.target.value);
                setErrorMessage(null);
              }}
              placeholder="输入邀请码"
              disabled={isGenerating}
            />
          </label>
        )}
        {!runtimeConfig.dynamic_enabled && (
          <p className="v5-public-beta-note">
            {runtimeConfig.reason === "token_budget" || runtimeConfig.reason === "request_limit"
              ? "今天的动态生成额度已经用完，五条精选路径仍可直接完整体验。"
              : "精选主题不消耗动态生成额度，五条路径都可以直接完整体验。"}
          </p>
        )}

        <div className="v5-flow-controls" aria-label={"\u8f85\u52a9\u8bbe\u7f6e"}>
          <div className="v5-flow-examples" aria-label={"\u8f93\u5165\u793a\u4f8b"}>
            <span>{"\u8bd5\u8bd5"}</span>
            {INPUT_EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                disabled={isGenerating || !runtimeConfig.dynamic_enabled}
                onClick={() => {
                  setTopic(example);
                  setErrorMessage(null);
                  setFailureState(null);
                  setGenerationPreview(null);
                  setPendingDraftId(null);
                  setFailureAttempts(0);
                  setLastFailedTopic(null);
                }}
              >
                {example}
              </button>
            ))}
          </div>

        </div>
        <p className='v5-public-beta-privacy'>
          试玩仅匿名记录开始、完成与反馈；不会记录你输入的自由主题原文。
        </p>
        {isGenerating && (
          <div className="v6-generation-status" aria-live="polite">
            {GENERATION_STEPS.map((step, index) => (
              <span key={step.id} className={index <= generationStepIndex ? "is-active" : undefined}>
                {index + 1}. {step.label}
              </span>
            ))}
            {generationNotice && <small>{generationNotice}</small>}
          </div>
        )}
        {generationPreview && (
          <div className="v6-decomposition-preview" aria-live="polite">
            <div className="v6-decomposition-preview__summary">
              <span>学习路线准备好了</span>
              <strong>从「{generationPreview.topic}」开始</strong>
              <small>一共 {generationPreview.steps.slice(0, 4).length} 关，边做边把它想明白。</small>
            </div>
            <ol className="v6-decomposition-preview__steps" aria-label="互动路径">
              {generationPreview.steps.slice(0, 4).map((step, index) => (
                <li key={`${index}-${step.label}`}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{step.label}</strong>
                  </div>
                </li>
              ))}
            </ol>
            {pendingDraftId && (
              <div className="v6-decomposition-preview__actions">
                <button
                  type="button"
                  className="v6-decomposition-preview__start"
                  onClick={() => router.push(`/flow/custom?draftId=${encodeURIComponent(pendingDraftId)}`)}
                >
                  开始第一关 <ArrowRight size={16} />
                </button>
                <button type="button" className="v6-decomposition-preview__retry" onClick={() => void startGeneratedFlow()}>
                  换个方式试试
                </button>
              </div>
            )}
          </div>
        )}
        {failureState && (
          <div className="v6-failure-card" role="status">
            <span>{"\u8fd9\u6b21\u6ca1\u6709\u786c\u4e0a"}</span>
            <h2>{failureState.title || "\u8fd9\u6761\u8def\u5f84\u8fd8\u6ca1\u6559\u6e05\u695a"}</h2>
            <p>{failureState.message}</p>
            {failureReasons.length > 0 && (
              <div className="v6-failure-card__reasons">
                <strong>{"\u6211\u4e0d\u653e\u5fc3\u7684\u5730\u65b9"}</strong>
                <ul>
                  {failureReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}
            {failureState.actions?.includes("choose_structure") && !shouldPreferShowcase && (
              <div className="v6-failure-card__structures" aria-label={"\u9009\u62e9\u62c6\u89e3\u65b9\u5f0f"}>
                <strong>{"\u6362\u4e2a\u62c6\u6cd5"}</strong>
                <div>
                  {STRUCTURE_CHOICES.map((choice) => (
                    <button key={choice.id} type="button" onClick={() => void startGeneratedFlow(topic, choice.id)}>
                      <span>{choice.label}</span>
                      <small>{choice.hint}</small>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {shouldPreferShowcase && (
              <p className="v6-failure-card__escape">
                {"\u8fd9\u4e2a\u6982\u5ff5\u5df2\u7ecf\u8fde\u7eed\u8bd5\u4e86\u51e0\u6b21\uff0c\u5148\u6362\u4e2a\u89d2\u5ea6\u4f1a\u66f4\u7a33\u3002\u4f60\u4e5f\u53ef\u4ee5\u5148\u8d70\u4e0b\u9762\u8fd9\u4e9b\u7a33\u5b9a\u8d77\u70b9\u3002"}
              </p>
            )}
            <div className="v6-failure-card__actions">
              {failureState.retryable !== false && !shouldPreferShowcase && (
                <button type="button" onClick={() => void startGeneratedFlow(topic)}>
                  {"\u6362\u4e00\u79cd\u62c6\u6cd5\u518d\u8bd5"}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setTopic("");
                  setFailureState(null);
                  setGenerationPreview(null);
                  setPendingDraftId(null);
                  setFailureAttempts(0);
                  setLastFailedTopic(null);
                  setErrorMessage(null);
                  window.setTimeout(() => inputRef.current?.focus(), 0);
                }}
              >
                {"\u6362\u4e2a\u6982\u5ff5"}
              </button>
            </div>
            <div className="v6-failure-card__examples" aria-label={"\u7a33\u5b9a\u793a\u4f8b"}>
              {SHOWCASE_FLOWS.slice(0, shouldPreferShowcase ? 5 : 3).map((flow) => (
                <Link
                  key={flow.id}
                  href={`/flow/${flow.id}`}
                  onClick={() => void trackEvent("showcase_topic_selected", {
                    flow_id: flow.id,
                    flow_source: "static",
                  })}
                >
                  {flow.title}
                </Link>
              ))}
            </div>
          </div>
        )}
        {errorMessage && <p className="v5-flow-generator__error">{errorMessage}</p>}
      </section>

      <section className="v5-topic-grid v5-topic-grid--showcase" aria-label="试试这些起点">
        <header className="v5-topic-section-header">
          <span>示例起点</span>
          <h2>试试这些起点</h2>
        </header>
        {SHOWCASE_FLOWS.map((flow, index) => (
          <motion.div
            className="v5-topic-card-shell"
            key={flow.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: Math.min(index * 0.04, 0.16) }}
          >
            <Link
              href={`/flow/${flow.id}`}
              className="v5-topic-card v5-showcase-card"
              onClick={() => void trackEvent("showcase_topic_selected", {
                flow_id: flow.id,
                flow_source: "static",
              })}
            >
              <div className="v5-topic-card__topline">
                <span>{flow.category}</span>
                <span>{flow.difficulty}</span>
              </div>
              <div className="v5-topic-card__body">
                <h2>{flow.title}</h2>
                <p>{flow.hook}</p>
              </div>
              <div className="v5-topic-card__concepts" aria-label="包含概念">
                {flow.concepts.slice(0, 3).map((concept) => (
                  <span key={concept}>{concept}</span>
                ))}
              </div>
              <div className="v5-topic-card__footer">
                <span className="v5-topic-card__meta">
                  <span><Timer size={15} /> {flow.estimated_minutes} 分钟</span>
                  <span><Gauge size={15} /> {flow.plays.length} 关</span>
                </span>
                <strong>开始 <ArrowRight size={15} /></strong>
              </div>
            </Link>
          </motion.div>
        ))}
      </section>
    </main>
  );
}

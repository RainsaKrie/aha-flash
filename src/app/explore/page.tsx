"use client";

import { motion } from "framer-motion";
import { ArrowRight, BrainCircuit, Gauge, Home, LibraryBig, Loader2, Sparkles, Timer } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { PATTERN_LABELS } from "@/lib/content/flow-pattern-options";
import { getShowcaseFlows, type KnowledgeFlow } from "@/lib/content/mock-flows";
import { writeFlowDraft, type FlowDraftDebug } from "@/lib/utils/storage";

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
  pattern: string;
  terms?: string[];
  title?: string;
}

interface GenerationPreview {
  topic: string;
  structure: string;
  terms: string[];
  steps: GenerationPreviewStep[];
  gate: "pass" | "warn" | "unknown";
  source: "llm" | "mock";
}

interface FlowApiResponse {
  flow: KnowledgeFlow;
  source: "llm" | "mock";
  validation_error?: string;
  raw_output?: string;
  raw_plan_output?: string;
  concept_plan?: unknown;
  blueprint?: unknown;
  quality_gate?: unknown;
  preview?: GenerationPreview;
  failure?: FlowFailureResponse;
}

const INPUT_EXAMPLES = ["\u7ebf\u6027\u89c4\u5212", "DNS \u89e3\u6790", "\u8d1d\u53f6\u65af\u5b9a\u7406", "\u590d\u5229\u6548\u5e94"];
const GENERATION_STEPS = [
  { id: "concept_plan", label: "识别知识结构" },
  { id: "blueprint", label: "生成教学蓝图" },
  { id: "flow", label: "组装互动关卡" },
  { id: "quality_gate", label: "检查是否真的教清楚" },
] as const;

type GenerationStage = (typeof GENERATION_STEPS)[number]["id"] | "repair" | "fallback";

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
          throw new Error(message);
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
  { id: "system_process", label: "\u770b\u6d41\u7a0b", hint: "DNS / Agent / \u7cfb\u7edf\u6d41\u8f6c" },
  { id: "comparison_frame", label: "\u770b\u5bf9\u6bd4", hint: "A vs B / \u533a\u522b" },
  { id: "causal_mechanism", label: "\u770b\u56e0\u679c", hint: "\u539f\u56e0 / \u673a\u5236 / \u7ed3\u679c" },
  { id: "procedure_algorithm", label: "\u770b\u6b65\u9aa4", hint: "\u7b97\u6cd5 / \u64cd\u4f5c\u6d41\u7a0b" },
  { id: "optimization_model", label: "\u770b\u5efa\u6a21", hint: "\u76ee\u6807 / \u7ea6\u675f / \u6700\u4f18" },
] as const;

function patternLabel(value: unknown) {
  if (typeof value === "string" && value in PATTERN_LABELS) return PATTERN_LABELS[value as keyof typeof PATTERN_LABELS];
  return typeof value === "string" && value.trim() ? value : "互动组件";
}

function makeFallbackPreview(flow: KnowledgeFlow, source: "llm" | "mock"): GenerationPreview {
  return {
    topic: flow.concept || flow.title,
    structure: "AI 推荐",
    terms: flow.concepts.slice(0, 5),
    steps: flow.plays.slice(0, 3).map((play) => ({
      label: play.teaching_trace?.blueprint_step_goal || play.title,
      pattern: patternLabel(play.schema.pattern),
      terms: play.teaching_trace?.covered_terms?.slice(0, 3),
      title: play.title,
    })),
    gate: "unknown",
    source,
  };
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

  async function startGeneratedFlow(nextTopic = topic, preferredStructure = "auto") {
    const trimmed = nextTopic.trim();
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

    try {
      const response = await fetch("/api/flow", {
        method: "POST",
        headers: { "Accept": "text/event-stream", "Content-Type": "application/json" },
        body: JSON.stringify({ topic: trimmed, preferredPattern: "auto", preferredStructure, stream: true }),
      });
      if (!response.ok) throw new Error(`flow request failed: ${response.status}`);
      const payload = await readFlowEventStream(response, setGenerationStage);
      if (payload.failure) {
        setFailureState(payload.failure);
        setGenerationPreview(null);
        setFailureAttempts((count) => (lastFailedTopic === trimmed ? count + 1 : 1));
        setLastFailedTopic(trimmed);
        return;
      }
      const flow = payload.flow;
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
      writeFlowDraft(draftId, flow, debug);
      setPendingDraftId(draftId);
    } catch (error) {
      setGenerationPreview(null);
      setPendingDraftId(null);
      setGenerationStage(null);
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsGenerating(false);
    }
  }

  const failureReasons = failureState?.quality_gate?.failures?.length
    ? failureState.quality_gate.failures.slice(0, 3)
    : failureState?.quality_gate?.reason
      ? [failureState.quality_gate.reason]
      : [];
  const shouldPreferShowcase = failureAttempts >= 2;
  const generationStepIndex = generationStage === "repair"
    ? GENERATION_STEPS.length - 1
    : GENERATION_STEPS.findIndex((step) => step.id === generationStage);
  const generationNotice = generationStage === "repair"
    ? "发现一处不匹配，正在调整这条路径。"
    : generationStage === "fallback"
      ? "这次没有走通生成链路，正在整理可解释的结果。"
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
        <p className="v5-eyebrow">自由生成 · AI 原生交互学习</p>
        <h1 id="explore-title">想学什么，玩三关。</h1>
        <p>输入概念，趣灵自动生成互动路径。</p>

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
              disabled={isGenerating}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void startGeneratedFlow();
                }
              }}
            />
          </label>
          <button type="button" className="v5-primary-button" disabled={isGenerating} onClick={() => void startGeneratedFlow()}>
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            开始闯关
          </button>
        </div>

        <div className="v5-flow-controls" aria-label={"\u8f85\u52a9\u8bbe\u7f6e"}>
          <div className="v5-flow-examples" aria-label={"\u8f93\u5165\u793a\u4f8b"}>
            <span>{"\u8bd5\u8bd5"}</span>
            {INPUT_EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                disabled={isGenerating}
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
              <span>拆解好了</span>
              <strong>{generationPreview.structure}</strong>
              <small>{generationPreview.source === "llm" ? "AI 现场生成" : "兜底路径"}</small>
            </div>
            {generationPreview.terms.length > 0 && (
              <div className="v6-decomposition-preview__terms" aria-label="核心词">
                {generationPreview.terms.slice(0, 5).map((term) => (
                  <span key={term}>{term}</span>
                ))}
              </div>
            )}
            <ol className="v6-decomposition-preview__steps" aria-label="三关路径">
              {generationPreview.steps.slice(0, 3).map((step, index) => (
                <li key={`${index}-${step.label}`}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{step.title || step.label}</strong>
                    <small>{step.pattern}</small>
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
                  进入三关 <ArrowRight size={16} />
                </button>
                <button type="button" className="v6-decomposition-preview__retry" onClick={() => void startGeneratedFlow()}>
                  重新拆一次
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
                <strong>{"\u5361\u4f4f\u7684\u5730\u65b9"}</strong>
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
                <Link key={flow.id} href={`/flow/${flow.id}`}>
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
            <Link href={`/flow/${flow.id}`} className="v5-topic-card v5-showcase-card">
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

"use client";

import { motion } from "framer-motion";
import { ArrowRight, BrainCircuit, Gauge, Home, LibraryBig, Loader2, Sparkles, Timer } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { getShowcaseFlows, type KnowledgeFlow } from "@/lib/content/mock-flows";
import { writeFlowDraft } from "@/lib/utils/storage";

const SHOWCASE_FLOWS = getShowcaseFlows();

interface FlowFailureResponse {
  message: string;
  title?: string;
  code?: string;
  actions?: string[];
  curated_flow_ids?: string[];
}

interface FlowApiResponse {
  flow: KnowledgeFlow;
  source: "llm" | "mock";
  validation_error?: string;
  failure?: FlowFailureResponse;
}

const INPUT_EXAMPLES = ["\u7ebf\u6027\u89c4\u5212", "DNS \u89e3\u6790", "\u8d1d\u53f6\u65af\u5b9a\u7406", "\u590d\u5229\u6548\u5e94"];
const GENERATION_STEPS = [
  "\u8bc6\u522b\u77e5\u8bc6\u7ed3\u6784",
  "\u751f\u6210\u6559\u5b66\u84dd\u56fe",
  "\u9009\u62e9\u4e92\u52a8\u65b9\u5f0f",
  "\u68c0\u67e5\u662f\u5426\u771f\u7684\u6559\u6e05\u695a",
];

export default function ExplorePage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [topic, setTopic] = useState("贝叶斯定理");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failureState, setFailureState] = useState<FlowFailureResponse | null>(null);

  async function startGeneratedFlow(nextTopic = topic) {
    const trimmed = nextTopic.trim();
    if (trimmed.length < 2) {
      setErrorMessage("先输入一个你想理解的知识点。");
      return;
    }

    setIsGenerating(true);
    setGenerationStep(0);
    setErrorMessage(null);
    setFailureState(null);
    const timers = GENERATION_STEPS.slice(1).map((_, index) =>
      window.setTimeout(() => setGenerationStep(index + 1), 680 * (index + 1)),
    );

    try {
      const response = await fetch("/api/flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: trimmed, preferredPattern: "auto" }),
      });
      if (!response.ok) throw new Error(`flow request failed: ${response.status}`);
      const payload = (await response.json()) as FlowApiResponse;
      if (payload.failure) {
        setFailureState(payload.failure);
        return;
      }
      const flow = payload.flow;
      const draftId = flow.id || crypto.randomUUID();
      writeFlowDraft(draftId, flow);
      router.push(`/flow/custom?draftId=${encodeURIComponent(draftId)}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      timers.forEach((timer) => window.clearTimeout(timer));
      setIsGenerating(false);
    }
  }

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

        <form
          className="v5-flow-generator"
          onSubmit={(event) => {
            event.preventDefault();
            void startGeneratedFlow();
          }}
        >
          <label className="v5-flow-generator__input">
            <span>我想理解</span>
            <input
              ref={inputRef}
              value={topic}
              onChange={(event) => {
                setTopic(event.target.value);
                setErrorMessage(null);
                setFailureState(null);
              }}
              placeholder="比如：光合作用、DNS 解析、沉没成本"
              disabled={isGenerating}
            />
          </label>
          <button type="submit" className="v5-primary-button" disabled={isGenerating}>
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            开始闯关
          </button>
        </form>

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
              <span key={step} className={index <= generationStep ? "is-active" : undefined}>
                {index + 1}. {step}
              </span>
            ))}
          </div>
        )}
        {failureState && (
          <div className="v6-failure-card" role="status">
            <span>{"\u8fd9\u6b21\u6ca1\u6709\u786c\u4e0a"}</span>
            <h2>{failureState.title || "\u8fd9\u6761\u8def\u5f84\u8fd8\u4e0d\u591f\u53ef\u9760"}</h2>
            <p>{failureState.message}</p>
            <div className="v6-failure-card__actions">
              <button type="button" onClick={() => void startGeneratedFlow(topic)}>
                {"\u6362\u4e00\u79cd\u62c6\u6cd5\u518d\u8bd5"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTopic("");
                  setFailureState(null);
                  setErrorMessage(null);
                  window.setTimeout(() => inputRef.current?.focus(), 0);
                }}
              >
                {"\u6362\u4e2a\u6982\u5ff5"}
              </button>
            </div>
            <div className="v6-failure-card__examples" aria-label={"\u7a33\u5b9a\u793a\u4f8b"}>
              {SHOWCASE_FLOWS.slice(0, 3).map((flow) => (
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

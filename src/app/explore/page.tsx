"use client";

import { motion } from "framer-motion";
import { ArrowRight, BrainCircuit, Gauge, Home, LibraryBig, Loader2, Shuffle, Sparkles, Timer } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FLOW_PATTERN_OPTIONS, type FlowPatternPreference } from "@/lib/content/flow-pattern-options";
import { getShowcaseFlows, type KnowledgeFlow } from "@/lib/content/mock-flows";
import { writeFlowDraft } from "@/lib/utils/storage";

const SHOWCASE_FLOWS = getShowcaseFlows();

interface FlowApiResponse {
  flow: KnowledgeFlow;
  source: "llm" | "mock";
  validation_error?: string;
}

export default function ExplorePage() {
  const router = useRouter();
  const [topic, setTopic] = useState("贝叶斯定理");
  const [preferredPattern, setPreferredPattern] = useState<FlowPatternPreference>("auto");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function startRandomFlow() {
    const pool = SHOWCASE_FLOWS.length > 0 ? SHOWCASE_FLOWS : getShowcaseFlows();
    const next = pool[Math.floor(Math.random() * pool.length)];
    if (next) router.push(`/flow/${next.id}`);
  }

  async function startGeneratedFlow(nextTopic = topic) {
    const trimmed = nextTopic.trim();
    if (trimmed.length < 2) {
      setErrorMessage("先输入一个你想理解的知识点。");
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: trimmed, preferredPattern }),
      });
      if (!response.ok) throw new Error(`flow request failed: ${response.status}`);
      const payload = (await response.json()) as FlowApiResponse;
      const flow = payload.flow;
      const draftId = flow.id || crypto.randomUUID();
      writeFlowDraft(draftId, flow);
      router.push(`/flow/custom?draftId=${encodeURIComponent(draftId)}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
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
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="比如：光合作用、DNS 解析、沉没成本"
              disabled={isGenerating}
            />
          </label>
          <button type="submit" className="v5-primary-button" disabled={isGenerating}>
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            开始闯关
          </button>
        </form>

        <div className="v5-pattern-picker" aria-label="选择互动 Pattern">
          {FLOW_PATTERN_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={option.value === preferredPattern ? "is-active" : undefined}
              aria-pressed={option.value === preferredPattern}
              disabled={isGenerating}
              onClick={() => setPreferredPattern(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="v5-showcase-actions v5-ai-hero__secondary">
          <button type="button" className="v5-secondary-action-button" onClick={startRandomFlow} disabled={isGenerating}>
            <Shuffle size={17} /> 随机试一个示例
          </button>
          <Link href="/hub" className="v5-secondary-link">
            查看完成记录 <ArrowRight size={16} />
          </Link>
        </div>
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

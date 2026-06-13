"use client";

import { motion } from "framer-motion";
import { ArrowRight, BrainCircuit, Gauge, Home, LibraryBig, Shuffle, Timer } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getShowcaseFlows } from "@/lib/content/mock-flows";

const SHOWCASE_FLOWS = getShowcaseFlows();

export default function ExplorePage() {
  const router = useRouter();

  function startRandomFlow() {
    const pool = SHOWCASE_FLOWS.length > 0 ? SHOWCASE_FLOWS : getShowcaseFlows();
    const next = pool[Math.floor(Math.random() * pool.length)];
    if (next) router.push(`/flow/${next.id}`);
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

      <section className="v5-explore-hero v5-showcase-hero" aria-labelledby="explore-title">
        <p className="v5-eyebrow">精选 · AI 原生交互学习</p>
        <h1 id="explore-title">把概念玩明白。</h1>
        <p>三种知识路径，三关点亮一个概念。</p>
        <div className="v5-showcase-actions">
          <button type="button" className="v5-primary-button" onClick={startRandomFlow}>
            <Shuffle size={18} /> 随机开始一关
          </button>
          <Link href="/hub" className="v5-secondary-link">
            查看完成记录 <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="v5-topic-grid v5-topic-grid--showcase" aria-label="选择一个话题开始">
        <header className="v5-topic-section-header">
          <span>学习路径</span>
          <h2>选择一个话题开始</h2>
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
"use client";

import { motion } from "framer-motion";
import { ArrowRight, BrainCircuit, Gauge, LibraryBig, Shuffle, Timer } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { getShowcaseFlows } from "@/lib/content/mock-flows";

export default function ExplorePage() {
  const router = useRouter();
  const showcaseFlows = useMemo(() => getShowcaseFlows(), []);

  function startRandomFlow() {
    const pool = showcaseFlows.length > 0 ? showcaseFlows : getShowcaseFlows();
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
          <Link href="/hub" className="tool-button" title="打开个人图鉴">
            <LibraryBig size={16} /> 我的图鉴
          </Link>
        </nav>
      </header>

      <section className="v5-explore-hero v5-showcase-hero" aria-labelledby="explore-title">
        <p className="v5-eyebrow">3 分钟作品演示</p>
        <h1 id="explore-title">点开一个话题，直接玩完三关。</h1>
        <p>
          这是趣灵的最小可体验版本：三个精选概念、三种知识类型、完整闯关和图鉴记录。打开链接就能看见 AI 原生交互学习的核心能力。
        </p>
        <div className="v5-showcase-actions">
          <button type="button" className="v5-primary-button" onClick={startRandomFlow}>
            <Shuffle size={18} /> 随机开始一关
          </button>
          <Link href="/hub" className="v5-secondary-link">
            查看完成记录 <ArrowRight size={16} />
          </Link>
        </div>
        <div className="v5-proof-strip" aria-label="作品集验收点">
          <span>3 个精选 topic</span>
          <span>每个 3 关可走完</span>
          <span>完成后写入 Hub</span>
        </div>
      </section>

      <section className="v5-topic-grid v5-topic-grid--showcase" aria-label="精选演示话题">
        {showcaseFlows.map((flow, index) => (
          <motion.div
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
              <div>
                <span className="v5-topic-card__index">0{index + 1}</span>
                <h2>{flow.title}</h2>
                <p>{flow.hook}</p>
              </div>
              <div className="v5-topic-card__concepts" aria-label="包含概念">
                {flow.concepts.slice(0, 3).map((concept) => (
                  <span key={concept}>{concept}</span>
                ))}
              </div>
              <div className="v5-topic-card__footer">
                <span><Timer size={15} /> {flow.estimated_minutes} 分钟</span>
                <span><Gauge size={15} /> {flow.plays.length} 关</span>
                <strong>开始 <ArrowRight size={15} /></strong>
              </div>
            </Link>
          </motion.div>
        ))}
      </section>
    </main>
  );
}
"use client";

import { RotateCcw, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DEFAULT_LEARNING_DEPTH, LEARNING_DEPTH_LABELS } from "@/types/schema";
import type { GachaPoolItem, GachaSimulatorConfig, InteractionEvent, LearningDepth } from "@/types/schema";
import { EmptyState, InlineSpinner } from "./shared";

type Phase = "idle" | "pulling" | "result";

const depthGoals: Record<LearningDepth, string> = {
  rapid: "先做个判断，再看看新信息会把判断推向哪里。",
  scenario: "比较不同结果出现时，原先的判断会怎样变化。",
  mapping: "把翻卡过程对应到概念里的不同可能性与证据。",
};

function probabilityValue(item: GachaPoolItem) {
  return item.probability > 1 ? item.probability / 100 : item.probability;
}

function draw(pool: GachaPoolItem[]) {
  const normalizedPool = pool.map((item) => ({ item, probability: Math.max(0, probabilityValue(item)) }));
  const total = normalizedPool.reduce((sum, entry) => sum + entry.probability, 0) || 1;
  const roll = Math.random() * total;
  let cursor = 0;
  for (const entry of normalizedPool) {
    cursor += entry.probability;
    if (roll <= cursor) return entry.item;
  }
  return pool[pool.length - 1];
}

function tierLabel(item: GachaPoolItem) {
  return item.name || `${item.rarity} 星结果`;
}

function flavorLabel(item: GachaPoolItem) {
  return item.flavor_label && item.flavor_label !== tierLabel(item) ? item.flavor_label : "";
}


function safeExplanation(config: GachaSimulatorConfig, guessedRight: boolean) {
  const raw = guessedRight ? config.explanation_map.win : config.explanation_map.lose;
  const cleaned = raw.replace(/\{\{[^}]+\}\}/g, "").trim();
  return /(期权|行权|锁定价|期权费|标的|收益|市场价|余额)/.test(cleaned)
    ? "新的信息出现后，原先的判断可以跟着更新；关键是比较它和其他可能性之间的差别。"
    : cleaned || "新的信息出现后，原先的判断可以跟着更新；关键是比较它和其他可能性之间的差别。";
}
export function GachaSimulator({
  config,
  onComplete,
}: {
  config: GachaSimulatorConfig;
  onComplete?: (result: InteractionEvent) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<GachaPoolItem | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const depth = config.depth || DEFAULT_LEARNING_DEPTH;
  const pool = config.pool || [];
  const hasSelection = Boolean(selectedName);
  const guessedRight = Boolean(result && selectedName === result.name);

  function pull() {
    if (!hasSelection || pool.length === 0) return;

    setPhase("pulling");
    window.setTimeout(() => {
      const next = draw(pool);
      const didGuessRight = selectedName === next.name;

      setResult(next);
      setPhase("result");
      onComplete?.({
        type: "gacha_completed",
        payload: {
          won: didGuessRight,
          profit: didGuessRight ? 1 : 0,
          best_item: tierLabel(next),
          flavor_label: flavorLabel(next) || undefined,
        },
      });
    }, 620);
  }

  function reset() {
    setPhase("idle");
    setResult(null);
    setSelectedName(null);
  }

  const displayedItems = phase === "result" && result ? [result] : pool;
  const learnerExplanation = result
    ? `${guessedRight ? "这次结果和你的判断一致。" : `这次出现的是「${tierLabel(result)}」，和刚才的判断不同。`} ${safeExplanation(config, guessedRight)}`
    : depthGoals[depth];

  return (
    <section className="grid min-h-[520px] gap-6 p-5">
      <header className="border-b border-[var(--line)] pb-4">
        <p className="text-xs font-semibold text-[var(--accent)]">概率判断</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-semibold">{config.title.replace(/^(抽卡|抽取|概率抽卡)\s*[:：]\s*/, "") || "先猜猜哪种情况更可能"}</h2>
          <span className="rounded-md border border-[var(--line)] bg-[var(--pattern-raised)] px-2 py-1 text-xs text-[var(--muted)]">
            {LEARNING_DEPTH_LABELS[depth]}
          </span>
        </div>
        {config.quote && <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{config.quote}</p>}
      </header>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className={[
          "rounded-xl border bg-[var(--pattern-panel)] p-5 transition-all duration-200",
          phase === "pulling" ? "border-[var(--accent)]" : "border-[var(--line)]",
        ].join(" ")}>
          <p className="text-base font-medium">先做个判断</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            先选一种你认为更可能的情况，再揭开实际结果。
          </p>
          <div className="mt-5 grid gap-2">
            <Button
              onClick={pull}
              disabled={phase === "pulling" || pool.length === 0 || !hasSelection}
              title={hasSelection ? "揭开结果" : "先选择一种可能"}
              className={`${phase === "idle" && hasSelection ? "ui-breathe " : ""}transition-all duration-200 hover:scale-[1.02] active:scale-[0.96]`}
            >
              <Sparkles size={16} />
              {phase === "pulling" ? <InlineSpinner label="正在揭开" /> : hasSelection ? "揭开结果" : "先选一种可能"}
            </Button>
            <Button onClick={reset} className="bg-transparent transition-all duration-200 hover:scale-[1.02] active:scale-[0.96]" title="重新判断">
              <RotateCcw size={16} />
              重新判断
            </Button>
          </div>
        </aside>

        <div className="grid gap-4 rounded-xl border border-[var(--line)] bg-[var(--pattern-surface)] p-5">
          <div>
            <div className="text-sm font-medium">{phase === "result" ? "这次出现的结果" : "你觉得哪种情况更可能？"}</div>
            <div className="mt-1 text-sm text-[var(--muted)]">
              {phase === "result" ? "把结果和你刚才的判断放在一起看。" : "点击一张卡做出判断；下一步会揭开实际结果。"}
            </div>
          </div>

          {pool.length ? (
            <div className="grid min-h-52 place-content-center gap-4 [grid-template-columns:repeat(auto-fit,minmax(140px,180px))]">
              {displayedItems.map((item, index) => {
                const selected = selectedName === item.name;
                const isResult = phase === "result";
                return (
                  <button
                    key={`${item.name}-${index}`}
                    type="button"
                    disabled={phase !== "idle"}
                    aria-pressed={selected}
                    onClick={() => setSelectedName(item.name)}
                    className={[
                      "grid aspect-[4/5] place-items-center rounded-xl border p-5 text-center text-sm shadow-[0_10px_30px_rgba(0,0,0,0.1)] transition-all duration-200 hover:scale-[1.02] hover:border-[var(--pattern-accent)] active:scale-[0.96] disabled:cursor-default disabled:hover:scale-100",
                      selected ? "border-[var(--pattern-accent)] bg-[color-mix(in_srgb,var(--pattern-accent),transparent_88%)] ring-2 ring-[color-mix(in_srgb,var(--pattern-accent),transparent_72%)]" : "border-[var(--line)] bg-[var(--pattern-raised)]",
                      phase === "pulling" ? "ui-breathe border-[var(--accent)]" : "",
                    ].join(" ")}
                  >
                    <span>
                      <span className="block text-xs font-medium text-[var(--muted)]">
                        {phase === "pulling" ? "正在揭开" : isResult ? "实际结果" : selected ? "你的判断" : `可能性 ${Math.round(probabilityValue(item) * 100)}%`}
                      </span>
                      <strong className="mt-2 block text-base">{phase === "pulling" ? "..." : tierLabel(item)}</strong>
                      {phase !== "pulling" && flavorLabel(item) && (
                        <span className="mt-1 block text-xs text-[var(--muted)]">{flavorLabel(item)}</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState detail="还没有可判断的结果，重新生成后再试一次。" />
          )}
        </div>
      </div>

      <footer className="ui-result rounded-xl border border-[var(--line)] bg-[var(--pattern-panel)] p-5">
        <p className="text-sm leading-relaxed text-[var(--muted)]">{learnerExplanation}</p>
      </footer>
    </section>
  );
}
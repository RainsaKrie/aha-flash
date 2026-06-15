"use client";

import { RotateCcw, Sparkles, Ticket } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DEFAULT_LEARNING_DEPTH, LEARNING_DEPTH_LABELS } from "@/types/schema";
import type { GachaPoolItem, GachaSimulatorConfig, InteractionEvent, LearningDepth } from "@/types/schema";
import { EmptyState, InlineSpinner } from "./shared";

type Phase = "idle" | "pulling" | "result";

const depthGoals: Record<LearningDepth, string> = {
  rapid: "目标：用一次抽取抓住“选择权 + 有限损失”。",
  scenario: "目标：在未来结果揭晓后判断是否行权。",
  mapping: "目标：把抽卡动作逐项对应到期权原理。",
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

export function GachaSimulator({
  config,
  onComplete,
}: {
  config: GachaSimulatorConfig;
  onComplete?: (result: InteractionEvent) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [results, setResults] = useState<GachaPoolItem[]>([]);
  const [balance, setBalance] = useState(3000);
  const depth = config.depth || DEFAULT_LEARNING_DEPTH;

  const best = useMemo(() => results.reduce<GachaPoolItem | null>((acc, item) => (!acc || item.value > acc.value ? item : acc), null), [results]);
  const profit = best ? Math.max(best.value - config.strike_price - config.option_cost, -config.option_cost) : 0;
  const won = Boolean(best && best.value > config.strike_price);
  const pool = config.pool || [];

  function pull() {
    setPhase("pulling");
    setBalance((value) => value - config.option_cost);
    window.setTimeout(() => {
      const next = Array.from({ length: config.pulls_per_try }, () => draw(pool));
      const bestItem = next.reduce<GachaPoolItem | null>(
        (acc, item) => (!acc || item.value > acc.value ? item : acc),
        null,
      );
      const didWin = Boolean(bestItem && bestItem.value > config.strike_price);
      const nextProfit = bestItem
        ? Math.max(bestItem.value - config.strike_price - config.option_cost, -config.option_cost)
        : -config.option_cost;

      setResults(next);
      setPhase("result");
      onComplete?.({
        type: "gacha_completed",
        payload: {
          won: didWin,
          profit: nextProfit,
          best_item: bestItem ? tierLabel(bestItem) : undefined,
          flavor_label: bestItem ? flavorLabel(bestItem) || undefined : undefined,
        },
      });
    }, 620);
  }

  function reset() {
    setPhase("idle");
    setResults([]);
  }

  const displayItems = results.length ? results : pool.slice(0, Math.max(3, Math.min(pool.length, 6)));

  return (
    <section className="grid min-h-[520px] gap-6 p-5">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent)]">gacha simulator</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold">{config.title}</h2>
            <span className="rounded-md border border-[var(--line)] bg-[var(--pattern-raised)] px-2 py-1 text-xs text-[var(--muted)]">
              {LEARNING_DEPTH_LABELS[depth]}
            </span>
          </div>
          {config.quote && <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{config.quote}</p>}
          <p className="mt-2 text-xs text-[var(--accent)]">{depthGoals[depth]}</p>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--pattern-panel)] px-4 py-3 text-right">
          <div className="text-xs text-[var(--muted)]">余额</div>
          <div key={balance} className="animate-value-pop text-3xl font-bold text-[var(--accent)]">{balance}</div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className={["rounded-xl border bg-[var(--pattern-panel)] p-5 transition-all duration-200", phase === "pulling" ? "border-[var(--accent)]" : "border-[var(--line)]"].join(" ")}>
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <Ticket size={16} />
            看涨期权券
          </div>
          <dl className="grid gap-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">期权费</dt>
              <dd>{config.option_cost}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">锁定价</dt>
              <dd>{config.strike_price}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">次数</dt>
              <dd>{config.pulls_per_try}</dd>
            </div>
          </dl>
          <div className="mt-4 grid gap-2">
            <Button onClick={pull} disabled={phase === "pulling" || pool.length === 0} title="抽取" className={`${phase === "idle" && pool.length > 0 ? "ui-breathe " : ""}transition-all duration-200 hover:scale-[1.02] active:scale-[0.96]`}>
              <Sparkles size={16} />
              {phase === "pulling" ? <InlineSpinner label="结算中" /> : "买入并抽取"}
            </Button>
            <Button onClick={reset} className="bg-transparent transition-all duration-200 hover:scale-[1.02] active:scale-[0.96]" title="重置">
              <RotateCcw size={16} />
              重置
            </Button>
          </div>
        </aside>

        <div className="grid gap-4 rounded-xl border border-[var(--line)] bg-[var(--pattern-surface)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                {results.length ? "抽取结果" : "奖池预览"}
              </div>
              <div className="mt-1 text-sm text-[var(--muted)]">
                {results.length ? "结果揭晓后，再判断这张券是否值得执行。" : "先看可能结果，再决定是否付出期权费。"}
              </div>
            </div>
            <div className="rounded-lg border border-[var(--line)] bg-[var(--pattern-raised)] px-3 py-2 text-xs text-[var(--muted)]">
              最高价值 {pool.length ? Math.max(...pool.map((item) => item.value)) : "-"}
            </div>
          </div>

          {pool.length ? (
            <div className="grid min-h-52 place-content-center gap-4 [grid-template-columns:repeat(auto-fit,minmax(120px,160px))]">
              {displayItems.map((item, index) => (
              <div
                key={`${item.name}-${index}`}
                className={[
                  "grid aspect-[4/5] place-items-center rounded-xl border p-5 text-center text-sm shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.96]",
                  item.rarity === "5"
                    ? "border-[var(--accent-2)] bg-[rgba(247,201,72,0.14)]"
                    : item.rarity === "4"
                      ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent),transparent_88%)]"
                      : "border-[var(--line)] bg-[var(--pattern-raised)]",
                  phase === "pulling" ? "ui-breathe border-[var(--accent)]" : "",
                ].join(" ")}
              >
                <span>
                  <span className="block text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                    {phase === "pulling" ? "rolling" : `${Math.round(probabilityValue(item) * 100)}%`}
                  </span>
                  <strong className="mt-2 block text-base">{phase === "pulling" ? "..." : tierLabel(item)}</strong>
                  {phase !== "pulling" && flavorLabel(item) && (
                    <span className="mt-1 block text-xs text-[var(--muted)]">{flavorLabel(item)}</span>
                  )}
                  <span className="mt-2 block text-xs text-[var(--accent-2)]">价值 {item.value}</span>
                </span>
              </div>
              ))}
            </div>
          ) : (
            <EmptyState detail="模型没有给出概率奖池，重新生成后应至少包含 3 个结果。" />
          )}

          {!results.length && pool.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-3">
              {pool.slice(0, 3).map((item) => (
                <div key={`${item.name}-odds`} className="rounded-xl border border-[var(--line)] bg-[var(--pattern-raised)] p-5 text-xs transition-all duration-200 hover:scale-[1.02] hover:border-[var(--pattern-accent)] active:scale-[0.96]">
                  <div className="flex justify-between gap-4">
                    <span className="text-[var(--muted)]">
                      {tierLabel(item)}
                      {flavorLabel(item) ? ` · ${flavorLabel(item)}` : ""}
                    </span>
                    <strong key={probabilityValue(item)} className="animate-value-pop text-3xl font-bold">{Math.round(item.probability * 100)}%</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <footer className="ui-result rounded-xl border border-[var(--line)] bg-[var(--pattern-panel)] p-5">
        {phase === "result" && best ? (
          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
            <p className="text-sm text-[var(--muted)]">
              {won
                ? config.explanation_map.win
                    .replace("{{market_price}}", String(best.value))
                    .replace("{{strike_price}}", String(config.strike_price))
                : config.explanation_map.lose.replace("{{option_cost}}", String(config.option_cost))}
            </p>
            <strong key={profit} className={`animate-value-pop text-3xl font-bold ${won ? "text-[var(--accent)]" : "text-[var(--danger)]"}`}>
              {profit >= 0 ? "+" : ""}
              {profit}
            </strong>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">{depthGoals[depth]}</p>
        )}
      </footer>
    </section>
  );
}

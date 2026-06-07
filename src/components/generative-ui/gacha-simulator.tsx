"use client";

import { RotateCcw, Sparkles, Ticket } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DEFAULT_LEARNING_DEPTH, LEARNING_DEPTH_LABELS } from "@/types/schema";
import type { GachaPoolItem, GachaSimulatorConfig, InteractionEvent, LearningDepth } from "@/types/schema";

type Phase = "idle" | "pulling" | "result";

const depthGoals: Record<LearningDepth, string> = {
  rapid: "目标：用一次抽取抓住“选择权 + 有限损失”。",
  scenario: "目标：在未来结果揭晓后判断是否行权。",
  mapping: "目标：把抽卡动作逐项对应到期权原理。",
};

function draw(pool: GachaPoolItem[]) {
  const roll = Math.random();
  let cursor = 0;
  for (const item of pool) {
    cursor += item.probability;
    if (roll <= cursor) return item;
  }
  return pool[pool.length - 1];
}

function tierLabel(item: GachaPoolItem) {
  if (item.rarity === "5") return "5 星结果";
  if (item.rarity === "4") return "4 星结果";
  if (item.rarity === "3") return "3 星结果";
  return item.name;
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
  const pool = config.pool.length ? config.pool : [{ name: "未知结果", rarity: "3", probability: 1, value: 0 }];

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
    <section className="grid min-h-[520px] gap-5 p-5">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent)]">gacha simulator</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold">{config.title}</h2>
            <span className="rounded-[8px] border border-[rgba(247,201,72,0.4)] bg-[rgba(247,201,72,0.1)] px-2 py-1 text-xs text-[var(--accent-2)]">
              {LEARNING_DEPTH_LABELS[depth]}
            </span>
          </div>
          {config.quote && <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{config.quote}</p>}
          <p className="mt-2 text-xs text-[var(--accent)]">{depthGoals[depth]}</p>
        </div>
        <div className="rounded-[8px] border border-[var(--line)] bg-[#07120f] px-3 py-2 text-right">
          <div className="text-xs text-[var(--muted)]">余额</div>
          <div className="text-lg font-semibold text-[var(--accent-2)]">{balance}</div>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-[8px] border border-[var(--line)] bg-[#07120f] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Ticket size={16} />
            看涨期权券
          </div>
          <dl className="grid gap-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--muted)]">期权费</dt>
              <dd>{config.option_cost}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--muted)]">锁定价</dt>
              <dd>{config.strike_price}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--muted)]">次数</dt>
              <dd>{config.pulls_per_try}</dd>
            </div>
          </dl>
          <div className="mt-4 grid gap-2">
            <Button onClick={pull} disabled={phase === "pulling"} title="抽取">
              <Sparkles size={16} />
              {phase === "pulling" ? "结算中" : "买入并抽取"}
            </Button>
            <Button onClick={reset} className="bg-transparent" title="重置">
              <RotateCcw size={16} />
              重置
            </Button>
          </div>
        </aside>

        <div className="grid gap-4 rounded-[8px] border border-[var(--line)] bg-[#091611] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                {results.length ? "抽取结果" : "奖池预览"}
              </div>
              <div className="mt-1 text-sm text-[var(--muted)]">
                {results.length ? "结果揭晓后，再判断这张券是否值得执行。" : "先看可能结果，再决定是否付出期权费。"}
              </div>
            </div>
            <div className="rounded-[8px] border border-[var(--line)] bg-[#0c1915] px-3 py-2 text-xs text-[var(--muted)]">
              最高价值 {Math.max(...pool.map((item) => item.value))}
            </div>
          </div>

          <div className="grid min-h-52 place-content-center gap-3 [grid-template-columns:repeat(auto-fit,minmax(120px,160px))]">
            {displayItems.map((item, index) => (
              <div
                key={`${item.name}-${index}`}
                className={[
                  "grid aspect-[4/5] place-items-center rounded-[8px] border p-3 text-center text-sm shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition",
                  item.rarity === "5"
                    ? "border-[var(--accent-2)] bg-[rgba(247,201,72,0.14)]"
                    : item.rarity === "4"
                      ? "border-[#78a6ff] bg-[rgba(120,166,255,0.12)]"
                      : "border-[var(--line)] bg-[#0e1d19]",
                  phase === "pulling" ? "animate-pulse" : "",
                ].join(" ")}
              >
                <span>
                  <span className="block text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                    {phase === "pulling" ? "rolling" : `${Math.round(item.probability * 100)}%`}
                  </span>
                  <strong className="mt-2 block text-base">{phase === "pulling" ? "..." : tierLabel(item)}</strong>
                  <span className="mt-2 block text-xs text-[var(--accent-2)]">价值 {item.value}</span>
                </span>
              </div>
            ))}
          </div>

          {!results.length && (
            <div className="grid gap-2 sm:grid-cols-3">
              {pool.slice(0, 3).map((item) => (
                <div key={`${item.name}-odds`} className="rounded-[8px] border border-[var(--line)] bg-[#0c1915] p-3 text-xs">
                  <div className="flex justify-between gap-3">
                    <span className="text-[var(--muted)]">{tierLabel(item)}</span>
                    <strong>{Math.round(item.probability * 100)}%</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <footer className="rounded-[8px] border border-[var(--line)] bg-[#07120f] p-4">
        {phase === "result" && best ? (
          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
            <p className="text-sm text-[var(--muted)]">
              {won
                ? config.explanation_map.win
                    .replace("{{market_price}}", String(best.value))
                    .replace("{{strike_price}}", String(config.strike_price))
                : config.explanation_map.lose.replace("{{option_cost}}", String(config.option_cost))}
            </p>
            <strong className={won ? "text-[var(--accent)]" : "text-[var(--danger)]"}>
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

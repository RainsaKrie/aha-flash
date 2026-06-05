"use client";

import { RotateCcw, Sparkles, Ticket } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { GachaPoolItem, GachaSimulatorConfig, InteractionEvent } from "@/types/schema";

type Phase = "idle" | "pulling" | "result";

function draw(pool: GachaPoolItem[]) {
  const roll = Math.random();
  let cursor = 0;
  for (const item of pool) {
    cursor += item.probability;
    if (roll <= cursor) return item;
  }
  return pool[pool.length - 1];
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

  const best = useMemo(() => results.reduce<GachaPoolItem | null>((acc, item) => (!acc || item.value > acc.value ? item : acc), null), [results]);
  const profit = best ? Math.max(best.value - config.strike_price - config.option_cost, -config.option_cost) : 0;
  const won = Boolean(best && best.value > config.strike_price);

  function pull() {
    setPhase("pulling");
    setBalance((value) => value - config.option_cost);
    window.setTimeout(() => {
      const next = Array.from({ length: config.pulls_per_try }, () => draw(config.pool));
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
          best_item: bestItem?.name,
        },
      });
    }, 620);
  }

  function reset() {
    setPhase("idle");
    setResults([]);
  }

  return (
    <section className="grid h-full min-h-[560px] grid-rows-[auto_1fr_auto] gap-5 p-5">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent)]">gacha simulator</p>
          <h2 className="mt-1 text-2xl font-semibold">{config.title}</h2>
          {config.quote && <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{config.quote}</p>}
        </div>
        <div className="rounded-[8px] border border-[var(--line)] bg-[#07120f] px-3 py-2 text-right">
          <div className="text-xs text-[var(--muted)]">余额</div>
          <div className="text-lg font-semibold text-[var(--accent-2)]">{balance}</div>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
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

        <div className="rounded-[8px] border border-[var(--line)] bg-[#091611] p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {(results.length ? results : config.pool.slice(0, 10)).map((item, index) => (
              <div
                key={`${item.name}-${index}`}
                className={[
                  "grid aspect-[4/5] place-items-center rounded-[8px] border p-3 text-center text-sm transition",
                  item.rarity === "5"
                    ? "border-[var(--accent-2)] bg-[rgba(247,201,72,0.14)]"
                    : item.rarity === "4"
                      ? "border-[#78a6ff] bg-[rgba(120,166,255,0.12)]"
                      : "border-[var(--line)] bg-[#0e1d19]",
                  phase === "pulling" ? "animate-pulse" : "",
                ].join(" ")}
              >
                <span className="font-medium">{phase === "pulling" ? "..." : item.name}</span>
              </div>
            ))}
          </div>
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
          <p className="text-sm text-[var(--muted)]">先付一小笔期权费，保留未来按锁定价行动的权利。</p>
        )}
      </footer>
    </section>
  );
}

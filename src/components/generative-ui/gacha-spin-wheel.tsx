"use client";

import { RotateCcw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { GachaPoolItem, GachaSimulatorConfig, InteractionEvent } from "@/types/schema";

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

export function GachaSpinWheel({
  config,
  onComplete,
}: {
  config: GachaSimulatorConfig;
  onComplete?: (result: InteractionEvent) => void;
}) {
  const [result, setResult] = useState<GachaPoolItem | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const topPrize = useMemo(
    () => config.pool.reduce((best, item) => (item.value > best.value ? item : best), config.pool[0]),
    [config.pool],
  );
  const won = Boolean(result && result.value > config.strike_price);
  const profit = result ? Math.max(result.value - config.strike_price - config.option_cost, -config.option_cost) : 0;

  function spin() {
    setSpinning(true);
    const next = draw(config.pool);
    const nextProfit = Math.max(next.value - config.strike_price - config.option_cost, -config.option_cost);
    setRotation((value) => value + 720 + Math.round(Math.random() * 240));
    window.setTimeout(() => {
      setResult(next);
      setSpinning(false);
      onComplete?.({
        type: "gacha_completed",
        payload: { won: next.value > config.strike_price, profit: nextProfit, best_item: tierLabel(next) },
      });
    }, 650);
  }

  return (
    <section className="grid h-full min-h-[560px] grid-rows-[auto_1fr_auto] gap-5 p-5">
      <header className="border-b border-[var(--line)] pb-4">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
          <Sparkles size={15} /> spin wheel
        </p>
        <h2 className="mt-1 text-2xl font-semibold">{config.title}</h2>
        {config.quote && <p className="mt-2 text-sm text-[var(--muted)]">{config.quote}</p>}
      </header>

      <div className="grid content-center gap-6 lg:grid-cols-[1fr_280px] lg:items-center">
        <div className="grid place-items-center">
          <div className="relative grid aspect-square w-full max-w-sm place-items-center rounded-full border border-[var(--line)] bg-[#07120f]">
            <div
              className="absolute inset-8 rounded-full border border-[var(--accent)] bg-[conic-gradient(from_0deg,#35e69b,#f7c948,#78a6ff,#35e69b)] opacity-80 transition-transform duration-700"
              style={{ transform: `rotate(${rotation}deg)` }}
            />
            <div className="relative grid h-32 w-32 place-items-center rounded-full border border-[var(--line)] bg-[#08130f] p-4 text-center">
              <strong className="text-sm leading-5">{spinning ? "转动中" : result ? tierLabel(result) : tierLabel(topPrize)}</strong>
            </div>
          </div>
        </div>

        <aside className="grid gap-3 rounded-[8px] border border-[var(--line)] bg-[#07120f] p-4">
          <div className="text-sm text-[var(--muted)]">期权费 {config.option_cost}</div>
          <div className="text-sm text-[var(--muted)]">锁定价 {config.strike_price}</div>
          <Button onClick={spin} disabled={spinning} title="转动">
            <Sparkles size={16} />
            {spinning ? "结算中" : "转动一次"}
          </Button>
          <Button onClick={() => setResult(null)} className="bg-transparent" title="重置">
            <RotateCcw size={16} />
          </Button>
        </aside>
      </div>

      <footer className="rounded-[8px] border border-[var(--line)] bg-[#07120f] p-4 text-sm text-[var(--muted)]">
        {result
          ? won
            ? config.explanation_map.win
                .replace("{{market_price}}", String(result.value))
                .replace("{{strike_price}}", String(config.strike_price))
            : config.explanation_map.lose.replace("{{option_cost}}", String(config.option_cost))
          : "转盘让你先感受“付费保留机会”的动作，再看结果是否值得执行。"}
      </footer>
    </section>
  );
}

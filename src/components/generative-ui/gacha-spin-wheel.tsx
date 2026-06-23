"use client";

import { RotateCcw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { GachaPoolItem, GachaSimulatorConfig, InteractionEvent } from "@/types/schema";
import { ComponentFrame, EmptyState, FeedbackPanel, InlineSpinner, Panel } from "./shared";

const EMPTY_GACHA_POOL: GachaPoolItem[] = [];

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
  const pool = config.pool ?? EMPTY_GACHA_POOL;
  const topPrize = useMemo(
    () => pool.reduce<GachaPoolItem | null>((best, item) => (!best || item.value > best.value ? item : best), null),
    [pool],
  );
  const won = Boolean(result && result.value > config.strike_price);
  const profit = result ? Math.max(result.value - config.strike_price - config.option_cost, -config.option_cost) : 0;

  function spin() {
    setSpinning(true);
    const next = draw(pool);
    const nextProfit = Math.max(next.value - config.strike_price - config.option_cost, -config.option_cost);
    setRotation((value) => value + 720 + Math.round(Math.random() * 240));
    window.setTimeout(() => {
      setResult(next);
      setSpinning(false);
      onComplete?.({
        type: "gacha_completed",
        payload: {
          won: next.value > config.strike_price,
          profit: nextProfit,
          best_item: tierLabel(next),
          flavor_label: flavorLabel(next) || undefined,
        },
      });
    }, 650);
  }

  return (
    <ComponentFrame
      icon={Sparkles}
      label="转一次看看"
      title={config.title}
      depth={config.depth}
      description={config.quote}
      minHeight="min-h-[560px]"
      footer={
        <FeedbackPanel tone={result ? (won ? "success" : "warning") : "neutral"}>
          {result
            ? won
              ? config.explanation_map.win
                  .replace("{{market_price}}", String(result.value))
                  .replace("{{strike_price}}", String(config.strike_price))
              : config.explanation_map.lose.replace("{{option_cost}}", String(config.option_cost))
            : "先选一种你认为更可能的结果，再看看实际翻到哪一张。"}
        </FeedbackPanel>
      }
    >
      <div className="grid content-center gap-6 lg:grid-cols-[1fr_280px] lg:items-center">
        <div className="grid place-items-center">
          <div className="relative grid aspect-square w-full max-w-sm place-items-center rounded-full border border-[var(--line)] bg-[var(--pattern-panel)]">
            <div
              className="absolute inset-8 rounded-full border border-[var(--accent)] bg-[conic-gradient(from_0deg,var(--accent),var(--accent-2),var(--pattern-raised),var(--accent))] opacity-80 transition-transform duration-700"
              style={{ transform: `rotate(${rotation}deg)` }}
            />
            <div className="relative grid h-32 w-32 place-items-center rounded-full border border-[var(--line)] bg-[var(--pattern-surface)] p-5 text-center">
              <span>
                <strong className="block text-sm leading-5">{spinning ? "转动中" : result ? tierLabel(result) : topPrize ? tierLabel(topPrize) : "暂无结果"}</strong>
                {!spinning && result && flavorLabel(result) && (
                  <span className="mt-1 block text-xs text-[var(--muted)]">{flavorLabel(result)}</span>
                )}
              </span>
            </div>
          </div>
        </div>

        <Panel className="grid gap-4 p-5">
          <div>
            <p className="text-base font-medium">先猜一猜</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">转一次，看看哪种可能情况真的出现。</p>
          </div>
          <Button onClick={spin} disabled={spinning || pool.length === 0} title="转一次看看" className={`${!result && pool.length > 0 ? "ui-breathe " : ""}transition-all duration-200 hover:scale-[1.02] active:scale-[0.96]`}>
            <Sparkles size={16} />
            {spinning ? <InlineSpinner label="正在转动" /> : "转一次看看"}
          </Button>
          <Button onClick={() => setResult(null)} className="bg-transparent transition-all duration-200 hover:scale-[1.02] active:scale-[0.96]" title="再试一次">
            <RotateCcw size={16} />
            再试一次
          </Button>
        </Panel>
        {pool.length === 0 && <EmptyState detail="还没有可转的结果，重新生成后再试一次。" />}
      </div>
    </ComponentFrame>
  );
}

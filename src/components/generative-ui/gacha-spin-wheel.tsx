"use client";

import { RotateCcw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { GachaPoolItem, GachaSimulatorConfig, InteractionEvent } from "@/types/schema";
import { ComponentFrame, EmptyState, FeedbackPanel, InlineSpinner, Panel } from "./shared";

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
  const pool = config.pool || [];
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
      label="spin wheel"
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
            : "转盘让你先感受“付费保留机会”的动作，再看结果是否值得执行。"}
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
            <div className="relative grid h-32 w-32 place-items-center rounded-full border border-[var(--line)] bg-[var(--pattern-surface)] p-4 text-center">
              <span>
                <strong className="block text-sm leading-5">{spinning ? "转动中" : result ? tierLabel(result) : topPrize ? tierLabel(topPrize) : "暂无奖池"}</strong>
                {!spinning && result && flavorLabel(result) && (
                  <span className="mt-1 block text-xs text-[var(--muted)]">{flavorLabel(result)}</span>
                )}
              </span>
            </div>
          </div>
        </div>

        <Panel className="grid gap-4 p-4">
          <div className="flex justify-between gap-4 text-sm text-[var(--muted)]">
            <span>期权费</span>
            <strong className="text-[var(--accent)]">{config.option_cost}</strong>
          </div>
          <div className="flex justify-between gap-4 text-sm text-[var(--muted)]">
            <span>锁定价</span>
            <strong className="text-[var(--accent)]">{config.strike_price}</strong>
          </div>
          <Button onClick={spin} disabled={spinning || pool.length === 0} title="转动" className={!result && pool.length > 0 ? "ui-breathe" : ""}>
            <Sparkles size={16} />
            {spinning ? <InlineSpinner label="结算中" /> : "转动一次"}
          </Button>
          <Button onClick={() => setResult(null)} className="bg-transparent" title="重置">
            <RotateCcw size={16} />
          </Button>
        </Panel>
        {pool.length === 0 && <EmptyState detail="模型没有给出概率奖池，重新生成后应至少包含 3 个结果。" />}
      </div>
    </ComponentFrame>
  );
}

"use client";

import { Grid2X2Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ComponentFrame, EmptyState, FeedbackPanel, Panel, ProgressMeter, normalizeGeneratedText } from "./shared";
import type { CardFlipConfig, InteractionEvent } from "@/types/schema";

export function CardGridMatch({
  config,
  onComplete,
}: {
  config: CardFlipConfig;
  onComplete?: (result: InteractionEvent) => void;
}) {
  const [selected, setSelected] = useState<Record<number, number>>({});
  const completedRef = useRef(false);
  const cards = config.cards || [];
  const fronts = cards.map((card) => normalizeGeneratedText(card.front));
  const backs = cards.map((card) => normalizeGeneratedText(card.back));
  const matched = cards.filter((card, index) => backs[selected[index]] === normalizeGeneratedText(card.back)).length;

  useEffect(() => {
    if (completedRef.current || matched < cards.length || cards.length === 0) return;
    completedRef.current = true;
    onComplete?.({ type: "card_flip_completed", payload: { cards: cards.length, mode: "grid_match" } });
  }, [cards.length, matched, onComplete]);

  return (
    <ComponentFrame
      icon={Grid2X2Check}
      label="grid match"
      title={config.title}
      depth={config.depth}
      footer={
        <FeedbackPanel tone={matched === cards.length && cards.length > 0 ? "success" : "neutral"}>
          <ProgressMeter value={matched} total={cards.length} />
        </FeedbackPanel>
      }
    >
      <div className="grid content-center gap-4 sm:grid-cols-3">
        {cards.length ? (
          cards.map((card, index) => {
            const selectedBack = selected[index];
            const correct = selectedBack !== undefined ? backs[selectedBack] === normalizeGeneratedText(card.back) : undefined;
            return (
          <Panel
            key={fronts[index]}
            className={`grid gap-4 p-5 transition-all duration-200 hover:scale-[1.02] hover:border-[var(--pattern-accent)] active:scale-[0.96] ${correct === true ? "animate-success-flash border-[var(--accent)] bg-[rgba(53,230,155,0.1)]" : correct === false ? "animate-error-shake border-[var(--danger)] bg-[rgba(255,107,107,0.08)]" : ""}`}
          >
            <strong className="min-h-12 text-base font-medium leading-relaxed">{fronts[index]}</strong>
            <select
              aria-label={`匹配 ${fronts[index]}`}
              value={selected[index] ?? ""}
              onChange={(event) => setSelected((value) => ({ ...value, [index]: Number(event.target.value) }))}
              className="min-h-11 rounded-lg border border-[var(--line)] bg-[var(--pattern-raised)] p-3 text-sm outline-none transition-all duration-200 hover:scale-[1.02] hover:border-[var(--pattern-accent)] active:scale-[0.96] focus:border-[var(--accent)]"
            >
              <option value="">选择含义</option>
              {backs.map((back, backIndex) => (
                <option key={back} value={backIndex}>
                  {back}
                </option>
              ))}
            </select>
          </Panel>
            );
          })
        ) : (
          <EmptyState detail="模型没有给出配对卡片，重新生成后应至少包含 2 组术语和含义。" />
        )}
      </div>
    </ComponentFrame>
  );
}

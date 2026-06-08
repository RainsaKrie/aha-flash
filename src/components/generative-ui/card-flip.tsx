"use client";

import { CopyCheck } from "lucide-react";
import { useState } from "react";
import { ChoiceButton, ComponentFrame, EmptyState } from "./shared";
import type { CardFlipConfig, InteractionEvent } from "@/types/schema";

export function CardFlip({
  config,
  onComplete,
}: {
  config: CardFlipConfig;
  onComplete?: (result: InteractionEvent) => void;
}) {
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const cards = config.cards || [];

  return (
    <ComponentFrame icon={CopyCheck} label="card flip" title={config.title} depth={config.depth}>
      <div className="grid content-center gap-4 sm:grid-cols-3">
        {cards.length ? (
          cards.map((card, index) => (
          <ChoiceButton
            key={card.front}
            active={flipped[index]}
            onClick={() =>
              setFlipped((value) => {
                const next = { ...value, [index]: !value[index] };
                if (Object.values(next).filter(Boolean).length === cards.length) {
                  onComplete?.({ type: "card_flip_completed", payload: { cards: cards.length } });
                }
                return next;
              })
            }
            className="min-h-44"
            title="翻转"
          >
            <span className="text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">
              {flipped[index] ? "meaning" : "term"}
            </span>
            <span className="ui-result mt-4 block text-base font-medium leading-7">
              {flipped[index] ? card.back : card.front}
            </span>
          </ChoiceButton>
          ))
        ) : (
          <EmptyState detail="模型没有给出术语卡片，重新生成后应至少包含 2 张卡。" />
        )}
      </div>
    </ComponentFrame>
  );
}

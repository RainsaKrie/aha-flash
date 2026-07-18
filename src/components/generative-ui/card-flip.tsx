"use client";

import { CopyCheck } from "lucide-react";
import { useRef, useState } from "react";
import { ChoiceButton, ComponentFrame, EmptyState, GeneratedRichText, normalizeGeneratedText } from "./shared";
import type { CardFlipConfig, InteractionEvent } from "@/types/schema";

export function CardFlip({
  config,
  onComplete,
}: {
  config: CardFlipConfig;
  onComplete?: (result: InteractionEvent) => void;
}) {
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const seenRef = useRef<Record<number, boolean>>({});
  const completedRef = useRef(false);
  const cards = config.cards || [];

  function flipCard(index: number) {
    const nextSeen = { ...seenRef.current, [index]: true };
    seenRef.current = nextSeen;
    setFlipped((value) => ({ ...value, [index]: !value[index] }));

    if (
      !completedRef.current &&
      cards.length > 0 &&
      cards.every((_, cardIndex) => nextSeen[cardIndex])
    ) {
      completedRef.current = true;
      onComplete?.({ type: "card_flip_completed", payload: { cards: cards.length } });
    }
  }

  return (
    <ComponentFrame icon={CopyCheck} label="card flip" title={config.title} depth={config.depth}>
      <div className="grid content-center gap-4 sm:grid-cols-3">
        {cards.length ? (
          cards.map((card, index) => (
            <ChoiceButton
              key={normalizeGeneratedText(card.front)}
              active={flipped[index]}
              onClick={() => flipCard(index)}
              className="min-h-44"
              title="翻转"
            >
              <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                {flipped[index] ? "解释" : "概念"}
              </span>
              <span className={`mt-4 block text-base font-medium leading-relaxed ${flipped[index] ? "ui-result" : ""}`}>
                <GeneratedRichText value={flipped[index] ? card.back : card.front} />
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

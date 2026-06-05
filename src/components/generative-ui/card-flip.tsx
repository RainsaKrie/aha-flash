"use client";

import { CopyCheck } from "lucide-react";
import { useState } from "react";
import type { CardFlipConfig, InteractionEvent } from "@/types/schema";

export function CardFlip({
  config,
  onComplete,
}: {
  config: CardFlipConfig;
  onComplete?: (result: InteractionEvent) => void;
}) {
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});

  return (
    <section className="grid h-full min-h-[520px] grid-rows-[auto_1fr] gap-5 p-5">
      <header className="border-b border-[var(--line)] pb-4">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
          <CopyCheck size={15} /> card flip
        </p>
        <h2 className="mt-1 text-2xl font-semibold">{config.title}</h2>
      </header>
      <div className="grid content-center gap-4 sm:grid-cols-3">
        {config.cards.map((card, index) => (
          <button
            key={card.front}
            onClick={() =>
              setFlipped((value) => {
                const next = { ...value, [index]: !value[index] };
                if (Object.values(next).filter(Boolean).length === config.cards.length) {
                  onComplete?.({ type: "card_flip_completed", payload: { cards: config.cards.length } });
                }
                return next;
              })
            }
            className="min-h-44 rounded-[8px] border border-[var(--line)] bg-[#07120f] p-4 text-left transition hover:border-[var(--accent)]"
            title="翻转"
          >
            <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
              {flipped[index] ? "meaning" : "term"}
            </span>
            <span className="mt-5 block text-lg font-semibold leading-7">
              {flipped[index] ? card.back : card.front}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

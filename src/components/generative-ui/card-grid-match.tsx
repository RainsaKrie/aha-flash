"use client";

import { Grid2X2Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  const backs = config.cards.map((card) => card.back);
  const matched = config.cards.filter((card, index) => backs[selected[index]] === card.back).length;

  useEffect(() => {
    if (completedRef.current || matched < config.cards.length) return;
    completedRef.current = true;
    onComplete?.({ type: "card_flip_completed", payload: { cards: config.cards.length, mode: "grid_match" } });
  }, [config.cards.length, matched, onComplete]);

  return (
    <section className="grid h-full min-h-[520px] grid-rows-[auto_1fr_auto] gap-5 p-5">
      <header className="border-b border-[var(--line)] pb-4">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
          <Grid2X2Check size={15} /> grid match
        </p>
        <h2 className="mt-1 text-2xl font-semibold">{config.title}</h2>
      </header>
      <div className="grid content-center gap-4 sm:grid-cols-3">
        {config.cards.map((card, index) => (
          <div key={card.front} className="grid gap-3 rounded-[8px] border border-[var(--line)] bg-[#07120f] p-4">
            <strong className="min-h-12 text-base leading-6">{card.front}</strong>
            <select
              aria-label={`匹配 ${card.front}`}
              value={selected[index] ?? ""}
              onChange={(event) => setSelected((value) => ({ ...value, [index]: Number(event.target.value) }))}
              className="rounded-[8px] border border-[var(--line)] bg-[#0c1915] p-3 text-sm outline-none"
            >
              <option value="">选择含义</option>
              {backs.map((back, backIndex) => (
                <option key={back} value={backIndex}>
                  {back}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div className="rounded-[8px] border border-[var(--line)] bg-[#07120f] p-4 text-sm text-[var(--muted)]">
        已匹配 {matched} / {config.cards.length}
      </div>
    </section>
  );
}

"use client";

import { Columns2 } from "lucide-react";
import { useState } from "react";
import type { ComparisonSplitConfig, InteractionEvent } from "@/types/schema";

export function ComparisonSplit({
  config,
  onInteraction,
}: {
  config: ComparisonSplitConfig;
  onInteraction?: (event: InteractionEvent) => void;
}) {
  const [ratio, setRatio] = useState(50);

  return (
    <section className="grid h-full min-h-[520px] grid-rows-[auto_auto_1fr] gap-5 p-5">
      <header className="border-b border-[var(--line)] pb-4">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
          <Columns2 size={15} /> comparison split
        </p>
        <h2 className="mt-1 text-2xl font-semibold">{config.title}</h2>
      </header>
      <input
        aria-label="对比比例"
        type="range"
        min={25}
        max={75}
        value={ratio}
        onChange={(event) => {
          const nextRatio = Number(event.target.value);
          setRatio(nextRatio);
          onInteraction?.({
            type: "comparison_ratio_changed",
            payload: { ratio: nextRatio, left: config.left.label, right: config.right.label },
          });
        }}
        className="w-full accent-[var(--accent)]"
      />
      <div className="grid min-h-72 overflow-hidden rounded-[8px] border border-[var(--line)]" style={{ gridTemplateColumns: `${ratio}% ${100 - ratio}%` }}>
        <article className="border-r border-[var(--line)] bg-[#07120f] p-5">
          <h3 className="text-lg font-semibold text-[var(--accent-2)]">{config.left.label}</h3>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{config.left.content}</p>
        </article>
        <article className="bg-[#0e1d19] p-5">
          <h3 className="text-lg font-semibold text-[var(--accent)]">{config.right.label}</h3>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{config.right.content}</p>
        </article>
      </div>
    </section>
  );
}

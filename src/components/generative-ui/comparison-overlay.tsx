"use client";

import { Blend } from "lucide-react";
import { useState } from "react";
import type { ComparisonSplitConfig, InteractionEvent } from "@/types/schema";

export function ComparisonOverlay({
  config,
  onInteraction,
}: {
  config: ComparisonSplitConfig;
  onInteraction?: (event: InteractionEvent) => void;
}) {
  const [ratio, setRatio] = useState(50);

  function update(value: number) {
    setRatio(value);
    onInteraction?.({ type: "comparison_ratio_changed", payload: { ratio: value, left: config.left.label, right: config.right.label } });
  }

  return (
    <section className="grid h-full min-h-[520px] grid-rows-[auto_auto_1fr] gap-5 p-5">
      <header className="border-b border-[var(--line)] pb-4">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
          <Blend size={15} /> overlay fade
        </p>
        <h2 className="mt-1 text-2xl font-semibold">{config.title}</h2>
      </header>
      <input
        aria-label="叠加强度"
        type="range"
        min={0}
        max={100}
        value={ratio}
        onChange={(event) => update(Number(event.target.value))}
        className="w-full accent-[var(--accent)]"
      />
      <div className="relative min-h-80 overflow-hidden rounded-[8px] border border-[var(--line)] bg-[#07120f]">
        <article className="absolute inset-0 grid content-center gap-3 p-6" style={{ opacity: (100 - ratio) / 100 }}>
          <h3 className="text-2xl font-semibold text-[var(--accent-2)]">{config.left.label}</h3>
          <p className="text-sm leading-6 text-[var(--muted)]">{config.left.content}</p>
        </article>
        <article className="absolute inset-0 grid content-center gap-3 bg-[#0e1d19] p-6" style={{ opacity: ratio / 100 }}>
          <h3 className="text-2xl font-semibold text-[var(--accent)]">{config.right.label}</h3>
          <p className="text-sm leading-6 text-[var(--muted)]">{config.right.content}</p>
        </article>
      </div>
    </section>
  );
}

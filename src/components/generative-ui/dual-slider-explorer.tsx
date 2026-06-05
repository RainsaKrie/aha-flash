"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import type { InteractionEvent, SliderExplorerConfig } from "@/types/schema";

export function DualSliderExplorer({
  config,
  onInteraction,
}: {
  config: SliderExplorerConfig;
  onInteraction?: (event: InteractionEvent) => void;
}) {
  const [left, setLeft] = useState(config.default_value);
  const [right, setRight] = useState(Math.min(config.max, Math.max(config.min, config.default_value * 2)));

  function update(side: "left" | "right", value: number) {
    if (side === "left") setLeft(value);
    else setRight(value);
    onInteraction?.({ type: "slider_value_changed", payload: { side, value, label: config.variable_label } });
  }

  const leftCost = left * left;
  const rightCost = right * right;

  return (
    <section className="grid h-full min-h-[520px] grid-rows-[auto_1fr_auto] gap-5 p-5">
      <header className="border-b border-[var(--line)] pb-4">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
          <SlidersHorizontal size={15} /> dual slider
        </p>
        <h2 className="mt-1 text-2xl font-semibold">{config.title}</h2>
      </header>
      <div className="grid content-center gap-5 lg:grid-cols-2">
        {[
          { label: "方案 A", value: left, cost: leftCost, side: "left" as const },
          { label: "方案 B", value: right, cost: rightCost, side: "right" as const },
        ].map((item) => (
          <label key={item.side} className="grid gap-4 rounded-[8px] border border-[var(--line)] bg-[#07120f] p-5">
            <div className="flex items-end justify-between gap-3">
              <span className="text-sm text-[var(--muted)]">{item.label}</span>
              <strong className="text-3xl text-[var(--accent-2)]">
                {item.value}
                {config.unit}
              </strong>
            </div>
            <input
              aria-label={`${config.variable_label} ${item.label}`}
              type="range"
              min={config.min}
              max={config.max}
              value={item.value}
              onChange={(event) => update(item.side, Number(event.target.value))}
              className="w-full accent-[var(--accent)]"
            />
            <div className="rounded-[8px] border border-[var(--line)] bg-[#0c1915] p-4">
              <div className="text-xs text-[var(--muted)]">平方成本</div>
              <div className="mt-1 text-2xl font-semibold">{item.cost}</div>
            </div>
          </label>
        ))}
      </div>
      <p className="rounded-[8px] border border-[var(--line)] bg-[#07120f] p-4 text-sm text-[var(--muted)]">
        {config.explanation_template.replace("{{value}}", `${left} vs ${right}`)}
      </p>
    </section>
  );
}

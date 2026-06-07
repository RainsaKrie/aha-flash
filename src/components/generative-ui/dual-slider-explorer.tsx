"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import type { InteractionEvent, SliderExplorerConfig } from "@/types/schema";

type SliderOutput = NonNullable<SliderExplorerConfig["outputs"]>[number];

function computeOutput(output: SliderOutput, value: number) {
  const multiplier = output.multiplier ?? 1;
  const offset = output.offset ?? 0;

  if (output.model === "quadratic") return Math.round(multiplier * value * value + offset);
  if (output.model === "exponential") return Math.round(multiplier * 1.08 ** value + offset);
  if (output.model === "inverse") return Number((multiplier / Math.max(value, 1) + offset).toFixed(2));
  if (output.model === "logarithmic") return Number((multiplier * Math.log(Math.max(value, 1)) + offset).toFixed(2));
  return Math.round(multiplier * value + offset);
}

export function DualSliderExplorer({
  config,
  onInteraction,
}: {
  config: SliderExplorerConfig;
  onInteraction?: (event: InteractionEvent) => void;
}) {
  const [left, setLeft] = useState(config.default_value);
  const [right, setRight] = useState(Math.min(config.max, Math.max(config.min, config.default_value * 2)));
  const outputs =
    config.outputs && config.outputs.length > 0
      ? config.outputs
      : [{ label: "平方成本", model: "quadratic" as const, expression_label: "n²" }];
  const primaryOutput = outputs[0];

  function update(side: "left" | "right", value: number) {
    if (side === "left") setLeft(value);
    else setRight(value);
    onInteraction?.({ type: "slider_value_changed", payload: { side, value, label: config.variable_label } });
  }

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
          { label: "方案 A", value: left, side: "left" as const },
          { label: "方案 B", value: right, side: "right" as const },
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
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-[var(--muted)]">{primaryOutput.label}</div>
                {primaryOutput.expression_label && <div className="text-xs text-[var(--accent)]">{primaryOutput.expression_label}</div>}
              </div>
              <div className="mt-1 text-2xl font-semibold">
                {computeOutput(primaryOutput, item.value)}
                {primaryOutput.unit}
              </div>
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

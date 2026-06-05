"use client";

import { Gauge } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { InteractionEvent, SliderExplorerConfig } from "@/types/schema";

export function SliderExplorer({
  config,
  onInteraction,
}: {
  config: SliderExplorerConfig;
  onInteraction?: (event: InteractionEvent) => void;
}) {
  const [value, setValue] = useState(config.default_value);
  const quadratic = value * value;

  return (
    <section className="grid h-full min-h-[520px] grid-rows-[auto_1fr] gap-5 p-5">
      <header className="border-b border-[var(--line)] pb-4">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
          <Gauge size={15} /> slider explorer
        </p>
        <h2 className="mt-1 text-2xl font-semibold">{config.title}</h2>
      </header>
      <div className="grid content-center gap-6">
        <label className="grid gap-3">
          <div className="flex items-end justify-between gap-4">
            <span className="text-sm text-[var(--muted)]">{config.variable_label}</span>
            <strong className="text-3xl text-[var(--accent-2)]">
              {value}
              {config.unit}
            </strong>
          </div>
          <input
            aria-label={config.variable_label}
            type="range"
            min={config.min}
            max={config.max}
            value={value}
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              setValue(nextValue);
              onInteraction?.({
                type: "slider_value_changed",
                payload: { value: nextValue, label: config.variable_label },
              });
            }}
            className="w-full accent-[var(--accent)]"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          {config.scenarios?.map((scenario) => (
            <Button
              key={scenario.label}
              onClick={() => {
                setValue(scenario.value);
                onInteraction?.({
                  type: "slider_scenario_selected",
                  payload: { label: scenario.label, value: scenario.value },
                });
              }}
            >
              {scenario.label}
            </Button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[8px] border border-[var(--line)] bg-[#07120f] p-4">
            <div className="text-sm text-[var(--muted)]">线性成本</div>
            <div className="mt-2 text-2xl font-semibold">{value}</div>
          </div>
          <div className="rounded-[8px] border border-[var(--line)] bg-[#07120f] p-4">
            <div className="text-sm text-[var(--muted)]">平方成本</div>
            <div className="mt-2 text-2xl font-semibold">{quadratic}</div>
          </div>
        </div>
        <p className="rounded-[8px] border border-[var(--line)] bg-[#07120f] p-4 text-sm text-[var(--muted)]">
          {config.explanation_template.replace("{{value}}", String(value))}
        </p>
      </div>
    </section>
  );
}

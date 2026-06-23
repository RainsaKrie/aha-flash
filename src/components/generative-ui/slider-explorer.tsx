"use client";

import { Gauge } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { compoundInterestFormulaText, formatInteractiveNumber, resolveSliderCompoundFormula } from "@/lib/interactive-math";
import type { InteractionEvent, SliderExplorerConfig } from "@/types/schema";
import { EmptyState } from "./shared";

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

function getOutputResult(config: SliderExplorerConfig, output: SliderOutput, value: number) {
  const formula = resolveSliderCompoundFormula(config, output);
  if (formula) {
    const details = compoundInterestFormulaText(formula, config.variable_label, value);
    return { value: details.value, formula: details };
  }
  return { value: computeOutput(output, value), formula: null };
}

function getValueBand(value: number, min: number, max: number): "low" | "mid" | "high" {
  const ratio = (value - min) / Math.max(max - min, 1);
  if (ratio < 0.34) return "low";
  if (ratio > 0.67) return "high";
  return "mid";
}

export function SliderExplorer({
  config,
  onInteraction,
}: {
  config: SliderExplorerConfig;
  onInteraction?: (event: InteractionEvent) => void;
}) {
  const [value, setValue] = useState(config.default_value);
  const outputs = config.outputs && config.outputs.length > 0
    ? config.outputs
    : [
        { label: "线性成本", model: "linear" as const, expression_label: "n" },
        { label: "平方成本", model: "quadratic" as const, expression_label: "n²" },
      ];
  const band = getValueBand(value, config.min, config.max);
  const insight = config.insight_rules?.find((rule) => rule.when === band)?.text;
  const invalidRange = config.max <= config.min;

  return (
    <section className="grid h-full min-h-[520px] grid-rows-[auto_1fr] gap-6 p-5">
      <header className="border-b border-[var(--line)] pb-4">
        <p className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)]">
          <Gauge size={15} /> 动手调一调
        </p>
        <h2 className="mt-1 text-2xl font-semibold">{config.title}</h2>
      </header>
      <div className="grid content-center gap-6">
        {invalidRange ? (
          <EmptyState detail="模型给出的滑块范围无效，重新生成后最大值必须大于最小值。" />
        ) : (
          <>
            <label className="grid gap-4 rounded-xl border border-[var(--line)] bg-[var(--pattern-panel)] p-5">
              <div className="flex items-end justify-between gap-4">
                <span className="text-sm text-[var(--muted)]">{config.variable_label}</span>
                <strong key={value} className="animate-value-pop text-3xl font-bold text-[var(--accent)]">
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
                  onInteraction?.({ type: "slider_value_changed", payload: { value: nextValue, label: config.variable_label } });
                }}
                className="ui-range"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-3">
              {config.scenarios?.map((scenario) => (
                <Button
                  key={scenario.label}
                  className={value === config.default_value ? "ui-breathe transition-all duration-200 hover:scale-[1.02] active:scale-[0.96]" : "transition-all duration-200 hover:scale-[1.02] active:scale-[0.96]"}
                  onClick={() => {
                    setValue(scenario.value);
                    onInteraction?.({ type: "slider_scenario_selected", payload: { label: scenario.label, value: scenario.value } });
                  }}
                >
                  {scenario.label}
                </Button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {outputs.slice(0, 4).map((output) => {
                const result = getOutputResult(config, output, value);
                return (
                  <div key={output.label} className="ui-result rounded-xl border border-[var(--line)] bg-[var(--pattern-panel)] p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm text-[var(--muted)]">{output.label}</div>
                      {output.expression_label && <div className="text-xs text-[var(--accent)]">{output.expression_label}</div>}
                    </div>
                    <div key={`${output.label}-${value}`} className="animate-value-pop mt-2 text-3xl font-bold text-[var(--text)]">
                      {formatInteractiveNumber(result.value)}
                      {output.unit}
                    </div>
                    {result.formula && (
                      <div className="mt-3 grid gap-1 rounded-lg bg-[var(--pattern-raised)] px-3 py-2 text-xs leading-5 text-[var(--muted)]">
                        <span className="font-semibold text-[var(--text)]">怎么算</span>
                        <span>{result.formula.expression}</span>
                        <span>代入当前值：{result.formula.substitution}{output.unit}</span>
                      </div>
                    )}
                    {output.description && <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{output.description}</p>}
                  </div>
                );
              })}
            </div>
            <p className="ui-result rounded-xl border border-[var(--line)] bg-[var(--pattern-panel)] p-5 text-sm leading-relaxed text-[var(--muted)]">
              {insight || config.explanation_template.replace("{{value}}", String(value))}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
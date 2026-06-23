"use client";

import { Activity, Play, RotateCcw, StepForward } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { compoundInterestAt, formatInteractiveNumber, resolveSimulationCompoundInterest } from "@/lib/interactive-math";
import type { InteractionEvent, SimulationPlayConfig } from "@/types/schema";
import { ComponentFrame, EmptyState, FeedbackPanel, InlineSpinner, Panel, ProgressMeter } from "./shared";

function makeIllustrativeSeries(config: SimulationPlayConfig, values: Record<string, number>, steps: number) {
  const averagePosition = config.params.reduce((sum, param) => {
    const value = values[param.label] ?? param.default;
    return sum + (value - param.min) / Math.max(param.max - param.min, 1);
  }, 0) / Math.max(config.params.length, 1);
  const direction = averagePosition - 0.5;
  return Array.from({ length: steps + 1 }, (_, index) => Math.round(100 + direction * index * 24));
}

export function SimulationPlay({
  config,
  onInteraction,
  onComplete,
}: {
  config: SimulationPlayConfig;
  onInteraction?: (event: InteractionEvent) => void;
  onComplete?: (result: InteractionEvent) => void;
}) {
  const initialParams = useMemo(
    () => Object.fromEntries(config.params.map((param) => [param.label, param.default])),
    [config.params],
  );
  const [values, setValues] = useState<Record<string, number>>(initialParams);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const maxSteps = Math.max(1, Math.round(config.steps));
  const compoundState = resolveSimulationCompoundInterest(config, values);
  const series = compoundState
    ? Array.from({ length: maxSteps + 1 }, (_, index) => compoundInterestAt(compoundState, index))
    : makeIllustrativeSeries(config, values, maxSteps);
  const currentValue = series[Math.min(step, series.length - 1)];
  const finalValue = series[maxSteps];
  const peak = Math.max(...series, 1);
  const hasEnoughParams = config.params.length >= 2;
  const valueUnit = compoundState ? config.params.find((param) => /本金|principal|initial\s*(principal|capital)/i.test(param.label))?.unit || "" : "";
  const currentLabel = compoundState ? `第 ${step} 期终值` : `第 ${step} 步趋势指数`;
  const formulaLine = compoundState
    ? `终值 = 本金 × (1 + 年利率)^期数`
    : "趋势指数由参数相对位置生成，只用于观察方向，不是现实数值预测。";
  const currentFormula = compoundState
    ? `${formatInteractiveNumber(compoundState.principal)} × (1 + ${compoundState.rateUnit === "decimal" ? compoundState.annualRate : `${compoundState.annualRate}%`})^${step} = ${formatInteractiveNumber(currentValue)}${valueUnit}`
    : "未提供可验证公式，因此不把指数解释为真实结果。";

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setStep((value) => {
        if (value >= maxSteps) {
          window.clearInterval(timer);
          setPlaying(false);
          onComplete?.({ type: "simulation_play_completed", payload: { final_value: finalValue, steps: maxSteps } });
          return value;
        }
        return value + 1;
      });
    }, 650);

    return () => window.clearInterval(timer);
  }, [finalValue, maxSteps, onComplete, playing]);

  function updateParam(label: string, value: number) {
    setValues((current) => ({ ...current, [label]: value }));
    setStep(0);
    onInteraction?.({ type: "simulation_param_changed", payload: { label, value } });
  }

  function reset() {
    setValues(initialParams);
    setStep(0);
    setPlaying(false);
    onInteraction?.({ type: "simulation_reset", payload: {} });
  }

  return (
    <ComponentFrame
      icon={Activity}
      label="simulation play"
      title={config.title}
      depth={config.depth}
      description={config.compute_formula_description}
      footer={
        <FeedbackPanel tone={step >= maxSteps ? "success" : playing ? "warning" : "neutral"}>
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span>{step >= maxSteps ? "模拟完成，回看参数如何改变结果。" : "逐步推进，观察参数如何改变结果。"}</span>
              <strong key={step} className="animate-value-pop text-3xl font-bold text-[var(--accent)]">
                {step} / {maxSteps}
              </strong>
            </div>
            <ProgressMeter value={step} total={maxSteps} />
          </div>
        </FeedbackPanel>
      }
    >
      {hasEnoughParams ? (
        <>
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="grid content-center gap-4">
              {config.params.map((param) => (
                <Panel key={param.label} className="grid gap-4 p-5">
                  <label className="grid gap-4">
                    <div className="flex items-end justify-between gap-4">
                      <span className="text-sm text-[var(--muted)]">{param.label}</span>
                      <strong key={`${param.label}-${values[param.label]}`} className="animate-value-pop text-3xl font-bold text-[var(--accent)]">
                        {values[param.label]}
                        {param.unit}
                      </strong>
                    </div>
                    <input
                      aria-label={param.label}
                      type="range"
                      min={param.min}
                      max={param.max}
                      value={values[param.label]}
                      onChange={(event) => updateParam(param.label, Number(event.target.value))}
                      className="ui-range"
                    />
                  </label>
                </Panel>
              ))}
            </div>

            <Panel className="grid content-center gap-4 p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{currentLabel}</div>
                  <div key={currentValue} className="mt-2 animate-value-pop text-3xl font-bold text-[var(--accent)]">
                    {formatInteractiveNumber(currentValue)}{valueUnit}
                  </div>
                </div>
                <div className="text-right text-sm text-[var(--muted)]">{compoundState ? `共 ${maxSteps} 期` : "示意基准 100"}</div>
              </div>
              <div className="flex h-40 items-end gap-2">
                {series.map((item, index) => (
                  <div
                    key={index}
                    className={`min-w-0 flex-1 rounded-t-lg ${index <= step ? "bg-[var(--accent)]" : "bg-[var(--pattern-raised)]"}`}
                    style={{ height: `${Math.max(8, (item / peak) * 100)}%` }}
                    title={`${compoundState ? `第 ${index} 期终值` : `第 ${index} 步趋势指数`}: ${formatInteractiveNumber(item)}${valueUnit}`}
                  />
                ))}
              </div>
              <div className="rounded-lg bg-[var(--pattern-raised)] px-3 py-2 text-xs leading-5 text-[var(--muted)]">
                <span className="block font-semibold text-[var(--text)]">怎么算</span>
                <span className="block">{formulaLine}</span>
                <span className="block">代入当前值：{currentFormula}</span>
              </div>
            </Panel>
          </div>

          <Panel className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="text-sm text-[var(--muted)]">{playing ? "自动播放中" : "手动推进或自动播放模拟。"}</div>
            <div className="flex gap-2">
              <Button type="button" onClick={reset} title="重置" className="transition-all duration-200 hover:scale-[1.02] active:scale-[0.96]">
                <RotateCcw size={16} />
                重置
              </Button>
              <Button type="button" onClick={() => setStep((value) => Math.min(maxSteps, value + 1))} title="下一步" className="transition-all duration-200 hover:scale-[1.02] active:scale-[0.96]">
                <StepForward size={16} />
                下一步
              </Button>
              <Button
                type="button"
                onClick={() => setPlaying((value) => !value)}
                title={playing ? "暂停" : "播放"}
                className={`${!playing && step === 0 ? "ui-breathe " : ""}transition-all duration-200 hover:scale-[1.02] active:scale-[0.96]`}
              >
                {playing ? <InlineSpinner label="播放中" /> : <><Play size={16} />播放</>}
              </Button>
            </div>
          </Panel>
        </>
      ) : (
        <EmptyState detail="模型没有给出足够的可调参数，重新生成后应至少包含 2 个参数。" />
      )}
    </ComponentFrame>
  );
}
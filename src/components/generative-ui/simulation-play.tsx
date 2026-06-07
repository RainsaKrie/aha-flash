"use client";

import { Activity, Play, RotateCcw, StepForward } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { InteractionEvent, SimulationPlayConfig } from "@/types/schema";
import { ComponentFrame, EmptyState, FeedbackPanel, InlineSpinner, Panel, ProgressMeter } from "./shared";

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
  const maxSteps = Math.max(1, config.steps);
  const primaryParam = config.params[0];
  const secondaryParam = config.params[1];
  const primary = primaryParam ? values[primaryParam.label] : 8;
  const secondary = secondaryParam ? values[secondaryParam.label] : 0;
  const series = Array.from({ length: maxSteps + 1 }, (_, index) => {
    const rate = Math.max(0, primary) / 100;
    return Math.round((100 + secondary) * (1 + rate) ** index);
  });
  const currentValue = series[Math.min(step, series.length - 1)];
  const finalValue = series[maxSteps];
  const peak = Math.max(...series, 1);
  const hasEnoughParams = config.params.length >= 2;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setStep((value) => {
        if (value >= maxSteps) {
          window.clearInterval(timer);
          setPlaying(false);
          onComplete?.({
            type: "simulation_play_completed",
            payload: { final_value: finalValue, steps: maxSteps },
          });
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
              <span>{step >= maxSteps ? "模拟完成，观察最终结果和参数之间的关系。" : "逐步推进，看看结果如何被参数放大或拖慢。"}</span>
              <strong className="animate-value-pop text-[var(--accent)]">
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
          {config.params.length >= 2 ? (
            config.params.map((param) => (
              <Panel key={param.label} className="grid gap-4 p-4">
                <label className="grid gap-4">
                  <div className="flex items-end justify-between gap-4">
                    <span className="text-sm text-[var(--muted)]">{param.label}</span>
                    <strong className="animate-value-pop text-3xl font-bold text-[var(--accent)]">
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
                    className="w-full accent-[var(--accent)]"
                  />
                </label>
              </Panel>
            ))
          ) : (
            <EmptyState detail="模型没有给出足够的可调参数，重新生成后应至少包含 2 个参数。" />
          )}
        </div>

        <Panel className="grid content-center gap-4 p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">step {step}</div>
              <div className="mt-2 animate-value-pop text-3xl font-bold text-[var(--accent)]">{currentValue}</div>
            </div>
            <div className="text-right text-sm text-[var(--muted)]">基准 100</div>
          </div>
          <div className="flex h-40 items-end gap-2">
            {series.map((value, index) => (
              <div
                key={index}
                className={`min-w-0 flex-1 rounded-t-lg ${index <= step ? "bg-[var(--accent)]" : "bg-[var(--pattern-raised)]"}`}
                style={{ height: `${Math.max(8, (value / peak) * 100)}%` }}
                title={`step ${index}: ${value}`}
              />
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="text-sm text-[var(--muted)]">{playing ? "自动播放中" : "手动推进或自动播放模拟。"}</div>
        <div className="flex gap-2">
          <Button type="button" onClick={reset} title="重置">
            <RotateCcw size={16} />
          </Button>
          <Button type="button" onClick={() => setStep((value) => Math.min(maxSteps, value + 1))} title="下一步">
            <StepForward size={16} />
          </Button>
          <Button type="button" onClick={() => setPlaying((value) => !value)} title={playing ? "暂停" : "播放"}>
            {playing ? <InlineSpinner label="播放中" /> : <Play size={16} />}
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

"use client";

import { Activity, Pause, Play, RotateCcw, StepForward } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { InteractionEvent, SimulationPlayConfig } from "@/types/schema";

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
    <section className="grid h-full min-h-[520px] grid-rows-[auto_1fr_auto] gap-5 p-5">
      <header className="border-b border-[var(--line)] pb-4">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
          <Activity size={15} /> simulation play
        </p>
        <h2 className="mt-1 text-2xl font-semibold">{config.title}</h2>
      </header>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="grid content-center gap-4">
          {config.params.map((param) => (
            <label key={param.label} className="grid gap-3 rounded-[8px] border border-[var(--line)] bg-[#07120f] p-4">
              <div className="flex items-end justify-between gap-3">
                <span className="text-sm text-[var(--muted)]">{param.label}</span>
                <strong className="text-2xl text-[var(--accent-2)]">
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
          ))}
        </div>

        <div className="grid content-center gap-4 rounded-[8px] border border-[var(--line)] bg-[#07120f] p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">step {step}</div>
              <div className="mt-2 text-4xl font-semibold text-[var(--accent)]">{currentValue}</div>
            </div>
            <div className="text-right text-sm text-[var(--muted)]">基准 100</div>
          </div>
          <div className="flex h-40 items-end gap-2">
            {series.map((value, index) => (
              <div
                key={index}
                className={`min-w-0 flex-1 rounded-t-[8px] ${index <= step ? "bg-[var(--accent)]" : "bg-[#153127]"}`}
                style={{ height: `${Math.max(8, (value / peak) * 100)}%` }}
                title={`step ${index}: ${value}`}
              />
            ))}
          </div>
          <p className="text-sm leading-6 text-[var(--muted)]">{config.compute_formula_description}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-[var(--line)] bg-[#07120f] p-4">
        <div className="text-sm text-[var(--muted)]">
          进度 {step} / {maxSteps}
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={reset} title="重置">
            <RotateCcw size={16} />
          </Button>
          <Button type="button" onClick={() => setStep((value) => Math.min(maxSteps, value + 1))} title="下一步">
            <StepForward size={16} />
          </Button>
          <Button type="button" onClick={() => setPlaying((value) => !value)} title={playing ? "暂停" : "播放"}>
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </Button>
        </div>
      </div>
    </section>
  );
}

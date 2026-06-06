"use client";

import { Workflow } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { BuildSandboxConfig, InteractionEvent } from "@/types/schema";

export function SandboxFlowConnect({
  config,
  onComplete,
}: {
  config: BuildSandboxConfig;
  onComplete?: (result: InteractionEvent) => void;
}) {
  const [sequence, setSequence] = useState<string[]>([]);
  const completedRef = useRef(false);

  useEffect(() => {
    if (completedRef.current || sequence.length < config.modules.length) return;
    completedRef.current = true;
    onComplete?.({ type: "build_sandbox_completed", payload: { modules: sequence.length, target: config.target, mode: "flow_connect" } });
  }, [config.modules.length, config.target, onComplete, sequence.length]);

  function add(id: string) {
    setSequence((value) => (value.includes(id) ? value.filter((item) => item !== id) : [...value, id]));
  }

  return (
    <section className="grid h-full min-h-[520px] grid-rows-[auto_1fr_auto] gap-5 p-5">
      <header className="border-b border-[var(--line)] pb-4">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
          <Workflow size={15} /> flow connect
        </p>
        <h2 className="mt-1 text-2xl font-semibold">{config.title}</h2>
      </header>
      <div className="grid content-center gap-5">
        <div className="flex flex-wrap items-center gap-2 rounded-[8px] border border-[var(--line)] bg-[#07120f] p-4">
          {sequence.length ? (
            sequence.map((id, index) => {
              const flowModule = config.modules.find((item) => item.id === id);
              return (
                <span key={id} className="flex items-center gap-2">
                  <strong className="rounded-[8px] border border-[var(--line)] bg-[#0c1915] px-3 py-2 text-sm">
                    {flowModule?.label || id}
                  </strong>
                  {index < sequence.length - 1 && <span className="text-[var(--accent)]">→</span>}
                </span>
              );
            })
          ) : (
            <span className="text-sm text-[var(--muted)]">按流程顺序点击模块，连出系统路径。</span>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {config.modules.map((flowModule) => {
            const active = sequence.includes(flowModule.id);
            return (
              <button
                key={flowModule.id}
                onClick={() => add(flowModule.id)}
                className={`min-h-32 rounded-[8px] border p-4 text-left transition hover:border-[var(--accent)] ${
                  active ? "border-[var(--accent)] bg-[rgba(53,230,155,0.12)]" : "border-[var(--line)] bg-[#07120f]"
                }`}
              >
                <strong>{flowModule.label}</strong>
                <span className="mt-3 block text-sm leading-6 text-[var(--muted)]">{flowModule.description}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="rounded-[8px] border border-[var(--line)] bg-[#07120f] p-4 text-sm text-[var(--muted)]">
        目标：{config.target}
      </div>
    </section>
  );
}

"use client";

import { Boxes, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { BuildSandboxConfig, InteractionEvent } from "@/types/schema";

export function BuildSandbox({
  config,
  onComplete,
}: {
  config: BuildSandboxConfig;
  onComplete?: (result: InteractionEvent) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const completedRef = useRef(false);

  useEffect(() => {
    if (completedRef.current || selected.length < config.modules.length) return;
    completedRef.current = true;
    onComplete?.({
      type: "build_sandbox_completed",
      payload: { modules: selected.length, target: config.target },
    });
  }, [config.modules.length, config.target, onComplete, selected.length]);

  function toggle(id: string) {
    setSelected((value) => (value.includes(id) ? value.filter((item) => item !== id) : [...value, id]));
  }

  return (
    <section className="grid h-full min-h-[520px] grid-rows-[auto_1fr_auto] gap-5 p-5">
      <header className="border-b border-[var(--line)] pb-4">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
          <Boxes size={15} /> build sandbox
        </p>
        <h2 className="mt-1 text-2xl font-semibold">{config.title}</h2>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {config.modules.map((module) => {
          const active = selected.includes(module.id);
          return (
            <button
              key={module.id}
              onClick={() => toggle(module.id)}
              className="min-h-36 rounded-[8px] border border-[var(--line)] bg-[#07120f] p-4 text-left transition hover:border-[var(--accent)]"
            >
              <span className="flex items-center justify-between gap-3">
                <strong>{module.label}</strong>
                {active && <Check size={18} className="text-[var(--accent)]" />}
              </span>
              <span className="mt-3 block text-sm leading-6 text-[var(--muted)]">{module.description}</span>
            </button>
          );
        })}
      </div>
      <div className="rounded-[8px] border border-[var(--line)] bg-[#07120f] p-4 text-sm text-[var(--muted)]">
        {selected.length >= config.modules.length ? `已组装完成：${config.target}` : `目标：${config.target}`}
      </div>
    </section>
  );
}

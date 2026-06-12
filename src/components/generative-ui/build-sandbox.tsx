"use client";

import { Boxes, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { BuildSandboxConfig, InteractionEvent } from "@/types/schema";
import { ChoiceButton, ComponentFrame, EmptyState, FeedbackPanel, Panel, ProgressMeter } from "./shared";

export function BuildSandbox({
  config,
  onComplete,
}: {
  config: BuildSandboxConfig;
  onComplete?: (result: InteractionEvent) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const completedRef = useRef(false);
  const requiredIds = config.required_module_ids?.length
    ? config.required_module_ids
    : config.modules.map((module) => module.id);
  const selectedRequiredCount = requiredIds.filter((id) => selected.includes(id)).length;
  const complete = selectedRequiredCount >= requiredIds.length;

  useEffect(() => {
    if (completedRef.current || !complete) return;
    completedRef.current = true;
    onComplete?.({
      type: "build_sandbox_completed",
      payload: { modules: selected.length, required_modules: requiredIds.length, target: config.target },
    });
  }, [complete, config.target, onComplete, requiredIds.length, selected.length]);

  function toggle(id: string) {
    setSelected((value) => (value.includes(id) ? value.filter((item) => item !== id) : [...value, id]));
  }

  return (
    <ComponentFrame
      icon={Boxes}
      label="module sandbox"
      title={config.title}
      depth={config.depth}
      description={`目标：${config.target}`}
      footer={
        <FeedbackPanel tone={complete ? "success" : "neutral"}>
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span>{complete ? config.success_summary || `已组装完成：${config.target}` : `先选出达成目标所必需的模块。`}</span>
              <strong key={selectedRequiredCount} className="animate-value-pop text-3xl font-bold text-[var(--accent)]">
                {selectedRequiredCount} / {requiredIds.length}
              </strong>
            </div>
            <ProgressMeter value={selectedRequiredCount} total={requiredIds.length} />
          </div>
        </FeedbackPanel>
      }
    >
      {config.modules.length ? (
        <div className="grid content-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {config.modules.map((module) => {
            const active = selected.includes(module.id);
            return (
              <ChoiceButton key={module.id} active={active} onClick={() => toggle(module.id)} className="min-h-36">
                <span className="flex items-center justify-between gap-4">
                  <strong className="text-base font-medium">{module.label}</strong>
                  {active && <Check size={18} className="text-[var(--accent)]" />}
                </span>
                {module.role && <span className="mt-2 block text-xs uppercase tracking-[0.16em] text-[var(--accent)]">{module.role}</span>}
                <span className="mt-3 block text-sm leading-relaxed text-[var(--muted)]">{module.description}</span>
              </ChoiceButton>
            );
          })}
        </div>
      ) : (
        <EmptyState detail="模型没有给出可组装模块，重新生成后应包含 3-6 个模块。" />
      )}

      {config.connections && config.connections.length > 0 && (
        <Panel className="mt-4 p-5">
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">连接提示</div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {config.connections.map((connection) => (
              <span key={`${connection.from}-${connection.to}`} className="rounded-md border border-[var(--line)] bg-[var(--pattern-raised)] px-3 py-2">
                {connection.from} → {connection.to}
                {connection.label ? ` · ${connection.label}` : ""}
              </span>
            ))}
          </div>
        </Panel>
      )}
    </ComponentFrame>
  );
}

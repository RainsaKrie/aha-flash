"use client";

import { Workflow } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { BuildSandboxConfig, InteractionEvent } from "@/types/schema";
import { ChoiceButton, ComponentFrame, EmptyState, FeedbackPanel, Panel, ProgressMeter } from "./shared";

export function SandboxFlowConnect({
  config,
  onComplete,
}: {
  config: BuildSandboxConfig;
  onComplete?: (result: InteractionEvent) => void;
}) {
  const [sequence, setSequence] = useState<string[]>([]);
  const completedRef = useRef(false);
  const expectedSequence = config.expected_sequence?.length
    ? config.expected_sequence
    : config.modules.map((module) => module.id);
  const orderedMatches = expectedSequence.every((id, index) => sequence[index] === id);
  const complete = sequence.length >= expectedSequence.length && orderedMatches;

  useEffect(() => {
    if (completedRef.current || !complete) return;
    completedRef.current = true;
    onComplete?.({ type: "build_sandbox_completed", payload: { modules: sequence.length, target: config.target, mode: "flow_connect" } });
  }, [complete, config.target, onComplete, sequence.length]);

  function add(id: string) {
    setSequence((value) => (value.includes(id) ? value.filter((item) => item !== id) : [...value, id]));
  }

  return (
    <ComponentFrame
      icon={Workflow}
      label="flow connect"
      title={config.title}
      depth={config.depth}
      description={`目标：${config.target}`}
      footer={
        <FeedbackPanel tone={complete ? "success" : sequence.length > 0 && !orderedMatches ? "danger" : "neutral"}>
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span>
                {complete
                  ? config.success_summary || "流程连接正确。"
                  : sequence.length > 0 && !orderedMatches
                    ? "顺序还不对，试着按输入 → 处理 → 反馈的依赖关系连接。"
                    : "按流程顺序点击模块，连出系统路径。"}
              </span>
              <strong className="animate-value-pop text-[var(--accent)]">
                {sequence.length} / {expectedSequence.length}
              </strong>
            </div>
            <ProgressMeter value={sequence.length} total={expectedSequence.length} />
          </div>
        </FeedbackPanel>
      }
    >
      <div className="grid content-center gap-6">
        <Panel className="min-h-24 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {sequence.length ? (
              sequence.map((id, index) => {
                const flowModule = config.modules.find((item) => item.id === id);
                return (
                  <span key={id} className="flex items-center gap-2">
                    <strong className="rounded-md border border-[var(--border-subtle)] bg-[var(--pattern-raised)] px-3 py-2 text-sm">
                      {flowModule?.label || id}
                    </strong>
                    {index < sequence.length - 1 && <span className="text-[var(--accent)]">→</span>}
                  </span>
                );
              })
            ) : (
              <span className="text-sm text-[var(--text-secondary)]">还没有连接模块。</span>
            )}
          </div>
        </Panel>

        {config.modules.length ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {config.modules.map((flowModule) => {
              const active = sequence.includes(flowModule.id);
              return (
                <ChoiceButton key={flowModule.id} active={active} onClick={() => add(flowModule.id)} className="min-h-32">
                  <strong className="text-base font-medium">{flowModule.label}</strong>
                  <span className="mt-3 block text-sm leading-6 text-[var(--text-secondary)]">{flowModule.description}</span>
                </ChoiceButton>
              );
            })}
          </div>
        ) : (
          <EmptyState detail="模型没有给出流程模块，重新生成后应包含 3-6 个可连接模块。" />
        )}
      </div>
    </ComponentFrame>
  );
}

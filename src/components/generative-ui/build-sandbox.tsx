"use client";

import { Boxes, Check, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
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
  const selectedOptionalCount = selected.filter((id) => !requiredIds.includes(id)).length;
  const hasWrongSelection = selectedOptionalCount > 0;
  const complete = selectedRequiredCount >= requiredIds.length && !hasWrongSelection;
  const moduleLabelById = new Map(config.modules.map((module) => [module.id, module.label]));
  const moduleName = (id: string) => moduleLabelById.get(id) || id;
  const connectionPathIds = config.connections?.length
    ? [config.connections[0].from, ...config.connections.map((connection) => connection.to)]
    : [];
  const rawPathIds = (config.expected_sequence?.length ? config.expected_sequence : connectionPathIds).filter((id) => moduleLabelById.has(id));
  const pathNodes = rawPathIds.slice(0, 5).map((id) => ({ id, label: moduleName(id) }));
  const pathEdges = pathNodes.slice(0, -1).map((node, index) => {
    const next = pathNodes[index + 1];
    const exactConnection = config.connections?.find((connection) => connection.from === node.id && connection.to === next.id);
    const fallbackConnection = config.connections?.[index];
    return {
      from: node.id,
      to: next.id,
      label: exactConnection?.label || fallbackConnection?.label || "继续传递",
    };
  });
  const trackCells: Array<
    | { type: "node"; node: (typeof pathNodes)[number]; index: number }
    | { type: "edge"; edge: (typeof pathEdges)[number]; index: number }
  > = [];
  pathNodes.forEach((node, index) => {
    trackCells.push({ type: "node", node, index });
    const edge = pathEdges[index];
    if (edge) trackCells.push({ type: "edge", edge, index });
  });
  const trackGridStyle = {
    gridTemplateColumns: trackCells.map((cell) => (cell.type === "node" ? "minmax(86px, 1fr)" : "minmax(92px, 0.78fr)")).join(" "),
  } as CSSProperties;

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
        <FeedbackPanel tone={complete ? "success" : hasWrongSelection ? "danger" : "neutral"}>
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <span>{complete ? config.success_summary || `已组装完成：${config.target}` : hasWrongSelection ? `有 ${selectedOptionalCount} 个模块不是当前目标必需项，取消它再继续。` : `先选出达成目标所必需的模块。`}</span>
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
            const required = requiredIds.includes(module.id);
            return (
              <ChoiceButton key={module.id} active={active} correct={active ? required : undefined} onClick={() => toggle(module.id)} className="min-h-36">
                <span className="flex items-center justify-between gap-4">
                  <strong className="text-base font-medium">{module.label}</strong>
                  {active && (required ? <Check size={18} className="text-[var(--accent)]" /> : <X size={18} className="text-[var(--danger)]" />)}
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

      {pathNodes.length > 1 && (
        <Panel className="mt-4 p-5">
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">协作路径</div>
          <div className="system-path-track mt-4" role="list" aria-label="模块协作路径">
            <div className="system-path-track__rail" style={trackGridStyle}>
              {trackCells.map((cell) =>
                cell.type === "node" ? (
                  <div key={`node-${cell.node.id}-${cell.index}`} className="system-path-track__node" role="listitem">
                    <span className="system-path-track__dot">{cell.index + 1}</span>
                    <span className="system-path-track__label">{cell.node.label}</span>
                  </div>
                ) : (
                  <div key={`edge-${cell.edge.from}-${cell.edge.to}-${cell.index}`} className="system-path-track__edge" aria-label="路径说明">
                    <span className="system-path-track__line" aria-hidden="true">→</span>
                    <span className="system-path-track__hint">{cell.edge.label}</span>
                  </div>
                ),
              )}
            </div>
          </div>
        </Panel>
      )}
    </ComponentFrame>
  );
}

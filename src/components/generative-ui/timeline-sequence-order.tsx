"use client";

import { CheckCircle2, ListOrdered, RotateCcw, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { InteractionEvent, TimelineScrubberConfig } from "@/types/schema";
import { ChoiceButton, ComponentFrame, EmptyState, FeedbackPanel, Panel, ProgressMeter } from "./shared";

function rotateOnce<T>(items: T[]) {
  if (items.length < 2) return items;
  return [...items.slice(1), items[0]];
}

function sameOrder(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function TimelineSequenceOrder({
  config,
  onInteraction,
  onComplete,
}: {
  config: TimelineScrubberConfig;
  onInteraction?: (event: InteractionEvent) => void;
  onComplete?: (result: InteractionEvent) => void;
}) {
  const events = useMemo(() => config.events || [], [config.events]);
  const correctOrder = useMemo(() => {
    const provided = config.correct_order || [];
    const labels = events.map((event) => event.label);
    const validProvided = provided.length === labels.length && provided.every((label) => labels.includes(label));
    return validProvided ? provided : labels;
  }, [config.correct_order, events]);
  const candidates = useMemo(() => {
    const byLabel = new Map(events.map((event) => [event.label, event]));
    return rotateOnce(correctOrder.map((label) => byLabel.get(label)).filter((event): event is NonNullable<typeof event> => Boolean(event)));
  }, [correctOrder, events]);

  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const isCorrect = checked && sameOrder(selectedLabels, correctOrder);
  const canCheck = selectedLabels.length === correctOrder.length;

  function choose(label: string) {
    if (checked || selectedLabels.includes(label)) return;
    const next = [...selectedLabels, label];
    setSelectedLabels(next);
    onInteraction?.({ type: "timeline_order_selected", payload: { label, position: next.length } });
  }

  function undo() {
    if (checked) return;
    setSelectedLabels((current) => current.slice(0, -1));
  }

  function reset() {
    setSelectedLabels([]);
    setChecked(false);
    onInteraction?.({ type: "timeline_order_reset", payload: {} });
  }

  function checkOrder() {
    if (!canCheck) return;
    setChecked(true);
    onInteraction?.({ type: "timeline_order_checked", payload: { correct: sameOrder(selectedLabels, correctOrder) } });
  }

  return (
    <ComponentFrame
      icon={ListOrdered}
      label="sequence order"
      title={config.title}
      depth={config.depth}
      footer={
        <FeedbackPanel tone={checked ? (isCorrect ? "success" : "danger") : "neutral"}>
          {checked ? (
            <div className="grid gap-3">
              <strong>{isCorrect ? "顺序正确，你已经走通了这条路径。" : "顺序还差一步，先看正确路径再重试。"}</strong>
              {!isCorrect && <span>正确顺序：{correctOrder.join(" → ")}</span>}
              {isCorrect && (
                <Button
                  type="button"
                  onClick={() => onComplete?.({ type: "timeline_order_completed", payload: { events: events.length } })}
                >
                  <CheckCircle2 size={16} /> 我明白了，继续
                </Button>
              )}
            </div>
          ) : (
            "按发生顺序点选节点，再检查这条路径。"
          )}
        </FeedbackPanel>
      }
    >
      {events.length >= 3 ? (
        <div className="grid content-center gap-6">
          <Panel className="grid gap-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-[var(--muted)]">你的路径</span>
              <span className="text-sm font-semibold text-[var(--accent)]">{selectedLabels.length} / {events.length}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              {Array.from({ length: events.length }, (_, index) => {
                const label = selectedLabels[index];
                return (
                  <button
                    key={label || "slot-" + index}
                    type="button"
                    disabled={!label || checked}
                    onClick={undo}
                    className="min-h-11 rounded-lg border border-dashed border-[var(--line)] bg-[var(--pattern-raised)] px-3 py-2 text-left text-sm font-medium text-[var(--text)] disabled:cursor-default disabled:opacity-100"
                  >
                    <span className="mr-2 text-xs text-[var(--muted)]">{index + 1}</span>
                    {label || "选择下一步"}
                  </button>
                );
              })}
            </div>
          </Panel>

          <div className="grid gap-4 sm:grid-cols-2">
            {candidates.map((event) => {
              const selected = selectedLabels.includes(event.label);
              return (
                <ChoiceButton
                  key={event.label}
                  disabled={selected || checked}
                  active={false}
                  onClick={() => choose(event.label)}
                  className={selected ? "border-[var(--accent)] bg-[var(--pattern-raised)] opacity-55" : ""}
                >
                  <span className="block font-semibold">{event.label}</span>
                  <span className="mt-1 block text-xs text-[var(--muted)]">{event.description}</span>
                </ChoiceButton>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <ProgressMeter value={selectedLabels.length} total={events.length} />
            <div className="flex gap-2">
              <Button type="button" onClick={undo} disabled={!selectedLabels.length || checked}>
                <Undo2 size={16} /> 撤销一步
              </Button>
              <Button type="button" onClick={reset}>
                <RotateCcw size={16} /> 重排
              </Button>
              <Button type="button" onClick={checkOrder} disabled={!canCheck || checked}>
                <CheckCircle2 size={16} /> 检查顺序
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState detail="排序路径至少需要 3 个节点，重新生成后再试一次。" />
      )}
    </ComponentFrame>
  );
}
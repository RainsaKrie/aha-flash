"use client";

import { ListTree } from "lucide-react";
import { useRef, useState } from "react";
import { ComponentFrame, EmptyState, FeedbackPanel, Panel, ProgressMeter } from "./shared";
import type { InteractionEvent, TimelineScrubberConfig } from "@/types/schema";

export function TimelineScrubber({
  config,
  onInteraction,
  onComplete,
}: {
  config: TimelineScrubberConfig;
  onInteraction?: (event: InteractionEvent) => void;
  onComplete?: (result: InteractionEvent) => void;
}) {
  const [index, setIndex] = useState(0);
  const events = config.events || [];
  const active = events[index] ?? events[0];
  const completedRef = useRef(false);

  function selectIndex(nextIndex: number) {
    const nextEvent = events[nextIndex] ?? events[0];
    setIndex(nextIndex);
    onInteraction?.({
      type: "timeline_node_viewed",
      payload: { index: nextIndex, label: nextEvent?.label },
    });

    if (!completedRef.current && nextIndex === events.length - 1) {
      completedRef.current = true;
      onComplete?.({
        type: "timeline_completed",
        payload: { events: events.length, final_label: nextEvent?.label },
      });
    }
  }

  return (
    <ComponentFrame
      icon={ListTree}
      label="timeline"
      title={config.title}
      depth={config.depth}
      footer={
        events.length > 0 && (
          <FeedbackPanel tone={index === events.length - 1 ? "success" : "neutral"}>
            <ProgressMeter value={index + 1} total={events.length} />
          </FeedbackPanel>
        )
      }
    >
      <div className="grid content-center gap-6">
        {events.length ? (
          <>
            <input
              aria-label="时间节点"
              type="range"
              min={0}
              max={Math.max(events.length - 1, 0)}
              value={index}
              onChange={(event) => selectIndex(Number(event.target.value))}
              className="ui-range"
            />
            <Panel className="p-6">
              <div className="text-sm text-[var(--text-secondary)]">节点 {index + 1}</div>
              <h3 className="mt-2 text-2xl font-semibold text-[var(--amber)]">{active?.label}</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{active?.description}</p>
            </Panel>
          </>
        ) : (
          <EmptyState detail="模型没有给出时间节点，重新生成后应包含 3-6 个阶段事件。" />
        )}
      </div>
    </ComponentFrame>
  );
}

"use client";

import { ListTree } from "lucide-react";
import { useRef, useState } from "react";
import { ChoiceButton, ComponentFrame, EmptyState, FeedbackPanel, ProgressMeter } from "./shared";
import type { InteractionEvent, TimelineScrubberConfig } from "@/types/schema";

export function VerticalTimeline({
  config,
  onInteraction,
  onComplete,
}: {
  config: TimelineScrubberConfig;
  onInteraction?: (event: InteractionEvent) => void;
  onComplete?: (result: InteractionEvent) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const completedRef = useRef(false);
  const events = config.events || [];

  function select(index: number) {
    const event = events[index];
    setActiveIndex(index);
    onInteraction?.({ type: "timeline_node_viewed", payload: { index, label: event?.label } });
    if (!completedRef.current && index === events.length - 1) {
      completedRef.current = true;
      onComplete?.({ type: "timeline_completed", payload: { events: events.length, final_label: event?.label } });
    }
  }

  return (
    <ComponentFrame
      icon={ListTree}
      label="vertical timeline"
      title={config.title}
      depth={config.depth}
      footer={
        events.length > 0 && (
          <FeedbackPanel tone={activeIndex === events.length - 1 ? "success" : "neutral"}>
            <ProgressMeter value={activeIndex + 1} total={events.length} />
          </FeedbackPanel>
        )
      }
    >
      <div className="grid content-center gap-4">
        {events.length ? (
          events.map((event, index) => {
          const active = index === activeIndex;
          return (
            <ChoiceButton
              key={event.label}
              onClick={() => select(index)}
              active={active}
              className="grid gap-2 border-l-2"
            >
              <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">step {index + 1}</span>
              <strong className={active ? "text-[var(--accent-2)]" : ""}>{event.label}</strong>
              {active && <span className="text-sm leading-6 text-[var(--muted)]">{event.description}</span>}
            </ChoiceButton>
          );
          })
        ) : (
          <EmptyState detail="模型没有给出时间节点，重新生成后应包含 3-6 个阶段事件。" />
        )}
      </div>
    </ComponentFrame>
  );
}

"use client";

import { ListTree } from "lucide-react";
import { useRef, useState } from "react";
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
  const active = config.events[index] ?? config.events[0];
  const completedRef = useRef(false);

  function selectIndex(nextIndex: number) {
    const nextEvent = config.events[nextIndex] ?? config.events[0];
    setIndex(nextIndex);
    onInteraction?.({
      type: "timeline_node_viewed",
      payload: { index: nextIndex, label: nextEvent?.label },
    });

    if (!completedRef.current && nextIndex === config.events.length - 1) {
      completedRef.current = true;
      onComplete?.({
        type: "timeline_completed",
        payload: { events: config.events.length, final_label: nextEvent?.label },
      });
    }
  }

  return (
    <section className="grid h-full min-h-[520px] grid-rows-[auto_1fr] gap-5 p-5">
      <header className="border-b border-[var(--line)] pb-4">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
          <ListTree size={15} /> timeline
        </p>
        <h2 className="mt-1 text-2xl font-semibold">{config.title}</h2>
      </header>
      <div className="grid content-center gap-6">
        <input
          aria-label="时间节点"
          type="range"
          min={0}
          max={Math.max(config.events.length - 1, 0)}
          value={index}
          onChange={(event) => selectIndex(Number(event.target.value))}
          className="w-full accent-[var(--accent)]"
        />
        <div className="rounded-[8px] border border-[var(--line)] bg-[#07120f] p-6">
          <div className="text-sm text-[var(--muted)]">节点 {index + 1}</div>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--accent-2)]">{active?.label}</h3>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{active?.description}</p>
        </div>
      </div>
    </section>
  );
}

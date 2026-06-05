"use client";

import { ListTree } from "lucide-react";
import { useRef, useState } from "react";
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

  function select(index: number) {
    const event = config.events[index];
    setActiveIndex(index);
    onInteraction?.({ type: "timeline_node_viewed", payload: { index, label: event?.label } });
    if (!completedRef.current && index === config.events.length - 1) {
      completedRef.current = true;
      onComplete?.({ type: "timeline_completed", payload: { events: config.events.length, final_label: event?.label } });
    }
  }

  return (
    <section className="grid h-full min-h-[520px] grid-rows-[auto_1fr] gap-5 p-5">
      <header className="border-b border-[var(--line)] pb-4">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
          <ListTree size={15} /> vertical timeline
        </p>
        <h2 className="mt-1 text-2xl font-semibold">{config.title}</h2>
      </header>
      <div className="grid content-center gap-3">
        {config.events.map((event, index) => {
          const active = index === activeIndex;
          return (
            <button
              key={event.label}
              onClick={() => select(index)}
              className={`grid gap-2 border-l-2 p-4 text-left transition ${
                active ? "border-[var(--accent)] bg-[#07120f]" : "border-[var(--line)] hover:bg-[#07120f]"
              }`}
            >
              <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">step {index + 1}</span>
              <strong className={active ? "text-[var(--accent-2)]" : ""}>{event.label}</strong>
              {active && <span className="text-sm leading-6 text-[var(--muted)]">{event.description}</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

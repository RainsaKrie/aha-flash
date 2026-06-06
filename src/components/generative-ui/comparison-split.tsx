"use client";

import { Columns2, Eye } from "lucide-react";
import { useState } from "react";
import type { ComparisonSplitConfig, InteractionEvent } from "@/types/schema";

type FocusMode = "both" | "left" | "right";

function splitPoints(content: string) {
  return content
    .split(/[。；;]\s*/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

export function ComparisonSplit({
  config,
  onInteraction,
}: {
  config: ComparisonSplitConfig;
  onInteraction?: (event: InteractionEvent) => void;
}) {
  const [focus, setFocus] = useState<FocusMode>("both");
  const leftPoints = splitPoints(config.left.content);
  const rightPoints = splitPoints(config.right.content);

  function updateFocus(nextFocus: FocusMode) {
    setFocus(nextFocus);
    onInteraction?.({
      type: "comparison_focus_changed",
      payload: { focus: nextFocus, left: config.left.label, right: config.right.label },
    });
  }

  return (
    <section className="grid h-full min-h-[520px] grid-rows-[auto_auto_1fr] gap-5 p-5">
      <header className="border-b border-[var(--line)] pb-4">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
          <Columns2 size={15} /> comparison split
        </p>
        <h2 className="mt-1 text-2xl font-semibold">{config.title}</h2>
      </header>

      <div className="grid gap-2 sm:grid-cols-3">
        {[
          { value: "both" as const, label: "并排" },
          { value: "left" as const, label: config.left.label },
          { value: "right" as const, label: config.right.label },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            className={[
              "tool-button min-h-9 justify-center px-3 text-xs",
              focus === option.value ? "border-[var(--accent)] bg-[rgba(53,230,155,0.16)] text-[var(--text)]" : "",
            ].join(" ")}
            onClick={() => updateFocus(option.value)}
          >
            <Eye size={14} />
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid min-h-80 overflow-hidden rounded-[8px] border border-[var(--line)] md:grid-cols-2">
        <article
          className={[
            "border-b border-[var(--line)] bg-[#07120f] p-5 transition md:border-b-0 md:border-r",
            focus === "right" ? "opacity-35" : "opacity-100",
          ].join(" ")}
        >
          <h3 className="text-lg font-semibold text-[var(--accent-2)]">{config.left.label}</h3>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-[var(--muted)]">
            {(leftPoints.length ? leftPoints : [config.left.content]).map((point, index) => (
              <li key={`${point}-${index}`} className="rounded-[8px] border border-[var(--line)] bg-[#0b1814] p-3">
                {point}
              </li>
            ))}
          </ul>
        </article>
        <article className={["bg-[#0e1d19] p-5 transition", focus === "left" ? "opacity-35" : "opacity-100"].join(" ")}>
          <h3 className="text-lg font-semibold text-[var(--accent)]">{config.right.label}</h3>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-[var(--muted)]">
            {(rightPoints.length ? rightPoints : [config.right.content]).map((point, index) => (
              <li key={`${point}-${index}`} className="rounded-[8px] border border-[var(--line)] bg-[#07120f] p-3">
                {point}
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}

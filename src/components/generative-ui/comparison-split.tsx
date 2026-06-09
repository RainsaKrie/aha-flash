"use client";

import { Columns2, Eye, Lightbulb } from "lucide-react";
import { useState } from "react";
import type { ComparisonSplitConfig, InteractionEvent } from "@/types/schema";
import { ChoiceButton, ComponentFrame, FeedbackPanel, Panel } from "./shared";

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
  const [dimensionIndex, setDimensionIndex] = useState(0);
  const dimensions = config.dimensions || [];
  const activeDimension = dimensions[dimensionIndex];
  const subjectA = config.subject_a || config.left.label;
  const subjectB = config.subject_b || config.right.label;
  const leftPoints = splitPoints(config.left.content);
  const rightPoints = splitPoints(config.right.content);

  function updateFocus(nextFocus: FocusMode) {
    setFocus(nextFocus);
    onInteraction?.({
      type: "comparison_focus_changed",
      payload: { focus: nextFocus, left: config.left.label, right: config.right.label },
    });
  }

  function selectDimension(index: number) {
    setDimensionIndex(index);
    onInteraction?.({
      type: "comparison_dimension_selected",
      payload: { index, label: dimensions[index]?.label, left: subjectA, right: subjectB },
    });
  }

  return (
    <ComponentFrame
      icon={Columns2}
      label="comparison split"
      title={config.title}
      depth={config.depth}
      footer={config.summary ? <FeedbackPanel tone="neutral">{config.summary}</FeedbackPanel> : undefined}
    >
      {dimensions.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-4">
          {dimensions.map((dimension, index) => (
            <ChoiceButton
              key={`${dimension.label}-${index}`}
              active={dimensionIndex === index}
              className="min-h-11 p-3 text-xs"
              onClick={() => selectDimension(index)}
            >
              {dimension.label}
            </ChoiceButton>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { value: "both" as const, label: "并排" },
            { value: "left" as const, label: subjectA },
            { value: "right" as const, label: subjectB },
          ].map((option) => (
            <ChoiceButton
              key={option.value}
              active={focus === option.value}
              className="min-h-11 p-3 text-center text-xs"
              onClick={() => updateFocus(option.value)}
            >
              <Eye size={14} />
              {option.label}
            </ChoiceButton>
          ))}
        </div>
      )}

      {activeDimension ? (
        <Panel className="mt-4 grid min-h-80 gap-4 p-5">
          <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
            <article className="rounded-xl border border-[var(--line)] bg-[var(--pattern-raised)] p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{subjectA}</div>
              <h3 className="mt-2 text-base font-medium text-[var(--accent-2)]">{activeDimension.a}</h3>
            </article>
            <div className="grid place-items-center px-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              {activeDimension.label}
            </div>
            <article className="rounded-xl border border-[var(--line)] bg-[var(--pattern-raised)] p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{subjectB}</div>
              <h3 className="mt-2 text-base font-medium text-[var(--accent)]">{activeDimension.b}</h3>
            </article>
          </div>

          <div className="ui-result flex items-start gap-4 rounded-xl border border-[rgba(247,201,72,0.32)] bg-[rgba(247,201,72,0.08)] p-4 text-sm leading-6 text-[var(--accent-2)]">
            <Lightbulb size={18} className="mt-0.5 shrink-0" />
            <strong>{activeDimension.insight}</strong>
          </div>
        </Panel>
      ) : (
        <Panel className="mt-4 grid min-h-80 overflow-hidden md:grid-cols-2">
          <article
            className={[
              "border-b border-[var(--line)] bg-[var(--pattern-panel)] p-5 transition md:border-b-0 md:border-r",
              focus === "right" ? "opacity-35" : "opacity-100",
            ].join(" ")}
          >
            <h3 className="text-base font-medium text-[var(--accent-2)]">{config.left.label}</h3>
            <ul className="mt-4 grid gap-4 text-sm leading-6 text-[var(--muted)]">
              {(leftPoints.length ? leftPoints : [config.left.content]).map((point, index) => (
                <li key={`${point}-${index}`} className="rounded-xl border border-[var(--line)] bg-[var(--pattern-raised)] p-3">
                  {point}
                </li>
              ))}
            </ul>
          </article>
          <article className={["bg-[var(--pattern-raised)] p-5 transition", focus === "left" ? "opacity-35" : "opacity-100"].join(" ")}>
            <h3 className="text-base font-medium text-[var(--accent)]">{config.right.label}</h3>
            <ul className="mt-4 grid gap-4 text-sm leading-6 text-[var(--muted)]">
              {(rightPoints.length ? rightPoints : [config.right.content]).map((point, index) => (
                <li key={`${point}-${index}`} className="rounded-xl border border-[var(--line)] bg-[var(--pattern-panel)] p-3">
                  {point}
                </li>
              ))}
            </ul>
          </article>
        </Panel>
      )}
    </ComponentFrame>
  );
}

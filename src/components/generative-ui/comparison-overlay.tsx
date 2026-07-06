"use client";

import { Blend } from "lucide-react";
import { useEffect, useState } from "react";
import type { ComparisonSplitConfig, InteractionEvent } from "@/types/schema";
import { ChoiceButton, ComponentFrame, FeedbackPanel, Panel } from "./shared";

export function ComparisonOverlay({
  config,
  onInteraction,
  onComplete,
}: {
  config: ComparisonSplitConfig;
  onInteraction?: (event: InteractionEvent) => void;
  onComplete?: (event: InteractionEvent) => void;
}) {
  const [ratio, setRatio] = useState(50);
  const [ratioTouched, setRatioTouched] = useState(false);
  const [dimensionIndex, setDimensionIndex] = useState(0);
  const [visitedDimensions, setVisitedDimensions] = useState<Record<number, boolean>>({});
  const [completed, setCompleted] = useState(false);
  const dimensions = config.dimensions || [];
  const activeDimension = dimensions[dimensionIndex];
  const leftLabel = config.subject_a || config.left.label;
  const rightLabel = config.subject_b || config.right.label;

  useEffect(() => {
    if (completed || !ratioTouched) return;
    const visitedEveryDimension = dimensions.length === 0 || dimensions.every((_, index) => visitedDimensions[index]);
    if (!visitedEveryDimension) return;
    setCompleted(true);
    onComplete?.({
      type: "comparison_overlay_completed",
      payload: { ratio, dimensions: dimensions.length, left: leftLabel, right: rightLabel },
    });
  }, [completed, dimensions, leftLabel, onComplete, ratio, ratioTouched, rightLabel, visitedDimensions]);

  function update(value: number) {
    setRatio(value);
    setRatioTouched(true);
    onInteraction?.({ type: "comparison_ratio_changed", payload: { ratio: value, left: config.left.label, right: config.right.label } });
  }

  function selectDimension(index: number) {
    setDimensionIndex(index);
    setVisitedDimensions((value) => ({ ...value, [index]: true }));
    onInteraction?.({
      type: "comparison_dimension_selected",
      payload: { index, label: dimensions[index]?.label, left: leftLabel, right: rightLabel },
    });
  }

  const leftContent = activeDimension?.a || config.left.content;
  const rightContent = activeDimension?.b || config.right.content;

  return (
    <ComponentFrame
      icon={Blend}
      label="overlay fade"
      title={config.title}
      depth={config.depth}
      footer={config.summary ? <FeedbackPanel tone="neutral">{config.summary}</FeedbackPanel> : undefined}
    >
      <div className="grid gap-6">
        {dimensions.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-4">
            {dimensions.map((dimension, index) => (
              <ChoiceButton
                key={`${dimension.label}-${index}`}
                active={dimensionIndex === index}
                className="p-3 text-xs"
                onClick={() => selectDimension(index)}
              >
                {dimension.label}
              </ChoiceButton>
            ))}
          </div>
        )}

        <Panel className="grid gap-4 p-5">
          <div className="flex items-center justify-between gap-4 text-xs text-[var(--muted)]">
            <span>{leftLabel}</span>
            <strong key={ratio} className="animate-value-pop text-3xl font-bold text-[var(--accent)]">{ratio}%</strong>
            <span>{rightLabel}</span>
          </div>
          <input
            aria-label="叠加强度"
            type="range"
            min={0}
            max={100}
            value={ratio}
            onChange={(event) => update(Number(event.target.value))}
            className="ui-range"
          />
        </Panel>

        <Panel className="relative min-h-80 overflow-hidden">
          <article className="absolute inset-0 grid content-center gap-4 p-5" style={{ opacity: (100 - ratio) / 100 }}>
            <h3 className="text-2xl font-semibold text-[var(--accent-2)]">{leftLabel}</h3>
            <p className="text-sm leading-relaxed text-[var(--muted)]">{leftContent}</p>
          </article>
          <article
            className="absolute inset-0 grid content-center gap-4 bg-[var(--pattern-raised)] p-5"
            style={{ opacity: ratio / 100 }}
          >
            <h3 className="text-2xl font-semibold text-[var(--accent)]">{rightLabel}</h3>
            <p className="text-sm leading-relaxed text-[var(--muted)]">{rightContent}</p>
          </article>
        </Panel>

        {activeDimension && <FeedbackPanel tone="warning">{activeDimension.insight}</FeedbackPanel>}
      </div>
    </ComponentFrame>
  );
}

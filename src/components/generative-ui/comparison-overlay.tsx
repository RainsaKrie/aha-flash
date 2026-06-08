"use client";

import { Blend } from "lucide-react";
import { useState } from "react";
import type { ComparisonSplitConfig, InteractionEvent } from "@/types/schema";
import { ChoiceButton, ComponentFrame, FeedbackPanel, Panel } from "./shared";

export function ComparisonOverlay({
  config,
  onInteraction,
}: {
  config: ComparisonSplitConfig;
  onInteraction?: (event: InteractionEvent) => void;
}) {
  const [ratio, setRatio] = useState(50);
  const [dimensionIndex, setDimensionIndex] = useState(0);
  const dimensions = config.dimensions || [];
  const activeDimension = dimensions[dimensionIndex];
  const leftLabel = config.subject_a || config.left.label;
  const rightLabel = config.subject_b || config.right.label;

  function update(value: number) {
    setRatio(value);
    onInteraction?.({ type: "comparison_ratio_changed", payload: { ratio: value, left: config.left.label, right: config.right.label } });
  }

  function selectDimension(index: number) {
    setDimensionIndex(index);
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

        <Panel className="grid gap-4 p-4">
          <div className="flex items-center justify-between gap-4 text-xs text-[var(--text-secondary)]">
            <span>{leftLabel}</span>
            <strong className="animate-value-pop text-[var(--accent)]">{ratio}%</strong>
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
          <article className="absolute inset-0 grid content-center gap-4 p-6" style={{ opacity: (100 - ratio) / 100 }}>
            <h3 className="text-2xl font-semibold text-[var(--amber)]">{leftLabel}</h3>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">{leftContent}</p>
          </article>
          <article
            className="absolute inset-0 grid content-center gap-4 bg-[var(--pattern-raised)] p-6"
            style={{ opacity: ratio / 100 }}
          >
            <h3 className="text-2xl font-semibold text-[var(--accent)]">{rightLabel}</h3>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">{rightContent}</p>
          </article>
        </Panel>

        {activeDimension && <FeedbackPanel tone="warning">{activeDimension.insight}</FeedbackPanel>}
      </div>
    </ComponentFrame>
  );
}

"use client";

import { GitBranch } from "lucide-react";
import { useState } from "react";
import { DEFAULT_LEARNING_DEPTH, LEARNING_DEPTH_LABELS } from "@/types/schema";
import type { InteractionEvent, LearningDepth, NarrativeBranchConfig } from "@/types/schema";

const depthGoals: Record<LearningDepth, string> = {
  rapid: "目标：快速看见过去成本不可追回。",
  scenario: "目标：在真实选择里比较未来收益和新增成本。",
  mapping: "目标：把故事元素映射到沉没成本、机会成本和边际收益。",
};

export function NarrativeBranch({
  config,
  onComplete,
}: {
  config: NarrativeBranchConfig;
  onComplete?: (result: InteractionEvent) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const branch = selected === null ? null : config.branches[selected];
  const depth = config.depth || DEFAULT_LEARNING_DEPTH;

  return (
    <section className="grid h-full min-h-[520px] grid-rows-[auto_1fr_auto] gap-5 p-5">
      <header className="border-b border-[var(--line)] pb-4">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
          <GitBranch size={15} /> narrative branch
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-semibold">{config.title}</h2>
          <span className="rounded-[8px] border border-[rgba(247,201,72,0.4)] bg-[rgba(247,201,72,0.1)] px-2 py-1 text-xs text-[var(--accent-2)]">
            {LEARNING_DEPTH_LABELS[depth]}
          </span>
        </div>
        <p className="mt-2 text-xs text-[var(--accent)]">{depthGoals[depth]}</p>
      </header>

      <div className="grid content-center gap-5">
        <p className="rounded-[8px] border border-[var(--line)] bg-[#07120f] p-4 text-sm leading-6 text-[var(--muted)]">
          {config.opening}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {config.branches.map((item, index) => (
            <button
              key={item.choice_label}
              onClick={() => {
                setSelected(index);
                onComplete?.({
                  type: "narrative_branch_selected",
                  payload: { choice: item.choice_label, insight: item.insight },
                });
              }}
              className="min-h-28 rounded-[8px] border border-[var(--line)] bg-[#07120f] p-4 text-left text-sm transition hover:border-[var(--accent)]"
            >
              {item.choice_label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 rounded-[8px] border border-[var(--line)] bg-[#07120f] p-4 text-sm leading-6">
        {branch ? (
          <>
            <p className="text-[var(--muted)]">{branch.outcome_description}</p>
            <strong className="text-[var(--accent)]">{branch.insight}</strong>
          </>
        ) : (
          <p className="text-[var(--muted)]">{depthGoals[depth]}</p>
        )}
      </div>
    </section>
  );
}

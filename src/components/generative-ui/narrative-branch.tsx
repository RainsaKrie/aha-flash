"use client";

import { GitBranch } from "lucide-react";
import { useState } from "react";
import type { InteractionEvent, NarrativeBranchConfig } from "@/types/schema";

export function NarrativeBranch({
  config,
  onComplete,
}: {
  config: NarrativeBranchConfig;
  onComplete?: (result: InteractionEvent) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const branch = selected === null ? null : config.branches[selected];

  return (
    <section className="grid h-full min-h-[520px] grid-rows-[auto_1fr_auto] gap-5 p-5">
      <header className="border-b border-[var(--line)] pb-4">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
          <GitBranch size={15} /> narrative branch
        </p>
        <h2 className="mt-1 text-2xl font-semibold">{config.title}</h2>
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
          <p className="text-[var(--muted)]">选择一个分支，看看这个决定把故事推向哪里。</p>
        )}
      </div>
    </section>
  );
}

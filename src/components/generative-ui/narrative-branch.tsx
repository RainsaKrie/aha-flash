"use client";

import { GitBranch } from "lucide-react";
import { useState } from "react";
import { ChoiceButton, ComponentFrame, EmptyState, FeedbackPanel, Panel } from "./shared";
import { DEFAULT_LEARNING_DEPTH } from "@/types/schema";
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
  const branches = config.branches || [];

  return (
    <ComponentFrame
      icon={GitBranch}
      label="narrative branch"
      title={config.title}
      depth={depth}
      description={depthGoals[depth]}
      footer={
        <FeedbackPanel tone={branch ? "success" : "neutral"}>
          {branch ? (
            <div className="ui-result">
              <p className="text-[var(--muted)]">{branch.outcome_description}</p>
              <strong className="mt-2 block text-[var(--accent)]">{branch.insight}</strong>
            </div>
          ) : (
            depthGoals[depth]
          )}
        </FeedbackPanel>
      }
    >
      <div className="grid content-center gap-6">
        <Panel className="p-5 text-sm leading-relaxed text-[var(--muted)]">
          {config.opening}
        </Panel>
        <div className="grid gap-4 sm:grid-cols-3">
          {branches.length ? (
            branches.map((item, index) => (
            <ChoiceButton
              key={item.choice_label}
              active={selected === index}
              onClick={() => {
                setSelected(index);
                onComplete?.({
                  type: "narrative_branch_selected",
                  payload: { choice: item.choice_label, insight: item.insight },
                });
              }}
              className="min-h-28"
            >
              {item.choice_label}
            </ChoiceButton>
            ))
          ) : (
            <EmptyState detail="模型没有给出分支选项，重新生成后应包含 3 个有不同后果的选择。" />
          )}
        </div>
      </div>
    </ComponentFrame>
  );
}

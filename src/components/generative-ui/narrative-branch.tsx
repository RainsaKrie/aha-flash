"use client";

import { CheckCircle2, GitBranch } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChoiceButton, ComponentFrame, EmptyState, FeedbackPanel, Panel } from "./shared";
import { DEFAULT_LEARNING_DEPTH } from "@/types/schema";
import type { InteractionEvent, LearningDepth, NarrativeBranchConfig } from "@/types/schema";

const depthGoals: Record<LearningDepth, string> = {
  rapid: "目标：先做一个选择，看它会带来什么后果。",
  scenario: "目标：在真实情境里比较不同选择的收益、风险和代价。",
  mapping: "目标：把故事里的选择、后果和关键概念对应起来。",
};

export function NarrativeBranch({
  config,
  onComplete,
}: {
  config: NarrativeBranchConfig;
  onComplete?: (result: InteractionEvent) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const branch = selected === null ? null : config.branches[selected];
  const depth = config.depth || DEFAULT_LEARNING_DEPTH;
  const branches = config.branches || [];

  function choose(index: number) {
    if (!branches[index] || acknowledged) return;
    setSelected(index);
    setAcknowledged(false);
  }

  function continueAfterFeedback() {
    if (!branch || acknowledged) return;
    setAcknowledged(true);
    onComplete?.({
      type: "narrative_branch_acknowledged",
      payload: { choice: branch.choice_label, insight: branch.insight },
    });
  }

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
            <div className="ui-result grid gap-3">
              <p className="text-[var(--muted)]">{branch.outcome_description}</p>
              <strong className="text-[var(--accent)]">{branch.insight}</strong>
              {!acknowledged && (
                <Button type="button" onClick={continueAfterFeedback}>
                  <CheckCircle2 size={16} /> 看懂了，继续
                </Button>
              )}
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
              disabled={acknowledged}
              onClick={() => choose(index)}
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

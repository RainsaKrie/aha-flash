"use client";

import { Flame } from "lucide-react";
import { useState } from "react";
import { ChoiceButton, ComponentFrame, EmptyState, FeedbackPanel, Panel } from "./shared";
import type { InteractionEvent, QuizBattleConfig } from "@/types/schema";

export function QuizComboChain({
  config,
  onComplete,
}: {
  config: QuizBattleConfig;
  onComplete?: (result: InteractionEvent) => void;
}) {
  const [answered, setAnswered] = useState<Record<number, boolean>>({});
  const [combo, setCombo] = useState(0);
  const [feedback, setFeedback] = useState("连续答对会累积 combo。");
  const options = config.options || [];

  function answer(index: number, correct: boolean, explanation: string) {
    if (answered[index] !== undefined) return;
    const nextCombo = correct ? combo + 1 : 0;
    setCombo(nextCombo);
    setFeedback(explanation);
    setAnswered((value) => ({ ...value, [index]: correct }));
    onComplete?.({ type: "quiz_answered", payload: { correct, answer: config.options[index]?.label, combo: nextCombo } });
  }

  return (
    <ComponentFrame
      icon={Flame}
      label="combo chain"
      title={config.title}
      depth={config.depth}
      footer={<FeedbackPanel tone={combo > 0 ? "success" : "neutral"}>{combo > 0 ? <div className="ui-result">{feedback}</div> : feedback}</FeedbackPanel>}
    >
      <div className="grid content-center gap-6">
        <Panel className="p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">combo</div>
          <div key={combo} className="animate-value-pop mt-2 text-3xl font-bold text-[var(--accent)]">{combo}</div>
        </Panel>
        <h3 className="text-base font-medium leading-relaxed">{config.question}</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {options.length ? (
            options.map((option, index) => (
            <ChoiceButton
              key={option.label}
              disabled={answered[index] !== undefined}
              onClick={() => answer(index, option.correct, option.explanation)}
              correct={answered[index]}
            >
              {option.label}
            </ChoiceButton>
            ))
          ) : (
            <EmptyState detail="模型没有给出连答选项，重新生成后应包含至少一个正确选项。" />
          )}
        </div>
      </div>
    </ComponentFrame>
  );
}

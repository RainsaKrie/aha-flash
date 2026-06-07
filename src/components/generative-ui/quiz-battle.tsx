"use client";

import { Swords } from "lucide-react";
import { useState } from "react";
import { ChoiceButton, ComponentFrame, EmptyState, FeedbackPanel } from "./shared";
import type { InteractionEvent, QuizBattleConfig } from "@/types/schema";

export function QuizBattle({
  config,
  onComplete,
}: {
  config: QuizBattleConfig;
  onComplete?: (result: InteractionEvent) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const current = selected === null ? null : config.options[selected];
  const options = config.options || [];

  return (
    <ComponentFrame
      icon={Swords}
      label="quiz battle"
      title={config.title}
      depth={config.depth}
      footer={
        <FeedbackPanel tone={current ? (current.correct ? "success" : "danger") : "neutral"}>
          {current ? current.explanation : "选择一个答案，系统会即时反馈。"}
        </FeedbackPanel>
      }
    >
      <div className="grid content-center gap-5">
        <h3 className="text-xl font-semibold">{config.question}</h3>
        <div className="grid gap-3">
          {options.length ? (
            options.map((option, index) => (
            <ChoiceButton
              key={option.label}
              active={selected === index}
              correct={selected === null ? undefined : option.correct}
              onClick={() => {
                setSelected(index);
                onComplete?.({
                  type: "quiz_answered",
                  payload: { correct: option.correct, answer: option.label },
                });
              }}
            >
              {option.label}
            </ChoiceButton>
            ))
          ) : (
            <EmptyState detail="模型没有给出题目选项，重新生成后应包含至少一个正确选项。" />
          )}
        </div>
      </div>
    </ComponentFrame>
  );
}

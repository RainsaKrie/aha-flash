"use client";

import { CheckCircle2, Swords } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChoiceButton, ComponentFrame, EmptyState, FeedbackPanel } from "./shared";
import type { InteractionEvent, QuizBattleConfig } from "@/types/schema";

export function QuizBattle({
  config,
  onInteraction,
  onComplete,
}: {
  config: QuizBattleConfig;
  onInteraction?: (event: InteractionEvent) => void;
  onComplete?: (result: InteractionEvent) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const current = selected === null ? null : config.options[selected];
  const options = config.options || [];

  function choose(index: number) {
    if (selected !== null) return;
    const option = options[index];
    if (!option) return;
    setSelected(index);
    onInteraction?.({
      type: "quiz_answered",
      payload: { correct: option.correct, answer: option.label },
    });
  }

  function continueAfterFeedback() {
    if (!current || acknowledged) return;
    setAcknowledged(true);
    onComplete?.({
      type: "quiz_feedback_acknowledged",
      payload: { correct: current.correct, answer: current.label },
    });
  }

  return (
    <ComponentFrame
      icon={Swords}
      label="quiz battle"
      title={config.title}
      depth={config.depth}
      footer={
        <FeedbackPanel tone={current ? (current.correct ? "success" : "danger") : "neutral"}>
          {current ? (
            <div className="ui-result grid gap-3">
              <strong>{current.correct ? "答对了，你抓住了关键判断。" : "差一点，关键在这里。"}</strong>
              <span>{current.explanation}</span>
              {!acknowledged && (
                <Button type="button" onClick={continueAfterFeedback}>
                  <CheckCircle2 size={16} /> {current.correct ? "我明白了，继续" : "看懂原因，继续"}
                </Button>
              )}
            </div>
          ) : (
            "选择一个答案后，会先展示对错和解释。"
          )}
        </FeedbackPanel>
      }
    >
      <div className="grid content-center gap-6">
        <h3 className="text-base font-medium leading-relaxed">{config.question}</h3>
        <div className="grid gap-4">
          {options.length ? (
            options.map((option, index) => (
              <ChoiceButton
                key={option.label}
                disabled={selected !== null}
                active={selected === index}
                correct={selected === index ? option.correct : undefined}
                className={selected !== null && selected !== index && option.correct ? "border-[rgba(34,197,94,0.4)] bg-transparent text-[var(--text)]" : ""}
                onClick={() => choose(index)}
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
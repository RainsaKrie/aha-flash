"use client";

import { Flame } from "lucide-react";
import { useState } from "react";
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

  function answer(index: number, correct: boolean, explanation: string) {
    const nextCombo = correct ? combo + 1 : 0;
    setCombo(nextCombo);
    setFeedback(explanation);
    setAnswered((value) => ({ ...value, [index]: correct }));
    onComplete?.({ type: "quiz_answered", payload: { correct, answer: config.options[index]?.label, combo: nextCombo } });
  }

  return (
    <section className="grid h-full min-h-[520px] grid-rows-[auto_1fr_auto] gap-5 p-5">
      <header className="border-b border-[var(--line)] pb-4">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
          <Flame size={15} /> combo chain
        </p>
        <h2 className="mt-1 text-2xl font-semibold">{config.title}</h2>
      </header>
      <div className="grid content-center gap-5">
        <div className="rounded-[8px] border border-[var(--line)] bg-[#07120f] p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">combo</div>
          <div className="mt-2 text-5xl font-semibold text-[var(--accent)]">{combo}</div>
        </div>
        <h3 className="text-xl font-semibold">{config.question}</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {config.options.map((option, index) => (
            <button
              key={option.label}
              onClick={() => answer(index, option.correct, option.explanation)}
              className={`rounded-[8px] border p-4 text-left text-sm transition hover:border-[var(--accent)] ${
                answered[index] === true
                  ? "border-[var(--accent)] bg-[rgba(53,230,155,0.12)]"
                  : "border-[var(--line)] bg-[#07120f]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <p className="rounded-[8px] border border-[var(--line)] bg-[#07120f] p-4 text-sm text-[var(--muted)]">
        {feedback}
      </p>
    </section>
  );
}

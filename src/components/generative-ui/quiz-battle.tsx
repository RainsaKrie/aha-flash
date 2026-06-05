"use client";

import { Swords } from "lucide-react";
import { useState } from "react";
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

  return (
    <section className="grid h-full min-h-[520px] grid-rows-[auto_1fr_auto] gap-5 p-5">
      <header className="border-b border-[var(--line)] pb-4">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
          <Swords size={15} /> quiz battle
        </p>
        <h2 className="mt-1 text-2xl font-semibold">{config.title}</h2>
      </header>
      <div className="grid content-center gap-5">
        <h3 className="text-xl font-semibold">{config.question}</h3>
        <div className="grid gap-3">
          {config.options.map((option, index) => (
            <button
              key={option.label}
              onClick={() => {
                setSelected(index);
                onComplete?.({
                  type: "quiz_answered",
                  payload: { correct: option.correct, answer: option.label },
                });
              }}
              className="rounded-[8px] border border-[var(--line)] bg-[#07120f] p-4 text-left transition hover:border-[var(--accent)]"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-[8px] border border-[var(--line)] bg-[#07120f] p-4 text-sm text-[var(--muted)]">
        {current ? (
          <span className={current.correct ? "text-[var(--accent)]" : "text-[var(--danger)]"}>{current.explanation}</span>
        ) : (
          "选择一个答案，系统会即时反馈。"
        )}
      </div>
    </section>
  );
}

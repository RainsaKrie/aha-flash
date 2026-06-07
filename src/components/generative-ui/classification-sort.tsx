"use client";

import { Tags } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ClassificationSortConfig, InteractionEvent } from "@/types/schema";

export function ClassificationSort({
  config,
  onInteraction,
  onComplete,
}: {
  config: ClassificationSortConfig;
  onInteraction?: (event: InteractionEvent) => void;
  onComplete?: (result: InteractionEvent) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [lastAnswer, setLastAnswer] = useState<{
    item: string;
    category: string;
    correct: boolean;
    explanation: string;
  } | null>(null);
  const completedRef = useRef(false);
  const answeredCount = Object.keys(answers).length;
  const currentItem = config.items.find((item) => !answers[item.label]) || config.items[0];
  const score = config.items.filter((item) => answers[item.label] === item.correct_category).length;

  useEffect(() => {
    if (completedRef.current || answeredCount < config.items.length) return;
    completedRef.current = true;
    onComplete?.({
      type: "classification_sort_completed",
      payload: { score, total: config.items.length },
    });
  }, [answeredCount, config.items.length, onComplete, score]);

  function chooseCategory(categoryId: string) {
    if (!currentItem) return;
    const correct = currentItem.correct_category === categoryId;
    setAnswers((value) => ({ ...value, [currentItem.label]: categoryId }));
    setLastAnswer({
      item: currentItem.label,
      category: categoryId,
      correct,
      explanation: currentItem.explanation,
    });
    onInteraction?.({
      type: "classification_item_sorted",
      payload: { item: currentItem.label, category: categoryId, correct },
    });
  }

  return (
    <section className="grid h-full min-h-[520px] grid-rows-[auto_1fr_auto] gap-5 p-5">
      <header className="border-b border-[var(--line)] pb-4">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
          <Tags size={15} /> classification sort
        </p>
        <h2 className="mt-1 text-2xl font-semibold">{config.title}</h2>
      </header>

      <div className="grid content-center gap-5">
        <div className="rounded-[8px] border border-[var(--line)] bg-[#07120f] p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            {Math.min(answeredCount + 1, config.items.length)} / {config.items.length}
          </div>
          <h3 className="mt-2 text-xl font-semibold">{currentItem.label}</h3>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            {answeredCount >= config.items.length ? "全部分类完成，可以看下方回顾。" : "把它放进最贴切的分类桶。"}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {config.categories.map((category) => (
            <button
              key={category.id}
              onClick={() => chooseCategory(category.id)}
              className="rounded-[8px] border border-[var(--line)] bg-[#07120f] p-4 text-left text-sm transition hover:border-[var(--accent)]"
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2 rounded-[8px] border border-[var(--line)] bg-[#07120f] p-4 text-sm text-[var(--muted)]">
        {lastAnswer && (
          <div
            className={[
              "rounded-[8px] border p-3",
              lastAnswer.correct
                ? "border-[rgba(53,230,155,0.42)] bg-[rgba(53,230,155,0.1)] text-[var(--accent)]"
                : "border-[rgba(255,107,107,0.42)] bg-[rgba(255,107,107,0.08)] text-[var(--danger)]",
            ].join(" ")}
          >
            <strong>{lastAnswer.correct ? "分类正确" : "分类偏了"}</strong>
            <span className="mt-1 block text-[var(--muted)]">{lastAnswer.explanation}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <span>当前正确数</span>
          <strong className="text-[var(--accent)]">
            {score} / {config.items.length}
          </strong>
        </div>
        <div className="h-2 overflow-hidden rounded-[8px] bg-[#0f1f1a]">
          <div
            className="h-full bg-[var(--accent)] transition-all"
            style={{ width: `${(answeredCount / config.items.length) * 100}%` }}
          />
        </div>
        {answeredCount > 0 && (
          <div className="mt-2 grid gap-2">
            {config.items
              .filter((item) => answers[item.label])
              .map((item) => {
                const selectedCategory = config.categories.find((category) => category.id === answers[item.label]);
                const correct = answers[item.label] === item.correct_category;
                return (
                  <div key={item.label} className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate">{item.label}</span>
                    <span className={correct ? "text-[var(--accent)]" : "text-[var(--danger)]"}>
                      {selectedCategory?.name || answers[item.label]}
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </section>
  );
}

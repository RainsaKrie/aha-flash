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
            {answers[currentItem.label] ? currentItem.explanation : "把它放进最贴切的分类桶。"}
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
      </div>
    </section>
  );
}

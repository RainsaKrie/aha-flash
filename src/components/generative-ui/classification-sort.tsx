"use client";

import { Tags } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ChoiceButton, ComponentFrame, EmptyState, FeedbackPanel, Panel, ProgressMeter } from "./shared";
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
  const items = config.items || [];
  const categories = config.categories || [];
  const answeredCount = Object.keys(answers).length;
  const allAnswered = items.length > 0 && answeredCount >= items.length;
  const currentItem = allAnswered ? null : items.find((item) => !answers[item.label]) || null;
  const score = items.filter((item) => answers[item.label] === item.correct_category).length;

  useEffect(() => {
    if (completedRef.current || answeredCount < items.length || items.length === 0) return;
    completedRef.current = true;
    onComplete?.({
      type: "classification_sort_completed",
      payload: { score, total: items.length },
    });
  }, [answeredCount, items.length, onComplete, score]);

  function chooseCategory(categoryId: string) {
    if (!currentItem || allAnswered) return;
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
    <ComponentFrame
      icon={Tags}
      label="classification sort"
      title={config.title}
      depth={config.depth}
      footer={
        <FeedbackPanel tone={answeredCount >= items.length && items.length > 0 ? "success" : "neutral"}>
          <ProgressMeter value={answeredCount} total={items.length} />
          <div className="mt-4 flex items-center justify-between gap-4">
            <span>当前正确数</span>
            <strong className="animate-value-pop text-[var(--accent)]">
              {score} / {items.length || 1}
            </strong>
          </div>
          {lastAnswer && (
            <div
              className={[
                "ui-result mt-4 rounded-lg border p-3",
                lastAnswer.correct
                  ? "animate-success-flash border-[rgba(53,230,155,0.42)] bg-[rgba(53,230,155,0.1)] text-[var(--accent)]"
                  : "animate-error-shake border-[rgba(255,107,107,0.42)] bg-[rgba(255,107,107,0.08)] text-[var(--danger)]",
              ].join(" ")}
            >
              <strong>{lastAnswer.correct ? "分类正确" : "分类偏了"}</strong>
              <span className="mt-1 block text-[var(--muted)]">{lastAnswer.explanation}</span>
            </div>
          )}
          {answeredCount > 0 && (
            <div className="mt-4 grid gap-2">
              {items
                .filter((item) => answers[item.label])
                .map((item) => {
                  const selectedCategory = categories.find((category) => category.id === answers[item.label]);
                  const correct = answers[item.label] === item.correct_category;
                  return (
                    <div key={item.label} className="flex items-center justify-between gap-4 text-xs">
                      <span className="truncate">{item.label}</span>
                      <span className={correct ? "text-[var(--accent)]" : "text-[var(--danger)]"}>
                        {selectedCategory?.name || answers[item.label]}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </FeedbackPanel>
      }
    >
      <div className="grid content-center gap-6">
        {currentItem ? (
          <Panel className="p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            {Math.min(answeredCount + 1, items.length)} / {items.length}
          </div>
          <h3 className="mt-2 text-base font-medium leading-7">{currentItem.label}</h3>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            {answeredCount >= items.length ? "全部分类完成，可以看下方回顾。" : "把它放进最贴切的分类桶。"}
          </p>
          </Panel>
        ) : allAnswered ? (
          <Panel className="p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">completed</div>
            <h3 className="mt-2 text-base font-medium leading-7">分类完成</h3>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">答案已锁定，可以查看下方回顾。</p>
          </Panel>
        ) : (
          <EmptyState detail="模型没有给出待分类条目，重新生成后应包含 4-8 个项目。" />
        )}

        {categories.length ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {categories.map((category) => (
              <ChoiceButton
                key={category.id}
                disabled={allAnswered || !currentItem}
                onClick={() => chooseCategory(category.id)}
              >
                {category.name}
              </ChoiceButton>
            ))}
          </div>
        ) : (
          <EmptyState detail="模型没有给出分类桶，重新生成后应包含 3-4 个分类。" />
        )}
      </div>
    </ComponentFrame>
  );
}

"use client";

import { Tags } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ChoiceButton, ComponentFrame, EmptyState, FeedbackPanel, Panel, ProgressMeter } from "./shared";
import type { ClassificationSortConfig, InteractionEvent } from "@/types/schema";

type LastAnswer = {
  item: string;
  correct: boolean;
  explanation: string;
};

function learnerTitle(title: string) {
  return title
    .replace(/拖入|拖到|拖拽|拖动/g, "归入")
    .replace(/类别桶/g, "类别")
    .trim();
}

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
  const [lastAnswer, setLastAnswer] = useState<LastAnswer | null>(null);
  const completedRef = useRef(false);
  const items = config.items || [];
  const categories = config.categories || [];
  const solvedCount = Object.keys(answers).length;
  const allSolved = items.length > 0 && solvedCount === items.length;
  const currentItem = allSolved ? null : items.find((item) => !answers[item.label]) || null;

  useEffect(() => {
    if (completedRef.current || !allSolved) return;
    completedRef.current = true;
    onComplete?.({
      type: "classification_sort_completed",
      payload: { score: solvedCount, total: items.length },
    });
  }, [allSolved, items.length, onComplete, solvedCount]);

  function chooseCategory(categoryId: string) {
    if (!currentItem || allSolved) return;

    const correct = currentItem.correct_category === categoryId;
    setLastAnswer({
      item: currentItem.label,
      correct,
      explanation: currentItem.explanation,
    });
    onInteraction?.({
      type: "classification_item_sorted",
      payload: { item: currentItem.label, category: categoryId, correct },
    });

    // A wrong category is feedback, not progress. The same item stays until it is correctly classified.
    if (!correct) return;
    setAnswers((value) => ({ ...value, [currentItem.label]: categoryId }));
  }

  return (
    <ComponentFrame
      icon={Tags}
      label="classification sort"
      title={learnerTitle(config.title)}
      depth={config.depth}
      footer={
        <FeedbackPanel tone={allSolved ? "success" : lastAnswer?.correct ? "success" : lastAnswer ? "danger" : "neutral"}>
          <ProgressMeter label="已分对" value={solvedCount} total={items.length} />
          {lastAnswer && (
            <div
              className={[
                "ui-result mt-4 rounded-xl border p-5 text-sm leading-relaxed",
                lastAnswer.correct
                  ? "animate-success-flash border-[rgba(53,230,155,0.42)] bg-[rgba(53,230,155,0.1)] text-[var(--accent)]"
                  : "animate-error-shake border-[rgba(255,107,107,0.42)] bg-[rgba(255,107,107,0.08)] text-[var(--danger)]",
              ].join(" ")}
            >
              <strong>{lastAnswer.correct ? "分对了" : "再想想"}</strong>
              <span className="mt-1 block text-[var(--muted)]">{lastAnswer.explanation}</span>
            </div>
          )}
          {allSolved && <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">每张卡都已经归到合适类别，可以继续下一关。</p>}
        </FeedbackPanel>
      }
    >
      <div className="grid content-center gap-6">
        {currentItem ? (
          <Panel className="p-5">
            <div className="text-xs font-semibold text-[var(--muted)]">第 {solvedCount + 1} 题，共 {items.length} 题</div>
            <h3 className="mt-2 text-base font-medium leading-relaxed">{currentItem.label}</h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">点击下方最贴切的类别卡。答错可以马上重选，这张卡不会算作完成。</p>
          </Panel>
        ) : allSolved ? (
          <Panel className="p-5">
            <div className="text-xs font-semibold text-[var(--muted)]">已完成</div>
            <h3 className="mt-2 text-base font-medium leading-relaxed">你把这些概念分清楚了</h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">现在可以带着这组边界继续往下走。</p>
          </Panel>
        ) : (
          <EmptyState detail="这组分类卡还没准备好，换个概念再试试。" />
        )}

        {categories.length ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {categories.map((category) => (
              <ChoiceButton
                key={category.id}
                disabled={allSolved || !currentItem}
                onClick={() => chooseCategory(category.id)}
              >
                {category.name}
              </ChoiceButton>
            ))}
          </div>
        ) : (
          <EmptyState detail="这组类别还没准备好，换个概念再试试。" />
        )}
      </div>
    </ComponentFrame>
  );
}
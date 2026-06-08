"use client";

const options = ["游戏机制", "体育竞技", "音乐节奏", "烹饪配方", "系统模块"];

export function StyleQuiz({
  selected,
  onSelect,
}: {
  selected?: string[];
  onSelect?: (value: string) => void;
}) {
  const values = selected || ["游戏机制"];

  return (
    <div className="grid gap-3">
      <div className="text-sm text-[var(--text-secondary)]">隐喻风格</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {options.map((option) => {
          const active = values.includes(option);
          return (
            <button
              key={option}
              onClick={() => onSelect?.(option)}
              className={[
                "min-h-10 rounded-[8px] border px-3 py-2 text-sm transition",
                active
                  ? "border-[var(--accent)] bg-[rgba(53,230,155,0.14)]"
                  : "border-[var(--border-subtle)] bg-[#07120f] hover:border-[var(--accent)]",
              ].join(" ")}
              type="button"
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

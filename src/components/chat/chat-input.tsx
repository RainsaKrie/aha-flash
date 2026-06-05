"use client";

import { Activity, Boxes, Columns2, Gauge, GitBranch, History, SendHorizontal, Swords, Tags, Ticket } from "lucide-react";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ChatInput({
  onSubmit,
  disabled,
}: {
  onSubmit: (value: string) => Promise<void>;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("期权是什么？用我能听懂的方式讲。");
  const examples = [
    { label: "期权", icon: Ticket, prompt: "期权是什么？用我能听懂的方式讲。" },
    { label: "复杂度", icon: Gauge, prompt: "算法复杂度是什么？用滑块让我感受一下。" },
    { label: "时间线", icon: History, prompt: "人工智能的发展历史，用时间线讲。" },
    { label: "对比", icon: Columns2, prompt: "股票和期权有什么区别？做一个对比。" },
    { label: "测验", icon: Swords, prompt: "给我一个期权理解小测验。" },
    { label: "架构", icon: Boxes, prompt: "把趣灵的系统架构做成模块沙盒。" },
    { label: "分支", icon: GitBranch, prompt: "沉没成本是什么意思？用一个分支故事讲。" },
    { label: "分类", icon: Tags, prompt: "价值投资和成长投资怎么分？让我做分类。" },
    { label: "复利", icon: Activity, prompt: "复利怎么滚起来的？做一个模拟推演。" },
  ];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    setValue("");
    await onSubmit(trimmed);
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <div className="grid grid-cols-3 gap-2">
        {examples.map((example) => {
          const Icon = example.icon;
          return (
            <button
              key={example.label}
              type="button"
              className="tool-button min-h-9 px-2 text-xs"
              onClick={() => setValue(example.prompt)}
              disabled={disabled}
              title={example.prompt}
            >
              <Icon size={14} />
              {example.label}
            </button>
          );
        })}
      </div>
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="输入你想理解的概念，也可以粘贴网页或 YouTube 链接"
        disabled={disabled}
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-[var(--muted)]">支持概念、长文链接、YouTube 链接</span>
        <Button type="submit" disabled={disabled} title="发送">
          <SendHorizontal size={16} />
          生成
        </Button>
      </div>
    </form>
  );
}

"use client";

import { SendHorizontal } from "lucide-react";
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    setValue("");
    await onSubmit(trimmed);
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="输入你想理解的概念，用你的方式讲给你听"
        disabled={disabled}
        className="min-h-16 resize-none"
      />
      <Button type="submit" disabled={disabled} title="发送" className="min-h-16 px-5">
        <SendHorizontal size={16} />
        生成
      </Button>
    </form>
  );
}

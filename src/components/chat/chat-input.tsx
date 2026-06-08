"use client";

import { Loader2, SendHorizontal } from "lucide-react";
import { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ChatInput({
  onSubmit,
  disabled,
  value,
  onValueChange,
}: {
  onSubmit: (value: string) => Promise<void>;
  disabled?: boolean;
  value: string;
  onValueChange: (value: string) => void;
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    onValueChange("");
    await onSubmit(trimmed);
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
      <Textarea
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder="输入你想理解的概念，用你的方式讲给你听"
        disabled={disabled}
        className="min-h-16 resize-none"
      />
      <Button type="submit" disabled={disabled} title="发送" className="min-h-16 px-5">
        {disabled ? (
          <>
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            生成中
          </>
        ) : (
          <>
            <SendHorizontal size={16} />
            生成
          </>
        )}
      </Button>
    </form>
  );
}

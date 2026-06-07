import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full resize-none rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-3 text-[15px] leading-6 text-[var(--text)] outline-none transition focus:border-[var(--accent)]",
        className,
      )}
      {...props}
    />
  );
}

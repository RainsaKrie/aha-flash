import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-10 w-full rounded-[8px] border border-[var(--line)] bg-[#07120f] px-3 text-[15px] text-[var(--text)] outline-none transition focus:border-[var(--accent)]",
        className,
      )}
      {...props}
    />
  );
}

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn("tool-button px-4", className)} {...props} />;
}

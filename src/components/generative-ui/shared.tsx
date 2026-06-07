"use client";

import type { LucideIcon } from "lucide-react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DEFAULT_LEARNING_DEPTH, LEARNING_DEPTH_LABELS, type LearningDepth } from "@/types/schema";

export function ComponentFrame({
  icon: Icon,
  label,
  title,
  depth,
  description,
  aside,
  children,
  footer,
  minHeight = "min-h-[520px]",
}: {
  icon: LucideIcon;
  label: string;
  title: string;
  depth?: LearningDepth;
  description?: string;
  aside?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  minHeight?: string;
}) {
  const activeDepth = depth || DEFAULT_LEARNING_DEPTH;

  return (
    <section className={`grid h-full ${minHeight} grid-rows-[auto_1fr_auto] gap-5 p-5`}>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] pb-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--accent)]">
            <Icon size={15} />
            {label}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-balance text-2xl font-semibold leading-tight">{title}</h2>
            <DepthBadge depth={activeDepth} />
          </div>
          {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">{description}</p>}
        </div>
        {aside}
      </header>
      {children}
      {footer && <footer>{footer}</footer>}
    </section>
  );
}

export function DepthBadge({ depth }: { depth: LearningDepth }) {
  return (
    <span className="rounded-[8px] border border-[rgba(247,201,72,0.42)] bg-[rgba(247,201,72,0.1)] px-2 py-1 text-xs text-[var(--accent-2)]">
      {LEARNING_DEPTH_LABELS[depth]}
    </span>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[8px] border border-[var(--line)] bg-[#07120f] ${className}`}>{children}</div>;
}

export function FeedbackPanel({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "danger" | "warning";
  children: ReactNode;
}) {
  const toneClass =
    tone === "success"
      ? "border-[rgba(53,230,155,0.42)] bg-[rgba(53,230,155,0.1)] text-[var(--accent)]"
      : tone === "danger"
        ? "border-[rgba(255,107,107,0.42)] bg-[rgba(255,107,107,0.08)] text-[var(--danger)]"
        : tone === "warning"
          ? "border-[rgba(247,201,72,0.36)] bg-[rgba(247,201,72,0.08)] text-[var(--accent-2)]"
          : "border-[var(--line)] bg-[#07120f] text-[var(--muted)]";

  return <div className={`rounded-[8px] border p-4 text-sm leading-6 ${toneClass}`}>{children}</div>;
}

export function ProgressMeter({ value, total }: { value: number; total: number }) {
  const safeTotal = Math.max(total, 1);
  const ratio = Math.min(Math.max(value / safeTotal, 0), 1);

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3 text-xs text-[var(--muted)]">
        <span>进度</span>
        <strong className="text-[var(--accent)]">
          {value} / {safeTotal}
        </strong>
      </div>
      <div className="h-2 overflow-hidden rounded-[8px] bg-[#0f1f1a]">
        <div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}

export function ChoiceButton({
  active,
  correct,
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  correct?: boolean;
}) {
  const stateClass =
    correct === true
      ? "border-[var(--accent)] bg-[rgba(53,230,155,0.12)] text-[var(--text)]"
      : correct === false
        ? "border-[var(--danger)] bg-[rgba(255,107,107,0.08)] text-[var(--text)]"
        : active
          ? "border-[var(--accent)] bg-[rgba(53,230,155,0.14)] text-[var(--text)]"
          : "border-[var(--line)] bg-[#07120f] text-[var(--text)]";

  return (
    <button
      type="button"
      className={`min-h-11 rounded-[8px] border p-4 text-left text-sm leading-6 transition hover:border-[var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${stateClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function EmptyState({ title = "还没有可渲染内容", detail }: { title?: string; detail?: string }) {
  return (
    <Panel className="grid min-h-64 place-items-center p-6 text-center">
      <div>
        <AlertTriangle className="mx-auto text-[var(--accent-2)]" size={22} />
        <h3 className="mt-3 text-base font-semibold">{title}</h3>
        {detail && <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">{detail}</p>}
      </div>
    </Panel>
  );
}

export class GenerativeUIErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <section className="grid h-full min-h-[520px] place-items-center p-5">
          <FeedbackPanel tone="danger">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>这个互动组件渲染失败了，可以重试生成。</span>
              <Button type="button" onClick={() => this.setState({ failed: false })} title="重试">
                <RotateCcw size={16} />
                重试
              </Button>
            </div>
          </FeedbackPanel>
        </section>
      );
    }

    return this.props.children;
  }
}

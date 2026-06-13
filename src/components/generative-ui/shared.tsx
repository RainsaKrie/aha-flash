"use client";

import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DEFAULT_LEARNING_DEPTH, LEARNING_DEPTH_LABELS, type LearningDepth, type PatternType } from "@/types/schema";

export const patternColors: Record<PatternType, string> = {
  probability: "var(--pattern-probability)",
  parameter_explore: "var(--pattern-parameter)",
  concept_memory: "var(--pattern-memory)",
  process_timeline: "var(--pattern-timeline)",
  comparison: "var(--pattern-comparison)",
  knowledge_check: "var(--pattern-check)",
  system_builder: "var(--pattern-system)",
  narrative_branch: "var(--pattern-branch)",
  classification_sort: "var(--pattern-classification)",
  simulation_play: "var(--pattern-simulation)",
};

export function patternStyle(pattern: PatternType): CSSProperties {
  const accent = patternColors[pattern];
  return {
    "--accent": accent,
    "--pattern-accent": accent,
    "--pattern-surface": "var(--surface)",
    "--pattern-panel": "var(--panel)",
    "--pattern-raised": "var(--panel-strong)",
  } as CSSProperties;
}

export function StateTransition({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`ui-enter ${className}`}>{children}</div>;
}

type GeneratedTextChunk = {
  text: string;
  small: boolean;
};

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function tokenizeGeneratedText(value: string): GeneratedTextChunk[] {
  const smallOpen = "__AHA_SMALL_OPEN__";
  const smallClose = "__AHA_SMALL_CLOSE__";
  const normalized = decodeHtmlEntities(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n")
    .replace(/<\/?p>/gi, "")
    .replace(/<small>/gi, smallOpen)
    .replace(/<\/small>/gi, smallClose)
    .replace(/<[^>]+>/g, "")
    .trim();

  return normalized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      if (!line.includes(smallOpen)) return [{ text: line, small: false }];

      return line
        .split(smallOpen)
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          if (part.includes(smallClose)) {
            return { text: part.replace(smallClose, "").trim(), small: true };
          }
          return { text: part, small: false };
        })
        .filter((part) => part.text);
    });
}

export function normalizeGeneratedText(value: string) {
  return tokenizeGeneratedText(value)
    .map((chunk) => chunk.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function GeneratedRichText({ value }: { value: string }) {
  const chunks = tokenizeGeneratedText(value);

  return (
    <>
      {chunks.map((chunk, index) => (
        <span
          key={`${chunk.text}-${index}`}
          className={chunk.small ? "mt-1 block text-sm text-[var(--muted)]" : index > 0 ? "mt-2 block" : "block"}
        >
          {chunk.text}
        </span>
      ))}
    </>
  );
}

export function DepthSwitcher({
  depth = DEFAULT_LEARNING_DEPTH,
  onChange,
}: {
  depth?: LearningDepth;
  onChange?: (depth: LearningDepth) => void;
}) {
  const options: LearningDepth[] = ["rapid", "scenario", "mapping"];

  return (
    <div className="depth-switcher" aria-label="学习深度切换">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className="depth-switcher__button transition-all duration-200 hover:scale-[1.02] active:scale-[0.96]"
          aria-pressed={depth === option}
          onClick={() => onChange?.(option)}
        >
          {LEARNING_DEPTH_LABELS[option]}
        </button>
      ))}
    </div>
  );
}

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
    <section className={`grid h-full ${minHeight} grid-rows-[auto_1fr_auto] gap-6 p-5`}>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] pb-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            <Icon size={15} />
            {label}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-balance text-2xl font-semibold leading-tight">{title}</h2>
            <DepthBadge depth={activeDepth} />
          </div>
          {description && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--muted)]">{description}</p>}
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
    <span className="rounded-md border border-[var(--line)] bg-[var(--pattern-raised)] px-2 py-1 text-xs text-[var(--muted)]">
      {LEARNING_DEPTH_LABELS[depth]}
    </span>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-[var(--line)] bg-[var(--pattern-panel)] ${className}`}>{children}</div>;
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
      ? "border-[rgba(34,197,94,0.46)] bg-[rgba(34,197,94,0.12)] text-[#166534] animate-success-flash"
      : tone === "danger"
        ? "border-[rgba(255,107,107,0.42)] bg-[rgba(255,107,107,0.08)] text-[var(--danger)] animate-error-shake"
        : tone === "warning"
          ? "border-[rgba(247,201,72,0.36)] bg-[rgba(247,201,72,0.08)] text-[var(--accent-2)]"
          : "border-[var(--line)] bg-[var(--pattern-panel)] text-[var(--muted)]";

  return <div className={`ui-result rounded-xl border p-5 text-sm leading-relaxed ${toneClass}`}>{children}</div>;
}

export function ProgressMeter({ value, total }: { value: number; total: number }) {
  const safeTotal = Math.max(total, 1);
  const ratio = Math.min(Math.max(value / safeTotal, 0), 1);

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2 text-xs text-[var(--muted)]">
        <span>进度</span>
        <strong key={`${value}-${safeTotal}`} className="animate-value-pop text-3xl font-bold text-[var(--accent)]">
          {value} / {safeTotal}
        </strong>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--panel-strong)]">
        <div className="h-full animate-value-pop rounded-full bg-[var(--accent)] transition-all" style={{ width: `${ratio * 100}%` }} />
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
      ? "border-[rgba(34,197,94,0.62)] bg-[rgba(34,197,94,0.12)] text-[#14532d]"
      : correct === false
        ? "border-[var(--danger)] bg-[rgba(255,107,107,0.08)] text-[var(--text)]"
      : active
          ? "scale-[1.02] border-[var(--accent)] bg-[var(--pattern-raised)] text-[var(--text)]"
          : "border-[var(--line)] bg-[var(--pattern-panel)] text-[var(--text)]";

  return (
    <button
      type="button"
      className={`min-h-11 cursor-pointer rounded-lg border p-5 text-left text-sm leading-relaxed transition-all duration-200 hover:scale-[1.02] hover:border-[var(--pattern-accent)] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${stateClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function EmptyState({ title = "还没有可渲染内容", detail }: { title?: string; detail?: string }) {
  return (
    <Panel className="ui-enter grid min-h-64 place-items-center p-5 text-center">
      <div>
        <AlertTriangle className="mx-auto text-[var(--accent-2)]" size={22} />
        <h3 className="mt-3 text-base font-medium">{title}</h3>
        {detail && <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]">{detail}</p>}
      </div>
    </Panel>
  );
}

export function InlineSpinner({ label = "处理中" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Loader2 size={15} className="animate-spin" aria-hidden="true" />
      {label}
    </span>
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
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span>这个互动组件渲染失败了，可以重试生成。</span>
              <Button
                type="button"
                onClick={() => this.setState({ failed: false })}
                title="重试"
                className="transition-all duration-200 hover:scale-[1.02] active:scale-[0.96]"
              >
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

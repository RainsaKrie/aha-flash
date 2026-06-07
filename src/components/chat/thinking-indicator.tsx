export function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
      <span className="h-2 w-2 rounded-full bg-[var(--accent)] ui-breathe" />
      <span>正在编译互动组件</span>
    </div>
  );
}

import type { Message } from "@/types/chat";

export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const sources = message.sources || [];

  return (
    <article className={isUser ? "ml-auto max-w-[88%]" : "mr-auto max-w-[92%]"}>
      <div
        className={[
          "rounded-[8px] border px-4 py-3 text-sm leading-6",
          isUser
            ? "border-[rgba(247,201,72,0.35)] bg-[rgba(247,201,72,0.12)]"
            : "border-[var(--line)] bg-[#07120f]",
        ].join(" ")}
      >
        {message.content}
        {sources.length > 0 && (
          <div className="mt-3 grid gap-2 border-t border-[var(--line)] pt-3">
            {sources.map((source) => (
              <div key={source.url} className="text-xs text-[var(--muted)]">
                <span className={source.success ? "text-[var(--accent)]" : "text-[var(--danger)]"}>
                  {source.success ? "已读取" : "读取失败"}
                </span>
                <span> · {source.type === "youtube" ? "YouTube" : "网页"}</span>
                {source.title && <span> · {source.title}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

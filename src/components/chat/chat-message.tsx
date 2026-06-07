import type { Message } from "@/types/chat";

export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";

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
      </div>
    </article>
  );
}

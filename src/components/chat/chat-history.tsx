import type { Message } from "@/types/chat";
import { ChatMessage } from "./chat-message";
import { ThinkingIndicator } from "./thinking-indicator";

export function ChatHistory({
  messages,
  isLoading,
  errorMessage,
}: {
  messages: Message[];
  isLoading: boolean;
  errorMessage?: string | null;
}) {
  return (
    <div className="grid max-h-[42vh] gap-3 overflow-y-auto pr-1">
      {errorMessage && (
        <div className="rounded-[8px] border border-[rgba(255,107,107,0.35)] bg-[rgba(255,107,107,0.1)] p-4 text-sm leading-6 text-[var(--danger)]">
          {errorMessage}
        </div>
      )}
      {messages.length === 0 ? (
        <div className="rounded-[8px] border border-[var(--line)] bg-[#07120f] p-4 text-sm leading-6 text-[var(--muted)]">
          输入一个概念，趣灵会把它变成可交互的小组件。
        </div>
      ) : (
        messages.map((message) => <ChatMessage key={message.id} message={message} />)
      )}
      {isLoading && <ThinkingIndicator />}
    </div>
  );
}

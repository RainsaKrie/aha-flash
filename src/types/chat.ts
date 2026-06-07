import type { UISchema } from "./schema";
import type { ToolCall } from "./tool";

export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  schema?: UISchema;
  tool_calls?: ToolCall[];
  created_at: string;
}

export interface RecentMessage {
  role: Extract<MessageRole, "user" | "assistant">;
  content: string;
  created_at?: string;
}

import type { UISchema } from "./schema";
import type { SourceContext, ToolCall } from "./tool";

export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  schema?: UISchema;
  tool_calls?: ToolCall[];
  sources?: SourceContext[];
  created_at: string;
}

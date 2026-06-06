export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: string;
}

export interface ToolDefinition {
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface SourceContext {
  type: "youtube" | "web" | "search";
  url: string;
  title?: string;
  excerpt?: string;
  text?: string;
  success: boolean;
  error?: string;
}

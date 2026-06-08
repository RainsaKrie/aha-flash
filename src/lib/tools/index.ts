import type { ToolDefinition } from "@/types/tool";
import { updateUserState } from "./update-user-state";

export {
  GENERATIVE_TOOLS,
  buildGenerativeAiTools,
  buildSchemaFromGenerativeToolCall,
  getGenerativeToolNames,
  type GenerativeToolName,
} from "./generative-tools.ts";

export const V1_TOOLS: Record<string, ToolDefinition> = {
  update_user_state: {
    description: "当用户在对话中表达背景、爱好、知识盲区或隐喻偏好时，增量更新 User_State。",
    parameters: {
      type: "object",
      properties: {
        user_id: { type: "string", description: "服务端注入的用户 ID" },
        background: { type: "string", description: "用户明确表达的背景，如会计、学生、工程师" },
        hobbies: { type: "array", items: { type: "string" }, description: "用户明确表达的爱好" },
        knowledge_blindspots: {
          type: "array",
          items: { type: "string" },
          description: "用户明确表达的不懂或薄弱领域",
        },
        metaphor_preferences: {
          type: "array",
          items: { type: "string" },
          description: "用户偏好的讲解隐喻域，如游戏、摄影、钓鱼",
        },
      },
      required: ["user_id"],
    },
    execute: updateUserState,
  },
};

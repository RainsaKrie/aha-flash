import { createDeepSeek } from "@ai-sdk/deepseek";
import { hasModelAccess } from "../public-beta/model-context.ts";

export function getLLMProvider() {
  if (!hasModelAccess()) return null;
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;

  const deepseek = createDeepSeek({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  });

  return deepseek("deepseek-chat");
}

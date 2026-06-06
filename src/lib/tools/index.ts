import type { ToolDefinition } from "@/types/tool";
import { updateUserState } from "./update-user-state";
import { webContentExtract } from "./web-extractor";
import { webSearch } from "./web-search";
import { youtubeTranscriptFetch } from "./youtube-transcript";

export const V1_TOOLS: Record<string, ToolDefinition> = {
  youtube_transcript_fetch: {
    description: "辅助抓取用户明确提供的 YouTube URL 字幕/转录文本；不作为主要输入入口。",
    parameters: {
      type: "object",
      properties: {
        video_url: { type: "string", description: "YouTube 视频 URL" },
        language: { type: "string", description: "字幕语言代码，默认 zh" },
      },
      required: ["video_url"],
    },
    execute: youtubeTranscriptFetch,
  },
  web_content_extract: {
    description: "辅助提取用户明确提供的网页正文内容，用于抓取长文、博客、访谈记录。",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "目标网页 URL" },
        max_chars: { type: "number", description: "最大提取字符数，默认 3000" },
      },
      required: ["url"],
    },
    execute: webContentExtract,
  },
  web_search: {
    description: "搜索互联网页面并返回适合注入 Prompt 的来源摘要。仅保存短摘要和 URL，不保存全文。",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "搜索查询" },
        max_results: { type: "number", description: "最大结果数，默认 5，最多 5" },
        provider: { type: "string", enum: ["auto", "brave", "google", "tavily"], description: "搜索提供商，默认 auto" },
      },
      required: ["query"],
    },
    execute: webSearch,
  },
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

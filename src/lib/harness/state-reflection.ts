import type { LanguageModel } from "ai";
import { retryGenerateText } from "../llm/retry-generate-text.ts";
import type { ConversationRoute } from "./conversation-router";
import type { StateReflectionPatch } from "./state-store";
import type { UISchemaType } from "@/types/schema";
import type { UserProfile, UserState } from "@/types/state";

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function isGenericMetaphorPreference(value: string) {
  return /我能听懂|通俗|简单|方式|方法|一点/.test(value);
}

function parseJsonObject(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Partial<StateReflectionPatch>;
  } catch {
    return null;
  }
}

function normalizeReflection(raw: Partial<StateReflectionPatch> | null, fallback: StateReflectionPatch) {
  if (!raw) return fallback;
  const profile = raw.profile_patch || {};
  const profile_patch: Partial<UserProfile> = {
    background: typeof profile.background === "string" ? profile.background : undefined,
    hobbies: Array.isArray(profile.hobbies) ? unique(profile.hobbies.map(String)) : undefined,
    knowledge_blindspots: Array.isArray(profile.knowledge_blindspots)
      ? unique(profile.knowledge_blindspots.map(String))
      : undefined,
    metaphor_preferences: Array.isArray(profile.metaphor_preferences)
      ? unique(profile.metaphor_preferences.map(String))
      : undefined,
  };

  return {
    profile_patch,
    understanding_level:
      raw.understanding_level === "deep" ||
      raw.understanding_level === "moderate" ||
      raw.understanding_level === "shallow"
        ? raw.understanding_level
        : fallback.understanding_level,
    summary: typeof raw.summary === "string" && raw.summary.trim() ? raw.summary.slice(0, 150) : fallback.summary,
  } satisfies StateReflectionPatch;
}

export function reflectTurnByRules({
  input,
  route,
  schemaType,
}: {
  input: string;
  route: ConversationRoute;
  schemaType: UISchemaType;
}): StateReflectionPatch {
  const profile_patch: Partial<UserProfile> = {};

  const backgroundMatch = input.match(/我是([^，。,.!?！？\s]{2,12})/);
  if (backgroundMatch) profile_patch.background = backgroundMatch[1];

  const hobbyMatches = [...input.matchAll(/(?:喜欢|爱|爱好是)([^，。,.!?！？\s]{2,12})/g)].map((match) => match[1]);
  if (hobbyMatches.length) profile_patch.hobbies = unique(hobbyMatches);

  const metaphorMatches = [...input.matchAll(/用([^，。,.!?！？\s]{2,12})(?:讲|理解|解释)/g)].map(
    (match) => match[1],
  ).filter((value) => !isGenericMetaphorPreference(value));
  if (metaphorMatches.length) profile_patch.metaphor_preferences = unique(metaphorMatches);

  const blindspotMatches = [...input.matchAll(/(?:不懂|不了解|看不懂)([^，。,.!?！？\s]{2,12})/g)].map(
    (match) => match[1],
  );
  if (blindspotMatches.length) profile_patch.knowledge_blindspots = unique(blindspotMatches);

  const understanding_level = input.includes("深入") || input.includes("底层") || input.includes("推导")
    ? "deep"
    : input.includes("对比") || input.includes("测验") || input.includes("原理")
      ? "moderate"
      : "shallow";

  const summary =
    route === "preference"
      ? "用户表达了新的背景或隐喻偏好，已尝试写入状态。"
      : `用户围绕本轮问题生成了 ${schemaType} 互动组件，当前理解深度为 ${understanding_level}。`;

  return { profile_patch, understanding_level, summary };
}

export async function reflectTurn({
  input,
  route,
  schemaType,
  state,
  model,
}: {
  input: string;
  route: ConversationRoute;
  schemaType: UISchemaType;
  state: UserState;
  model?: LanguageModel | null;
}): Promise<StateReflectionPatch> {
  const fallback = reflectTurnByRules({ input, route, schemaType });
  if (!model) return fallback;

  try {
    const result = await retryGenerateText({
      model,
      system: [
        "你是趣灵（aha-flash）的回合状态提炼器。",
        "根据用户本轮输入、路由、组件类型和已有用户状态，提炼可写入 User_State 的 JSON patch。",
        "只输出 JSON，不要 Markdown，不要解释。",
        '格式: {"profile_patch":{"background":"","hobbies":[],"knowledge_blindspots":[],"metaphor_preferences":[]},"understanding_level":"shallow|moderate|deep","summary":"150字以内"}',
        "不要编造用户没表达过的个人信息；数组只包含明确出现或强烈暗示的条目。",
      ].join("\n"),
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            input,
            route,
            schemaType,
            current_profile: state.profile,
            recent_context: state.conversation_compressed,
          }),
        },
      ],
    }, { operation: "state_reflection" });

    return normalizeReflection(parseJsonObject(result.text), fallback);
  } catch {
    return fallback;
  }
}

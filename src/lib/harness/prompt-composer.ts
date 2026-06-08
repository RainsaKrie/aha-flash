import type { UserState } from "@/types/state";
import type { LearningDepth, PatternType } from "@/types/schema";
import type { RecentMessage } from "@/types/chat";
import { getPreferredMetaphorContext } from "@/lib/metaphor/metaphor-engine";
import type { FollowupDetection } from "@/lib/harness/conversation-router";
import {
  METAPHOR_GUIDELINES,
  OUTPUT_FORMAT_RULES,
  SYSTEM_ROLE_PROMPT,
  TOOL_USE_HINT,
  getSchemaReferenceForPattern,
} from "@/lib/llm/prompt-templates";

interface PromptContext {
  recentMessages?: RecentMessage[];
  followup?: FollowupDetection;
  schemaIntent?: {
    pattern?: PatternType;
  } | null;
}

function truncate(value: string, max = 220) {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function buildRecentMessagesContext(messages: RecentMessage[] = []) {
  const lines = messages
    .slice(-6)
    .map((message) => `${message.role}: ${truncate(message.content.replace(/\s+/g, " ").trim())}`)
    .filter((line) => !line.endsWith(": "));

  if (lines.length === 0) return "";

  return `
<recent_messages>
${lines.join("\n")}
</recent_messages>
`.trim();
}

function buildThreadContext(state: UserState, followup?: FollowupDetection) {
  const thread = state.conversation_compressed.current_thread;
  if (!thread && !followup) return "";

  return `
<thread_context>
  <current_concept>${thread?.concept || followup?.concept || ""}</current_concept>
  <thread_depth>${thread?.depth || 0}</thread_depth>
  <last_user_input>${truncate(thread?.last_user_input || "", 160)}</last_user_input>
  <is_followup>${followup?.is_followup ?? false}</is_followup>
  <followup_reason>${followup?.reason || ""}</followup_reason>
  <instruction>${followup?.is_followup ? "延续当前隐喻体系和概念框架，优先回答用户的追问；除非用户明确换题，不要切换到新概念。" : "如果用户开启新概念，建立新的互动线程。"}</instruction>
</thread_context>
`.trim();
}

function buildPromptBase(
  state: UserState,
  targetDepth: LearningDepth = "rapid",
  context: PromptContext = {},
) {
  const metaphor = getPreferredMetaphorContext(state);
  const stateContext = `
<user_state>
  <background>${state.profile.background}</background>
  <hobbies>${state.profile.hobbies.join(", ")}</hobbies>
  <blindspots>${state.profile.knowledge_blindspots.join(", ")}</blindspots>
  <metaphor_preferences>${state.profile.metaphor_preferences.join(", ")}</metaphor_preferences>
  <complexity_tolerance>${state.profile.complexity_tolerance}</complexity_tolerance>
  <recent_topics>${state.conversation_compressed.recent_topics.join(", ")}</recent_topics>
  <key_insights>${state.conversation_compressed.key_insights.join("; ")}</key_insights>
  <thread_summaries>${(state.conversation_compressed.thread_summaries || [])
    .slice(0, 4)
    .map((summary) => `${summary.concept}:${summary.final_understanding}`)
    .join("; ")}</thread_summaries>
  <knowledge_assets>${(state.knowledge_assets || [])
    .slice(0, 6)
    .map((asset) => `${asset.concept}:${asset.pattern}/${asset.template}:${asset.understanding}`)
    .join("; ")}</knowledge_assets>
</user_state>
`.trim();
  const depthContext = `<target_depth>${targetDepth}</target_depth>`;

  return {
    metaphor,
    stateContext,
    recentMessagesContext: buildRecentMessagesContext(context.recentMessages),
    threadContext: buildThreadContext(state, context.followup),
    depthContext,
  };
}

export function buildToolSystemPrompt(
  state: UserState,
  targetDepth: LearningDepth = "rapid",
  context: PromptContext = {},
) {
  const { metaphor, stateContext, recentMessagesContext, threadContext, depthContext } = buildPromptBase(
    state,
    targetDepth,
    context,
  );

  return [
    SYSTEM_ROLE_PROMPT,
    stateContext,
    recentMessagesContext,
    threadContext,
    depthContext,
    metaphor.promptHint,
    METAPHOR_GUIDELINES,
    TOOL_USE_HINT,
  ].join("\n\n");
}

export function buildJsonSystemPrompt(
  state: UserState,
  targetDepth: LearningDepth = "rapid",
  context: PromptContext = {},
) {
  const { metaphor, stateContext, recentMessagesContext, threadContext, depthContext } = buildPromptBase(
    state,
    targetDepth,
    context,
  );
  const schemaReference = getSchemaReferenceForPattern(context.schemaIntent?.pattern);

  return [
    SYSTEM_ROLE_PROMPT,
    stateContext,
    recentMessagesContext,
    threadContext,
    depthContext,
    metaphor.promptHint,
    METAPHOR_GUIDELINES,
    OUTPUT_FORMAT_RULES,
    schemaReference,
  ].join("\n\n");
}

export const buildSystemPrompt = buildJsonSystemPrompt;

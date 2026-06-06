import type { UserState } from "@/types/state";
import type { LearningDepth } from "@/types/schema";
import { getPreferredMetaphorContext } from "@/lib/metaphor/metaphor-engine";
import {
  METAPHOR_GUIDELINES,
  OUTPUT_FORMAT_RULES,
  SCHEMA_REFERENCE,
  SYSTEM_ROLE_PROMPT,
} from "@/lib/llm/prompt-templates";

export function buildSystemPrompt(state: UserState, targetDepth: LearningDepth = "rapid") {
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
  <knowledge_assets>${(state.knowledge_assets || [])
    .slice(0, 6)
    .map((asset) => `${asset.concept}:${asset.pattern}/${asset.template}:${asset.understanding}`)
    .join("; ")}</knowledge_assets>
</user_state>
`.trim();
  const depthContext = `<target_depth>${targetDepth}</target_depth>`;

  return [
    SYSTEM_ROLE_PROMPT,
    stateContext,
    depthContext,
    metaphor.promptHint,
    METAPHOR_GUIDELINES,
    OUTPUT_FORMAT_RULES,
    SCHEMA_REFERENCE,
  ].join("\n\n");
}

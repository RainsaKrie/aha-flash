import type { PatternType, TemplateId } from "./schema";

export interface UserProfile {
  background: string;
  hobbies: string[];
  knowledge_blindspots: string[];
  metaphor_preferences: string[];
  learning_style: "visual" | "interactive" | "textual";
  complexity_tolerance: 1 | 2 | 3 | 4 | 5;
}

export interface CompressedSummary {
  recent_topics: string[];
  key_insights: string[];
  last_session_summary: string;
  total_interactions: number;
  understanding_level?: "shallow" | "moderate" | "deep";
}

export interface UIPreferences {
  theme: "cyberpunk_dark" | "cyberpunk_light";
  interaction_density: "low" | "medium" | "high";
  animation_speed: "slow" | "normal" | "fast";
}

export interface KnowledgeAsset {
  concept: string;
  pattern: PatternType;
  template: TemplateId;
  learned_at: string;
  understanding: "shallow" | "moderate" | "deep";
  topic_area?: string;
}

export interface UserState {
  user_id: string;
  profile: UserProfile;
  conversation_compressed: CompressedSummary;
  knowledge_assets: KnowledgeAsset[];
  ui_preferences: UIPreferences;
  updated_at: string;
}

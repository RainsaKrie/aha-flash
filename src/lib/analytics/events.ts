import { z } from "zod";

export const ANALYTICS_EVENT_NAMES = [
  "page_view",
  "showcase_topic_selected",
  "dynamic_generation_started",
  "dynamic_generation_succeeded",
  "dynamic_generation_failed",
  "dynamic_generation_blocked",
  "rate_limited",
  "budget_exhausted",
  "cache_hit",
  "flow_started",
  "step_interacted",
  "step_completed",
  "flow_completed",
  "next_topic_clicked",
  "second_flow_started",
  "hub_opened",
  "feedback_submitted",
  'flow_exited',
] as const;

const safeId = z.string().min(8).max(96).regex(/^[A-Za-z0-9_-]+$/);

export const analyticsEventSchema = z.object({
  schema_version: z.literal("1"),
  event_name: z.enum(ANALYTICS_EVENT_NAMES),
  event_id: safeId,
  anonymous_user_id: safeId,
  session_id: safeId,
  timestamp: z.string().datetime(),
  route: z.string().min(1).max(120),
  flow_id: z.string().min(1).max(120).optional(),
  flow_source: z.enum(["static", "llm", "cache", "fallback"]).optional(),
  step_index: z.number().int().min(0).max(20).optional(),
  device_category: z.enum(["mobile", "tablet", "desktop"]),
  elapsed_ms: z.number().int().min(0).max(24 * 60 * 60 * 1000).optional(),
  generation_latency_ms: z.number().int().min(0).max(15 * 60 * 1000).optional(),
  error_category: z.string().min(1).max(80).optional(),
}).strict();

export type AnalyticsEvent = z.infer<typeof analyticsEventSchema>;

export const feedbackRequestSchema = z.object({
  rating: z.enum(["understood", "mostly", "confused"]),
  comment: z.string().trim().max(240).optional(),
  flow_id: z.string().min(1).max(120).optional(),
  flow_source: z.enum(["static", "llm", "cache", "fallback"]).optional(),
  device_category: z.enum(["mobile", "tablet", "desktop"]),
}).strict();

export type FeedbackRequest = z.infer<typeof feedbackRequestSchema>;

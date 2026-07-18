"use client";

import type { AnalyticsEvent, FeedbackRequest } from "./events.ts";

const ANONYMOUS_ID_KEY = "aha-flash:analytics-anonymous-id";
const SESSION_ID_KEY = "aha-flash:analytics-session-id";
const FIRST_COMPLETED_FLOW_KEY = "aha-flash:first-completed-flow";
const SECOND_FLOW_EVENT_KEY = "aha-flash:second-flow-event";

type EventName = AnalyticsEvent["event_name"];
type EventDetails = Partial<Pick<
  AnalyticsEvent,
  | "route"
  | "flow_id"
  | "flow_source"
  | "step_index"
  | "elapsed_ms"
  | "generation_latency_ms"
  | "error_category"
>>;

function makeId(prefix: string) {
  return prefix + "_" + crypto.randomUUID().replace(/-/g, "");
}

function safeStorageId(
  storage: Storage,
  key: string,
  prefix: string,
) {
  const existing = storage.getItem(key);
  if (existing && /^[A-Za-z0-9_-]{8,96}$/.test(existing)) return existing;
  const created = makeId(prefix);
  storage.setItem(key, created);
  return created;
}

export function getAnalyticsIdentity() {
  if (typeof window === "undefined") {
    return { anonymousUserId: "server_anonymous", sessionId: "server_session" };
  }
  return {
    anonymousUserId: safeStorageId(window.localStorage, ANONYMOUS_ID_KEY, "anon"),
    sessionId: safeStorageId(window.sessionStorage, SESSION_ID_KEY, "session"),
  };
}

export function getAnalyticsHeaders() {
  const identity = getAnalyticsIdentity();
  return {
    "x-aha-anonymous-id": identity.anonymousUserId,
    "x-aha-session-id": identity.sessionId,
  };
}

function deviceCategory(): AnalyticsEvent["device_category"] {
  if (typeof window === "undefined") return "desktop";
  if (window.innerWidth < 640) return "mobile";
  if (window.innerWidth < 1024) return "tablet";
  return "desktop";
}

export async function trackEvent(eventName: EventName, details: EventDetails = {}) {
  if (typeof window === "undefined") return false;
  const identity = getAnalyticsIdentity();
  const event: AnalyticsEvent = {
    schema_version: "1",
    event_name: eventName,
    event_id: makeId("event"),
    anonymous_user_id: identity.anonymousUserId,
    session_id: identity.sessionId,
    timestamp: new Date().toISOString(),
    route: details.route || window.location.pathname,
    flow_id: details.flow_id,
    flow_source: details.flow_source,
    step_index: details.step_index,
    device_category: deviceCategory(),
    elapsed_ms: details.elapsed_ms,
    generation_latency_ms: details.generation_latency_ms,
    error_category: details.error_category,
  };
  try {
    const response = await fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
      keepalive: true,
    });
    const payload = await response.json().catch(() => null) as { accepted?: boolean } | null;
    return response.ok && payload?.accepted === true;
  } catch {
    return false;
  }
}

export function markFlowCompletedForSession(flowId: string) {
  if (typeof window === "undefined") return;
  if (!window.sessionStorage.getItem(FIRST_COMPLETED_FLOW_KEY)) {
    window.sessionStorage.setItem(FIRST_COMPLETED_FLOW_KEY, flowId);
  }
}

export function shouldTrackSecondFlow(flowId: string) {
  if (typeof window === "undefined") return false;
  const first = window.sessionStorage.getItem(FIRST_COMPLETED_FLOW_KEY);
  if (!first || first === flowId) return false;
  const emitted = window.sessionStorage.getItem(SECOND_FLOW_EVENT_KEY);
  if (emitted) return false;
  window.sessionStorage.setItem(SECOND_FLOW_EVENT_KEY, flowId);
  return true;
}

export async function submitFeedback(
  feedback: Omit<FeedbackRequest, "device_category">,
) {
  try {
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAnalyticsHeaders(),
      },
      body: JSON.stringify({
        ...feedback,
        device_category: deviceCategory(),
      } satisfies FeedbackRequest),
      keepalive: true,
    });
    const payload = await response.json().catch(() => null) as { accepted?: boolean } | null;
    return response.ok && payload?.accepted === true;
  } catch {
    return false;
  }
}

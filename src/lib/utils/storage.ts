import type { KnowledgeFlow } from "@/lib/content/mock-flows";

const USER_ID_KEY = "aha-flash:user-id";
const COMPLETED_FLOWS_KEY = "aha-flash:completed-flows";
const FLOW_DRAFT_PREFIX = "aha-flash:flow-draft:";

export interface CompletedFlowRecord {
  flow_id: string;
  title: string;
  concept: string;
  category: string;
  summary: string;
  concepts: string[];
  completed_play_count: number;
  completed_at: string;
  source?: "curated" | "generated";
}

export interface FlowDraftDebug {
  source?: "llm" | "mock";
  validation_error?: string;
  raw_output?: string;
  raw_plan_output?: string;
  concept_plan?: unknown;
  blueprint?: unknown;
  quality_gate?: unknown;
}

export interface FlowDraftRecord {
  flow: KnowledgeFlow;
  debug?: FlowDraftDebug;
}

export function readUserId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(USER_ID_KEY);
}

export function writeUserId(userId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_ID_KEY, userId);
}

function parseCompletedFlows(value: string | null): CompletedFlowRecord[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is CompletedFlowRecord => {
      return Boolean(
        item &&
          typeof item === "object" &&
          typeof (item as CompletedFlowRecord).flow_id === "string" &&
          typeof (item as CompletedFlowRecord).title === "string" &&
          Array.isArray((item as CompletedFlowRecord).concepts),
      );
    });
  } catch {
    return [];
  }
}

export function readCompletedFlows() {
  if (typeof window === "undefined") return [];
  return parseCompletedFlows(window.localStorage.getItem(COMPLETED_FLOWS_KEY));
}

export function recordCompletedFlow(record: Omit<CompletedFlowRecord, "completed_at"> & { completed_at?: string }) {
  if (typeof window === "undefined") return false;
  try {
    const completed_at = record.completed_at || new Date().toISOString();
    const nextRecord: CompletedFlowRecord = { ...record, completed_at };
    const records = readCompletedFlows();
    const next = [nextRecord, ...records.filter((item) => item.flow_id !== record.flow_id)].slice(0, 30);
    window.localStorage.setItem(COMPLETED_FLOWS_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

function isKnowledgeFlow(value: unknown): value is KnowledgeFlow {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as KnowledgeFlow).id === "string" &&
      Array.isArray((value as KnowledgeFlow).plays),
  );
}

export function writeFlowDraft(draftId: string, flow: KnowledgeFlow, debug?: FlowDraftDebug) {
  if (typeof window === "undefined") return false;
  try {
    const value = debug ? ({ flow, debug } satisfies FlowDraftRecord) : flow;
    window.sessionStorage.setItem(`${FLOW_DRAFT_PREFIX}${draftId}`, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function readFlowDraftRecord(draftId: string | null): FlowDraftRecord | null {
  if (typeof window === "undefined" || !draftId) return null;
  const raw = window.sessionStorage.getItem(`${FLOW_DRAFT_PREFIX}${draftId}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isKnowledgeFlow(parsed)) return { flow: parsed };
    if (parsed && typeof parsed === "object" && isKnowledgeFlow((parsed as FlowDraftRecord).flow)) {
      const record = parsed as FlowDraftRecord;
      return { flow: record.flow, debug: record.debug };
    }
    return null;
  } catch {
    return null;
  }
}

export function readFlowDraft(draftId: string | null) {
  return readFlowDraftRecord(draftId)?.flow || null;
}

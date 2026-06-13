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
  if (typeof window === "undefined") return;
  const completed_at = record.completed_at || new Date().toISOString();
  const nextRecord: CompletedFlowRecord = { ...record, completed_at };
  const records = readCompletedFlows();
  const next = [nextRecord, ...records.filter((item) => item.flow_id !== record.flow_id)].slice(0, 30);
  window.localStorage.setItem(COMPLETED_FLOWS_KEY, JSON.stringify(next));
}

export function writeFlowDraft(draftId: string, flow: KnowledgeFlow) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(`${FLOW_DRAFT_PREFIX}${draftId}`, JSON.stringify(flow));
}

export function readFlowDraft(draftId: string | null) {
  if (typeof window === "undefined" || !draftId) return null;
  const raw = window.sessionStorage.getItem(`${FLOW_DRAFT_PREFIX}${draftId}`);
  if (!raw) return null;
  try {
    const flow = JSON.parse(raw) as KnowledgeFlow;
    return flow && typeof flow.id === "string" && Array.isArray(flow.plays) ? flow : null;
  } catch {
    return null;
  }
}

import { createHash, randomBytes } from "node:crypto";
import type { DynamicFlowGenerationResult, DynamicFlowInput } from "../content/dynamic-flow-generation.ts";
import { getPublicBetaConfig, type PublicBetaConfig } from "./config.ts";
import { getPublicBetaStore, type PublicBetaStore } from "./store.ts";

import { evaluateFlowAgainstBlueprint } from '../content/knowledge-blueprint.ts';
import { validateSchema } from '../llm/schema-validator.ts';

const DAY_SECONDS = 24 * 60 * 60;
const RETENTION_SECONDS = 90 * DAY_SECONDS;
const MAX_EVENT_ITEMS = 5_000;
const MAX_MODEL_ITEMS = 2_000;
const MAX_INVITE_ITEMS = 500;

export type DynamicAccessCode =
  | "allowed"
  | "static_mode"
  | "storage_unavailable"
  | "invite_required"
  | "invite_invalid"
  | "invite_expired"
  | "invite_exhausted"
  | "request_limit"
  | "client_limit"
  | "token_budget";

export interface PublicRequestIdentity {
  anonymousUserId: string;
  sessionId: string;
  abuseKey: string;
}

export interface DynamicAccessDecision {
  allowed: boolean;
  code: DynamicAccessCode;
  identity: PublicRequestIdentity;
  config: PublicBetaConfig;
  store: PublicBetaStore | null;
  inviteHash?: string;
}

export interface InviteRecord {
  hash: string;
  label?: string;
  enabled: boolean;
  createdAt: string;
  expiresAt?: string;
  maxUses: number;
  revokedAt?: string;
}

export interface ModelCallRecord {
  requestId: string;
  callType: "flow" | "chat";
  operation: string;
  provider: string;
  model: string;
  anonymousUserHash: string;
  sessionHash: string;
  flowId?: string;
  attempt: number;
  retry: boolean;
  repair: boolean;
  success: boolean;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  durationMs: number;
  estimatedCostUsd: number;
  errorCategory?: string;
  createdAt: string;
}

export interface GenerationRunRecord {
  requestId: string;
  flowId?: string;
  source: "llm" | "cache" | "fallback";
  success: boolean;
  cacheHit: boolean;
  fallback: boolean;
  repairCount: number;
  modelCallCount: number;
  latencyMs: number;
  errorCategory?: string;
  createdAt: string;
}

export interface StoredAnalyticsEvent {
  event_name: string;
  event_id: string;
  anonymous_user_id: string;
  session_id: string;
  timestamp: string;
  route: string;
  flow_id?: string;
  flow_source?: "static" | "llm" | "cache" | "fallback";
  step_index?: number;
  device_category: "mobile" | "tablet" | "desktop";
  elapsed_ms?: number;
  generation_latency_ms?: number;
  error_category?: string;
}

export interface FeedbackRecord {
  feedbackId: string;
  anonymousUserId: string;
  sessionId: string;
  flowId?: string;
  rating: "understood" | "mostly" | "confused";
  comment?: string;
  createdAt: string;
}

export interface TokenReservation {
  key: string;
  amount: number;
  ttlSeconds: number;
  config: PublicBetaConfig;
  store: PublicBetaStore;
}

function cleanIdentifier(value: string | null | undefined, fallbackPrefix: string) {
  const normalized = (value || "").trim();
  if (/^[A-Za-z0-9_-]{8,96}$/.test(normalized)) return normalized;
  return fallbackPrefix + "_" + randomBytes(12).toString("hex");
}

export function stableHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function namespace(config: PublicBetaConfig, suffix: string) {
  return config.namespace + ":" + suffix;
}

function utcDay(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function secondsToUtcDayEnd(now = new Date()) {
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(60, Math.ceil((end - now.getTime()) / 1000));
}

function windowBucket(windowMs: number, now = Date.now()) {
  return Math.floor(now / windowMs);
}

function normalizeInviteCode(code: string | undefined) {
  return (code || "").trim();
}

function hashInviteCode(code: string, config: PublicBetaConfig) {
  return stableHash((config.inviteCodePepper || "") + ":" + code);
}

function inviteKey(config: PublicBetaConfig, hash: string) {
  return namespace(config, "invite:" + hash);
}

function inviteUseKey(config: PublicBetaConfig, hash: string) {
  return namespace(config, "invite-use:" + hash);
}

function actualTokenKey(config: PublicBetaConfig) {
  return namespace(config, "daily:" + utcDay() + ":token-budget");
}

function dailyRequestKey(config: PublicBetaConfig) {
  return namespace(config, "daily:" + utcDay() + ":requests");
}

export async function inspectGlobalDynamicAvailability(
  config = getPublicBetaConfig(),
  store = getPublicBetaStore(config),
): Promise<Extract<
  DynamicAccessCode,
  "allowed" | "static_mode" | "storage_unavailable" | "request_limit" | "token_budget"
>> {
  if (!config.dynamicEnabled || config.effectiveMode === "static") return "static_mode";
  if (!store) return "storage_unavailable";
  try {
    const [usedTokens, usedRequests] = await Promise.all([
      store.get<number>(actualTokenKey(config)),
      store.get<number>(dailyRequestKey(config)),
    ]);
    if ((usedTokens || 0) + config.modelTokenReservation > config.dailyTokenLimit) {
      return "token_budget";
    }
    if ((usedRequests || 0) >= config.dailyRequestLimit) return "request_limit";
    return "allowed";
  } catch {
    return "storage_unavailable";
  }
}

export function getPublicRequestIdentity(
  req: Request,
  body: Record<string, unknown> = {},
): PublicRequestIdentity {
  const anonymousBody = typeof body.anonymousUserId === "string" ? body.anonymousUserId : undefined;
  const sessionBody = typeof body.sessionId === "string" ? body.sessionId : undefined;
  const anonymousCandidate = req.headers.get("x-aha-anonymous-id") || anonymousBody || "";
  const stableAnonymousCandidate = /^[A-Za-z0-9_-]{8,96}$/.test(anonymousCandidate.trim())
    ? anonymousCandidate.trim()
    : "";
  const anonymousUserId = cleanIdentifier(
    anonymousCandidate,
    "anon",
  );
  const sessionId = cleanIdentifier(
    req.headers.get("x-aha-session-id") || sessionBody,
    "session",
  );
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const source = stableAnonymousCandidate || forwarded || req.headers.get("user-agent") || "unknown";
  return {
    anonymousUserId,
    sessionId,
    abuseKey: stableHash(source).slice(0, 32),
  };
}

async function getInviteDecision(
  store: PublicBetaStore,
  config: PublicBetaConfig,
  inviteCode: string | undefined,
) {
  const code = normalizeInviteCode(inviteCode);
  if (!code) return { code: "invite_required" as const };
  const hash = hashInviteCode(code, config);
  const invite = await store.get<InviteRecord>(inviteKey(config, hash));
  if (!invite || !invite.enabled || invite.revokedAt) {
    return { code: "invite_invalid" as const };
  }
  if (invite.expiresAt && Date.parse(invite.expiresAt) <= Date.now()) {
    return { code: "invite_expired" as const };
  }
  const used = await store.get<number>(inviteUseKey(config, hash)) || 0;
  if (used >= invite.maxUses) {
    return { code: "invite_exhausted" as const };
  }
  return { code: "allowed" as const, hash };
}

export async function inspectDynamicAccess({
  req,
  body = {},
  inviteCode,
  config = getPublicBetaConfig(),
  store = getPublicBetaStore(config),
}: {
  req: Request;
  body?: Record<string, unknown>;
  inviteCode?: string;
  config?: PublicBetaConfig;
  store?: PublicBetaStore | null;
}): Promise<DynamicAccessDecision> {
  const identity = getPublicRequestIdentity(req, body);
  const base = { identity, config, store };
  if (!config.dynamicEnabled || config.effectiveMode === "static") {
    return { ...base, allowed: false, code: "static_mode" };
  }
  if (!store) {
    return { ...base, allowed: false, code: "storage_unavailable" };
  }
  const globalAvailability = await inspectGlobalDynamicAvailability(config, store);
  if (globalAvailability !== "allowed") {
    return { ...base, allowed: false, code: globalAvailability };
  }
  if (config.effectiveMode === "invite") {
    const invite = await getInviteDecision(store, config, inviteCode);
    if (invite.code !== "allowed") {
      return { ...base, allowed: false, code: invite.code };
    }
    return { ...base, allowed: true, code: "allowed", inviteHash: invite.hash };
  }
  return { ...base, allowed: true, code: "allowed" };
}

export async function consumeDynamicAccess(
  decision: DynamicAccessDecision,
): Promise<DynamicAccessDecision> {
  if (!decision.allowed || !decision.store) return decision;
  const { config, store, identity } = decision;
  const clientKey = namespace(
    config,
    "client:" + identity.abuseKey + ":" + windowBucket(config.clientWindowMs),
  );
  const client = await store.incrementIfBelow(
    clientKey,
    1,
    config.clientWindowLimit,
    Math.ceil(config.clientWindowMs / 1000) + 60,
  );
  if (!client.allowed) return { ...decision, allowed: false, code: "client_limit" };

  const requestKey = dailyRequestKey(config);
  const requests = await store.incrementIfBelow(
    requestKey,
    1,
    config.dailyRequestLimit,
    secondsToUtcDayEnd(),
  );
  if (!requests.allowed) return { ...decision, allowed: false, code: "request_limit" };

  if (decision.inviteHash) {
    const invite = await store.get<InviteRecord>(inviteKey(config, decision.inviteHash));
    if (!invite || !invite.enabled) {
      return { ...decision, allowed: false, code: "invite_invalid" };
    }
    const inviteUse = await store.incrementIfBelow(
      inviteUseKey(config, decision.inviteHash),
      1,
      invite.maxUses,
      invite.expiresAt
        ? Math.max(60, Math.ceil((Date.parse(invite.expiresAt) - Date.now()) / 1000))
        : RETENTION_SECONDS,
    );
    if (!inviteUse.allowed) {
      return { ...decision, allowed: false, code: "invite_exhausted" };
    }
  }
  return decision;
}

export async function reserveModelTokens(
  config = getPublicBetaConfig(),
  store = getPublicBetaStore(config),
): Promise<TokenReservation | null> {
  if (!store) return null;
  const key = actualTokenKey(config);
  const ttlSeconds = secondsToUtcDayEnd();
  const result = await store.incrementIfBelow(
    key,
    config.modelTokenReservation,
    config.dailyTokenLimit,
    ttlSeconds,
  );
  if (!result.allowed) return null;
  return { key, amount: config.modelTokenReservation, ttlSeconds, config, store };
}

export async function settleModelTokens(
  reservation: TokenReservation,
  usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number },
) {
  const inputTokens = Math.max(0, usage.inputTokens || 0);
  const outputTokens = Math.max(0, usage.outputTokens || 0);
  const totalTokens = Math.max(0, usage.totalTokens || inputTokens + outputTokens);
  await reservation.store.increment(
    reservation.key,
    totalTokens - reservation.amount,
    reservation.ttlSeconds,
  );
  if (inputTokens > 0) {
    await reservation.store.increment(
      namespace(reservation.config, "daily:" + utcDay() + ":input-tokens"),
      inputTokens,
      reservation.ttlSeconds,
    );
  }
  if (outputTokens > 0) {
    await reservation.store.increment(
      namespace(reservation.config, "daily:" + utcDay() + ":output-tokens"),
      outputTokens,
      reservation.ttlSeconds,
    );
  }
}

export async function recordModelCall(record: ModelCallRecord, config = getPublicBetaConfig()) {
  const store = getPublicBetaStore(config);
  if (!store) return;
  await store.push(namespace(config, "model-calls"), record, MAX_MODEL_ITEMS, RETENTION_SECONDS);
}

export async function recordGenerationRun(record: GenerationRunRecord, config = getPublicBetaConfig()) {
  const store = getPublicBetaStore(config);
  if (!store) return;
  await store.push(namespace(config, "generation-runs"), record, MAX_MODEL_ITEMS, RETENTION_SECONDS);
}

function normalizedFlowCacheInput(input: DynamicFlowInput, config: PublicBetaConfig) {
  return {
    topic: input.topic.trim().toLocaleLowerCase("zh-CN"),
    preferredPattern: input.preferredPattern || "auto",
    preferredStructure: input.preferredStructure || "auto",
    generationVersion: config.generationVersion,
  };
}

function flowCacheKey(input: DynamicFlowInput, config: PublicBetaConfig) {
  const fingerprint = stableHash(JSON.stringify(normalizedFlowCacheInput(input, config)));
  return namespace(config, "flow-cache:" + fingerprint);
}

export function isValidCachedFlow(
  input: DynamicFlowInput,
  result: DynamicFlowGenerationResult | null,
) {
  if (
    !result
    || result.failure
    || !result.flow
    || !result.blueprint
    || !result.quality_gate?.ok
    || !Array.isArray(result.flow.plays)
    || result.flow.plays.length === 0
  ) {
    return false;
  }
  try {
    if (result.flow.plays.some((play) => !validateSchema(play.schema))) return false;
    return evaluateFlowAgainstBlueprint(
      result.flow,
      result.blueprint,
      input.preferredPattern || 'auto',
    ).ok;
  } catch {
    return false;
  }
}

export async function getCachedFlow(
  input: DynamicFlowInput,
  config = getPublicBetaConfig(),
  store = getPublicBetaStore(config),
) {
  if (!store) return null;
  const key = flowCacheKey(input, config);
  const result = await store.get<DynamicFlowGenerationResult>(key);
  if (isValidCachedFlow(input, result)) return result;
  if (result) await store.delete(key);
  return null;
}

export async function setCachedFlow(
  input: DynamicFlowInput,
  result: DynamicFlowGenerationResult,
  config = getPublicBetaConfig(),
  store = getPublicBetaStore(config),
) {
  if (!store || !isValidCachedFlow(input, result)) return false;
  const safeResult: DynamicFlowGenerationResult = {
    flow: result.flow,
    source: result.source,
    concept_plan: result.concept_plan,
    blueprint: result.blueprint,
    quality_gate: result.quality_gate,
    repair_actions: result.repair_actions,
  };
  await store.set(flowCacheKey(input, config), safeResult, config.cacheTtlSeconds);
  return true;
}

export async function appendAnalyticsEvent(
  event: StoredAnalyticsEvent,
  config = getPublicBetaConfig(),
  store = getPublicBetaStore(config),
) {
  if (!store) return { stored: false, duplicate: false };
  const dedupeKey = namespace(config, "event-id:" + event.event_id);
  const first = await store.setIfAbsent(dedupeKey, true, RETENTION_SECONDS);
  if (!first) return { stored: false, duplicate: true };
  if (event.event_name === "flow_completed" && event.flow_id) {
    const flowDedupe = namespace(
      config,
      "flow-complete:" + stableHash(
        event.anonymous_user_id + ":" + event.session_id + ":" + event.flow_id,
      ),
    );
    const firstCompletion = await store.setIfAbsent(flowDedupe, true, RETENTION_SECONDS);
    if (!firstCompletion) return { stored: false, duplicate: true };
  }
  await store.push(namespace(config, "analytics-events"), event, MAX_EVENT_ITEMS, RETENTION_SECONDS);
  return { stored: true, duplicate: false };
}

export async function appendFeedback(
  feedback: FeedbackRecord,
  config = getPublicBetaConfig(),
  store = getPublicBetaStore(config),
) {
  if (!store) return { stored: false, duplicate: false };
  const dedupeKey = namespace(
    config,
    'feedback-id:' + stableHash(
      feedback.anonymousUserId
      + ':' + feedback.sessionId
      + ':' + (feedback.flowId || feedback.feedbackId),
    ),
  );
  const first = await store.setIfAbsent(dedupeKey, true, RETENTION_SECONDS);
  if (!first) return { stored: false, duplicate: true };
  await store.push(namespace(config, "feedback"), feedback, MAX_MODEL_ITEMS, RETENTION_SECONDS);
  return { stored: true, duplicate: false };
}

function requestDeviceCategory(req: Request): StoredAnalyticsEvent['device_category'] {
  const userAgent = req.headers.get('user-agent') || '';
  if (/ipad|tablet/i.test(userAgent)) return 'tablet';
  if (/mobile|iphone|android/i.test(userAgent)) return 'mobile';
  return 'desktop';
}

export async function recordAccessAnalyticsEvent({
  req,
  decision,
  eventName,
  route,
  flowId,
  errorCategory,
}: {
  req: Request;
  decision: DynamicAccessDecision;
  eventName: 'dynamic_generation_blocked' | 'rate_limited' | 'budget_exhausted';
  route: string;
  flowId?: string;
  errorCategory?: string;
}) {
  if (!decision.store) return false;
  const result = await appendAnalyticsEvent({
    event_name: eventName,
    event_id: 'server_' + randomBytes(12).toString('hex'),
    anonymous_user_id: decision.identity.anonymousUserId,
    session_id: decision.identity.sessionId,
    timestamp: new Date().toISOString(),
    route,
    flow_id: flowId,
    device_category: requestDeviceCategory(req),
    error_category: errorCategory,
  }, decision.config, decision.store);
  return result.stored;
}

export async function listAnalyticsEvents(limit = MAX_EVENT_ITEMS, config = getPublicBetaConfig()) {
  const store = getPublicBetaStore(config);
  return store ? store.list<StoredAnalyticsEvent>(namespace(config, "analytics-events"), limit) : [];
}

export async function listFeedback(limit = MAX_MODEL_ITEMS, config = getPublicBetaConfig()) {
  const store = getPublicBetaStore(config);
  return store ? store.list<FeedbackRecord>(namespace(config, "feedback"), limit) : [];
}

export async function listModelCalls(limit = MAX_MODEL_ITEMS, config = getPublicBetaConfig()) {
  const store = getPublicBetaStore(config);
  return store ? store.list<ModelCallRecord>(namespace(config, "model-calls"), limit) : [];
}

export async function listGenerationRuns(limit = MAX_MODEL_ITEMS, config = getPublicBetaConfig()) {
  const store = getPublicBetaStore(config);
  return store ? store.list<GenerationRunRecord>(namespace(config, "generation-runs"), limit) : [];
}

export async function createInvite({
  label,
  maxUses = 20,
  expiresAt,
  config = getPublicBetaConfig(),
}: {
  label?: string;
  maxUses?: number;
  expiresAt?: string;
  config?: PublicBetaConfig;
}) {
  const store = getPublicBetaStore(config);
  if (!store) throw new Error("Persistent public-beta storage is unavailable.");
  const code = "aha_" + randomBytes(12).toString("base64url");
  const hash = hashInviteCode(code, config);
  const record: InviteRecord = {
    hash,
    label: label?.trim().slice(0, 80) || undefined,
    enabled: true,
    createdAt: new Date().toISOString(),
    expiresAt,
    maxUses: Math.max(1, Math.floor(maxUses)),
  };
  await store.set(inviteKey(config, hash), record, RETENTION_SECONDS);
  await store.push(namespace(config, "invites"), record, MAX_INVITE_ITEMS, RETENTION_SECONDS);
  return { code, record };
}

export async function revokeInvite(codeOrHash: string, config = getPublicBetaConfig()) {
  const store = getPublicBetaStore(config);
  if (!store) throw new Error("Persistent public-beta storage is unavailable.");
  const normalized = codeOrHash.trim();
  const hash = /^[a-f0-9]{64}$/.test(normalized) ? normalized : hashInviteCode(normalized, config);
  const record = await store.get<InviteRecord>(inviteKey(config, hash));
  if (!record) return false;
  await store.set(inviteKey(config, hash), {
    ...record,
    enabled: false,
    revokedAt: new Date().toISOString(),
  }, RETENTION_SECONDS);
  return true;
}

export async function listInvites(config = getPublicBetaConfig()) {
  const store = getPublicBetaStore(config);
  if (!store) return [];
  const records = await store.list<InviteRecord>(namespace(config, "invites"), MAX_INVITE_ITEMS);
  const latest = new Map<string, InviteRecord>();
  for (const record of records) {
    if (latest.has(record.hash)) continue;
    latest.set(record.hash, await store.get<InviteRecord>(inviteKey(config, record.hash)) || record);
  }
  return Promise.all(Array.from(latest.values()).map(async (record) => ({
    ...record,
    used: await store.get<number>(inviteUseKey(config, record.hash)) || 0,
  })));
}

export async function clearPublicBetaData(config = getPublicBetaConfig()) {
  const store = getPublicBetaStore(config);
  if (!store) return 0;
  return store.clearPrefix(config.namespace + ":");
}

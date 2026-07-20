import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { analyticsEventSchema } from "../../src/lib/analytics/events.ts";
import { submitFeedback } from "../../src/lib/analytics/client.ts";
import type { DynamicFlowGenerationResult } from "../../src/lib/content/dynamic-flow-generation.ts";
import { getFlowById } from "../../src/lib/content/mock-flows.ts";
import { getLLMProvider } from "../../src/lib/llm/provider.ts";
import {
  getModelInvocationCountForTests,
  resetModelInvocationCountForTests,
} from "../../src/lib/llm/retry-generate-text.ts";
import { getPublicBetaConfig, type PublicBetaConfig } from "../../src/lib/public-beta/config.ts";
import {
  appendAnalyticsEvent,
  appendFeedback,
  consumeDynamicAccess,
  createInvite,
  getCachedFlow,
  getPublicRequestIdentity,
  inspectDynamicAccess,
  inspectGlobalDynamicAvailability,
  reserveModelTokens,
  settleModelTokens,
  setCachedFlow,
  type FeedbackRecord,
  type GenerationRunRecord,
  type ModelCallRecord,
  type StoredAnalyticsEvent,
} from "../../src/lib/public-beta/repository.ts";
import {
  LocalFilePublicBetaStore,
  resetPublicBetaStoreCacheForTests,
} from "../../src/lib/public-beta/store.ts";

import { generateDynamicFlow } from '../../src/lib/content/dynamic-flow-generation.ts';
import { feedbackRequestSchema } from '../../src/lib/analytics/events.ts';
import { readJsonBodyWithLimit } from '../../src/lib/public-beta/http.ts';
import {
  buildPublicBetaMetrics,
  isAdminMetricsAuthorized,
} from '../../src/lib/public-beta/metrics.ts';

let passed = 0;

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

async function check(name: string, operation: () => Promise<void> | void) {
  await operation();
  passed += 1;
  console.log("PASS " + name);
}

function makeConfig(file: string, overrides: Partial<NodeJS.ProcessEnv> = {}) {
  return getPublicBetaConfig({
    NODE_ENV: "test",
    PUBLIC_FLOW_MODE: "invite",
    DYNAMIC_GENERATION_ENABLED: "1",
    PUBLIC_BETA_STORAGE: "local",
    PUBLIC_BETA_LOCAL_FILE: file,
    DYNAMIC_DAILY_REQUEST_LIMIT: "20",
    DYNAMIC_DAILY_TOKEN_LIMIT: "200000",
    DYNAMIC_CLIENT_WINDOW_LIMIT: "10",
    DYNAMIC_CLIENT_WINDOW_MS: "3600000",
    DYNAMIC_MODEL_TOKEN_RESERVATION: "10000",
    INVITE_CODE_PEPPER: "test-pepper",
    ...overrides,
  } as NodeJS.ProcessEnv);
}

function makeRequest(anonymous = "anonymous_test_01", session = "session_test_01") {
  return new Request("http://localhost/api/flow", {
    headers: {
      "x-aha-anonymous-id": anonymous,
      "x-aha-session-id": session,
    },
  });
}

async function main() {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "aha-public-beta-"));
  try {
    await check("production without external storage fails closed to static", () => {
      const config = getPublicBetaConfig({
        NODE_ENV: "production",
        PUBLIC_FLOW_MODE: "open",
        DYNAMIC_GENERATION_ENABLED: "1",
        PUBLIC_BETA_STORAGE: "local",
      } as NodeJS.ProcessEnv);
      assert(config.effectiveMode === "static", "production must fall back to static");
      assert(!config.dynamicEnabled, "dynamic generation must be disabled");
    });

    await check("five showcase flows need zero model invocations", () => {
      const previousKey = process.env.DEEPSEEK_API_KEY;
      process.env.DEEPSEEK_API_KEY = "must-not-be-used";
      resetModelInvocationCountForTests();
      for (const id of [
        "bayes-starter",
        "dns-router",
        "options-risk",
        "industrial-revolution",
        "inflation-deflation",
      ]) {
        assert(getFlowById(id).id === id, id + " should resolve statically");
      }
      assert(getLLMProvider() === null, "provider must be unavailable without request context");
      assert(getModelInvocationCountForTests() === 0, "static flows must not invoke the model");
      if (previousKey === undefined) delete process.env.DEEPSEEK_API_KEY;
      else process.env.DEEPSEEK_API_KEY = previousKey;
    });

    await check('static mode rejects dynamic API access before model access', async () => {
      const file = path.join(temporaryRoot, 'static-guard.json');
      const config = makeConfig(file, {
        PUBLIC_FLOW_MODE: 'static',
        DYNAMIC_GENERATION_ENABLED: '1',
      });
      resetModelInvocationCountForTests();
      const decision = await inspectDynamicAccess({
        req: makeRequest(),
        inviteCode: 'aha_should_never_be_checked',
        config,
        store: new LocalFilePublicBetaStore(file),
      });
      assert(decision.code === 'static_mode', 'static mode must reject on the server');
      assert(getModelInvocationCountForTests() === 0, 'static rejection must happen before model access');
    });

    await check("invite validation covers invalid, expired, and exhausted codes", async () => {
      const file = path.join(temporaryRoot, "invite.json");
      const config = makeConfig(file);
      resetPublicBetaStoreCacheForTests();
      resetModelInvocationCountForTests();
      const invalid = await inspectDynamicAccess({
        req: makeRequest(),
        inviteCode: "aha_invalid_code",
        config,
      });
      assert(invalid.code === "invite_invalid", "invalid invite should be rejected");

      const expired = await createInvite({
        label: "expired",
        maxUses: 1,
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
        config,
      });
      const expiredDecision = await inspectDynamicAccess({
        req: makeRequest(),
        inviteCode: expired.code,
        config,
      });
      assert(expiredDecision.code === "invite_expired", "expired invite should be rejected");

      const singleUse = await createInvite({
        label: "single",
        maxUses: 1,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        config,
      });
      const first = await inspectDynamicAccess({
        req: makeRequest(),
        inviteCode: singleUse.code,
        config,
      });
      assert(first.allowed, "fresh invite should be allowed");
      const consumed = await consumeDynamicAccess(first);
      assert(consumed.allowed, "first invite use should be consumed");
      assert(getModelInvocationCountForTests() === 0, 'invite checks must not invoke the model');
      const exhausted = await inspectDynamicAccess({
        req: makeRequest("anonymous_test_02", "session_test_02"),
        inviteCode: singleUse.code,
        config,
      });
      assert(exhausted.code === "invite_exhausted", "used invite should be exhausted");
    });

    await check("persistent request and token budgets block before model access", async () => {
      const file = path.join(temporaryRoot, "budget.json");
      const config = makeConfig(file, {
        PUBLIC_FLOW_MODE: "open",
        DYNAMIC_DAILY_REQUEST_LIMIT: "1",
        DYNAMIC_DAILY_TOKEN_LIMIT: "12000",
        DYNAMIC_MODEL_TOKEN_RESERVATION: "6000",
      });
      const store = new LocalFilePublicBetaStore(file);
      resetModelInvocationCountForTests();
      const first = await inspectDynamicAccess({ req: makeRequest(), config, store });
      assert(first.allowed, "first request should be inspectable");
      assert((await consumeDynamicAccess(first)).allowed, "first request should consume quota");
      const second = await inspectDynamicAccess({
        req: makeRequest("anonymous_test_03", "session_test_03"),
        config,
        store,
      });
      const secondConsumed = await consumeDynamicAccess(second);
      assert(secondConsumed.code === "request_limit", "second request should hit daily limit");

      const tokenFile = path.join(temporaryRoot, "reservation-budget.json");
      const tokenConfig = makeConfig(tokenFile, {
        PUBLIC_FLOW_MODE: "open",
        DYNAMIC_DAILY_TOKEN_LIMIT: "5000",
        DYNAMIC_MODEL_TOKEN_RESERVATION: "6000",
      });
      const tokenStore = new LocalFilePublicBetaStore(tokenFile);
      assert(
        await inspectGlobalDynamicAvailability(tokenConfig, tokenStore) === "token_budget",
        "runtime availability should turn static before an unaffordable reservation",
      );
      const tokenDecision = await inspectDynamicAccess({
        req: makeRequest("anonymous_token_preflight", "session_token_preflight"),
        config: tokenConfig,
        store: tokenStore,
      });
      assert(tokenDecision.code === "token_budget", "token preflight should block the request");
      assert(await reserveModelTokens(tokenConfig, tokenStore) === null, "token reservation should fail before a call");
      assert(getModelInvocationCountForTests() === 0, "quota checks must finish before model access");
    });

    await check('token exhaustion stops new model reservations but keeps showcases available', async () => {
      const file = path.join(temporaryRoot, 'token-budget.json');
      const config = makeConfig(file, {
        PUBLIC_FLOW_MODE: 'open',
        DYNAMIC_DAILY_REQUEST_LIMIT: '20',
        DYNAMIC_DAILY_TOKEN_LIMIT: '6000',
        DYNAMIC_MODEL_TOKEN_RESERVATION: '3000',
      });
      const store = new LocalFilePublicBetaStore(file);
      const reservation = await reserveModelTokens(config, store);
      if (!reservation) throw new Error('first token reservation should be available');
      await settleModelTokens(reservation, {
        inputTokens: 4000,
        outputTokens: 2000,
        totalTokens: 6000,
      });
      const blocked = await inspectDynamicAccess({
        req: makeRequest('anonymous_token_01', 'session_token_01'),
        config,
        store,
      });
      assert(blocked.code === 'token_budget', 'actual daily usage must stop later dynamic requests');
      assert(await reserveModelTokens(config, store) === null, 'no later model call may reserve tokens');
      resetModelInvocationCountForTests();
      assert(getFlowById('dns-router').id === 'dns-router', 'static showcase must remain available');
      assert(getModelInvocationCountForTests() === 0, 'budget fallback must remain model-free');
    });

    await check("valid flow cache round-trips without consuming generation quota", async () => {
      const file = path.join(temporaryRoot, "cache.json");
      const config = makeConfig(file, { PUBLIC_FLOW_MODE: "open" });
      const store = new LocalFilePublicBetaStore(file);
      const input = {
        topic: "贝叶斯定理",
        preferredPattern: "auto" as const,
        preferredStructure: "auto" as const,
      };
      const generated = await generateDynamicFlow({ topic: '线性规划' });
      assert(generated.quality_gate?.ok, 'cache fixture must pass the real QualityGate');
      generated.flow.id = 'bayes-starter';
      const result = {
        ...generated,
        failure: undefined,
        source: 'llm',
      } as DynamicFlowGenerationResult;
      await setCachedFlow(input, result, config, store);
      const cached = await getCachedFlow(input, config, store);
      assert(cached?.flow.id === "bayes-starter", "cached flow should be returned");
      assert(cached?.raw_output === undefined, "raw model output must never be cached");
    });

    await check('invalid cache entries are rejected by schema and QualityGate validation', async () => {
      const file = path.join(temporaryRoot, 'invalid-cache.json');
      const config = makeConfig(file, { PUBLIC_FLOW_MODE: 'open' });
      const store = new LocalFilePublicBetaStore(file);
      const input = {
        topic: 'invalid cache fixture',
        preferredPattern: 'auto' as const,
        preferredStructure: 'auto' as const,
      };
      const generated = await generateDynamicFlow({ topic: '线性规划' });
      const invalid = {
        ...generated,
        flow: structuredClone(generated.flow),
        failure: undefined,
        source: 'llm',
      } as DynamicFlowGenerationResult;
      const firstPlay = invalid.flow.plays[0];
      if (!firstPlay) throw new Error('invalid cache fixture needs one play');
      firstPlay.schema = { pattern: 'not-a-pattern' } as unknown as typeof firstPlay.schema;
      const previousConsoleError = console.error;
      console.error = () => undefined;
      try {
        assert(
          await setCachedFlow(input, invalid, config, store) === false,
          'invalid cache content must not be stored',
        );
        assert(
          await getCachedFlow(input, config, store) === null,
          'invalid cache content must never be returned',
        );
      } finally {
        console.error = previousConsoleError;
      }
    });

    await check("analytics rejects unknown fields and deduplicates completion", async () => {
      const base = {
        schema_version: "1",
        event_name: "flow_completed",
        event_id: "event_public_beta_01",
        anonymous_user_id: "anonymous_public_01",
        session_id: "session_public_01",
        timestamp: new Date().toISOString(),
        route: "/flow/bayes-starter",
        flow_id: "bayes-starter",
        flow_source: "static",
        device_category: "desktop",
      } as const;
      assert(analyticsEventSchema.safeParse({ ...base, topic: "private" }).success === false, "unknown topic field must be rejected");
      const file = path.join(temporaryRoot, "analytics.json");
      const config = makeConfig(file, { PUBLIC_FLOW_MODE: "open" });
      const store = new LocalFilePublicBetaStore(file);
      const first = await appendAnalyticsEvent(base, config, store);
      const second = await appendAnalyticsEvent({
        ...base,
        event_id: "event_public_beta_02",
      }, config, store);
      assert(first.stored, "first completion should be stored");
      assert(second.duplicate, "same flow completion in one session should be deduplicated");
    });

    await check('analytics rejects oversized, unknown, and sensitive payload fields', async () => {
      const identity = getPublicRequestIdentity(new Request('http://localhost/api/analytics', {
        headers: {
          'user-agent': 'public-beta-test',
          'x-forwarded-for': '203.0.113.42',
        },
      }));
      assert(
        !JSON.stringify(identity).includes('203.0.113.42'),
        'full IP addresses must not survive identity normalization',
      );
      const forbidden = analyticsEventSchema.safeParse({
        schema_version: '1',
        event_name: 'page_view',
        event_id: 'event_privacy_01',
        anonymous_user_id: 'anonymous_privacy_01',
        session_id: 'session_privacy_01',
        timestamp: new Date().toISOString(),
        route: '/explore',
        device_category: 'desktop',
        topic: 'private free-form topic',
        api_key: 'secret',
        invite_code: 'aha_secret',
        ip: '203.0.113.42',
      });
      assert(!forbidden.success, 'strict analytics schema must reject sensitive extra fields');
      assert(
        !analyticsEventSchema.safeParse({
          schema_version: '1',
          event_name: 'unknown_event',
          event_id: 'event_unknown_01',
          anonymous_user_id: 'anonymous_unknown_01',
          session_id: 'session_unknown_01',
          timestamp: new Date().toISOString(),
          route: '/explore',
          device_category: 'desktop',
        }).success,
        'unknown analytics event names must be rejected',
      );
      const oversized = await readJsonBodyWithLimit(new Request('http://localhost/api/analytics', {
        method: 'POST',
        body: JSON.stringify({ padding: 'x'.repeat(2048) }),
      }), 512);
      assert(!oversized.ok && oversized.error === 'too_large', 'actual UTF-8 body size must be enforced');
    });

    await check('feedback is length-limited, structured, and deduplicated', async () => {
      assert(
        !feedbackRequestSchema.safeParse({
          rating: 'mostly',
          comment: 'x'.repeat(241),
          device_category: 'desktop',
        }).success,
        'feedback comments over 240 characters must be rejected',
      );
      const file = path.join(temporaryRoot, 'feedback.json');
      const config = makeConfig(file, { PUBLIC_FLOW_MODE: 'open' });
      const store = new LocalFilePublicBetaStore(file);
      const base: FeedbackRecord = {
        feedbackId: 'feedback_public_01',
        anonymousUserId: 'anonymous_feedback_01',
        sessionId: 'session_feedback_01',
        flowId: 'bayes-starter',
        rating: 'mostly',
        comment: 'The slider made the update visible.',
        createdAt: new Date().toISOString(),
      };
      const first = await appendFeedback(base, config, store);
      const second = await appendFeedback({
        ...base,
        feedbackId: 'feedback_public_02',
      }, config, store);
      assert(first.stored, 'first structured feedback should be stored');
      assert(second.duplicate, 'one session should not duplicate feedback for the same flow');
    });

    await check("feedback network failure never blocks completion", async () => {
      const previousFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        throw new Error("offline");
      };
      try {
        const accepted = await submitFeedback({
          rating: "mostly",
          flow_id: "bayes-starter",
          flow_source: "static",
        });
        assert(!accepted, "feedback helper should report failure without throwing");
      } finally {
        globalThis.fetch = previousFetch;
      }
    });

    await check('admin metrics require an exact server-side secret', () => {
      assert(!isAdminMetricsAuthorized('', 'metrics-secret'), 'missing secret must be rejected');
      assert(!isAdminMetricsAuthorized('wrong-secret', 'metrics-secret'), 'wrong secret must be rejected');
      assert(!isAdminMetricsAuthorized('metrics-secret', undefined), 'unconfigured admin access must fail closed');
      assert(isAdminMetricsAuthorized('metrics-secret', 'metrics-secret'), 'matching secret should be authorized');
    });

    await check('metrics compute the anonymous funnel, exits, feedback, and model cost', () => {
      const now = new Date('2026-07-18T12:00:00.000Z');
      const at = now.toISOString();
      const event = (
        eventName: string,
        eventId: string,
        anonymousUserId: string,
        sessionId: string,
        details: Partial<StoredAnalyticsEvent> = {},
      ): StoredAnalyticsEvent => ({
        event_name: eventName,
        event_id: eventId,
        anonymous_user_id: anonymousUserId,
        session_id: sessionId,
        timestamp: at,
        route: '/explore',
        device_category: 'desktop',
        ...details,
      });
      const events: StoredAnalyticsEvent[] = [
        event('page_view', 'metrics_event_01', 'anonymous_metrics_01', 'session_metrics_01'),
        event('page_view', 'metrics_event_02', 'anonymous_metrics_02', 'session_metrics_02'),
        event('flow_started', 'metrics_event_03', 'anonymous_metrics_01', 'session_metrics_01', {
          flow_id: 'bayes-starter',
          flow_source: 'static',
        }),
        event('flow_started', 'metrics_event_04', 'anonymous_metrics_02', 'session_metrics_02', {
          flow_id: 'bayes-starter',
          flow_source: 'static',
        }),
        event('step_interacted', 'metrics_event_05', 'anonymous_metrics_01', 'session_metrics_01', {
          flow_id: 'bayes-starter',
          step_index: 1,
        }),
        event('flow_exited', 'metrics_event_06', 'anonymous_metrics_01', 'session_metrics_01', {
          flow_id: 'bayes-starter',
          step_index: 1,
        }),
        event('flow_completed', 'metrics_event_07', 'anonymous_metrics_02', 'session_metrics_02', {
          flow_id: 'bayes-starter',
          elapsed_ms: 180_000,
        }),
        event('next_topic_clicked', 'metrics_event_08', 'anonymous_metrics_02', 'session_metrics_02', {
          flow_id: 'bayes-starter',
        }),
        event('second_flow_started', 'metrics_event_09', 'anonymous_metrics_02', 'session_metrics_02', {
          flow_id: 'dns-router',
        }),
        event('hub_opened', 'metrics_event_10', 'anonymous_metrics_02', 'session_metrics_02'),
        event('rate_limited', 'metrics_event_11', 'anonymous_metrics_02', 'session_metrics_02'),
        event('rate_limited', 'server_metrics_event_12', 'anonymous_metrics_02', 'session_metrics_02'),
        event('budget_exhausted', 'server_metrics_event_13', 'anonymous_metrics_02', 'session_metrics_02'),
      ];
      const feedback: FeedbackRecord[] = [
        {
          feedbackId: 'metrics_feedback_01',
          anonymousUserId: 'anonymous_metrics_01',
          sessionId: 'session_metrics_01',
          flowId: 'bayes-starter',
          rating: 'confused',
          createdAt: at,
        },
        {
          feedbackId: 'metrics_feedback_02',
          anonymousUserId: 'anonymous_metrics_02',
          sessionId: 'session_metrics_02',
          flowId: 'bayes-starter',
          rating: 'understood',
          createdAt: at,
        },
      ];
      const modelCalls: ModelCallRecord[] = [{
        requestId: 'metrics_request_01',
        callType: 'flow',
        operation: 'plan',
        provider: 'deepseek',
        model: 'deepseek-chat',
        anonymousUserHash: 'anonymous_hash_01',
        sessionHash: 'session_hash_01',
        flowId: 'custom-metrics',
        attempt: 1,
        retry: false,
        repair: false,
        success: true,
        inputTokens: 200,
        outputTokens: 100,
        totalTokens: 300,
        durationMs: 900,
        estimatedCostUsd: 0.0001,
        createdAt: at,
      }];
      const generationRuns: GenerationRunRecord[] = [
        {
          requestId: 'metrics_run_01',
          flowId: 'custom-metrics',
          source: 'llm',
          success: true,
          cacheHit: false,
          fallback: false,
          repairCount: 0,
          modelCallCount: 1,
          latencyMs: 1000,
          createdAt: at,
        },
        {
          requestId: 'metrics_run_02',
          flowId: 'custom-metrics',
          source: 'cache',
          success: true,
          cacheHit: true,
          fallback: false,
          repairCount: 0,
          modelCallCount: 0,
          latencyMs: 20,
          createdAt: at,
        },
      ];
      const metrics = buildPublicBetaMetrics({
        config: makeConfig(path.join(temporaryRoot, 'metrics.json'), {
          PUBLIC_FLOW_MODE: 'open',
        }),
        events,
        feedback,
        modelCalls,
        generationRuns,
        counters: {
          requests: 2,
          tokenBudget: 300,
          inputTokens: 200,
          outputTokens: 100,
        },
        now,
      });
      assert(metrics.core_metrics.start_rate === 1, 'two visitors should both start');
      assert(metrics.core_metrics.completion_rate === 0.5, 'one of two starters should complete');
      assert(metrics.core_metrics.continuation_rate === 1, 'the completing user should start a second flow');
      assert(metrics.funnel.exit_rates_by_step['2'] === 0.5, 'step-two exit rate should be visible');
      assert(metrics.feedback.confused_rate === 0.5, 'feedback ratios should be visible');
      assert(metrics.content[0]?.completion_rate === 0.5, 'per-flow completion should be visible');
      assert(metrics.model_today.cache_hit_rate === 0.5, 'cache hit rate should include cached runs');
      assert(metrics.model_today.rate_limited === 1, 'server limit events must not be double-counted');
      assert(
        metrics.model_today.calls_by_provider_model['deepseek:deepseek-chat'] === 1,
        'provider and model usage should be reportable',
      );
    });

    console.log("PUBLIC BETA " + passed + "/14 checks passed");
  } finally {
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

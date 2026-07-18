import { timingSafeEqual } from 'node:crypto';
import type { PublicBetaConfig } from './config.ts';
import type {
  FeedbackRecord,
  GenerationRunRecord,
  ModelCallRecord,
  StoredAnalyticsEvent,
} from './repository.ts';

export interface DailyPublicBetaCounters {
  requests: number;
  tokenBudget: number;
  inputTokens: number;
  outputTokens: number;
}

interface FlowAttempt {
  key: string;
  flowId: string;
  anonymousUserId: string;
  sessionId: string;
  started: boolean;
  completed: boolean;
  maxStep: number;
  exitStep?: number;
  elapsedMs?: number;
}

export function isAdminMetricsAuthorized(
  provided: string,
  expected: string | undefined,
) {
  if (!expected || !provided) return false;
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function ratio(numerator: number, denominator: number) {
  return denominator > 0 ? Number((numerator / denominator).toFixed(4)) : 0;
}

function average(values: number[]) {
  return values.length
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : 0;
}

function percentile(values: number[], ratioValue: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * ratioValue) - 1),
  );
  return sorted[index];
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function uniqueUsers(events: StoredAnalyticsEvent[], eventName: string) {
  return new Set(
    events
      .filter((event) => event.event_name === eventName)
      .map((event) => event.anonymous_user_id),
  );
}

function attemptKey(event: StoredAnalyticsEvent) {
  if (!event.flow_id) return null;
  return [
    event.anonymous_user_id,
    event.session_id,
    event.flow_id,
  ].join(':');
}

function buildAttempts(events: StoredAnalyticsEvent[]) {
  const attempts = new Map<string, FlowAttempt>();
  const ordered = [...events].sort((left, right) => (
    Date.parse(left.timestamp) - Date.parse(right.timestamp)
  ));
  for (const event of ordered) {
    const key = attemptKey(event);
    if (!key || !event.flow_id) continue;
    const attempt = attempts.get(key) || {
      key,
      flowId: event.flow_id,
      anonymousUserId: event.anonymous_user_id,
      sessionId: event.session_id,
      started: false,
      completed: false,
      maxStep: 0,
    };
    if (event.event_name === 'flow_started') attempt.started = true;
    if (
      event.event_name === 'step_interacted'
      || event.event_name === 'step_completed'
      || event.event_name === 'flow_exited'
    ) {
      attempt.maxStep = Math.max(attempt.maxStep, event.step_index || 0);
    }
    if (event.event_name === 'flow_exited') {
      attempt.exitStep = event.step_index || 0;
    }
    if (event.event_name === 'flow_completed') {
      attempt.completed = true;
      attempt.elapsedMs = event.elapsed_ms;
    }
    attempts.set(key, attempt);
  }
  return Array.from(attempts.values()).filter((attempt) => attempt.started);
}

function exitsByStep(attempts: FlowAttempt[]) {
  const exits: Record<string, number> = {};
  for (const attempt of attempts.filter((item) => !item.completed)) {
    const stepNumber = String((attempt.exitStep ?? attempt.maxStep) + 1);
    exits[stepNumber] = (exits[stepNumber] || 0) + 1;
  }
  return exits;
}

function exitRatesByStep(attempts: FlowAttempt[]) {
  const counts = exitsByStep(attempts);
  return Object.fromEntries(
    Object.entries(counts).map(([step, count]) => [
      step,
      ratio(count, attempts.length),
    ]),
  );
}

function authoritativeServerEventCount(
  events: StoredAnalyticsEvent[],
  eventName: string,
) {
  const matching = events.filter((event) => event.event_name === eventName);
  const serverEvents = matching.filter((event) => event.event_id.startsWith('server_'));
  return serverEvents.length || matching.length;
}

function mostCommonExit(exits: Record<string, number>) {
  const entries = Object.entries(exits);
  if (entries.length === 0) return null;
  entries.sort((left, right) => right[1] - left[1] || Number(left[0]) - Number(right[0]));
  return Number(entries[0][0]);
}

export function buildPublicBetaMetrics({
  config,
  events,
  feedback,
  modelCalls,
  generationRuns,
  counters,
  now = new Date(),
}: {
  config: PublicBetaConfig;
  events: StoredAnalyticsEvent[];
  feedback: FeedbackRecord[];
  modelCalls: ModelCallRecord[];
  generationRuns: GenerationRunRecord[];
  counters: DailyPublicBetaCounters;
  now?: Date;
}) {
  const day = now.toISOString().slice(0, 10);
  const todayEvents = events.filter((event) => event.timestamp.startsWith(day));
  const todayCalls = modelCalls.filter((call) => call.createdAt.startsWith(day));
  const todayRuns = generationRuns.filter((run) => run.createdAt.startsWith(day));
  const attempts = buildAttempts(events);
  const pageViewUsers = uniqueUsers(events, 'page_view');
  const startedUsers = uniqueUsers(events, 'flow_started');
  const completedUsers = uniqueUsers(events, 'flow_completed');
  const nextTopicUsers = uniqueUsers(events, 'next_topic_clicked');
  const secondFlowUsers = uniqueUsers(events, 'second_flow_started');
  const hubUsers = uniqueUsers(events, 'hub_opened');
  const allExitCounts = exitsByStep(attempts);
  const allExitRates = exitRatesByStep(attempts);
  const feedbackCounts = countBy(feedback.map((item) => item.rating));

  const flowIds = new Set([
    ...attempts.map((attempt) => attempt.flowId),
    ...feedback.map((item) => item.flowId).filter(Boolean) as string[],
  ]);
  const perFlow = Array.from(flowIds).sort().map((flowId) => {
    const flowAttempts = attempts.filter((attempt) => attempt.flowId === flowId);
    const completedAttempts = flowAttempts.filter((attempt) => attempt.completed);
    const flowFeedback = feedback.filter((item) => item.flowId === flowId);
    const exitCounts = exitsByStep(flowAttempts);
    const confused = flowFeedback.filter((item) => item.rating === 'confused').length;
    return {
      flow_id: flowId,
      starts: flowAttempts.length,
      completions: completedAttempts.length,
      completion_rate: ratio(completedAttempts.length, flowAttempts.length),
      average_completion_ms: average(
        completedAttempts
          .map((attempt) => attempt.elapsedMs)
          .filter((value): value is number => typeof value === 'number'),
      ),
      exits_by_step: exitCounts,
      exit_rates_by_step: exitRatesByStep(flowAttempts),
      easiest_exit_step: mostCommonExit(exitCounts),
      feedback_total: flowFeedback.length,
      confused_feedback_rate: ratio(confused, flowFeedback.length),
    };
  });

  const successfulRuns = todayRuns.filter((run) => run.success);
  const cacheRuns = todayRuns.filter((run) => run.cacheHit);
  const fallbackRuns = todayRuns.filter((run) => run.fallback);
  const estimatedCostUsd = todayCalls.reduce(
    (sum, call) => sum + call.estimatedCostUsd,
    0,
  );
  const generationLatencies = todayRuns.map((run) => run.latencyMs);

  return {
    generated_at: now.toISOString(),
    mode: config.effectiveMode,
    core_metrics: {
      start_rate: ratio(startedUsers.size, pageViewUsers.size),
      completion_rate: ratio(completedUsers.size, startedUsers.size),
      continuation_rate: ratio(secondFlowUsers.size, completedUsers.size),
    },
    funnel: {
      unique_visitors: pageViewUsers.size,
      flow_started_users: startedUsers.size,
      flow_completed_users: completedUsers.size,
      next_topic_clicked_users: nextTopicUsers.size,
      second_flow_started_users: secondFlowUsers.size,
      hub_opened_users: hubUsers.size,
      next_topic_click_rate: ratio(nextTopicUsers.size, completedUsers.size),
      second_flow_start_rate: ratio(secondFlowUsers.size, completedUsers.size),
      hub_open_rate: ratio(hubUsers.size, pageViewUsers.size),
      exits_by_step: allExitCounts,
      exit_rates_by_step: allExitRates,
    },
    feedback: {
      total: feedback.length,
      by_rating: feedbackCounts,
      understood_rate: ratio(feedbackCounts.understood || 0, feedback.length),
      mostly_rate: ratio(feedbackCounts.mostly || 0, feedback.length),
      confused_rate: ratio(feedbackCounts.confused || 0, feedback.length),
    },
    content: perFlow,
    model_today: {
      generation_requests: counters.requests,
      generation_runs: todayRuns.length,
      model_calls: todayCalls.length,
      calls_by_provider_model: countBy(
        todayCalls.map((call) => call.provider + ':' + call.model),
      ),
      input_tokens: counters.inputTokens,
      output_tokens: counters.outputTokens,
      total_tokens: counters.tokenBudget,
      estimated_cost_usd: Number(estimatedCostUsd.toFixed(6)),
      generation_success_rate: ratio(successfulRuns.length, todayRuns.length),
      retry_rate: ratio(todayCalls.filter((call) => call.retry).length, todayCalls.length),
      repair_rate: ratio(todayCalls.filter((call) => call.repair).length, todayCalls.length),
      fallback_rate: ratio(fallbackRuns.length, todayRuns.length),
      cache_hit_rate: ratio(cacheRuns.length, todayRuns.length),
      average_generation_latency_ms: average(generationLatencies),
      p95_generation_latency_ms: percentile(generationLatencies, 0.95),
      rate_limited: authoritativeServerEventCount(todayEvents, 'rate_limited'),
      budget_exhausted: authoritativeServerEventCount(todayEvents, 'budget_exhausted'),
    },
  };
}

import { NextResponse } from 'next/server';
import { getPublicBetaConfig } from '@/lib/public-beta/config';
import {
  buildPublicBetaMetrics,
  isAdminMetricsAuthorized,
} from '@/lib/public-beta/metrics';
import {
  listAnalyticsEvents,
  listFeedback,
  listGenerationRuns,
  listModelCalls,
} from '@/lib/public-beta/repository';
import { getPublicBetaStore } from '@/lib/public-beta/store';

export async function GET(req: Request) {
  const config = getPublicBetaConfig();
  const authorization = req.headers.get('authorization') || '';
  const provided = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : req.headers.get('x-admin-secret') || '';
  if (!isAdminMetricsAuthorized(provided, config.adminMetricsSecret)) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const store = getPublicBetaStore(config);
  if (!store) {
    return NextResponse.json({ error: 'metrics storage unavailable' }, { status: 503 });
  }

  const [events, feedback, modelCalls, generationRuns] = await Promise.all([
    listAnalyticsEvents(5_000, config),
    listFeedback(2_000, config),
    listModelCalls(2_000, config),
    listGenerationRuns(2_000, config),
  ]);
  const day = new Date().toISOString().slice(0, 10);
  const [requests, tokenBudget, inputTokens, outputTokens] = await Promise.all([
    store.get<number>(config.namespace + ':daily:' + day + ':requests'),
    store.get<number>(config.namespace + ':daily:' + day + ':token-budget'),
    store.get<number>(config.namespace + ':daily:' + day + ':input-tokens'),
    store.get<number>(config.namespace + ':daily:' + day + ':output-tokens'),
  ]);

  return NextResponse.json(buildPublicBetaMetrics({
    config,
    events,
    feedback,
    modelCalls,
    generationRuns,
    counters: {
      requests: requests || 0,
      tokenBudget: tokenBudget || 0,
      inputTokens: inputTokens || 0,
      outputTokens: outputTokens || 0,
    },
  }), {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

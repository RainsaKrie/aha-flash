import { NextResponse } from 'next/server';
import { analyticsEventSchema } from '@/lib/analytics/events';
import { getPublicBetaConfig } from '@/lib/public-beta/config';
import { readJsonBodyWithLimit } from '@/lib/public-beta/http';
import {
  appendAnalyticsEvent,
  getPublicRequestIdentity,
} from '@/lib/public-beta/repository';
import { getPublicBetaStore } from '@/lib/public-beta/store';

const MAX_ANALYTICS_BYTES = 12 * 1024;

export async function POST(req: Request) {
  const body = await readJsonBodyWithLimit(req, MAX_ANALYTICS_BYTES);
  if (!body.ok) {
    return NextResponse.json({
      error: body.error === 'too_large'
        ? 'event payload is too large'
        : 'invalid event payload',
    }, {
      status: body.error === 'too_large' ? 413 : 400,
    });
  }
  const parsed = analyticsEventSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid event fields' }, { status: 400 });
  }

  const config = getPublicBetaConfig();
  const store = getPublicBetaStore(config);
  if (!store) {
    return NextResponse.json({
      accepted: false,
      reason: 'storage_unavailable',
    }, { status: 202 });
  }
  const identity = getPublicRequestIdentity(req, {
    anonymousUserId: parsed.data.anonymous_user_id,
    sessionId: parsed.data.session_id,
  });
  const rateKey = config.namespace
    + ':analytics-rate:'
    + identity.abuseKey
    + ':'
    + Math.floor(Date.now() / config.analyticsWindowMs);
  try {
    const rate = await store.incrementIfBelow(
      rateKey,
      1,
      config.analyticsWindowLimit,
      Math.ceil(config.analyticsWindowMs / 1000) + 60,
    );
    if (!rate.allowed) {
      return NextResponse.json({ error: 'too many events' }, { status: 429 });
    }
    const result = await appendAnalyticsEvent(parsed.data, config, store);
    return NextResponse.json({
      accepted: result.stored,
      duplicate: result.duplicate,
    }, { status: result.duplicate ? 200 : 202 });
  } catch {
    return NextResponse.json({
      accepted: false,
      reason: 'storage_unavailable',
    }, { status: 202 });
  }
}

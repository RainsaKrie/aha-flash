import { NextResponse } from 'next/server';
import { feedbackRequestSchema } from '@/lib/analytics/events';
import { getPublicBetaConfig } from '@/lib/public-beta/config';
import { readJsonBodyWithLimit } from '@/lib/public-beta/http';
import {
  appendAnalyticsEvent,
  appendFeedback,
  getPublicRequestIdentity,
} from '@/lib/public-beta/repository';
import { getPublicBetaStore } from '@/lib/public-beta/store';

const MAX_FEEDBACK_BYTES = 4 * 1024;

export async function POST(req: Request) {
  const body = await readJsonBodyWithLimit(req, MAX_FEEDBACK_BYTES);
  if (!body.ok) {
    return NextResponse.json({
      error: body.error === 'too_large' ? 'feedback is too large' : 'invalid feedback',
    }, {
      status: body.error === 'too_large' ? 413 : 400,
    });
  }
  const parsed = feedbackRequestSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid feedback fields' }, { status: 400 });
  }

  const config = getPublicBetaConfig();
  const store = getPublicBetaStore(config);
  if (!store) {
    return NextResponse.json({
      accepted: false,
      reason: 'storage_unavailable',
    }, { status: 202 });
  }

  const identity = getPublicRequestIdentity(req);
  const rateKey = config.namespace
    + ':feedback-rate:'
    + identity.abuseKey
    + ':'
    + Math.floor(Date.now() / config.feedbackWindowMs);
  const createdAt = new Date().toISOString();
  try {
    const rate = await store.incrementIfBelow(
      rateKey,
      1,
      config.feedbackWindowLimit,
      Math.ceil(config.feedbackWindowMs / 1000) + 60,
    );
    if (!rate.allowed) {
      return NextResponse.json({ error: 'too many feedback requests' }, { status: 429 });
    }

    const result = await appendFeedback({
      feedbackId: crypto.randomUUID(),
      anonymousUserId: identity.anonymousUserId,
      sessionId: identity.sessionId,
      flowId: parsed.data.flow_id,
      rating: parsed.data.rating,
      comment: parsed.data.comment || undefined,
      createdAt,
    }, config, store);
    if (result.stored) {
      await appendAnalyticsEvent({
        event_name: 'feedback_submitted',
        event_id: crypto.randomUUID(),
        anonymous_user_id: identity.anonymousUserId,
        session_id: identity.sessionId,
        timestamp: createdAt,
        route: parsed.data.flow_id ? '/flow/' + parsed.data.flow_id : '/flow',
        flow_id: parsed.data.flow_id,
        flow_source: parsed.data.flow_source,
        device_category: parsed.data.device_category,
      }, config, store);
    }
    return NextResponse.json({
      accepted: result.stored || result.duplicate,
      duplicate: result.duplicate,
    }, { status: result.duplicate ? 200 : 202 });
  } catch {
    return NextResponse.json({
      accepted: false,
      reason: 'storage_unavailable',
    }, { status: 202 });
  }
}

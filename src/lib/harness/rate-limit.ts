interface RateLimitBucket {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  limit?: number;
  windowMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

const buckets = new Map<string, RateLimitBucket>();
const DEFAULT_LIMIT = 30;
const DEFAULT_WINDOW_MS = 10 * 60 * 1000;
const MAX_BUCKETS = 5000;

function cleanupExpiredBuckets(now: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function checkRateLimit(key: string, options: RateLimitOptions = {}): RateLimitResult {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const now = Date.now();
  cleanupExpiredBuckets(now);

  const current = buckets.get(key);
  const bucket = current && current.resetAt > now ? current : { count: 0, resetAt: now + windowMs };
  bucket.count += 1;
  buckets.set(key, bucket);

  const remaining = Math.max(0, limit - bucket.count);
  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

  return {
    allowed: bucket.count <= limit,
    remaining,
    resetAt: bucket.resetAt,
    retryAfterSeconds,
  };
}

function sanitizeRateLimitKey(value: string) {
  return value.replace(/[^a-zA-Z0-9:._-]/g, "").slice(0, 96);
}

export function getRequestRateLimitKey(req: Request, scope: string, userId?: string | null) {
  const safeScope = sanitizeRateLimitKey(scope) || "request";
  if (userId) return `${safeScope}:user:${sanitizeRateLimitKey(userId)}`;
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  return `${safeScope}:ip:${sanitizeRateLimitKey(forwardedFor || realIp || "local")}`;
}

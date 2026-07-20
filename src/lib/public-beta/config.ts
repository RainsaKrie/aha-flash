export type PublicFlowMode = "static" | "invite" | "open";
export type PublicBetaStorageDriver = "none" | "local" | "upstash";

export interface PublicBetaConfig {
  requestedMode: PublicFlowMode;
  effectiveMode: PublicFlowMode;
  dynamicEnabled: boolean;
  dynamicBlockedReason?: "disabled" | "storage_unavailable";
  storageDriver: PublicBetaStorageDriver;
  storageAvailable: boolean;
  namespace: string;
  localFile: string;
  upstashUrl?: string;
  upstashToken?: string;
  dailyRequestLimit: number;
  dailyTokenLimit: number;
  clientWindowLimit: number;
  clientWindowMs: number;
  cacheTtlSeconds: number;
  analyticsWindowLimit: number;
  analyticsWindowMs: number;
  feedbackWindowLimit: number;
  feedbackWindowMs: number;
  modelTokenReservation: number;
  generationVersion: string;
  adminMetricsSecret?: string;
  inviteCodePepper?: string;
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegativeNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function normalizeMode(value: string | undefined): PublicFlowMode {
  return value === "invite" || value === "open" ? value : "static";
}

function normalizeStorageDriver(value: string | undefined, isProduction: boolean): PublicBetaStorageDriver {
  if (value === "upstash") return "upstash";
  if (value === "local" && !isProduction) return "local";
  if (!value && !isProduction) return "local";
  return "none";
}

export function getPublicBetaConfig(
  env: NodeJS.ProcessEnv = process.env,
): PublicBetaConfig {
  const isProduction = env.NODE_ENV === "production";
  const requestedMode = normalizeMode(env.PUBLIC_FLOW_MODE);
  const storageDriver = normalizeStorageDriver(env.PUBLIC_BETA_STORAGE, isProduction);
  const upstashUrl = env.UPSTASH_REDIS_REST_URL?.trim()
    || env.UPSTASH_REDIS_REST_KV_REST_API_URL?.trim();
  const upstashToken = env.UPSTASH_REDIS_REST_TOKEN?.trim()
    || env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN?.trim();
  const storageAvailable =
    storageDriver === "local" ||
    (storageDriver === "upstash" && Boolean(upstashUrl && upstashToken));
  const switchEnabled = env.DYNAMIC_GENERATION_ENABLED === "1";
  const dynamicEnabled = requestedMode !== "static" && switchEnabled && storageAvailable;
  const effectiveMode = dynamicEnabled ? requestedMode : "static";
  const dynamicBlockedReason = dynamicEnabled
    ? undefined
    : requestedMode !== "static" && switchEnabled && !storageAvailable
      ? "storage_unavailable" as const
      : "disabled" as const;

  return {
    requestedMode,
    effectiveMode,
    dynamicEnabled,
    dynamicBlockedReason,
    storageDriver,
    storageAvailable,
    namespace: env.PUBLIC_BETA_NAMESPACE?.trim() || "aha-flash:public-beta",
    localFile: env.PUBLIC_BETA_LOCAL_FILE?.trim() || "data/public-beta/store.json",
    upstashUrl,
    upstashToken,
    dailyRequestLimit: positiveInteger(env.DYNAMIC_DAILY_REQUEST_LIMIT, 20),
    dailyTokenLimit: positiveInteger(env.DYNAMIC_DAILY_TOKEN_LIMIT, 200_000),
    clientWindowLimit: positiveInteger(env.DYNAMIC_CLIENT_WINDOW_LIMIT, 3),
    clientWindowMs: positiveInteger(env.DYNAMIC_CLIENT_WINDOW_MS, 60 * 60 * 1000),
    cacheTtlSeconds: positiveInteger(env.DYNAMIC_CACHE_TTL_SECONDS, 24 * 60 * 60),
    analyticsWindowLimit: positiveInteger(env.ANALYTICS_CLIENT_WINDOW_LIMIT, 120),
    analyticsWindowMs: positiveInteger(env.ANALYTICS_CLIENT_WINDOW_MS, 60 * 1000),
    feedbackWindowLimit: positiveInteger(env.FEEDBACK_CLIENT_WINDOW_LIMIT, 10),
    feedbackWindowMs: positiveInteger(env.FEEDBACK_CLIENT_WINDOW_MS, 60 * 1000),
    modelTokenReservation: positiveInteger(env.DYNAMIC_MODEL_TOKEN_RESERVATION, 10_000),
    generationVersion: env.DYNAMIC_GENERATION_VERSION?.trim() || "v6-public-beta-1",
    adminMetricsSecret: env.ADMIN_METRICS_SECRET?.trim() || undefined,
    inviteCodePepper: env.INVITE_CODE_PEPPER?.trim() || undefined,
    inputUsdPerMillion: nonNegativeNumber(env.MODEL_INPUT_USD_PER_MILLION, 0),
    outputUsdPerMillion: nonNegativeNumber(env.MODEL_OUTPUT_USD_PER_MILLION, 0),
  };
}

export function getPublicRuntimeConfig() {
  const config = getPublicBetaConfig();
  return {
    mode: config.effectiveMode,
    dynamic_enabled: config.dynamicEnabled,
    requires_invite: config.effectiveMode === "invite",
    reason: config.dynamicBlockedReason,
  };
}

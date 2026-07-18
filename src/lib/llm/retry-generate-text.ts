import { generateText } from "ai";
import { getPublicBetaConfig } from "../public-beta/config.ts";
import { getModelAccessContext } from "../public-beta/model-context.ts";
import {
  recordModelCall,
  reserveModelTokens,
  settleModelTokens,
  stableHash,
} from "../public-beta/repository.ts";

type GenerateTextOptions = Parameters<typeof generateText>[0];
type GenerateTextOutput = NonNullable<GenerateTextOptions["output"]>;

const TRANSIENT_GENERATION_ERROR = /(500|502|503|timeout|timed out|aborted|ECONNRESET|ETIMEDOUT|fetch failed)/i;
const JSON_OUTPUT_RETRYABLE_ERROR = /(No object generated|could not parse|empty content|NoOutputGenerated|JSON|json)/i;
const DEFAULT_JSON_MAX_OUTPUT_TOKENS = 8192;

export interface RetryGenerateTextOptions {
  maxRetries?: number;
  timeoutMs?: number;
  jsonOutput?: boolean;
  jsonName?: string;
  jsonDescription?: string;
  operation?: string;
  repair?: boolean;
}

let modelInvocationCountForTests = 0;

export function getModelInvocationCountForTests() {
  return modelInvocationCountForTests;
}

export function resetModelInvocationCountForTests() {
  modelInvocationCountForTests = 0;
}

function categorizeModelError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/timeout|timed out|ETIMEDOUT/i.test(message)) return "timeout";
  if (/429|rate.?limit/i.test(message)) return "provider_rate_limit";
  if (/401|403|auth|api.?key/i.test(message)) return "provider_auth";
  if (/json|parse|object generated|empty content/i.test(message)) return "invalid_output";
  if (/500|502|503|fetch failed|ECONNRESET/i.test(message)) return "provider_unavailable";
  return "model_error";
}

function makeJsonTextOutput({ name, description }: { name?: string; description?: string }): GenerateTextOutput {
  return {
    name: "json",
    responseFormat: Promise.resolve({
      type: "json" as const,
      ...(name ? { name } : {}),
      ...(description ? { description } : {}),
    }),
    async parseCompleteOutput({ text }: { text: string }) {
      if (!text.trim()) throw new Error("DeepSeek JSON Output returned empty content");
      JSON.parse(text);
      return text;
    },
    async parsePartialOutput({ text }: { text: string }) {
      return text ? { partial: text } : undefined;
    },
    createElementStreamTransform() {
      return undefined;
    },
  } as GenerateTextOutput;
}

function modelMetadata(options: GenerateTextOptions) {
  const model = options.model as unknown as {
    provider?: string;
    modelId?: string;
  };
  return {
    provider: model.provider || 'unknown',
    model: model.modelId || 'unknown',
  };
}

export async function retryGenerateText(
  options: GenerateTextOptions,
  {
    maxRetries = 1,
    timeoutMs = 45_000,
    jsonOutput: shouldUseJsonOutput = false,
    jsonName,
    jsonDescription,
    operation = "generation",
    repair = false,
  }: RetryGenerateTextOptions = {},
): Promise<Awaited<ReturnType<typeof generateText>>> {
  const context = getModelAccessContext();
  if (!context || (!context.allowed && !context.internalBypass)) {
    throw new Error("Model access is not authorized for this request.");
  }
  const timeoutOptions = options.timeout === undefined ? { ...options, timeout: timeoutMs } : options;
  const requestOptions = shouldUseJsonOutput
    ? {
        ...timeoutOptions,
        maxOutputTokens: timeoutOptions.maxOutputTokens ?? DEFAULT_JSON_MAX_OUTPUT_TOKENS,
        output: timeoutOptions.output ?? makeJsonTextOutput({ name: jsonName, description: jsonDescription }),
      }
    : timeoutOptions;
  const metadata = modelMetadata(options);

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const isRetry = attempt > 0;
    const config = getPublicBetaConfig();
    const reservation = context.internalBypass ? null : await reserveModelTokens(config);
    if (!context.internalBypass && !reservation) {
      context.budgetExhausted = true;
      throw new Error("Public beta model token budget is exhausted.");
    }
    context.modelCallCount += 1;
    if (isRetry) context.retryCount += 1;
    if (repair && attempt === 0) context.repairCount += 1;
    modelInvocationCountForTests += 1;
    const startedAt = Date.now();
    let observedInputTokens = 0;
    let observedOutputTokens = 0;
    let observedTotalTokens = 0;
    try {
      const result = await generateText(requestOptions);
      observedInputTokens = result.usage.inputTokens || 0;
      observedOutputTokens = result.usage.outputTokens || 0;
      observedTotalTokens =
        result.usage.totalTokens || observedInputTokens + observedOutputTokens;
      if (shouldUseJsonOutput && !result.text.trim()) {
        throw new Error("DeepSeek JSON Output returned empty content");
      }
      if (reservation) {
        await settleModelTokens(reservation, {
          inputTokens: observedInputTokens,
          outputTokens: observedOutputTokens,
          totalTokens: observedTotalTokens,
        });
        await recordModelCall({
          requestId: context.requestId,
          callType: context.callType,
          operation,
          provider: metadata.provider,
          model: metadata.model,
          anonymousUserHash: stableHash(context.anonymousUserId).slice(0, 24),
          sessionHash: stableHash(context.sessionId).slice(0, 24),
          flowId: context.flowId,
          attempt: attempt + 1,
          retry: isRetry,
          repair,
          success: true,
          inputTokens: observedInputTokens,
          outputTokens: observedOutputTokens,
          totalTokens: observedTotalTokens,
          durationMs: Date.now() - startedAt,
          estimatedCostUsd:
            observedInputTokens * config.inputUsdPerMillion / 1_000_000
            + observedOutputTokens * config.outputUsdPerMillion / 1_000_000,
          createdAt: new Date().toISOString(),
        }, config);
      }
      return result;
    } catch (error) {
      if (reservation) {
        await Promise.allSettled([
          settleModelTokens(reservation, {
            inputTokens: observedInputTokens,
            outputTokens: observedOutputTokens,
            totalTokens: observedTotalTokens,
          }),
          recordModelCall({
            requestId: context.requestId,
            callType: context.callType,
            operation,
            provider: metadata.provider,
            model: metadata.model,
            anonymousUserHash: stableHash(context.anonymousUserId).slice(0, 24),
            sessionHash: stableHash(context.sessionId).slice(0, 24),
            flowId: context.flowId,
            attempt: attempt + 1,
            retry: isRetry,
            repair,
            success: false,
            inputTokens: observedInputTokens,
            outputTokens: observedOutputTokens,
            totalTokens: observedTotalTokens,
            durationMs: Date.now() - startedAt,
            estimatedCostUsd:
              observedInputTokens * config.inputUsdPerMillion / 1_000_000
              + observedOutputTokens * config.outputUsdPerMillion / 1_000_000,
            errorCategory: categorizeModelError(error),
            createdAt: new Date().toISOString(),
          }, config),
        ]);
      }
      if (attempt === maxRetries) throw error;
      const message = error instanceof Error ? error.message : String(error);
      const shouldRetryJsonOutput = shouldUseJsonOutput && JSON_OUTPUT_RETRYABLE_ERROR.test(message);
      if (!TRANSIENT_GENERATION_ERROR.test(message) && !shouldRetryJsonOutput) throw error;
      await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
    }
  }

  throw new Error("unreachable");
}

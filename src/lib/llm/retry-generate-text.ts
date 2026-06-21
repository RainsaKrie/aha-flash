import { generateText } from "ai";

const TRANSIENT_GENERATION_ERROR = /(500|502|503|timeout|timed out|aborted|ECONNRESET|ETIMEDOUT|fetch failed)/i;

export interface RetryGenerateTextOptions {
  maxRetries?: number;
  timeoutMs?: number;
}

export async function retryGenerateText(
  options: Parameters<typeof generateText>[0],
  { maxRetries = 1, timeoutMs = 45_000 }: RetryGenerateTextOptions = {},
): Promise<Awaited<ReturnType<typeof generateText>>> {
  const requestOptions = options.timeout === undefined ? { ...options, timeout: timeoutMs } : options;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await generateText(requestOptions);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const message = error instanceof Error ? error.message : String(error);
      if (!TRANSIENT_GENERATION_ERROR.test(message)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
    }
  }

  throw new Error("unreachable");
}
import { generateText } from "ai";

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

export async function retryGenerateText(
  options: GenerateTextOptions,
  {
    maxRetries = 1,
    timeoutMs = 45_000,
    jsonOutput: shouldUseJsonOutput = false,
    jsonName,
    jsonDescription,
  }: RetryGenerateTextOptions = {},
): Promise<Awaited<ReturnType<typeof generateText>>> {
  const timeoutOptions = options.timeout === undefined ? { ...options, timeout: timeoutMs } : options;
  const requestOptions = shouldUseJsonOutput
    ? {
        ...timeoutOptions,
        maxOutputTokens: timeoutOptions.maxOutputTokens ?? DEFAULT_JSON_MAX_OUTPUT_TOKENS,
        output: timeoutOptions.output ?? makeJsonTextOutput({ name: jsonName, description: jsonDescription }),
      }
    : timeoutOptions;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const result = await generateText(requestOptions);
      if (shouldUseJsonOutput && !result.text.trim()) {
        throw new Error("DeepSeek JSON Output returned empty content");
      }
      return result;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const message = error instanceof Error ? error.message : String(error);
      const shouldRetryJsonOutput = shouldUseJsonOutput && JSON_OUTPUT_RETRYABLE_ERROR.test(message);
      if (!TRANSIENT_GENERATION_ERROR.test(message) && !shouldRetryJsonOutput) throw error;
      await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
    }
  }

  throw new Error("unreachable");
}

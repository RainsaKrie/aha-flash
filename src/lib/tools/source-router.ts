import type { SourceContext } from "@/types/tool";
import { webContentExtract } from "./web-extractor";
import { youtubeTranscriptFetch } from "./youtube-transcript";

const URL_REGEX = /https?:\/\/[^\s)）]+/gi;

function extractUrls(input: string) {
  return [...input.matchAll(URL_REGEX)].map((match) => match[0]);
}

function isYoutubeUrl(url: string) {
  return /youtube\.com|youtu\.be/i.test(url);
}

function normalizeToolResult(url: string, result: unknown): SourceContext {
  const data = result as Partial<SourceContext> & {
    source_url?: string;
    success?: boolean;
    text?: string;
    title?: string;
    excerpt?: string;
    error?: string;
  };

  return {
    type: isYoutubeUrl(url) ? "youtube" : "web",
    url: data.source_url || url,
    title: data.title,
    excerpt: data.excerpt,
    text: data.text,
    success: Boolean(data.success),
    error: data.error,
  };
}

export async function collectSourceContexts(input: string): Promise<SourceContext[]> {
  const urls = extractUrls(input).slice(0, 2);

  const results = await Promise.all(
    urls.map(async (url) => {
      const result = isYoutubeUrl(url)
        ? await youtubeTranscriptFetch({ video_url: url })
        : await webContentExtract({ url, max_chars: 2500 });

      return normalizeToolResult(url, result);
    }),
  );

  return results;
}

export function buildSourcePromptContext(sources: SourceContext[]) {
  const usable = sources.filter((source) => source.success && source.text);
  if (!usable.length) return "";

  return `
<source_context>
${usable
  .map(
    (source, index) => `
  <source index="${index + 1}" type="${source.type}" url="${source.url}">
    <title>${source.title || "外部来源"}</title>
    <excerpt>${source.excerpt || ""}</excerpt>
    <text>${source.text?.slice(0, 2500) || ""}</text>
  </source>`,
  )
  .join("\n")}
</source_context>
`.trim();
}

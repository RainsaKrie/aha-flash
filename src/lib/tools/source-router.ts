import type { SourceContext } from "@/types/tool";
import { webContentExtract } from "./web-extractor";
import { webSearch } from "./web-search";
import { youtubeTranscriptFetch } from "./youtube-transcript";

const URL_REGEX = /https?:\/\/[^\s)）]+/gi;

function extractUrls(input: string) {
  return [...input.matchAll(URL_REGEX)].map((match) => match[0]);
}

function isYoutubeUrl(url: string) {
  return /youtube\.com|youtu\.be/i.test(url);
}

function shouldSearch(input: string) {
  if (extractUrls(input).length) return false;
  return /最新|最近|当前|今年|今天|昨日|昨天|新闻|看法|观点|评价|数据|价格|政策|法规|巴菲特|马斯克|OpenAI|DeepSeek/i.test(
    input,
  );
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

function normalizeSearchResult(input: string, result: unknown): SourceContext[] {
  const data = result as {
    success?: boolean;
    provider?: string;
    query?: string;
    answer?: string;
    results?: Array<{ title?: string; url?: string; content?: string }>;
    error?: string;
  };

  if (!data.success || !data.results?.length) {
    return [
      {
        type: "search",
        url: "",
        title: data.query || input,
        provider: data.provider,
        success: false,
        error: data.error || "search failed",
      },
    ];
  }

  return data.results.slice(0, 5).map((item, index) => ({
    type: "search",
    url: item.url || "",
    title: item.title || `搜索结果 ${index + 1}`,
    excerpt: item.content || data.answer,
    text: [data.answer, item.content].filter(Boolean).join("\n").slice(0, 1200),
    provider: data.provider,
    success: Boolean(item.url),
  }));
}

export async function collectSourceContexts(input: string): Promise<SourceContext[]> {
  const urls = extractUrls(input).slice(0, 2);

  if (!urls.length && shouldSearch(input)) {
    const result = await webSearch({ query: input, max_results: 5 });
    return normalizeSearchResult(input, result);
  }

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

interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
  score?: number;
}

interface TavilyResponse {
  answer?: string;
  results?: TavilyResult[];
}

function clampResultCount(value: unknown) {
  const parsed = Number(value || 5);
  if (!Number.isFinite(parsed)) return 5;
  return Math.min(Math.max(Math.round(parsed), 1), 5);
}

export async function webSearch(args: Record<string, unknown>) {
  const query = String(args.query || "").trim();
  const maxResults = clampResultCount(args.max_results);
  const apiKey = process.env.TAVILY_API_KEY;

  if (!query) return { success: false, error: "query is required" };
  if (!apiKey) return { success: false, error: "TAVILY_API_KEY is not configured", query };

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        search_depth: "basic",
        topic: "general",
        include_answer: true,
        include_raw_content: false,
        max_results: maxResults,
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        query,
        error: `search failed: ${response.status}`,
      };
    }

    const data = (await response.json()) as TavilyResponse;
    const results = (data.results || [])
      .filter((item) => item.url)
      .slice(0, maxResults)
      .map((item) => ({
        title: item.title || item.url,
        url: item.url,
        content: item.content || "",
        score: item.score,
      }));

    return {
      success: results.length > 0,
      query,
      answer: data.answer || "",
      results,
      error: results.length ? undefined : "no search results",
    };
  } catch (error) {
    return { success: false, query, error: `search failed: ${String(error)}` };
  }
}

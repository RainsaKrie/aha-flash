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

interface SearchResult {
  title?: string;
  url?: string;
  content?: string;
  score?: number;
}

interface SearchProviderResult {
  success: boolean;
  provider: string;
  query: string;
  answer?: string;
  results?: SearchResult[];
  error?: string;
}

interface BraveResponse {
  web?: {
    results?: Array<{
      title?: string;
      url?: string;
      description?: string;
      extra_snippets?: string[];
    }>;
  };
}

interface GoogleResponse {
  items?: Array<{
    title?: string;
    link?: string;
    snippet?: string;
  }>;
  searchInformation?: {
    totalResults?: string;
  };
}

function clampResultCount(value: unknown) {
  const parsed = Number(value || 5);
  if (!Number.isFinite(parsed)) return 5;
  return Math.min(Math.max(Math.round(parsed), 1), 5);
}

function getProviderOrder(requested: string) {
  if (requested && requested !== "auto") return [requested];
  return ["brave", "google", "tavily"];
}

async function searchWithBrave(query: string, maxResults: number): Promise<SearchProviderResult> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return { success: false, provider: "brave", query, error: "BRAVE_SEARCH_API_KEY is not configured" };

  try {
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(maxResults));
    url.searchParams.set("text_decorations", "false");
    url.searchParams.set("safesearch", "moderate");

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
    });

    if (!response.ok) return { success: false, provider: "brave", query, error: `search failed: ${response.status}` };

    const data = (await response.json()) as BraveResponse;
    const results = (data.web?.results || [])
      .filter((item) => item.url)
      .slice(0, maxResults)
      .map((item) => ({
        title: item.title || item.url,
        url: item.url,
        content: [item.description, ...(item.extra_snippets || [])].filter(Boolean).join("\n"),
      }));

    return {
      success: results.length > 0,
      provider: "brave",
      query,
      results,
      error: results.length ? undefined : "no search results",
    };
  } catch (error) {
    return { success: false, provider: "brave", query, error: `search failed: ${String(error)}` };
  }
}

async function searchWithGoogle(query: string, maxResults: number): Promise<SearchProviderResult> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const engineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
  if (!apiKey || !engineId) {
    return {
      success: false,
      provider: "google",
      query,
      error: "GOOGLE_SEARCH_API_KEY or GOOGLE_SEARCH_ENGINE_ID is not configured",
    };
  }

  try {
    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("cx", engineId);
    url.searchParams.set("q", query);
    url.searchParams.set("num", String(maxResults));

    const response = await fetch(url);
    if (!response.ok) return { success: false, provider: "google", query, error: `search failed: ${response.status}` };

    const data = (await response.json()) as GoogleResponse;
    const results = (data.items || [])
      .filter((item) => item.link)
      .slice(0, maxResults)
      .map((item) => ({
        title: item.title || item.link,
        url: item.link,
        content: item.snippet || "",
      }));

    return {
      success: results.length > 0,
      provider: "google",
      query,
      results,
      error: results.length ? undefined : "no search results",
    };
  } catch (error) {
    return { success: false, provider: "google", query, error: `search failed: ${String(error)}` };
  }
}

async function searchWithTavily(query: string, maxResults: number): Promise<SearchProviderResult> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return { success: false, provider: "tavily", query, error: "TAVILY_API_KEY is not configured" };

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

    if (!response.ok) return { success: false, provider: "tavily", query, error: `search failed: ${response.status}` };

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
      provider: "tavily",
      query,
      answer: data.answer || "",
      results,
      error: results.length ? undefined : "no search results",
    };
  } catch (error) {
    return { success: false, provider: "tavily", query, error: `search failed: ${String(error)}` };
  }
}

async function searchWithProvider(provider: string, query: string, maxResults: number) {
  if (provider === "brave") return searchWithBrave(query, maxResults);
  if (provider === "google") return searchWithGoogle(query, maxResults);
  if (provider === "tavily") return searchWithTavily(query, maxResults);
  return { success: false, provider, query, error: `Unknown search provider: ${provider}` };
}

export async function webSearch(args: Record<string, unknown>) {
  const query = String(args.query || "").trim();
  const maxResults = clampResultCount(args.max_results);
  const requestedProvider = String(args.provider || process.env.WEB_SEARCH_PROVIDER || "auto").toLowerCase();

  if (!query) return { success: false, error: "query is required" };

  const attempts = [];
  for (const provider of getProviderOrder(requestedProvider)) {
    const result = await searchWithProvider(provider, query, maxResults);
    attempts.push({ provider: result.provider, success: result.success, error: result.error });
    if (result.success) {
      return {
        ...result,
        attempts,
      };
    }
  }

  return {
    success: false,
    provider: requestedProvider,
    query,
    attempts,
    error: attempts.map((item) => `${item.provider}: ${item.error}`).join("; "),
  };
}

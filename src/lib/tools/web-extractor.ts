import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

export async function webContentExtract(args: Record<string, unknown>) {
  const url = String(args.url || "");
  const maxChars = Number(args.max_chars || 3000);

  if (!url) return { success: false, error: "url is required" };

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "aha-flash/1.0 Knowledge Bot" },
    });
    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const article = new Readability(dom.window.document).parse();

    if (!article) return { success: false, error: "无法提取网页正文" };

    return {
      success: true,
      title: article.title,
      excerpt: article.excerpt,
      text: (article.textContent ?? "").slice(0, maxChars),
      source_url: url,
    };
  } catch (error) {
    return { success: false, error: `提取失败: ${String(error)}` };
  }
}

import { YoutubeTranscript } from "youtube-transcript";

export async function youtubeTranscriptFetch(args: Record<string, unknown>) {
  const videoUrl = String(args.video_url || "");
  if (!videoUrl) return { success: false, error: "video_url is required" };

  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoUrl);
    const text = transcript
      .map((item: { text: string }) => item.text)
      .join(" ")
      .slice(0, 5000);

    return { success: true, text, source_url: videoUrl };
  } catch (error) {
    return { success: false, error: `无法获取字幕: ${String(error)}` };
  }
}

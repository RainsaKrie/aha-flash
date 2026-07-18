export type JsonBodyResult =
  | { ok: true; value: unknown }
  | { ok: false; error: 'too_large' | 'invalid_json' };

export async function readJsonBodyWithLimit(
  req: Request,
  maxBytes: number,
): Promise<JsonBodyResult> {
  const contentLength = Number(req.headers.get('content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return { ok: false, error: 'too_large' };
  }
  const raw = await req.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    return { ok: false, error: 'too_large' };
  }
  try {
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch {
    return { ok: false, error: 'invalid_json' };
  }
}

import { parseIcs } from "@/lib/ical/import";
import { normalizeIcsUrl } from "@/lib/ical/source";

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const DAY_MS = 24 * 60 * 60_000;

/**
 * iCal の非公開 URL から予定を取り込む。
 * URL は秘密情報なので、クエリではなく本文で受け取り、ログにも残さない。
 * 本文: { url: string, from?: number, to?: number }（from/to は epoch ミリ秒）
 */
export async function POST(request: Request) {
  let body: { url?: unknown; from?: unknown; to?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "本文を JSON で送ってください。" }, { status: 400 });
  }

  const url = typeof body.url === "string" ? normalizeIcsUrl(body.url) : undefined;
  if (!url) {
    return Response.json(
      { error: "Google カレンダーか iCloud の、https で始まる iCal の URL を入力してください。" },
      { status: 400 },
    );
  }
  const now = Date.now();
  const from = typeof body.from === "number" ? body.from : now - DAY_MS;
  const to = typeof body.to === "number" ? body.to : now + 16 * DAY_MS;

  let text: string;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    // 転送された先も、許可した配信元であること
    if (!res.ok || !normalizeIcsUrl(res.url || url.href)) {
      return Response.json({ error: `取り込みに失敗しました（${res.status}）。URL を確かめてください。` }, { status: 502 });
    }
    if (Number(res.headers.get("content-length") ?? 0) > MAX_BYTES) {
      return Response.json({ error: "カレンダーが大きすぎて取り込めません。" }, { status: 413 });
    }
    text = await res.text();
    if (text.length > MAX_BYTES) {
      return Response.json({ error: "カレンダーが大きすぎて取り込めません。" }, { status: 413 });
    }
  } catch {
    return Response.json({ error: "カレンダーに接続できませんでした。時間をおいて試してください。" }, { status: 502 });
  }

  try {
    const events = parseIcs(text, { from, to }, 540, "google");
    return Response.json({ events, fetchedAt: now });
  } catch {
    return Response.json({ error: "iCal 形式として読み取れませんでした。" }, { status: 422 });
  }
}

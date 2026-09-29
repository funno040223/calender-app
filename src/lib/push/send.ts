import webpush from "web-push";
import type { Notice } from "@/lib/notify/build";

/** サーバーからだけ使う。鍵は環境変数（NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY） */

export interface PushTarget {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export type PushPayload = Pick<Notice, "title" | "body" | "url"> & { tag?: string };

let configured = false;
function configure() {
  if (configured) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) throw new Error("通知の鍵（VAPID）が設定されていません。");
  // 通知の送り先（Apple など）に伝える連絡先。サイトの URL にしておく
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "https://calender-app-umber.vercel.app", pub, priv);
  configured = true;
}

/** 送れたら "ok"、端末が通知を止めた（登録を消してよい）なら "gone" */
export async function sendPush(target: PushTarget, payload: PushPayload): Promise<"ok" | "gone" | "error"> {
  configure();
  try {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(payload),
      { TTL: 30 * 60, urgency: "high", timeout: 15_000 },
    );
    return "ok";
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return "gone";
    console.warn("通知を送れませんでした", status ?? (e instanceof Error ? e.message : e));
    return "error";
  }
}

/** 画面から保存された一覧なので、形と長さを確かめてから使う */
export function cleanNotices(raw: unknown): Notice[] {
  if (!Array.isArray(raw)) return [];
  const out: Notice[] = [];
  for (const x of raw.slice(0, 500)) {
    if (!x || typeof x !== "object") continue;
    const n = x as Record<string, unknown>;
    if (typeof n.key !== "string" || typeof n.at !== "number" || typeof n.title !== "string") continue;
    const url = typeof n.url === "string" && n.url.startsWith("/") && !n.url.startsWith("//") ? n.url : "/";
    out.push({
      key: n.key.slice(0, 200),
      at: n.at,
      title: n.title.slice(0, 100),
      body: typeof n.body === "string" ? n.body.slice(0, 300) : "",
      url,
    });
  }
  return out;
}

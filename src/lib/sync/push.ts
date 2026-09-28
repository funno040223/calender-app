import { createClient } from "@/lib/supabase/client";
import type { Notice } from "@/lib/notify/build";

/** 通知（Web Push）：この端末の登録と、これから送る通知の一覧の保存 */

let client: ReturnType<typeof createClient> | undefined;
const db = () => (client ??= createClient());

async function userId(): Promise<string> {
  const { data } = await db().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("ログインしていません");
  return id;
}

export type PushSupport = "ok" | "needs-home-screen" | "unsupported";

/** iPhone はホーム画面に追加したアプリでないと通知を受け取れない */
export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  if (ios && !standalone) return "needs-home-screen";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  return "ok";
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const b64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** ボタンを押したときに呼ぶ（iPhone は操作の中でしか許可を聞けない） */
export async function subscribePush(): Promise<void> {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) throw new Error("通知の鍵が設定されていません（NEXT_PUBLIC_VAPID_PUBLIC_KEY）。");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("通知が許可されませんでした。iPhone の「設定」→「通知」から許可できます。");
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }));
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error("通知の登録に失敗しました。");
  const { error } = await db()
    .from("push_subscriptions")
    .upsert(
      { user_id: await userId(), endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, device: deviceName() },
      { onConflict: "user_id,endpoint" },
    );
  if (error) throw new Error("通知の登録を保存できませんでした。");
}

export async function unsubscribePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await db().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}

export async function sendTestPush(): Promise<number> {
  const res = await fetch("/api/push/test", { method: "POST" });
  const body = (await res.json().catch(() => ({}))) as { sent?: number; error?: string };
  if (!res.ok) throw new Error(body.error ?? "テスト通知を送れませんでした。");
  return body.sent ?? 0;
}

export async function saveSchedule(items: Notice[]): Promise<void> {
  const { error } = await db().from("push_schedule").upsert({ user_id: await userId(), items, updated_at: new Date().toISOString() });
  if (error) throw error;
}

function deviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Mac/.test(ua)) return "Mac";
  return "この端末";
}

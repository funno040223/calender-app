// 電波がなくても画面を開けるようにする。データは localStorage の控えから出るので、ここでは画面の部品だけを持つ
// 中身を変えたら VERSION を上げる（古い控えを消すため）
const VERSION = "v5";
// 電波がなくても移れるように、開いたときにまとめて控える画面
const SHELL = ["/", "/calendar", "/tasks", "/settings", "/settings/basic", "/settings/routine", "/settings/habits", "/settings/places", "/settings/timetable", "/settings/avoid", "/settings/treats", "/settings/calendars", "/settings/notifications", "/settings/feed"];
const PAGES = `pages-${VERSION}`;
const ASSETS = `assets-${VERSION}`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key !== PAGES && key !== ASSETS) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

// 画面から「warm」が来たら、主な画面とその部品を控え直す（公開し直すと部品の名前が変わるため、毎回）
// ログイン前は控えられないので、画面が切り替わるたびに頼まれる。うまくいったら10分は控え直さない
let warmedAt = 0;
let warming = null;
self.addEventListener("message", (event) => {
  if (event.data !== "warm" || Date.now() - warmedAt < 10 * 60 * 1000) return;
  warming ??= warm().finally(() => (warming = null));
  event.waitUntil(warming);
});

async function warm() {
  const pages = await caches.open(PAGES);
  const assets = await caches.open(ASSETS);
  for (const path of SHELL) {
    try {
      const res = await fetch(path, { credentials: "same-origin" });
      if (!res.ok || res.redirected) continue; // ログインが切れているときは控えない
      const html = await res.clone().text();
      await pages.put(path, res);
      warmedAt = Date.now();
      const parts = new Set(html.match(/\/_next\/static\/[^"'\s)]+/g) ?? []);
      for (const part of parts) {
        if (await assets.match(part)) continue;
        const r = await fetch(part);
        if (r.ok) await assets.put(part, r);
      }
    } catch {
      return; // 電波がない
    }
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // ほかのサイト（Supabase など）と API は触らない
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  // 名前に版が入っている部品は、一度取れば変わらない
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(req));
    return;
  }
  if (req.mode === "navigate") event.respondWith(networkFirst(req));
});

async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(ASSETS)).put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(PAGES);
  const key = new URL(req.url).pathname;
  try {
    const res = await fetch(req);
    // ログイン画面へ回されたもの（redirected）は、その画面の控えにしない
    if (res.ok && !res.redirected) cache.put(key, res.clone());
    return res;
  } catch {
    const hit = await cache.match(key);
    if (hit) return hit;
    return new Response(
      "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><title>オフライン</title>" +
        "<p style='font-family:system-ui;padding:24px'>電波がありません。つながってから開き直してください。</p>",
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
}

// 通知を受け取って出す（サーバーの /api/push/dispatch から届く）
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: event.data?.text() ?? "リズム カレンダー" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "リズム カレンダー", {
      body: data.body || "",
      tag: data.tag,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/" },
    }),
  );
});

// 押したら、開いているアプリに切り替える（なければ開く）
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const win = wins.find((w) => new URL(w.url).origin === self.location.origin);
      if (win) {
        await win.focus();
        return win.navigate(url).catch(() => undefined);
      }
      return self.clients.openWindow(url);
    })(),
  );
});

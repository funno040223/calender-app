"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * 電波がなくても開けるようにする仕組み（public/sw.js）を登録し、画面が切り替わるたびに控え直しを頼む
 * （ログインしたあとの画面の切り替えは読み込み直しにならないため）。開発中は部品が毎回変わるので登録しない
 */
export default function ServiceWorker() {
  const pathname = usePathname();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((e) => {
      console.warn("service worker の登録に失敗しました", e instanceof Error ? e.message : e);
    });
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    if (pathname === "/login" || !navigator.onLine) return;
    void navigator.serviceWorker.ready.then((reg) => reg.active?.postMessage("warm"));
  }, [pathname]);

  return null;
}

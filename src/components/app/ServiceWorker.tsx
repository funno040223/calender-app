"use client";

import { useEffect } from "react";

/** 電波がなくても開けるようにする仕組み（public/sw.js）を登録する。開発中は部品が毎回変わるので登録しない */
export default function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        if (navigator.onLine) reg.active?.postMessage("warm");
      })
      .catch((e) => {
        console.warn("service worker の登録に失敗しました", e instanceof Error ? e.message : e);
      });
  }, []);
  return null;
}

"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/** 電波がないときだけ出す。変更はこの端末に残り、つながったら送る */
export default function OfflineNotice() {
  const offline = useSyncExternalStore(
    subscribe,
    () => !navigator.onLine,
    () => false,
  );
  if (!offline) return null;
  return (
    <p role="status" className="shrink-0 border-t border-line bg-grouped px-4 py-1.5 text-center text-[12px] text-muted">
      オフラインです。この端末の控えを表示しています（つながったら保存します）
    </p>
  );
}

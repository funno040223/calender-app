"use client";

import { useEffect, type ReactNode } from "react";

/** 画面の下から出るシート（広い画面では中央のダイアログ） */
export default function Sheet({
  title,
  onClose,
  children,
  side = "bottom",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  side?: "bottom" | "left";
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const panel =
    side === "left"
      ? "absolute inset-y-0 left-0 w-[min(86vw,320px)] rounded-r-2xl"
      : "absolute inset-x-0 bottom-0 max-h-[88dvh] rounded-t-2xl sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[420px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl";

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/30 dark:bg-black/50" onClick={onClose} />
      <div className={`${panel} flex flex-col overflow-hidden bg-surface shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-[17px] font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-full px-2 py-1 text-[15px] text-accent" aria-label="閉じる">
            閉じる
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  );
}

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
      : "absolute inset-x-0 bottom-0 max-h-[90dvh] rounded-t-[22px] sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[420px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl";

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/30 dark:bg-black/50" onClick={onClose} />
      <div className={`${panel} flex flex-col overflow-hidden bg-surface shadow-2xl`}>
        {side === "bottom" && <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-line sm:hidden" aria-hidden />}
        <div className="flex items-center justify-between gap-3 px-4 pt-2 pb-2.5">
          <h2 className="min-w-0 truncate text-[17px] font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="press flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface2 text-muted"
            aria-label="閉じる"
          >
            <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden>
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  );
}

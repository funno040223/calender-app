"use client";

import dynamic from "next/dynamic";

/** 保存データ（localStorage）と画面幅を使うので、ブラウザだけで描画する */
const CalendarApp = dynamic(() => import("./CalendarApp"), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh items-center justify-center text-[15px] text-muted">読み込み中…</div>
  ),
});

export default function CalendarAppLoader() {
  return <CalendarApp />;
}

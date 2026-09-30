"use client";

import { useCallback, useEffect, useState } from "react";
import { EmptyNote, Group, PrimaryButton, Row } from "@/components/ui/controls";
import { formatDateTime } from "@/lib/mock/jst";
import { createFeed, deleteFeed, loadFeed, type FeedInfo } from "@/lib/sync/feed";

export default function Feed() {
  const [feed, setFeed] = useState<FeedInfo | null | undefined>(undefined);
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setFeed(await loadFeed());
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "読めませんでした。");
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const make = async () => {
    if (feed && !window.confirm("新しいアドレスを作ると、今のアドレスは使えなくなります（登録したカレンダーから予定が消えます）。作り直しますか？")) return;
    setBusy(true);
    setMessage("");
    try {
      setUrl(await createFeed());
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "作れませんでした。");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("コピーしました。");
    } catch {
      setMessage("コピーできませんでした。アドレスを長押し（または選択）してコピーしてください。");
    }
  };

  return (
    <>

      <Group
        title="配信のアドレス"
      >
        {feed === undefined && !message && <EmptyNote>読み込み中…</EmptyNote>}
        {feed === null && !url && <EmptyNote>まだ配信していません。</EmptyNote>}
        {feed && !url && (
          <Row label="配信中" sub={`${formatDateTime(feed.createdAt)} に作成`} detail="" />
        )}
        {url && (
          <div className="flex flex-col gap-2 px-4 py-3">
            <p className="text-[13px] text-muted">ほかの人に教えないでください。この画面を閉じると、もう表示されません。</p>
            <p className="select-all break-all rounded-lg bg-grouped px-3 py-2 font-mono text-[12px]">{url}</p>
            <div className="flex gap-4 text-[15px]">
              <button type="button" className="font-medium text-tint" onClick={() => void copy()}>
                コピー
              </button>
              <a className="font-medium text-tint" href={url.replace(/^https:/, "webcal:")}>
                iPhone のカレンダーに追加
              </a>
            </div>
          </div>
        )}
        {message && <EmptyNote>{message}</EmptyNote>}
      </Group>

      {feed !== undefined && (
        <PrimaryButton type="button" disabled={busy} onClick={() => void make()}>
          {busy ? "作っています…" : feed ? "アドレスを作り直す" : "配信のアドレスを作る"}
        </PrimaryButton>
      )}
      {feed && (
        <button
          type="button"
          disabled={busy}
          className="py-2 text-[15px] font-medium text-tint disabled:opacity-60"
          onClick={async () => {
            if (!window.confirm("配信をやめますか？登録したカレンダーから予定が消えます。")) return;
            try {
              await deleteFeed();
              setUrl("");
              await load();
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "止められませんでした。");
            }
          }}
        >
          配信をやめる
        </button>
      )}

      <Group title="Google カレンダーへの登録">
        <Row label="「他のカレンダー」の＋ →「URL で追加」" />
      </Group>
    </>
  );
}

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
        title="配信するもの"
        footer="Google カレンダーから取り込んだ予定は、もともと Google 側にあるので入れません。カレンダーアプリが読みに来るたびに組み直した内容を返します（読みに来る間隔はアプリしだいで、数分〜数時間）。"
      >
        <Row label="組んだ枠" sub="習慣・タスク・朝ルーティン" />
        <Row label="自分で入れた予定" />
        <Row label="時間割の授業" detail="出る回だけ" />
        <Row label="範囲" detail="7日前〜14日先" />
      </Group>

      <Group
        title="配信のアドレス"
        footer="このアドレスを知っている人は誰でも予定を読めます。ほかの人に教えないでください。漏れたときは作り直せば、前のアドレスは使えなくなります。"
      >
        {feed === undefined && !message && <EmptyNote>読み込み中…</EmptyNote>}
        {feed === null && !url && <EmptyNote>まだ配信していません。</EmptyNote>}
        {feed && !url && (
          <Row label="配信中" sub={`${formatDateTime(feed.createdAt)} に作成`} detail="" />
        )}
        {url && (
          <div className="flex flex-col gap-2 px-4 py-3">
            <p className="text-[13px] text-muted">アドレスはこの画面を閉じると二度と表示されません。今のうちに登録してください。</p>
            <p className="select-all break-all rounded-lg bg-grouped px-3 py-2 font-mono text-[12px]">{url}</p>
            <div className="flex gap-4 text-[15px]">
              <button type="button" className="text-accent" onClick={() => void copy()}>
                コピー
              </button>
              <a className="text-accent" href={url.replace(/^https:/, "webcal:")}>
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
          className="py-2 text-[15px] text-accent disabled:opacity-60"
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

      <Group title="登録のしかた">
        <Row label="iPhone" sub="上の「iPhone のカレンダーに追加」を押す → 照会（購読）" />
        <Row label="Google カレンダー" sub="パソコンで「他のカレンダー」の＋ →「URL で追加」にアドレスを貼る" />
      </Group>
    </>
  );
}

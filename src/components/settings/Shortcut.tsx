"use client";

import { useCallback, useEffect, useState } from "react";
import { EmptyNote, Group, PrimaryButton, Row } from "@/components/ui/controls";
import { formatDateTime } from "@/lib/mock/jst";
import { createShortcut, deleteShortcut, loadShortcut } from "@/lib/sync/shortcut";

/** iPhone のショートカット（Siri の「タスクを追加」）に入れるアドレス。作ったときに1度だけ出す */
export default function Shortcut() {
  const [feed, setFeed] = useState<{ createdAt: number } | null | undefined>(undefined);
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setFeed(await loadShortcut());
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "読めませんでした。");
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const make = async () => {
    if (feed && !window.confirm("新しいアドレスを作ると、今のアドレスは使えなくなります（ショートカットのアドレスも入れ直しになります）。作り直しますか？")) return;
    setBusy(true);
    setMessage("");
    try {
      setUrl(await createShortcut());
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
        title="ショートカットのアドレス"
      >
        {feed === undefined && !message && <EmptyNote>読み込み中…</EmptyNote>}
        {feed === null && !url && <EmptyNote>まだ作っていません。</EmptyNote>}
        {feed && !url && (
          <Row label="作成済み" sub={`${formatDateTime(feed.createdAt)} に作成`} detail="" />
        )}
        {url && (
          <div className="flex flex-col gap-2 px-4 py-3">
            <p className="text-[13px] text-muted">ほかの人に教えないでください。この画面を閉じると、もう表示されません。</p>
            <p className="select-all break-all rounded-lg bg-grouped px-3 py-2 font-mono text-[12px]">{url}</p>
            <div className="flex gap-4 text-[15px]">
              <button type="button" className="text-accent" onClick={() => void copy()}>
                コピー
              </button>
            </div>
          </div>
        )}
        {message && <EmptyNote>{message}</EmptyNote>}
      </Group>

      {feed !== undefined && (
        <PrimaryButton type="button" disabled={busy} onClick={() => void make()}>
          {busy ? "作っています…" : feed ? "アドレスを作り直す" : "アドレスを作る"}
        </PrimaryButton>
      )}
      {feed && (
        <button
          type="button"
          disabled={busy}
          className="py-2 text-[15px] text-accent disabled:opacity-60"
          onClick={async () => {
            if (!window.confirm("アドレスを消しますか？ショートカットからタスクを追加できなくなります。")) return;
            try {
              await deleteShortcut();
              setUrl("");
              await load();
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "消せませんでした。");
            }
          }}
        >
          アドレスを消す
        </button>
      )}

    </>
  );
}

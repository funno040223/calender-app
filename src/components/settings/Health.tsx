"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/app/StoreProvider";
import { EmptyNote, Group, PrimaryButton, Row } from "@/components/ui/controls";
import { formatDate, formatDateTime, formatMinutes, formatTime } from "@/lib/mock/jst";
import { createHealthToken, deleteHealthToken, loadHealthToken } from "@/lib/sync/health";

/** ヘルスケアの睡眠の取り込み：ショートカットの合言葉を作る（1度だけ表示）・止める。最後に届いた夜を見る */
export default function Health() {
  const { state } = useApp();
  const [token, setToken] = useState<{ createdAt: number } | null | undefined>(undefined);
  const [shown, setShown] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setToken(await loadHealthToken());
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "読めませんでした。");
    }
  }, []);
  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const make = async () => {
    if (token && !window.confirm("作り直すと、今の合言葉は使えなくなります（ショートカットの合言葉も入れ直します）。作り直しますか？")) return;
    setBusy(true);
    setMessage("");
    try {
      setShown(await createHealthToken());
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "作れませんでした。");
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("コピーしました。");
    } catch {
      setMessage("コピーできませんでした。長押し（または選択）してコピーしてください。");
    }
  };

  const url = typeof window === "undefined" ? "" : `${window.location.origin}/api/health/sleep`;
  const lastKey = Object.keys(state.healthSleep).sort().at(-1);
  const last = lastKey ? state.healthSleep[lastKey] : undefined;
  const copyBtn = "shrink-0 text-[15px] font-medium text-tint";

  return (
    <>
      <Group title="睡眠の取り込み">
        {token === undefined && !message && <EmptyNote>読み込み中…</EmptyNote>}
        {token === null && !shown && <EmptyNote>まだ設定していません。</EmptyNote>}
        {token && !shown && <Row label="合言葉あり" sub={`${formatDateTime(token.createdAt)} に作成`} detail="" />}
        {last && (
          <Row
            label="最後に届いた夜"
            sub={`${formatTime(last.start)}〜${formatTime(last.end)}・${formatMinutes(last.minutes)}`}
            detail={formatDate(last.end)}
          />
        )}
        {shown && (
          <div className="flex flex-col gap-3 px-4 py-3">
            <p className="text-[13px] text-muted">ほかの人に教えないでください。この画面を閉じると、合言葉はもう表示されません。</p>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-muted">送り先（URL）</span>
                <button type="button" className={copyBtn} onClick={() => void copy(url)}>
                  コピー
                </button>
              </div>
              <p className="select-all break-all rounded-lg bg-grouped px-3 py-2 font-mono text-[12px]">{url}</p>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-muted">ヘッダの値（Authorization）</span>
                <button type="button" className={copyBtn} onClick={() => void copy(`Bearer ${shown}`)}>
                  コピー
                </button>
              </div>
              <p className="select-all break-all rounded-lg bg-grouped px-3 py-2 font-mono text-[12px]">Bearer {shown}</p>
            </div>
          </div>
        )}
        {message && <EmptyNote>{message}</EmptyNote>}
      </Group>

      {token !== undefined && (
        <PrimaryButton type="button" disabled={busy} onClick={() => void make()}>
          {busy ? "作っています…" : token ? "合言葉を作り直す" : "合言葉を作る"}
        </PrimaryButton>
      )}
      {token && (
        <button
          type="button"
          disabled={busy}
          className="py-2 text-[15px] font-medium text-tint disabled:opacity-60"
          onClick={async () => {
            if (!window.confirm("取り込みをやめますか？ショートカットから送っても受け取らなくなります。")) return;
            try {
              await deleteHealthToken();
              setShown("");
              await load();
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "止められませんでした。");
            }
          }}
        >
          取り込みをやめる
        </button>
      )}
    </>
  );
}

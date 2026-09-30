"use client";

import { useCallback, useEffect, useState } from "react";
import { EmptyNote, Group, PrimaryButton, Row } from "@/components/ui/controls";
import { NOTICE_LEAD_MINUTES } from "@/lib/notify/build";
import { currentSubscription, pushSupport, sendTestPush, subscribePush, unsubscribePush, type PushSupport } from "@/lib/sync/push";

export default function Notifications() {
  const [support, setSupport] = useState<PushSupport | null>(null);
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const s = pushSupport();
    setSupport(s);
    setOn(s === "ok" ? !!(await currentSubscription()) : false);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    setMessage("");
    try {
      setMessage(await fn());
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "うまくいきませんでした。");
    } finally {
      setBusy(false);
      await load();
    }
  };

  return (
    <>
      <Group
        title="知らせること"
      >
        <Row label="予定の前" detail={`${NOTICE_LEAD_MINUTES}分前`} />
        <Row label="習慣・タスクの枠" detail="始まり" />
        <Row label="毎朝のまとめ" detail="起床の時刻" />
      </Group>

      <Group title="この端末">
        {support === "needs-home-screen" && (
          <EmptyNote>
            ホーム画面に追加したアプリから開くと、通知をオンにできます。
          </EmptyNote>
        )}
        {support === "unsupported" && <EmptyNote>このブラウザは通知に対応していません。</EmptyNote>}
        {support === "ok" && <Row label="通知" detail={on === null ? "" : on ? "オン" : "オフ"} />}
        {message && <EmptyNote>{message}</EmptyNote>}
      </Group>

      {support === "ok" && on === false && (
        <PrimaryButton type="button" disabled={busy} onClick={() => void run(async () => (await subscribePush(), "通知をオンにしました。"))}>
          {busy ? "設定しています…" : "通知をオンにする"}
        </PrimaryButton>
      )}
      {support === "ok" && on && (
        <div className="flex flex-col gap-3">
          <PrimaryButton
            type="button"
            disabled={busy}
            onClick={() => void run(async () => ((await sendTestPush()) ? "テスト通知を送りました。" : "送れませんでした。"))}
          >
            {busy ? "送っています…" : "テスト通知を送る"}
          </PrimaryButton>
          <button
            type="button"
            disabled={busy}
            className="py-2 text-[15px] font-medium text-tint disabled:opacity-60"
            onClick={() => void run(async () => (await unsubscribePush(), "この端末の通知をオフにしました。"))}
          >
            この端末の通知をオフにする
          </button>
        </div>
      )}
    </>
  );
}

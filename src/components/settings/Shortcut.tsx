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

      {GUIDE.map((g) => (
        <Group key={g.title} title={g.title}>
          <ol className="flex flex-col gap-2.5 px-4 py-3 text-[15px] leading-relaxed">
            {g.steps.map((step, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="w-5 shrink-0 text-right tabular-nums text-muted">{i + 1}.</span>
                <span className="min-w-0">{step}</span>
              </li>
            ))}
          </ol>
        </Group>
      ))}
    </>
  );
}

/** ショートカットの作り方（頼まれて載せた手順。iPhone で見ながら作れるように） */
const GUIDE: { title: string; steps: string[] }[] = [
  {
    title: "作り方（iPhone のショートカット アプリ）",
    steps: [
      "上の「アドレスを作る」（作ってあれば「アドレスを作り直す」）を押し、出てきたアドレスを「コピー」する。アドレスはこのときしか出ない",
      "ショートカット アプリを開き、下の「ショートカット」→ 右上の「＋」",
      "いちばん上の名前を押して「名前を変更」→「リズムに入れて」にする（「タスクを追加」だと Siri がリマインダーに入れてしまう）",
      "「アクションを検索」で「音声入力」と入れ、「テキストを音声入力」を選ぶ",
      "もう一度検索で「URL」と入れ、「URL の内容を取得」を選ぶ",
      "「URL の内容を取得」の青い「URL」を押し、コピーしたアドレスを貼り付ける",
      "同じアクションの右の「>」を押して開き、「方法」を「POST」にする",
      "「本文を要求」を「JSON」にし、「＋ 新規フィールドを追加」→「テキスト」",
      "キーに text と入れる。値の欄を押し、キーボードの上に出る「音声入力されたテキスト」を選ぶ",
      "もう一度検索で「読み上げ」と入れ、「テキストを読み上げる」を選ぶ（読み上げる内容が「URL の内容」になっていることを確かめる）",
      "右上の「完了」",
    ],
  },
  {
    title: "使い方",
    steps: [
      "「Hey Siri、リズムに入れて」と言う（ショートカットを押しても動く）",
      "「どうぞ」のあとに「レポート 金曜まで 2時間」のように話す",
      "「『レポート』を追加しました（…）」と読み上げられたら完了。アプリを開くと空き時間に入る",
      "初めて動かすと「…への接続を許可しますか？」と聞かれるので「常に許可」",
    ],
  },
  {
    title: "うまくいかないとき",
    steps: [
      "リマインダーに入る → ショートカットの名前を「リズムに入れて」など、Siri がもともと使わない言い方にする",
      "「見つかりません」と読み上げる → アドレスが違う。ここでアドレスを作り直し、URL を貼り直す",
      "「タスクの名前が聞き取れませんでした」→ 手順8〜9（本文の text と音声入力されたテキスト）を見直す",
      "ホーム画面から動かしたい → ショートカットを長押し →「共有」→「ホーム画面に追加」",
    ],
  },
];

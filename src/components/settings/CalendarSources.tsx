"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/app/StoreProvider";
import { AddRow, EmptyNote, Group, PrimaryButton, Row, inputCls } from "@/components/ui/controls";
import { formatDateTime } from "@/lib/mock/jst";
import { addSource, listSources, removeSource, type IcalSource } from "@/lib/sync/ical";
import EditSheet, { Field } from "./EditSheet";

function AddForm({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState("Google カレンダー");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await addSource(name, url);
      onAdded();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "登録できませんでした。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <EditSheet title="カレンダーを追加" isNew error={busy ? "登録しています…" : error} onSave={() => void save()} onClose={onClose}>
      <Field label="名前">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
      </Field>
      <Field
        label="iCal 形式の非公開アドレス"
      >
        {/* パスワード管理に保存されないよう、ふつうのテキストとして受け取る */}
        <input
          className={inputCls}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          inputMode="url"
        />
      </Field>
    </EditSheet>
  );
}

export default function CalendarSources() {
  const { imports, refreshImports } = useApp();
  const [sources, setSources] = useState<IcalSource[] | null>(null);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      setSources(await listSources());
      setError("");
    } catch {
      setError("一覧を読めませんでした。データベースの準備（SQL の実行）が済んでいるか確かめてください。");
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const afterChange = async () => {
    await load();
    await refreshImports();
    await load();
  };

  const counts = new Map(imports.sources?.map((s) => [s.id, s]));

  return (
    <>
      <Group>
        {error && <EmptyNote>{error}</EmptyNote>}
        {sources?.length === 0 && <EmptyNote>まだ登録していません。</EmptyNote>}
        {sources?.map((s) => {
          const r = counts.get(s.id);
          const status = s.lastError
            ? `取り込めません：${s.lastError}`
            : s.lastFetchedAt
              ? `${formatDateTime(s.lastFetchedAt)} に取り込み${r ? `（${r.count}件）` : ""}`
              : "まだ取り込んでいません";
          return (
            <Row
              key={s.id}
              label={s.name}
              sub={status}
              detail="削除"
              onClick={async () => {
                if (!window.confirm(`「${s.name}」の取り込みをやめますか？取り込んだ予定もカレンダーから消えます。`)) return;
                try {
                  await removeSource(s.id);
                  await afterChange();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "削除できませんでした。");
                }
              }}
            />
          );
        })}
        <AddRow onClick={() => setAdding(true)}>カレンダーを追加</AddRow>
      </Group>
      {!!sources?.length && (
        <PrimaryButton type="button" onClick={() => void afterChange()} disabled={imports.state === "loading"}>
          {imports.state === "loading" ? "取り込み中…" : "今すぐ取り込む"}
        </PrimaryButton>
      )}
      {adding && <AddForm onClose={() => setAdding(false)} onAdded={() => void afterChange()} />}
    </>
  );
}

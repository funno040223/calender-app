"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/app/StoreProvider";
import {
  EmptyNote,
  Group,
  PrimaryButton,
  Row,
  Segmented,
  inputCls,
} from "@/components/ui/controls";
import { formatDateTime } from "@/lib/mock/jst";
import { NOTION_TASK_PREFIX } from "@/lib/mock/model";
import { applyNotionRows } from "@/lib/mock/notion";
import type { NotionSchema } from "@/lib/notion/api";
import {
  fetchNotionRows,
  fetchNotionSchema,
  loadNotionStatus,
  registerNotion,
  removeNotion,
  type NotionStatus,
} from "@/lib/sync/notion";

/** Notion の選考の表から、締切をタスクとして取り込む（Notion → アプリの一方向） */
export default function Notion() {
  const { state, update } = useApp();
  const [status, setStatus] = useState<NotionStatus | null | undefined>(
    undefined,
  );
  const [token, setToken] = useState("");
  const [dbUrl, setDbUrl] = useState("");
  const [schema, setSchema] = useState<NotionSchema>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const cfg = state.notion;

  const load = useCallback(async () => {
    try {
      setStatus(await loadNotionStatus());
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "読めませんでした。");
    }
  }, []);
  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "うまくいきませんでした。");
    } finally {
      setBusy(false);
    }
  };
  const register = () =>
    run(async () => {
      await registerNotion(token, dbUrl);
      setToken("");
      setDbUrl("");
      await load();
      setSchema(await fetchNotionSchema());
    });
  const readColumns = () =>
    run(async () => setSchema(await fetchNotionSchema()));
  const syncNow = () =>
    run(async () => {
      if (!cfg) return;
      const r = await fetchNotionRows(cfg.dateProp, cfg.stageProp);
      update((d) => applyNotionRows(d, r.rows, Date.now(), r.fetchedAt));
      await load();
      setMessage(`${r.rows.length}行を読みました`);
    });
  const setCfg = (patch: Partial<NonNullable<typeof cfg>>) =>
    update((d) => ({
      ...d,
      notion: { dateProp: "", ignoreStages: [], ...d.notion, ...patch },
    }));
  const stage = schema?.stages.find((s) => s.name === cfg?.stageProp);
  const imported = state.tasks.filter((t) =>
    t.id.startsWith(NOTION_TASK_PREFIX),
  ).length;

  return (
    <>
      <Group title="表">
        {status === undefined && !message && <EmptyNote>読み込み中…</EmptyNote>}
        {status === null && <EmptyNote>まだ登録していません。</EmptyNote>}
        {status && (
          <Row
            label="登録済み"
            sub={
              status.lastError
                ? status.lastError
                : status.lastFetchedAt
                  ? `${formatDateTime(status.lastFetchedAt)} に読んだ・タスク${imported}件`
                  : "まだ読んでいません"
            }
          />
        )}
        <div className="flex flex-col gap-2 px-4 py-3">
          <input
            className={inputCls}
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="連携の合言葉（secret_… / ntn_…）"
            aria-label="連携の合言葉"
          />
          <input
            className={inputCls}
            value={dbUrl}
            onChange={(e) => setDbUrl(e.target.value)}
            placeholder="表のアドレス（https://www.notion.so/…）"
            aria-label="表のアドレス"
          />
          <PrimaryButton
            type="button"
            disabled={busy || !token || !dbUrl}
            onClick={() => void register()}
          >
            {status ? "登録し直す" : "登録する"}
          </PrimaryButton>
        </div>
        {message && <EmptyNote>{message}</EmptyNote>}
      </Group>

      {status && (
        <Group title="列">
          {!schema ? (
            <div className="px-4 py-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => void readColumns()}
                className="text-[15px] text-accent"
              >
                列を読み込む
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 px-4 py-3 text-[15px]">
              <label className="flex items-center justify-between gap-3">
                <span>締切の列</span>
                <select
                  className="rounded-lg bg-surface2 px-2 py-1"
                  value={cfg?.dateProp ?? ""}
                  onChange={(e) => setCfg({ dateProp: e.target.value })}
                  aria-label="締切の列"
                >
                  <option value="">選ぶ</option>
                  {schema.dates.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center justify-between gap-3">
                <span>段階の列</span>
                <select
                  className="rounded-lg bg-surface2 px-2 py-1"
                  value={cfg?.stageProp ?? ""}
                  onChange={(e) =>
                    setCfg({ stageProp: e.target.value || undefined })
                  }
                  aria-label="段階の列"
                >
                  <option value="">なし</option>
                  {schema.stages.map((s) => (
                    <option key={s.name}>{s.name}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </Group>
      )}

      {stage && cfg && (
        <Group title="段階ごと">
          {stage.options.map((o) => {
            const ignored = cfg.ignoreStages.includes(o);
            return (
              <Row key={o} label={o}>
                {/* 段階の名前が長くても選択肢が切れないように、幅を決めておく */}
                <div className="w-40 shrink-0">
                  <Segmented
                    full
                    label={`${o}を取り込むか`}
                    value={ignored ? "ignore" : "task"}
                    onChange={(v) =>
                      setCfg({
                        ignoreStages:
                          v === "ignore"
                            ? [...new Set([...cfg.ignoreStages, o])]
                            : cfg.ignoreStages.filter((x) => x !== o),
                      })
                    }
                    options={[
                      { value: "task", label: "タスク" },
                      { value: "ignore", label: "入れない" },
                    ]}
                  />
                </div>
              </Row>
            );
          })}
        </Group>
      )}

      {status && cfg?.dateProp && (
        <PrimaryButton
          type="button"
          disabled={busy}
          onClick={() => void syncNow()}
        >
          {busy ? "読んでいます…" : "今すぐ取り込む"}
        </PrimaryButton>
      )}
      {status && (
        <button
          type="button"
          disabled={busy}
          className="py-2 text-[15px] text-accent disabled:opacity-60"
          onClick={() =>
            void run(async () => {
              if (
                !window.confirm(
                  "Notion の登録をやめますか？取り込んだタスクも外します。",
                )
              )
                return;
              await removeNotion();
              update((d) => ({
                ...d,
                notion: undefined,
                tasks: d.tasks.filter(
                  (t) => !t.id.startsWith(NOTION_TASK_PREFIX),
                ),
              }));
              setSchema(undefined);
              await load();
            })
          }
        >
          登録をやめる
        </button>
      )}
    </>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadRemote, saveRemote } from "@/lib/sync/remote";
import { syncImports, type SyncResult } from "@/lib/sync/ical";
import { saveSchedule } from "@/lib/sync/push";
import { buildNotices } from "@/lib/notify/build";
import type { Block, CalendarEvent } from "@/lib/scheduler";
import type { CalendarId } from "./calendars";
import type { MockData } from "./model";
import { contactDaysFor, travelAsks, fromStoredV2, migrateV1, planEvents, replan, sampleData, toData, type MockState } from "./state";

export type { OwnEvent } from "./model";
export { TAGS, fromStoredV2, migrateV1, planEvents, sampleData, toData, type MockState } from "./state";

const STORAGE_KEY = "task-rhythm:mock:v2";
const V1_STORAGE_KEY = "task-rhythm:mock:v1";

function loadData(now: number): MockData | undefined {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return fromStoredV2(JSON.parse(raw), now);
    const v1 = window.localStorage.getItem(V1_STORAGE_KEY);
    if (v1) return migrateV1(JSON.parse(v1), now);
  } catch {
    // 壊れたデータは読まずにサンプルから始める
  }
  return undefined;
}

function saveData(d: MockData) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toData(d)));
  } catch {
    // 保存できない環境（プライベートモードなど）では、そのまま使えるようにする
  }
}

function initialState(): MockState {
  const now = Date.now();
  return replan(loadData(now) ?? sampleData(now), readImported() ?? [], now);
}

/** 画面を開いたままこれだけ経ったら、戻ってきたときに組み直す */
const STALE_MS = 10 * 60_000;

const IMPORTED_KEY = `${STORAGE_KEY}:imported`;
const IMPORT_EVERY_MS = 15 * 60_000;
const DAY = 24 * 60 * 60_000;

/** 取り込んだ予定の控え（次に開いたとき、すぐに出すため） */
function readImported(): CalendarEvent[] | undefined {
  try {
    const raw = window.localStorage.getItem(IMPORTED_KEY);
    const v = raw ? JSON.parse(raw) : undefined;
    return Array.isArray(v) ? v : undefined;
  } catch {
    return undefined;
  }
}
function writeImported(events: CalendarEvent[] | undefined) {
  try {
    if (events) window.localStorage.setItem(IMPORTED_KEY, JSON.stringify(events));
    else window.localStorage.removeItem(IMPORTED_KEY);
  } catch {
    // 控えが残せなくても、次に開いたときに取り込み直す
  }
}

export interface ImportStatus {
  state: "idle" | "loading" | "done" | "error";
  at?: number;
  sources?: SyncResult["sources"];
  error?: string;
}

/** Supabase との同期の状態（画面に出す） */
export type SyncStatus = "loading" | "synced" | "saving" | "offline";

const EDITED_AT_KEY = `${STORAGE_KEY}:editedAt`;
const SAVE_DELAY_MS = 800;
/** 通知の一覧は、組み直しが落ち着いてから送る */
const NOTICE_DELAY_MS = 3000;

function readEditedAt(): number {
  try {
    return Number(window.localStorage.getItem(EDITED_AT_KEY) ?? 0);
  } catch {
    return 0;
  }
}
function writeEditedAt(ms: number) {
  try {
    window.localStorage.setItem(EDITED_AT_KEY, String(ms));
  } catch {
    // 保存できない環境では、次に開いたときにサーバーの内容を使う
  }
}

/**
 * データの本体は Supabase（app_state）。ブラウザの localStorage は、すぐ開くための控え。
 * 開いたときにサーバーの内容を読み、変えたら少し待ってから保存する。
 * 別の端末で変えた内容は、アプリに戻ってきたときに読み直す（後から保存したほうが残る）。
 */
export function useMockStore() {
  const [state, setState] = useState<MockState>(initialState);
  const [sync, setSync] = useState<SyncStatus>("loading");
  const [initialLoaded, setInitialLoaded] = useState(false);
  const undoData = useRef<MockData | undefined>(undefined);
  const [canUndo, setCanUndo] = useState(false);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  /** サーバーの内容を読み終えるまでは保存しない（古い控えで上書きしないため） */
  const ready = useRef(false);
  /** サーバーから読んだ直後の変化は、保存し直さない */
  const fromRemote = useRef(false);
  const remoteAt = useRef(0);
  const [imports, setImports] = useState<ImportStatus>({ state: "idle" });
  const lastImportAt = useRef(0);

  /** 登録した iCal カレンダーを取り込み直す。登録がなければ外部予定は空。 */
  const refreshImports = useCallback(async () => {
    setImports((p) => ({ ...p, state: "loading" }));
    try {
      const now = Date.now();
      const r = await syncImports(now - DAY, now + 16 * DAY);
      const failed = r.sources.find((x) => x.error);
      if (failed) {
        setImports({ state: "error", at: now, sources: r.sources, error: failed.error });
        return; // 不完全な一覧で、直前の予定・控え・通知を置き換えない
      }
      lastImportAt.current = now;
      writeImported(r.events);
      // 取り込んだ予定はサーバーの app_state には入れないので、保存し直さない
      fromRemote.current = true;
      setState((prev) => replan(prev, r.events, Date.now()));
      setImports({ state: "done", at: now, sources: r.sources });
    } catch (e) {
      setImports((p) => ({ ...p, state: "error", error: e instanceof Error ? e.message : "取り込みに失敗しました。" }));
    }
  }, []);

  const push = useCallback(async () => {
    setSync("saving");
    try {
      remoteAt.current = await saveRemote(toData(stateRef.current));
      setSync("synced");
    } catch (e) {
      console.warn("サーバーへの保存に失敗しました", e instanceof Error ? e.message : e);
      setSync("offline");
    }
  }, []);

  const pull = useCallback(async (initial: boolean) => {
    try {
      const row = await loadRemote();
      const newer = row && (initial ? row.updatedAt >= readEditedAt() : row.updatedAt > remoteAt.current);
      const remote = row && newer ? fromStoredV2(row.data, Date.now()) : undefined;
      if (row) remoteAt.current = Math.max(remoteAt.current, row.updatedAt);
      if (remote) {
        undoData.current = undefined;
        setCanUndo(false);
        fromRemote.current = true;
        const now = Date.now();
        setState(replan(remote, stateRef.current.googleEvents, now));
        setSync("synced");
      } else if (initial) {
        // サーバーにまだ無いか、この端末のほうが新しい → この端末の内容を送る
        ready.current = true;
        await push();
      }
    } catch (e) {
      console.warn("サーバーからの読み込みに失敗しました", e instanceof Error ? e.message : (e as { message?: string })?.message ?? e);
      setSync("offline");
    } finally {
      ready.current = true;
      setInitialLoaded(true);
    }
  }, [push]);

  useEffect(() => {
    // 画面を出してからサーバーに問い合わせる
    const t = window.setTimeout(async () => {
      await pull(true);
      void refreshImports();
    }, 0);
    return () => window.clearTimeout(t);
  }, [pull, refreshImports]);

  useEffect(() => {
    saveData(state);
    if (!ready.current) return;
    if (fromRemote.current) {
      fromRemote.current = false;
      return;
    }
    writeEditedAt(Date.now());
    const t = window.setTimeout(() => void push(), SAVE_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [state, push]);

  // 別の端末で変えた内容を、戻ってきたときに読み直す
  // つながらなかったあとは、この端末で変えた分が残っているかもしれないので、比べ直して送る
  const syncRef = useRef(sync);
  useEffect(() => {
    syncRef.current = sync;
  }, [sync]);
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible" || !ready.current) return;
      void pull(syncRef.current === "offline");
      if (Date.now() - lastImportAt.current > IMPORT_EVERY_MS) void refreshImports();
    };
    const onOnline = () => {
      if (ready.current && syncRef.current === "offline") void pull(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [pull, refreshImports]);

  // 組み直すたびに、これから送る通知の一覧をサーバーに置く（送るのはサーバーの定期実行）
  const noticesSent = useRef("");
  useEffect(() => {
    if (!ready.current || sync === "loading") return;
    const t = window.setTimeout(() => {
      const items = buildNotices({
        now: Date.now(),
        result: state.result,
        events: planEvents(state, state.classEvents, state.googleEvents),
        places: state.places,
        settings: state.settings,
        habits: state.habits,
        travelAsks: travelAsks(state, Date.now()),
        contactDays: contactDaysFor(state, Date.now()).map((c) => c.dayStart),
      });
      const json = JSON.stringify(items);
      if (json === noticesSent.current) return;
      saveSchedule(items).then(
        () => (noticesSent.current = json),
        (e) => console.warn("通知の一覧を保存できませんでした", e instanceof Error ? e.message : e),
      );
    }, NOTICE_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [state, sync]);

  // 朝に開き直したときなど、古い「今」のままにしない
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      setState((prev) => {
        const now = Date.now();
        return now - prev.plannedAt > STALE_MS ? replan(prev, prev.googleEvents, now) : prev;
      });
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  /** 予定・タスク・設定などを変えたら、必ず組み直す */
  const update = useCallback((fn: (d: MockData) => MockData) => {
    setState((prev) => {
      const next = fn(prev);
      if (next === prev) return prev;
      undoData.current = toData(prev);
      setCanUndo(true);
      return replan(next, prev.googleEvents, Date.now());
    });
  }, []);

  const undo = useCallback(() => {
    const previous = undoData.current;
    if (!previous) return;
    undoData.current = undefined;
    setCanUndo(false);
    setState((current) => replan(previous, current.googleEvents, Date.now()));
  }, []);

  /** 配置に関係しない変更（表示の設定・楽しみ・朝の記録など）。組み直さない */
  const patch = useCallback((fn: (d: MockData) => Partial<MockData>) => {
    undoData.current = undefined;
    setCanUndo(false);
    setState((prev) => ({ ...prev, ...fn(prev) }));
  }, []);

  const reset = useCallback(() => {
    const now = Date.now();
    setState((prev) => replan(sampleData(now), prev.googleEvents, now));
  }, []);

  const setHidden = useCallback((hidden: CalendarId[]) => patch(() => ({ hiddenCalendars: hidden })), [patch]);

  return { state, update, patch, reset, setHidden, sync, imports, refreshImports, initialLoaded, undo, canUndo };
}

export type MockStore = ReturnType<typeof useMockStore>;

export const sameBlock = (a: Block, b: Pick<Block, "kind" | "refId" | "start">) =>
  a.kind === b.kind && a.refId === b.refId && a.start === b.start;

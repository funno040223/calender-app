"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { currentUserId, loadRemote, saveRemote } from "@/lib/sync/remote";
import { syncImports, type SyncResult } from "@/lib/sync/ical";
import { saveSchedule } from "@/lib/sync/push";
import { closeGoneTaskNotices } from "@/lib/notify/close";
import { LIFE_STORAGE_PREFIX, resetLifeLocalSession } from "@/lib/life/store";
import { exerciseInputOf } from "@/lib/life/exercisePlan";
import type { LifeProjection } from "@/lib/life/model";
import { LOCAL_DEBUG } from "@/lib/localDebug";
import { buildNotices } from "@/lib/notify/build";
import type { Block, CalendarEvent, ExerciseInput } from "@/lib/scheduler";
import type { CalendarId } from "./calendars";
import type { MockData } from "./model";
import { fingerprints, mergeConflict, type Fingerprints } from "./merge";
import { contactDaysFor, travelAsks, fromStoredV2, keepLocalSleep, migrateV1, planEvents, replan as replanData, sampleData, toData, type MockState } from "./state";

export type { OwnEvent } from "./model";
export { TAGS, fromStoredV2, migrateV1, planEvents, sampleData, toData, type MockState } from "./state";

const STORAGE_KEY = "task-rhythm:mock:v2";
const KEY_PREFIX = "task-rhythm:";

/** ログアウトしたときに、この端末の控えを消す（次に開いた人に見えないように） */
export function clearLocalData() {
  resetLifeLocalSession();
  clearStoredData();
}

function clearStoredData(legacyOnly = false) {
  try {
    for (const k of Object.keys(window.localStorage)) {
      if (k.startsWith(KEY_PREFIX) && !(legacyOnly && k.startsWith(LIFE_STORAGE_PREFIX))) window.localStorage.removeItem(k);
    }
  } catch {
    // 消せない環境では何もしない
  }
}
const V1_STORAGE_KEY = "task-rhythm:mock:v1";
/** 控えが誰のデータか（ログインした人の ID）。別の人がログインしたら控えを使わない */
const OWNER_KEY = `${STORAGE_KEY}:owner`;

function readOwner(): string | undefined {
  try {
    return window.localStorage.getItem(OWNER_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeOwner(id: string) {
  try {
    window.localStorage.setItem(OWNER_KEY, id);
  } catch {
    // 保存できない環境では何もしない
  }
}

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

/** 運動のプラン（生活記録から作る）。組み直すたびに配置エンジンへ渡す */
let exerciseInput: ExerciseInput | undefined;
const replan = (data: MockData, googleEvents: CalendarEvent[], now: number) => replanData(data, googleEvents, now, exerciseInput);

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

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error("サーバーの応答が遅いので、この端末の控えで始めます")), ms);
    p.then(
      (v) => {
        window.clearTimeout(t);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(t);
        reject(e);
      },
    );
  });
}

/** Supabase との同期の状態（画面に出す） */
export type SyncStatus = "loading" | "synced" | "saving" | "offline";

const EDITED_AT_KEY = `${STORAGE_KEY}:editedAt`;
const SAVE_DELAY_MS = 800;
/** 通知の一覧は、組み直しが落ち着いてから送る */
const NOTICE_DELAY_MS = 3000;

/** サーバーに送った（読んだ）時点の、サーバーの保存時刻・この端末の時計・項目ごとの指紋。2台で変えたときの合わせ方に使う */
const REMOTE_AT_KEY = `${STORAGE_KEY}:remoteAt`;
const SYNCED_AT_KEY = `${STORAGE_KEY}:syncedAt`;
const BASE_KEY = `${STORAGE_KEY}:base`;
/** サーバーの読み込みを待つ長さ。電波が弱いときは、この時間で端末の控えのまま使い始める */
const LOAD_TIMEOUT_MS = 6000;

function readNumber(key: string): number {
  try {
    return Number(window.localStorage.getItem(key) ?? 0) || 0;
  } catch {
    return 0;
  }
}
function writeNumber(key: string, v: number) {
  try {
    window.localStorage.setItem(key, String(v));
  } catch {
    // 保存できない環境では、次に開いたときに項目ごとに合わせ直す
  }
}
function readBase(): Fingerprints | undefined {
  try {
    const raw = window.localStorage.getItem(BASE_KEY);
    return raw ? (JSON.parse(raw) as Fingerprints) : undefined;
  } catch {
    return undefined;
  }
}
/** 合わせ終えた内容を、次に2台で変えたときの比べ元として残す */
function markSynced(data: MockData, serverAt: number, localAt: number) {
  writeNumber(REMOTE_AT_KEY, serverAt);
  writeNumber(SYNCED_AT_KEY, localAt);
  try {
    window.localStorage.setItem(BASE_KEY, JSON.stringify(fingerprints(data)));
  } catch {
    // 比べ元が残せなければ、次は両方で変えた扱いで、足した記録だけ残して合わせる
  }
}

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
export function useMockStore(life?: { projection: LifeProjection; ready: boolean }) {
  const [state, setState] = useState<MockState>(initialState);
  // 生活記録（運動のプラン・やった回・選んだ時間）が変わったら組み直す
  const lifeProjection = life?.projection;
  const lifeReady = life?.ready ?? true;
  const exercise = useMemo(() => (lifeProjection ? exerciseInputOf(lifeProjection, state.habitLogs) : undefined), [lifeProjection, state.habitLogs]);
  const exerciseKey = JSON.stringify(exercise ?? null);
  useEffect(() => {
    if (exerciseKey === JSON.stringify(exerciseInput ?? null)) return;
    exerciseInput = exercise;
    setState((prev) => replan(prev, prev.googleEvents, Date.now()));
    // exercise は exerciseKey と同じ内容
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseKey]);
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
  /** この端末で変えて、まだサーバーに送っていない */
  const dirty = useRef(false);
  /** サーバーを読み直している間は、通知の一覧を置かない（この端末の古い内容で、ほかの端末が置いた一覧を上書きしないため） */
  const pulling = useRef(false);
  const remoteAt = useRef(0);
  const [imports, setImports] = useState<ImportStatus>({ state: "idle" });
  const lastImportAt = useRef(0);

  /** 登録した iCal カレンダーを取り込み直す。登録がなければ外部予定は空。 */
  const refreshImports = useCallback(async () => {
    setImports((p) => ({ ...p, state: "loading" }));
    try {
      const now = Date.now();
      const r = await syncImports(now - 8 * DAY, now + 16 * DAY);
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
    dirty.current = false;
    const startedAt = Date.now();
    const sent = toData(stateRef.current);
    try {
      remoteAt.current = await saveRemote(sent);
      markSynced(sent, remoteAt.current, startedAt);
      setSync("synced");
    } catch (e) {
      dirty.current = true;
      console.warn("サーバーへの保存に失敗しました", e instanceof Error ? e.message : e);
      setSync("offline");
    }
  }, []);

  const pull = useCallback(async (initial: boolean) => {
    pulling.current = true;
    try {
      if (initial) {
        // 別の人の控え（ログインが切れたあとに違うアカウントで入ったなど）は使わず、見本のデータから始める。
        // サーバーにまだ行がないと控えをそのまま送るので、ほかの人のデータがこのアカウントに入らないように
        const uid = await currentUserId();
        const owner = readOwner();
        if (uid && owner && owner !== uid) {
          clearStoredData(true);
          const now = Date.now();
          const fresh = replan(sampleData(now), [], now);
          stateRef.current = fresh;
          undoData.current = undefined;
          setCanUndo(false);
          setState(fresh);
        }
        // 前からある端末（まだ記録していない）は、今ログインしている人の控えとみなす
        if (uid) writeOwner(uid);
      }
      const row = await withTimeout(loadRemote(), LOAD_TIMEOUT_MS);
      // サーバーが、前に合わせたあとで変わったか／この端末にまだ送っていない変更があるか
      const remoteChanged = !!row && row.updatedAt > Math.max(remoteAt.current, readNumber(REMOTE_AT_KEY));
      const localEdited = dirty.current || readEditedAt() > readNumber(SYNCED_AT_KEY);
      const loaded = row && remoteChanged ? fromStoredV2(row.data, Date.now()) : undefined;
      // 以前の版が保存した行（眠りの記録がない）でも、この端末の眠りの記録を失わない。残したらサーバーにも送り直す
      const remote = loaded && keepLocalSleep(row!.data, loaded, stateRef.current);
      const restored = !!remote && remote !== loaded;
      if (row) remoteAt.current = Math.max(remoteAt.current, row.updatedAt);
      if (remote && (localEdited || restored)) {
        // どちらも変えていた：項目ごとに合わせ、この端末で足した記録を失わない。合わせたものをサーバーにも送る
        undoData.current = undefined;
        setCanUndo(false);
        const merged = mergeConflict(readBase(), toData(stateRef.current), remote);
        fromRemote.current = false;
        dirty.current = true;
        setState(replan(merged, stateRef.current.googleEvents, Date.now()));
        setSync("saving");
      } else if (remote) {
        undoData.current = undefined;
        setCanUndo(false);
        dirty.current = false;
        fromRemote.current = true;
        const now = Date.now();
        setState(replan(remote, stateRef.current.googleEvents, now));
        markSynced(remote, row!.updatedAt, now);
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
      pulling.current = false;
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
      // 取り込みで組み直す直前の変更がまだ送られていなければ、送り直す（予約していた保存はここで消えるため）
      if (!dirty.current) return;
    } else {
      dirty.current = true;
      writeEditedAt(Date.now());
    }
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

  useEffect(() => {
    if (!ready.current || sync === "loading") return;
    void closeGoneTaskNotices(new Set(state.tasks.map((task) => task.id)));
  }, [state.tasks, sync]);

  // 組み直すたびに、これから送る通知の一覧をサーバーに置く（送るのはサーバーの定期実行）
  const noticesSent = useRef("");
  useEffect(() => {
    if (!ready.current || sync === "loading") return;
    // 生活記録を読み終えるまで待つ（運動の枠が入る前の一覧を送らない）。同期できなくても、端末の控えで送る
    if (!lifeReady) return;
    const save = () => {
      if (pulling.current) {
        t = window.setTimeout(save, NOTICE_DELAY_MS);
        return;
      }
      if (LOCAL_DEBUG) return;
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
    };
    let t = window.setTimeout(save, NOTICE_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [state, sync, lifeReady]);

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
  /**
   * データを変えて組み直す。auto（天気・Notion の取り込みなど、自動の変更）は「直前の操作を元に戻す」の対象にしない。
   * 取り消しの控えにも同じ変更を当てるので、元に戻しても自動で取り込んだ内容は消えない
   */
  const update = useCallback((fn: (d: MockData) => MockData, opts?: { auto?: boolean }) => {
    setState((prev) => {
      const next = fn(prev);
      if (next === prev) return prev;
      if (opts?.auto) {
        if (undoData.current) undoData.current = fn(undoData.current);
      } else {
        undoData.current = toData(prev);
        setCanUndo(true);
      }
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

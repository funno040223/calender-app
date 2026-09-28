"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadRemote, saveRemote } from "@/lib/sync/remote";
import { DEFAULT_SETTINGS, plan, type Block, type CalendarEvent, type PlanResult, type Settings } from "@/lib/scheduler";
import type { CalendarId } from "./calendars";
import { buildClassEvents, classEventsForPlan, type ClassEvent, type Course, type MockData } from "./model";
import {
  SAMPLE_RECOVERY_OPTIONS,
  SAMPLE_AVOID_WINDOWS,
  SAMPLE_HABITS,
  SAMPLE_PERIODS,
  SAMPLE_PLACES,
  SAMPLE_ROUTINE_STEPS,
  SAMPLE_TAGS,
  SAMPLE_TREATS,
  buildGoogleEvents,
  buildSampleCourses,
  buildSampleOwnEvents,
  buildSampleTasks,
} from "./sample";

export type { OwnEvent } from "./model";

export interface MockState extends MockData {
  /** 時間割から作った授業の予定（任意参加で参加しない回も含む。表示用） */
  classEvents: ClassEvent[];
  googleEvents: CalendarEvent[];
  result: PlanResult;
  plannedAt: number;
}

const STORAGE_KEY = "task-rhythm:mock:v2";
const V1_STORAGE_KEY = "task-rhythm:mock:v1";

/** タスクの種類（まだ編集画面はないので固定） */
export const TAGS = SAMPLE_TAGS;

const DATA_KEYS = [
  "version",
  "settings",
  "places",
  "periods",
  "courses",
  "habits",
  "avoidWindows",
  "treats",
  "routineSteps",
  "tasks",
  "events",
  "blocks",
  "wakeLogs",
  "habitLastDone",
  "hiddenCalendars",
] as const satisfies readonly (keyof MockData)[];

/** 日本時間で動かすので、タイムゾーンは設定で変えられない */
const normalizeSettings = (s: Partial<Settings> | undefined): Settings => ({
  ...DEFAULT_SETTINGS,
  ...s,
  tzOffsetMinutes: DEFAULT_SETTINGS.tzOffsetMinutes,
});

export function sampleData(now: number): MockData {
  return {
    version: 2,
    settings: normalizeSettings(undefined),
    places: SAMPLE_PLACES,
    periods: SAMPLE_PERIODS,
    courses: buildSampleCourses(now),
    habits: SAMPLE_HABITS,
    avoidWindows: SAMPLE_AVOID_WINDOWS,
    treats: SAMPLE_TREATS,
    routineSteps: SAMPLE_ROUTINE_STEPS,
    tasks: buildSampleTasks(now),
    events: buildSampleOwnEvents(now),
    blocks: [],
    wakeLogs: [],
    habitLastDone: {},
    hiddenCalendars: [],
  };
}

const isArray = (v: unknown): v is unknown[] => Array.isArray(v);
const arr = <T,>(v: unknown, fallback: T[]): T[] => (isArray(v) ? (v as T[]) : fallback);

/** 保存された v2 のデータ。欠けている項目はサンプルで補う */
export function fromStoredV2(raw: unknown, now: number): MockData | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const d = raw as Partial<Record<keyof MockData, unknown>>;
  if (d.version !== 2) return undefined;
  const s = sampleData(now);
  return {
    version: 2,
    settings: normalizeSettings(d.settings as Partial<Settings> | undefined),
    places: arr(d.places, s.places),
    periods: arr(d.periods, s.periods),
    courses: arr<Course>(d.courses, s.courses).map((c) => ({
      ...c,
      optional: !!c.optional,
      cancelledDates: arr(c.cancelledDates, []),
      attendedDates: arr(c.attendedDates, []),
    })),
    habits: arr(d.habits, s.habits),
    avoidWindows: arr(d.avoidWindows, s.avoidWindows),
    treats: arr(d.treats, s.treats),
    routineSteps: arr(d.routineSteps, s.routineSteps),
    tasks: arr(d.tasks, s.tasks),
    events: arr(d.events, s.events),
    blocks: arr(d.blocks, []),
    wakeLogs: arr(d.wakeLogs, []),
    habitLastDone:
      d.habitLastDone && typeof d.habitLastDone === "object" && !Array.isArray(d.habitLastDone)
        ? (d.habitLastDone as Record<string, number>)
        : {},
    hiddenCalendars: arr(d.hiddenCalendars, []),
  };
}

/**
 * v1（カレンダーだけの試作）からの移行。自分の予定・タスク・枠・場所・表示の設定は引き継ぎ、
 * 時間割・習慣・楽しみなどの新しい項目はサンプルで埋める。
 */
export function migrateV1(raw: unknown, now: number): MockData | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const d = raw as Record<string, unknown>;
  if (!isArray(d.ownEvents) || !isArray(d.tasks) || !isArray(d.blocks)) return undefined;
  const s = sampleData(now);
  return {
    ...s,
    events: d.ownEvents as MockData["events"],
    tasks: d.tasks as MockData["tasks"],
    blocks: d.blocks as MockData["blocks"],
    places: arr(d.places, s.places),
    hiddenCalendars: arr(d.hiddenCalendars, []),
  };
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

export function toData(state: MockData): MockData {
  const out: Record<string, unknown> = {};
  for (const k of DATA_KEYS) out[k] = state[k];
  return out as unknown as MockData;
}

function saveData(d: MockData) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toData(d)));
  } catch {
    // 保存できない環境（プライベートモードなど）では、そのまま使えるようにする
  }
}

/** エンジンで組み直す。配置のロジックはすべて plan() に任せる */
function replan(data: MockData, googleEvents: CalendarEvent[], now: number): MockState {
  const classEvents = buildClassEvents(data.courses, data.periods);
  // 間隔で置く習慣は、始まった枠をもって「やった」とみなす（実績の記録は第2段階）
  const habitLastDone = { ...data.habitLastDone };
  for (const b of data.blocks) {
    const h = data.habits.find((x) => x.id === b.refId);
    if (b.kind === "habit" && h?.frequency.type === "interval" && b.title === h.name && b.start <= now) {
      habitLastDone[h.id] = Math.max(habitLastDone[h.id] ?? 0, b.start);
    }
  }
  data = { ...data, habitLastDone };
  const result = plan({
    now,
    settings: data.settings,
    events: [
      ...data.events.map((e) => ({ ...e, play: e.calendarId === "play" })),
      ...classEventsForPlan(classEvents),
      ...googleEvents,
    ],
    places: data.places,
    habits: data.habits,
    tags: TAGS,
    tasks: data.tasks,
    avoidWindows: data.avoidWindows,
    recoveryOptions: SAMPLE_RECOVERY_OPTIONS,
    habitLastDone,
    previousBlocks: data.blocks,
  });
  return { ...toData(data), classEvents, googleEvents, blocks: result.blocks, result, plannedAt: now };
}

function initialState(): MockState {
  const now = Date.now();
  return replan(loadData(now) ?? sampleData(now), buildGoogleEvents(now), now);
}

/** 画面を開いたままこれだけ経ったら、戻ってきたときに組み直す */
const STALE_MS = 10 * 60_000;

/** Supabase との同期の状態（画面に出す） */
export type SyncStatus = "loading" | "synced" | "saving" | "offline";

const EDITED_AT_KEY = `${STORAGE_KEY}:editedAt`;
const SAVE_DELAY_MS = 800;

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
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  /** サーバーの内容を読み終えるまでは保存しない（古い控えで上書きしないため） */
  const ready = useRef(false);
  /** サーバーから読んだ直後の変化は、保存し直さない */
  const fromRemote = useRef(false);
  const remoteAt = useRef(0);

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
        fromRemote.current = true;
        const now = Date.now();
        setState(replan(remote, buildGoogleEvents(now), now));
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
    }
  }, [push]);

  useEffect(() => {
    // 画面を出してからサーバーに問い合わせる
    const t = window.setTimeout(() => void pull(true), 0);
    return () => window.clearTimeout(t);
  }, [pull]);

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
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && ready.current) void pull(false);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [pull]);

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
    setState((prev) => replan(fn(prev), prev.googleEvents, Date.now()));
  }, []);

  /** 配置に関係しない変更（表示の設定・楽しみ・朝の記録など）。組み直さない */
  const patch = useCallback((fn: (d: MockData) => Partial<MockData>) => {
    setState((prev) => ({ ...prev, ...fn(prev) }));
  }, []);

  const reset = useCallback(() => {
    const now = Date.now();
    setState(replan(sampleData(now), buildGoogleEvents(now), now));
  }, []);

  const setHidden = useCallback((hidden: CalendarId[]) => patch(() => ({ hiddenCalendars: hidden })), [patch]);

  return { state, update, patch, reset, setHidden, sync };
}

export type MockStore = ReturnType<typeof useMockStore>;

export const sameBlock = (a: Block, b: Pick<Block, "kind" | "refId" | "start">) =>
  a.kind === b.kind && a.refId === b.refId && a.start === b.start;

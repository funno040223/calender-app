"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_SETTINGS, plan, type Block, type CalendarEvent, type Place, type PlanResult, type Task } from "@/lib/scheduler";
import type { CalendarId, OwnCalendarId } from "./calendars";
import {
  SAMPLE_HABITS,
  SAMPLE_PLACES,
  SAMPLE_TAGS,
  buildClassEvents,
  buildGoogleEvents,
  buildSampleOwnEvents,
  buildSampleTasks,
} from "./sample";

/**
 * 自分で入れた予定。calendarId で「予定」「遊び」を分ける（未指定は「予定」）。
 * 「遊び」だけの日を休日として扱う処理は、あとでエンジン側に入れる予定。
 */
export type OwnEvent = CalendarEvent & { calendarId?: OwnCalendarId };

/** ブラウザに保存する内容（サーバーはまだないので、これが唯一の保存先） */
export interface MockData {
  ownEvents: OwnEvent[];
  tasks: Task[];
  /** 前回の配置（固定した枠を含む）。次の組み直しに渡す */
  blocks: Block[];
  /** 移動時間を聞かれて登録した場所 */
  places: Place[];
  hiddenCalendars: CalendarId[];
}

export interface MockState extends MockData {
  classEvents: CalendarEvent[];
  googleEvents: CalendarEvent[];
  result: PlanResult;
  plannedAt: number;
}

const STORAGE_KEY = "task-rhythm:mock:v1";

export const HABITS = SAMPLE_HABITS;
export const TAGS = SAMPLE_TAGS;
export const SETTINGS = DEFAULT_SETTINGS;

function sampleData(now: number): MockData {
  return {
    ownEvents: buildSampleOwnEvents(now),
    tasks: buildSampleTasks(now),
    blocks: [],
    places: SAMPLE_PLACES,
    hiddenCalendars: [],
  };
}

function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

function loadData(): MockData | undefined {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const d = JSON.parse(raw) as Partial<MockData>;
    if (!isArray(d.ownEvents) || !isArray(d.tasks) || !isArray(d.blocks)) return undefined;
    return {
      ownEvents: d.ownEvents,
      tasks: d.tasks,
      blocks: d.blocks,
      places: isArray(d.places) ? d.places : SAMPLE_PLACES,
      hiddenCalendars: isArray(d.hiddenCalendars) ? d.hiddenCalendars : [],
    };
  } catch {
    return undefined;
  }
}

function saveData(d: MockData) {
  try {
    const { ownEvents, tasks, blocks, places, hiddenCalendars } = d;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ownEvents, tasks, blocks, places, hiddenCalendars }));
  } catch {
    // 保存できない環境（プライベートモードなど）では、そのまま使えるようにする
  }
}

/** エンジンで組み直す。配置のロジックはすべて plan() に任せる */
function replan(data: MockData, classEvents: CalendarEvent[], googleEvents: CalendarEvent[], now: number): MockState {
  const taskIds = new Set(data.tasks.map((t) => t.id));
  const habitIds = new Set(HABITS.map((h) => h.id));
  // 消したタスクの枠は渡さない
  const previousBlocks = data.blocks.filter(
    (b) => (b.kind === "task" && taskIds.has(b.refId)) || (b.kind === "habit" && habitIds.has(b.refId)),
  );
  const result = plan({
    now,
    settings: SETTINGS,
    events: [...data.ownEvents, ...classEvents, ...googleEvents],
    places: data.places,
    habits: HABITS,
    tags: TAGS,
    tasks: data.tasks,
    previousBlocks,
  });
  return { ...data, classEvents, googleEvents, blocks: result.blocks, result, plannedAt: now };
}

function initialState(): MockState {
  const now = Date.now();
  const data = loadData() ?? sampleData(now);
  return replan(data, buildClassEvents(now), buildGoogleEvents(now), now);
}

export function useMockStore() {
  const [state, setState] = useState<MockState>(initialState);

  useEffect(() => {
    saveData(state);
  }, [state]);

  /** 予定・タスク・枠を変えたら、必ず組み直す */
  const update = useCallback((fn: (d: MockData) => MockData) => {
    setState((prev) => replan(fn(prev), prev.classEvents, prev.googleEvents, Date.now()));
  }, []);

  /** 表示だけの変更（組み直さない） */
  const setHidden = useCallback((hidden: CalendarId[]) => {
    setState((prev) => ({ ...prev, hiddenCalendars: hidden }));
  }, []);

  const reset = useCallback(() => {
    const now = Date.now();
    setState(replan(sampleData(now), buildClassEvents(now), buildGoogleEvents(now), now));
  }, []);

  return { state, update, setHidden, reset };
}

export const sameBlock = (a: Block, b: Pick<Block, "kind" | "refId" | "start">) =>
  a.kind === b.kind && a.refId === b.refId && a.start === b.start;

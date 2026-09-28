import { DEFAULT_SETTINGS, type PlanInput } from "./types";

/** 日本時間の日時を epoch ミリ秒で返す */
export function jst(y: number, m: number, d: number, h = 0, mi = 0): number {
  return Date.UTC(y, m - 1, d, h - 9, mi);
}

export function baseInput(now: number, overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    now,
    settings: DEFAULT_SETTINGS,
    events: [],
    places: [],
    habits: [],
    tags: [],
    tasks: [],
    previousBlocks: [],
    ...overrides,
  };
}

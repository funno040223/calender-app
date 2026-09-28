import type { CalendarEvent, Habit, Place, Tag, Task } from "@/lib/scheduler";
import type { OwnEvent } from "./store";
import { DAY_MS, MIN, dayStartOf, weekdayOf } from "./jst";

/** 画面確認用のサンプルデータ。日付は「今日」を基準に作る */

export const SAMPLE_PLACES: Place[] = [
  { id: "place-univ", name: "大学", keywords: ["大学", "キャンパス"], travelMinutes: 45 },
  { id: "place-cafe", name: "カフェ", keywords: ["カフェ", "バイト先"], travelMinutes: 20 },
];

export const SAMPLE_TAGS: Tag[] = [
  { id: "tag-focus", name: "集中", mode: "focus", defaultMinutes: 90, minChunkMinutes: 60, maxChunkMinutes: 120, restAfterMinutes: 20 },
  { id: "tag-admin", name: "事務", mode: "gap", defaultMinutes: 30, minChunkMinutes: 15, maxChunkMinutes: 60 },
];

export const SAMPLE_HABITS: Habit[] = [
  { id: "habit-dinner", name: "夕食", durationMinutes: 60, windowStart: 18 * 60, windowEnd: 20 * 60 + 30, frequency: { type: "daily" }, skippable: false },
  { id: "habit-bath", name: "入浴", durationMinutes: 30, windowStart: 20 * 60, windowEnd: 23 * 60 + 30, frequency: { type: "daily" }, skippable: false },
  { id: "habit-exercise", name: "運動", durationMinutes: 30, windowStart: 17 * 60, windowEnd: 21 * 60, frequency: { type: "weekly", times: 3 }, skippable: true },
];

const at = (day: number, h: number, mi = 0) => day + (h * 60 + mi) * MIN;

/** 授業（週ごとの時間割）。今週の月曜から3週間分 */
export function buildClassEvents(now: number): CalendarEvent[] {
  const today = dayStartOf(now);
  const monday = today - ((weekdayOf(today) + 6) % 7) * DAY_MS;
  const timetable = [
    { wd: 0, title: "線形代数", h: 9, mi: 0, len: 90, room: "大学 3号館 301" },
    { wd: 2, title: "英語コミュニケーション", h: 10, mi: 40, len: 90, room: "大学 1号館 105" },
    { wd: 3, title: "データ構造", h: 13, mi: 0, len: 90, room: "大学 情報棟 2F" },
  ];
  const out: CalendarEvent[] = [];
  for (let w = 0; w < 3; w++) {
    for (const c of timetable) {
      const day = monday + (w * 7 + c.wd) * DAY_MS;
      const start = at(day, c.h, c.mi);
      out.push({ id: `class-${c.wd}-${day}`, title: c.title, start, end: start + c.len * MIN, location: c.room });
    }
  }
  return out;
}

/** Google から取り込んだ予定（読み取り専用） */
export function buildGoogleEvents(now: number): CalendarEvent[] {
  const today = dayStartOf(now);
  const d = (n: number) => today + n * DAY_MS;
  return [
    { id: "google-dentist", title: "歯医者", start: at(d(2), 15), end: at(d(2), 16), location: "駅前デンタルクリニック" },
    { id: "google-circle", title: "サークル ミーティング", start: at(d(4), 19), end: at(d(4), 20), location: "Zoom" },
    { id: "google-birthday", title: "友だちの誕生日", start: d(5), end: d(6), allDay: true },
  ];
}

export function buildSampleOwnEvents(now: number): OwnEvent[] {
  const today = dayStartOf(now);
  const d = (n: number) => today + n * DAY_MS;
  // 次の土曜日（今日が土曜なら今日）
  const saturday = d((6 - weekdayOf(today) + 7) % 7);
  return [
    { id: "own-sample-job", title: "アルバイト", start: at(d(1), 17), end: at(d(1), 21), location: "カフェ" },
    { id: "own-sample-shopping", title: "買い物", start: at(d(3), 11), end: at(d(3), 12), location: "駅前", travelMinutes: 15 },
    { id: "own-sample-online", title: "オンライン面談", start: at(d(6), 14), end: at(d(6), 15), atHome: true, description: "Zoom のリンクはメール参照" },
    { id: "own-sample-trip", title: "帰省", start: d(8), end: d(11), allDay: true },
    {
      id: "own-sample-aquarium",
      calendarId: "play",
      title: "友だちと水族館",
      start: at(saturday, 11),
      end: at(saturday, 16),
      location: "品川の水族館",
      travelMinutes: 40,
    },
  ];
}

export function buildSampleTasks(now: number): Task[] {
  const today = dayStartOf(now);
  const endOf = (n: number) => today + (n + 1) * DAY_MS;
  return [
    { id: "task-sample-slides", title: "発表スライド作成", deadline: endOf(1), durationMinutes: 480, priority: 3, tagId: "tag-focus" },
    { id: "task-sample-mail", title: "メール返信", deadline: endOf(1), durationMinutes: 30, priority: 2, tagId: "tag-admin" },
    { id: "task-sample-report", title: "線形代数のレポート", deadline: endOf(3), durationMinutes: 180, priority: 3, tagId: "tag-focus" },
    { id: "task-sample-cv", title: "履歴書を書く", deadline: endOf(6), durationMinutes: 120, priority: 2, tagId: "tag-focus" },
    { id: "task-sample-docs", title: "奨学金の書類を出す", durationMinutes: 15, priority: 1, tagId: "tag-admin" },
  ];
}

export type CalendarId = "own" | "play" | "class" | "task" | "habit" | "routine" | "google";

/** 自分で入れる予定のカレンダー */
export type OwnCalendarId = "own" | "play";

export interface CalendarDef {
  id: CalendarId;
  name: string;
  /** globals.css で定義した色の変数 */
  colorVar: string;
}

export const CALENDARS: CalendarDef[] = [
  { id: "own", name: "予定", colorVar: "var(--cal-own)" },
  { id: "play", name: "遊び", colorVar: "var(--cal-play)" },
  { id: "class", name: "授業", colorVar: "var(--cal-class)" },
  { id: "task", name: "タスク", colorVar: "var(--cal-task)" },
  { id: "habit", name: "習慣", colorVar: "var(--cal-habit)" },
  { id: "routine", name: "朝ルーティン", colorVar: "var(--cal-routine)" },
  { id: "google", name: "Google（取り込み）", colorVar: "var(--cal-google)" },
];

export const OWN_CALENDARS = CALENDARS.filter((c): c is CalendarDef & { id: OwnCalendarId } => c.id === "own" || c.id === "play");

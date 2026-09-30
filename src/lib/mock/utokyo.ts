import type { DateKey, Period } from "./model";

/**
 * 東京大学 大学院情報理工学系研究科の暦。
 * 出典：令和8(2026)年度 研究科等別授業日程（情報理工の欄）と、令和8(2026)年度 アカデミック・カレンダー標準授業日程
 * （https://www.u-tokyo.ac.jp/ja/students/classes/gakujireki.html）。翌年度の日程が出たら足す
 */

/** 東大の標準の時限（1コマ105分） */
export const UTOKYO_PERIODS: Period[] = [
  { number: 1, start: 8 * 60 + 30, end: 10 * 60 + 15 },
  { number: 2, start: 10 * 60 + 25, end: 12 * 60 + 10 },
  { number: 3, start: 13 * 60, end: 14 * 60 + 45 },
  { number: 4, start: 14 * 60 + 55, end: 16 * 60 + 40 },
  { number: 5, start: 16 * 60 + 50, end: 18 * 60 + 35 },
  { number: 6, start: 18 * 60 + 45, end: 20 * 60 + 30 },
];

export interface Term {
  id: string;
  /** 「S1」「A」など */
  label: string;
  /** 授業の始まりと終わり */
  start: DateKey;
  end: DateKey;
}

/** ターム（S1・S2・A1・A2）と、続けて受けるセメスター（S・A）の授業期間 */
export const UTOKYO_TERMS: Term[] = [
  { id: "2026-S1", label: "S1", start: "2026-04-06", end: "2026-06-03" },
  { id: "2026-S2", label: "S2", start: "2026-06-04", end: "2026-07-31" },
  { id: "2026-S", label: "S", start: "2026-04-06", end: "2026-07-31" },
  { id: "2026-A1", label: "A1", start: "2026-10-02", end: "2026-12-02" },
  { id: "2026-A2", label: "A2", start: "2026-12-03", end: "2027-02-04" },
  { id: "2026-A", label: "A", start: "2026-10-02", end: "2027-02-04" },
];

/**
 * 授業期間の中で授業をしない日（祝日・大学の行事・冬季休業）。
 * 標準授業日程で授業日になっている祝日（4/29 昭和の日・11/3 文化の日）は入れない。
 * 祝日の授業は研究科・授業で違うことがあるので、違う授業はその授業の休講日で直す
 */
export const UTOKYO_NO_CLASS_DAYS: ReadonlySet<DateKey> = new Set([
  // ゴールデンウィーク（5/4 みどりの日・5/5 こどもの日・5/6 振替休日）
  "2026-05-04",
  "2026-05-05",
  "2026-05-06",
  // 海の日
  "2026-07-20",
  // スポーツの日
  "2026-10-12",
  // 駒場祭（全日休講）
  "2026-11-20",
  // 勤労感謝の日
  "2026-11-23",
  // 冬季休業（12/29〜1/3）
  "2026-12-29",
  "2026-12-30",
  "2026-12-31",
  "2027-01-01",
  "2027-01-02",
  "2027-01-03",
  // 成人の日
  "2027-01-11",
  // 大学入学共通テストの準備（全日休講）
  "2027-01-15",
]);

/** その日を含むか、これから来る学期（S か A）。学期の選び方の初期値に使う */
export function currentSemester(todayKey: DateKey): Term | undefined {
  const semesters = UTOKYO_TERMS.filter((t) => t.label === "S" || t.label === "A");
  return semesters.find((t) => todayKey <= t.end) ?? semesters.at(-1);
}

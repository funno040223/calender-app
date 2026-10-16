import { MIN } from "./jst";
import { dateKeyOf, type DateKey, type MockData, type WakeLog } from "./model";
import { nightOf } from "./night";

/** 予定の起床からこれより遅れて「起きた」を押すときは、いつ起きたかを聞く（押し忘れ・寝坊） */
export const ASK_WAKE_AFTER_MINUTES = 30;
/** 候補に出す時刻の範囲（予定の起床の何分前から） */
const CANDIDATE_FROM_MINUTES = 3 * 60;
/** 近い候補はまとめる */
const SAME_MINUTES = 5;

export type WakeCandidateKind = "planned" | "opened" | "routine" | "smoke" | "now";

export interface WakeCandidate {
  kind: WakeCandidateKind;
  at: number;
}

export const WAKE_CANDIDATE_LABEL: Record<WakeCandidateKind, string> = {
  planned: "予定",
  opened: "アプリを開いた",
  routine: "朝ルーティン",
  smoke: "タバコ",
  now: "いま",
};

/** 遅れて押すときは、いつ起きたかを聞く */
export const asksWakeTime = (now: number, expected: number | undefined) =>
  expected !== undefined && now > expected + ASK_WAKE_AFTER_MINUTES * MIN;

/**
 * 「いつ起きた？」の候補：予定の起床と、その朝に起きて動いていた手がかり（最初にアプリを開いた・朝ルーティンの最初のチェック・最初のタバコ）、いま。
 * ヘルスケアの目覚めは出さない（目が覚めても起き上がったとは限らない。夜の記録で活動と睡眠を分けているため）。
 * 古い順。近いもの（5分以内）は先に出たほうだけ残す（いまは必ず残す）
 */
export function wakeCandidates(
  data: Pick<MockData, "wakeLogs" | "smokeLogs">,
  date: DateKey,
  expected: number | undefined,
  now: number,
): WakeCandidate[] {
  const log = data.wakeLogs.find((l) => l.date === date);
  const from = (expected ?? now) - CANDIDATE_FROM_MINUTES * MIN;
  const smoke = data.smokeLogs.filter((t) => t >= from && t <= now).sort((a, b) => a - b)[0];
  const raw: (WakeCandidate | undefined)[] = [
    expected !== undefined ? { kind: "planned", at: expected } : undefined,
    log?.openedAt !== undefined ? { kind: "opened", at: log.openedAt } : undefined,
    log?.routineStartedAt !== undefined ? { kind: "routine", at: log.routineStartedAt } : undefined,
    smoke !== undefined ? { kind: "smoke", at: smoke } : undefined,
  ];
  const near = (a: number, b: number) => Math.abs(a - b) < SAME_MINUTES * MIN;
  const picked: WakeCandidate[] = [];
  for (const c of raw) {
    if (!c || c.at < from || c.at >= now - SAME_MINUTES * MIN) continue;
    if (picked.some((p) => near(p.at, c.at))) continue;
    picked.push(c);
  }
  return [...picked.sort((a, b) => a.at - b.at), { kind: "now", at: now }];
}

/**
 * 最初にアプリを開いた時刻を、その朝の記録に残す（「いつ起きた？」の候補と、起きるまで止める通知に使う）。
 * 朝のうち（予定の起床の2時間前〜寝る準備）だけ。夜中に開いたのは数えない
 */
export function markOpened(d: MockData, now: number, window: { wake: number; end: number } | undefined): MockData {
  if (!window || now < window.wake - 2 * 60 * MIN || now >= window.end) return d;
  const date = dateKeyOf(now);
  const log = d.wakeLogs.find((l) => l.date === date);
  if (log?.openedAt !== undefined) return d;
  const next: WakeLog = { ...(log ?? { date, doneStepIds: [] }), openedAt: now };
  return { ...d, wakeLogs: [...d.wakeLogs.filter((l) => l.date !== date), next].sort((a, b) => a.date.localeCompare(b.date)) };
}

/**
 * 起きていると分かった最初の時刻（起きた記録・朝ルーティン・アプリを開いた・ヘルスケアの目覚め）。通知を止めるのをやめる合図。
 * healthEnd は、届いたばかりのヘルスケアの目覚め（app_state にまだないもの）
 */
export function awakeSince(data: Partial<Pick<MockData, "sleepLogs" | "wakeLogs">>, date: DateKey, healthEnd?: number): number | undefined {
  const log = data.wakeLogs?.find((l) => l.date === date);
  const times = [nightOf(data, date).up?.at, log?.routineStartedAt, log?.openedAt, healthEnd].filter((t): t is number => typeof t === "number" && Number.isFinite(t));
  return times.length ? Math.min(...times) : undefined;
}

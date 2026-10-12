import { expect, it } from "vitest";
import { jst } from "@/lib/scheduler/test-helpers";
import { sampleData } from "./state";
import { asksWakeTime, awakeSince, markOpened, wakeCandidates } from "./wake";

const planned = jst(2026, 10, 6, 9);
const now = jst(2026, 10, 6, 11);

it("予定の起床から30分を過ぎて押すときだけ、いつ起きたかを聞く", () => {
  expect(asksWakeTime(planned + 30 * 60_000, planned)).toBe(false);
  expect(asksWakeTime(planned + 31 * 60_000, planned)).toBe(true);
});

it("候補は予定・その朝に動いていた手がかり・いまを古い順に。ヘルスケアの目覚めは出さない", () => {
  const d = sampleData(now);
  const data = {
    ...d,
    smokeLogs: [jst(2026, 10, 6, 9, 40), jst(2026, 10, 5, 22)],
    healthSleep: { "2026-10-06": { start: jst(2026, 10, 6, 1), end: jst(2026, 10, 6, 8, 30), minutes: 450 } },
    wakeLogs: [{ date: "2026-10-06", doneStepIds: [], openedAt: jst(2026, 10, 6, 9, 20) }],
  };
  const got = wakeCandidates(data, "2026-10-06", planned, now);
  expect(got.map((c) => c.kind)).toEqual(["planned", "opened", "smoke", "now"]);
  expect(got[0].at).toBe(planned);
});

it("最初に開いた時刻は朝のうちだけ、1回だけ残す", () => {
  const d = sampleData(now);
  const window = { wake: planned, end: jst(2026, 10, 6, 23) };
  expect(markOpened(d, jst(2026, 10, 6, 2), window)).toBe(d);
  const once = markOpened(d, jst(2026, 10, 6, 8), window);
  expect(once.wakeLogs.find((l) => l.date === "2026-10-06")?.openedAt).toBe(jst(2026, 10, 6, 8));
  expect(markOpened(once, jst(2026, 10, 6, 10), window)).toBe(once);
});

it("起きていると分かった最初の時刻", () => {
  expect(awakeSince(undefined)).toBeUndefined();
  expect(awakeSince({ openedAt: 3, wokeAt: 5 }, 4)).toBe(3);
});

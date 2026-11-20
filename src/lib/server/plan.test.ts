import { beforeEach, expect, it, vi } from "vitest";
import { jst } from "@/lib/scheduler/test-helpers";
import { sampleData } from "@/lib/mock/state";
import { fetchIcsText } from "@/lib/ical/fetch";
import { planOnServer } from "./plan";

vi.mock("@/lib/ical/fetch", () => ({ fetchIcsText: vi.fn() }));

const now = jst(2026, 10, 1, 13);
const last = [{ id: "ical-s1-a", title: "前回の予定", start: jst(2026, 10, 2, 10), end: jst(2026, 10, 2, 11), atHome: true }];

/** ical_sources だけを持つ、小さな偽の DB */
function fakeDb(lastEvents: unknown) {
  const updates: Record<string, unknown>[] = [];
  const table = {
    select: (cols: string) => ({
      eq: () => (cols === "id, url" ? Promise.resolve({ data: [{ id: "s1", url: "https://example.com/a.ics" }], error: null }) : { maybeSingle: async () => ({ data: { last_events: lastEvents }, error: null }) }),
    }),
    update: (v: Record<string, unknown>) => {
      updates.push(v);
      return { eq: async () => ({ error: null }) };
    },
  };
  return { db: { from: () => table, rpc: async () => ({ data: { revision: 0, events: [] } }) }, updates };
}

beforeEach(() => {
  vi.mocked(fetchIcsText).mockReset();
});

it("取り込みに失敗した元は、前回の結果で補って組み直す", async () => {
  vi.mocked(fetchIcsText).mockImplementation(async () => { throw new Error("timeout"); });
  const { db, updates } = fakeDb(last);
  const r = await planOnServer(db as never, "u", sampleData(now), now);
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.state.googleEvents.map((e) => e.id)).toContain("ical-s1-a");
  expect(updates.some((u) => u.last_error)).toBe(true);
});

it("失敗して、前回の結果もなければ組み直さない", async () => {
  vi.mocked(fetchIcsText).mockImplementation(async () => { throw new Error("timeout"); });
  const { db } = fakeDb(null);
  const r = await planOnServer(db as never, "u", sampleData(now), now);
  expect(r).toMatchObject({ ok: false, reason: "ical" });
});

it("生活の運動予定が取得できないときは、空の予定で配信データを上書きしない", async () => {
  const { db } = fakeDb(last);
  const unavailable = { ...db, rpc: async () => ({ data: null, error: { code: "timeout" } }) };
  expect(await planOnServer(unavailable as never, "u", sampleData(now), now)).toEqual({ ok: false, reason: "life" });
});

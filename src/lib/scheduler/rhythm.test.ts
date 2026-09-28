import { describe, expect, it } from "vitest";
import { computeDayPlans } from "./rhythm";
import { plan } from "./planner";
import { localDayStart } from "./time";
import { DEFAULT_SETTINGS, type Place } from "./types";
import { baseInput, jst } from "./test-helpers";

const s = DEFAULT_SETTINGS;
const places: Place[] = [{ id: "univ", name: "大学", keywords: [], travelMinutes: 45 }];
const firstDay = localDayStart(jst(2026, 10, 1), s.tzOffsetMinutes);

describe("起床・就寝の計算", () => {
  const away = { id: "e1", title: "授業", start: jst(2026, 10, 1, 10), end: jst(2026, 10, 1, 12), location: "〇〇大学 3号館" };

  it("外出する日は、家を出る時刻から朝ルーティンと準備の分だけ前に起きる", () => {
    const [d0] = computeDayPlans(firstDay, 3, [away], places, s);
    expect(d0.leave).toBe(jst(2026, 10, 1, 9, 15));
    expect(d0.wake).toBe(jst(2026, 10, 1, 8, 20));
    expect(d0.wakeSource).toBe("away");
  });

  it("在宅の日は、前後の日に合わせた時刻のほうが早ければそちらに起きる", () => {
    const online = { id: "e2", title: "面談", start: jst(2026, 10, 2, 10), end: jst(2026, 10, 2, 11), location: "Zoom" };
    const [, d1] = computeDayPlans(firstDay, 3, [away, online], places, s);
    expect(d1.wake).toBe(jst(2026, 10, 2, 8, 20));
    expect(d1.wakeSource).toBe("neighbors");
  });

  it("在宅の遅い予定だけの日でも、前後に予定がなければ既定の時刻に起きる", () => {
    const late = { id: "e3", title: "面接", start: jst(2026, 10, 2, 15), end: jst(2026, 10, 2, 16), location: "Zoom" };
    const [d0, d1] = computeDayPlans(firstDay, 3, [late], places, s);
    expect(d1.wake).toBe(jst(2026, 10, 2, 9));
    expect(d0.bed).toBe(jst(2026, 10, 2, 2));
  });

  it("就寝は翌日の起床の7時間前", () => {
    const [d0, d1] = computeDayPlans(firstDay, 3, [away], places, s);
    expect(d0.bed).toBe(d1.wake - 7 * 3600_000);
  });

  it("予定がまったくない日は既定の起床時刻", () => {
    const [d0] = computeDayPlans(firstDay, 2, [], places, s);
    expect(d0.wake).toBe(jst(2026, 10, 1, 9));
    expect(d0.wakeSource).toBe("default");
  });

  it("メモの「移動30」を移動時間として読む", () => {
    const cafe = { ...away, location: "駅前のカフェ", description: "移動30" };
    const [d0] = computeDayPlans(firstDay, 2, [cafe], places, s);
    expect(d0.leave).toBe(jst(2026, 10, 1, 9, 30));
  });

  it("登録のない場所は、移動時間を聞く対象になる", () => {
    const unknown = { ...away, location: "インターン先ビル" };
    const result = plan(baseInput(jst(2026, 10, 1, 6), { events: [unknown], places }));
    expect(result.travelQuestions).toEqual([{ eventId: "e1", location: "インターン先ビル" }]);
  });
});

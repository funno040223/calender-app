import { describe, expect, it } from "vitest";
import { computeDayPlans, wakingDayStart } from "./rhythm";
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

  it("前の日が早起きなら、在宅の日も起床のずれを30分以内に抑える", () => {
    const online = { id: "e2", title: "面談", start: jst(2026, 10, 2, 10), end: jst(2026, 10, 2, 11), location: "Zoom" };
    const [, d1] = computeDayPlans(firstDay, 3, [away, online], places, s);
    // 前の日は 8:20 起床 → 9:00 ではなく 8:50
    expect(d1.wake).toBe(jst(2026, 10, 2, 8, 50));
    expect(d1.wakeSource).toBe("neighbors");
  });

  it("早起きの日の前後は、1日30分ずつ既定の時刻に近づける", () => {
    // 10/3 8:00 に大学 → 7:15 に家を出る → 6:20 起床
    const early = { id: "e6", title: "1限", start: jst(2026, 10, 3, 8), end: jst(2026, 10, 3, 9), location: "大学" };
    const wakes = computeDayPlans(firstDay, 6, [early], places, s).map((d) => d.wake);
    expect(wakes).toEqual([
      jst(2026, 10, 1, 7, 20),
      jst(2026, 10, 2, 6, 50),
      jst(2026, 10, 3, 6, 20),
      jst(2026, 10, 4, 6, 50),
      jst(2026, 10, 5, 7, 20),
      jst(2026, 10, 6, 7, 50),
    ]);
  });

  it("在宅の遅い予定だけの日でも、前後に予定がなければ既定の時刻に起きる", () => {
    const late = { id: "e3", title: "面接", start: jst(2026, 10, 2, 15), end: jst(2026, 10, 2, 16), location: "Zoom" };
    const [d0, d1] = computeDayPlans(firstDay, 3, [late], places, s);
    expect(d1.wake).toBe(jst(2026, 10, 2, 9));
    expect(d0.bed).toBe(jst(2026, 10, 2, 2));
  });

  it("在宅の夜の予定があっても、次の予定のない日は既定の時刻より遅く起きない", () => {
    const evening = { id: "e4", title: "オンライン会議", start: jst(2026, 10, 1, 19), end: jst(2026, 10, 1, 20), location: "Zoom" };
    const [d0, d1] = computeDayPlans(firstDay, 3, [evening], places, s);
    expect(d0.wake).toBe(jst(2026, 10, 1, 9));
    expect(d1.wake).toBe(jst(2026, 10, 2, 9));
    expect(d1.wakeSource).toBe("default");
  });

  it("外出する日も、出発が遅ければ既定の時刻に起き、前の晩はふだんどおりに寝る", () => {
    const outing = { id: "e5", title: "買い物", start: jst(2026, 10, 2, 17), end: jst(2026, 10, 2, 19), location: "駅前", travelMinutes: 20 };
    const [d0, d1] = computeDayPlans(firstDay, 3, [outing], places, s);
    expect(d1.leave).toBe(jst(2026, 10, 2, 16, 40));
    expect(d1.wake).toBe(jst(2026, 10, 2, 9));
    expect(d1.wakeSource).toBe("default");
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

describe("起床の差の上限は、計算の範囲の外の日にも効く", () => {
  const early = { id: "e6", title: "1限", start: jst(2026, 10, 1, 8), end: jst(2026, 10, 1, 9), location: "大学" };

  it("前の日に早起きしていたら、範囲が翌日から始まっても9時に戻らない", () => {
    // 10/1 6:20 起床。10/2 から始めても 6:50 → 7:20 と戻る
    const wakes = computeDayPlans(firstDay + 24 * 3600_000, 3, [early], places, s).map((d) => d.wake);
    expect(wakes).toEqual([jst(2026, 10, 2, 6, 50), jst(2026, 10, 3, 7, 20), jst(2026, 10, 4, 7, 50)]);
  });

  it("早起きの日の前の日の就寝も、範囲の頭で変わらない", () => {
    const whole = computeDayPlans(firstDay - 24 * 3600_000, 4, [early], places, s);
    const fromToday = computeDayPlans(firstDay, 3, [early], places, s);
    expect(fromToday[0].wake).toBe(whole[1].wake);
    expect(fromToday[0].bed).toBe(whole[1].bed);
  });

  it("1週間そろえるのは、月曜始まりの週ごと", () => {
    // 2026-10-01 は木曜。10/5（月）の 6:20 起床は、前の週（10/1〜10/4）には及ばない（前の週は日曜の 6:50 にそろう）
    const mon = { id: "e7", title: "1限", start: jst(2026, 10, 5, 8), end: jst(2026, 10, 5, 9), location: "大学" };
    const days = computeDayPlans(firstDay, 7, [mon], places, { ...s, fixedWakeMode: true });
    const minutes = days.map((d) => Math.round((d.wake - d.dayStart) / 60_000));
    expect(minutes).toEqual([410, 410, 410, 410, 380, 380, 380]);
  });
});

describe("身支度は1日1回、身支度の要る最初の予定の前に置く", () => {
  const home = { id: "h1", title: "ゼミの準備", start: jst(2026, 10, 1, 10), end: jst(2026, 10, 1, 11), atHome: true };
  const evening = { id: "o1", title: "食事会", start: jst(2026, 10, 1, 18), end: jst(2026, 10, 1, 20), location: "渋谷", travelMinutes: 30 };

  it("朝は在宅の予定、夕方に外出の日も、身支度が出発の前に入る", () => {
    const [d0] = computeDayPlans(firstDay, 2, [home, evening], places, s);
    expect(d0.prep).toBe(true);
    expect(d0.prepAt).toBe(jst(2026, 10, 1, 17, 30));
    expect(d0.prepAway).toBe(true);
    // 起床は朝の在宅の予定（開始20分前）より前、既定の 9:00
    expect(d0.wake).toBe(jst(2026, 10, 1, 9));
  });

  it("身支度の要る予定が複数あっても、いちばん早いものの前の1回だけ", () => {
    const online = { id: "z1", title: "面談", start: jst(2026, 10, 1, 13), end: jst(2026, 10, 1, 14), location: "https://zoom.us/j/1" };
    const [d0] = computeDayPlans(firstDay, 2, [online, evening], places, s);
    expect(d0.prepAt).toBe(jst(2026, 10, 1, 13));
    expect(d0.prepAway).toBe(false);
  });

  it("身支度の要る予定がない日は身支度なし", () => {
    const [d0] = computeDayPlans(firstDay, 2, [home], places, s);
    expect(d0.prep).toBe(false);
    expect(d0.prepAt).toBeUndefined();
  });
});

describe("「起きている日」の数え方は1つ", () => {
  const days = computeDayPlans(firstDay, 3, [], places, s);

  it("就寝を過ぎた夜中の時刻も、起きていた前の日の分", () => {
    const [d0, d1] = days;
    // 10/1 の就寝は 10/2 2:00。1:30 は 10/1 の分
    expect(wakingDayStart(jst(2026, 10, 2, 1, 30), days, s.tzOffsetMinutes)).toBe(d0.dayStart);
    expect(wakingDayStart(jst(2026, 10, 2, 10), days, s.tzOffsetMinutes)).toBe(d1.dayStart);
  });

  it("計画の外でも、0:00〜4:00 は前の日の続き", () => {
    expect(wakingDayStart(jst(2026, 10, 9, 0, 40), [], s.tzOffsetMinutes)).toBe(jst(2026, 10, 8));
    expect(wakingDayStart(jst(2026, 10, 9, 4, 0), [], s.tzOffsetMinutes)).toBe(jst(2026, 10, 9));
  });
});

describe("休日", () => {
  it("終日の予定で家にいない日（帰省など）は、休日にしない", () => {
    const trip = { id: "trip", title: "帰省", start: jst(2026, 10, 2), end: jst(2026, 10, 3), allDay: true, awayFromHome: true };
    const memo = { id: "memo", title: "誕生日", start: jst(2026, 10, 1), end: jst(2026, 10, 2), allDay: true };
    const [d0, d1, d2] = computeDayPlans(firstDay, 3, [trip, memo], places, s);
    expect(d0.holiday).toBe(true);
    expect(d1.holiday).toBe(false);
    expect(d2.holiday).toBe(true);
  });
});

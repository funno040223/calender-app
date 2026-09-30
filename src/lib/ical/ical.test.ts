import { describe, expect, it } from "vitest";
import { parseIcs } from "./import";
import { buildIcs } from "./export";

/** 日本時間の日時を epoch ミリ秒で返す */
const jst = (y: number, m: number, d: number, h = 0, mi = 0) => Date.UTC(y, m - 1, d, h - 9, mi);

// Google カレンダーの「iCal 形式の非公開アドレス」が返す形に近いサンプル
const GOOGLE_LIKE = [
  "BEGIN:VCALENDAR",
  "PRODID:-//Google Inc//Google Calendar 70.9054//EN",
  "VERSION:2.0",
  "CALSCALE:GREGORIAN",
  "X-WR-TIMEZONE:Asia/Tokyo",
  "BEGIN:VTIMEZONE",
  "TZID:Asia/Tokyo",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0900",
  "TZOFFSETTO:+0900",
  "TZNAME:JST",
  "DTSTART:19700101T000000",
  "END:STANDARD",
  "END:VTIMEZONE",
  // 毎週木曜 13:00–14:30、10/15 は除外、10/22 は 15:00 に変更
  "BEGIN:VEVENT",
  "DTSTART;TZID=Asia/Tokyo:20261001T130000",
  "DTEND;TZID=Asia/Tokyo:20261001T143000",
  "RRULE:FREQ=WEEKLY;BYDAY=TH",
  "EXDATE;TZID=Asia/Tokyo:20261015T130000",
  "UID:weekly-seminar@google.com",
  "SUMMARY:ゼミ",
  "LOCATION:大学 研究棟",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;TZID=Asia/Tokyo:20261022T150000",
  "DTEND;TZID=Asia/Tokyo:20261022T163000",
  "RECURRENCE-ID;TZID=Asia/Tokyo:20261022T130000",
  "UID:weekly-seminar@google.com",
  "SUMMARY:ゼミ（時間変更）",
  "END:VEVENT",
  // UTC で書かれた単発の予定
  "BEGIN:VEVENT",
  "DTSTART:20261003T010000Z",
  "DTEND:20261003T020000Z",
  "UID:dentist@google.com",
  "SUMMARY:歯医者",
  "DESCRIPTION:保険証を持っていく\\n予約番号 12",
  "END:VEVENT",
  // 終日で2日間
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20261010",
  "DTEND;VALUE=DATE:20261012",
  "UID:trip@google.com",
  "SUMMARY:旅行",
  "END:VEVENT",
  // キャンセルされた予定は取り込まない
  "BEGIN:VEVENT",
  "DTSTART:20261004T010000Z",
  "DTEND:20261004T020000Z",
  "UID:cancelled@google.com",
  "SUMMARY:中止になった予定",
  "STATUS:CANCELLED",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

const october = { from: jst(2026, 10, 1), to: jst(2026, 11, 1) };

describe("iCal の取り込み", () => {
  const events = parseIcs(GOOGLE_LIKE, october);
  const seminars = events.filter((e) => e.title.startsWith("ゼミ"));

  it("繰り返しの予定を1回ずつに展開し、除外日を外す", () => {
    // 10/1, 8, (15 は除外), 22（変更）, 29
    expect(seminars.map((e) => e.start)).toEqual([
      jst(2026, 10, 1, 13),
      jst(2026, 10, 8, 13),
      jst(2026, 10, 22, 15),
      jst(2026, 10, 29, 13),
    ]);
    expect(seminars[0].end).toBe(jst(2026, 10, 1, 14, 30));
    expect(seminars[0].location).toBe("大学 研究棟");
  });

  it("個別に変更した回は、変更後の時刻とタイトルで取り込む", () => {
    const changed = seminars.find((e) => e.start === jst(2026, 10, 22, 15))!;
    expect(changed.title).toBe("ゼミ（時間変更）");
    expect(changed.end).toBe(jst(2026, 10, 22, 16, 30));
  });

  it("UTC の予定を日本時間で読み、改行を含むメモも読む", () => {
    const dentist = events.find((e) => e.title === "歯医者")!;
    expect(dentist.start).toBe(jst(2026, 10, 3, 10));
    expect(dentist.description).toBe("保険証を持っていく\n予約番号 12");
  });

  it("終日の予定は日本時間の日付の 0:00 から、終わりの日付の 0:00 まで", () => {
    const trip = events.find((e) => e.title === "旅行")!;
    expect(trip.allDay).toBe(true);
    expect(trip.start).toBe(jst(2026, 10, 10));
    expect(trip.end).toBe(jst(2026, 10, 12));
  });

  it("キャンセルされた予定と、範囲外の回は取り込まない", () => {
    expect(events.some((e) => e.title === "中止になった予定")).toBe(false);
    const firstWeek = parseIcs(GOOGLE_LIKE, { from: jst(2026, 10, 1), to: jst(2026, 10, 8) });
    expect(firstWeek.filter((e) => e.title.startsWith("ゼミ"))).toHaveLength(1);
  });

  it("タイムゾーンの定義がない時刻は、日本時間として読む", () => {
    const bare = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      "DTSTART;TZID=Asia/Tokyo:20261005T100000",
      "DTEND;TZID=Asia/Tokyo:20261005T110000",
      "UID:bare@example.com",
      "SUMMARY:面談",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "DTSTART:20261006T100000",
      "DTEND:20261006T110000",
      "UID:floating@example.com",
      "SUMMARY:散髪",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const [a, b] = parseIcs(bare, october);
    expect(a.start).toBe(jst(2026, 10, 5, 10));
    expect(b.start).toBe(jst(2026, 10, 6, 10));
  });

  it("繰り返しの各回には、別々の ID を付ける", () => {
    expect(new Set(seminars.map((e) => e.id)).size).toBe(seminars.length);
  });
});

describe("iCal の配信", () => {
  const now = jst(2026, 9, 28, 12);
  const ics = buildIcs(
    [
      { uid: "task-1@task-rhythm-app", title: "レポート, 第2章; 下書き", start: jst(2026, 10, 1, 11), end: jst(2026, 10, 1, 13) },
      { uid: "trip-1@task-rhythm-app", title: "帰省", start: jst(2026, 10, 10), end: jst(2026, 10, 12), allDay: true },
    ],
    "リズム カレンダー",
    now,
  );

  it("購読できる形式で書き出す", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(ics).toContain("X-WR-CALNAME:リズム カレンダー");
    expect(ics).toContain("\r\n");
  });

  it("書き出したものを読み直すと、同じ時刻とタイトルになる", () => {
    const back = parseIcs(ics, october);
    expect(back.map((e) => [e.title, e.start, e.end, e.allDay ?? false])).toEqual([
      ["レポート, 第2章; 下書き", jst(2026, 10, 1, 11), jst(2026, 10, 1, 13), false],
      ["帰省", jst(2026, 10, 10), jst(2026, 10, 12), true],
    ]);
  });
});

describe("取り込み元の URL の確認", () => {
  it("Google カレンダーと iCloud の https だけを許可する", async () => {
    const { normalizeIcsUrl } = await import("./source");
    expect(normalizeIcsUrl("https://calendar.google.com/calendar/ical/abc%40group.calendar.google.com/private-xyz/basic.ics")?.hostname).toBe(
      "calendar.google.com",
    );
    expect(normalizeIcsUrl("webcal://p37-caldav.icloud.com/published/2/abc")?.protocol).toBe("https:");
    expect(normalizeIcsUrl("http://calendar.google.com/x.ics")).toBeUndefined();
    expect(normalizeIcsUrl("https://calendar.google.com.evil.example/x.ics")).toBeUndefined();
    expect(normalizeIcsUrl("https://localhost/x.ics")).toBeUndefined();
    expect(normalizeIcsUrl("https://user:pass@calendar.google.com/x.ics")).toBeUndefined();
    expect(normalizeIcsUrl("https://calendar.google.com:8443/x.ics")).toBeUndefined();
    expect(normalizeIcsUrl("not a url")).toBeUndefined();
  });
});

describe("後ろの回を前へ移した繰り返しの予定", () => {
  const moved = GOOGLE_LIKE.replace(
    "END:VCALENDAR",
    [
      "BEGIN:VEVENT",
      "DTSTART;TZID=Asia/Tokyo:20261009T100000",
      "DTEND;TZID=Asia/Tokyo:20261009T113000",
      "RECURRENCE-ID;TZID=Asia/Tokyo:20261029T130000",
      "UID:weekly-seminar@google.com",
      "SUMMARY:ゼミ（前倒し）",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n"),
  );

  it("元の日時が範囲より後でも、移した先が範囲の中なら取り込む（1回だけ）", () => {
    const two = parseIcs(moved, { from: jst(2026, 10, 1), to: jst(2026, 10, 15) }).filter((e) => e.title === "ゼミ（前倒し）");
    expect(two.map((e) => e.start)).toEqual([jst(2026, 10, 9, 10)]);
    const all = parseIcs(moved, october).filter((e) => e.title === "ゼミ（前倒し）");
    expect(all).toHaveLength(1);
  });
});

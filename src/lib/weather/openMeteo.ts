/** 天気予報：Open-Meteo（無料・鍵なし）。場所の検索と、日ごとの雨の確率 */

import type { WeatherPlace } from "@/lib/mock/model";

export interface PlaceCandidate extends WeatherPlace {
  /** 都道府県など（同じ名前の町を見分ける） */
  area: string;
}

/** 市区町村の名前から、候補の場所（最大5件） */
export async function searchPlaces(name: string): Promise<PlaceCandidate[]> {
  const q = name.trim();
  if (!q) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=ja&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("場所を検索できませんでした");
  const json = (await res.json()) as { results?: { name: string; latitude: number; longitude: number; admin1?: string; admin2?: string }[] };
  return (json.results ?? []).map((r) => ({ name: r.name, lat: r.latitude, lon: r.longitude, area: [r.admin1, r.admin2].filter(Boolean).join("・") }));
}

/** 活動する時間帯（散歩・洗濯・外出）。夜中だけの雨で、1日を雨の日にしない */
export const ACTIVE_HOURS = { from: 6, to: 22 };

/** 時間ごとの雨の確率から、日ごとに活動する時間帯の最大 % を求める。time は日本時間の "YYYY-MM-DDTHH:00" */
export function dailyRainChance(times: string[], probs: (number | null)[]): Record<string, number> {
  const out: Record<string, number> = {};
  times.forEach((t, i) => {
    const p = probs[i];
    const hour = Number(t.slice(11, 13));
    if (typeof p !== "number" || !(hour >= ACTIVE_HOURS.from && hour < ACTIVE_HOURS.to)) return;
    const day = t.slice(0, 10);
    out[day] = Math.max(out[day] ?? 0, p);
  });
  return out;
}

/** その場所の、16日分の雨の確率（日付 YYYY-MM-DD → 6時〜22時の最大 %）。日付は日本時間 */
export async function fetchRainChance(place: WeatherPlace): Promise<Record<string, number>> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}` +
    "&hourly=precipitation_probability&timezone=Asia%2FTokyo&forecast_days=16";
  const res = await fetch(url);
  if (!res.ok) throw new Error("天気予報を取れませんでした");
  const json = (await res.json()) as { hourly?: { time?: string[]; precipitation_probability?: (number | null)[] } };
  return dailyRainChance(json.hourly?.time ?? [], json.hourly?.precipitation_probability ?? []);
}

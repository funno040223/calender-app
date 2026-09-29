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

/** その場所の、16日分の雨の確率（日付 YYYY-MM-DD → その日の最大 %）。日付は日本時間 */
export async function fetchRainChance(place: WeatherPlace): Promise<Record<string, number>> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}` +
    "&daily=precipitation_probability_max&timezone=Asia%2FTokyo&forecast_days=16";
  const res = await fetch(url);
  if (!res.ok) throw new Error("天気予報を取れませんでした");
  const json = (await res.json()) as { daily?: { time?: string[]; precipitation_probability_max?: (number | null)[] } };
  const days = json.daily?.time ?? [];
  const probs = json.daily?.precipitation_probability_max ?? [];
  return Object.fromEntries(days.flatMap((d, i) => (typeof probs[i] === "number" ? [[d, probs[i] as number]] : [])));
}

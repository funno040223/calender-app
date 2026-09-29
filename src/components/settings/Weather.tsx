"use client";

import { useState } from "react";
import { useApp } from "@/components/app/StoreProvider";
import { EmptyNote, Group, Row, inputCls } from "@/components/ui/controls";
import { DAY_MS, dayStartOf, formatDate } from "@/lib/mock/jst";
import { RAIN_THRESHOLD, dateKeyOf } from "@/lib/mock/model";
import { searchPlaces, type PlaceCandidate } from "@/lib/weather/openMeteo";

/** 天気予報の場所。雨の確率が高い日は、散歩を雨の日の代わりにし、洗濯を避ける */
export default function Weather() {
  const { state, update } = useApp();
  const [q, setQ] = useState("");
  const [found, setFound] = useState<PlaceCandidate[]>();
  const [message, setMessage] = useState("");
  const search = async () => {
    setMessage("");
    try {
      const r = await searchPlaces(q);
      setFound(r);
      if (!r.length) setMessage("見つかりませんでした");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "検索できませんでした");
    }
  };
  const choose = (p: PlaceCandidate) => {
    // 場所を変えたら予報を取り直す
    update((d) => ({ ...d, weatherPlace: { name: p.name, lat: p.lat, lon: p.lon }, rainForecast: undefined }));
    setFound(undefined);
    setQ("");
  };
  const today = dayStartOf(state.plannedAt);
  const days = Array.from({ length: 7 }, (_, i) => today + i * DAY_MS);
  const forecast = state.rainForecast?.days ?? {};
  return (
    <>
      <Group title="場所">
        {state.weatherPlace ? (
          <Row label={state.weatherPlace.name}>
            <button type="button" onClick={() => update((d) => ({ ...d, weatherPlace: undefined, rainForecast: undefined }))} className="text-[14px] text-accent">
              やめる
            </button>
          </Row>
        ) : (
          <EmptyNote>まだ選んでいません。</EmptyNote>
        )}
        <form
          className="flex gap-2 px-4 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
        >
          <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="市区町村（例：世田谷）" aria-label="市区町村" />
          <button type="submit" className="shrink-0 rounded-lg bg-accent px-3 py-2 text-[15px] font-medium text-white">
            検索
          </button>
        </form>
        {found?.map((p) => (
          <Row key={`${p.lat},${p.lon}`} label={p.name} sub={p.area} onClick={() => choose(p)} />
        ))}
        {message && <EmptyNote>{message}</EmptyNote>}
      </Group>
      {state.weatherPlace && (
        <Group title="雨の確率">
          {Object.keys(forecast).length === 0 ? (
            <EmptyNote>取得中…</EmptyNote>
          ) : (
            days.map((d) => {
              const p = forecast[dateKeyOf(d)];
              return (
                <Row key={d} label={formatDate(d)} detail={p === undefined ? "—" : `${p}%${p >= RAIN_THRESHOLD ? "・雨" : ""}`} />
              );
            })
          )}
        </Group>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { useApp } from "@/components/app/StoreProvider";
import { inputBase, Card } from "@/components/ui/controls";
import type { Exercise } from "@/lib/life/model";
import { useLife } from "@/lib/life/store";
import { WALK_HABIT_ID, shoulderTimesOf, walkMinutesOfRecord, weekSummaries } from "@/lib/life/workouts";
import { Segments, choice, field, inset } from "./Controls";
import { ExercisePanel, activityLabels } from "./Exercise";
import { updateQuery } from "./navigation";

const shortDate = (key: string) => {
  const [, m, d] = key.split("-").map(Number);
  return `${m}/${d}`;
};

/** 記録の一覧の1行 */
function labelOf(e: Exercise) {
  const what =
    e.activity === "walking"
      ? `歩く ${walkMinutesOfRecord(e)}分`
      : e.activity === "mobility"
        ? e.details?.some((d) => d.id === "shoulder")
          ? `肩こりほぐし ${shoulderTimesOf(e)}回`
          : "ほぐす"
        : `筋トレ ${e.variant === "short" ? "短め" : "ふつう"}`;
  return `${shortDate(e.date)} · ${what}`;
}

/** 記録：週ごとのまとめ、やった記録（押すと直せる）、ほかの日の分をつける */
export default function ExerciseHistory({
  today,
  date,
  activity,
  picked,
}: {
  today: string;
  date: string;
  activity: Exercise["activity"];
  picked: string | null;
}) {
  const { state } = useApp();
  const life = useLife();
  const entries = Object.values(life.projection.exercise)
    .map((row) => row.value)
    .sort((a, b) => b.date.localeCompare(a.date) || a.roundId.localeCompare(b.roundId));
  const selected = entries.find((e) => e.roundId === picked);
  const habitMinutes = state.habits.find((h) => h.id === WALK_HABIT_ID)?.durationMinutes ?? 20;
  const weeks = weekSummaries(entries, state.habitLogs, habitMinutes, today, 6);
  const rounds = state.result.exerciseRounds ?? [];
  const [other, setOther] = useState(false);
  return (
    <>
      <Card title="週ごと">
        <table className="mx-4 my-2 text-sm tabular-nums">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-1 pr-4 font-normal">週</th>
              <th className="py-1 pr-4 font-normal">筋トレ</th>
              <th className="py-1 pr-4 font-normal">歩く</th>
              <th className="py-1 font-normal">ほぐす</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w, i) => (
              <tr key={w.monday}>
                <td className="py-1 pr-4">{i === 0 ? "今週" : shortDate(w.monday) + "〜"}</td>
                <td className="py-1 pr-4">{w.strength}回</td>
                <td className="py-1 pr-4">{w.walkMinutes}分</td>
                <td className="py-1">{w.shoulder}回</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="px-4 py-2 text-xs text-muted">歩くは、朝の散歩の記録も入れています。</p>
      </Card>
      <Card title="やった記録">
        <div className={inset}>
          {!entries.length && <p>まだありません。</p>}
          <div className="flex flex-wrap gap-2">
            {entries.slice(0, 40).map((e) => (
              <button
                key={e.roundId}
                type="button"
                className={choice(picked === e.roundId)}
                onClick={() => updateQuery({ round: e.roundId })}
              >
                {labelOf(e)}
              </button>
            ))}
          </div>
        </div>
      </Card>
      {selected && <ExercisePanel key={selected.roundId} {...selected} />}
      <Card title="ほかの日の分をつける">
        <div className={inset}>
          <button type="button" className={choice(other)} aria-expanded={other} onClick={() => setOther(!other)}>
            日付と種類を選ぶ
          </button>
          {other && (
            <>
              <label className={field}>
                日付
                <input
                  type="date"
                  className={inputBase}
                  value={date}
                  max={today}
                  onChange={(e) => {
                    if (e.target.value) updateQuery({ date: e.target.value });
                  }}
                />
              </label>
              <Segments
                label="運動の種類"
                options={["有酸素", "筋トレ", "ほぐす"] as const}
                selected={activityLabels[activity] as "有酸素" | "筋トレ" | "ほぐす"}
                onChange={(v) =>
                  updateQuery({ activity: v === "有酸素" ? "walking" : v === "筋トレ" ? "strength" : "mobility" })
                }
              />
            </>
          )}
        </div>
      </Card>
      {other && (
        <ExercisePanel
          key={date + activity}
          date={date}
          activity={activity}
          roundId={(activity === "strength" && rounds.find((r) => r.date === date)?.roundId) || "manual:" + date + ":" + activity}
          compact
        />
      )}
    </>
  );
}

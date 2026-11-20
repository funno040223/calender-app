"use client";

import { useApp } from "@/components/app/StoreProvider";
import { useLife } from "@/lib/life/store";
import { dateKeyOf } from "@/lib/mock/model";
import {
  WALK_HABIT_ID,
  addDays,
  addWalk,
  mondayOf,
  stageOf,
  walkMinutesBetween,
  walkMinutesOfRecord,
  walkRoundOf,
} from "@/lib/life/workouts";
import { Card } from "@/components/ui/controls";
import { choice, choices, inset } from "./Controls";

/** 1週間の有酸素（歩いた分）と、歩いた分を足すボタン。カレンダーには置かない（朝の散歩・通学で歩く） */
export default function ExerciseWalk({ date }: { date: string }) {
  const { state } = useApp();
  const life = useLife();
  const p = life.projection;
  const stage = stageOf(p.exercisePlan?.value);
  const records = Object.values(p.exercise).map((r) => r.value);
  const habitMinutes = state.habits.find((h) => h.id === WALK_HABIT_ID)?.durationMinutes ?? 20;
  const monday = mondayOf(date);
  const week = walkMinutesBetween(records, state.habitLogs, habitMinutes, monday, addDays(monday, 6));
  const roundId = walkRoundOf(date);
  const record = p.exercise[roundId]?.value;
  const today = record ? walkMinutesOfRecord(record) : 0;
  const goesOut = state.result.dayPlans.some((d) => dateKeyOf(d.dayStart) === date && d.homeAt !== undefined);
  const add = (minutes: number) => {
    const next = addWalk(record, date, minutes);
    return record ? life.resolveExercise(next) : life.completeExercise(next);
  };
  const ratio = Math.min(1, week / stage.walkMinutes);
  return (
    <Card title="歩く" right={<span className="text-sm text-muted tabular-nums">今週 {week} / {stage.walkMinutes}分</span>}>
      <div className={inset}>
        <div className="h-2 overflow-hidden rounded-full bg-surface2" aria-hidden>
          <div className="h-full rounded-full bg-tint" style={{ width: `${ratio * 100}%` }} />
        </div>
        <p className="text-sm">{stage.walk}</p>
        {goesOut && <p className="text-sm text-muted">今日は出かける日。行き帰りを早歩きにすると、それだけで20分ほどになります。</p>}
        <div role="group" aria-label="歩いた分を足す" className={choices}>
          {[10, 20, 30].map((m) => (
            <button key={m} type="button" disabled={!life.ready} className={choice(false)} onClick={() => add(m)}>
              {m}分歩いた
            </button>
          ))}
        </div>
        {today > 0 && (
          <div className={choices}>
            <span className="flex-1 text-sm">今日 {today}分</span>
            <button type="button" className={choice(false)} onClick={() => life.undoExercise(roundId)}>
              今日の分を消す
            </button>
          </div>
        )}
        <p className="text-xs text-muted">少し息がはずむが話はできる速さで。朝の散歩の記録も数えています。</p>
      </div>
    </Card>
  );
}

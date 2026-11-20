"use client";

import Link from "next/link";
import type { Habit } from "@/lib/scheduler";
import { useLife } from "@/lib/life/store";
import { LEGACY_EXERCISE_HABIT } from "@/lib/life/model";
import { useApp } from "@/components/app/StoreProvider";
import { DAY_MS } from "@/lib/mock/jst";
import { dateKeyOf, dayStartOfKey, type HabitMark } from "@/lib/mock/model";
import { keepMarkValues } from "@/lib/mock/stats";
import { Card, btnPrimary, btnSecondary } from "@/components/ui/controls";

/** この日を含む14日間に記録した回数（5分だけは、5分以下の習慣なら1回、ほかは0.5回） */
function countMarks(logs: Record<string, Record<string, HabitMark>>, habit: Habit, lastDay: number): number {
  let n = 0;
  for (let i = 0; i < 14; i++) {
    const m = logs[dateKeyOf(lastDay - i * DAY_MS)]?.[habit.id];
    if (m === "done" || (m === "five" && habit.durationMinutes <= 5)) n += 1;
    else if (m === "five") n += 0.5;
  }
  return n;
}

/** 少しずつ増やす習慣（家での運動）：2週間たったら記録を見て、増やすか・きっかけを変えるかを聞く */
export default function ReviewCard({ today }: { today: number }) {
  const { state, update, notify } = useApp();
  // 運動のプランを使うあいだは、前の「家での運動」の習慣は聞かない（長さは運動の画面で決める）
  const exercisePlanOn = !!useLife().projection.exercisePlan?.value.enabled;
  const key = dateKeyOf(today);
  const habit = state.habits.find((h) => {
    if (exercisePlanOn && h.id === LEGACY_EXERCISE_HABIT) return false;
    const from = h.progression && dayStartOfKey(h.progression.reviewFrom);
    return from !== undefined && today >= from + 14 * DAY_MS;
  });
  if (!habit?.progression) return null;
  const p = habit.progression;
  // 昨日までの2週間
  const done = countMarks(state.habitLogs, habit, today - DAY_MS);
  const planned = habit.frequency.type === "weekly" ? habit.frequency.times * 2 : 14;
  const ratio = done / planned;
  const up = ratio >= 0.8 && habit.durationMinutes < p.maxMinutes;
  const low = ratio < 0.5;
  const finish = (grow: boolean) => {
    update((d) => ({
      ...d,
      habitLogs: grow ? keepMarkValues(d.habitLogs, habit, Math.min(p.maxMinutes, habit.durationMinutes + p.stepMinutes)) : d.habitLogs,
      habits: d.habits.map((h) =>
        h.id === habit.id
          ? {
              ...h,
              durationMinutes: grow ? Math.min(p.maxMinutes, h.durationMinutes + p.stepMinutes) : h.durationMinutes,
              progression: { ...p, reviewFrom: key },
            }
          : h,
      ),
    }));
    notify(grow ? `${habit.name}を${Math.min(p.maxMinutes, habit.durationMinutes + p.stepMinutes)}分に` : "記録しました");
  };
  return (
    <Card title={habit.name}>
      <div className="flex flex-col gap-3 px-4 pt-1 pb-3.5">
        <p className="text-[15px] tabular-nums">
          2週間で <span className="font-semibold">{done}</span> / {planned} 回
        </p>
        <div className="flex flex-wrap gap-2">
          {up && (
            <button type="button" onClick={() => finish(true)} className={btnPrimary}>
              {habit.durationMinutes + p.stepMinutes}分にする
            </button>
          )}
          {low && (
            <Link href="/settings/habits" onClick={() => finish(false)} className={btnPrimary}>
              きっかけを変える
            </Link>
          )}
          <button type="button" onClick={() => finish(false)} className={btnSecondary}>
            このまま
          </button>
        </div>
      </div>
    </Card>
  );
}

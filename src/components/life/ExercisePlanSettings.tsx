"use client";

import { useState } from "react";
import { Card, btnPrimary, inputBase } from "@/components/ui/controls";
import { defaultExercisePlan } from "@/lib/life/exercisePlan";
import type { ExercisePlan } from "@/lib/life/model";
import { useLife } from "@/lib/life/store";
import { choice, choices, field, inset, summary } from "./Controls";

const asTime = (m: number) => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
const fromTime = (v: string) => {
  const [h, m] = v.split(":").map(Number);
  return h * 60 + m;
};

/** 筋トレの回をカレンダーに自動で置くかと、その回数・長さ・時間帯 */
export default function ExercisePlanSettings({ date }: { date: string }) {
  const life = useLife();
  const previous = life.projection.exercisePlan?.value;
  const [edits, setEdits] = useState<Partial<ExercisePlan>>({});
  const draft = { ...(previous ?? defaultExercisePlan(date)), ...edits };
  const [saved, setSaved] = useState(false);
  const edit = (patch: Partial<ExercisePlan>) => {
    setEdits((current) => ({ ...current, ...patch }));
    setSaved(false);
  };
  return (
    <Card title="筋トレの予定">
      <div className={inset}>
        <p className="text-sm text-muted">
          {previous?.enabled
            ? `週${previous.weeklyTimes}回、空いている時間に自動で入れています。`
            : "自動で組むと、週の回数だけ、タスクのあとの空き時間に入れます。"}
        </p>
        <details>
          <summary className={summary}>{previous?.enabled ? "予定を変える" : "自動で組む"}</summary>
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (life.saveExercisePlan({ ...draft, enabled: true, enabledOn: previous?.enabled ? previous.enabledOn : date })) {
                setEdits({});
                setSaved(true);
              }
            }}
          >
            <div className={choices}>
              {(["normalMinutes", "shortMinutes", "weeklyTimes"] as const).map((k, i) => (
                <label key={k} className={field}>
                  {["ふつう（分）", "短め（分）", "週に何回"][i]}
                  <input
                    required
                    type="number"
                    className={inputBase + " w-24"}
                    min={k === "normalMinutes" ? 5 : 1}
                    max={
                      k === "weeklyTimes"
                        ? draft.nonConsecutive
                          ? 4
                          : 7
                        : k === "shortMinutes"
                          ? draft.normalMinutes
                          : 120
                    }
                    value={draft[k] || ""}
                    onChange={(e) => edit({ [k]: Number(e.target.value) })}
                  />
                </label>
              ))}
            </div>
            <div className={choices}>
              {(["windowStart", "windowEnd"] as const).map((k, i) => (
                <label key={k} className={field}>
                  {["何時から", "何時まで"][i]}
                  <input
                    required
                    type="time"
                    className={inputBase}
                    value={asTime(draft[k])}
                    onChange={(e) => {
                      if (e.target.value) edit({ [k]: fromTime(e.target.value) });
                    }}
                  />
                </label>
              ))}
            </div>
            <label className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={draft.nonConsecutive}
                onChange={(e) => edit({ nonConsecutive: e.target.checked })}
              />
              続けての日は空ける
            </label>
            <button disabled={!life.ready || draft.windowEnd <= draft.windowStart} className={btnPrimary}>
              保存
            </button>
            {previous?.enabled && (
              <button
                type="button"
                className={choice(false)}
                onClick={() => life.saveExercisePlan({ ...previous, enabled: false })}
              >
                自動で組むのを止める
              </button>
            )}
            {saved && <span role="status">保存しました</span>}
          </form>
        </details>
      </div>
    </Card>
  );
}

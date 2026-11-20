"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { type Exercise } from "@/lib/life/model";
import { useLife } from "@/lib/life/store";
import { Card, btnPrimary, inputBase } from "@/components/ui/controls";
import { choice, choices, field, inset } from "./Controls";

const MovementGuide = dynamic(() => import("./MovementGuide"));
export const activityLabels = { walking: "有酸素", strength: "筋トレ", mobility: "ほぐす" };
const exerciseNames: Record<string, string> = {
  push: "壁腕立て",
  row: "リュックを引く",
  chair: "椅子から立つ",
  bridge: "ヒップブリッジ",
  march: "歩く・足踏み",
  calf: "ふくらはぎ伸ばし",
};
const exercises = { strength: ["push", "row", "chair", "bridge"], walking: ["march"], mobility: ["calf"] };
type Details = NonNullable<Exercise["details"]>;

export function ExercisePanel({
  date,
  activity,
  roundId,
  minutes,
}: {
  date: string;
  activity: Exercise["activity"];
  roundId: string;
  minutes?: number;
}) {
  const life = useLife();
  const p = life.projection;
  const actual = p.exercise[roundId]?.value;
  const conflict = p.conflicts["exercise:" + roundId];
  const previous = Object.values(p.exercise)
    .map((entry) => entry.value)
    .filter(
      (entry) =>
        entry.activity === activity && entry.roundId !== roundId && entry.date <= date && entry.details?.length,
    )
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const [guide, setGuide] = useState(false);
  const [short, setShort] = useState(false);
  const [editing, setEditing] = useState(false);
  const [details, setDetails] = useState<Details>(actual?.details ?? []);
  const [variant, setVariant] = useState<Exercise["variant"]>(actual?.variant ?? "normal");
  const normalMinutes =
    activity === "strength" ? (p.exercisePlan?.value.normalMinutes ?? 15) : activity === "walking" ? 20 : 10;
  const shortMinutes = activity === "strength" ? (p.exercisePlan?.value.shortMinutes ?? 5) : 5;
  const complete = (v: Exercise["variant"]) => life.completeExercise({ date, activity, roundId, variant: v });
  const detail = (id: string, key: "reps" | "sets" | "loadKg" | "minutes", value: string) => {
    const row = details.find((d) => d.id === id) ?? { id };
    setDetails([
      ...details.filter((d) => d.id !== id),
      { ...row, [key]: value === "" ? undefined : Number(value) },
    ]);
  };
  return (
    <Card
      title={activityLabels[activity]}
      right={minutes !== undefined && <span className="text-sm text-muted">予定 {minutes}分</span>}
    >
      <div className={inset}>
        {conflict ? (
          <>
            <p>記録が食い違っています。残すほうを選んでください。</p>
            {conflict.entries.map(({ eventId, value }) => {
              const exercise = value as Exercise;
              return (
                <button
                  type="button"
                  className={choice(false)}
                  key={eventId}
                  onClick={() => life.resolveExercise(exercise)}
                >
                  {exercise.date} · {activityLabels[exercise.activity]} ·{" "}
                  {exercise.variant === "normal" ? "ふつう" : "短め"}{" "}
                  {exercise.details
                    ?.map(
                      (d) =>
                        (exerciseNames[d.id] ?? d.id) +
                        " " +
                        [
                          d.reps && d.reps + "回",
                          d.sets && d.sets + "組",
                          d.loadKg !== undefined && d.loadKg + "kg",
                          d.minutes && d.minutes + "分",
                        ]
                          .filter(Boolean)
                          .join(" "),
                    )
                    .join("・")}
                </button>
              );
            })}
          </>
        ) : actual ? (
          <div role="status" className={choices}>
            <strong>やった · {actual.variant === "normal" ? "ふつう" : "短め"}</strong>
            <button className={choice(false)} onClick={() => life.undoExercise(roundId)}>
              取り消す
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm">
              {activity === "strength"
                ? "ふつうは全身4種目。短めは壁腕立てと椅子から立つ運動です。"
                : activity === "walking"
                  ? "外を歩くか、室内で足踏みします。"
                  : "ふくらはぎを左右交互に伸ばします。"}
            </p>
            <div className={choices}>
              <button
                type="button"
                disabled={!life.ready}
                className={btnPrimary}
                onClick={() => complete("normal")}
              >
                ふつうにやった · {normalMinutes}分
              </button>
              <button
                type="button"
                disabled={!life.ready}
                className={choice(false)}
                onClick={() => complete("short")}
              >
                短め（{shortMinutes}分）でやった
              </button>
            </div>
          </>
        )}
        <div className={choices}>
          <button type="button" className={choice(guide)} aria-expanded={guide} onClick={() => setGuide(!guide)}>
            やり方
          </button>
          {!conflict && (
            <button
              type="button"
              className={choice(editing)}
              aria-expanded={editing}
              onClick={() => {
                setEditing(!editing);
                setDetails(actual?.details ?? []);
                setVariant(actual?.variant ?? "normal");
              }}
            >
              くわしく記録
            </button>
          )}
        </div>
        {guide && (
          <>
            {activity === "strength" && (
              <label className="flex min-h-11 items-center gap-2">
                <input type="checkbox" checked={short} onChange={(e) => setShort(e.target.checked)} />
                短めの種目
              </label>
            )}
            <MovementGuide activity={activity} short={short} />
          </>
        )}
        {editing && (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const value = { date, activity, roundId, variant, details };
              if (actual ? life.resolveExercise(value) : life.completeExercise(value)) setEditing(false);
            }}
          >
            {previous && (
              <p className="text-sm text-muted">
                前回 {previous.date} ·{" "}
                {previous.details
                  ?.map((d) =>
                    [
                      exerciseNames[d.id] ?? d.id,
                      d.reps !== undefined && d.reps + "回",
                      d.sets !== undefined && d.sets + "セット",
                      d.loadKg !== undefined && d.loadKg + "kg",
                      d.minutes !== undefined && d.minutes + "分",
                    ]
                      .filter(Boolean)
                      .join(" "),
                  )
                  .join("・")}
              </p>
            )}
            <label className={field}>
              やったもの
              <select
                className={inputBase}
                value={variant}
                onChange={(e) => setVariant(e.target.value as Exercise["variant"])}
              >
                <option value="normal">ふつう</option>
                <option value="short">短め</option>
              </select>
            </label>
            {exercises[activity]
              .filter((id) => activity !== "strength" || variant !== "short" || id === "push" || id === "chair")
              .map((id) => (
                <fieldset className="rounded-lg border border-line p-2" key={id}>
                  <legend>{exerciseNames[id]}</legend>
                  <div className={choices}>
                    {(activity === "strength"
                      ? (["reps", "sets", ...(id === "row" ? ["loadKg" as const] : [])] as const)
                      : ["minutes" as const]
                    ).map((k) => (
                      <label key={k} className={field}>
                        {{ reps: "回数", sets: "セット", loadKg: "負荷（kg）", minutes: "分" }[k]}
                        <input
                          type="number"
                          min={k === "loadKg" ? 0 : 1}
                          max={{ reps: 10000, sets: 100, loadKg: 1000, minutes: 1440 }[k]}
                          step={k === "loadKg" ? "0.1" : "1"}
                          className={inputBase + " w-24"}
                          value={details.find((d) => d.id === id)?.[k] ?? ""}
                          onChange={(e) => detail(id, k, e.target.value)}
                        />
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            <button type="submit" disabled={!life.ready} className={btnPrimary}>
              保存
            </button>
          </form>
        )}
      </div>
    </Card>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { type Exercise } from "@/lib/life/model";
import { useLife } from "@/lib/life/store";
import {
  EXERCISE_NAMES,
  SHORT_MOVES,
  STRENGTH_MOVES,
  levelOf,
  moveOf,
  sessionOf,
  stageOf,
} from "@/lib/life/workouts";
import { Card, btnPrimary, inputBase } from "@/components/ui/controls";
import { Segments, choice, choices, field, inset, summary } from "./Controls";
import { SessionList } from "./ExerciseSession";

const MovementGuide = dynamic(() => import("./MovementGuide"));
export const activityLabels = { walking: "有酸素", strength: "筋トレ", mobility: "ほぐす" };
const feelLabels = { easy: "楽だった", ok: "ちょうど", hard: "きつかった" } as const;
type Details = NonNullable<Exercise["details"]>;
type Field = "reps" | "sets" | "loadKg" | "minutes" | "seconds";
const fieldLabels: Record<Field, string> = { reps: "回数", sets: "セット", loadKg: "負荷（kg）", minutes: "分", seconds: "秒" };
const fieldMax: Record<Field, number> = { reps: 10000, sets: 100, loadKg: 1000, minutes: 1440, seconds: 3600 };

/** 記録の1行（「腕立て 10回 2セット」など） */
export function detailText(d: Details[number]) {
  const move = moveOf(d.id);
  const name = move && d.level ? move.levels[d.level - 1]?.name ?? move.name : EXERCISE_NAMES[d.id] ?? d.id;
  return [
    name,
    d.reps !== undefined && d.reps + "回",
    d.seconds !== undefined && d.seconds + "秒",
    d.sets !== undefined && d.sets + "セット",
    d.loadKg !== undefined && d.loadKg + "kg",
    d.minutes !== undefined && d.minutes + "分",
  ]
    .filter(Boolean)
    .join(" ");
}

/** くわしく記録で入れられる項目（種目と、選んだ段階による） */
function fieldsOf(id: string, level: number | undefined, activity: Exercise["activity"]): Field[] {
  const move = moveOf(id);
  if (move) {
    const timed = !!move.levels[(level ?? 1) - 1]?.seconds;
    return [timed ? "seconds" : "reps", "sets", ...(move.load ? (["loadKg"] as const) : [])];
  }
  if (id === "shoulder") return ["reps"];
  return activity === "strength" ? ["reps", "sets"] : ["minutes"];
}

/**
 * 運動の1回分。筋トレは今日やる種目の一覧と「やった」「短めでやった」（1回押すだけで記録）。
 * 回数や重さは「くわしく記録」で、入れたものだけ残す
 */
export function ExercisePanel({
  date,
  activity,
  roundId,
  minutes,
  compact = false,
}: {
  date: string;
  activity: Exercise["activity"];
  roundId: string;
  minutes?: number;
  /** 種目の一覧をたたんでおく（ホームなど） */
  compact?: boolean;
}) {
  const life = useLife();
  const p = life.projection;
  const plan = p.exercisePlan?.value;
  const stage = stageOf(plan);
  const actual = p.exercise[roundId]?.value;
  const conflict = p.conflicts["exercise:" + roundId];
  const previous = Object.values(p.exercise)
    .map((entry) => entry.value)
    .filter(
      (entry) =>
        entry.activity === activity && entry.roundId !== roundId && entry.date <= date && entry.details?.length,
    )
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const normalMinutes =
    activity === "strength" ? (plan?.normalMinutes ?? stage.minutes) : activity === "walking" ? 20 : 10;
  const shortMinutes = activity === "strength" ? (plan?.shortMinutes ?? stage.shortMinutes) : 5;
  const [guide, setGuide] = useState(false);
  const [list, setList] = useState<Exercise["variant"]>(
    minutes !== undefined && minutes < normalMinutes ? "short" : "normal",
  );
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState(false);
  const [details, setDetails] = useState<Details>(actual?.details ?? []);
  const [variant, setVariant] = useState<Exercise["variant"]>(actual?.variant ?? "normal");
  const items = activity === "strength" ? sessionOf(plan, list) : [];

  const complete = (v: Exercise["variant"]) => {
    if (activity !== "strength") return life.completeExercise({ date, activity, roundId, variant: v });
    // 印をつけた種目があればそれだけ、なければその日のメニューの全部を、そのときの段階で残す
    const moves = sessionOf(plan, v).filter((i) => i.level !== undefined);
    const picked = moves.filter((i) => checked.has(i.id));
    const done = (picked.length ? picked : moves).map((i) => ({ id: i.id, level: i.level! }));
    return life.completeExercise({ date, activity, roundId, variant: v, details: done });
  };
  const detail = (id: string, key: Field | "level", value: string) => {
    const row = details.find((d) => d.id === id) ?? { id, ...(moveOf(id) ? { level: levelOf(plan, id) } : {}) };
    setDetails([
      ...details.filter((d) => d.id !== id),
      { ...row, [key]: value === "" ? undefined : Number(value) },
    ]);
  };
  const rowIds = (() => {
    const base =
      activity === "strength"
        ? STRENGTH_MOVES.filter((m) => variant === "normal" || SHORT_MOVES.includes(m.id)).map((m) => m.id as string)
        : activity === "walking"
          ? ["walk"]
          : ["shoulder"];
    const extra = (actual?.details ?? []).map((d) => d.id).filter((id) => !base.includes(id));
    return [...base, ...extra];
  })();

  return (
    <Card
      title={activity === "strength" ? "今日の筋トレ" : activityLabels[activity]}
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
                  {exercise.variant === "normal" ? "ふつう" : "短め"} {exercise.details?.map(detailText).join("・")}
                </button>
              );
            })}
          </>
        ) : actual ? (
          <>
            <div role="status" className={choices}>
              <strong className="flex-1">やった · {actual.variant === "normal" ? "ふつう" : "短め"}</strong>
              <button className={choice(false)} onClick={() => life.undoExercise(roundId)}>
                取り消す
              </button>
            </div>
            {activity === "strength" && (
              <div role="group" aria-label="どうだった？" className={choices}>
                <span className="text-sm text-muted">どうだった？</span>
                {(["easy", "ok", "hard"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={actual.feel === f}
                    className={choice(actual.feel === f)}
                    onClick={() => life.resolveExercise({ ...actual, feel: actual.feel === f ? undefined : f })}
                  >
                    {feelLabels[f]}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : activity === "strength" ? (
          <>
            <Segments
              label="今日の長さ"
              options={[`ふつう ${normalMinutes}分`, `短め ${shortMinutes}分`]}
              selected={list === "normal" ? `ふつう ${normalMinutes}分` : `短め ${shortMinutes}分`}
              onChange={(v) => setList(v.startsWith("短め") ? "short" : "normal")}
            />
            <p className="text-sm text-muted">
              {list === "short"
                ? "腕立てとスクワットを1セットずつ。短めでも1回に数えます。"
                : `第${stage.stage}段階「${stage.name}」。${stage.rest}。`}
            </p>
            <details open={!compact}>
              <summary className={summary}>種目（{items.length}）</summary>
              <SessionList
                items={items}
                checked={checked}
                onToggle={(id) => {
                  const next = new Set(checked);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  setChecked(next);
                }}
              />
            </details>
            <p className="text-xs text-muted">痛み・しびれ・いつもと違う息苦しさがあれば、そこで止めてください。</p>
            <div className={choices}>
              <button
                type="button"
                disabled={!life.ready}
                className={btnPrimary}
                onClick={() => complete(list)}
              >
                {list === "normal" ? `やった · ${normalMinutes}分` : `短めでやった · ${shortMinutes}分`}
              </button>
              <button
                type="button"
                disabled={!life.ready}
                className={choice(false)}
                onClick={() => complete(list === "normal" ? "short" : "normal")}
              >
                {list === "normal" ? `短めでやった（${shortMinutes}分）` : `ふつうでやった（${normalMinutes}分）`}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm">
              {activity === "walking" ? "外を歩くか、室内で足踏みします。" : "肩と背中をほぐします。"}
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
          {activity !== "strength" && (
            <button type="button" className={choice(guide)} aria-expanded={guide} onClick={() => setGuide(!guide)}>
              やり方
            </button>
          )}
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
        {guide && activity !== "strength" && <MovementGuide activity={activity} short={false} />}
        {editing && (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const value: Exercise = { ...actual, date, activity, roundId, variant, details };
              if (actual ? life.resolveExercise(value) : life.completeExercise(value)) setEditing(false);
            }}
          >
            {previous && (
              <p className="text-sm text-muted">
                前回 {previous.date} · {previous.details?.map(detailText).join("・")}
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
            {rowIds.map((id) => {
              const row = details.find((d) => d.id === id);
              const move = moveOf(id);
              const level = row?.level ?? (move ? levelOf(plan, id) : undefined);
              return (
                <fieldset className="rounded-lg border border-line p-2" key={id}>
                  <legend>{EXERCISE_NAMES[id] ?? id}</legend>
                  <div className={choices}>
                    {move && (
                      <label className={field}>
                        段階
                        <select
                          className={inputBase}
                          value={level}
                          onChange={(e) => detail(id, "level", e.target.value)}
                        >
                          {move.levels.map((l, i) => (
                            <option key={l.name} value={i + 1}>
                              {i + 1}. {l.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {fieldsOf(id, level, activity).map((k) => (
                      <label key={k} className={field}>
                        {fieldLabels[k]}
                        <input
                          type="number"
                          min={k === "loadKg" ? 0 : 1}
                          max={fieldMax[k]}
                          step={k === "loadKg" ? "0.1" : "1"}
                          className={inputBase + " w-24"}
                          value={row?.[k] ?? ""}
                          onChange={(e) => detail(id, k, e.target.value)}
                        />
                      </label>
                    ))}
                  </div>
                </fieldset>
              );
            })}
            <button type="submit" disabled={!life.ready} className={btnPrimary}>
              保存
            </button>
          </form>
        )}
      </div>
    </Card>
  );
}

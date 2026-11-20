"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/components/app/StoreProvider";
import { Card, btnPrimary, inputBase } from "@/components/ui/controls";
import { dateKeyOf } from "@/lib/mock/model";
import { MIN } from "@/lib/mock/jst";
import { defaultExercisePlan } from "@/lib/life/exercisePlan";
import { type Exercise, type ExercisePlan } from "@/lib/life/model";
import { useLife } from "@/lib/life/store";
import { LifeScreen, Segments, choice, choices, field, inset, summary } from "./Controls";
import { ExercisePanel, activityLabels } from "./Exercise";
import { useNow } from "./useNow";
import { updateQuery, selectedDate } from "./navigation";
import { wakingDayStart } from "@/lib/scheduler";
import ExerciseRoundChoices from "./ExerciseRoundChoices";

function PlanSettings({ date }: { date: string }) {
  const life = useLife();
  const previous = life.projection.exercisePlan?.value;
  const [edits, setEdits] = useState<Partial<ExercisePlan>>({});
  const draft = { ...(previous ?? defaultExercisePlan(date)), ...edits };
  const [saved, setSaved] = useState(false);
  const edit = (patch: Partial<ExercisePlan>) => {
    setEdits((current) => ({ ...current, ...patch }));
    setSaved(false);
  };
  const asTime = (m: number) =>
    String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
  const fromTime = (v: string) => {
    const [h, m] = v.split(":").map(Number);
    return h * 60 + m;
  };
  return (
    <Card title="筋トレの計画">
      <details className={inset}>
        <summary className={summary}>
          {previous?.enabled ? "計画を変える" : "自動で組む"}
        </summary>
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (life.saveExercisePlan({ ...draft, enabled: true, enabledOn: previous?.enabledOn ?? date })) {
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
              止める
            </button>
          )}
          {saved && <span role="status">保存しました</span>}
        </form>
      </details>
    </Card>
  );
}

const views = ["今日", "メニュー", "履歴"] as const;
export default function ExerciseScreen() {
  const { state } = useApp();
  const life = useLife();
  const query = useSearchParams();
  const requested = query.get("view");
  const view = requested === "history" ? "履歴" : requested === "menu" ? "メニュー" : "今日";
  const changeView = (v: (typeof views)[number]) => {
    updateQuery({ view: v === "履歴" ? "history" : v === "メニュー" ? "menu" : "today" });
  };
  const now = useNow();
  const today = dateKeyOf(wakingDayStart(now, state.result.dayPlans, state.settings.tzOffsetMinutes));
  const date = selectedDate(query.get("date"), today);
  const selectedActivity = query.get("activity");
  const activity: Exercise["activity"] =
    selectedActivity === "walking" || selectedActivity === "mobility" ? selectedActivity : "strength";
  const picked = query.get("round");
  const plan = { rounds: state.result.exerciseRounds ?? [] };

  const round = plan.rounds.find((r) => r.date === today);
  const entries = Object.values(life.projection.exercise)
    .map((row) => row.value)
    .sort((a, b) => b.date.localeCompare(a.date));
  const selected = entries.find((e) => e.roundId === picked);

  const manual = (
    <>
      <label className={field}>
        日付
        <input
          type="date"
          className={inputBase}
          value={date}
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
      <ExercisePanel
        key={date + activity}
        date={date}
        activity={activity}
        roundId={
          activity === "strength" && plan.rounds.some((r) => r.date === date)
            ? plan.rounds.find((r) => r.date === date)!.roundId
            : "manual:" + date + ":" + activity
        }
      />
    </>
  );
  return (
    <LifeScreen title="運動">
      <Segments label="運動の表示" options={views} selected={view} onChange={changeView} />
      {life.error && (
        <p role="status" className="text-sm">
          {life.error}{" "}
          <button className={choice(false)} onClick={life.retry}>
            もう一度
          </button>
        </p>
      )}
      {view === "履歴" ? (
        <>
          <Card title="やった記録">
            <div className={inset}>
              {!entries.length && <p>まだありません。</p>}
              {entries.map((e) => (
                <button
                  key={e.roundId}
                  className={choice(picked === e.roundId)}
                  onClick={() => updateQuery({ round: e.roundId })}
                >
                  {e.date} · {activityLabels[e.activity]} · {e.variant === "short" ? "短め" : "ふつう"}
                </button>
              ))}
            </div>
          </Card>
          {selected && <ExercisePanel key={selected.roundId} {...selected} />}
        </>
      ) : view === "メニュー" ? (
        manual
      ) : (
        <>
          {round ? (
            <>
              <ExerciseRoundChoices round={round} />
              <ExercisePanel
                key={round.roundId}
                activity="strength"
                date={today}
                roundId={round.roundId}
                minutes={round.block ? (round.block.end - round.block.start) / MIN : undefined}
              />
            </>
          ) : (
            <Card title="今日の運動">
              <div className={inset}>
                <p>今日は筋トレの予定はありません。</p>
                <button className={choice(false)} onClick={() => changeView("メニュー")}>
                  運動を記録
                </button>
              </div>
            </Card>
          )}
          <Card title="今日の疲れ">
            <div className={inset}>
              <div className={choices}>
                {(["low", "strong", "unknown"] as const).map((v, i) => (
                  <button
                    className={choice(life.projection.fatigue[today]?.value === v)}
                    key={v}
                    onClick={() => life.setFatigue(today, v)}
                  >
                    {["軽い", "強い", "わからない"][i]}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </>
      )}
      <PlanSettings date={today} />
      <Link href="/settings/habits" className="press flex min-h-11 items-center px-2 text-tint underline">
        習慣の設定
      </Link>
    </LifeScreen>
  );
}

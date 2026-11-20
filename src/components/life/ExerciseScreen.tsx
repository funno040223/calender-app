"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/components/app/StoreProvider";
import { Card } from "@/components/ui/controls";
import { dateKeyOf } from "@/lib/mock/model";
import { MIN, formatTime } from "@/lib/mock/jst";
import { type Exercise } from "@/lib/life/model";
import { useLife } from "@/lib/life/store";
import { stageOf } from "@/lib/life/workouts";
import { wakingDayStart } from "@/lib/scheduler";
import { LifeScreen, Segments, choice, choices, inset } from "./Controls";
import { ExercisePanel } from "./Exercise";
import ExerciseHistory from "./ExerciseHistory";
import ExerciseMenu from "./ExerciseMenu";
import ExercisePlanSettings from "./ExercisePlanSettings";
import ExerciseRoadmap from "./ExerciseRoadmap";
import ExerciseRoundChoices from "./ExerciseRoundChoices";
import ExerciseShoulder from "./ExerciseShoulder";
import ExerciseWalk from "./ExerciseWalk";
import { useNow } from "./useNow";
import { updateQuery, selectedDate } from "./navigation";

const views = ["今日", "メニュー", "道のり", "記録"] as const;
type View = (typeof views)[number];
const viewKeys: Record<View, string> = { 今日: "today", メニュー: "menu", 道のり: "roadmap", 記録: "history" };

const dayLabel = (date: string) => {
  const d = new Date(date + "T00:00:00+09:00");
  return `${d.getMonth() + 1}/${d.getDate()}（${"日月火水木金土"[d.getDay()]}）`;
};

export default function ExerciseScreen() {
  const { state } = useApp();
  const life = useLife();
  const query = useSearchParams();
  const view = views.find((v) => viewKeys[v] === query.get("view")) ?? "今日";
  const changeView = (v: View) => updateQuery({ view: viewKeys[v] });
  const now = useNow();
  const today = dateKeyOf(wakingDayStart(now, state.result.dayPlans, state.settings.tzOffsetMinutes));
  const date = selectedDate(query.get("date"), today);
  const selectedActivity = query.get("activity");
  const activity: Exercise["activity"] =
    selectedActivity === "walking" || selectedActivity === "mobility" ? selectedActivity : "strength";
  const rounds = state.result.exerciseRounds ?? [];
  const round = rounds.find((r) => r.date === today);
  const nextRound = rounds
    .filter((r) => r.date > today && r.block && r.status !== "completed" && r.status !== "skipped")
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const plan = life.projection.exercisePlan?.value;
  const stage = stageOf(plan);
  const [extra, setExtra] = useState(false);

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
      {view === "記録" ? (
        <ExerciseHistory today={today} date={date} activity={activity} picked={query.get("round")} />
      ) : view === "メニュー" ? (
        <ExerciseMenu today={today} />
      ) : view === "道のり" ? (
        <>
          <ExerciseRoadmap today={today} />
          <ExercisePlanSettings date={today} />
        </>
      ) : (
        <>
          <button
            type="button"
            className="press flex min-h-11 items-center justify-between rounded-xl bg-surface px-4 text-left text-sm card-shadow"
            onClick={() => changeView("道のり")}
          >
            <span>
              第{stage.stage}段階「{stage.name}」
            </span>
            <span className="text-tint">道のりを見る</span>
          </button>
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
            <>
              <Card title="今日の筋トレ">
                <div className={inset}>
                  <p>
                    {plan?.enabled
                      ? `今日は筋トレの日ではありません。${nextRound ? `次は ${dayLabel(nextRound.date)} ${formatTime(nextRound.block!.start)}。` : ""}`
                      : "筋トレの日はまだ決めていません。道のりの「筋トレの予定」で自動で組めます。"}
                  </p>
                  <div className={choices}>
                    <button type="button" className={choice(extra)} aria-expanded={extra} onClick={() => setExtra(!extra)}>
                      今日やる
                    </button>
                  </div>
                </div>
              </Card>
              {extra && <ExercisePanel activity="strength" date={today} roundId={"manual:" + today + ":strength"} />}
            </>
          )}
          <ExerciseShoulder date={today} />
          <ExerciseWalk date={today} />
          <Card title="今日の疲れ">
            <div className={inset}>
              <p className="text-sm text-muted">「強い」の日は、筋トレを短めにします。</p>
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
      <Link href="/settings/habits" className="press flex min-h-11 items-center px-2 text-tint underline">
        習慣の設定
      </Link>
    </LifeScreen>
  );
}

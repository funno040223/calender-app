"use client";

import { useApp } from "@/components/app/StoreProvider";
import { useLife } from "@/lib/life/store";
import {
  STAGES,
  STRENGTH_MOVES,
  WALK_HABIT_ID,
  addDays,
  levelOf,
  levelUpReady,
  mondayOf,
  stageCheck,
  stageOf,
  walkMinutesBetween,
  withStage,
  type Stage,
} from "@/lib/life/workouts";
import { Card, btnPrimary } from "@/components/ui/controls";
import { choice, inset, summary } from "./Controls";
import { planBase } from "./ExerciseMenu";

const stageLine = (s: Stage) => `筋トレ 週${s.weeklyTimes}回・${s.minutes}分・各${s.sets}セット ／ 歩く 週${s.walkMinutes}分`;

/** 道のり：4つの段階と、いまどこにいるか。段階は週数では上げず、記録を見てすすめるだけ（決めるのは本人） */
export default function ExerciseRoadmap({ today }: { today: string }) {
  const { state } = useApp();
  const life = useLife();
  const plan = life.projection.exercisePlan?.value;
  const stage = stageOf(plan);
  const records = Object.values(life.projection.exercise).map((r) => r.value);
  const check = stageCheck(records, plan, today);
  const habitMinutes = state.habits.find((h) => h.id === WALK_HABIT_ID)?.durationMinutes ?? 20;
  const monday = mondayOf(today);
  const walkThisWeek = walkMinutesBetween(records, state.habitLogs, habitMinutes, monday, addDays(monday, 6));
  const walkLastWeek = walkMinutesBetween(records, state.habitLogs, habitMinutes, addDays(monday, -7), addDays(monday, -1));
  const next = STAGES[stage.stage];
  const back = STAGES[stage.stage - 2];
  const choose = (s: Stage) => life.saveExercisePlan(withStage(planBase(plan, today), s, today));

  return (
    <>
      <Card title="いまの位置">
        <div className={inset}>
          <div>
            <div className="text-lg font-semibold">
              第{stage.stage}段階「{stage.name}」
            </div>
            <div className="text-sm text-muted">
              {stage.goal}
              {check.daysIn !== undefined && `（${check.daysIn + 1}日目）`}
            </div>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm tabular-nums">
            <dt className="text-muted">筋トレ</dt>
            <dd>
              この2週間で {check.done}回（目安 {check.needed}回）
            </dd>
            <dt className="text-muted">歩く</dt>
            <dd>
              今週 {walkThisWeek}分・先週 {walkLastWeek}分（目安 週{stage.walkMinutes}分）
            </dd>
          </dl>
          <ul className="flex flex-col gap-1 text-sm">
            {STRENGTH_MOVES.map((m) => {
              const level = levelOf(plan, m.id);
              return (
                <li key={m.id} className="flex gap-2">
                  <span className="w-24 shrink-0 text-muted">{m.name}</span>
                  <span className="flex-1">
                    {level}/{m.levels.length} {m.levels[level - 1].name}
                  </span>
                  {levelUpReady(records, m.id, level, stage.sets) && <span className="text-tint">上げどき</span>}
                </li>
              );
            })}
          </ul>
          {next &&
            (check.ready ? (
              <>
                <p className="text-sm">2週間、予定どおり続けられました。次の段階に進めます（このままでもかまいません）。</p>
                <button type="button" disabled={!life.ready} className={btnPrimary} onClick={() => choose(next)}>
                  第{next.stage}段階「{next.name}」にする
                </button>
              </>
            ) : (
              <p className="text-sm text-muted">
                {check.hard
                  ? "最後の回が「きつかった」ので、このままで。楽になってきたら、すすめます。"
                  : check.done < check.needed
                    ? `この2週間であと${check.needed - check.done}回できたら、次の段階をすすめます。`
                    : "今の段階を2週間続けたら、次の段階をすすめます。"}
              </p>
            ))}
          {back && (
            <button type="button" disabled={!life.ready} className={choice(false)} onClick={() => choose(back)}>
              第{back.stage}段階に戻す
            </button>
          )}
        </div>
      </Card>

      <Card title="4つの段階">
        {STAGES.map((s) => {
          const here = s.stage === stage.stage;
          return (
            <div key={s.stage} className={`px-4 py-3 ${here ? "bg-surface2" : ""}`}>
              <div className="flex items-center gap-2">
                <span className="flex-1 font-medium">
                  第{s.stage}段階「{s.name}」<span className="ml-2 text-sm font-normal text-muted">{s.weeks}</span>
                </span>
                {here && <span className="rounded-full bg-tint px-2 py-0.5 text-xs text-on-tint">いま</span>}
              </div>
              <p className="text-sm">{s.goal}</p>
              <p className="text-sm text-muted">{stageLine(s)}</p>
              <details>
                <summary className={summary + " text-tint"}>くわしく</summary>
                <ul className="list-disc space-y-1 pb-2 pl-5 text-sm">
                  <li>筋トレ：5種目を各{s.sets}セット。{s.rest}。</li>
                  <li>歩く：{s.walk}</li>
                  <li>肩こりほぐし：作業の区切りに、1日2回以上</li>
                </ul>
                {!here && (
                  <button type="button" disabled={!life.ready} className={choice(false)} onClick={() => choose(s)}>
                    この段階にする
                  </button>
                )}
              </details>
            </div>
          );
        })}
      </Card>

      <Card title="上げ方のきまり">
        <ul className="list-disc space-y-1 px-4 py-3 pl-9 text-sm">
          <li>週数がたっただけでは上げません。上げるかは自分で決めます。</li>
          <li>段階：2週間で筋トレを予定の回数（1回は休んでよい）でき、最後の2回が「きつかった」でなければ、次をすすめます。</li>
          <li>種目：範囲のいちばん上の回数（秒）を、最後の2回とも全部のセットでできたら（または「楽だった」なら）、その種目だけ次へ。</li>
          <li>きつい・痛い・忙しい週は、そのまま。下げてもかまいません。休んだ週を次の週に足すこともしません。</li>
          <li>短めの日も1回に数えます。0回より5分のほうがずっといい。</li>
        </ul>
      </Card>

      <Card title="なぜこのメニュー？">
        <div className={inset}>
          <details>
            <summary className={summary}>体脂肪</summary>
            <p className="pb-2 text-sm">
              減らす主役は食事です（料理の画面）。運動だけで減る量は小さく、早歩き30分で100〜150kcal（おにぎり1個弱）。それでも筋トレは減量中に筋肉を守り、歩くことは体重を戻りにくくします。お腹だけ・腕だけを狙って脂肪を落とすことはできないので、腹筋運動ではなく全身を動かします。
            </p>
          </details>
          <details>
            <summary className={summary}>肩こり</summary>
            <p className="pb-2 text-sm">
              机作業の肩こりには、こまめに姿勢を変えることと、背中・肩を鍛えること（引く動き・腕立て）が、ストレッチだけより効きやすいと分かっています。だから「リュックを引く」を毎回入れ、ほぐしは作業の区切りに短く何回も。
            </p>
          </details>
          <details>
            <summary className={summary}>体力</summary>
            <p className="pb-2 text-sm">
              WHO の目安は、少し息がはずむ運動を週150〜300分と、全身の筋トレを週2回以上。いきなりは無理なので、週60分から少しずつ。早歩きとゆっくりを3分ずつ交互にする歩き方は、体力が伸びやすい方法です。
            </p>
          </details>
          <p className="text-xs text-muted">一般的な運動の目安で、医療の助言ではありません。</p>
        </div>
      </Card>
    </>
  );
}


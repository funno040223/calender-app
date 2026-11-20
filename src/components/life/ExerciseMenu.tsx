"use client";

import { useLife } from "@/lib/life/store";
import { defaultExercisePlan } from "@/lib/life/exercisePlan";
import type { ExercisePlan } from "@/lib/life/model";
import {
  CARDIO_OPTIONS,
  COOLDOWN,
  SHOULDER_DESK,
  SHOULDER_FULL,
  STRENGTH_MOVES,
  WARMUP,
  doseOf,
  levelOf,
  levelUpReady,
  stageOf,
  withLevel,
  type ShoulderStep,
  type StrengthMove,
} from "@/lib/life/workouts";
import { Card } from "@/components/ui/controls";
import { choice, inset, summary } from "./Controls";
import { HowTo } from "./ExerciseSession";

/** 計画がまだなければ、自動で組まない計画として段階だけ残す */
export const planBase = (plan: ExercisePlan | undefined, today: string): ExercisePlan =>
  plan ?? { ...defaultExercisePlan(today), enabled: false };

function MoveRow({ move, today }: { move: StrengthMove; today: string }) {
  const life = useLife();
  const plan = life.projection.exercisePlan?.value;
  const stage = stageOf(plan);
  const level = levelOf(plan, move.id);
  const current = move.levels[level - 1];
  const records = Object.values(life.projection.exercise).map((r) => r.value);
  const ready = levelUpReady(records, move.id, level, stage.sets);
  return (
    <div className="px-4 py-2">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-medium">
            {move.name}
            <span className="ml-2 text-sm font-normal text-muted">{move.part}</span>
          </div>
          <div className="text-sm">
            {level}/{move.levels.length} {current.name} · <span className="tabular-nums">{doseOf(current, stage.sets)}</span>
          </div>
        </div>
        {ready && <span className="rounded-full border border-tint px-2 py-0.5 text-xs text-tint">上げどき</span>}
      </div>
      <details>
        <summary className={summary + " text-tint"}>やり方と段階</summary>
        <p className="pb-2 text-sm text-muted">{move.why}</p>
        <HowTo how={current.how} point={current.point} figure={current.figure} />
        {ready && (
          <p className="pb-2 text-sm">最後の2回、目標の回数まで（または楽に）できました。次の段階をためせます。</p>
        )}
        <ol role="group" aria-label={`${move.name}の段階`} className="flex flex-col gap-1 pb-2">
          {move.levels.map((l, i) => (
            <li key={l.name}>
              <button
                type="button"
                aria-pressed={i + 1 === level}
                disabled={!life.ready}
                className={choice(i + 1 === level) + " w-full justify-between! text-left"}
                onClick={() => life.saveExercisePlan(withLevel(planBase(plan, today), move.id, i + 1))}
              >
                <span>
                  {i + 1}. {l.name}
                </span>
                <span className="tabular-nums">{doseOf(l, 1)}</span>
              </button>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}

function StepList({ steps }: { steps: ShoulderStep[] }) {
  return (
    <ol className="flex flex-col">
      {steps.map((s, i) => (
        <li key={s.id}>
          <details>
            <summary className={summary + " gap-2"}>
              <span className="w-5 text-sm text-muted tabular-nums">{i + 1}</span>
              <span className="flex-1">{s.name}</span>
              <span className="text-sm text-muted">{s.dose}</span>
            </summary>
            <ol className="list-decimal space-y-1 pb-2 pl-12 text-sm">
              {s.how.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ol>
          </details>
        </li>
      ))}
    </ol>
  );
}

/** メニュー：種目ごとの段階とやり方、肩こりほぐし、有酸素 */
export default function ExerciseMenu({ today }: { today: string }) {
  const life = useLife();
  const plan = life.projection.exercisePlan?.value;
  const stage = stageOf(plan);
  return (
    <>
      <Card title="筋トレ（全身）">
        <p className="px-4 pt-1 pb-3 text-sm">
          週{plan?.weeklyTimes ?? stage.weeklyTimes}回、{plan?.normalMinutes ?? stage.minutes}分。各{stage.sets}セット、{stage.rest}。
          回数は、きれいな形でできるところまで。範囲のいちばん上まで2回続けてできたら、次の段階へ。
        </p>
        <div className="px-4 py-2">
          <div className="font-medium">はじめに：{WARMUP.name}</div>
          <div className="text-sm text-muted">{WARMUP.dose}</div>
        </div>
        {STRENGTH_MOVES.map((m) => (
          <MoveRow key={m.id} move={m} today={today} />
        ))}
        <div className="px-4 py-2">
          <div className="font-medium">おわりに：{COOLDOWN.name}</div>
          <div className="text-sm text-muted">{COOLDOWN.dose}</div>
          <details>
            <summary className={summary + " text-tint"}>やり方</summary>
            <HowTo how={COOLDOWN.how} figure={COOLDOWN.figure} />
          </details>
        </div>
        <p className="px-4 py-3 text-sm text-muted">
          短めの日は、足踏み1分と、腕立て・スクワットを1セットずつ（5分）。それでも1回に数えます。
        </p>
      </Card>

      <Card title="肩こりほぐし">
        <div className={inset}>
          <p className="text-sm">いちばん効くのは、同じ姿勢を続けないこと。50〜60分座ったら立つか、座ったままの版を1回。背中の筋トレ（リュックを引く）も肩こりの予防になります。</p>
          <h3 className="text-sm font-semibold">座ったまま 2分（作業の区切りに）</h3>
          <StepList steps={SHOULDER_DESK} />
          <h3 className="text-sm font-semibold">しっかり 5分（立って・床で）</h3>
          <StepList steps={SHOULDER_FULL} />
        </div>
      </Card>

      <Card title="有酸素（体力・体脂肪）">
        <div className={inset}>
          <p className="text-sm">
            今の目安は週{stage.walkMinutes}分。最後は週150〜300分を目指します。走らなくて大丈夫です。
          </p>
          <ul className="flex flex-col divide-y divide-line">
            {CARDIO_OPTIONS.map((c) => (
              <li key={c.id} className="py-2">
                <div className="flex gap-2">
                  <span className="flex-1 font-medium">{c.name}</span>
                  <span className="text-sm text-muted">{c.dose}</span>
                </div>
                <p className="text-sm text-muted">{c.how}</p>
              </li>
            ))}
          </ul>
        </div>
      </Card>
      <p className="px-2 text-xs text-muted">
        一般的な運動の目安で、医療の助言ではありません。痛み・しびれ・胸の痛み・いつもと違う息苦しさがあれば止めてください。
      </p>
    </>
  );
}

"use client";

import Link from "next/link";
import { useNow } from "./useNow";
import { dateKeyOf } from "@/lib/mock/model";
import { useLife } from "@/lib/life/store";
import type { Review, ReviewGoal } from "@/lib/life/model";
import { Card, inputBase } from "@/components/ui/controls";
import { choice, choices, field, inset } from "./Controls";

const goals = { outings: "外出後の余力", shoulder: "肩の楽さ", pushups: "腕立ての変化" };
const answers = { easy: "楽", usual: "いつも通り", hard: "きつい", skip: "今回は飛ばす" };

/** 2週間の見直し。home ではその日が来ていて、まだ答えていないときだけ出す */
export function LifeReviewCard({ home = false }: { home?: boolean }) {
  const life = useLife();
  const p = life.projection;
  const today = dateKeyOf(useNow());
  const goal = p.reviewGoal?.value ?? "outings";
  const previous = Object.values(p.reviews)
    .map((row) => row.value)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const start =
    previous?.date ??
    [p.exercisePlan?.value.enabledOn, ...Object.values(p.exercise).map((entry) => entry.value.date)]
      .filter((date): date is string => !!date)
      .sort()[0];
  const due = !!start && Date.parse(today) - Date.parse(start) >= 14 * 86400000;
  const answer = p.reviews[today]?.value;
  const form = (
    <div className={inset}>
      <label className={field}>
        見直す項目
        <select
          className={inputBase}
          value={goal}
          onChange={(e) => life.setReviewGoal(e.target.value as ReviewGoal)}
        >
          {Object.entries(goals).map(([key, name]) => (
            <option key={key} value={key}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <div className={choices}>
        {(Object.keys(answers) as Review["answer"][]).map((v) => (
          <button
            type="button"
            key={v}
            disabled={!life.ready}
            className={choice(answer?.goal === goal && answer.answer === v)}
            onClick={() => life.saveReview({ date: today, goal, answer: v })}
          >
            {answers[v]}
          </button>
        ))}
      </div>
    </div>
  );
  if (home && (!due || answer)) return null;
  return (
      <Card title="2週間の見直し">
        {previous && (
          <p className="px-4 py-2 text-sm">
            前回 {previous.date} · {goals[previous.goal]} · {answers[previous.answer]}
          </p>
        )}
        {due ? (
          form
        ) : (
          <details>
            <summary className="flex min-h-11 cursor-pointer items-center px-4">今日の答えを入れる・直す</summary>
            {form}
          </details>
        )}
      </Card>
  );
}

export default function LifeStats() {
  const life = useLife();
  const p = life.projection;
  return (
    <>
      <Card title="食事と運動">
        <div className={inset}>
          <Link href="/meals?view=history" className={choice(false)}>
            食事の記録 · {Object.keys(p.meals).length}件
          </Link>
          <Link href="/exercise?view=history" className={choice(false)}>
            運動の記録 · {Object.keys(p.exercise).length}件
          </Link>
        </div>
      </Card>
      <LifeReviewCard />
    </>
  );
}

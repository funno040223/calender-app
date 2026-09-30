"use client";

import { useState } from "react";
import type { DayPlan, EveningEnergy } from "@/lib/scheduler";
import { useApp } from "@/components/app/StoreProvider";
import { MIN } from "@/lib/mock/jst";
import { dateKeyOf } from "@/lib/mock/model";
import { Card } from "@/components/ui/controls";
import { textBtn } from "./parts";

const EVENING_OPTIONS: { value: EveningEnergy; label: string }[] = [
  { value: "high", label: "多い" },
  { value: "normal", label: "ふつう" },
  { value: "low", label: "少ない" },
];

/** 外出した日の夜：帰宅したら残りの体力を聞き、今夜だけ組み直す */
export default function EveningCard({ day, now }: { day: DayPlan; now: number }) {
  const { state, update } = useApp();
  const [editing, setEditing] = useState(false);
  const key = dateKeyOf(day.dayStart);
  const answer = state.eveningEnergy[key];
  const from = day.homeAt ?? day.eveningFrom;
  if (from === undefined || now < from - 60 * MIN || now >= day.bed) return null;
  const choose = (v: EveningEnergy) => {
    // 答えたときの予測も残す（あとで行動ポイントの値を合わせるため）
    const e = state.result.dayEnergy.find((x) => x.dayStart === day.dayStart);
    update((d) => ({
      ...d,
      eveningEnergy: { ...d.eveningEnergy, [key]: v },
      energyChecks: e ? { ...d.energyChecks, [key]: { predicted: e.used, budget: e.budget, at: Date.now() } } : d.energyChecks,
    }));
    setEditing(false);
  };
  const picked = EVENING_OPTIONS.find((o) => o.value === answer);
  return (
    <Card title={day.homeAt !== undefined ? "おかえりなさい" : "おつかれさまです"}>
      <div className="flex flex-col gap-2.5 px-4 pt-1 pb-3.5">
        {picked && !editing ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[15px]">
              今夜の体力：<span className="font-semibold">{picked.label}</span>
            </p>
            <button type="button" onClick={() => setEditing(true)} className={textBtn}>
              変える
            </button>
          </div>
        ) : (
          <>
            <p className="text-[14px] text-muted">残りの体力は？</p>
            <div className="grid grid-cols-3 gap-2">
              {EVENING_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => choose(o.value)}
                  className={`press rounded-xl py-2.5 text-[16px] font-semibold ${o.value === answer ? "bg-tint text-on-tint" : "bg-surface2"}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

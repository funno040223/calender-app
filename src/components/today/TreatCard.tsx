"use client";

import Link from "next/link";
import type { DayPlan } from "@/lib/scheduler";
import { useApp } from "@/components/app/StoreProvider";
import { Card } from "@/components/ui/controls";
import { todaysTreat, TreatText } from "./parts";

export default function TreatCard({ today, day }: { today: number; day?: DayPlan }) {
  const { state } = useApp();
  const treat = todaysTreat(state, today, day);
  return (
    <Card title="今日の楽しみ">
      {treat ? (
        <div className="px-4 pt-1 pb-3.5">
          <TreatText treat={treat} />
        </div>
      ) : (
        <p className="px-4 pt-1 pb-3.5 text-[14px] text-muted">
          <Link href="/settings/treats" className="font-medium text-tint underline underline-offset-2">楽しみのリスト</Link>に追加すると、毎日1つ選びます。
        </p>
      )}
    </Card>
  );
}

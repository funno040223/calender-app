"use client";

import { useRouter } from "next/navigation";
import { useApp } from "@/components/app/StoreProvider";
import { DangerButton, Group, Row, ScreenHeader } from "@/components/ui/controls";
import { formatMinuteOfDay } from "@/lib/mock/model";
import { formatMinutes } from "@/lib/mock/jst";
import { SECTIONS, type SectionId } from "./sections";

export default function SettingsScreen() {
  const { state, reset } = useApp();
  const router = useRouter();
  const s = state.settings;

  const detail: Record<SectionId, string> = {
    timetable: `${state.courses.length}件`,
    places: `${state.places.length}件`,
    habits: `${state.habits.length}件`,
    avoid: `${state.avoidWindows.length}件`,
    treats: `${state.treats.length}件`,
    routine: `${state.routineSteps.length}つ`,
    basic: `睡眠${formatMinutes(s.sleepMinutes)}・${formatMinuteOfDay(s.defaultWakeMinuteOfDay)}起床`,
  };

  const groups: { title: string; ids: SectionId[] }[] = [
    { title: "予定", ids: ["timetable", "places"] },
    { title: "生活のリズム", ids: ["habits", "avoid", "basic"] },
    { title: "朝", ids: ["routine", "treats"] },
  ];

  return (
    <div className="h-full overflow-y-auto bg-grouped">
      <ScreenHeader title="設定" />
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pb-10 sm:px-6">
        {groups.map((g) => (
          <Group key={g.title} title={g.title}>
            {g.ids.map((id) => (
              <Row key={id} label={SECTIONS[id].title} sub={SECTIONS[id].summary} detail={detail[id]} onClick={() => router.push(`/settings/${id}`)} />
            ))}
          </Group>
        ))}
        <Group title="データ" footer="予定・タスク・時間割・習慣・朝の記録など、すべてをサンプルの状態に戻します。">
          <DangerButton
            confirm="すべてのデータをサンプルの状態に戻します。自分で入れた予定やタスク、設定も消えます。よろしいですか？"
            onClick={reset}
          >
            サンプルに戻す
          </DangerButton>
        </Group>
      </div>
    </div>
  );
}

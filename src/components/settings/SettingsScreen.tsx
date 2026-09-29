"use client";

import { useRouter } from "next/navigation";
import { useApp } from "@/components/app/StoreProvider";
import { DangerButton, Group, Row, ScreenHeader } from "@/components/ui/controls";
import { formatMinuteOfDay } from "@/lib/mock/model";
import { formatMinutes } from "@/lib/mock/jst";
import { SECTIONS, type SectionId } from "./sections";
import { signOut } from "@/lib/sync/remote";
import type { SyncStatus } from "@/lib/mock/store";

const SYNC_LABEL: Record<SyncStatus, string> = {
  loading: "サーバーから読み込み中…",
  synced: "サーバーに保存済み",
  saving: "保存中…",
  offline: "サーバーに接続できません（この端末には保存しています）",
};

export default function SettingsScreen() {
  const { state, reset, sync, imports } = useApp();
  const router = useRouter();
  const s = state.settings;

  const detail: Record<SectionId, string> = {
    calendars: imports.sources ? `${imports.sources.length}件` : "",
    timetable: `${state.courses.length}件`,
    places: `${state.places.length}件`,
    habits: `${state.habits.length}件`,
    avoid: `${state.avoidWindows.length}件`,
    treats: `${state.treats.length}件`,
    routine: `${state.routineSteps.length}つ`,
    notifications: "",
    feed: "",
    tags: `${state.tags.length}つ`,
    colors: "",
    weather: state.weatherPlace?.name ?? "",
    notion: state.notion ? "取り込み中" : "",
    basic: `睡眠${formatMinutes(s.sleepMinutes)}・${formatMinuteOfDay(s.defaultWakeMinuteOfDay)}起床`,
  };

  const groups: { title: string; ids: SectionId[] }[] = [
    { title: "予定", ids: ["calendars", "notion", "feed", "timetable", "places", "colors"] },
    { title: "生活のリズム", ids: ["habits", "tags", "avoid", "weather", "basic"] },
    { title: "朝", ids: ["routine", "treats"] },
    { title: "通知", ids: ["notifications"] },
  ];

  return (
    <div className="h-full overflow-y-auto bg-grouped">
      <ScreenHeader title="設定" />
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pb-10 sm:px-6">
        {groups.map((g) => (
          <Group key={g.title} title={g.title}>
            {g.ids.map((id) => (
              <Row key={id} label={SECTIONS[id].title} detail={detail[id]} onClick={() => router.push(`/settings/${id}`)} />
            ))}
          </Group>
        ))}
        <Group title="アカウント">
          <Row label="同期" detail={SYNC_LABEL[sync]} />
          <DangerButton
            confirm="ログアウトします。次に開くときは、もう一度ログインが必要です。よろしいですか？"
            onClick={async () => {
              await signOut();
              router.replace("/login");
              router.refresh();
            }}
          >
            ログアウト
          </DangerButton>
        </Group>
        <Group title="データ">
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

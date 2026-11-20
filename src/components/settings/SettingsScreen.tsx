"use client";

import { flushLifeBeforeSignOut } from "@/lib/life/store";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/app/StoreProvider";
import { DangerButton, Group, Row, ScreenHeader } from "@/components/ui/controls";
import { formatMinuteOfDay } from "@/lib/mock/model";
import { formatMinutes } from "@/lib/mock/jst";
import { SECTIONS, type SectionId } from "./sections";
import { signOut } from "@/lib/sync/remote";
import { clearLocalData, type SyncStatus } from "@/lib/mock/store";
import { unsubscribePush } from "@/lib/sync/push";

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
    rewards: "",
    health: Object.keys(state.healthSleep).length ? "取り込み中" : "",
    basic: `睡眠${formatMinutes(s.sleepMinutes)}・${formatMinuteOfDay(s.defaultWakeMinuteOfDay)}起床`,
  };

  const groups: { title: string; ids: SectionId[] }[] = [
    { title: "予定", ids: ["calendars", "notion", "feed", "timetable", "places", "colors"] },
    { title: "生活のリズム", ids: ["habits", "tags", "avoid", "weather", "basic"] },
    { title: "朝", ids: ["routine", "treats"] },
    { title: "記録", ids: ["health", "rewards"] },
    { title: "通知", ids: ["notifications"] },
  ];

  return (
    <div className="h-full overflow-y-auto bg-grouped">
      <ScreenHeader title="設定" right={<button type="button" className="press min-h-11 px-3 font-medium" onClick={() => {
        const origin = sessionStorage.getItem("settings-origin") ?? "/";
        router.push(["/", "/tasks", "/calendar", "/meals", "/exercise", "/stats"].includes(origin.split(/[?#]/)[0]) ? origin : "/");
      }}>戻る</button>} />
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
              // 送れていない食事・運動の記録は、ログアウトすると消える。先に送ってみて、残れば確かめる
              const unsent = await flushLifeBeforeSignOut();
              if (unsent > 0 && !window.confirm(`まだ送れていない食事・運動の記録が${unsent}件あります。ログアウトすると消えます。それでもログアウトしますか？`)) return;
              // この端末には通知を送らないようにし、端末の控えも消す
              await unsubscribePush().catch(() => undefined);
              await signOut();
              clearLocalData();
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

"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Task } from "@/lib/scheduler";
import { useMockStore } from "@/lib/mock/store";
import { completeTask } from "@/lib/mock/state";
import { CALENDARS } from "@/lib/mock/calendars";
import { fetchRainChance } from "@/lib/weather/openMeteo";
import { fetchNotionRows } from "@/lib/sync/notion";
import { applyNotionRows, deleteTask as removeTask } from "@/lib/mock/notion";
import QuickAddBar from "@/components/calendar/QuickAddBar";
import TaskForm from "@/components/tasks/TaskForm";
import { warningCount } from "@/components/today/Notices";
import { AppContext, type AppContextValue } from "./StoreProvider";
import OfflineNotice from "./OfflineNotice";
import { CalendarIcon, SettingsIcon, StatsIcon, TasksIcon, TodayIcon } from "./icons";

const TABS = [
  { href: "/", label: "今日", Icon: TodayIcon },
  { href: "/calendar", label: "カレンダー", Icon: CalendarIcon },
  { href: "/tasks", label: "タスク", Icon: TasksIcon },
  { href: "/stats", label: "記録", Icon: StatsIcon },
  { href: "/settings", label: "設定", Icon: SettingsIcon },
] as const;

/** 天気予報を取り直す間隔 */
const WEATHER_REFRESH_MS = 3 * 60 * 60 * 1000;
/** 天気・Notion を取れなかったときに、次に試すまで */
const RETRY_MS = 10 * 60 * 1000;

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

function Badge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="absolute -right-2 -top-1 min-w-[18px] rounded-full bg-accent px-1 text-center text-[11px] font-semibold leading-[18px] text-white">
      {n}
    </span>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const store = useMockStore();
  const pathname = usePathname();
  const [editingTask, setEditingTask] = useState<{ id?: string } | null>(null);

  const openTask = useCallback((id?: string) => setEditingTask({ id }), []);
  const ctx = useMemo<AppContextValue>(() => ({ ...store, openTask }), [store, openTask]);

  const { state, update } = store;
  const warnings = warningCount(state);

  // 天気予報：場所があれば、開いたときと3時間ごとに雨の確率を取り直す（取れなければ前の予報のまま）
  const place = state.weatherPlace;
  const fetchedAt = state.rainForecast?.fetchedAt ?? 0;
  const weatherBusy = useRef(false);
  // 取れなかったときに、保存のたびに取りにいかない
  const weatherTried = useRef(0);
  useEffect(() => {
    if (store.sync === "loading" || !place) return;
    const check = () => {
      if (weatherBusy.current || Date.now() - fetchedAt < WEATHER_REFRESH_MS || Date.now() - weatherTried.current < RETRY_MS) return;
      weatherBusy.current = true;
      weatherTried.current = Date.now();
      fetchRainChance(place)
        .then((days) => update((d) => ({ ...d, rainForecast: { fetchedAt: Date.now(), days } }), { auto: true }))
        .catch((e) => console.warn("天気予報を取れませんでした", e instanceof Error ? e.message : e))
        .finally(() => (weatherBusy.current = false));
    };
    check();
    const t = window.setInterval(check, 10 * 60 * 1000);
    return () => window.clearInterval(t);
  }, [store.sync, place, fetchedAt, update]);

  // Notion の選考の表：列を選んであれば、開いたときと30分ごとに締切を取り込む（読めなければ前のタスクのまま）
  const notion = state.notion;
  const notionBusy = useRef(false);
  const notionTried = useRef(0);
  useEffect(() => {
    if (store.sync === "loading" || !notion?.dateProp) return;
    const check = () => {
      if (notionBusy.current || Date.now() - (notion.fetchedAt ?? 0) < 30 * 60 * 1000 || Date.now() - notionTried.current < RETRY_MS) return;
      notionBusy.current = true;
      notionTried.current = Date.now();
      fetchNotionRows(notion.dateProp, notion.stageProp)
        .then((r) => update((d) => applyNotionRows(d, r.rows, Date.now(), r.fetchedAt), { auto: true }))
        .catch((e) => console.warn("Notion を読めませんでした", e instanceof Error ? e.message : e))
        .finally(() => (notionBusy.current = false));
    };
    check();
    const t = window.setInterval(check, 10 * 60 * 1000);
    return () => window.clearInterval(t);
  }, [store.sync, notion, update]);

  // 設定で選んだカレンダーの色を、画面全体の色の変数に上書きする（選んでいなければ初期の色）
  useEffect(() => {
    const root = document.documentElement.style;
    for (const c of CALENDARS) {
      const v = state.calendarColors[c.id];
      if (v) root.setProperty(`--cal-${c.id}`, v);
      else root.removeProperty(`--cal-${c.id}`);
    }
  }, [state.calendarColors]);
  const showQuickAdd = !pathname.startsWith("/settings");
  const task = editingTask?.id ? state.tasks.find((t) => t.id === editingTask.id) : undefined;

  const addTask = (t: Task) => update((d) => ({ ...d, tasks: [...d.tasks, t] }));
  const saveTask = (t: Task) => {
    update((d) => ({
      ...d,
      tasks: d.tasks.some((x) => x.id === t.id) ? d.tasks.map((x) => (x.id === t.id ? t : x)) : [...d.tasks, t],
    }));
    setEditingTask(null);
  };
  const deleteTask = (id: string) => {
    update((d) => removeTask(d, id));
    setEditingTask(null);
  };

  // サーバーの状態が確定するまで、入力・記録用の画面を表示しない。
  // 読み込みに失敗した場合は、端末の控えで編集を続けられる。
  if (!store.initialLoaded) {
    return <div role="status" className="flex h-dvh items-center justify-center text-[15px] text-muted">データを読み込み中…</div>;
  }

  return (
    <AppContext value={ctx}>
      <div className="flex h-dvh overflow-hidden bg-bg text-fg">
        {/* 広い画面：左のナビゲーション */}
        <nav
          className="hidden shrink-0 flex-col gap-1 border-r border-line bg-grouped px-2 pt-[max(16px,env(safe-area-inset-top))] sm:flex sm:w-[84px] lg:w-52"
          aria-label="画面の切り替え"
        >
          <p className="mb-3 hidden px-3 text-[13px] font-semibold text-muted lg:block">リズム カレンダー</p>
          {TABS.map(({ href, label, Icon }) => {
            const on = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={on ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[11px] lg:flex-row lg:gap-3 lg:px-3 lg:text-[15px] ${
                  on ? "bg-surface font-semibold text-accent shadow-sm" : "text-fg hover:bg-surface/60"
                }`}
              >
                <span className="relative">
                  <Icon />
                  {href === "/" && <Badge n={warnings} />}
                </span>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">{children}</div>
          <OfflineNotice />
          {showQuickAdd && <QuickAddBar onAdd={addTask} />}

          {/* スマホ：iOS 風の下のタブ */}
          <nav
            className="flex shrink-0 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
            aria-label="画面の切り替え"
          >
            {TABS.map(({ href, label, Icon }) => {
              const on = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={on ? "page" : undefined}
                  className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 pt-1.5 pb-1 text-[10px] font-medium ${
                    on ? "text-accent" : "text-muted"
                  }`}
                >
                  <span className="relative">
                    <Icon />
                    {href === "/" && <Badge n={warnings} />}
                  </span>
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {editingTask && (
        <TaskForm
          key={editingTask.id ?? "new"}
          task={task}
          state={state}
          onSave={saveTask}
          onDelete={deleteTask}
          onComplete={(id) => {
            update((d) => completeTask(d, id, Date.now()));
            setEditingTask(null);
          }}
          onClose={() => setEditingTask(null)}
        />
      )}
    </AppContext>
  );
}

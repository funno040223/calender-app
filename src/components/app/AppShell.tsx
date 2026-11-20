"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TASK_LEAD_DAYS, type Task } from "@/lib/scheduler";
import { useMockStore, type MockState } from "@/lib/mock/store";
import { completeTask, keepBlockFree, releaseKeepFree } from "@/lib/mock/state";
import { DAY_MS, dayStartOf, formatDate, formatTime, newId } from "@/lib/mock/jst";
import { CALENDARS } from "@/lib/mock/calendars";
import { fetchRainChance } from "@/lib/weather/openMeteo";
import { fetchNotionRows } from "@/lib/sync/notion";
import { loadSleepNights, takeHealthAsked } from "@/lib/sync/health";
import { dateKeyOf } from "@/lib/mock/model";
import { markOpened } from "@/lib/mock/wake";
import { withLifeExerciseRewards } from "@/lib/mock/stats";
import { applyNotionRows, deleteTask as removeTask } from "@/lib/mock/notion";
import QuickAddBar from "@/components/calendar/QuickAddBar";
import TaskForm from "@/components/tasks/TaskForm";
import { warningCount } from "@/components/today/Notices";
import { AppContext, type AppContextValue } from "./StoreProvider";
import OfflineNotice from "./OfflineNotice";
import { CalendarIcon, StatsIcon, MealIcon, ExerciseIcon, SettingsIcon, TodayIcon } from "./icons";
import { SettingsLink } from "@/components/life/Controls";
import { planLifeExercise } from "@/lib/life/placement";
import { useLife } from "@/lib/life/store";

const TABS = [
  { href: "/", label: "ホーム", Icon: TodayIcon },
  { href: "/calendar", label: "予定", Icon: CalendarIcon },
  { href: "/meals", label: "料理", Icon: MealIcon },
  { href: "/exercise", label: "運動", Icon: ExerciseIcon },
  { href: "/stats", label: "記録", Icon: StatsIcon },
] as const;

/** 天気予報を取り直す間隔 */
const WEATHER_REFRESH_MS = 3 * 60 * 60 * 1000;
/** 天気・Notion を取れなかったときに、次に試すまで */
const RETRY_MS = 10 * 60 * 1000;

const isActive = (pathname: string, href: string) => pathname === href || (href === "/calendar" && pathname === "/tasks");

/** お知らせを出しておく時間 */
const TOAST_MS = 5000;

/** 枠の始まりを「今日 9:30〜」の形で */
function whenOf(start: number, now: number): string {
  const today = dayStartOf(now);
  const d = dayStartOf(start);
  return `${d === today ? "今日" : d === today + DAY_MS ? "明日" : formatDate(start)} ${formatTime(start)}〜`;
}

/** できなかった習慣が次にいつ入るか */
function habitPlacementOf(state: MockState, habitId: string, now: number): string | undefined {
  const b = state.result.blocks.filter((x) => x.kind === "habit" && x.refId === habitId && x.start > now).sort((a, c) => a.start - c.start)[0];
  return b ? `次は${whenOf(b.start, now)}` : undefined;
}

/** 追加・変更したタスクが次にいつ入るか（入らなければ、その理由を短く） */
function placementOf(state: MockState, taskId: string, now: number): string | undefined {
  const b = state.result.blocks
    .filter((x) => x.kind === "task" && x.refId === taskId && x.end > now)
    .sort((a, c) => a.start - c.start)[0];
  if (b) return whenOf(b.start, now);
  const t = state.tasks.find((x) => x.id === taskId);
  if (!t) return undefined;
  if (state.result.shortfalls.some((s) => s.taskId === taskId)) return "入りきりません";
  // 締切の2週間前になるまでは、予定に入れない
  if (t.deadline !== undefined && t.deadline - TASK_LEAD_DAYS * DAY_MS > state.plannedAt) return "まだ先";
  return undefined;
}

function Badge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="absolute -right-2 -top-1 min-w-[18px] rounded-full bg-accent px-1 text-center text-[11px] font-semibold leading-[18px] text-white">
      {n}
    </span>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const life = useLife();
  const store = useMockStore(life);
  const pathname = usePathname();
  const [editingTask, setEditingTask] = useState<{ id?: string } | null>(null);
  const [toast, setToast] = useState<{ text: string; taskId?: string; habitId?: string; at: number }>();

  const openTask = useCallback((id?: string) => setEditingTask({ id }), []);
  const notify = useCallback(
    (text: string, opts?: { taskId?: string; habitId?: string }) => setToast({ text, taskId: opts?.taskId, habitId: opts?.habitId, at: Date.now() }),
    [],
  );
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(undefined), TOAST_MS);
    return () => window.clearTimeout(t);
  }, [toast]);
  // 次の操作をしたら、前のお知らせは消す（「元に戻す」で別の操作を戻さないように）
  const { update: storeUpdate, patch: storePatch, undo } = store;
  const update = useCallback<typeof storeUpdate>(
    (fn, opts) => {
      if (!opts?.auto) setToast(undefined);
      storeUpdate(fn, opts);
    },
    [storeUpdate],
  );
  const patch = useCallback<typeof storePatch>(
    (fn) => {
      setToast(undefined);
      storePatch(fn);
    },
    [storePatch],
  );
  const { state } = store;
  const { exercise } = life.projection;
  const displayState = useMemo(() => withLifeExerciseRewards(state, { exercise }), [state, exercise]);
  const lifeSchedule = useMemo(() => planLifeExercise(state, life.projection), [state, life.projection]);
  const ctx = useMemo<AppContextValue>(
    () => ({ ...store, state: displayState, lifeSchedule, update, patch, openTask, notify }),
    [store, displayState, lifeSchedule, update, patch, openTask, notify],
  );
  const warnings = warningCount(state);

  // その朝に最初に開いた時刻を残す（「いつ起きた？」の候補と、起きるまで止める通知に使う）
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  });
  useEffect(() => {
    if (store.sync === "loading") return;
    const mark = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      const s = latest.current;
      const day = s.result.dayPlans.find((d) => d.dayStart === dayStartOf(now));
      const window = day && { wake: day.wake, end: day.bed - s.settings.windDownMinutes * 60_000 };
      if (markOpened(s, now, window) !== s) update((d) => markOpened(d, now, window), { auto: true });
    };
    mark();
    document.addEventListener("visibilitychange", mark);
    return () => document.removeEventListener("visibilitychange", mark);
  }, [store.sync, update]);

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

  // ヘルスケアの睡眠：ショートカットが送った夜ごとのまとめを、開いたとき・戻ってきたとき（10分ごとまで）に読む。60日ぶん残す
  const healthTried = useRef(0);
  useEffect(() => {
    if (store.sync === "loading") return;
    const check = (force = false) => {
      if (!force && Date.now() - healthTried.current < 10 * 60 * 1000) return;
      healthTried.current = Date.now();
      const from = dateKeyOf(Date.now() - 60 * 24 * 60 * 60 * 1000);
      loadSleepNights(dateKeyOf(Date.now() - 21 * 24 * 60 * 60 * 1000))
        .then((nights) =>
          update((d) => {
            const next = Object.fromEntries(Object.entries({ ...d.healthSleep, ...nights }).filter(([k]) => k >= from));
            return JSON.stringify(next) === JSON.stringify(d.healthSleep) ? d : { ...d, healthSleep: next };
          }, { auto: true }),
        )
        // まだ SQL を実行していないときなども、前の記録のまま
        .catch((e) => console.warn("ヘルスケアの睡眠を読めませんでした", e instanceof Error ? e.message : e));
    };
    check();
    // ショートカットで睡眠を送って戻ってきたら、すぐ読む（届くのが少し遅れることもあるので、もう一度）
    let again = 0;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (!takeHealthAsked()) return check();
      check(true);
      again = window.setTimeout(() => check(true), 8000);
    };
    document.addEventListener("visibilitychange", onVisible);
    const t = window.setInterval(check, 10 * 60 * 1000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(t);
      window.clearTimeout(again);
    };
  }, [store.sync, update]);

  // 設定で選んだカレンダーの色を、画面全体の色の変数に上書きする（選んでいなければ初期の色）
  useEffect(() => {
    const root = document.documentElement.style;
    for (const c of CALENDARS) {
      const v = state.calendarColors[c.id];
      if (v) root.setProperty(`--cal-${c.id}`, v);
      else root.removeProperty(`--cal-${c.id}`);
    }
  }, [state.calendarColors]);
  // タスクを足すのは、今日・カレンダー・タスクの画面だけ
  const schedule = pathname === "/calendar" || pathname === "/tasks";
  const showQuickAdd = schedule || pathname === "/";
  const task = editingTask?.id ? state.tasks.find((t) => t.id === editingTask.id) : undefined;

  const addTask = (t: Task) => {
    update((d) => ({ ...d, tasks: [...d.tasks, t] }));
    notify(`「${t.title}」を追加`, { taskId: t.id });
  };
  const saveTask = (t: Task) => {
    const isNew = !state.tasks.some((x) => x.id === t.id);
    update((d) => ({
      ...d,
      tasks: d.tasks.some((x) => x.id === t.id) ? d.tasks.map((x) => (x.id === t.id ? t : x)) : [...d.tasks, t],
    }));
    setEditingTask(null);
    notify(`「${t.title}」を${isNew ? "追加" : "保存"}`, { taskId: t.id });
  };
  const deleteTask = (id: string) => {
    const title = state.tasks.find((x) => x.id === id)?.title;
    update((d) => removeTask(d, id));
    setEditingTask(null);
    notify(`「${title ?? ""}」を削除`);
  };
  const toastPlace = toast?.taskId
    ? placementOf(state, toast.taskId, toast.at)
    : toast?.habitId
      ? habitPlacementOf(state, toast.habitId, toast.at)
      : undefined;

  // サーバーの状態が確定するまで、入力・記録用の画面を表示しない。
  // 読み込みに失敗した場合は、端末の控えで編集を続けられる。
  if (!store.initialLoaded) {
    return (
      <div role="status" className="flex h-dvh items-center justify-center gap-1.5 bg-grouped">
        <span className="sr-only">読み込み中</span>
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-2 w-2 animate-pulse rounded-full bg-muted/60" style={{ animationDelay: `${i * 150}ms` }} />
        ))}
      </div>
    );
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
                prefetch={href === "/meals" || href === "/exercise" ? false : undefined}
                aria-current={on ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[11px] lg:flex-row lg:gap-3 lg:px-3 lg:text-[15px] ${
                  on ? "bg-surface font-semibold text-tint shadow-sm" : "text-muted hover:bg-surface/60"
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
          <Link href="/settings" onClick={() => {
            if (!pathname.startsWith("/settings")) sessionStorage.setItem("settings-origin", location.pathname + location.search + location.hash);
          }} aria-current={pathname.startsWith("/settings") ? "page" : undefined} className="mt-auto mb-3 flex min-h-11 flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs text-muted hover:bg-surface lg:flex-row lg:gap-3 lg:text-[15px]"><SettingsIcon />設定</Link>
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          {schedule && (
            <div className="flex items-center justify-between border-b border-line bg-grouped px-3 pt-[env(safe-area-inset-top)]">
              <nav aria-label="予定の表示" className="flex gap-1">
                {([["/calendar", "カレンダー"], ["/tasks", "タスク"]] as const).map(([href, label]) => (
                  <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-lg px-3 ${pathname === href ? "font-semibold text-fg" : "text-muted"}`}>{label}</Link>
                ))}
              </nav>
              <SettingsLink />
            </div>
          )}
          <div className="relative min-h-0 flex-1">
            {children}
            {toast && (
              <div className="pointer-events-none absolute inset-x-0 bottom-3 z-40 flex justify-center px-4">
                <div role="status" className="pointer-events-auto flex min-w-0 max-w-md items-center gap-3 rounded-2xl bg-tint py-2 pl-4 pr-2 text-[14px] text-on-tint shadow-xl">
                  <span className="min-w-0 truncate">{toast.text}</span>
                  {toastPlace && <span className="shrink-0 font-semibold">{toastPlace}</span>}
                  {store.canUndo ? (
                    <button
                      type="button"
                      onClick={() => {
                        undo();
                        setToast(undefined);
                      }}
                      className="press shrink-0 rounded-xl bg-on-tint/15 px-3 py-1.5 font-semibold"
                    >
                      元に戻す
                    </button>
                  ) : (
                    <span className="w-2 shrink-0" />
                  )}
                </div>
              </div>
            )}
          </div>
          <OfflineNotice />
          {/* 下の欄：タスクの追加とタブをひとまとまりに */}
          <div className={`shrink-0 border-t border-line/70 bg-surface/90 backdrop-blur-xl ${showQuickAdd ? "" : "sm:hidden"}`}>
            {showQuickAdd && <QuickAddBar onAdd={addTask} />}

            {/* スマホ：iOS 風の下のタブ */}
            <nav
              className="flex pb-[max(4px,env(safe-area-inset-bottom))] sm:hidden"
              aria-label="画面の切り替え"
            >
              {TABS.map(({ href, label, Icon }) => {
                const on = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    prefetch={href === "/meals" || href === "/exercise" ? false : undefined}
                    aria-current={on ? "page" : undefined}
                    className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 pt-1.5 pb-1 text-[10px] ${
                      on ? "font-semibold text-tint" : "font-medium text-muted/80"
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
      </div>

      {editingTask && (
        <TaskForm
          key={editingTask.id ?? "new"}
          task={task}
          state={state}
          onSave={saveTask}
          onDelete={deleteTask}
          onComplete={(id) => {
            const title = state.tasks.find((x) => x.id === id)?.title;
            update((d) => completeTask(d, id, Date.now()));
            setEditingTask(null);
            notify(`「${title ?? ""}」を完了`);
          }}
          onKeepFree={(b) => update((d) => keepBlockFree(d, b, newId("free"), Date.now()))}
          onReleaseFree={(id) => update((d) => releaseKeepFree(d, id))}
          onClose={() => setEditingTask(null)}
        />
      )}
    </AppContext>
  );
}

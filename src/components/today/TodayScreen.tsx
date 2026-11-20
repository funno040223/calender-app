"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SettingsLink } from "@/components/life/Controls";
import HomeMeal from "@/components/life/HomeMeal";
import { LifeReviewCard } from "@/components/life/LifeStats";
import { useApp } from "@/components/app/StoreProvider";
import { DAY_MS, dayStartOf, formatDate, formatTime, newId } from "@/lib/mock/jst";
import { Card, ScreenHeader } from "@/components/ui/controls";
import ProgressCard from "./ProgressCard";
import WorkNowCard from "./WorkNowCard";
import Notices, { hasNotices } from "./Notices";
import BedCard, { bedDayOf } from "./BedCard";
import MorningCard, { isMorning } from "./MorningCard";
import DayCard from "./DayCard";
import TreatCard from "./TreatCard";
import Timeline from "./Timeline";
import EveningCard from "./EveningCard";
import ReviewCard from "./ReviewCard";
import MealCard from "./MealCard";
import ContactCard from "./ContactCard";
import SmokeCard from "./SmokeCard";

/** 1分ごとに「今」を進める */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

const WIDE = "(min-width: 1024px)";
// 描くたびに登録し直さないように、外で決めておく
const subscribeWide = (cb: () => void) => {
  if (typeof window.matchMedia !== "function") return () => {};
  const m = window.matchMedia(WIDE);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
const isWide = () => typeof window.matchMedia === "function" && window.matchMedia(WIDE).matches;
/** 広い画面（2列で並べる）かどうか */
function useWide(): boolean {
  return useSyncExternalStore(subscribeWide, isWide, () => false);
}

const HOME_PAGES = ["いま", "今日の流れ"] as const;

/** 「10/1(木)」→「10月1日（木）」 */
const headerDate = (ms: number) => formatDate(ms).replace(/^(\d+)\/(\d+)\((.)\)$/, "$1月$2日（$3）");

export default function TodayScreen() {
  const { state, update, openTask, sync, undo, canUndo } = useApp();
  // 新旧どちらの通知リンクも、開くだけでは実績にしない。
  useEffect(() => {
    if (sync === "loading") return;
    const params = new URLSearchParams(window.location.search);
    const key = params.get("task") ?? params.get("done");
    if (!key) return;
    window.history.replaceState(null, "", "/");
    const id = key.slice(0, key.lastIndexOf(":"));
    if (state.tasks.some((t) => t.id === id)) openTask(id);
  }, [sync, openTask, state.tasks]);
  const now = useNow();
  const today = dayStartOf(now);
  const days = state.result.dayPlans;
  const idx = days.findIndex((d) => d.dayStart === today);
  const day = idx >= 0 ? days[idx] : undefined;
  const dayEnd = Math.max(day?.bed ?? 0, today + DAY_MS);
  const wide = useWide();
  // ホームのページ（狭い画面）。0＝いま、1＝今日の流れ
  const pager = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const onPagerScroll = () => {
    const el = pager.current;
    if (el && el.clientWidth > 0) setPage(Math.round(el.scrollLeft / el.clientWidth));
  };
  const goTo = (i: number) => {
    const el = pager.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };
  const morning = isMorning(state, day, now);
  // 寝る前は「おやすみ」だけにする（起床・就寝と「今から何する？」は出さない）
  const bedtime = !!bedDayOf(state.result, now, state.settings.windDownMinutes);

  const registerPlace = (location: string, minutes: number) =>
    update((d) => ({
      ...d,
      places: [...d.places, { id: newId("place"), name: location, keywords: [location], travelMinutes: minutes }],
    }));

  // 答えや設定が要るもの（作業の進み具合・移動時間・締切に足りないなど）は、いちばん上に。
  // そのあとは今の時間に合わせる：朝は「起きた」と朝ルーティン、夜は「おやすみ」と帰宅時の体力
  const top = (
    <>
      <ProgressCard now={now} />
      <ReviewCard today={today} />
      <LifeReviewCard home />
      {hasNotices(state) && (
        <Card title="お知らせ">
          <Notices
            state={state}
            onRegisterPlace={registerPlace}
            onOpenTask={openTask}
            onSetTravel={(id, m) => update((d) => ({ ...d, importedTravel: { ...d.importedTravel, [id]: m } }))}
            onFixShortfall={(id, fix) =>
              update((d) => ({
                ...d,
                tasks: d.tasks.map((t) =>
                  t.id !== id
                    ? t
                    : fix === "first"
                      ? { ...t, first: true }
                      : fix === "stretch"
                        ? { ...t, stretch: true }
                        : t.deadline !== undefined && t.deadlineKind === "target" && !t.relatedEventId
                          ? { ...t, deadline: t.deadline + DAY_MS }
                          : t,
                ),
              }))
            }
          />
        </Card>
      )}
      <BedCard now={now} />
      {day && <EveningCard day={day} now={now} />}
      {morning && <MorningCard day={day} now={now} />}
    </>
  );
  const middle = !bedtime && (
    <>
      {day && <DayCard day={day} today={today} now={now} />}
      <WorkNowCard now={now} />
    </>
  );
  const rest = (
    <>
      <SmokeCard today={today} />
      <details className="rounded-2xl bg-surface"><summary className="flex min-h-11 cursor-pointer items-center px-4 text-[15px] font-medium">今日の食事（家で・外で）</summary><MealCard today={today} now={now} /></details>
      {/* 朝のうちは、朝ルーティンのカードで「起きた」を押すと開く */}
      {!morning && <TreatCard today={today} day={day} />}
      <ContactCard today={today} now={now} />
      {!morning && <MorningCard day={day} now={now} compact />}
    </>
  );

  const moved = !!state.result.movedBlocks?.length && (
    <div role="status" className="text-[13px] text-muted">
      予定に合わせて今日の自動枠を{state.result.movedBlocks!.length}件変更しました。
      {state.result.movedBlocks!.slice(0, 3).map((b) => `${formatTime(b.start)} ${b.title}`).join("、")}
    </div>
  );
  // 取り消しは目立たせず、いちばん下に
  const undoButton = canUndo && (
    <div className="flex justify-center pb-4">
      <button type="button" onClick={undo} className="press rounded-full bg-surface px-3.5 py-1.5 text-[12px] text-muted">
        直前の操作を元に戻す
      </button>
    </div>
  );
  const nowPage = (
    <>
      {moved}
      {top}
      {!bedtime && <HomeMeal now={now} morning={morning} />}
      {middle}
      {rest}
      {undoButton}
    </>
  );

  // 広い画面は、いまと今日の流れを並べる
  if (wide) {
    return (
      <div className="h-full overflow-y-auto bg-grouped">
        <ScreenHeader title={headerDate(today)} width="max-w-5xl" right={<SettingsLink />} />
        <div className="mx-auto grid max-w-5xl grid-cols-2 items-start gap-4 px-6 pt-1 pb-8">
          <div className="flex flex-col gap-4">{nowPage}</div>
          <div className="flex flex-col gap-4">
            <Timeline now={now} dayEnd={dayEnd} />
          </div>
        </div>
      </div>
    );
  }

  // 狭い画面は2ページ。左右に指で送るか、上の切り替えで移る（iPhone のホーム画面のように）
  return (
    <div className="flex h-full flex-col bg-grouped">
      <ScreenHeader title={headerDate(today)} right={<SettingsLink />} />
      <nav aria-label="ホームのページ" className="flex gap-2 px-4 pb-2">
        {HOME_PAGES.map((label, i) => (
          <button
            key={label}
            type="button"
            aria-current={page === i ? "page" : undefined}
            onClick={() => goTo(i)}
            className={`press min-h-11 rounded-full px-4 text-[15px] ${page === i ? "bg-tint font-semibold text-on-tint" : "bg-surface2 text-muted"}`}
          >
            {label}
          </button>
        ))}
      </nav>
      <div
        ref={pager}
        onScroll={onPagerScroll}
        className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <section aria-label="いま" className="h-full w-full shrink-0 snap-start snap-always overflow-y-auto">
          <div className="flex flex-col gap-4 px-4 pt-1 pb-8">{nowPage}</div>
        </section>
        <section aria-label="今日の流れ" className="h-full w-full shrink-0 snap-start snap-always overflow-y-auto">
          <div className="flex flex-col gap-4 px-4 pt-1 pb-8">
            <Timeline now={now} dayEnd={dayEnd} />
          </div>
        </section>
      </div>
      {/* いまどちらのページか（ホーム画面の点と同じ） */}
      <div aria-hidden className="flex justify-center gap-1.5 py-1.5">
        {HOME_PAGES.map((label, i) => (
          <span key={label} className={`size-1.5 rounded-full ${page === i ? "bg-fg" : "bg-muted/40"}`} />
        ))}
      </div>
    </div>
  );
}

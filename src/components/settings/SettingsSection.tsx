"use client";

import Link from "next/link";
import { SECTIONS, type SectionId } from "./sections";
import Timetable from "./Timetable";
import CalendarSources from "./CalendarSources";
import Places from "./Places";
import Habits from "./Habits";
import AvoidWindows from "./AvoidWindows";
import Treats from "./Treats";
import RoutineSteps from "./RoutineSteps";
import BasicSettings from "./BasicSettings";
import Notifications from "./Notifications";
import Feed from "./Feed";
import Shortcut from "./Shortcut";

const BODY: Record<SectionId, () => React.ReactNode> = {
  calendars: CalendarSources,
  notifications: Notifications,
  feed: Feed,
  shortcut: Shortcut,
  timetable: Timetable,
  places: Places,
  habits: Habits,
  avoid: AvoidWindows,
  treats: Treats,
  routine: RoutineSteps,
  basic: BasicSettings,
};

export default function SettingsSection({ section }: { section: SectionId }) {
  const Body = BODY[section];
  return (
    <div className="h-full overflow-y-auto bg-grouped">
      <div className="mx-auto max-w-2xl px-2 pt-[max(8px,env(safe-area-inset-top))] sm:px-4 sm:pt-3">
        <Link href="/settings" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[17px] text-accent">
          <svg viewBox="0 0 10 16" width="10" height="16" aria-hidden>
            <path d="M8.5 1.5 2 8l6.5 6.5" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          設定
        </Link>
      </div>
      <h1 className="mx-auto max-w-2xl px-4 pb-3 text-[28px] font-bold leading-tight tracking-tight sm:px-6">{SECTIONS[section].title}</h1>
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pb-10 sm:px-6">
        <Body />
      </div>
    </div>
  );
}

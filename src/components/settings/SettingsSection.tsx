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
import Tags from "./Tags";
import CalendarColors from "./CalendarColors";
import Weather from "./Weather";
import Notion from "./Notion";
import Rewards from "./Rewards";
import Health from "./Health";

const BODY: Record<SectionId, () => React.ReactNode> = {
  calendars: CalendarSources,
  notifications: Notifications,
  feed: Feed,
  tags: Tags,
  colors: CalendarColors,
  weather: Weather,
  notion: Notion,
  rewards: Rewards,
  health: Health,
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
      <div className="sticky top-0 z-10 bg-grouped/85 backdrop-blur-xl">
        <div className="mx-auto grid max-w-2xl grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2 px-3 pt-[max(8px,env(safe-area-inset-top))] pb-2 sm:px-5 sm:pt-3">
          <Link href="/settings" aria-label="設定に戻る" className="press card-shadow flex h-9 w-9 items-center justify-center rounded-full bg-surface text-fg">
            <svg viewBox="0 0 10 16" width="9" height="15" aria-hidden>
              <path d="M8 1.5 2 8l6 6.5" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h1 className="truncate text-center text-[17px] font-semibold">{SECTIONS[section].title}</h1>
        </div>
      </div>
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-3 pb-10 sm:px-6">
        <Body />
      </div>
    </div>
  );
}

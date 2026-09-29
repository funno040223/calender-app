import type { CalendarEvent, Place, Settings } from "./types";

const ONLINE = /https?:\/\/|zoom|meet\.google|teams|webex|オンライン|online/i;
/** 会議のリンク。オンラインでも人に顔を出す予定とみなす */
const MEETING_LINK = /zoom\.us|meet\.google|teams\.microsoft|teams\.live|webex/i;
/** 予定のメモに「移動30」のように書いた移動時間 */
const TRAVEL_NOTE = /移動\s*(\d+)/;

export interface TravelInfo {
  atHome: boolean;
  minutes: number;
  /** 登録のない場所。通知で移動時間を聞く */
  unknown: boolean;
}

const HOME: TravelInfo = { atHome: true, minutes: 0, unknown: false };

/** 予定ごとの入力 → メモの記述 → 場所の登録 の順に移動時間を決める */
export function resolveTravel(ev: CalendarEvent, places: Place[], settings: Settings): TravelInfo {
  if (ev.atHome) return HOME;

  const note = ev.description?.match(TRAVEL_NOTE);
  const explicit = ev.travelMinutes ?? (note ? Number(note[1]) : undefined);
  if (explicit !== undefined) {
    return explicit === 0 ? HOME : { atHome: false, minutes: explicit, unknown: false };
  }

  const loc = ev.location?.trim();
  if (!loc || ONLINE.test(loc)) return HOME;

  const place = places.find((p) => [p.name, ...p.keywords].some((k) => k && loc.includes(k)));
  if (place) {
    return place.travelMinutes === 0 ? HOME : { atHome: false, minutes: place.travelMinutes, unknown: false };
  }
  return { atHome: false, minutes: settings.unknownTravelMinutes, unknown: true };
}

/** 身支度が要る予定か：予定ごとの指定 → 外出する予定 → 会議のリンクがある予定 */
export function needsPrep(ev: CalendarEvent, travel: Pick<TravelInfo, "atHome">): boolean {
  if (ev.needsPrep !== undefined) return ev.needsPrep;
  return !travel.atHome || MEETING_LINK.test(`${ev.location ?? ""} ${ev.description ?? ""}`);
}

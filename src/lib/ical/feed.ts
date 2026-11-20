import type { Block } from "@/lib/scheduler";
import { classEventsForPlan, type ClassEvent, type OwnEvent } from "@/lib/mock/model";
import type { ExportEvent } from "./export";
import { LIFE_EXERCISE_PREFIX } from "@/lib/life/model";

const DAY_MS = 24 * 60 * 60_000;
/** 配信する範囲。先は配置する日数（14日）に合わせる */
export const FEED_PAST_MS = 7 * DAY_MS;
export const FEED_FUTURE_MS = 15 * DAY_MS;

const KIND_LABEL: Record<Block["kind"], string> = { task: "タスク", habit: "習慣", routine: "朝ルーティン" };

/**
 * iCal で配信する予定：アプリが組んだ枠・アプリで入れた予定・時間割の授業。
 * Google カレンダーから取り込んだ予定は、Google 側にあって二重になるので入れない
 */
export function feedEvents(input: { blocks: Block[]; events: OwnEvent[]; classEvents: ClassEvent[]; now: number }): ExportEvent[] {
  const { now } = input;
  const inRange = (e: { start: number; end: number }) => e.end > now - FEED_PAST_MS && e.start < now + FEED_FUTURE_MS;
  const out: ExportEvent[] = [];
  for (const b of input.blocks.filter(inRange)) {
    out.push({
      uid: b.refId.startsWith(LIFE_EXERCISE_PREFIX) ? `block-${b.kind}-${b.refId}@task-rhythm-app`
        : `block-${b.kind}-${b.refId}-${b.start}@task-rhythm-app`,
      title: b.title,
      start: b.start,
      end: b.end,
      description: `${KIND_LABEL[b.kind]}（リズム カレンダーが配置）`,
    });
  }
  for (const e of input.events.filter(inRange)) {
    out.push({ uid: `event-${e.id}@task-rhythm-app`, title: e.title, start: e.start, end: e.end, allDay: e.allDay, location: e.location, description: e.description });
  }
  for (const e of classEventsForPlan(input.classEvents).filter(inRange)) {
    out.push({ uid: `class-${e.id}@task-rhythm-app`, title: e.title, start: e.start, end: e.end, location: e.location });
  }
  return out.sort((a, b) => a.start - b.start);
}

/** 配信のアドレスに入れる合言葉の形（32バイトを base64url にしたもの） */
export const FEED_TOKEN = /^[A-Za-z0-9_-]{43}$/;

import { intersect, merge } from "./intervals";
import { ceilToStep, DAY_MS, MIN } from "./time";
import { wakingDayStart } from "./rhythm";
import type { Block, DayPlan, ExerciseInput, ExerciseOption, ExerciseRound, Interval, Settings } from "./types";

/** 運動の回の枠の refId（回の ID の前に付ける） */
export const EXERCISE_REF_PREFIX = "life-exercise:";
/** 置く時刻の目安（その日の 0:00 からの分）。時間帯の中で、これにいちばん近い時刻にする */
const IDEAL_MINUTE = 19 * 60;

export const exerciseRefOf = (roundId: string) => EXERCISE_REF_PREFIX + roundId;
export const isExerciseRef = (refId: string) => refId.startsWith(EXERCISE_REF_PREFIX);

interface Context {
  input: ExerciseInput;
  now: number;
  days: DayPlan[];
  settings: Settings;
  /** 今の空き時間（置くたびに変わる） */
  free: () => Interval[];
  /** 枠を置く（空き時間から除く） */
  take: (block: Block) => void;
  /** 前の計画から残した枠（始まった枠など） */
  kept: Block[];
  /** 前の計画の枠（できるだけ同じ時刻に置き直す） */
  movable: Block[];
  /** 締切に間に合わないタスクがあるか */
  hasShortfall: () => boolean;
}

interface Round {
  roundId: string;
  /** もともとの日（その日の 0:00） */
  preferred: number;
  weekEnd: number;
}

/**
 * 運動の回を置く。配置エンジンの中から2回呼ぶ：
 * placeChosen はタスク・習慣より前に、自分で時刻を選んだ回を置く（予定と同じく優先する）。
 * placeAuto はタスクのあとに、残りの回を空き時間へ置く（締切の作業時間を奪わない）。
 */
export function exercisePlacer(ctx: Context) {
  const { input, settings: s, days } = ctx;
  const tz = s.tzOffsetMinutes;
  const keyOf = (dayStart: number) => new Date(dayStart + tz * MIN).toISOString().slice(0, 10);
  const mondayOf = (dayStart: number) => dayStart - ((new Date(dayStart + tz * MIN).getUTCDay() + 6) % 7) * DAY_MS;
  const lengthOf = (mode: "normal" | "short") => (mode === "normal" ? input.normalMinutes : input.shortMinutes) * MIN;
  const dayOfTime = (t: number) => wakingDayStart(t, days, tz);
  const current = dayOfTime(ctx.now);
  const from = Math.max(input.since, mondayOf(current));
  const last = days.at(-1)?.dayStart ?? current;

  const rounds: Round[] = [];
  for (let week = mondayOf(from); week <= last; week += 7 * DAY_MS) {
    for (let i = 0; i < input.weeklyTimes; i++) {
      // 回の ID は記録に残るので変えない（週の月曜と何回目か）
      rounds.push({ roundId: `strength-${keyOf(week)}-${i + 1}`, preferred: week + Math.floor((i * 7) / input.weeklyTimes) * DAY_MS, weekEnd: week + 7 * DAY_MS });
    }
  }

  const result = new Map<string, ExerciseRound>();
  /** 運動をした・置いた日（続けての日を避ける） */
  const usedDays = new Map<string, number>();
  const otherDays = [...Object.values(input.done), ...input.doneDays];
  /** ほかの回と同じ日、または（続けての日を避けるなら）となりの日 */
  const nextToUsed = (dayStart: number, roundId: string) =>
    [...otherDays, ...[...usedDays].filter(([id]) => id !== roundId).map(([, d]) => d)].some((d) => {
      const gap = Math.abs(d - dayStart);
      return gap < DAY_MS / 2 || (input.nonConsecutive && gap < DAY_MS * 1.5);
    });

  const statusOf = (round: Round, block: Block): ExerciseRound["status"] =>
    dayOfTime(block.start) !== round.preferred ? "postponed" : block.end - block.start < lengthOf("normal") ? "short" : "normal";
  const titleOf = (mode: "normal" | "short") => (mode === "short" ? "家での運動（短め）" : "家での運動");
  const place = (round: Round, mode: "normal" | "short", start: number, reason?: string) => {
    const block: Block = { kind: "habit", refId: exerciseRefOf(round.roundId), title: titleOf(mode), start, end: start + lengthOf(mode) };
    ctx.take(block);
    usedDays.set(round.roundId, dayOfTime(start));
    result.set(round.roundId, { roundId: round.roundId, date: keyOf(dayOfTime(start)), block, status: statusOf(round, block), reason, options: [] });
  };
  const leave = (round: Round, status: ExerciseRound["status"], reason?: string) =>
    result.set(round.roundId, { roundId: round.roundId, date: keyOf(round.preferred), status, reason, options: [] });

  /** その日に置ける時刻（目安の時刻にいちばん近いところ。前に置いた時刻が空いていればそこ） */
  const bestStartOn = (d: DayPlan, len: number, roundId: string): number | undefined => {
    const window = { start: Math.max(ctx.now, d.dayStart + input.windowStart * MIN, d.wake), end: Math.min(d.dayStart + input.windowEnd * MIN, d.bed - s.windDownMinutes * MIN) };
    const room = intersect(ctx.free(), window);
    const prev = ctx.movable.find((b) => b.refId === exerciseRefOf(roundId) && b.start >= window.start && b.start < window.end)?.start;
    if (prev !== undefined && room.some((g) => prev >= g.start && prev + len <= g.end)) return prev;
    const ideal = d.dayStart + Math.max(input.windowStart, Math.min(IDEAL_MINUTE, input.windowEnd - input.normalMinutes)) * MIN;
    let best: number | undefined;
    for (const g of room) {
      const st = Math.max(ceilToStep(g.start, 5), Math.min(ideal, g.end - len));
      if (st + len > g.end) continue;
      if (best === undefined || Math.abs(st - ideal) < Math.abs(best - ideal)) best = st;
    }
    return best;
  };
  const daysFor = (round: Round) => days.filter((d) => d.dayStart >= Math.max(round.preferred, current, input.since) && d.dayStart < round.weekEnd);
  const modesOn = (d: DayPlan) => (input.tiredDays.includes(d.dayStart) ? (["short"] as const) : (["normal", "short"] as const));
  const optionsFor = (round: Round): ExerciseOption[] => {
    const out: ExerciseOption[] = [];
    for (const d of daysFor(round)) {
      if (nextToUsed(d.dayStart, round.roundId)) continue;
      for (const mode of modesOn(d)) {
        const start = bestStartOn(d, lengthOf(mode), round.roundId);
        if (start !== undefined) out.push({ mode, date: keyOf(d.dayStart), start, end: start + lengthOf(mode) });
      }
    }
    return [...out, { mode: "skip", date: keyOf(round.preferred) }];
  };
  const keptOf = (round: Round) => ctx.kept.find((b) => b.refId === exerciseRefOf(round.roundId));

  return {
    /** 自分で時刻を選んだ回（タスク・習慣より前に置く） */
    placeChosen() {
      for (const round of rounds) {
        const choice = input.choices[round.roundId];
        if (input.done[round.roundId] !== undefined || input.conflicts.includes(round.roundId) || choice?.start === undefined || choice.mode === "skip") continue;
        const kept = keptOf(round);
        if (kept) {
          usedDays.set(round.roundId, dayOfTime(kept.start));
          result.set(round.roundId, { roundId: round.roundId, date: keyOf(dayOfTime(kept.start)), block: kept, status: statusOf(round, kept), options: [] });
          continue;
        }
        const len = lengthOf(choice.mode);
        if (choice.start + len <= ctx.now) {
          leave(round, "confirm", "選んだ時間が過ぎました。");
          continue;
        }
        if (!ctx.free().some((g) => choice.start! >= g.start && choice.start! + len <= g.end)) {
          leave(round, "confirm", "選んだ時間に予定が入りました。");
          continue;
        }
        place(round, choice.mode, choice.start);
      }
    },

    /** 残りの回を、タスクを置いたあとの空き時間に置く */
    placeAuto(): ExerciseRound[] {
      for (const round of rounds) {
        if (result.has(round.roundId) && result.get(round.roundId)!.status !== "confirm") continue;
        const choice = input.choices[round.roundId];
        const doneDay = input.done[round.roundId];
        if (doneDay !== undefined) {
          result.set(round.roundId, { roundId: round.roundId, date: keyOf(doneDay), status: "completed", options: [] });
          continue;
        }
        if (choice?.mode === "skip") {
          leave(round, "skipped");
          continue;
        }
        if (input.conflicts.includes(round.roundId)) {
          leave(round, "confirm", "別の端末の記録を確かめてください。");
          continue;
        }
        if (result.has(round.roundId)) continue; // 選んだ時間に置けなかった回は、選び直してもらう
        const kept = keptOf(round);
        if (kept) {
          usedDays.set(round.roundId, dayOfTime(kept.start));
          result.set(round.roundId, { roundId: round.roundId, date: keyOf(dayOfTime(kept.start)), block: kept, status: statusOf(round, kept), options: [] });
          continue;
        }
        // 締切に間に合わない作業があるあいだは、自動では置かない（置くかどうかは自分で選ぶ）
        if (ctx.hasShortfall()) {
          leave(round, "confirm", "締切に間に合わない作業があるので、自動では入れていません。");
          continue;
        }
        let best: { mode: "normal" | "short"; start: number; score: number } | undefined;
        for (const d of daysFor(round)) {
          if (nextToUsed(d.dayStart, round.roundId)) continue;
          for (const mode of modesOn(d)) {
            if (choice && choice.mode !== mode) continue;
            const len = lengthOf(mode);
            const start = bestStartOn(d, len, round.roundId);
            if (start === undefined) continue;
            // もともとの日 → 長いほう → その日に余白が残る、の順に選ぶ。同じなら早い日
            const room = intersect(ctx.free(), { start: d.wake, end: d.bed }).reduce((sum, g) => sum + (g.end - g.start), 0) - len;
            const score = (d.dayStart === round.preferred ? 0 : 4) + (mode === "normal" ? 0 : 2) + (room >= s.minSlackMinutesPerDay * MIN ? 0 : 1);
            if (!best || score < best.score) best = { mode, start, score };
          }
        }
        if (!best) {
          leave(round, "skipped", "今週は入る時間がありませんでした。");
          continue;
        }
        const postponed = dayOfTime(best.start) !== round.preferred;
        place(round, best.mode, best.start, postponed ? "空いている日に移しました。" : best.mode === "short" ? "予定に合わせて短くしました。" : undefined);
      }
      // 選べる別の時間は、すべて置き終わってから（ほかの回と重ならないように）
      return rounds.map((round) => {
        const r = result.get(round.roundId)!;
        if (r.status === "completed") return r;
        // 自分の枠の時間も、選び直せる時間に入れる
        const withOwn = r.block ? merge([...ctx.free(), { start: r.block.start, end: r.block.end }]) : ctx.free();
        return { ...r, options: optionsWith(() => withOwn, () => optionsFor(round)) };
      });
    },
  };

  /** 空き時間を一時的に差し替えて計算する */
  function optionsWith(free: () => Interval[], f: () => ExerciseOption[]) {
    const saved = ctx.free;
    ctx.free = free;
    try {
      return f();
    } finally {
      ctx.free = saved;
    }
  }
}

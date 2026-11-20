"use client";

import { useLife } from "@/lib/life/store";
import type { ExerciseRound } from "@/lib/scheduler";
import { formatTime } from "@/lib/mock/jst";
import { Card } from "@/components/ui/controls";
import { choice, inset, summary } from "./Controls";

const statusLabels: Record<ExerciseRound["status"], string> = {
  normal: "予定どおり",
  short: "短め",
  postponed: "別の日に移しました",
  skipped: "今週は休み",
  confirm: "選んでください",
  completed: "やった",
};

const dayLabel = (date: string) => {
  const d = new Date(date + "T00:00:00+09:00");
  return `${d.getMonth() + 1}/${d.getDate()}（${"日月火水木金土"[d.getDay()]}）`;
};

export default function ExerciseRoundChoices({ round }: { round: ExerciseRound }) {
  const life = useLife();
  const chosen = life.projection.exerciseChoices[round.roundId]?.value;
  const own = chosen && !chosen.automatic;
  return (
    <Card title="運動の予定">
      <div className={inset}>
        <strong>
          {round.block && formatTime(round.block.start) + " · "}
          {own && round.block ? "選んだ時間" : statusLabels[round.status]}
        </strong>
        {round.reason && <p className="text-sm text-muted">{round.reason}</p>}
        {round.status !== "completed" && round.options.length > 0 && (
          <details open={round.status === "confirm"}>
            <summary className={summary}>時間を変える</summary>
            <div className="flex flex-col gap-2">
              {round.options.map((a) => {
                const current = !!round.block && a.start === round.block.start && a.end === round.block.end;
                return (
                  <button
                    type="button"
                    className={choice(current) + " disabled:opacity-50"}
                    key={`${a.mode}:${a.date}:${a.start ?? ""}`}
                    disabled={!life.ready || current}
                    aria-pressed={current}
                    onClick={() => life.setExerciseChoice({ roundId: round.roundId, mode: a.mode, start: a.start })}
                  >
                    {a.mode === "skip"
                      ? "今週は休む"
                      : `${dayLabel(a.date)} ${a.start !== undefined ? formatTime(a.start) : ""} ${a.mode === "normal" ? "ふつう" : "短め"}（${Math.round(((a.end ?? 0) - (a.start ?? 0)) / 60_000)}分）`}
                  </button>
                );
              })}
            </div>
          </details>
        )}
        {own && (
          <button type="button" className={choice(false)} onClick={() => life.undoExerciseChoice(round.roundId)}>
            自動に戻す
          </button>
        )}
      </div>
    </Card>
  );
}

"use client";

import { useLife } from "@/lib/life/store";
import type { ExerciseRound } from "@/lib/life/placement";
import { formatTime } from "@/lib/mock/jst";
import { Card } from "@/components/ui/controls";
import { choice, inset } from "./Controls";

const statusLabels = {
  normal: "通常",
  short: "短縮",
  postponed: "振替",
  skipped: "見送り",
  confirm: "要確認",
  completed: "完了",
};

export default function ExerciseRoundChoices({ round }: { round: ExerciseRound }) {
  const life = useLife();
  const chosen = life.projection.exerciseChoices[round.roundId];
  return (
    <Card title="運動の予定">
      <div className={inset}>
        <strong>
          {round.block && formatTime(round.block.start) + " · "}筋トレ · {statusLabels[round.status]}
        </strong>
        {round.reason && <p className="text-sm">{round.reason}</p>}
        {round.status !== "completed" && (
          <details>
            <summary className="cursor-pointer py-2">予定を変更</summary>
            <div className="flex flex-col gap-2">
              {round.alternatives.map((a, i) => (
                <button
                  type="button"
                  className={choice(false) + " disabled:opacity-50"}
                  key={i}
                  disabled={!life.ready || a.available === false}
                  onClick={() => life.setExerciseChoice({ roundId: round.roundId, mode: a.mode, start: a.start })}
                >
                  {a.mode === "skip"
                    ? "今回は見送る"
                    : a.date +
                      " " +
                      (a.start ? formatTime(a.start) + " " : "") +
                      (a.mode === "normal" ? "通常版" : "短縮版")}
                  {a.shortfallMinutes > 0 && " · 作業が" + a.shortfallMinutes + "分不足"}
                  {a.movedBlocks > 0 && " · " + a.movedBlocks + "枠を" + a.movedMinutes + "分移動"}
                  {a.available === false && " · 既存の予定や締切を守るため選択不可"}
                </button>
              ))}
            </div>
          </details>
        )}
        {chosen && (
          <button type="button" className={choice(false)} onClick={() => life.undoExerciseChoice(round.roundId)}>
            変更を元に戻す
          </button>
        )}
      </div>
    </Card>
  );
}

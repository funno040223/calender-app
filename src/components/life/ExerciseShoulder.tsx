"use client";

import { useState } from "react";
import { useLife } from "@/lib/life/store";
import { SHOULDER_DESK, SHOULDER_FULL, addShoulder, shoulderRoundOf } from "@/lib/life/workouts";
import { Card, btnPrimary } from "@/components/ui/controls";
import { Segments, choice, choices, inset, summary } from "./Controls";

const versions = ["座ったまま 2分", "しっかり 5分"] as const;

/** 肩こりほぐし。カレンダーには置かず、作業の区切りにいつでも始める（1日に何回でも。押した回数だけ数える） */
export default function ExerciseShoulder({ date }: { date: string }) {
  const life = useLife();
  const roundId = shoulderRoundOf(date);
  const record = life.projection.exercise[roundId]?.value;
  const times = record?.details?.find((d) => d.id === "shoulder")?.reps ?? 0;
  const [version, setVersion] = useState<(typeof versions)[number]>(versions[0]);
  const steps = version === versions[0] ? SHOULDER_DESK : SHOULDER_FULL;
  const done = () => {
    const next = addShoulder(record, date, version === versions[0] ? "short" : "normal");
    return record ? life.resolveExercise(next) : life.completeExercise(next);
  };
  const undoOne = () => {
    if (!record) return;
    const others = (record.details ?? []).filter((d) => d.id !== "shoulder");
    if (times <= 1 && !others.length) life.undoExercise(roundId);
    else life.resolveExercise({ ...record, details: [...others, ...(times > 1 ? [{ id: "shoulder", reps: times - 1 }] : [])] });
  };
  return (
    <Card title="肩こりほぐし" right={times > 0 && <span className="text-sm text-muted">今日 {times}回</span>}>
      <div className={inset}>
        <p className="text-sm text-muted">50〜60分座ったら、立ち上がるか、これを1回。</p>
        <Segments label="ほぐす長さ" options={versions} selected={version} onChange={setVersion} />
        <ol className="flex flex-col divide-y divide-line">
          {steps.map((s, i) => (
            <li key={s.id}>
              <details>
                <summary className={summary + " gap-2"}>
                  <span className="w-5 text-sm text-muted tabular-nums">{i + 1}</span>
                  <span className="flex-1">{s.name}</span>
                  <span className="text-sm text-muted">{s.dose}</span>
                </summary>
                <ol className="list-decimal space-y-1 pb-2 pl-12 text-sm">
                  {s.how.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ol>
              </details>
            </li>
          ))}
        </ol>
        <p className="text-xs text-muted">痛みが増す・手がしびれる・頭痛が続くときは止めて、続くなら受診してください。</p>
        <div className={choices}>
          <button type="button" disabled={!life.ready} className={btnPrimary} onClick={done}>
            やった
          </button>
          {times > 0 && (
            <button type="button" className={choice(false)} onClick={undoOne}>
              1回取り消す
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

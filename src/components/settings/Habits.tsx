"use client";

import { useState } from "react";
import type { Habit } from "@/lib/scheduler";
import { useApp } from "@/components/app/StoreProvider";
import { AddRow, EmptyNote, Group, Row, Segmented, Switch, inputCls, inputBase } from "@/components/ui/controls";
import { formatMinutes, newId } from "@/lib/mock/jst";
import { formatMinuteOfDay, hhmmToMinutes, minutesToHHMM, spanFrom } from "@/lib/mock/model";
import EditSheet, { Field, upsert } from "./EditSheet";

interface Draft {
  name: string;
  duration: string;
  start: string;
  end: string;
  /** 時間帯の決め方：時刻で／起床から（分後）／就寝まで（分前）／きっかけのあと */
  anchor: "clock" | "wake" | "bed" | "cue";
  /** きっかけ："routine"・"home"・"habit:<習慣の ID>"（そのあと）・"before:<習慣の ID>"（その前） */
  cue: string;
  offStart: string;
  offEnd: string;
  freq: "daily" | "weekly" | "whenEnergy" | "interval" | "onTrackHoliday";
  times: string;
  minDays: string;
  maxDays: string;
  meal: boolean;
  track: boolean;
  /** 締切が迫ったときの扱い：飛ばさない／なるべく残す／飛ばしてよい */
  keep: "never" | "last" | "ok";
  avoidAfter: string;
  energy: string;
  hasFinish: boolean;
  finishTitle: string;
  finishDuration: string;
  finishAfter: string;
  parentId: string;
}

const num = (s: string) => (s.trim() === "" ? undefined : Number(s));
const valid = (n: number | undefined, min = 1): n is number => n !== undefined && Number.isFinite(n) && n >= min;

function HabitForm({ habit, onClose }: { habit?: Habit; onClose: () => void }) {
  const { state, update } = useApp();
  const [d, setD] = useState<Draft>(() => ({
    name: habit?.name ?? "",
    duration: String(habit?.durationMinutes ?? 30),
    start: minutesToHHMM(habit?.anchor || habit?.cue ? 9 * 60 : (habit?.windowStart ?? 9 * 60)),
    end: minutesToHHMM(habit?.anchor || habit?.cue ? 21 * 60 : (habit?.windowEnd ?? 21 * 60)),
    anchor: habit?.cue ? "cue" : (habit?.anchor ?? "clock"),
    cue: !habit?.cue
      ? "routine"
      : habit.cue.type === "habit"
        ? `habit:${habit.cue.habitId}`
        : habit.cue.type === "beforeHabit"
          ? `before:${habit.cue.habitId}`
          : habit.cue.type,
    // 就寝までは「何分前」で入力するので、符号を反転して、始まり＝より前（大きい分）にする
    offStart: String(habit?.anchor === "bed" ? -habit.windowStart : (habit?.windowStart ?? 0)),
    offEnd: String(habit?.anchor === "bed" ? -habit.windowEnd : (habit?.windowEnd ?? 120)),
    freq: habit?.frequency.type ?? "daily",
    times: String(habit?.frequency.type === "weekly" ? habit.frequency.times : 3),
    minDays: String(habit?.frequency.type === "interval" ? habit.frequency.minDays : 4),
    maxDays: String(habit?.frequency.type === "interval" ? habit.frequency.maxDays : 7),
    meal: habit?.meal ?? false,
    track: habit?.track ?? false,
    keep: habit && !habit.skippable ? "never" : habit?.keepLast ? "last" : "ok",
    avoidAfter: habit?.avoidFocusAfterMinutes === undefined ? "" : String(habit.avoidFocusAfterMinutes),
    energy: habit?.energyCost === undefined ? "" : String(habit.energyCost),
    hasFinish: !!habit?.finish,
    finishTitle: habit?.finish?.title ?? "",
    finishDuration: String(habit?.finish?.durationMinutes ?? 15),
    finishAfter: String(habit?.finish?.afterStartMinutes ?? 60),
    parentId: habit?.duringHabitId ?? "",
  }));
  const [error, setError] = useState("");
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  // 待ち時間の中に置ける親（2つ目の作業がある、自分以外の習慣）
  const parents = state.habits.filter((h) => h.finish && h.id !== habit?.id);
  const children = habit ? state.habits.filter((h) => h.duringHabitId === habit.id) : [];
  const during = !d.hasFinish && d.parentId !== "";
  const byCue = !during && d.anchor === "cue";
  // きっかけにできる習慣（食事）
  const cueHabits = state.habits.filter((h) => h.meal && h.id !== habit?.id);
  // 直前に置ける習慣（入浴など、就寝から決まるもの）
  const beforeHabits = state.habits.filter((h) => h.anchor === "bed" && !h.cue && h.id !== habit?.id);

  const save = () => {
    const name = d.name.trim();
    const duration = num(d.duration);
    if (!name) return setError("名前を入力してください");
    if (!valid(duration)) return setError("所要時間は1分以上で入力してください");
    const relative = !during && (d.anchor === "wake" || d.anchor === "bed");
    const s = relative ? num(d.offStart) : hhmmToMinutes(d.start);
    const e = relative ? num(d.offEnd) : hhmmToMinutes(d.end);
    if (!during && !byCue && (s === undefined || e === undefined || !Number.isFinite(s) || !Number.isFinite(e))) return setError("時間帯を入力してください");
    const span = during || byCue
      ? { start: 0, end: 24 * 60 }
      : d.anchor === "wake"
        ? { start: Math.round(s!), end: Math.round(e!) }
        : d.anchor === "bed"
          ? { start: -Math.round(s!), end: -Math.round(e!) }
          : spanFrom(s!, e!);
    if (relative && (Math.abs(span.start) > 24 * 60 || Math.abs(span.end) > 24 * 60)) return setError("時間帯は24時間以内で入力してください");
    if (!during && span.end - span.start < duration) return setError("時間帯が所要時間より短くなっています");

    const next: Habit = {
      id: habit?.id ?? newId("habit"),
      name,
      durationMinutes: Math.round(duration),
      windowStart: span.start,
      windowEnd: span.end,
      frequency: { type: "daily" },
      skippable: d.keep !== "never",
    };
    if (d.keep === "last") next.keepLast = true;
    if (relative) next.anchor = d.anchor as "wake" | "bed";
    if (byCue)
      next.cue = d.cue.startsWith("habit:")
        ? { type: "habit", habitId: d.cue.slice(6) }
        : d.cue.startsWith("before:")
          ? { type: "beforeHabit", habitId: d.cue.slice(7) }
          : { type: d.cue as "routine" | "home" };
    // 雨の日の代わりは、今はこの画面では変えない（散歩の初期値のまま残す）
    if (habit?.rainAlternative) next.rainAlternative = habit.rainAlternative;
    if (!during && d.freq === "weekly") {
      const times = num(d.times);
      if (!valid(times) || times > 7) return setError("週の回数は1〜7で入力してください");
      next.frequency = { type: "weekly", times: Math.round(times) };
    }
    if (!during && d.freq === "whenEnergy") next.frequency = { type: "whenEnergy" };
    if (!during && d.freq === "onTrackHoliday") next.frequency = { type: "onTrackHoliday" };
    if (!during && d.freq === "interval") {
      const lo = num(d.minDays);
      const hi = num(d.maxDays);
      if (!valid(lo) || !valid(hi) || hi > 60 || lo > hi) return setError("間隔は「最短 ≦ 最長」で、1〜60日の範囲で入力してください");
      next.frequency = { type: "interval", minDays: Math.round(lo), maxDays: Math.round(hi) };
    }
    if (d.meal) next.meal = true;
    if (d.track) next.track = true;
    // 少しずつ増やす設定は、今はこの画面では変えない
    if (habit?.progression) next.progression = habit.progression;
    const energy = num(d.energy);
    if (energy !== undefined) {
      if (!Number.isFinite(energy) || Math.abs(energy) > 10) return setError("行動ポイントは -10〜10 で入力してください");
      if (energy !== 0) next.energyCost = Math.round(energy * 10) / 10;
    }
    const avoidAfter = num(d.avoidAfter);
    if (avoidAfter !== undefined) {
      if (!valid(avoidAfter, 0)) return setError("休憩の時間は0以上で入力してください");
      if (avoidAfter > 0) next.avoidFocusAfterMinutes = Math.round(avoidAfter);
    }
    if (d.hasFinish) {
      const fd = num(d.finishDuration);
      const fa = num(d.finishAfter);
      if (!d.finishTitle.trim()) return setError("2つ目の作業の名前を入力してください");
      if (!valid(fd) || !valid(fa)) return setError("2つ目の作業の時間を入力してください");
      if (fa < duration) return setError("2つ目の作業は、1つ目が終わってから始まるようにしてください");
      next.finish = { title: d.finishTitle.trim(), durationMinutes: Math.round(fd), afterStartMinutes: Math.round(fa) };
    } else if (d.parentId) {
      next.duringHabitId = d.parentId;
    }
    update((data) => ({
      ...data,
      // 2つ目の作業をやめたら、待ち時間に入れていた習慣は親から外す
      habits: upsert(data.habits, next).map((h) =>
        !next.finish && h.duringHabitId === next.id ? { ...h, duringHabitId: undefined } : h,
      ),
    }));
    onClose();
  };

  const remove = () => {
    update((data) => ({
      ...data,
      habits: data.habits
        .filter((h) => h.id !== habit?.id)
        .map((h) => (h.duringHabitId === habit?.id ? { ...h, duringHabitId: undefined } : h)),
    }));
    onClose();
  };

  return (
    <EditSheet
      title={habit ? "習慣を編集" : "習慣を追加"}
      isNew={!habit}
      error={error}
      onSave={save}
      onDelete={remove}
      deleteConfirm={
        children.length > 0
          ? `「${habit?.name}」を削除しますか？待ち時間に入れていた「${children.map((c) => c.name).join("、")}」は、ふつうの習慣になります。`
          : `「${habit?.name}」を削除しますか？`
      }
      onClose={onClose}
    >
      <Field label="名前">
        <input className={inputCls} value={d.name} autoFocus={!habit} onChange={(e) => set("name", e.target.value)} placeholder="例：散歩" />
      </Field>
      <Field label="所要時間（分）">
        <input className={`${inputBase} w-28`} type="number" inputMode="numeric" min={5} step={5} value={d.duration} onChange={(e) => set("duration", e.target.value)} />
      </Field>

      {!d.hasFinish && parents.length > 0 && (
        <Field label="ほかの習慣の待ち時間に行う">
          <select className={inputCls} value={d.parentId} onChange={(e) => set("parentId", e.target.value)} aria-label="待ち時間に行う習慣">
            <option value="">しない</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                「{p.name}」の待ち時間
              </option>
            ))}
          </select>
        </Field>
      )}

      {!during && (
        <>
          <Field
            label="時間帯"
          >
            <Segmented
              label="時間帯の決め方"
              full
              value={d.anchor}
              onChange={(v) => set("anchor", v)}
              options={[
                { value: "clock", label: "時刻で" },
                { value: "wake", label: "起床から" },
                { value: "bed", label: "就寝まで" },
                { value: "cue", label: "きっかけ" },
              ]}
            />
            {d.anchor === "cue" ? (
              <select className={`${inputCls} mt-2`} aria-label="きっかけ" value={d.cue} onChange={(e) => set("cue", e.target.value)}>
                <option value="routine">朝ルーティンのあと</option>
                {cueHabits.map((h) => (
                  <option key={h.id} value={`habit:${h.id}`}>
                    {h.name}のあと
                  </option>
                ))}
                <option value="home">帰宅後</option>
                {beforeHabits.map((h) => (
                  <option key={h.id} value={`before:${h.id}`}>
                    {h.name}の前
                  </option>
                ))}
              </select>
            ) : d.anchor === "clock" ? (
              <div className="mt-2 flex items-center gap-2">
                <input className={inputCls} type="time" step={300} aria-label="時間帯の始まり" value={d.start} onChange={(e) => set("start", e.target.value)} />
                <span className="text-muted">〜</span>
                <input className={inputCls} type="time" step={300} aria-label="時間帯の終わり" value={d.end} onChange={(e) => set("end", e.target.value)} />
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-2 text-[15px]">
                <span className="shrink-0 text-muted">{d.anchor === "wake" ? "起床の" : "就寝の"}</span>
                <input className={inputCls} inputMode="numeric" aria-label="時間帯の始まり（分）" value={d.offStart} onChange={(e) => set("offStart", e.target.value)} />
                <span className="shrink-0 text-muted">〜</span>
                <input className={inputCls} inputMode="numeric" aria-label="時間帯の終わり（分）" value={d.offEnd} onChange={(e) => set("offEnd", e.target.value)} />
                <span className="shrink-0 text-muted">{d.anchor === "wake" ? "分後" : "分前"}</span>
              </div>
            )}
          </Field>
          <Field label="頻度">
            <Segmented
              label="頻度"
              full
              value={d.freq}
              onChange={(v) => set("freq", v)}
              options={[
                { value: "daily", label: "毎日" },
                { value: "weekly", label: "週に何回か" },
                { value: "whenEnergy", label: "余裕がある日" },
                { value: "onTrackHoliday", label: "順調な休日" },
                { value: "interval", label: "間隔" },
              ]}
            />
            {d.freq === "interval" && (
              <label className="flex items-center gap-2 text-[15px]">
                前回から
                <input className={`${inputBase} w-16`} type="number" inputMode="numeric" min={1} max={60} value={d.minDays} onChange={(e) => set("minDays", e.target.value)} />
                〜
                <input className={`${inputBase} w-16`} type="number" inputMode="numeric" min={1} max={60} value={d.maxDays} onChange={(e) => set("maxDays", e.target.value)} />
                日
              </label>
            )}
            {d.freq === "interval" && (
              <p className="text-[12px] text-muted">この間に休日があれば休日に、なければ間隔の終わりごろの軽い日に入れます。外出の日は避けます。</p>
            )}
            {d.freq === "weekly" && (
              <label className="flex items-center gap-2 text-[15px]">
                週
                <input className={`${inputBase} w-20`} type="number" inputMode="numeric" min={1} max={7} value={d.times} onChange={(e) => set("times", e.target.value)} />
                回
              </label>
            )}
          </Field>
        </>
      )}

      <Field label="締切が迫ったとき">
        <Segmented
          label="締切が迫ったとき"
          full
          value={d.keep}
          onChange={(v) => set("keep", v)}
          options={[
            { value: "never", label: "飛ばさない" },
            { value: "last", label: "なるべく残す" },
            { value: "ok", label: "飛ばしてよい" },
          ]}
        />
      </Field>

      <label className="flex items-center justify-between gap-3">
        <span className="block text-[16px]">記録する</span>
        <Switch label="記録する" checked={d.track} onChange={(v) => set("track", v)} />
      </label>

      {!during && (
        <label className="flex items-center justify-between gap-3">
          <span>
            <span className="block text-[16px]">食事</span>
            <span className="block text-[12px] text-muted">外出の日に外にいる時間と重なるときは「外食・お弁当」として置きます</span>
          </span>
          <Switch label="食事" checked={d.meal} onChange={(v) => set("meal", v)} />
        </label>
      )}

      <Field
        label="行動ポイント（任意）"
      >
        <input className={`${inputBase} w-28`} type="number" inputMode="decimal" step={0.5} placeholder="0" value={d.energy} onChange={(e) => set("energy", e.target.value)} />
      </Field>

      <Field label="このあとの休憩（分・任意）">
        <input className={`${inputBase} w-28`} type="number" inputMode="numeric" min={0} step={5} placeholder="なし" value={d.avoidAfter} onChange={(e) => set("avoidAfter", e.target.value)} />
      </Field>

      {!during && (
        <div className="flex flex-col gap-3 rounded-xl bg-surface2 px-3 py-3">
          <label className="flex items-center justify-between gap-3">
            <span>
              <span className="block text-[16px]">待ち時間のあとに2つ目の作業</span>
              <span className="block text-[12px] text-muted">洗濯を回す → 待つ → 干す のような習慣。待つ間は家にいる必要があります</span>
            </span>
            <Switch label="2つ目の作業" checked={d.hasFinish} onChange={(v) => set("hasFinish", v)} />
          </label>
          {d.hasFinish && (
            <>
              <Field label="2つ目の作業">
                <input className={inputCls} value={d.finishTitle} onChange={(e) => set("finishTitle", e.target.value)} placeholder="例：洗濯物を干す" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="所要時間（分）">
                  <input className={inputCls} type="number" inputMode="numeric" min={5} step={5} value={d.finishDuration} onChange={(e) => set("finishDuration", e.target.value)} />
                </Field>
                <Field label="始めてから何分後">
                  <input className={inputCls} type="number" inputMode="numeric" min={5} step={5} value={d.finishAfter} onChange={(e) => set("finishAfter", e.target.value)} />
                </Field>
              </div>
              {children.length > 0 && (
                <p className="text-[12px] text-muted">待ち時間に「{children.map((c) => c.name).join("、")}」を行います</p>
              )}
            </>
          )}
        </div>
      )}
    </EditSheet>
  );
}

function summary(h: Habit, habits: Habit[]): string {
  const parent = h.duringHabitId ? habits.find((p) => p.id === h.duringHabitId) : undefined;
  if (parent) return `「${parent.name}」の待ち時間に・${formatMinutes(h.durationMinutes)}`;
  const freq =
    h.frequency.type === "daily"
      ? "毎日"
      : h.frequency.type === "weekly"
        ? `週${h.frequency.times}回`
        : h.frequency.type === "interval"
          ? `${h.frequency.minDays}〜${h.frequency.maxDays}日ごと`
          : h.frequency.type === "onTrackHoliday"
            ? "順調な休日"
            : "余裕がある日";
  const cue = h.cue;
  const cueParent = cue && "habitId" in cue ? habits.find((p) => p.id === cue.habitId) : undefined;
  const when = cue
    ? cue.type === "routine"
      ? "朝ルーティンのあと"
      : cue.type === "home"
        ? "帰宅後"
        : cue.type === "beforeHabit"
          ? `${cueParent?.name ?? "入浴"}の前`
          : `${cueParent?.name ?? "食事"}のあと`
    : h.anchor === "wake"
      ? `起床の${h.windowStart}〜${h.windowEnd}分後`
      : h.anchor === "bed"
        ? `就寝の${-h.windowStart}〜${-h.windowEnd}分前`
        : `${formatMinuteOfDay(h.windowStart)}〜${formatMinuteOfDay(h.windowEnd)}`;
  const parts = [freq, when, formatMinutes(h.durationMinutes)];
  if (h.finish) parts.push(`${h.finish.afterStartMinutes}分後に${h.finish.title}`);
  if (h.track) parts.push("記録する");
  if (!h.skippable) parts.push("飛ばさない");
  else if (h.keepLast) parts.push("なるべく残す");
  return parts.join("・");
}

export default function Habits() {
  const { state } = useApp();
  const [editing, setEditing] = useState<{ habit?: Habit } | null>(null);
  return (
    <>
      <Group>
        {state.habits.length === 0 && <EmptyNote>習慣はまだありません。</EmptyNote>}
        {state.habits.map((h) => (
          <Row
            key={h.id}
            leading={<span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: "var(--cal-habit)" }} />}
            label={h.name}
            sub={summary(h, state.habits)}
            onClick={() => setEditing({ habit: h })}
          />
        ))}
        <AddRow onClick={() => setEditing({})}>習慣を追加</AddRow>
      </Group>
      {editing && <HabitForm key={editing.habit?.id ?? "new"} habit={editing.habit} onClose={() => setEditing(null)} />}
    </>
  );
}

"use client";

import { useApp } from "@/components/app/StoreProvider";
import { Group, NumberInput, Row } from "@/components/ui/controls";
import type { RewardRates } from "@/lib/mock/model";

const ROWS: { k: keyof RewardRates; label: string }[] = [
  { k: "wake", label: "起床" },
  { k: "routine", label: "朝ルーティン" },
  { k: "habit", label: "習慣" },
  { k: "task", label: "タスク" },
  { k: "bed", label: "就寝" },
  { k: "smoke", label: "寝る前のタバコ" },
  { k: "log", label: "記録" },
];

/** ご褒美の金額（1回あたり） */
export default function Rewards() {
  const { state, update } = useApp();
  const set = (k: keyof RewardRates) => (v: number | undefined) => update((d) => ({ ...d, rewardRates: { ...d.rewardRates, [k]: v ?? 0 } }));
  return (
    <Group title="1回あたり">
      {ROWS.map((r) => (
        <Row key={r.k} label={r.label}>
          <NumberInput label={`${r.label}の金額`} value={state.rewardRates[r.k]} onCommit={set(r.k)} step={10} max={10000} />
          <span className="text-[15px] text-muted">円</span>
        </Row>
      ))}
    </Group>
  );
}

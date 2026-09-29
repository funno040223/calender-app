"use client";

import type { Tag } from "@/lib/scheduler";
import { useApp } from "@/components/app/StoreProvider";
import { Group, NumberInput, Row } from "@/components/ui/controls";

/** 作業の種類（集中・事務）ごとの、目安の時間・1回の長さ・終わったあとの休憩 */
export default function Tags() {
  const { state, update } = useApp();
  const set = (id: string, patch: Partial<Tag>) =>
    update((d) => ({ ...d, tags: d.tags.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  return (
    <>
      {state.tags.map((t) => {
        const rows: { label: string; value: number; commit: (v: number) => void; max: number }[] = [
          { label: "所要時間の目安", value: t.defaultMinutes, commit: (v) => set(t.id, { defaultMinutes: v }), max: 600 },
          { label: "1回の最短", value: t.minChunkMinutes, commit: (v) => set(t.id, { minChunkMinutes: Math.min(v, t.maxChunkMinutes) }), max: 480 },
          { label: "1回の最長", value: t.maxChunkMinutes, commit: (v) => set(t.id, { maxChunkMinutes: Math.max(v, t.minChunkMinutes) }), max: 480 },
          { label: "終わったあとの休憩", value: t.restAfterMinutes ?? state.settings.breakMinutes, commit: (v) => set(t.id, { restAfterMinutes: v }), max: 120 },
        ];
        return (
          <Group key={t.id} title={t.name}>
            {rows.map((r) => (
              <Row key={r.label} label={r.label}>
                <NumberInput label={`${t.name}の${r.label}`} value={r.value} onCommit={(v) => v !== undefined && r.commit(v)} min={r.label.startsWith("終わった") ? 0 : 5} max={r.max} />
                <span className="text-[15px] text-muted">分</span>
              </Row>
            ))}
          </Group>
        );
      })}
    </>
  );
}

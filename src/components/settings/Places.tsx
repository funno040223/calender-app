"use client";

import { useState } from "react";
import type { Place } from "@/lib/scheduler";
import { useApp } from "@/components/app/StoreProvider";
import { AddRow, EmptyNote, Group, Row, inputCls, inputBase } from "@/components/ui/controls";
import { formatMinutes, newId } from "@/lib/mock/jst";
import EditSheet, { Field, upsert } from "./EditSheet";

const splitKeywords = (s: string) =>
  s
    .split(/[,、，\s]+/)
    .map((k) => k.trim())
    .filter(Boolean);

function PlaceForm({ place, onClose }: { place?: Place; onClose: () => void }) {
  const { update } = useApp();
  const [name, setName] = useState(place?.name ?? "");
  const [keywords, setKeywords] = useState(place?.keywords.join("、") ?? "");
  const [minutes, setMinutes] = useState(String(place?.travelMinutes ?? 30));
  const [error, setError] = useState("");

  const save = () => {
    const n = Number(minutes);
    if (!name.trim()) return setError("名前を入力してください");
    if (!minutes.trim() || !Number.isFinite(n) || n < 0) return setError("移動時間は0以上で入力してください");
    const next: Place = { id: place?.id ?? newId("place"), name: name.trim(), keywords: splitKeywords(keywords), travelMinutes: Math.round(n) };
    update((d) => ({ ...d, places: upsert(d.places, next) }));
    onClose();
  };

  return (
    <EditSheet
      title={place ? "場所を編集" : "場所を追加"}
      isNew={!place}
      error={error}
      onSave={save}
      onDelete={() => {
        update((d) => ({ ...d, places: d.places.filter((p) => p.id !== place?.id) }));
        onClose();
      }}
      deleteConfirm={`「${place?.name}」を削除しますか？`}
      onClose={onClose}
    >
      <Field label="名前">
        <input className={inputCls} value={name} autoFocus={!place} onChange={(e) => setName(e.target.value)} placeholder="例：大学" />
      </Field>
      <Field label="キーワード">
        <input className={inputCls} value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="例：大学、キャンパス" />
      </Field>
      <Field label="片道の移動時間（分）">
        <input className={`${inputBase} w-28`} type="number" inputMode="numeric" min={0} step={5} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
      </Field>
    </EditSheet>
  );
}

export default function Places() {
  const { state } = useApp();
  const [editing, setEditing] = useState<{ place?: Place } | null>(null);
  return (
    <>
      <Group>
        {state.places.length === 0 && <EmptyNote>場所はまだありません。</EmptyNote>}
        {state.places.map((p) => (
          <Row
            key={p.id}
            label={p.name}
            sub={p.keywords.length ? `キーワード：${p.keywords.join("、")}` : undefined}
            detail={p.travelMinutes === 0 ? "移動なし" : `片道${formatMinutes(p.travelMinutes)}`}
            onClick={() => setEditing({ place: p })}
          />
        ))}
        <AddRow onClick={() => setEditing({})}>場所を追加</AddRow>
      </Group>
      {editing && <PlaceForm key={editing.place?.id ?? "new"} place={editing.place} onClose={() => setEditing(null)} />}
    </>
  );
}

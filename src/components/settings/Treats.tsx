"use client";

import { useState } from "react";
import { useApp } from "@/components/app/StoreProvider";
import { AddRow, EmptyNote, Group, Row, Segmented, Switch, inputCls } from "@/components/ui/controls";
import { newId } from "@/lib/mock/jst";
import { TREAT_CATEGORIES, type Treat, type TreatCategory } from "@/lib/mock/model";
import EditSheet, { Field, upsert } from "./EditSheet";

function TreatForm({ treat, category, onClose }: { treat?: Treat; category: TreatCategory; onClose: () => void }) {
  const { patch } = useApp();
  const [name, setName] = useState(treat?.name ?? "");
  const [cat, setCat] = useState<TreatCategory>(treat?.category ?? category);
  const [condition, setCondition] = useState(treat?.condition ?? "");
  const [holidayOnly, setHolidayOnly] = useState(!!treat?.holidayOnly);
  const [outdoor, setOutdoor] = useState(!!treat?.outdoor);
  const [error, setError] = useState("");

  const save = () => {
    if (!name.trim()) return setError("内容を入力してください");
    const next: Treat = {
      id: treat?.id ?? newId("treat"),
      name: name.trim(),
      category: cat,
      ...(cat === "reward" && condition.trim() ? { condition: condition.trim() } : {}),
      ...(holidayOnly ? { holidayOnly: true } : {}),
      ...(outdoor ? { outdoor: true } : {}),
    };
    patch((d) => ({ treats: upsert(d.treats, next) }));
    onClose();
  };

  return (
    <EditSheet
      title={treat ? "楽しみを編集" : "楽しみを追加"}
      isNew={!treat}
      error={error}
      onSave={save}
      onDelete={() => {
        patch((d) => ({ treats: d.treats.filter((t) => t.id !== treat?.id) }));
        onClose();
      }}
      deleteConfirm={`「${treat?.name}」を削除しますか？`}
      onClose={onClose}
    >
      <Field label="内容">
        <input className={inputCls} value={name} autoFocus={!treat} onChange={(e) => setName(e.target.value)} placeholder="例：お気に入りのカフェラテ" />
      </Field>
      <Field label="種類">
        <Segmented label="種類" full columns={2} value={cat} onChange={setCat} options={TREAT_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))} />
      </Field>
      {cat === "reward" && (
        <Field label="条件（任意）">
          <input className={inputCls} value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="例：朝ルーティンが終わったら" />
        </Field>
      )}
      <div className="flex flex-col gap-3">
        <label className="flex items-center justify-between gap-3 text-[15px]">
          休日だけ
          <Switch label="休日だけ" checked={holidayOnly} onChange={setHolidayOnly} />
        </label>
        <label className="flex items-center justify-between gap-3 text-[15px]">
          外で楽しむ（雨の日は出さない）
          <Switch label="外で楽しむ" checked={outdoor} onChange={setOutdoor} />
        </label>
      </div>
    </EditSheet>
  );
}

export default function Treats() {
  const { state } = useApp();
  const [editing, setEditing] = useState<{ treat?: Treat; category: TreatCategory } | null>(null);
  return (
    <>
      <p className="px-4 text-[13px] leading-relaxed text-muted">
        毎日1つを選び、朝は「起きた」を押すと開きます。「休日だけ」は予定のない日に、「外で」は雨でない日に出します。
      </p>
      {TREAT_CATEGORIES.map((c) => {
        const list = state.treats.filter((t) => t.category === c.id);
        return (
          <Group key={c.id} title={c.label}>
            {list.length === 0 && <EmptyNote>まだありません。</EmptyNote>}
            {list.map((t) => (
              <Row
                key={t.id}
                label={t.name}
                sub={[t.condition, t.holidayOnly && "休日だけ", t.outdoor && "外で"].filter(Boolean).join("・") || undefined}
                onClick={() => setEditing({ treat: t, category: c.id })}
              />
            ))}
            <AddRow onClick={() => setEditing({ category: c.id })}>追加</AddRow>
          </Group>
        );
      })}
      {editing && <TreatForm key={editing.treat?.id ?? `new-${editing.category}`} treat={editing.treat} category={editing.category} onClose={() => setEditing(null)} />}
    </>
  );
}

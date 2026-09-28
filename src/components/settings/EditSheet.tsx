"use client";

import type { FormEvent, ReactNode } from "react";
import Sheet from "@/components/ui/Sheet";
import { DangerButton, PrimaryButton } from "@/components/ui/controls";

/** 設定の1項目を編集するシート。保存するまでは元のデータを変えない */
export default function EditSheet({
  title,
  isNew,
  error,
  onSave,
  onDelete,
  deleteConfirm,
  onClose,
  children,
}: {
  title: string;
  isNew: boolean;
  error?: string;
  onSave: () => void;
  onDelete?: () => void;
  deleteConfirm?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave();
  };
  return (
    <Sheet title={title} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {children}
        {error && <p className="text-[14px] text-accent">{error}</p>}
        <PrimaryButton>{isNew ? "追加" : "保存"}</PrimaryButton>
        {!isNew && onDelete && (
          <DangerButton confirm={deleteConfirm} onClick={onDelete}>
            削除
          </DangerButton>
        )}
      </form>
    </Sheet>
  );
}

/** 見出しつきの入力欄 */
export function Field({ label, help, children }: { label: string; help?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-muted">{label}</span>
      {children}
      {help && <p className="text-[12px] leading-snug text-muted">{help}</p>}
    </div>
  );
}

/** 同じ配列の中で、id が一致するものを置き換える（なければ末尾に足す） */
export function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
}

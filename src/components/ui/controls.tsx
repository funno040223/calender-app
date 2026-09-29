"use client";

import { useState, type ReactNode } from "react";
import { hhmmToMinutes, minutesToHHMM } from "@/lib/mock/model";

/** 幅を決めない入力欄（w-20 などと組み合わせる） */
export const inputBase = "min-w-0 rounded-lg border border-line bg-surface2 px-3 py-2 text-[16px] outline-none focus:border-accent";
export const inputCls = `w-full ${inputBase}`;

/** 画面の大きな見出し（iOS のラージタイトル） */
export function ScreenHeader({
  title,
  sub,
  right,
  width = "max-w-2xl",
}: {
  title: string;
  sub?: ReactNode;
  right?: ReactNode;
  /** 本文と同じ最大幅にそろえる */
  width?: string;
}) {
  return (
    <header className={`mx-auto flex w-full items-end gap-2 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2 sm:px-6 sm:pt-5 ${width}`}>
      <div className="min-w-0 flex-1">
        {sub && <p className="text-[13px] font-medium text-muted">{sub}</p>}
        <h1 className="truncate text-[28px] font-bold leading-tight tracking-tight">{title}</h1>
      </div>
      {right}
    </header>
  );
}

/** 設定アプリのようなグループ。中身は Row を並べる */
export function Group({ title, footer, children }: { title?: ReactNode; footer?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      {title && <h2 className="px-4 text-[13px] font-medium text-muted">{title}</h2>}
      <div className="overflow-hidden rounded-xl bg-surface">
        <div className="flex flex-col divide-y divide-line">{children}</div>
      </div>
      {footer && <p className="px-4 text-[12px] leading-relaxed text-muted">{footer}</p>}
    </section>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 8 14" width="8" height="14" aria-hidden className="shrink-0 text-muted/70">
      <path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 1行の項目。onClick があれば押せる行（右に ›） */
export function Row({
  label,
  detail,
  sub,
  onClick,
  children,
  leading,
}: {
  label: ReactNode;
  detail?: ReactNode;
  sub?: ReactNode;
  onClick?: () => void;
  children?: ReactNode;
  leading?: ReactNode;
}) {
  const body = (
    <>
      {leading}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[16px]">{label}</div>
        {sub && <div className="truncate text-[13px] text-muted">{sub}</div>}
      </div>
      {detail !== undefined && <div className="shrink-0 text-right text-[15px] text-muted">{detail}</div>}
      {children}
      {onClick && <Chevron />}
    </>
  );
  const cls = "flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left";
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} active:bg-surface2`}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** 行の中で右側に入力欄を置く */
export function FieldRow({ label, help, children }: { label: ReactNode; help?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-2.5">
      <div className="flex min-h-7 items-center justify-between gap-3">
        <span className="min-w-0 text-[16px]">{label}</span>
        <div className="flex shrink-0 items-center gap-1.5">{children}</div>
      </div>
      {help && <p className="text-[12px] leading-snug text-muted">{help}</p>}
    </div>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
  full,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  label: string;
  full?: boolean;
}) {
  return (
    // 5つ以上は1行に入りきらず文字が切れるので、3列で折り返す
    <div
      className={`${options.length > 4 ? "grid grid-cols-3 gap-0.5" : "flex"} rounded-lg bg-surface2 p-0.5 ${full ? "w-full" : ""}`}
      role="radiogroup"
      aria-label={label}
    >
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-w-0 flex-1 truncate rounded-md px-2.5 py-1 text-[14px] ${
            value === o.value ? "bg-surface font-medium text-fg shadow-sm" : "text-muted"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <input
      type="checkbox"
      className="ios-switch"
      checked={checked}
      aria-label={label}
      onChange={(e) => onChange(e.target.checked)}
    />
  );
}

/** トグルできる小さなボタン（曜日・タグなど） */
export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`shrink-0 rounded-full border px-3 py-1 text-[13px] transition-colors ${
        on ? "border-accent bg-accent text-white" : "border-line bg-surface text-fg"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * 数を入力して、欄を離れたとき（または Enter）に確定する。
 * 空欄を許すときは undefined を返す。
 */
export function NumberInput({
  value,
  onCommit,
  min = 0,
  max,
  step = 5,
  allowEmpty,
  placeholder,
  label,
  width = "w-20",
}: {
  value: number | undefined;
  onCommit: (v: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  allowEmpty?: boolean;
  placeholder?: string;
  label: string;
  width?: string;
}) {
  const shown = value === undefined ? "" : String(value);
  const [text, setText] = useState(shown);
  const [synced, setSynced] = useState(shown);
  // 外から値が変わったら（サンプルに戻したときなど）表示も合わせる
  if (synced !== shown) {
    setSynced(shown);
    setText(shown);
  }
  const commit = () => {
    const t = text.trim();
    if (t === "") {
      if (allowEmpty) onCommit(undefined);
      else setText(shown);
      return;
    }
    const n = Number(t);
    if (!Number.isFinite(n)) return setText(shown);
    const clamped = Math.min(max ?? Infinity, Math.max(min, Math.round(n)));
    setText(String(clamped));
    if (clamped !== value) onCommit(clamped);
  };
  return (
    <input
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      step={step}
      value={text}
      placeholder={placeholder}
      aria-label={label}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className={`${width} rounded-lg border border-line bg-surface2 px-2 py-1 text-right text-[16px] outline-none focus:border-accent`}
    />
  );
}

/** 0時からの分を HH:MM で入力する */
export function TimeInput({
  value,
  onCommit,
  label,
}: {
  value: number;
  onCommit: (v: number) => void;
  label: string;
}) {
  const shown = minutesToHHMM(value);
  const [text, setText] = useState(shown);
  const [synced, setSynced] = useState(shown);
  if (synced !== shown) {
    setSynced(shown);
    setText(shown);
  }
  const commit = () => {
    const m = hhmmToMinutes(text);
    if (m === undefined) return setText(shown);
    if (m !== ((value % 1440) + 1440) % 1440) onCommit(m);
  };
  return (
    <input
      type="time"
      step={300}
      value={text}
      aria-label={label}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      className="rounded-lg border border-line bg-surface2 px-2 py-1 text-[16px] tabular-nums outline-none focus:border-accent"
    />
  );
}

/** 押すと確認してから実行する、赤い文字のボタン */
export function DangerButton({ children, onClick, confirm }: { children: ReactNode; onClick: () => void; confirm?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (!confirm || window.confirm(confirm)) onClick();
      }}
      className="w-full rounded-xl py-2.5 text-[16px] text-accent active:bg-surface2"
    >
      {children}
    </button>
  );
}

export function PrimaryButton({
  children,
  type = "submit",
  onClick,
  disabled,
}: {
  children: ReactNode;
  type?: "submit" | "button";
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-xl bg-accent py-2.5 text-[16px] font-semibold text-white disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="px-4 py-3 text-[14px] text-muted">{children}</p>;
}

/** 下に並ぶ、項目を足すボタン（iOS の「＋ 追加」行） */
export function AddRow({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-11 w-full items-center gap-2 px-4 text-left text-[16px] text-accent active:bg-surface2">
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
        <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {children}
    </button>
  );
}

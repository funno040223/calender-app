"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { SettingsIcon } from "@/components/app/icons";
import { ScreenHeader } from "@/components/ui/controls";

export const content = "mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pt-1 pb-8 sm:px-6";
export const inset = "flex flex-col gap-3 px-4 pt-2 pb-4";
export const choices = "flex flex-wrap items-center gap-2";
export const summary = "press flex min-h-11 cursor-pointer items-center text-[15px]";
export const field = "flex min-w-0 flex-col gap-1 text-sm";
export const choice = (on: boolean) =>
  `press inline-flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-sm font-medium ${on ? "bg-tint text-on-tint" : "bg-surface2 text-fg"}`;

export function SettingsLink() {
  return (
    <Link
      href="/settings"
      onClick={() =>
        sessionStorage.setItem("settings-origin", location.pathname + location.search + location.hash)
      }
      aria-label="設定"
      className="press inline-flex size-11 shrink-0 items-center justify-center rounded-full text-tint"
    >
      <SettingsIcon />
    </Link>
  );
}

export function LifeScreen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="h-full overflow-y-auto bg-grouped">
      <ScreenHeader title={title} right={<SettingsLink />} />
      <div className={content}>{children}</div>
    </div>
  );
}

export function Segments<T extends string>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: readonly T[];
  selected: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1 rounded-xl bg-surface2 p-1">
      {options.map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={item === selected}
          className={`press min-h-11 flex-1 rounded-lg px-2 py-1 text-sm ${item === selected ? "bg-tint font-semibold text-on-tint" : "text-muted"}`}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

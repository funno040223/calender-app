"use client";

import { createContext, useContext } from "react";
import type { MockStore } from "@/lib/mock/store";

export interface AppContextValue extends MockStore {
  /** タスクの編集シートを開く（id なしで新規） */
  openTask: (id?: string) => void;
  /** 画面の下に短いお知らせを出す（数秒で消える。直前の操作を元に戻せる）。taskId・habitId を渡すと、次に入った時刻も出す */
  notify: (text: string, opts?: { taskId?: string; habitId?: string }) => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const v = useContext(AppContext);
  if (!v) throw new Error("useApp は AppShell の中で使う");
  return v;
}

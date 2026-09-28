"use client";

import { createContext, useContext } from "react";
import type { MockStore } from "@/lib/mock/store";

export interface AppContextValue extends MockStore {
  /** タスクの編集シートを開く（id なしで新規） */
  openTask: (id?: string) => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const v = useContext(AppContext);
  if (!v) throw new Error("useApp は AppShell の中で使う");
  return v;
}

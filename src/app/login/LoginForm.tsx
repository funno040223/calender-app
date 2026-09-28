"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** 自分専用のアプリなので、ログインだけ。アカウントは Supabase のダッシュボードで作る */
export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(
        error.message.includes("Invalid login credentials")
          ? "メールアドレスかパスワードが違います。"
          : "ログインできませんでした。時間をおいてもう一度試してください。",
      );
      return;
    }
    // 外部のサイトへは戻さない（同じアプリの中の場所だけ）
    const next = params.get("next");
    router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-surface p-6 shadow-sm">
      <h1 className="text-center text-[22px] font-semibold">リズム カレンダー</h1>
      <label className="flex flex-col gap-1.5 text-[14px]">
        <span className="text-muted">メールアドレス</span>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl bg-surface2 px-3 py-2.5 text-[16px] outline-none focus:ring-2 focus:ring-accent/40"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-[14px]">
        <span className="text-muted">パスワード</span>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-xl bg-surface2 px-3 py-2.5 text-[16px] outline-none focus:ring-2 focus:ring-accent/40"
        />
      </label>
      {error && (
        <p role="alert" className="text-[13px] text-accent">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="rounded-xl bg-accent py-2.5 text-[16px] font-medium text-white disabled:opacity-60"
      >
        {busy ? "ログイン中…" : "ログイン"}
      </button>
    </form>
  );
}

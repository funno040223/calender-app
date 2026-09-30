"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { appPath } from "@/lib/appPath";

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
      setError(loginErrorMessage(error));
      return;
    }
    // 外部のサイトへは戻さない（同じアプリの中の場所だけ）
    router.replace(appPath(params.get("next")));
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

/** 何が起きたかがわかるように、よくある理由ごとに言い分ける */
function loginErrorMessage(error: { message: string; status?: number; code?: string }): string {
  if (error.code === "invalid_credentials" || error.message.includes("Invalid login credentials")) {
    return "メールアドレスかパスワードが違います。";
  }
  if (error.status === 429 || error.code === "over_request_rate_limit") {
    return "短い時間に何度も試したため、一時的に止められています。数分待ってから試してください。";
  }
  if (!error.status || error.message.includes("fetch")) {
    return "Supabase につながりませんでした。電波や、コンテンツブロッカー・VPN などの設定を確かめてください。";
  }
  return `ログインできませんでした（${error.code ?? error.status}）。時間をおいてもう一度試してください。`;
}

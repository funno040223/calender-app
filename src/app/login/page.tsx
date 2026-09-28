import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "ログイン | リズム カレンダー" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-grouped px-4">
      {/* ログイン後の戻り先（?next=）を読むため、Suspense で包む */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * すべてのページの前に動き、ログインを確かめる。
 * - ログインの有効期限が近ければ、ここで自動で延長する（端末ごとに最初の1回だけログインすればよい）
 * - ログインしていなければ、ページはログイン画面へ、API は 401 を返す
 */
export async function proxy(request: NextRequest) {
  // 定期実行からの呼び出しはログインしていない。中で CRON_SECRET を確かめる
  if (request.nextUrl.pathname === "/api/push/dispatch" || request.nextUrl.pathname === "/api/push/replan") {
    return NextResponse.next();
  }
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          for (const { name, value } of list) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of list) response.cookies.set(name, value, options);
        },
      },
    },
  );

  // getUser は Supabase に問い合わせて本物のログインかを確かめる（cookie を書き換えられても通さない）
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  if (!user && pathname !== "/login") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "ログインしてください。" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return response;
}

export const config = {
  // 画像やビルド済みのファイルには動かさない
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};

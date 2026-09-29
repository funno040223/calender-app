-- 取り込む Notion の表（選考の締切など）。ユーザーごとに1行。
-- 連携の合言葉（トークン）は秘密情報なので、アプリのデータ（app_state）とは別の表に置き、本人しか触れないようにする。
-- 画面からは登録・削除と「登録してあるか」だけを使い、合言葉はサーバー側の取り込み処理だけが読む。

create table if not exists public.notion_sources (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  token text not null check (char_length(token) between 20 and 200),
  -- 表の ID（32桁の16進）
  database_id text not null check (database_id ~ '^[0-9a-f]{32}$'),
  last_fetched_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

alter table public.notion_sources enable row level security;

drop policy if exists "本人だけが読める" on public.notion_sources;
create policy "本人だけが読める" on public.notion_sources
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "本人だけが作れる" on public.notion_sources;
create policy "本人だけが作れる" on public.notion_sources
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "本人だけが更新できる" on public.notion_sources;
create policy "本人だけが更新できる" on public.notion_sources
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "本人だけが消せる" on public.notion_sources;
create policy "本人だけが消せる" on public.notion_sources
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- 画面（ブラウザ）からは合言葉を読めないようにする（登録・作り直し・削除はできる）。
-- 表ごとの読み取りの権限を外してから、合言葉以外の列だけを読めるようにする
revoke select on public.notion_sources from authenticated, anon;
grant select (user_id, database_id, last_fetched_at, last_error, created_at) on public.notion_sources to authenticated;

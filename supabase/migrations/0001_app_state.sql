-- アプリのデータを、ユーザーごとに1行（JSON）で持つ。
-- 行レベルセキュリティ（RLS）で、ログインしている本人の行しか読み書きできないようにする。

create table if not exists public.app_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  version integer not null default 2,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

drop policy if exists "本人だけが読める" on public.app_state;
create policy "本人だけが読める" on public.app_state
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "本人だけが作れる" on public.app_state;
create policy "本人だけが作れる" on public.app_state
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "本人だけが更新できる" on public.app_state;
create policy "本人だけが更新できる" on public.app_state
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 削除はアプリからは行わない（ポリシーを作らないので、誰も削除できない）

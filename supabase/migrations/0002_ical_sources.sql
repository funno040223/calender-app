-- 取り込む iCal カレンダー（Google カレンダーの「iCal 形式の非公開アドレス」など）。
-- URL は秘密情報なので、アプリのデータ（app_state）とは別の表に置き、本人しか読めないようにする。
-- 画面には名前と取り込みの状態だけを返し、URL はサーバー側の取り込み処理だけが読む。

create table if not exists public.ical_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  -- 許可した配信元の https の URL だけ（アプリ側でも同じ確認をする）
  url text not null check (url ~ '^https://(calendar\.google\.com|([a-z0-9-]+\.)?icloud\.com)/'),
  last_fetched_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create index if not exists ical_sources_user_id_idx on public.ical_sources (user_id);

alter table public.ical_sources enable row level security;

drop policy if exists "本人だけが読める" on public.ical_sources;
create policy "本人だけが読める" on public.ical_sources
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "本人だけが作れる" on public.ical_sources;
create policy "本人だけが作れる" on public.ical_sources
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "本人だけが更新できる" on public.ical_sources;
create policy "本人だけが更新できる" on public.ical_sources
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "本人だけが消せる" on public.ical_sources;
create policy "本人だけが消せる" on public.ical_sources
  for delete to authenticated
  using ((select auth.uid()) = user_id);

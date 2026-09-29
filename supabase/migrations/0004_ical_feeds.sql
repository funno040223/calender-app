-- アプリの予定の iCal 配信。ユーザーごとに1行。
-- 配信のアドレスに入る合言葉そのものは保存せず、SHA-256（16進の64文字）だけを置く。
-- 配信（/api/ical/feed/...）はサーバーが secret key で引く。画面からは「配信しているか」を見て、作り直し・停止だけできる

create table if not exists public.ical_feeds (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

alter table public.ical_feeds enable row level security;

drop policy if exists "本人だけが読める" on public.ical_feeds;
create policy "本人だけが読める" on public.ical_feeds
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "本人だけが作れる" on public.ical_feeds;
create policy "本人だけが作れる" on public.ical_feeds
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "本人だけが更新できる" on public.ical_feeds;
create policy "本人だけが更新できる" on public.ical_feeds
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "本人だけが消せる" on public.ical_feeds;
create policy "本人だけが消せる" on public.ical_feeds
  for delete to authenticated
  using ((select auth.uid()) = user_id);

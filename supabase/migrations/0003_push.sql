-- 通知（Web Push）のための表。
-- push_subscriptions: 通知を受け取る端末（本人だけが読み書きできる）
-- push_schedule:      これから送る通知の一覧（ユーザーごとに1行。アプリが組み直すたびに書き換える）
-- push_sent:          送った通知の記録（同じ通知を2回送らないため。サーバーだけが使う）

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  device text check (char_length(device) <= 100),
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "本人だけが読める" on public.push_subscriptions;
create policy "本人だけが読める" on public.push_subscriptions
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "本人だけが作れる" on public.push_subscriptions;
create policy "本人だけが作れる" on public.push_subscriptions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "本人だけが更新できる" on public.push_subscriptions;
create policy "本人だけが更新できる" on public.push_subscriptions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "本人だけが消せる" on public.push_subscriptions;
create policy "本人だけが消せる" on public.push_subscriptions
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.push_schedule (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array' and pg_column_size(items) <= 200000),
  updated_at timestamptz not null default now()
);

alter table public.push_schedule enable row level security;

drop policy if exists "本人だけが読める" on public.push_schedule;
create policy "本人だけが読める" on public.push_schedule
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "本人だけが作れる" on public.push_schedule;
create policy "本人だけが作れる" on public.push_schedule
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "本人だけが更新できる" on public.push_schedule;
create policy "本人だけが更新できる" on public.push_schedule
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 送った記録は、サーバー（secret key）だけが読み書きする。ポリシーを作らないので、画面からは読めず書けない
create table if not exists public.push_sent (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.push_sent enable row level security;

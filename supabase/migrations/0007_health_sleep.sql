-- ヘルスケアの睡眠の取り込み。iPhone のショートカットが /api/health/sleep に送る。
-- health_tokens：ショートカットの合言葉（ユーザーごとに1行）。合言葉そのものは保存せず、SHA-256（16進の64文字）だけを置く。
-- health_sleep：夜ごとのまとめ（起きた日ごとに1行）。書くのはサーバー（secret key）だけで、本人は読むだけ

create table if not exists public.health_tokens (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

alter table public.health_tokens enable row level security;

drop policy if exists "本人だけが読める" on public.health_tokens;
create policy "本人だけが読める" on public.health_tokens
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "本人だけが作れる" on public.health_tokens;
create policy "本人だけが作れる" on public.health_tokens
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "本人だけが更新できる" on public.health_tokens;
create policy "本人だけが更新できる" on public.health_tokens
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "本人だけが消せる" on public.health_tokens;
create policy "本人だけが消せる" on public.health_tokens
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.health_sleep (
  user_id uuid not null references auth.users (id) on delete cascade,
  -- 起きた日（日本時間）
  night date not null,
  -- 寝ついた時刻と起きた時刻
  sleep_start timestamptz not null,
  sleep_end timestamptz not null check (sleep_end > sleep_start),
  -- 眠っていた時間（分）
  asleep_minutes integer not null check (asleep_minutes between 0 and 1440),
  updated_at timestamptz not null default now(),
  primary key (user_id, night)
);

alter table public.health_sleep enable row level security;

drop policy if exists "本人だけが読める" on public.health_sleep;
create policy "本人だけが読める" on public.health_sleep
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- iPhone のショートカット（Siri の「タスクを追加」）から、ログインせずにタスクを足すための合言葉。ユーザーごとに1行。
-- 合言葉そのものは保存せず、SHA-256（16進の64文字）だけを置く。
-- 受け取り（/api/shortcut/task/...）はサーバーが secret key で引く。画面からは「作ってあるか」を見て、作り直し・削除だけできる

create table if not exists public.shortcut_tokens (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

alter table public.shortcut_tokens enable row level security;

drop policy if exists "本人だけが読める" on public.shortcut_tokens;
create policy "本人だけが読める" on public.shortcut_tokens
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "本人だけが作れる" on public.shortcut_tokens;
create policy "本人だけが作れる" on public.shortcut_tokens
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "本人だけが更新できる" on public.shortcut_tokens;
create policy "本人だけが更新できる" on public.shortcut_tokens
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "本人だけが消せる" on public.shortcut_tokens;
create policy "本人だけが消せる" on public.shortcut_tokens
  for delete to authenticated
  using ((select auth.uid()) = user_id);

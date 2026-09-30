-- 2026-09-30 レビュー（2回目）の V7・V8。何度実行してもよい。

-- V7: iCal の非公開 URL を、画面（ブラウザ）から読めないようにする。
-- 取り込みはサーバー（/api/ical/sync・毎時の組み直し）が、本人を確かめてから secret key で読む。
-- 画面が読むのは名前と取り込みの状態だけ。登録（insert）と削除はこれまでどおり本人ができる。
revoke select on public.ical_sources from authenticated, anon;
grant select (id, user_id, name, last_fetched_at, last_error, created_at) on public.ical_sources to authenticated;

-- V8: app_state の保存時刻を、端末の時計ではなくサーバーの時計にする（どちらの端末の保存が後かを正しく比べる）
create or replace function public.app_state_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists app_state_set_updated_at on public.app_state;
create trigger app_state_set_updated_at
  before insert or update on public.app_state
  for each row execute function public.app_state_set_updated_at();

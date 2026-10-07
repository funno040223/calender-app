-- 2026-10-03 の要件定義書「齟齬と運用上の懸念」#1。何度実行してもよい。
-- iCal の取り込みに失敗した回は、前回取り込めた予定で補って組み直す（毎時の組み直しと通知が止まらないように）。
-- 画面（ブラウザ）からは読めない（0006 の列ごとの許可に入れない）。サーバーだけが secret key で読み書きする。
alter table public.ical_sources add column if not exists last_events jsonb;

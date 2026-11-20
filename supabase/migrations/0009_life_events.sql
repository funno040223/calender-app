-- Life data is separate from the legacy app_state replacement writes.
create table if not exists public.life_sync_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.life_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null,
  schema_version integer not null check (schema_version > 0),
  kind text not null,
  payload jsonb not null,
  occurred_at timestamptz,
  recorded_at timestamptz not null,
  device_id uuid not null,
  supersedes uuid,
  created_at timestamptz not null default now(),
  revision bigint not null check (revision > 0),
  group_key text not null,
  event jsonb not null,
  primary key (user_id, event_id)
);
create index if not exists life_events_revision_idx on public.life_events(user_id, revision, event_id);
create index if not exists life_events_kind_idx on public.life_events(user_id, kind, group_key);

alter table public.life_sync_state enable row level security;
alter table public.life_events enable row level security;
drop policy if exists life_sync_owner_read on public.life_sync_state;
create policy life_sync_owner_read on public.life_sync_state for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists life_events_owner_read on public.life_events;
create policy life_events_owner_read on public.life_events for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.life_sync_state, public.life_events from public, anon, authenticated;
grant select on public.life_sync_state, public.life_events to authenticated;
grant select, insert, update on public.life_sync_state to service_role;
grant select, insert on public.life_events to service_role;

-- The API validates all payloads before invoking this service-role-only routine.
-- The per-user row lock serializes a whole batch with its revision and delta.
create or replace function public.sync_life_events(
  p_user uuid, p_revision bigint, p_entries jsonb
) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_revision bigint;
  v_status text := 'ok';
  v_changed boolean;
  v_delta jsonb := '[]'::jsonb;
begin
  if p_user is null or p_revision < 0 or p_revision is null or jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) > 100 then
    raise exception 'Invalid life sync request' using errcode = '22023';
  end if;

  insert into public.life_sync_state(user_id) values (p_user) on conflict do nothing;
  select revision into v_revision from public.life_sync_state where user_id = p_user for update;

  if p_revision > v_revision then
    return jsonb_build_object('status', 'reset', 'revision', v_revision, 'events', v_delta);
  end if;

  if exists (
    select 1 from public.life_events
    where user_id = p_user and revision > p_revision and schema_version <> 1
  ) or exists (
    select 1 from jsonb_array_elements(p_entries) x
    where (x->'event'->>'schemaVersion')::int is distinct from 1
  ) then
    return jsonb_build_object('status', 'unsupported', 'revision', v_revision, 'events', v_delta);
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_entries) x
    join public.life_events e on e.user_id = p_user and e.event_id = (x->'event'->>'id')::uuid
    where e.event is distinct from x->'event'
  ) then
    return jsonb_build_object('status', 'id_conflict', 'revision', v_revision, 'events', v_delta);
  end if;

  select exists (
    select 1 from jsonb_array_elements(p_entries) x
    where not exists (
      select 1 from public.life_events e where e.user_id = p_user and e.event_id = (x->'event'->>'id')::uuid
    )
  ) into v_changed;

  if v_changed and p_revision <> v_revision then
    v_status := 'revision_conflict';
  elsif v_changed then
    -- Refer to receipts in this user's prior revisions or earlier in this batch.
    if exists (
      select 1
      from jsonb_array_elements(p_entries) with ordinality x(entry, seq)
      cross join lateral jsonb_array_elements_text(x.entry->'targets') target(id)
      where not exists (
        select 1 from public.life_events e
        where e.user_id = p_user and e.event_id = target.id::uuid and e.group_key = x.entry->>'group_key'
      ) and not exists (
        select 1 from jsonb_array_elements(p_entries) with ordinality earlier(entry, seq)
        where earlier.seq < x.seq and earlier.entry->'event'->>'id' = target.id
          and earlier.entry->>'group_key' = x.entry->>'group_key'
      )
    ) then
      return jsonb_build_object('status', 'invalid_target', 'revision', v_revision, 'events', v_delta);
    end if;

    v_revision := v_revision + 1;
    insert into public.life_events (
      user_id, event_id, schema_version, kind, payload, occurred_at, recorded_at, device_id, supersedes, revision, group_key, event
    )
    select p_user, (x->'event'->>'id')::uuid, 1, x->'event'->>'kind', x->'event'->'payload',
      (x->'event'->>'occurredAt')::timestamptz, (x->'event'->>'recordedAt')::timestamptz,
      (x->'event'->>'deviceId')::uuid, (x->'event'->>'supersedes')::uuid, v_revision,
      x->>'group_key', x->'event'
    from jsonb_array_elements(p_entries) x
    on conflict (user_id, event_id) do nothing;
    update public.life_sync_state set revision = v_revision, updated_at = now() where user_id = p_user;
  end if;

  select coalesce(jsonb_agg(e.event order by e.revision, e.event_id), '[]'::jsonb) into v_delta
  from public.life_events e where e.user_id = p_user and e.revision > p_revision;
  return jsonb_build_object('status', v_status, 'revision', v_revision, 'events', v_delta);
end;
$$;

revoke all on function public.sync_life_events(uuid, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.sync_life_events(uuid, bigint, jsonb) to service_role;

-- Server planning sees scheduling state only. Recipe and purchase events are not read.
create or replace function public.read_life_schedule(p_user uuid) returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'revision', coalesce((select revision from public.life_sync_state where user_id = p_user), 0),
    'events', coalesce((
      select jsonb_agg(case
        when kind = 'exercise' then event #- '{payload,details}'
        when kind = 'correction' and group_key like 'exercise:%' then event #- '{payload,entry,value,details}'
        else event
      end order by revision, event_id)
      from public.life_events
      where user_id = p_user and (
        group_key = 'exercisePlan' or group_key like 'exerciseChoice:%'
        or group_key like 'exercise:%' or group_key like 'fatigue:%'
      )
    ), '[]'::jsonb)
  );
$$;
revoke all on function public.read_life_schedule(uuid) from public, anon, authenticated;
grant execute on function public.read_life_schedule(uuid) to service_role;

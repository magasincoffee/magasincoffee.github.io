-- XSTORE-C02 — Canonical recurring staffing persistence + bounded RPC authority.
-- Architecture source: 05_SYSTEM/XSTORE_C01_RECURRING_STAFFING_ARCHITECTURE_LOCK.md
-- This migration intentionally does NOT import/copy rows from staffing_requirements
-- or staffing_requirement_templates. Real recurring business values remain Manager-owned input.

create table if not exists public.workforce_recurring_staffing_requirements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  start_time time without time zone not null,
  end_time time without time zone not null,
  target_headcount integer not null check (target_headcount between 1 and 20),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workforce_recurring_staffing_time_check check (end_time > start_time),
  constraint workforce_recurring_staffing_slot_unique
    unique (store_id, day_of_week, start_time, end_time)
);

create index if not exists idx_workforce_recurring_staffing_store_day
  on public.workforce_recurring_staffing_requirements(store_id, day_of_week, start_time, end_time);

alter table public.workforce_recurring_staffing_requirements enable row level security;

-- Browser clients do not access the table directly. SECURITY DEFINER RPCs below
-- are the only browser-facing authority and enforce role/status/store scope internally.
revoke all on table public.workforce_recurring_staffing_requirements
  from public, anon, authenticated;

create or replace function public.list_workforce_recurring_staffing_requirements_v1()
returns table(
  requirement_id uuid,
  store_id uuid,
  store_code text,
  store_name text,
  day_of_week smallint,
  start_time time without time zone,
  end_time time without time zone,
  target_headcount integer,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path=public
as $function$
declare
  v_role text := upper(coalesce(public.current_user_role(),''));
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;

  if not exists(
    select 1
    from public.profiles p
    where p.id=auth.uid()
      and p.status='ACTIVE'
      and upper(coalesce(p.role,''))=v_role
  ) then
    raise exception 'ACTOR_NOT_ACTIVE';
  end if;

  return query
  select
    r.id,
    r.store_id,
    s.code,
    s.name,
    r.day_of_week,
    r.start_time,
    r.end_time,
    r.target_headcount,
    r.updated_at
  from public.workforce_recurring_staffing_requirements r
  join public.stores s on s.id=r.store_id
  where s.status='ACTIVE'
    and public.can_access_store(r.store_id)
  order by s.code,r.day_of_week,r.start_time,r.end_time,r.id;
end;
$function$;

create or replace function public.replace_workforce_recurring_staffing_requirements_v1(
  p_requirements jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $function$
declare
  v_role text := upper(coalesce(public.current_user_role(),''));
  v_scope_store_ids uuid[];
  v_scope_codes text[];
  v_item jsonb;
  v_store uuid;
  v_day smallint;
  v_start time without time zone;
  v_end time without time zone;
  v_target integer;
  v_key text;
  v_keys text[] := '{}'::text[];
  v_count integer := 0;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;

  if not exists(
    select 1
    from public.profiles p
    where p.id=auth.uid()
      and p.status='ACTIVE'
      and upper(coalesce(p.role,''))=v_role
  ) then
    raise exception 'ACTOR_NOT_ACTIVE';
  end if;

  select
    array_agg(s.id order by s.code),
    array_agg(s.code order by s.code)
  into v_scope_store_ids,v_scope_codes
  from public.stores s
  where s.status='ACTIVE'
    and public.can_access_store(s.id);

  if coalesce(cardinality(v_scope_store_ids),0)=0 then
    raise exception 'NO_ACCESSIBLE_ACTIVE_STORES';
  end if;

  if jsonb_typeof(coalesce(p_requirements,'[]'::jsonb))<>'array' then
    raise exception 'REQUIREMENTS_MUST_BE_ARRAY';
  end if;

  -- Validate the complete board payload before any mutation.
  for v_item in
    select value
    from jsonb_array_elements(coalesce(p_requirements,'[]'::jsonb))
  loop
    begin
      v_store := nullif(v_item->>'store_id','')::uuid;
      v_day := nullif(v_item->>'day_of_week','')::smallint;
      v_start := nullif(v_item->>'start_time','')::time;
      v_end := nullif(v_item->>'end_time','')::time;
      v_target := nullif(v_item->>'target_headcount','')::integer;
    exception when others then
      raise exception 'RECURRING_STAFFING_PAYLOAD_MALFORMED';
    end;

    if v_store is null or v_day is null or v_start is null or v_end is null or v_target is null then
      raise exception 'RECURRING_STAFFING_FIELDS_REQUIRED';
    end if;

    if not exists(
      select 1 from public.stores s
      where s.id=v_store and s.status='ACTIVE'
    ) then
      raise exception 'STORE_NOT_ACTIVE';
    end if;

    if not (v_store=any(v_scope_store_ids))
       or not coalesce(public.can_access_store(v_store),false) then
      raise exception 'STORE_NOT_ALLOWED';
    end if;

    if v_day<1 or v_day>7 then
      raise exception 'DAY_OF_WEEK_OUT_OF_RANGE';
    end if;

    if v_end<=v_start then
      raise exception 'INVALID_RECURRING_STAFFING_INTERVAL';
    end if;

    if v_target<1 or v_target>20 then
      raise exception 'STAFFING_HEADCOUNT_OUT_OF_RANGE';
    end if;

    v_key := v_store::text||'|'||v_day::text||'|'||v_start::text||'|'||v_end::text;
    if v_key=any(v_keys) then
      raise exception 'DUPLICATE_RECURRING_STAFFING_REQUIREMENT';
    end if;
    v_keys := array_append(v_keys,v_key);
  end loop;

  -- Serialize all recurring-board replacements so overlapping Owner/Manager scopes
  -- cannot race each other and produce a lost-update board.
  perform pg_advisory_xact_lock(
    hashtextextended('workforce_recurring_staffing:canonical_board',0)
  );

  -- Only actor-accessible stores may be replaced; inaccessible rows are untouched.
  delete from public.workforce_recurring_staffing_requirements r
  where r.store_id=any(v_scope_store_ids);

  for v_item in
    select value
    from jsonb_array_elements(coalesce(p_requirements,'[]'::jsonb))
  loop
    v_store := (v_item->>'store_id')::uuid;
    v_day := (v_item->>'day_of_week')::smallint;
    v_start := (v_item->>'start_time')::time;
    v_end := (v_item->>'end_time')::time;
    v_target := (v_item->>'target_headcount')::integer;

    insert into public.workforce_recurring_staffing_requirements(
      store_id,day_of_week,start_time,end_time,target_headcount,
      created_by,updated_by,created_at,updated_at
    ) values(
      v_store,v_day,v_start,v_end,v_target,
      auth.uid(),auth.uid(),now(),now()
    );
    v_count := v_count+1;
  end loop;

  return jsonb_build_object(
    'requirement_count',v_count,
    'accessible_store_count',cardinality(v_scope_store_ids),
    'accessible_store_codes',to_jsonb(v_scope_codes)
  );
end;
$function$;

revoke execute on function public.list_workforce_recurring_staffing_requirements_v1()
  from public,anon;
grant execute on function public.list_workforce_recurring_staffing_requirements_v1()
  to authenticated;

revoke execute on function public.replace_workforce_recurring_staffing_requirements_v1(jsonb)
  from public,anon;
grant execute on function public.replace_workforce_recurring_staffing_requirements_v1(jsonb)
  to authenticated;

comment on table public.workforce_recurring_staffing_requirements
  is 'XSTORE-C02 canonical recurring staffing-demand authority: store + ISO weekday + time block + target headcount. Browser direct table access denied.';
comment on function public.list_workforce_recurring_staffing_requirements_v1()
  is 'XSTORE-C02 bounded recurring staffing reader for ACTIVE OWNER/STORE_MANAGER within can_access_store scope.';
comment on function public.replace_workforce_recurring_staffing_requirements_v1(jsonb)
  is 'XSTORE-C02 atomic recurring staffing board replacement for ACTIVE OWNER/STORE_MANAGER accessible store scope. No legacy/date-bound dual-write.';

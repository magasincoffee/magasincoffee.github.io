-- SCHED-01 — Production blocker repair + scheduling canonical reconciliation.
-- Scope: repair ambiguous generation readers, reconcile only duplicate empty DRAFT history,
-- and prevent competing active generation truth for the same store/week.

create or replace function public.get_schedule_generation(p_generation_id uuid)
returns table(
  id uuid,
  store_id uuid,
  store_code text,
  store_name text,
  week_start date,
  week_end date,
  algorithm_version text,
  status text,
  total_hours numeric,
  estimated_cost numeric,
  coverage_score numeric,
  skill_coverage_score numeric,
  created_by uuid,
  created_at timestamptz,
  published_at timestamptz
)
language plpgsql
stable
security definer
set search_path=public
as $function$
declare
  v_role text := public.current_user_role();
  v_store uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select sgr.store_id
    into v_store
    from public.schedule_generation_runs sgr
   where sgr.id = p_generation_id;

  if v_store is null
     and not exists(
       select 1
         from public.schedule_generation_runs sgr_check
        where sgr_check.id = p_generation_id
          and sgr_check.store_id is null
     ) then
    raise exception 'GENERATION_NOT_FOUND';
  end if;

  if v_role='STORE_MANAGER'
     and v_store is not null
     and not public.can_access_store(v_store) then
    raise exception 'STORE_NOT_ALLOWED';
  end if;

  if v_role not in ('OWNER','STORE_MANAGER')
     and not exists(
       select 1
         from public.schedule_generation_runs sgr_created
        where sgr_created.id = p_generation_id
          and sgr_created.created_by = auth.uid()
     ) then
    raise exception 'ROLE_NOT_ALLOWED';
  end if;

  return query
  select
    sgr.id,
    sgr.store_id,
    s.code,
    s.name,
    sgr.week_start,
    sgr.week_end,
    sgr.algorithm_version,
    sgr.status,
    sgr.total_hours,
    sgr.estimated_cost,
    sgr.coverage_score,
    sgr.skill_coverage_score,
    sgr.created_by,
    sgr.created_at,
    sgr.published_at
  from public.schedule_generation_runs sgr
  left join public.stores s on s.id = sgr.store_id
  where sgr.id = p_generation_id;
end;
$function$;

create or replace function public.get_schedule_generation_assignments(p_generation_id uuid)
returns table(
  id uuid,
  generation_id uuid,
  user_id uuid,
  employee_name text,
  store_id uuid,
  store_code text,
  work_date date,
  start_time time,
  end_time time,
  skill_code text,
  skill_level integer,
  score numeric,
  warning text,
  status text,
  note text
)
language plpgsql
stable
security definer
set search_path=public
as $function$
declare
  v_role text := public.current_user_role();
  v_store uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select sgr.store_id
    into v_store
    from public.schedule_generation_runs sgr
   where sgr.id = p_generation_id;

  if not found then raise exception 'GENERATION_NOT_FOUND'; end if;

  if v_role not in ('OWNER','STORE_MANAGER')
     and not exists(
       select 1
         from public.schedule_generation_runs sgr_created
        where sgr_created.id = p_generation_id
          and sgr_created.created_by = auth.uid()
     ) then
    raise exception 'ROLE_NOT_ALLOWED';
  end if;

  if v_role='STORE_MANAGER'
     and v_store is not null
     and not public.can_access_store(v_store) then
    raise exception 'STORE_NOT_ALLOWED';
  end if;

  return query
  select
    a.id,
    a.generation_id,
    a.user_id,
    p.full_name,
    a.store_id,
    s.code,
    a.work_date,
    a.start_time,
    a.end_time,
    a.skill_code,
    a.skill_level,
    a.score,
    a.warning,
    a.status,
    a.note
  from public.schedule_generation_assignments a
  join public.profiles p on p.id = a.user_id
  join public.stores s on s.id = a.store_id
  where a.generation_id = p_generation_id
  order by a.work_date,a.start_time,a.store_id,a.user_id,a.id;
end;
$function$;

revoke execute on function public.get_schedule_generation(uuid) from public, anon;
revoke execute on function public.get_schedule_generation_assignments(uuid) from public, anon;
grant execute on function public.get_schedule_generation(uuid) to authenticated;
grant execute on function public.get_schedule_generation_assignments(uuid) to authenticated;

-- Historical reconciliation is deliberately narrow:
-- only competing DRAFTs with no assignment rows and no published schedule provenance
-- may be superseded; the newest row is retained, older rows remain as CANCELLED history.
with duplicate_groups as (
  select g.store_id,g.week_start
  from public.schedule_generation_runs g
  where g.status in ('DRAFT','REVIEWED','PUBLISHED')
  group by g.store_id,g.week_start
  having count(*) > 1
     and bool_and(g.status='DRAFT')
     and bool_and(not exists(
       select 1
       from public.schedule_generation_assignments a
       where a.generation_id=g.id
     ))
     and bool_and(not exists(
       select 1
       from public.work_schedules ws
       where ws.source_generation_id=g.id
     ))
),
ranked as (
  select
    g.id,
    row_number() over(
      partition by g.store_id,g.week_start
      order by g.created_at desc,g.id desc
    ) as rn
  from public.schedule_generation_runs g
  join duplicate_groups d
    on d.store_id=g.store_id
   and d.week_start=g.week_start
  where g.status='DRAFT'
)
update public.schedule_generation_runs g
   set status='CANCELLED',
       updated_at=now()
  from ranked r
 where g.id=r.id
   and r.rn>1
   and g.status='DRAFT';

-- Fail closed against future split-brain DRAFT/REVIEWED/PUBLISHED versions.
create unique index if not exists uq_schedule_generation_active_store_week_v1
  on public.schedule_generation_runs(store_id,week_start)
  where status in ('DRAFT','REVIEWED','PUBLISHED');

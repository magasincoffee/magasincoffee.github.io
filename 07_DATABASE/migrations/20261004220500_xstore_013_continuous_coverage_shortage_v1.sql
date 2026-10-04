-- XSTORE-013 — Continuous staffing coverage + exact shortage intervals.
-- Source of Truth: WORKFORCE_CROSS_STORE_SCHEDULING_TEMP_SOURCE_OF_TRUTH.md section 6.0.9.
-- This migration preserves workforce_recurring_staffing_requirements as the only staffing authority.
-- It does NOT change Auto Schedule assignment composition; XSTORE-014 owns that cutover.

create or replace function public.evaluate_workforce_coverage_shortages_v1(
  p_requirement_start time without time zone,
  p_requirement_end time without time zone,
  p_target_headcount integer,
  p_assignments jsonb default '[]'::jsonb
)
returns table(
  shortage_start time without time zone,
  shortage_end time without time zone,
  assigned_headcount integer,
  missing_headcount integer
)
language plpgsql
immutable
set search_path=public
as $function$
begin
  if p_requirement_start is null
     or p_requirement_end is null
     or p_requirement_end <= p_requirement_start then
    raise exception 'INVALID_COVERAGE_INTERVAL';
  end if;

  if p_target_headcount is null or p_target_headcount < 1 or p_target_headcount > 20 then
    raise exception 'STAFFING_HEADCOUNT_OUT_OF_RANGE';
  end if;

  if jsonb_typeof(coalesce(p_assignments,'[]'::jsonb)) <> 'array' then
    raise exception 'ASSIGNMENTS_MUST_BE_ARRAY';
  end if;

  return query
  with normalized as (
    select
      greatest(
        p_requirement_start,
        (e.value->>'start_time')::time without time zone
      ) as interval_start,
      least(
        p_requirement_end,
        (e.value->>'end_time')::time without time zone
      ) as interval_end,
      coalesce(
        nullif(e.value->>'user_id',''),
        '__row_'||e.ordinality::text
      ) as employee_key
    from jsonb_array_elements(coalesce(p_assignments,'[]'::jsonb))
      with ordinality as e(value,ordinality)
    where jsonb_typeof(e.value)='object'
      and e.value ? 'start_time'
      and e.value ? 'end_time'
      and (e.value->>'end_time')::time without time zone
            > (e.value->>'start_time')::time without time zone
      and (e.value->>'start_time')::time without time zone < p_requirement_end
      and p_requirement_start < (e.value->>'end_time')::time without time zone
  ),
  boundaries as (
    select p_requirement_start as boundary
    union
    select p_requirement_end
    union
    select interval_start from normalized
    union
    select interval_end from normalized
  ),
  raw_segments as (
    select
      b.boundary as segment_start,
      lead(b.boundary) over(order by b.boundary) as segment_end
    from boundaries b
  ),
  coverage as (
    select
      s.segment_start,
      s.segment_end,
      count(distinct n.employee_key)::integer as assigned_headcount
    from raw_segments s
    left join normalized n
      on n.interval_start <= s.segment_start
     and n.interval_end >= s.segment_end
    where s.segment_end is not null
      and s.segment_end > s.segment_start
    group by s.segment_start,s.segment_end
  ),
  shortage_segments as (
    select
      c.segment_start,
      c.segment_end,
      c.assigned_headcount,
      p_target_headcount-c.assigned_headcount as missing_headcount
    from coverage c
    where c.assigned_headcount < p_target_headcount
  ),
  marked as (
    select
      ss.*,
      case
        when lag(ss.segment_end) over(order by ss.segment_start)=ss.segment_start
         and lag(ss.assigned_headcount) over(order by ss.segment_start)=ss.assigned_headcount
         and lag(ss.missing_headcount) over(order by ss.segment_start)=ss.missing_headcount
        then 0
        else 1
      end as starts_new_group
    from shortage_segments ss
  ),
  grouped as (
    select
      m.*,
      sum(m.starts_new_group) over(
        order by m.segment_start
        rows between unbounded preceding and current row
      ) as shortage_group
    from marked m
  )
  select
    min(g.segment_start)::time without time zone,
    max(g.segment_end)::time without time zone,
    min(g.assigned_headcount)::integer,
    min(g.missing_headcount)::integer
  from grouped g
  group by g.shortage_group
  order by min(g.segment_start);
end;
$function$;

create or replace function public.list_cross_store_staffing_shortages_v1(
  p_week_start date
)
returns table(
  requirement_id uuid,
  store_id uuid,
  store_code text,
  work_date date,
  shortage_start time without time zone,
  shortage_end time without time zone,
  target_headcount integer,
  assigned_headcount integer,
  missing_headcount integer
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

  if p_week_start is null or extract(isodow from p_week_start)<>1 then
    raise exception 'WEEK_START_MUST_BE_MONDAY';
  end if;

  return query
  with requirements as (
    select
      r.id as requirement_id,
      r.store_id,
      s.code as store_code,
      (p_week_start + (r.day_of_week::integer-1))::date as work_date,
      r.start_time as requirement_start,
      r.end_time as requirement_end,
      r.target_headcount
    from public.workforce_recurring_staffing_requirements r
    join public.stores s on s.id=r.store_id
    where s.status='ACTIVE'
      and public.can_access_store(r.store_id)
  ),
  requirement_assignments as (
    select
      req.requirement_id,
      req.store_id,
      req.store_code,
      req.work_date,
      req.requirement_start,
      req.requirement_end,
      req.target_headcount,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'user_id',a.user_id,
            'start_time',a.start_time,
            'end_time',a.end_time
          )
          order by a.start_time,a.end_time,a.user_id,a.id
        ) filter(where a.id is not null),
        '[]'::jsonb
      ) as assignments
    from requirements req
    left join public.schedule_generation_runs g
      on g.store_id=req.store_id
     and g.week_start=p_week_start
     and g.status in ('DRAFT','REVIEWED')
    left join public.schedule_generation_assignments a
      on a.generation_id=g.id
     and a.work_date=req.work_date
     and a.start_time<req.requirement_end
     and req.requirement_start<a.end_time
    group by
      req.requirement_id,
      req.store_id,
      req.store_code,
      req.work_date,
      req.requirement_start,
      req.requirement_end,
      req.target_headcount
  )
  select
    req.requirement_id,
    req.store_id,
    req.store_code,
    req.work_date,
    shortage.shortage_start,
    shortage.shortage_end,
    req.target_headcount,
    shortage.assigned_headcount,
    shortage.missing_headcount
  from requirement_assignments req
  cross join lateral public.evaluate_workforce_coverage_shortages_v1(
    req.requirement_start,
    req.requirement_end,
    req.target_headcount,
    req.assignments
  ) shortage
  order by
    req.store_code,
    req.work_date,
    shortage.shortage_start,
    shortage.shortage_end,
    req.requirement_id;
end;
$function$;

revoke execute on function public.evaluate_workforce_coverage_shortages_v1(
  time without time zone,time without time zone,integer,jsonb
) from public,anon,authenticated;

revoke execute on function public.list_cross_store_staffing_shortages_v1(date)
  from public,anon;
grant execute on function public.list_cross_store_staffing_shortages_v1(date)
  to authenticated;

comment on function public.evaluate_workforce_coverage_shortages_v1(
  time without time zone,time without time zone,integer,jsonb
) is 'XSTORE-013 internal interval coverage primitive. Splits at every assignment boundary, counts distinct employees per segment, and returns only exact under-covered intervals.';

comment on function public.list_cross_store_staffing_shortages_v1(date)
  is 'XSTORE-013 bounded Manager/Owner shortage reader using canonical recurring staffing requirements and current DRAFT/REVIEWED assignments. Does not mutate or fabricate business data.';

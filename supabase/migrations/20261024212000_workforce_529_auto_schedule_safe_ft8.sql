-- #529 P0 — staged migration: safe rerun, FT 8-hour priority and effective weekly demand.
-- Requires XSTORE-014, 20261018105000_xstore_employee_ftpt_v1.sql and
-- supabase/migrations/20261021163000_workforce_weekly_staffing_overrides_v1.sql.
-- CANDIDATE ONLY. Do not apply to production before isolated PostgreSQL/JWT E2E,
-- 4-store Owner/Manager qualification, and explicit deployment review.
-- This CREATE OR REPLACE preserves RPC signature, auth gate, advisory transaction
-- lock, published-week guard and official schedule isolation.
--
-- XSTORE-014 — Interval-composed Auto Schedule.
-- Source of Truth: WORKFORCE_CROSS_STORE_SCHEDULING_TEMP_SOURCE_OF_TRUTH.md section 6.0.9/J.
-- Requires XSTORE-013 coverage primitives.
-- Auto Schedule remains Availability-bound and DRAFT-only. Manager Availability override belongs to XSTORE-015.

create or replace function public.auto_generate_cross_store_schedule_v1(
  p_week_start date,
  p_replace_existing boolean default false,
  p_algorithm_version text default 'XSTORE_GLOBAL_RECURRING_V1'
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $function$
declare
  v_role text := upper(coalesce(public.current_user_role(),''));
  v_algorithm text := coalesce(nullif(trim(p_algorithm_version),''),'XSTORE_GLOBAL_RECURRING_V1');
  v_store record;
  r record;
  g record;
  c record;
  v_generation uuid;
  v_generation_ids jsonb := '[]'::jsonb;
  v_assignment_count integer := 0;
  v_shortages jsonb := '[]'::jsonb;
  v_coverage_assignments jsonb := '[]'::jsonb;
  v_daily_hours numeric;
  v_weekly_hours numeric;
  v_slot_hours numeric;
  v_same_day_other_store boolean;
  v_score numeric;
  v_missing_stores text[];
  v_existing_assignments integer;
  v_progress boolean;
  v_candidate_start time without time zone;
  v_candidate_end time without time zone;
  v_iteration integer;
  v_ft8_count integer := 0;
  v_ft8_diagnostics jsonb := '[]'::jsonb;
  v_unclassified_staff jsonb := '[]'::jsonb;
  v_ft8_eligible boolean;
  v_slot_demand integer;
  v_slot_covered integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if not exists(
    select 1 from public.profiles p
    where p.id=auth.uid() and p.status='ACTIVE' and upper(coalesce(p.role,''))=v_role
  ) then raise exception 'ACTOR_NOT_ACTIVE'; end if;
  if p_week_start is null or extract(isodow from p_week_start)<>1 then
    raise exception 'WEEK_START_MUST_BE_MONDAY';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('workforce_cross_store:'||p_week_start::text,0));

  select array_agg(s.code order by s.code)
    into v_missing_stores
  from public.stores s
  where s.status='ACTIVE'
    and public.can_access_store(s.id)
    and not exists(
      select 1
      from public.workforce_recurring_staffing_requirements rr
      where rr.store_id=s.id
    );

  if coalesce(array_length(v_missing_stores,1),0)>0 then
    raise exception 'STAFFING_REQUIREMENT_INCOMPLETE: %',array_to_string(v_missing_stores,',');
  end if;

  if not exists(
    select 1
    from public.workforce_recurring_staffing_requirements rr
    where public.can_access_store(rr.store_id)
  ) then
    raise exception 'STAFFING_REQUIREMENT_EMPTY';
  end if;

  if exists(
    select 1 from public.work_schedules ws
    where ws.work_date between p_week_start and p_week_start+6
      and ws.status in ('PENDING','APPROVED')
      and public.can_access_store(ws.store_id)
  ) then
    raise exception 'OFFICIAL_WEEK_ALREADY_EXISTS';
  end if;

  if exists(
    select 1 from public.schedule_generation_runs gr
    where gr.week_start=p_week_start
      and gr.status in ('REVIEWED','PUBLISHED')
      and public.can_access_store(gr.store_id)
  ) then
    raise exception 'NON_DRAFT_GENERATION_EXISTS';
  end if;

  select count(*)
    into v_existing_assignments
  from public.schedule_generation_assignments a
  join public.schedule_generation_runs gr on gr.id=a.generation_id
  where gr.week_start=p_week_start
    and gr.status='DRAFT'
    and public.can_access_store(gr.store_id);

  if v_existing_assignments>0 and not p_replace_existing then
    raise exception 'EXISTING_DRAFT_REQUIRES_CONFIRMATION';
  end if;

  for v_store in
    select s.id,s.code
    from public.stores s
    where s.status='ACTIVE' and public.can_access_store(s.id)
    order by s.code
  loop
    v_generation := public.create_schedule_generation(v_store.id,p_week_start,v_algorithm);

    if p_replace_existing then
      -- P0 #529: never silently destroy manual or unknown-origin DRAFT assignments.
      -- Only replace rows written by the known automatic generator.
      delete from public.schedule_generation_assignments
      where generation_id=v_generation
        and note in ('AUTO_XSTORE_INTERVAL_COMPOSED_V1','AUTO_XSTORE_FT8_529_V1');
    end if;

    update public.schedule_generation_runs
       set algorithm_version=v_algorithm,updated_at=now()
     where id=v_generation and status='DRAFT';

    v_generation_ids := v_generation_ids || jsonb_build_object(
      'store_id',v_store.id,
      'store_code',v_store.code,
      'generation_id',v_generation
    );
  end loop;

  -- Read-only diagnostic for Manager: missing FT/PT types are never guessed.
  -- Scope strictly to active employees, registered availability and accessible stores.
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'user_id',missing.user_id,'employee_name',missing.employee_name,
      'work_date',missing.work_date,'store_id',missing.store_id
    ) order by missing.work_date,missing.employee_name,missing.user_id,missing.store_id
  ),'[]'::jsonb) into v_unclassified_staff
  from (
    select distinct ea.user_id,
      coalesce(nullif(trim(p.full_name),''),nullif(trim(p.username),''),'') as employee_name,
      ea.work_date,esp.store_id
    from public.employee_availability ea
    join public.profiles p on p.id=ea.user_id and p.status='ACTIVE'
    join public.employee_store_priorities esp on esp.employee_id=ea.user_id
    join public.stores store on store.id=esp.store_id and store.status='ACTIVE'
    left join public.employee_employment_types_v1 et on et.employee_id=ea.user_id
    where ea.work_date between p_week_start and p_week_start+6
      and ea.availability_type in ('AVAILABLE','PREFERRED')
      and upper(coalesce(p.role,'')) in ('STAFF','EMPLOYEE')
      and public.can_access_store(esp.store_id)
      and et.employee_id is null
  ) missing;

  -- #529: FT-first 8h pre-pass, BEFORE short interval/PT allocation.
  -- Allocate only if EVERY 30-minute slot of this 8h span has uncovered
  -- effective demand. This prevents overstaffing to force an 8h shift.
  -- Other FT availability intervals are still considered by the generic pass.
  for c in
    select ea.user_id, ea.work_date, candidate.start_time, ea.end_time,
           esp.store_id, esp.priority,
           coalesce(ec.max_daily_hours,0) max_daily_hours,
           coalesce(ec.max_weekly_hours,0) max_weekly_hours
    from public.employee_availability ea
    join public.profiles p on p.id=ea.user_id and p.status='ACTIVE'
    join public.employee_employment_types_v1 et
      on et.employee_id=ea.user_id and et.employment_type='FULL_TIME'
    join public.employee_store_priorities esp on esp.employee_id=ea.user_id
    join public.stores s on s.id=esp.store_id and s.status='ACTIVE'
    left join public.employee_constraints ec
      on ec.user_id=ea.user_id and ec.status='ACTIVE'
    -- Search all half-hour aligned 8h windows, not only the availability start.
    cross join lateral generate_series(
      ea.work_date + greatest(ea.start_time,time '05:00'),
      ea.work_date + least(ea.end_time - interval '8 hours',time '14:00'),
      interval '30 minutes'
    ) as candidate_window(start_ts)
    cross join lateral (select candidate_window.start_ts::time as start_time) candidate
    where ea.work_date between p_week_start and p_week_start+6
      and ea.availability_type in ('AVAILABLE','PREFERRED')
      and upper(coalesce(p.role,'')) in ('STAFF','EMPLOYEE')
      and public.can_access_store(esp.store_id)
      and ea.end_time >= ea.start_time + interval '8 hours'
      and extract(minute from candidate.start_time) in (0,30)
    order by ea.work_date,esp.priority,ea.start_time,ea.user_id,esp.store_id,ea.id
  loop
    v_candidate_start := c.start_time;
    v_candidate_end := (c.start_time + interval '8 hours')::time;

    select gr.id into v_generation
    from public.schedule_generation_runs gr
    where gr.store_id=c.store_id and gr.week_start=p_week_start
      and gr.status='DRAFT'
    order by gr.created_at desc,gr.id desc limit 1;
    if v_generation is null then raise exception 'GENERATION_NOT_FOUND_FOR_STORE'; end if;

    -- Do not touch a manually assigned, official, or other-branch shift.
    if exists(
      select 1 from public.schedule_generation_assignments a
      join public.schedule_generation_runs gr on gr.id=a.generation_id
      where gr.week_start=p_week_start and gr.status in ('DRAFT','REVIEWED')
        and a.user_id=c.user_id and a.work_date=c.work_date
        and a.start_time<v_candidate_end and v_candidate_start<a.end_time
    ) or exists(
      select 1 from public.work_schedules ws
      where ws.user_id=c.user_id and ws.work_date=c.work_date
        and ws.status in ('PENDING','APPROVED')
        and ws.start_time<v_candidate_end and v_candidate_start<ws.end_time
    ) then continue; end if;

    select coalesce(sum(extract(epoch from(a.end_time-a.start_time))/3600.0),0)
      into v_daily_hours
    from public.schedule_generation_assignments a
    join public.schedule_generation_runs gr on gr.id=a.generation_id
    where gr.week_start=p_week_start and gr.status in ('DRAFT','REVIEWED')
      and a.user_id=c.user_id and a.work_date=c.work_date;
    select v_daily_hours + coalesce(sum(extract(epoch from(ws.end_time-ws.start_time))/3600.0),0)
      into v_daily_hours
    from public.work_schedules ws
    where ws.user_id=c.user_id and ws.work_date=c.work_date
      and ws.status in ('PENDING','APPROVED');

    select coalesce(sum(extract(epoch from(a.end_time-a.start_time))/3600.0),0)
      into v_weekly_hours
    from public.schedule_generation_assignments a
    join public.schedule_generation_runs gr on gr.id=a.generation_id
    where gr.week_start=p_week_start and gr.status in ('DRAFT','REVIEWED')
      and a.user_id=c.user_id;
    select v_weekly_hours + coalesce(sum(extract(epoch from(ws.end_time-ws.start_time))/3600.0),0)
      into v_weekly_hours
    from public.work_schedules ws
    where ws.user_id=c.user_id and ws.work_date between p_week_start and p_week_start+6
      and ws.status in ('PENDING','APPROVED');

    if c.max_daily_hours>0 and v_daily_hours+8>c.max_daily_hours then continue; end if;
    if c.max_weekly_hours>0 and v_weekly_hours+8>c.max_weekly_hours then continue; end if;

    -- Every 30m of the FT shift must have sufficient unmet weekly demand.
    v_ft8_eligible:=true;
    for g in
      select gs.ts::time as slot_start,(gs.ts+interval '30 minutes')::time as slot_end
      from generate_series(
        c.work_date + v_candidate_start,
        c.work_date + v_candidate_start + interval '7 hours 30 minutes',
        interval '30 minutes'
      ) gs(ts)
    loop
      select coalesce(max(d.target_headcount),0) into v_slot_demand
      from public.list_workforce_effective_weekly_staffing_v1(c.store_id,p_week_start) d
      where d.work_date=c.work_date and d.start_time<=g.slot_start
        and d.end_time>=g.slot_end;
      select count(distinct a.user_id) into v_slot_covered
      from public.schedule_generation_assignments a
      join public.schedule_generation_runs gr on gr.id=a.generation_id
      where gr.week_start=p_week_start and gr.status in ('DRAFT','REVIEWED')
        and a.store_id=c.store_id and a.work_date=c.work_date
        and a.start_time<g.slot_end and g.slot_start<a.end_time;
      if v_slot_demand<=v_slot_covered then
        v_ft8_eligible:=false;
        exit;
      end if;
    end loop;
    if not v_ft8_eligible then continue; end if;

    insert into public.schedule_generation_assignments(
      generation_id,user_id,store_id,work_date,start_time,end_time,
      skill_code,skill_level,score,warning,status,note
    ) values(
      v_generation,c.user_id,c.store_id,c.work_date,v_candidate_start,v_candidate_end,
      null,0,1000-c.priority*100-v_weekly_hours*2,
      case when c.priority>1 then 'CROSS_STORE_PRIORITY_'||c.priority::text else null end,
      'DRAFT','AUTO_XSTORE_FT8_529_V1'
    );
    v_assignment_count:=v_assignment_count+1;
    v_ft8_count:=v_ft8_count+1;
  end loop;

  -- Report observable FT8 eligibility blockers without modifying any assignment.
  -- Priority is first eligible store; diagnosis is after the FT8 pre-pass.
  for c in
    select ea.user_id,coalesce(nullif(trim(p.full_name),''),nullif(trim(p.username),''),'') as employee_name,
           ea.work_date,ea.start_time,ea.end_time,esp.store_id,esp.priority,
           coalesce(ec.max_daily_hours,0) max_daily_hours,
           coalesce(ec.max_weekly_hours,0) max_weekly_hours
    from public.employee_availability ea
    join public.profiles p on p.id=ea.user_id and p.status='ACTIVE'
    join public.employee_employment_types_v1 et
      on et.employee_id=ea.user_id and et.employment_type='FULL_TIME'
    join public.employee_store_priorities esp on esp.employee_id=ea.user_id
    left join public.employee_constraints ec on ec.user_id=ea.user_id and ec.status='ACTIVE'
    where ea.work_date between p_week_start and p_week_start+6
      and ea.availability_type in ('AVAILABLE','PREFERRED')
      and upper(coalesce(p.role,'')) in ('STAFF','EMPLOYEE')
      and public.can_access_store(esp.store_id)
    order by ea.work_date,ea.user_id,esp.priority,esp.store_id,ea.id
  loop
    if exists (
      select 1 from public.schedule_generation_assignments a
      join public.schedule_generation_runs gr on gr.id=a.generation_id
      where gr.week_start=p_week_start and gr.status in ('DRAFT','REVIEWED')
        and a.user_id=c.user_id and a.work_date=c.work_date
        and a.store_id=c.store_id and a.note='AUTO_XSTORE_FT8_529_V1'
    ) then continue; end if;
    v_ft8_diagnostics := v_ft8_diagnostics || jsonb_build_object(
      'user_id',c.user_id,'employee_name',c.employee_name,
      'store_id',c.store_id,'work_date',c.work_date,
      'code',case
        when c.end_time-c.start_time<interval '8 hours' then 'AVAILABILITY_UNDER_8H'
        when c.max_daily_hours>0 and c.max_daily_hours<8 then 'DAILY_HOURS_CAP_UNDER_8H'
        when c.max_weekly_hours>0 and c.max_weekly_hours<8 then 'WEEKLY_HOURS_CAP_UNDER_8H'
        when exists (
          select 1 from public.schedule_generation_assignments a
          join public.schedule_generation_runs gr on gr.id=a.generation_id
          where gr.week_start=p_week_start and gr.status in ('DRAFT','REVIEWED')
            and a.user_id=c.user_id and a.work_date=c.work_date
        ) or exists (
          select 1 from public.work_schedules ws
          where ws.user_id=c.user_id and ws.work_date=c.work_date
            and ws.status in ('PENDING','APPROVED')
        ) then 'EXISTING_SHIFT_OR_HOURS_CONFLICT'
        else 'NO_ELIGIBLE_8H_WINDOW_OR_EFFECTIVE_DEMAND'
      end,
      'detail','Diagnostic hint only; manager must inspect effective demand and constraints'
    );
  end loop;

  -- #529: fill remaining gaps after the full-length FT pass; PT is fallback.
  -- All source tables are queried fresh inside this transaction per click.
  for r in
    select
      req.id,
      d.store_id,
      extract(isodow from d.work_date)::integer as day_of_week,
      d.work_date,
      d.start_time,
      d.end_time,
      d.target_headcount,
      s.code as store_code
    from public.stores s
    cross join lateral public.list_workforce_effective_weekly_staffing_v1(s.id,p_week_start) d
    left join lateral (
      select original.id from public.workforce_recurring_staffing_requirements original
      where original.store_id=d.store_id
        and original.day_of_week=extract(isodow from d.work_date)::integer
        and original.start_time=d.start_time and original.end_time=d.end_time
      order by original.id limit 1
    ) req on true
    where s.status='ACTIVE'
      and public.can_access_store(s.id)
      and d.target_headcount>0
    -- The fallback pass must not hard-code CN1 before CN2 for a PT with
    -- CN2 as the preferred eligible store. Rank demand by eligible FT/PT
    -- class and employee-declared store priority before store code.
    order by d.work_date,
      coalesce((
        select min(
          case et_pref.employment_type when 'FULL_TIME' then 0 else 10000 end
          + pref.priority
        )
        from public.employee_availability ea_pref
        join public.profiles p_pref on p_pref.id=ea_pref.user_id and p_pref.status='ACTIVE'
        join public.employee_store_priorities pref
          on pref.employee_id=ea_pref.user_id and pref.store_id=s.id
        join public.employee_employment_types_v1 et_pref
          on et_pref.employee_id=ea_pref.user_id
         and et_pref.employment_type in ('FULL_TIME','PART_TIME')
        where ea_pref.work_date=d.work_date
          and ea_pref.availability_type in ('AVAILABLE','PREFERRED')
          and upper(coalesce(p_pref.role,'')) in ('STAFF','EMPLOYEE')
          and ea_pref.start_time<d.end_time and d.start_time<ea_pref.end_time
      ),2147483647),
      d.start_time,d.end_time,s.code,req.id
  loop
    select gr.id into v_generation
    from public.schedule_generation_runs gr
    where gr.store_id=r.store_id
      and gr.week_start=p_week_start
      and gr.status='DRAFT'
    order by gr.created_at desc,gr.id desc
    limit 1;

    if v_generation is null then raise exception 'GENERATION_NOT_FOUND_FOR_STORE'; end if;

    v_iteration := 0;

    loop
      v_iteration := v_iteration + 1;
      if v_iteration>5000 then
        raise exception 'SCHEDULER_ITERATION_GUARD';
      end if;

      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'user_id',a.user_id,
            'start_time',a.start_time,
            'end_time',a.end_time
          )
          order by a.start_time,a.end_time,a.user_id,a.id
        ),
        '[]'::jsonb
      )
      into v_coverage_assignments
      from public.schedule_generation_assignments a
      join public.schedule_generation_runs gr on gr.id=a.generation_id
      where gr.week_start=p_week_start
        and gr.status in ('DRAFT','REVIEWED')
        and a.store_id=r.store_id
        and a.work_date=r.work_date
        and a.start_time<r.end_time
        and r.start_time<a.end_time;

      v_progress := false;

      for g in
        select shortage_start,shortage_end,assigned_headcount,missing_headcount
        from public.evaluate_workforce_coverage_shortages_v1(
          r.start_time,
          r.end_time,
          r.target_headcount,
          v_coverage_assignments
        )
        order by shortage_start,shortage_end
      loop
        for c in
          select
            p.id as user_id,
            coalesce(p.full_name,p.username) as employee_name,
            esp.priority,
            ea.id as availability_id,
            ea.start_time as availability_start,
            ea.end_time as availability_end,
            greatest(g.shortage_start,ea.start_time) as candidate_start,
            least(g.shortage_end,ea.end_time) as candidate_end,
            coalesce(ec.max_daily_hours,0) as max_daily_hours,
            coalesce(ec.max_weekly_hours,0) as max_weekly_hours
          from public.employee_availability ea
          join public.profiles p on p.id=ea.user_id
          join public.employee_store_priorities esp
            on esp.employee_id=p.id and esp.store_id=r.store_id
          -- Missing FT/PT classification must be corrected by Manager, not inferred.
          join public.employee_employment_types_v1 et
            on et.employee_id=p.id
           and et.employment_type in ('FULL_TIME','PART_TIME')
          left join public.employee_constraints ec
            on ec.user_id=p.id and ec.status='ACTIVE'
          where ea.work_date=r.work_date
            and ea.availability_type in ('AVAILABLE','PREFERRED')
            and p.status='ACTIVE'
            and upper(coalesce(p.role,'')) in ('STAFF','EMPLOYEE')
            and ea.end_time>g.shortage_start
            and ea.start_time<g.shortage_end
            and greatest(g.shortage_start,ea.start_time)
                < least(g.shortage_end,ea.end_time)
            and not exists(
              select 1
              from public.schedule_generation_assignments x
              join public.schedule_generation_runs gx on gx.id=x.generation_id
              where gx.week_start=p_week_start
                and gx.status in ('DRAFT','REVIEWED')
                and x.user_id=p.id
                and x.work_date=r.work_date
                and x.start_time<least(g.shortage_end,ea.end_time)
                and greatest(g.shortage_start,ea.start_time)<x.end_time
            )
            and not exists(
              select 1 from public.work_schedules ws
              where ws.user_id=p.id
                and ws.work_date=r.work_date
                and ws.status in ('PENDING','APPROVED')
                and ws.start_time<least(g.shortage_end,ea.end_time)
                and greatest(g.shortage_start,ea.start_time)<ws.end_time
            )
            and (
              select count(*)
              from public.schedule_generation_assignments x
              join public.schedule_generation_runs gx on gx.id=x.generation_id
              where gx.week_start=p_week_start
                and gx.status in ('DRAFT','REVIEWED')
                and x.user_id=p.id
                and x.work_date=r.work_date
            ) < 2
          order by
            -- FT before PT whenever both can cover an under-staffed interval.
            case et.employment_type
              when 'FULL_TIME' then 0 when 'PART_TIME' then 1 end,
            esp.priority asc,
            greatest(g.shortage_start,ea.start_time) asc,
            least(g.shortage_end,ea.end_time) desc,
            lower(coalesce(p.full_name,p.username)),
            p.id,
            ea.id
        loop
          v_candidate_start := c.candidate_start;
          v_candidate_end := c.candidate_end;
          v_slot_hours := extract(epoch from(v_candidate_end-v_candidate_start))/3600.0;

          select
            coalesce((
              select sum(extract(epoch from(x.end_time-x.start_time))/3600.0)
              from public.schedule_generation_assignments x
              join public.schedule_generation_runs gx on gx.id=x.generation_id
              where gx.week_start=p_week_start
                and gx.status in ('DRAFT','REVIEWED')
                and x.user_id=c.user_id
                and x.work_date=r.work_date
            ),0)
            + coalesce((
              select sum(extract(epoch from(ws.end_time-ws.start_time))/3600.0)
              from public.work_schedules ws
              where ws.user_id=c.user_id
                and ws.work_date=r.work_date
                and ws.status in ('PENDING','APPROVED')
            ),0)
          into v_daily_hours;

          select
            coalesce((
              select sum(extract(epoch from(x.end_time-x.start_time))/3600.0)
              from public.schedule_generation_assignments x
              join public.schedule_generation_runs gx on gx.id=x.generation_id
              where gx.week_start=p_week_start
                and gx.status in ('DRAFT','REVIEWED')
                and x.user_id=c.user_id
            ),0)
            + coalesce((
              select sum(extract(epoch from(ws.end_time-ws.start_time))/3600.0)
              from public.work_schedules ws
              where ws.user_id=c.user_id
                and ws.work_date between p_week_start and p_week_start+6
                and ws.status in ('PENDING','APPROVED')
            ),0)
          into v_weekly_hours;

          if c.max_daily_hours>0 and v_daily_hours+v_slot_hours>c.max_daily_hours then
            continue;
          end if;
          if c.max_weekly_hours>0 and v_weekly_hours+v_slot_hours>c.max_weekly_hours then
            continue;
          end if;

          select exists(
            select 1
            from public.schedule_generation_assignments x
            join public.schedule_generation_runs gx on gx.id=x.generation_id
            where gx.week_start=p_week_start
              and gx.status in ('DRAFT','REVIEWED')
              and x.user_id=c.user_id
              and x.work_date=r.work_date
              and x.store_id<>r.store_id
          ) into v_same_day_other_store;

          v_score := 500
                     - (c.priority*100)
                     - (v_weekly_hours*2)
                     - case when v_same_day_other_store then 30 else 0 end
                     + (v_slot_hours*5);

          insert into public.schedule_generation_assignments(
            generation_id,user_id,store_id,work_date,start_time,end_time,
            skill_code,skill_level,score,warning,status,note
          ) values(
            v_generation,c.user_id,r.store_id,r.work_date,v_candidate_start,v_candidate_end,
            null,0,v_score,
            case when c.priority>1 then 'CROSS_STORE_PRIORITY_'||c.priority::text else null end,
            'DRAFT','AUTO_XSTORE_INTERVAL_COMPOSED_V1'
          );

          v_assignment_count := v_assignment_count+1;
          v_progress := true;
          exit;
        end loop;

        exit when v_progress;
      end loop;

      exit when not v_progress;
    end loop;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'user_id',a.user_id,
          'start_time',a.start_time,
          'end_time',a.end_time
        )
        order by a.start_time,a.end_time,a.user_id,a.id
      ),
      '[]'::jsonb
    )
    into v_coverage_assignments
    from public.schedule_generation_assignments a
    join public.schedule_generation_runs gr on gr.id=a.generation_id
    where gr.week_start=p_week_start
      and gr.status in ('DRAFT','REVIEWED')
      and a.store_id=r.store_id
      and a.work_date=r.work_date
      and a.start_time<r.end_time
      and r.start_time<a.end_time;

    for g in
      select shortage_start,shortage_end,assigned_headcount,missing_headcount
      from public.evaluate_workforce_coverage_shortages_v1(
        r.start_time,
        r.end_time,
        r.target_headcount,
        v_coverage_assignments
      )
      order by shortage_start,shortage_end
    loop
      v_shortages := v_shortages || jsonb_build_object(
        'requirement_id',r.id,
        'store_id',r.store_id,
        'store_code',r.store_code,
        'work_date',r.work_date,
        'start_time',g.shortage_start,
        'end_time',g.shortage_end,
        'target',r.target_headcount,
        'assigned',g.assigned_headcount,
        'missing',g.missing_headcount
      );
    end loop;
  end loop;

  update public.schedule_generation_runs gr
     set total_hours=coalesce((
           select sum(extract(epoch from(a.end_time-a.start_time))/3600.0)
           from public.schedule_generation_assignments a
           where a.generation_id=gr.id
         ),0),
         updated_at=now()
   where gr.week_start=p_week_start
     and gr.status='DRAFT'
     and public.can_access_store(gr.store_id);

  return jsonb_build_object(
    'week_start',p_week_start,
    'status','DRAFT',
    'algorithm_version',v_algorithm,
    'staffing_authority','EFFECTIVE_WEEKLY_V1',
    'ft8_full_length_assignment_count',v_ft8_count,
    'ft8_rejection_diagnostics',v_ft8_diagnostics,
    'unclassified_staff',v_unclassified_staff,
    'coverage_semantics','CONTINUOUS_INTERVAL_V1',
    'generation_ids',v_generation_ids,
    'assignment_count',v_assignment_count,
    'shortages',v_shortages,
    'shortage_count',jsonb_array_length(v_shortages),
    'requires_manager_review',true,
    'published',false
  );
end;
$function$;

revoke execute on function public.auto_generate_cross_store_schedule_v1(date,boolean,text)
  from public,anon;
grant execute on function public.auto_generate_cross_store_schedule_v1(date,boolean,text)
  to authenticated;

comment on function public.auto_generate_cross_store_schedule_v1(date,boolean,text)
  is 'XSTORE-014 global DRAFT scheduler. Composes registered Availability intervals against continuous recurring staffing coverage, returns exact shortage intervals, preserves cross-store/official hard safety, and never publishes.';


-- #529 client-side safe-rerun handshake. Absence of this RPC on an old DB
-- MUST keep the rerun control hidden/disabled; never guess backend version.
create or replace function public.get_workforce_auto_scheduler_capabilities_529()
returns jsonb
language plpgsql stable security definer set search_path=public
as $cap$
declare v_role text := upper(coalesce(public.current_user_role(),''));
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if not exists(
    select 1 from public.profiles p where p.id=auth.uid()
      and p.status='ACTIVE' and upper(coalesce(p.role,''))=v_role
  ) then raise exception 'ACTOR_NOT_ACTIVE'; end if;
  return jsonb_build_object(
    'revision','529_FT8_REFRESH',
    'manual_preserved',true,
    'ft8_first',true,
    'effective_weekly_demand',true
  );
end;
$cap$;
revoke all on function public.get_workforce_auto_scheduler_capabilities_529() from public,anon;
grant execute on function public.get_workforce_auto_scheduler_capabilities_529() to authenticated;


-- Dedicated versioned writer; old UI never invokes this name on legacy DB.
create or replace function public.auto_generate_cross_store_schedule_529(
  p_week_start date,
  p_replace_existing boolean default false,
  p_algorithm_version text default 'XSTORE_EFFECTIVE_FT8_529'
) returns jsonb language sql security invoker set search_path=public
as $v529$
  select public.auto_generate_cross_store_schedule_v1(p_week_start,p_replace_existing,p_algorithm_version);
$v529$;
revoke all on function public.auto_generate_cross_store_schedule_529(date,boolean,text) from public,anon;
grant execute on function public.auto_generate_cross_store_schedule_529(date,boolean,text) to authenticated;

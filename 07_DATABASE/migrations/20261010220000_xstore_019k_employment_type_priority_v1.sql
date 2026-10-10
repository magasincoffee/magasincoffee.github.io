-- XSTORE-019K. PRE-RELEASE MIGRATION: do NOT apply to production until XSTORE-020.
-- Employment type lives in existing employee_constraints, NOT profiles.
-- Canonical rank is hard eligibility -> employment type -> interval -> Store Priority.
-- This migration intentionally never backfills or defaults existing employee records.

create table if not exists public.employee_employment_type_audit_v1 (
 id uuid primary key default gen_random_uuid(),
 employee_id uuid not null references public.profiles(id),
 actor_id uuid not null references public.profiles(id),
 old_employment_type text,
 new_employment_type text not null check (new_employment_type in ('FULL_TIME','PART_TIME')),
 changed_at timestamptz not null default now(),
 source text not null default 'XSTORE-019K'
);
alter table public.employee_employment_type_audit_v1 enable row level security;
revoke all on public.employee_employment_type_audit_v1 from public, anon, authenticated;

create or replace function public.list_employee_employment_types_v1()
returns table(employee_id uuid, employment_type text, updated_at timestamptz)
language plpgsql stable security definer set search_path=public
as $function$
declare v_role text := upper(coalesce(public.current_user_role(),''));
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
 if not exists(select 1 from public.profiles a where a.id=auth.uid() and a.status='ACTIVE' and upper(a.role)=v_role) then raise exception 'ACTOR_NOT_ACTIVE'; end if;
 return query
 select p.id, case when ec.employment_type in ('FULL_TIME','PART_TIME') then ec.employment_type else null end,
        ec.updated_at
 from public.profiles p
 left join public.employee_constraints ec on ec.user_id=p.id and ec.status='ACTIVE'
 where p.status='ACTIVE' and upper(p.role) in ('STAFF','EMPLOYEE')
 and (v_role='OWNER' or exists (
   select 1 from public.employee_store_priorities esp
   where esp.employee_id=p.id and public.can_access_store(esp.store_id)
 ))
 order by p.id;
end;
$function$;
revoke execute on function public.list_employee_employment_types_v1() from public, anon, authenticated;
grant execute on function public.list_employee_employment_types_v1() to authenticated;

create or replace function public.get_my_employee_employment_type_v1()
returns text
language plpgsql stable security definer set search_path=public
as $function$
declare v_type text;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if not exists(select 1 from public.profiles p
     where p.id=auth.uid() and p.status='ACTIVE' and upper(p.role) in ('STAFF','EMPLOYEE'))
 then raise exception 'EMPLOYEE_NOT_ACTIVE'; end if;
 select case when ec.employment_type in ('FULL_TIME','PART_TIME') then ec.employment_type else null end
 into v_type from public.employee_constraints ec
 where ec.user_id=auth.uid() and ec.status='ACTIVE';
 return v_type;
end;
$function$;
revoke execute on function public.get_my_employee_employment_type_v1() from public, anon, authenticated;
grant execute on function public.get_my_employee_employment_type_v1() to authenticated;

create or replace function public.set_employee_employment_type_v1(
 p_employee_id uuid, p_employment_type text
) returns jsonb
language plpgsql security definer set search_path=public
as $function$
declare
 v_role text := upper(coalesce(public.current_user_role(),''));
 v_old text;
 v_row_status text;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
 if not exists(select 1 from public.profiles a
    where a.id=auth.uid() and a.status='ACTIVE' and upper(a.role)=v_role)
 then raise exception 'ACTOR_NOT_ACTIVE'; end if;
 if p_employment_type is null or p_employment_type not in ('FULL_TIME','PART_TIME')
 then raise exception 'EMPLOYMENT_TYPE_INVALID'; end if;
 if not exists(select 1 from public.profiles p where p.id=p_employee_id
    and p.status='ACTIVE' and upper(p.role) in ('STAFF','EMPLOYEE'))
 then raise exception 'EMPLOYEE_NOT_ACTIVE'; end if;
 if v_role='STORE_MANAGER' and not exists(
    select 1 from public.employee_store_priorities esp
    where esp.employee_id=p_employee_id and public.can_access_store(esp.store_id))
 then raise exception 'STORE_NOT_ALLOWED'; end if;
 select ec.employment_type,ec.status into v_old,v_row_status
 from public.employee_constraints ec where ec.user_id=p_employee_id for update;
 if v_row_status='INACTIVE' then raise exception 'EMPLOYEE_CONSTRAINTS_INACTIVE'; end if;
 if v_old is distinct from p_employment_type then
   insert into public.employee_constraints (user_id, employment_type, status, updated_at)
   values (p_employee_id,p_employment_type,'ACTIVE',now())
   on conflict (user_id) do update
     set employment_type=excluded.employment_type,updated_at=now();
   insert into public.employee_employment_type_audit_v1
     (employee_id,actor_id,old_employment_type,new_employment_type)
   values (p_employee_id,auth.uid(),v_old,p_employment_type);
 end if;
 return jsonb_build_object('employee_id',p_employee_id,
                           'employment_type',p_employment_type,
                           'changed',v_old is distinct from p_employment_type);
end;
$function$;
revoke execute on function public.set_employee_employment_type_v1(uuid,text)
 from public, anon, authenticated;
grant execute on function public.set_employee_employment_type_v1(uuid,text) to authenticated;

-- Re-qualify/revoke direct browser mutation on base table as configured by current RLS.
-- No UPDATE permissions granted to Employee, and no profile-column authority added.


-- Replaces only the canonical automatic DRAFT scheduler ranking; rest is verbatim XSTORE-014.
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
      delete from public.schedule_generation_assignments
      where generation_id=v_generation;
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

  -- XSTORE-014: satisfy recurring requirements by repeatedly filling exact
  -- under-covered intervals. Candidates are clipped to each shortage interval.
  for r in
    select
      req.id,
      req.store_id,
      req.day_of_week,
      (p_week_start + (req.day_of_week::integer - 1))::date as work_date,
      req.start_time,
      req.end_time,
      req.target_headcount,
      s.code as store_code
    from public.workforce_recurring_staffing_requirements req
    join public.stores s on s.id=req.store_id
    where s.status='ACTIVE'
      and public.can_access_store(req.store_id)
    order by req.day_of_week,req.start_time,req.end_time,s.code,req.id
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
            -- XSTORE-019K: only after hard eligibility, prefer FULL_TIME to PART_TIME.
            -- Unknown/legacy and unconfigured values are never coerced to PART_TIME.
            case when ec.employment_type='FULL_TIME' then 0
                 when ec.employment_type='PART_TIME' then 1 else 2 end,
            greatest(g.shortage_start,ea.start_time) asc,
            least(g.shortage_end,ea.end_time) desc,
            esp.priority asc,
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
    'staffing_authority','RECURRING_WEEKLY_V1',
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

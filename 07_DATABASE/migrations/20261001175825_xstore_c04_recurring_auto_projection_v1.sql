-- XSTORE-C04 — Auto Schedule recurring staffing projection cutover.
-- Source of Truth: WORKFORCE_CROSS_STORE_SCHEDULING_TEMP_SOURCE_OF_TRUTH.md
-- Requires XSTORE-C02 recurring authority. Does not create/copy date-bound staffing rows.
-- Robot still creates DRAFT only; Manager remains responsible for review/edit/validate/publish.

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
  c record;
  v_generation uuid;
  v_generation_ids jsonb := '[]'::jsonb;
  v_assignment_count integer := 0;
  v_assigned integer;
  v_shortages jsonb := '[]'::jsonb;
  v_daily_hours numeric;
  v_weekly_hours numeric;
  v_slot_hours numeric;
  v_same_day_other_store boolean;
  v_score numeric;
  v_missing_stores text[];
  v_existing_assignments integer;
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

  -- Every active store in Manager scope must have at least one recurring staffing block.
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
    select 1 from public.schedule_generation_runs g
    where g.week_start=p_week_start
      and g.status in ('REVIEWED','PUBLISHED')
      and public.can_access_store(g.store_id)
  ) then
    raise exception 'NON_DRAFT_GENERATION_EXISTS';
  end if;

  select count(*)
    into v_existing_assignments
  from public.schedule_generation_assignments a
  join public.schedule_generation_runs g on g.id=a.generation_id
  where g.week_start=p_week_start
    and g.status='DRAFT'
    and public.can_access_store(g.store_id);

  if v_existing_assignments>0 and not p_replace_existing then
    raise exception 'EXISTING_DRAFT_REQUIRES_CONFIRMATION';
  end if;

  -- Create/reuse one canonical DRAFT generation for each active store in scope.
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

  -- Project recurring weekday blocks directly into the selected calendar week.
  -- No date-bound staffing rows are materialized or dual-written.
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
    select id into v_generation
    from public.schedule_generation_runs
    where store_id=r.store_id
      and week_start=p_week_start
      and status='DRAFT'
    order by created_at desc,id desc
    limit 1;

    if v_generation is null then raise exception 'GENERATION_NOT_FOUND_FOR_STORE'; end if;

    select count(*)
      into v_assigned
    from public.schedule_generation_assignments a
    where a.generation_id=v_generation
      and a.work_date=r.work_date
      and a.start_time=r.start_time
      and a.end_time=r.end_time;

    v_slot_hours := extract(epoch from(r.end_time-r.start_time))/3600.0;

    for c in
      select
        p.id as user_id,
        coalesce(p.full_name,p.username) as employee_name,
        esp.priority,
        coalesce(ec.max_daily_hours,0) as max_daily_hours,
        coalesce(ec.max_weekly_hours,0) as max_weekly_hours
      from public.profiles p
      join public.employee_store_priorities esp
        on esp.employee_id=p.id and esp.store_id=r.store_id
      left join public.employee_constraints ec
        on ec.user_id=p.id and ec.status='ACTIVE'
      where p.status='ACTIVE'
        and upper(coalesce(p.role,'')) in ('STAFF','EMPLOYEE')
        and exists(
          select 1 from public.employee_availability ea
          where ea.user_id=p.id
            and ea.work_date=r.work_date
            and ea.availability_type in ('AVAILABLE','PREFERRED')
            and ea.start_time<=r.start_time
            and ea.end_time>=r.end_time
        )
        and not exists(
          select 1
          from public.schedule_generation_assignments x
          join public.schedule_generation_runs gx on gx.id=x.generation_id
          where gx.week_start=p_week_start
            and gx.status in ('DRAFT','REVIEWED')
            and x.user_id=p.id
            and x.work_date=r.work_date
            and x.start_time<r.end_time
            and r.start_time<x.end_time
        )
        and not exists(
          select 1 from public.work_schedules ws
          where ws.user_id=p.id
            and ws.work_date=r.work_date
            and ws.status in ('PENDING','APPROVED')
            and ws.start_time<r.end_time
            and r.start_time<ws.end_time
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
        esp.priority asc,
        (
          select count(*)
          from public.schedule_generation_assignments x
          join public.schedule_generation_runs gx on gx.id=x.generation_id
          where gx.week_start=p_week_start
            and gx.status in ('DRAFT','REVIEWED')
            and x.user_id=p.id
            and x.work_date=r.work_date
            and x.store_id<>r.store_id
        ) asc,
        (
          select coalesce(sum(extract(epoch from(x.end_time-x.start_time))/3600.0),0)
          from public.schedule_generation_assignments x
          join public.schedule_generation_runs gx on gx.id=x.generation_id
          where gx.week_start=p_week_start
            and gx.status in ('DRAFT','REVIEWED')
            and x.user_id=p.id
        ) asc,
        lower(coalesce(p.full_name,p.username)),
        p.id
    loop
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

      v_score := 500 - (c.priority*100) - (v_weekly_hours*2)
                 - case when v_same_day_other_store then 30 else 0 end;

      insert into public.schedule_generation_assignments(
        generation_id,user_id,store_id,work_date,start_time,end_time,
        skill_code,skill_level,score,warning,status,note
      ) values(
        v_generation,c.user_id,r.store_id,r.work_date,r.start_time,r.end_time,
        null,0,v_score,
        case when c.priority>1 then 'CROSS_STORE_PRIORITY_'||c.priority::text else null end,
        'DRAFT','AUTO_XSTORE_GLOBAL_V1'
      );

      v_assignment_count := v_assignment_count+1;
      v_assigned := v_assigned+1;
      exit when v_assigned>=r.target_headcount;
    end loop;

    if v_assigned<r.target_headcount then
      v_shortages := v_shortages || jsonb_build_object(
        'requirement_id',r.id,
        'store_id',r.store_id,
        'store_code',r.store_code,
        'work_date',r.work_date,
        'start_time',r.start_time,
        'end_time',r.end_time,
        'target',r.target_headcount,
        'assigned',v_assigned,
        'missing',r.target_headcount-v_assigned
      );
    end if;
  end loop;

  update public.schedule_generation_runs g
     set total_hours=coalesce((
           select sum(extract(epoch from(a.end_time-a.start_time))/3600.0)
           from public.schedule_generation_assignments a
           where a.generation_id=g.id
         ),0),
         updated_at=now()
   where g.week_start=p_week_start
     and g.status='DRAFT'
     and public.can_access_store(g.store_id);

  return jsonb_build_object(
    'week_start',p_week_start,
    'status','DRAFT',
    'algorithm_version',v_algorithm,
    'staffing_authority','RECURRING_WEEKLY_V1',
    'generation_ids',v_generation_ids,
    'assignment_count',v_assignment_count,
    'shortages',v_shortages,
    'shortage_count',jsonb_array_length(v_shortages),
    'requires_manager_review',true,
    'published',false
  );
end;
$function$;


-- XSTORE-C04 cutover: browser clients must no longer read or mutate the superseded
-- date-bound XSTORE staffing authority.
revoke execute on function public.list_cross_store_staffing_requirements_v1(date)
  from public,anon,authenticated;
revoke execute on function public.replace_cross_store_staffing_requirements_v1(date,jsonb)
  from public,anon,authenticated;

comment on function public.list_cross_store_staffing_requirements_v1(date)
  is 'DEPRECATED XSTORE-C04: date-bound staffing reader retained only for historical/reconciliation use; browser EXECUTE revoked.';
comment on function public.replace_cross_store_staffing_requirements_v1(date,jsonb)
  is 'DEPRECATED XSTORE-C04: date-bound staffing writer retained only for historical/reconciliation use; browser EXECUTE revoked.';

revoke execute on function public.auto_generate_cross_store_schedule_v1(date,boolean,text)
  from public,anon;
grant execute on function public.auto_generate_cross_store_schedule_v1(date,boolean,text)
  to authenticated;

comment on function public.auto_generate_cross_store_schedule_v1(date,boolean,text)
  is 'XSTORE-C04 global DRAFT scheduler. Projects canonical recurring staffing weekday blocks into p_week_start without materializing a second staffing truth.';

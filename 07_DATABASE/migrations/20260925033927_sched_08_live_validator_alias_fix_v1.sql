-- SCHED-08 — Live three-role E2E acceptance blocker repair.
-- Production finding: validate_schedule_generation_v1 failed with PostgreSQL 42702
-- because PL/pgSQL record variable "a" collided with SQL alias "a" in the daily count loop.
-- Scope: alias-only function repair. No table/data/RLS/authority change.

create or replace function public.validate_schedule_generation_v1(p_generation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_run public.schedule_generation_runs%rowtype;
  v_role text := public.current_user_role();
  v_violations jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  a record;
  r record;
  v_total integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if not exists(select 1 from public.profiles where id=auth.uid() and status='ACTIVE' and role=v_role) then
    raise exception 'ACTOR_NOT_ACTIVE';
  end if;

  select * into v_run
  from public.schedule_generation_runs
  where id=p_generation_id
  for update;

  if not found then raise exception 'GENERATION_NOT_FOUND'; end if;
  if not coalesce(public.can_access_store(v_run.store_id),false) then raise exception 'STORE_NOT_ALLOWED'; end if;

  if v_run.status not in ('DRAFT','REVIEWED') then
    v_violations := v_violations || jsonb_build_object('code','GENERATION_STATUS_NOT_VALIDATABLE','status',v_run.status);
  end if;

  if v_run.store_id is null
     or not exists(select 1 from public.stores s where s.id=v_run.store_id and s.status='ACTIVE') then
    v_violations := v_violations || jsonb_build_object('code','GENERATION_STORE_INVALID');
  end if;

  if extract(isodow from v_run.week_start)<>1 or v_run.week_end<>v_run.week_start+6 then
    v_violations := v_violations || jsonb_build_object('code','INVALID_GENERATION_WEEK');
  end if;

  if exists(
    select 1
    from public.schedule_generation_runs x
    where x.store_id=v_run.store_id
      and x.week_start=v_run.week_start
      and x.id<>v_run.id
      and x.status in ('DRAFT','REVIEWED','PUBLISHED')
  ) then
    v_violations := v_violations || jsonb_build_object('code','COMPETING_GENERATION_EXISTS');
  end if;

  if exists(
    select 1
    from public.work_schedules ws
    where ws.store_id=v_run.store_id
      and ws.work_date between v_run.week_start and v_run.week_end
      and ws.status in ('PENDING','APPROVED')
  ) then
    v_violations := v_violations || jsonb_build_object('code','OFFICIAL_STORE_WEEK_ALREADY_EXISTS');
  end if;

  for a in
    select sga.*,p.id as profile_id,p.status as profile_status,p.role as profile_role
    from public.schedule_generation_assignments sga
    left join public.profiles p on p.id=sga.user_id
    where sga.generation_id=p_generation_id
    order by sga.work_date,sga.start_time,sga.user_id,sga.id
  loop
    if a.profile_id is null then
      v_violations := v_violations || jsonb_build_object('code','EMPLOYEE_NOT_FOUND','user_id',a.user_id);
    elsif a.profile_status<>'ACTIVE' then
      v_violations := v_violations || jsonb_build_object('code','EMPLOYEE_INACTIVE','user_id',a.user_id,'work_date',a.work_date);
    elsif a.profile_role<>'STAFF' then
      v_violations := v_violations || jsonb_build_object('code','EMPLOYEE_NOT_STAFF','user_id',a.user_id,'work_date',a.work_date);
    end if;

    if a.store_id<>v_run.store_id then
      v_violations := v_violations || jsonb_build_object('code','ASSIGNMENT_STORE_MISMATCH','user_id',a.user_id,'store_id',a.store_id);
    end if;

    if a.work_date<v_run.week_start or a.work_date>v_run.week_end then
      v_violations := v_violations || jsonb_build_object('code','ASSIGNMENT_OUTSIDE_GENERATION_WEEK','user_id',a.user_id,'work_date',a.work_date);
    end if;

    if a.start_time is null or a.end_time is null or a.end_time<=a.start_time then
      v_violations := v_violations || jsonb_build_object('code','INVALID_ASSIGNMENT_INTERVAL','user_id',a.user_id,'work_date',a.work_date);
    end if;

    if a.status<>'DRAFT' then
      v_violations := v_violations || jsonb_build_object('code','ASSIGNMENT_STATUS_INVALID','user_id',a.user_id,'work_date',a.work_date,'status',a.status);
    end if;

    if not exists(
      select 1
      from public.employee_availability ea
      where ea.user_id=a.user_id
        and ea.work_date=a.work_date
        and ea.availability_type in ('AVAILABLE','PREFERRED')
        and ea.start_time<=a.start_time
        and ea.end_time>=a.end_time
    ) then
      v_violations := v_violations || jsonb_build_object(
        'code','AVAILABILITY_MISMATCH',
        'user_id',a.user_id,
        'work_date',a.work_date,
        'start_time',a.start_time,
        'end_time',a.end_time
      );
    end if;

    if exists(
      select 1
      from public.schedule_generation_assignments y
      where y.generation_id=p_generation_id
        and y.id<>a.id
        and y.user_id=a.user_id
        and y.work_date=a.work_date
        and y.start_time<a.end_time
        and a.start_time<y.end_time
    ) then
      v_violations := v_violations || jsonb_build_object('code','ASSIGNMENT_OVERLAP','user_id',a.user_id,'work_date',a.work_date);
    end if;

    if exists(
      select 1
      from public.work_schedules ws
      where ws.user_id=a.user_id
        and ws.work_date=a.work_date
        and ws.status in ('PENDING','APPROVED')
        and ws.start_time<a.end_time
        and a.start_time<ws.end_time
    ) then
      v_violations := v_violations || jsonb_build_object('code','OFFICIAL_SCHEDULE_OVERLAP','user_id',a.user_id,'work_date',a.work_date);
    end if;
  end loop;

  for r in
    select asg.user_id,asg.work_date,
           count(*)::integer
           + (
             select count(*)::integer
             from public.work_schedules ws
             where ws.user_id=asg.user_id
               and ws.work_date=asg.work_date
               and ws.status in ('PENDING','APPROVED')
           ) as total_count
    from public.schedule_generation_assignments asg
    where asg.generation_id=p_generation_id
    group by asg.user_id,asg.work_date
  loop
    v_total := r.total_count;
    if v_total>2 then
      v_violations := v_violations || jsonb_build_object(
        'code','MAX_TWO_ASSIGNMENTS_PER_EMPLOYEE_DAY',
        'user_id',r.user_id,
        'work_date',r.work_date,
        'assignment_count',v_total
      );
    end if;
  end loop;

  select coalesce(jsonb_agg(value order by value->>'code',value::text),'[]'::jsonb)
    into v_violations
    from (select distinct value from jsonb_array_elements(v_violations)) d;

  return jsonb_build_object(
    'valid',jsonb_array_length(v_violations)=0,
    'generation_id',p_generation_id,
    'generation_status',v_run.status,
    'violations',v_violations,
    'warnings',v_warnings,
    'violation_count',jsonb_array_length(v_violations),
    'warning_count',0,
    'assignment_count',(
      select count(*) from public.schedule_generation_assignments where generation_id=p_generation_id
    )
  );
end;
$function$;

revoke execute on function public.validate_schedule_generation_v1(uuid) from public,anon;
grant execute on function public.validate_schedule_generation_v1(uuid) to authenticated;

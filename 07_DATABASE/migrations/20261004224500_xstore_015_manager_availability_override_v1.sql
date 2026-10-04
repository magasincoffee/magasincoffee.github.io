-- XSTORE-015 — Manager manual Availability override + canonical warning.
-- Source of Truth: WORKFORCE_CROSS_STORE_SCHEDULING_TEMP_SOURCE_OF_TRUTH.md section 6.0.9/J.
-- Scope is manual DRAFT editing only. Auto Schedule remains Availability-bound.
-- Store Priority, ACTIVE employee, overlap, official schedule and other hard safety remain fail-closed.

create or replace function public.validate_schedule_generation_v1(p_generation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $function$
declare
  v_run public.schedule_generation_runs%rowtype;
  v_role text := upper(coalesce(public.current_user_role(),''));
  v_violations jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  a record;
  r record;
  v_total integer;
  v_has_availability boolean;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if not exists(
    select 1 from public.profiles p
    where p.id=auth.uid()
      and p.status='ACTIVE'
      and upper(coalesce(p.role,''))=v_role
  ) then raise exception 'ACTOR_NOT_ACTIVE'; end if;

  select * into v_run
  from public.schedule_generation_runs
  where id=p_generation_id
  for update;

  if not found then raise exception 'GENERATION_NOT_FOUND'; end if;
  if not coalesce(public.can_access_store(v_run.store_id),false) then raise exception 'STORE_NOT_ALLOWED'; end if;

  perform pg_advisory_xact_lock(hashtextextended('workforce_cross_store:'||v_run.week_start::text,0));

  if v_run.status not in ('DRAFT','REVIEWED') then
    v_violations := v_violations || jsonb_build_object(
      'code','GENERATION_STATUS_NOT_VALIDATABLE',
      'status',v_run.status
    );
  end if;

  if v_run.store_id is null
     or not exists(
       select 1 from public.stores s
       where s.id=v_run.store_id and s.status='ACTIVE'
     ) then
    v_violations := v_violations || jsonb_build_object('code','GENERATION_STORE_INVALID');
  end if;

  if extract(isodow from v_run.week_start)<>1
     or v_run.week_end<>v_run.week_start+6 then
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

  -- XSTORE-012 remains authoritative: empty generations are never valid.
  if not exists(
    select 1
    from public.schedule_generation_assignments empty_guard
    where empty_guard.generation_id=p_generation_id
  ) then
    v_violations := v_violations || jsonb_build_object('code','EMPTY_GENERATION');
  end if;

  for a in
    select
      sga.*,
      p.id as profile_id,
      p.status as profile_status,
      p.role as profile_role
    from public.schedule_generation_assignments sga
    left join public.profiles p on p.id=sga.user_id
    where sga.generation_id=p_generation_id
    order by sga.work_date,sga.start_time,sga.user_id,sga.id
  loop
    if a.profile_id is null then
      v_violations := v_violations || jsonb_build_object(
        'code','EMPLOYEE_NOT_FOUND',
        'user_id',a.user_id
      );
    elsif a.profile_status<>'ACTIVE' then
      v_violations := v_violations || jsonb_build_object(
        'code','EMPLOYEE_INACTIVE',
        'user_id',a.user_id,
        'work_date',a.work_date
      );
    elsif upper(coalesce(a.profile_role,'')) not in ('STAFF','EMPLOYEE') then
      v_violations := v_violations || jsonb_build_object(
        'code','EMPLOYEE_NOT_STAFF',
        'user_id',a.user_id,
        'work_date',a.work_date
      );
    end if;

    if a.store_id<>v_run.store_id then
      v_violations := v_violations || jsonb_build_object(
        'code','ASSIGNMENT_STORE_MISMATCH',
        'user_id',a.user_id,
        'store_id',a.store_id
      );
    end if;

    -- Store Priority remains a hard eligibility boundary. XSTORE-015 never overrides it.
    if not exists(
      select 1
      from public.employee_store_priorities esp
      where esp.employee_id=a.user_id
        and esp.store_id=a.store_id
    ) then
      v_violations := v_violations || jsonb_build_object(
        'code','STORE_NOT_ELIGIBLE',
        'user_id',a.user_id,
        'store_id',a.store_id,
        'work_date',a.work_date
      );
    end if;

    if a.work_date<v_run.week_start or a.work_date>v_run.week_end then
      v_violations := v_violations || jsonb_build_object(
        'code','ASSIGNMENT_OUTSIDE_GENERATION_WEEK',
        'user_id',a.user_id,
        'work_date',a.work_date
      );
    end if;

    if a.start_time is null or a.end_time is null or a.end_time<=a.start_time then
      v_violations := v_violations || jsonb_build_object(
        'code','INVALID_ASSIGNMENT_INTERVAL',
        'user_id',a.user_id,
        'work_date',a.work_date
      );
    end if;

    if a.status<>'DRAFT' then
      v_violations := v_violations || jsonb_build_object(
        'code','ASSIGNMENT_STATUS_INVALID',
        'user_id',a.user_id,
        'work_date',a.work_date,
        'status',a.status
      );
    end if;

    select exists(
      select 1
      from public.employee_availability ea
      where ea.user_id=a.user_id
        and ea.work_date=a.work_date
        and ea.availability_type in ('AVAILABLE','PREFERRED')
        and ea.start_time<=a.start_time
        and ea.end_time>=a.end_time
    ) into v_has_availability;

    if not v_has_availability then
      if upper(coalesce(a.warning,''))='MANAGER_AVAILABILITY_OVERRIDE' then
        v_warnings := v_warnings || jsonb_build_object(
          'code','MANAGER_AVAILABILITY_OVERRIDE',
          'user_id',a.user_id,
          'store_id',a.store_id,
          'work_date',a.work_date,
          'start_time',a.start_time,
          'end_time',a.end_time
        );
      else
        v_violations := v_violations || jsonb_build_object(
          'code','AVAILABILITY_MISMATCH',
          'user_id',a.user_id,
          'work_date',a.work_date,
          'start_time',a.start_time,
          'end_time',a.end_time
        );
      end if;
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
      v_violations := v_violations || jsonb_build_object(
        'code','ASSIGNMENT_OVERLAP',
        'user_id',a.user_id,
        'work_date',a.work_date
      );
    end if;

    if exists(
      select 1
      from public.schedule_generation_assignments y
      join public.schedule_generation_runs yr on yr.id=y.generation_id
      where y.generation_id<>p_generation_id
        and yr.week_start=v_run.week_start
        and yr.status in ('DRAFT','REVIEWED')
        and y.user_id=a.user_id
        and y.work_date=a.work_date
        and y.start_time<a.end_time
        and a.start_time<y.end_time
    ) then
      v_violations := v_violations || jsonb_build_object(
        'code','CROSS_STORE_ASSIGNMENT_OVERLAP',
        'user_id',a.user_id,
        'work_date',a.work_date,
        'store_id',a.store_id
      );
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
      v_violations := v_violations || jsonb_build_object(
        'code','OFFICIAL_SCHEDULE_OVERLAP',
        'user_id',a.user_id,
        'work_date',a.work_date
      );
    end if;
  end loop;

  for r in
    select
      cur.user_id,
      cur.work_date,
      count(*)::integer
      + (
        select count(*)::integer
        from public.schedule_generation_assignments other_a
        join public.schedule_generation_runs other_r
          on other_r.id=other_a.generation_id
        where other_a.user_id=cur.user_id
          and other_a.work_date=cur.work_date
          and other_a.generation_id<>p_generation_id
          and other_r.week_start=v_run.week_start
          and other_r.status in ('DRAFT','REVIEWED')
      )
      + (
        select count(*)::integer
        from public.work_schedules ws
        where ws.user_id=cur.user_id
          and ws.work_date=cur.work_date
          and ws.status in ('PENDING','APPROVED')
      ) as total_count
    from public.schedule_generation_assignments cur
    where cur.generation_id=p_generation_id
    group by cur.user_id,cur.work_date
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

  select coalesce(
    jsonb_agg(value order by value->>'code',value::text),
    '[]'::jsonb
  )
  into v_violations
  from (
    select distinct value
    from jsonb_array_elements(v_violations)
  ) d;

  select coalesce(
    jsonb_agg(value order by value->>'code',value::text),
    '[]'::jsonb
  )
  into v_warnings
  from (
    select distinct value
    from jsonb_array_elements(v_warnings)
  ) d;

  return jsonb_build_object(
    'valid',jsonb_array_length(v_violations)=0,
    'generation_id',p_generation_id,
    'generation_status',v_run.status,
    'violations',v_violations,
    'warnings',v_warnings,
    'violation_count',jsonb_array_length(v_violations),
    'warning_count',jsonb_array_length(v_warnings),
    'assignment_count',(
      select count(*)
      from public.schedule_generation_assignments
      where generation_id=p_generation_id
    )
  );
end;
$function$;

create or replace function public.replace_schedule_generation_assignments(
  p_generation_id uuid,
  p_assignments jsonb
)
returns integer
language plpgsql
security definer
set search_path=public
as $function$
declare
  v_role text := upper(coalesce(public.current_user_role(),''));
  v_store uuid;
  v_week_start date;
  v_week_end date;
  v_status text;
  v_item jsonb;
  v_count integer := 0;
  v_user uuid;
  v_store_id uuid;
  v_work_date date;
  v_start time;
  v_end time;
  v_skill text;
  v_level integer;
  v_score numeric;
  v_warning text;
  v_note text;
  v_assignment_status text;
  v_validation jsonb;
  v_has_availability boolean;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if not exists(
    select 1 from public.profiles p
    where p.id=auth.uid()
      and p.status='ACTIVE'
      and upper(coalesce(p.role,''))=v_role
  ) then raise exception 'ACTOR_NOT_ACTIVE'; end if;

  if jsonb_typeof(coalesce(p_assignments,'[]'::jsonb))<>'array' then
    raise exception 'ASSIGNMENTS_MUST_BE_ARRAY';
  end if;

  select store_id,week_start,week_end,status
    into v_store,v_week_start,v_week_end,v_status
  from public.schedule_generation_runs
  where id=p_generation_id
  for update;

  if not found then raise exception 'GENERATION_NOT_FOUND'; end if;
  if v_status<>'DRAFT' then raise exception 'GENERATION_NOT_DRAFT'; end if;
  if not coalesce(public.can_access_store(v_store),false) then
    raise exception 'STORE_NOT_ALLOWED';
  end if;
  if not exists(
    select 1 from public.stores
    where id=v_store and status='ACTIVE'
  ) then raise exception 'STORE_NOT_ACTIVE'; end if;

  perform pg_advisory_xact_lock(hashtextextended('workforce_cross_store:'||v_week_start::text,0));

  delete from public.schedule_generation_assignments
  where generation_id=p_generation_id;

  for v_item in
    select value
    from jsonb_array_elements(coalesce(p_assignments,'[]'::jsonb))
  loop
    begin
      v_user := nullif(v_item->>'user_id','')::uuid;
      v_store_id := nullif(v_item->>'store_id','')::uuid;
      v_work_date := nullif(v_item->>'work_date','')::date;
      v_start := nullif(v_item->>'start_time','')::time;
      v_end := nullif(v_item->>'end_time','')::time;
      v_skill := nullif(trim(v_item->>'skill_code'),'');
      v_level := coalesce(nullif(v_item->>'skill_level','')::integer,0);
      v_score := coalesce(nullif(v_item->>'score','')::numeric,0);
      v_warning := nullif(v_item->>'warning','');
      v_note := nullif(v_item->>'note','');
      v_assignment_status := upper(coalesce(nullif(v_item->>'status',''),'DRAFT'));
    exception when others then
      raise exception 'ASSIGNMENT_PAYLOAD_MALFORMED';
    end;

    if v_user is null
       or v_store_id is null
       or v_work_date is null
       or v_start is null
       or v_end is null then
      raise exception 'ASSIGNMENT_REQUIRED_FIELDS_MISSING';
    end if;
    if v_end<=v_start then raise exception 'INVALID_ASSIGNMENT_INTERVAL'; end if;
    if v_work_date<v_week_start or v_work_date>v_week_end then
      raise exception 'ASSIGNMENT_OUTSIDE_GENERATION_WEEK';
    end if;
    if v_store_id<>v_store then raise exception 'ASSIGNMENT_STORE_MISMATCH'; end if;
    if v_assignment_status<>'DRAFT' then raise exception 'ASSIGNMENT_STATUS_MUST_BE_DRAFT'; end if;
    if v_level<0 or v_level>4 then raise exception 'INVALID_ASSIGNMENT_SKILL_LEVEL'; end if;

    if not exists(
      select 1
      from public.profiles p
      where p.id=v_user
        and p.status='ACTIVE'
        and upper(coalesce(p.role,'')) in ('STAFF','EMPLOYEE')
    ) then raise exception 'ASSIGNMENT_EMPLOYEE_NOT_FOUND'; end if;

    -- Store Priority is never overridable.
    if not exists(
      select 1
      from public.employee_store_priorities esp
      where esp.employee_id=v_user
        and esp.store_id=v_store_id
    ) then raise exception 'STORE_NOT_ELIGIBLE'; end if;

    select exists(
      select 1
      from public.employee_availability ea
      where ea.user_id=v_user
        and ea.work_date=v_work_date
        and ea.availability_type in ('AVAILABLE','PREFERRED')
        and ea.start_time<=v_start
        and ea.end_time>=v_end
    ) into v_has_availability;

    -- This RPC is the bounded Manager/Owner manual DRAFT writer.
    -- A real Availability mismatch is explicitly tagged by the server.
    if not v_has_availability then
      v_warning := 'MANAGER_AVAILABILITY_OVERRIDE';
      if v_note is null then
        v_note := 'MANAGER_AVAILABILITY_OVERRIDE';
      elsif position('MANAGER_AVAILABILITY_OVERRIDE' in upper(v_note))=0 then
        v_note := v_note||' | MANAGER_AVAILABILITY_OVERRIDE';
      end if;
    elsif upper(coalesce(v_warning,''))='MANAGER_AVAILABILITY_OVERRIDE' then
      -- Remove stale override warning if the interval is now covered by Availability.
      v_warning := null;
    end if;

    insert into public.schedule_generation_assignments(
      generation_id,user_id,store_id,work_date,start_time,end_time,
      skill_code,skill_level,score,warning,status,note
    ) values(
      p_generation_id,v_user,v_store_id,v_work_date,v_start,v_end,
      v_skill,v_level,v_score,v_warning,'DRAFT',v_note
    );

    v_count := v_count+1;
  end loop;

  v_validation := public.validate_schedule_generation_v1(p_generation_id);
  if not coalesce((v_validation->>'valid')::boolean,false) then
    raise exception 'ASSIGNMENT_VALIDATION_FAILED: %',v_validation->'violations';
  end if;

  update public.schedule_generation_runs
     set total_hours=coalesce((
           select sum(extract(epoch from(a.end_time-a.start_time))/3600.0)
           from public.schedule_generation_assignments a
           where a.generation_id=p_generation_id
         ),0),
         updated_at=now()
   where id=p_generation_id
     and status='DRAFT';

  if not found then raise exception 'GENERATION_NOT_DRAFT'; end if;
  return v_count;
end;
$function$;

revoke execute on function public.validate_schedule_generation_v1(uuid)
  from public,anon;
grant execute on function public.validate_schedule_generation_v1(uuid)
  to authenticated;

revoke execute on function public.replace_schedule_generation_assignments(uuid,jsonb)
  from public,anon;
grant execute on function public.replace_schedule_generation_assignments(uuid,jsonb)
  to authenticated;

comment on function public.validate_schedule_generation_v1(uuid)
  is 'XSTORE-015 validator. Explicit server-tagged MANAGER_AVAILABILITY_OVERRIDE is warning-only; Store Priority, ACTIVE employee, overlap, official schedule and accepted hard safety remain violations.';

comment on function public.replace_schedule_generation_assignments(uuid,jsonb)
  is 'XSTORE-015 bounded Manager/Owner manual DRAFT writer. It server-tags out-of-Availability assignments as MANAGER_AVAILABILITY_OVERRIDE; Auto Schedule does not use this writer for bypass.';

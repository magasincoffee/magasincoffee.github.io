-- QA-only fixture. Exact RPC definitions captured READ-ONLY from production.
-- Run exclusively in a disposable PostgreSQL service, NEVER on hosted Supabase.
CREATE SCHEMA auth;
CREATE TABLE public.stores(id uuid PRIMARY KEY,code text,status text);
CREATE TABLE public.profiles(id uuid PRIMARY KEY,full_name text,status text,role text);
CREATE TABLE public.qa_manager_scopes(user_id uuid,store_id uuid);
CREATE TABLE public.employee_store_priorities(employee_id uuid,store_id uuid);
CREATE TABLE public.schedule_generation_runs(id uuid PRIMARY KEY,store_id uuid,week_start date,week_end date,status text,total_hours numeric DEFAULT 0,updated_at timestamptz DEFAULT now());
CREATE TABLE public.schedule_generation_assignments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),generation_id uuid,user_id uuid,store_id uuid,work_date date,start_time time without time zone,end_time time without time zone,skill_code text,skill_level integer DEFAULT 0,score numeric DEFAULT 0,warning text,status text,note text);
CREATE TABLE public.employee_availability(user_id uuid,work_date date,availability_type text,start_time time,end_time time);
CREATE TABLE public.work_schedules(user_id uuid,store_id uuid,work_date date,status text,start_time time,end_time time);
CREATE TABLE public.workforce_recurring_staffing_requirements(store_id uuid,target_headcount integer,start_time time,end_time time,day_of_week integer);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('qa.actor_id',true),'')::uuid $$;
CREATE FUNCTION public.current_user_role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT upper(nullif(current_setting('qa.actor_role',true),'')) $$;
CREATE FUNCTION public.can_access_store(p_store_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT public.current_user_role()='OWNER'
    OR EXISTS(SELECT 1 FROM public.qa_manager_scopes s WHERE s.user_id=auth.uid() AND s.store_id=p_store_id)
$$;

-- Read-only extracted production RPC: get_schedule_generation_assignments
CREATE OR REPLACE FUNCTION public.get_schedule_generation_assignments(p_generation_id uuid)
 RETURNS TABLE(id uuid, generation_id uuid, user_id uuid, employee_name text, store_id uuid, store_code text, work_date date, start_time time without time zone, end_time time without time zone, skill_code text, skill_level integer, score numeric, warning text, status text, note text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_role text := upper(coalesce(public.current_user_role(),''));
  v_store uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(
    select 1 from public.profiles p
    where p.id=auth.uid() and p.status='ACTIVE'
      and upper(coalesce(p.role,''))=v_role
  ) then raise exception 'ACTOR_NOT_ACTIVE'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;

  select sgr.store_id into v_store
  from public.schedule_generation_runs sgr
  where sgr.id=p_generation_id;
  if not found then raise exception 'GENERATION_NOT_FOUND'; end if;
  if not coalesce(public.can_access_store(v_store),false) then raise exception 'STORE_NOT_ALLOWED'; end if;

  return query
  select a.id,a.generation_id,a.user_id,p.full_name,a.store_id,s.code,
         a.work_date,a.start_time,a.end_time,a.skill_code,a.skill_level,
         a.score,a.warning,a.status,a.note
  from public.schedule_generation_assignments a
  join public.profiles p on p.id=a.user_id
  join public.stores s on s.id=a.store_id
  where a.generation_id=p_generation_id
  order by a.work_date,a.start_time,a.store_id,a.user_id,a.id;
end;
$function$;

-- Read-only extracted production RPC: replace_schedule_generation_assignments
CREATE OR REPLACE FUNCTION public.replace_schedule_generation_assignments(p_generation_id uuid, p_assignments jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if not exists(
    select 1 from public.profiles
    where id=auth.uid() and status='ACTIVE' and upper(coalesce(role,''))=v_role
  ) then raise exception 'ACTOR_NOT_ACTIVE'; end if;
  if jsonb_typeof(coalesce(p_assignments,'[]'::jsonb))<>'array' then raise exception 'ASSIGNMENTS_MUST_BE_ARRAY'; end if;

  select store_id,week_start,week_end,status
    into v_store,v_week_start,v_week_end,v_status
  from public.schedule_generation_runs
  where id=p_generation_id
  for update;

  if not found then raise exception 'GENERATION_NOT_FOUND'; end if;
  if v_status<>'DRAFT' then raise exception 'GENERATION_NOT_DRAFT'; end if;
  if not coalesce(public.can_access_store(v_store),false) then raise exception 'STORE_NOT_ALLOWED'; end if;
  if not exists(select 1 from public.stores where id=v_store and status='ACTIVE') then raise exception 'STORE_NOT_ACTIVE'; end if;

  perform pg_advisory_xact_lock(hashtextextended('workforce_cross_store:'||v_week_start::text,0));

  delete from public.schedule_generation_assignments where generation_id=p_generation_id;

  for v_item in select value from jsonb_array_elements(coalesce(p_assignments,'[]'::jsonb))
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

    if v_user is null or v_store_id is null or v_work_date is null or v_start is null or v_end is null then
      raise exception 'ASSIGNMENT_REQUIRED_FIELDS_MISSING';
    end if;
    if v_end<=v_start then raise exception 'INVALID_ASSIGNMENT_INTERVAL'; end if;
    if v_work_date<v_week_start or v_work_date>v_week_end then raise exception 'ASSIGNMENT_OUTSIDE_GENERATION_WEEK'; end if;
    if v_store_id<>v_store then raise exception 'ASSIGNMENT_STORE_MISMATCH'; end if;
    if v_assignment_status<>'DRAFT' then raise exception 'ASSIGNMENT_STATUS_MUST_BE_DRAFT'; end if;
    if v_level<0 or v_level>4 then raise exception 'INVALID_ASSIGNMENT_SKILL_LEVEL'; end if;
    if not exists(
      select 1 from public.profiles
      where id=v_user and status='ACTIVE' and upper(coalesce(role,'')) in ('STAFF','EMPLOYEE')
    ) then raise exception 'ASSIGNMENT_EMPLOYEE_NOT_FOUND'; end if;
    if not exists(
      select 1 from public.employee_store_priorities
      where employee_id=v_user and store_id=v_store_id
    ) then raise exception 'STORE_NOT_ELIGIBLE'; end if;

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
   where id=p_generation_id and status='DRAFT';

  if not found then raise exception 'GENERATION_NOT_DRAFT'; end if;
  return v_count;
end;
$function$;

-- Read-only extracted production RPC: validate_schedule_generation_v1
CREATE OR REPLACE FUNCTION public.validate_schedule_generation_v1(p_generation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- A configured store must be able to publish even if no staff could be assigned.
  -- Without a positive staffing requirement, preserve XSTORE-012's empty-draft safety guard.
  if not exists(
    select 1
    from public.schedule_generation_assignments empty_guard
    where empty_guard.generation_id=p_generation_id
  ) then
    if exists(
      select 1 from public.workforce_recurring_staffing_requirements req
      where req.store_id=v_run.store_id and req.target_headcount>0
        and req.start_time<req.end_time and req.day_of_week between 1 and 7
    ) then
      v_warnings := v_warnings || jsonb_build_object('code','EMPTY_STAFFING_SHORTAGE_NON_BLOCKING');
    else
      v_violations := v_violations || jsonb_build_object('code','EMPTY_GENERATION');
    end if;
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
    'warning_count',jsonb_array_length(v_warnings),
    'assignment_count',(
      select count(*) from public.schedule_generation_assignments where generation_id=p_generation_id
    )
  );
end;
$function$;

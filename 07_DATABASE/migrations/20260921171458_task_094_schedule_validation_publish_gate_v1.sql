-- TASK-094 — Schedule Validation + Publish Gate V1
-- Canonical Workforce V1 hardening for Manager-direct scheduling.
-- No destructive cleanup/backfill. Existing duplicate legacy DRAFT groups fail closed.

alter table public.schedule_generation_runs
  add column if not exists reviewed_by uuid references public.profiles(id),
  add column if not exists reviewed_at timestamptz,
  add column if not exists published_by uuid references public.profiles(id);

alter table public.work_schedules
  add column if not exists source_generation_id uuid references public.schedule_generation_runs(id),
  add column if not exists source_generation_assignment_id uuid references public.schedule_generation_assignments(id);

create index if not exists idx_work_schedules_source_generation
  on public.work_schedules(source_generation_id)
  where source_generation_id is not null;

create unique index if not exists uq_work_schedules_source_generation_assignment
  on public.work_schedules(source_generation_assignment_id)
  where source_generation_assignment_id is not null;

create or replace function public.create_schedule_generation(
  p_store_id uuid,
  p_week_start date,
  p_algorithm_version text default 'RULE_V1'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_id uuid;
  v_status text;
  v_active_count integer;
  v_role text := public.current_user_role();
  v_algorithm text := coalesce(nullif(trim(p_algorithm_version),''),'RULE_V1');
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if not exists(select 1 from public.profiles where id=auth.uid() and status='ACTIVE' and role=v_role) then
    raise exception 'ACTOR_NOT_ACTIVE';
  end if;
  if p_store_id is null or p_week_start is null then raise exception 'GENERATION_FIELDS_REQUIRED'; end if;
  if extract(isodow from p_week_start)<>1 then raise exception 'WEEK_START_MUST_BE_MONDAY'; end if;
  if not exists(select 1 from public.stores where id=p_store_id and status='ACTIVE') then raise exception 'STORE_NOT_ACTIVE'; end if;
  if not coalesce(public.can_access_store(p_store_id),false) then raise exception 'STORE_NOT_ALLOWED'; end if;

  perform pg_advisory_xact_lock(hashtextextended('workforce_schedule:'||p_store_id::text||':'||p_week_start::text,0));

  select count(*)
    into v_active_count
    from public.schedule_generation_runs
   where store_id=p_store_id
     and week_start=p_week_start
     and status in ('DRAFT','REVIEWED','PUBLISHED');

  if v_active_count>1 then
    raise exception 'GENERATION_VERSION_CONFLICT';
  end if;

  if v_active_count=1 then
    select id,status
      into v_id,v_status
      from public.schedule_generation_runs
     where store_id=p_store_id
       and week_start=p_week_start
       and status in ('DRAFT','REVIEWED','PUBLISHED')
     order by created_at desc,id desc
     limit 1;

    if v_status='DRAFT' then
      return v_id;
    elsif v_status='REVIEWED' then
      raise exception 'GENERATION_ALREADY_REVIEWED';
    else
      raise exception 'GENERATION_ALREADY_PUBLISHED';
    end if;
  end if;

  insert into public.schedule_generation_runs(
    store_id,week_start,week_end,algorithm_version,status,created_by,updated_at
  ) values(
    p_store_id,p_week_start,p_week_start+6,v_algorithm,'DRAFT',auth.uid(),now()
  )
  returning id into v_id;

  return v_id;
end;
$function$;

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
    select a.user_id,a.work_date,
           count(*)::integer
           + (
             select count(*)::integer
             from public.work_schedules ws
             where ws.user_id=a.user_id
               and ws.work_date=a.work_date
               and ws.status in ('PENDING','APPROVED')
           ) as total_count
    from public.schedule_generation_assignments a
    where a.generation_id=p_generation_id
    group by a.user_id,a.work_date
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

create or replace function public.replace_schedule_generation_assignments(
  p_generation_id uuid,
  p_assignments jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_role text := public.current_user_role();
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
  if not exists(select 1 from public.profiles where id=auth.uid() and status='ACTIVE' and role=v_role) then
    raise exception 'ACTOR_NOT_ACTIVE';
  end if;
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
  if not coalesce(public.can_access_store(v_store),false) then raise exception 'STORE_NOT_ALLOWED'; end if;
  if not exists(select 1 from public.stores where id=v_store and status='ACTIVE') then raise exception 'STORE_NOT_ACTIVE'; end if;

  delete from public.schedule_generation_assignments
   where generation_id=p_generation_id;

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
    if not exists(select 1 from public.profiles where id=v_user) then raise exception 'ASSIGNMENT_EMPLOYEE_NOT_FOUND'; end if;

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

create or replace function public.review_schedule_generation(
  p_generation_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_run public.schedule_generation_runs%rowtype;
  v_role text := public.current_user_role();
  v_result jsonb;
  v_decision text := upper(trim(coalesce(p_decision,'')));
  v_status text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if not exists(select 1 from public.profiles where id=auth.uid() and status='ACTIVE' and role=v_role) then
    raise exception 'ACTOR_NOT_ACTIVE';
  end if;
  if v_decision not in ('APPROVED','REJECTED') then raise exception 'INVALID_REVIEW_DECISION'; end if;

  select * into v_run
  from public.schedule_generation_runs
  where id=p_generation_id
  for update;

  if not found then raise exception 'GENERATION_NOT_FOUND'; end if;
  if not coalesce(public.can_access_store(v_run.store_id),false) then raise exception 'STORE_NOT_ALLOWED'; end if;

  perform pg_advisory_xact_lock(hashtextextended('workforce_schedule:'||v_run.store_id::text||':'||v_run.week_start::text,0));

  if v_decision='APPROVED' and v_run.status='REVIEWED' then
    return jsonb_build_object('generation_id',p_generation_id,'status','REVIEWED','already_reviewed',true);
  end if;
  if v_decision='REJECTED' and v_run.status='CANCELLED' then
    return jsonb_build_object('generation_id',p_generation_id,'status','CANCELLED','already_cancelled',true);
  end if;
  if v_run.status<>'DRAFT' then raise exception 'GENERATION_NOT_DRAFT'; end if;

  if v_decision='REJECTED' then
    update public.schedule_generation_runs
       set status='CANCELLED',reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now()
     where id=p_generation_id and status='DRAFT';
    if not found then raise exception 'GENERATION_REVIEW_CONFLICT'; end if;
    return jsonb_build_object('generation_id',p_generation_id,'status','CANCELLED','rejected',true);
  end if;

  v_result := public.validate_schedule_generation_v1(p_generation_id);
  if not coalesce((v_result->>'valid')::boolean,false) then
    raise exception 'GENERATION_VALIDATION_FAILED: %',v_result->'violations';
  end if;

  update public.schedule_generation_runs
     set status='REVIEWED',reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now()
   where id=p_generation_id and status='DRAFT';

  if not found then raise exception 'GENERATION_REVIEW_CONFLICT'; end if;

  return jsonb_build_object(
    'generation_id',p_generation_id,
    'status','REVIEWED',
    'already_reviewed',false,
    'validation',v_result
  );
end;
$function$;

create or replace function public.publish_schedule_generation(p_generation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_run public.schedule_generation_runs%rowtype;
  v_role text := public.current_user_role();
  v_result jsonb;
  v_inserted integer := 0;
  v_official_count integer := 0;
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

  perform pg_advisory_xact_lock(hashtextextended('workforce_schedule:'||v_run.store_id::text||':'||v_run.week_start::text,0));

  if v_run.status='PUBLISHED' then
    select count(*) into v_official_count
    from public.work_schedules
    where source_generation_id=p_generation_id;
    return jsonb_build_object(
      'generation_id',p_generation_id,
      'status','PUBLISHED',
      'published',true,
      'already_published',true,
      'inserted_schedule_count',0,
      'official_schedule_count',v_official_count
    );
  end if;

  if v_run.status<>'REVIEWED' then raise exception 'GENERATION_MUST_BE_REVIEWED'; end if;

  v_result := public.validate_schedule_generation_v1(p_generation_id);
  if not coalesce((v_result->>'valid')::boolean,false) then
    update public.schedule_generation_runs
       set status='DRAFT',reviewed_by=null,reviewed_at=null,updated_at=now()
     where id=p_generation_id and status='REVIEWED';

    return jsonb_build_object(
      'generation_id',p_generation_id,
      'status','DRAFT',
      'published',false,
      'already_published',false,
      'validation',v_result
    );
  end if;

  insert into public.work_schedules(
    work_date,start_time,end_time,store_id,user_id,status,
    approver_id,approved_at,note,origin,
    source_generation_id,source_generation_assignment_id
  )
  select
    a.work_date,a.start_time,a.end_time,a.store_id,a.user_id,'APPROVED',
    auth.uid(),now(),a.note,'MANAGER_ASSIGNED',
    p_generation_id,a.id
  from public.schedule_generation_assignments a
  where a.generation_id=p_generation_id
  order by a.work_date,a.start_time,a.user_id,a.id;

  get diagnostics v_inserted=row_count;

  update public.schedule_generation_runs
     set status='PUBLISHED',
         published_at=now(),
         published_by=auth.uid(),
         updated_at=now(),
         total_hours=coalesce((
           select sum(extract(epoch from(end_time-start_time))/3600.0)
           from public.schedule_generation_assignments
           where generation_id=p_generation_id
         ),0)
   where id=p_generation_id
     and status='REVIEWED';

  if not found then raise exception 'GENERATION_PUBLISH_CONFLICT'; end if;

  return jsonb_build_object(
    'generation_id',p_generation_id,
    'status','PUBLISHED',
    'published',true,
    'already_published',false,
    'inserted_schedule_count',v_inserted,
    'official_schedule_count',v_inserted,
    'validation',v_result
  );
end;
$function$;

revoke execute on function public.create_schedule_generation(uuid,date,text) from public,anon;
revoke execute on function public.replace_schedule_generation_assignments(uuid,jsonb) from public,anon;
revoke execute on function public.validate_schedule_generation_v1(uuid) from public,anon;
revoke execute on function public.review_schedule_generation(uuid,text) from public,anon;
revoke execute on function public.publish_schedule_generation(uuid) from public,anon;

grant execute on function public.create_schedule_generation(uuid,date,text) to authenticated;
grant execute on function public.replace_schedule_generation_assignments(uuid,jsonb) to authenticated;
grant execute on function public.validate_schedule_generation_v1(uuid) to authenticated;
grant execute on function public.review_schedule_generation(uuid,text) to authenticated;
grant execute on function public.publish_schedule_generation(uuid) to authenticated;

-- SCHED-02 — Three-role scheduling authority lock.
-- Canonical truth unchanged:
-- Employee Availability -> generation runs/assignments -> validate -> review -> publish -> work_schedules.

create or replace function public.can_access_store(target_store_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path=public
as $function$
declare
  v_role text;
  v_status text;
  v_scope text;
  v_code text;
begin
  if auth.uid() is null or target_store_id is null then return false; end if;

  select upper(coalesce(p.role,'')),p.status,coalesce(p.access_scope,'')
    into v_role,v_status,v_scope
    from public.profiles p
   where p.id=auth.uid();

  if not found or v_status<>'ACTIVE' then return false; end if;
  if v_role='OWNER' then return true; end if;
  if v_role<>'STORE_MANAGER' then return false; end if;

  select upper(s.code) into v_code
  from public.stores s
  where s.id=target_store_id;
  if v_code is null then return false; end if;

  return exists(
    select 1
    from regexp_split_to_table(upper(v_scope),'[,; ]+') token
    where token in ('ALL','*',v_code)
  );
end;
$function$;

create or replace function public.manager_has_store_access(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $function$
  select coalesce(public.can_access_store(p_store_id),false)
     and upper(coalesce(public.current_user_role(),'')) in ('OWNER','STORE_MANAGER');
$function$;

create or replace function public.get_manager_accessible_stores()
returns table(id uuid,code text,name text,status text)
language plpgsql
stable
security definer
set search_path=public
as $function$
declare v_role text := upper(coalesce(public.current_user_role(),''));
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(
    select 1 from public.profiles p
    where p.id=auth.uid() and p.status='ACTIVE'
      and upper(coalesce(p.role,''))=v_role
  ) then raise exception 'ACTOR_NOT_ACTIVE'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;

  return query
  select s.id,s.code,s.name,s.status
  from public.stores s
  where s.status='ACTIVE' and public.can_access_store(s.id)
  order by s.code;
end;
$function$;

create or replace function public.get_manager_weekly_availability(
  p_store_id uuid default null,p_week_start date default null
)
returns table(
  availability_id uuid,work_date date,start_time time,end_time time,
  user_id uuid,employee_name text,username text,
  preferred_store_id uuid,preferred_store_code text,preferred_store_name text,
  availability_type text,note text
)
language plpgsql
stable
security definer
set search_path=public
as $function$
declare
  v_role text := upper(coalesce(public.current_user_role(),''));
  v_week_start date := coalesce(
    p_week_start,
    ((now() at time zone 'Asia/Ho_Chi_Minh')::date
      - (extract(isodow from (now() at time zone 'Asia/Ho_Chi_Minh')::date)::integer - 1))
  );
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(
    select 1 from public.profiles p
    where p.id=auth.uid() and p.status='ACTIVE'
      and upper(coalesce(p.role,''))=v_role
  ) then raise exception 'ACTOR_NOT_ACTIVE'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if extract(isodow from v_week_start)<>1 then raise exception 'WEEK_START_MUST_BE_MONDAY'; end if;
  if v_role='STORE_MANAGER' and p_store_id is null then raise exception 'STORE_REQUIRED_FOR_MANAGER'; end if;
  if p_store_id is not null and not public.can_access_store(p_store_id) then raise exception 'STORE_NOT_ALLOWED'; end if;

  return query
  select ea.id,ea.work_date,ea.start_time,ea.end_time,ea.user_id,
         coalesce(p.full_name,p.username),p.username,
         ea.preferred_store_id,s.code,s.name,ea.availability_type,ea.note
  from public.employee_availability ea
  join public.profiles p on p.id=ea.user_id
  left join public.stores s on s.id=ea.preferred_store_id
  where ea.work_date between v_week_start and v_week_start+6
    and p.status='ACTIVE'
    and (
      (v_role='OWNER' and (p_store_id is null or ea.preferred_store_id=p_store_id))
      or (v_role='STORE_MANAGER' and ea.preferred_store_id=p_store_id)
    )
  order by ea.work_date,ea.start_time,ea.end_time,coalesce(s.code,''),coalesce(p.full_name,p.username),ea.id;
end;
$function$;

create or replace function public.get_manager_weekly_schedule(
  p_store_id uuid default null,p_week_start date default null
)
returns table(
  schedule_id uuid,work_date date,start_time time,end_time time,
  store_id uuid,store_code text,store_name text,user_id uuid,
  employee_name text,status text,origin text
)
language plpgsql
stable
security definer
set search_path=public
as $function$
declare
  v_role text := upper(coalesce(public.current_user_role(),''));
  v_week_start date := coalesce(
    p_week_start,
    ((now() at time zone 'Asia/Ho_Chi_Minh')::date
      - (extract(isodow from (now() at time zone 'Asia/Ho_Chi_Minh')::date)::integer - 1))
  );
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(
    select 1 from public.profiles p
    where p.id=auth.uid() and p.status='ACTIVE'
      and upper(coalesce(p.role,''))=v_role
  ) then raise exception 'ACTOR_NOT_ACTIVE'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if extract(isodow from v_week_start)<>1 then raise exception 'WEEK_START_MUST_BE_MONDAY'; end if;
  if v_role='STORE_MANAGER' and p_store_id is null then raise exception 'STORE_REQUIRED_FOR_MANAGER'; end if;
  if p_store_id is not null and not public.can_access_store(p_store_id) then raise exception 'STORE_NOT_ALLOWED'; end if;

  return query
  select ws.id,ws.work_date,ws.start_time,ws.end_time,ws.store_id,
         s.code,s.name,ws.user_id,p.full_name,ws.status,ws.origin
  from public.work_schedules ws
  join public.stores s on s.id=ws.store_id
  join public.profiles p on p.id=ws.user_id
  where ws.status='APPROVED'
    and ws.work_date between v_week_start and v_week_start+6
    and public.can_access_store(ws.store_id)
    and (p_store_id is null or ws.store_id=p_store_id)
  order by ws.work_date,ws.start_time,ws.end_time,s.code,p.full_name,ws.id;
end;
$function$;

create or replace function public.list_schedule_generations(
  p_store_id uuid default null,p_week_start date default null
)
returns table(
  id uuid,store_id uuid,store_code text,store_name text,week_start date,week_end date,
  algorithm_version text,status text,total_hours numeric,estimated_cost numeric,
  coverage_score numeric,skill_coverage_score numeric,created_by uuid,created_at timestamptz
)
language plpgsql
stable
security definer
set search_path=public
as $function$
declare v_role text := upper(coalesce(public.current_user_role(),''));
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(
    select 1 from public.profiles p
    where p.id=auth.uid() and p.status='ACTIVE'
      and upper(coalesce(p.role,''))=v_role
  ) then raise exception 'ACTOR_NOT_ACTIVE'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if v_role='STORE_MANAGER' and p_store_id is null then raise exception 'STORE_REQUIRED_FOR_MANAGER'; end if;
  if p_store_id is not null and not public.can_access_store(p_store_id) then raise exception 'STORE_NOT_ALLOWED'; end if;

  return query
  select sgr.id,sgr.store_id,s.code,s.name,sgr.week_start,sgr.week_end,
         sgr.algorithm_version,sgr.status,sgr.total_hours,sgr.estimated_cost,
         sgr.coverage_score,sgr.skill_coverage_score,sgr.created_by,sgr.created_at
  from public.schedule_generation_runs sgr
  left join public.stores s on s.id=sgr.store_id
  where (p_store_id is null or sgr.store_id=p_store_id)
    and (p_week_start is null or sgr.week_start=p_week_start)
    and public.can_access_store(sgr.store_id)
  order by sgr.week_start desc,sgr.created_at desc,sgr.id desc;
end;
$function$;

create or replace function public.get_schedule_generation(p_generation_id uuid)
returns table(
  id uuid,store_id uuid,store_code text,store_name text,week_start date,week_end date,
  algorithm_version text,status text,total_hours numeric,estimated_cost numeric,
  coverage_score numeric,skill_coverage_score numeric,created_by uuid,created_at timestamptz,published_at timestamptz
)
language plpgsql
stable
security definer
set search_path=public
as $function$
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
  select sgr.id,sgr.store_id,s.code,s.name,sgr.week_start,sgr.week_end,
         sgr.algorithm_version,sgr.status,sgr.total_hours,sgr.estimated_cost,
         sgr.coverage_score,sgr.skill_coverage_score,sgr.created_by,sgr.created_at,sgr.published_at
  from public.schedule_generation_runs sgr
  left join public.stores s on s.id=sgr.store_id
  where sgr.id=p_generation_id;
end;
$function$;

create or replace function public.get_schedule_generation_assignments(p_generation_id uuid)
returns table(
  id uuid,generation_id uuid,user_id uuid,employee_name text,
  store_id uuid,store_code text,work_date date,start_time time,end_time time,
  skill_code text,skill_level integer,score numeric,warning text,status text,note text
)
language plpgsql
stable
security definer
set search_path=public
as $function$
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

create or replace function public.get_my_availability(p_week_start date default null)
returns table(
  id uuid,work_date date,start_time time,end_time time,
  preferred_store_id uuid,availability_type text,note text,updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path=public
as $function$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(
    select 1 from public.profiles p
    where p.id=auth.uid() and p.status='ACTIVE'
      and upper(coalesce(p.role,'')) in ('STAFF','EMPLOYEE')
  ) then raise exception 'EMPLOYEE_NOT_ACTIVE'; end if;

  return query
  select ea.id,ea.work_date,ea.start_time,ea.end_time,
         ea.preferred_store_id,ea.availability_type,ea.note,ea.updated_at
  from public.employee_availability ea
  where ea.user_id=auth.uid()
    and (p_week_start is null or ea.work_date between p_week_start and p_week_start+6)
  order by ea.work_date,ea.start_time,ea.end_time,ea.id;
end;
$function$;

create or replace function public.save_my_availability(
  p_availability_id uuid default null,p_work_date date default null,
  p_start_time time default null,p_end_time time default null,
  p_availability_type text default 'AVAILABLE',
  p_preferred_store_id uuid default null,p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $function$
declare
  v_id uuid;
  v_user uuid := auth.uid();
  v_type text := upper(coalesce(trim(p_availability_type),'AVAILABLE'));
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(
    select 1 from public.profiles p
    where p.id=v_user and p.status='ACTIVE'
      and upper(coalesce(p.role,'')) in ('STAFF','EMPLOYEE')
  ) then raise exception 'EMPLOYEE_NOT_ACTIVE'; end if;
  if p_work_date is null or p_start_time is null or p_end_time is null then raise exception 'AVAILABILITY_TIME_REQUIRED'; end if;
  if p_end_time<=p_start_time then raise exception 'INVALID_AVAILABILITY_INTERVAL'; end if;
  if v_type not in ('AVAILABLE','UNAVAILABLE','PREFERRED') then raise exception 'INVALID_AVAILABILITY_TYPE'; end if;
  if p_preferred_store_id is not null and not exists(
    select 1 from public.stores s where s.id=p_preferred_store_id and s.status='ACTIVE'
  ) then raise exception 'STORE_NOT_ACTIVE'; end if;

  if p_availability_id is null then
    insert into public.employee_availability(
      user_id,work_date,start_time,end_time,preferred_store_id,availability_type,note
    ) values(
      v_user,p_work_date,p_start_time,p_end_time,p_preferred_store_id,v_type,p_note
    ) returning id into v_id;
  else
    update public.employee_availability
       set work_date=p_work_date,start_time=p_start_time,end_time=p_end_time,
           preferred_store_id=p_preferred_store_id,availability_type=v_type,
           note=p_note,updated_at=now()
     where id=p_availability_id and user_id=v_user
     returning id into v_id;
    if v_id is null then raise exception 'AVAILABILITY_NOT_FOUND'; end if;
  end if;
  return v_id;
end;
$function$;

create or replace function public.delete_my_availability(p_availability_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $function$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(
    select 1 from public.profiles p
    where p.id=auth.uid() and p.status='ACTIVE'
      and upper(coalesce(p.role,'')) in ('STAFF','EMPLOYEE')
  ) then raise exception 'EMPLOYEE_NOT_ACTIVE'; end if;

  delete from public.employee_availability ea
  where ea.id=p_availability_id and ea.user_id=auth.uid();
  return found;
end;
$function$;

create or replace function public.list_my_approved_schedules_v2(p_week_start date default null)
returns table(
  schedule_id uuid,work_date date,start_time time,end_time time,
  store_id uuid,store_code text,store_name text,status text,origin text
)
language plpgsql
stable
security definer
set search_path=public
as $function$
declare
  v_week_start date := coalesce(
    p_week_start,
    ((now() at time zone 'Asia/Ho_Chi_Minh')::date
      - (extract(isodow from (now() at time zone 'Asia/Ho_Chi_Minh')::date)::integer - 1))
  );
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(
    select 1 from public.profiles p
    where p.id=auth.uid() and p.status='ACTIVE'
      and upper(coalesce(p.role,'')) in ('STAFF','EMPLOYEE')
  ) then raise exception 'EMPLOYEE_NOT_ACTIVE'; end if;
  if extract(isodow from v_week_start)<>1 then raise exception 'WEEK_START_MUST_BE_MONDAY'; end if;

  return query
  select ws.id,ws.work_date,ws.start_time,ws.end_time,
         ws.store_id,s.code,s.name,ws.status,ws.origin
  from public.work_schedules ws
  join public.stores s on s.id=ws.store_id
  where ws.user_id=auth.uid()
    and ws.status='APPROVED'
    and ws.work_date between v_week_start and v_week_start+6
  order by ws.work_date,ws.start_time,ws.end_time,ws.id;
end;
$function$;

alter table public.employee_availability enable row level security;
alter table public.work_schedules enable row level security;

drop policy if exists employee_availability_select on public.employee_availability;
drop policy if exists employee_availability_write on public.employee_availability;
create policy employee_availability_select_self
  on public.employee_availability for select to authenticated
  using (
    user_id=auth.uid()
    and exists(
      select 1 from public.profiles p
      where p.id=auth.uid() and p.status='ACTIVE'
        and upper(coalesce(p.role,'')) in ('STAFF','EMPLOYEE')
    )
  );
create policy employee_availability_write_self
  on public.employee_availability for all to authenticated
  using (
    user_id=auth.uid()
    and exists(
      select 1 from public.profiles p
      where p.id=auth.uid() and p.status='ACTIVE'
        and upper(coalesce(p.role,'')) in ('STAFF','EMPLOYEE')
    )
  )
  with check (
    user_id=auth.uid()
    and exists(
      select 1 from public.profiles p
      where p.id=auth.uid() and p.status='ACTIVE'
        and upper(coalesce(p.role,'')) in ('STAFF','EMPLOYEE')
    )
  );

drop policy if exists schedules_insert on public.work_schedules;
drop policy if exists schedules_update on public.work_schedules;

revoke all on table public.employee_availability from anon,authenticated;
revoke all on table public.schedule_generation_runs from anon,authenticated;
revoke all on table public.schedule_generation_assignments from anon,authenticated;
revoke all on table public.work_schedules from anon,authenticated;
revoke all on table public.staffing_requirement_templates from anon,authenticated;

revoke execute on function public.can_access_store(uuid) from public,anon;
grant execute on function public.can_access_store(uuid) to authenticated;
revoke execute on function public.manager_has_store_access(uuid) from public,anon;
grant execute on function public.manager_has_store_access(uuid) to authenticated;
revoke execute on function public.get_manager_accessible_stores() from public,anon;
grant execute on function public.get_manager_accessible_stores() to authenticated;
revoke execute on function public.get_manager_weekly_availability(uuid,date) from public,anon;
grant execute on function public.get_manager_weekly_availability(uuid,date) to authenticated;
revoke execute on function public.get_manager_weekly_schedule(uuid,date) from public,anon;
grant execute on function public.get_manager_weekly_schedule(uuid,date) to authenticated;
revoke execute on function public.list_schedule_generations(uuid,date) from public,anon;
grant execute on function public.list_schedule_generations(uuid,date) to authenticated;
revoke execute on function public.get_schedule_generation(uuid) from public,anon;
grant execute on function public.get_schedule_generation(uuid) to authenticated;
revoke execute on function public.get_schedule_generation_assignments(uuid) from public,anon;
grant execute on function public.get_schedule_generation_assignments(uuid) to authenticated;
revoke execute on function public.get_my_availability(date) from public,anon;
grant execute on function public.get_my_availability(date) to authenticated;
revoke execute on function public.save_my_availability(uuid,date,time,time,text,uuid,text) from public,anon;
grant execute on function public.save_my_availability(uuid,date,time,time,text,uuid,text) to authenticated;
revoke execute on function public.delete_my_availability(uuid) from public,anon;
grant execute on function public.delete_my_availability(uuid) to authenticated;
revoke execute on function public.list_my_approved_schedules_v2(date) from public,anon;
grant execute on function public.list_my_approved_schedules_v2(date) to authenticated;

revoke execute on function public.manager_update_employee_availability(uuid,time,time,uuid,text) from public,anon,authenticated;
revoke execute on function public.create_store_transfer_request(uuid,uuid,time,time,text) from public,anon,authenticated;
revoke execute on function public.review_store_transfer_request(uuid,boolean,text) from public,anon,authenticated;
revoke execute on function public.get_manager_transfer_requests(date) from public,anon,authenticated;
revoke execute on function public.auto_generate_schedule_generation(uuid,date,text) from public,anon,authenticated;
revoke execute on function public.cancel_schedule_generation(uuid) from public,anon,authenticated;
revoke execute on function public.upsert_workforce_staffing_requirement(uuid,uuid,date,time,time,text,integer,integer,integer,integer,text,text) from public,anon,authenticated;
revoke execute on function public.delete_workforce_staffing_requirement(uuid) from public,anon,authenticated;
revoke execute on function public.get_my_schedule() from public,anon,authenticated;
revoke execute on function public.list_my_approved_schedules_v1() from public,anon,authenticated;

comment on function public.manager_update_employee_availability(uuid,time,time,uuid,text)
  is 'SCHED-02 DEPRECATED: Employee Availability is self-write only; no browser execution.';
comment on function public.create_store_transfer_request(uuid,uuid,time,time,text)
  is 'SCHED-02 DEPRECATED: legacy Manager/Owner Availability mutation path; no browser execution.';
comment on function public.review_store_transfer_request(uuid,boolean,text)
  is 'SCHED-02 DEPRECATED: legacy Manager/Owner Availability mutation path; no browser execution.';
comment on function public.auto_generate_schedule_generation(uuid,date,text)
  is 'SCHED-02 DEPRECATED AS ACTIVE WRITER: Manager Direct canonical writer is create/replace/validate/review/publish.';
comment on function public.cancel_schedule_generation(uuid)
  is 'SCHED-02 DEPRECATED: use review_schedule_generation(...,REJECTED) canonical state transition.';
comment on function public.get_my_schedule()
  is 'SCHED-02 DEPRECATED: use list_my_approved_schedules_v2(date).';
comment on function public.list_my_approved_schedules_v1()
  is 'SCHED-02 DEPRECATED: use list_my_approved_schedules_v2(date).';

-- MER-001 — Canonical Employee Workforce Profile projection.
-- One profile truth for Manager, Employee and Cross-store Scheduler.
-- Removes invalid UUID aggregate usage and prevents page-specific primary-store derivation.

create or replace function public.employee_workforce_profile_projection_v1(
  p_user_id uuid
)
returns table(
  employee_id uuid,
  username text,
  full_name text,
  phone text,
  employee_role text,
  profile_status text,
  join_date date,
  primary_store_id uuid,
  primary_store_code text,
  primary_store_name text,
  priority_store_ids uuid[],
  priority_store_codes text[],
  priority_store_names text[],
  employee_level text,
  pay_rule_reference text,
  store_priority_updated_at timestamptz
)
language sql
stable
security definer
set search_path=public
as $function$
  select
    p.id,
    p.username,
    p.full_name,
    p.phone,
    p.role,
    p.status,
    null::date as join_date,

    (
      select esp.store_id
      from public.employee_store_priorities esp
      where esp.employee_id=p.id
      order by esp.priority,esp.store_id
      limit 1
    ) as primary_store_id,

    (
      select s.code
      from public.employee_store_priorities esp
      join public.stores s on s.id=esp.store_id
      where esp.employee_id=p.id
      order by esp.priority,esp.store_id
      limit 1
    ) as primary_store_code,

    (
      select s.name
      from public.employee_store_priorities esp
      join public.stores s on s.id=esp.store_id
      where esp.employee_id=p.id
      order by esp.priority,esp.store_id
      limit 1
    ) as primary_store_name,

    coalesce((
      select array_agg(x.store_id order by x.priority)
      from public.employee_store_priorities x
      where x.employee_id=p.id
    ),'{}'::uuid[]) as priority_store_ids,

    coalesce((
      select array_agg(s.code order by x.priority)
      from public.employee_store_priorities x
      join public.stores s on s.id=x.store_id
      where x.employee_id=p.id
    ),'{}'::text[]) as priority_store_codes,

    coalesce((
      select array_agg(s.name order by x.priority)
      from public.employee_store_priorities x
      join public.stores s on s.id=x.store_id
      where x.employee_id=p.id
    ),'{}'::text[]) as priority_store_names,

    eg.grade as employee_level,
    null::text as pay_rule_reference,

    (
      select max(x.updated_at)
      from public.employee_store_priorities x
      where x.employee_id=p.id
    ) as store_priority_updated_at

  from public.profiles p
  left join public.employee_grades eg
    on eg.user_id=p.id and eg.status='ACTIVE'
  where p.id=p_user_id
    and upper(coalesce(p.role,'')) in ('STAFF','EMPLOYEE');
$function$;

revoke execute on function public.employee_workforce_profile_projection_v1(uuid)
  from public,anon,authenticated;
grant execute on function public.employee_workforce_profile_projection_v1(uuid)
  to postgres;

-- Compatibility projection now delegates to the single canonical Workforce profile.
create or replace function public.employee_profile_projection_row_v1(
  p_user_id uuid
)
returns table(
  employee_id uuid,
  username text,
  full_name text,
  phone text,
  employee_role text,
  profile_status text,
  join_date date,
  primary_store_id uuid,
  primary_store_code text,
  primary_store_name text,
  employee_level text,
  pay_rule_reference text
)
language sql
stable
security definer
set search_path=public
as $function$
  select
    x.employee_id,
    x.username,
    x.full_name,
    x.phone,
    x.employee_role,
    x.profile_status,
    x.join_date,
    x.primary_store_id,
    x.primary_store_code,
    x.primary_store_name,
    x.employee_level,
    x.pay_rule_reference
  from public.employee_workforce_profile_projection_v1(p_user_id) x;
$function$;

revoke execute on function public.employee_profile_projection_row_v1(uuid)
  from public,anon,authenticated;
grant execute on function public.employee_profile_projection_row_v1(uuid)
  to postgres;

-- Manager/Owner Employee projection used by the Staff surface.
create or replace function public.list_employee_store_priority_profiles_v1()
returns table(
  employee_id uuid,
  username text,
  full_name text,
  phone text,
  employee_role text,
  profile_status text,
  primary_store_id uuid,
  primary_store_code text,
  primary_store_name text,
  priority_store_ids uuid[],
  priority_store_codes text[],
  priority_store_names text[]
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
    select 1 from public.profiles p
    where p.id=auth.uid()
      and p.status='ACTIVE'
      and upper(coalesce(p.role,''))=v_role
  ) then raise exception 'ACTOR_NOT_ACTIVE'; end if;

  return query
  select
    x.employee_id,
    x.username,
    x.full_name,
    x.phone,
    x.employee_role,
    x.profile_status,
    x.primary_store_id,
    x.primary_store_code,
    x.primary_store_name,
    x.priority_store_ids,
    x.priority_store_codes,
    x.priority_store_names
  from public.profiles p
  join lateral public.employee_workforce_profile_projection_v1(p.id) x on true
  where upper(coalesce(p.role,'')) in ('STAFF','EMPLOYEE')
    and (
      v_role='OWNER'
      or cardinality(x.priority_store_ids)=0
      or exists(
        select 1
        from unnest(x.priority_store_ids) sid
        where public.can_access_store(sid)
      )
    )
  order by lower(x.full_name),lower(x.username),x.employee_id;
end;
$function$;

-- Employee read-only Store Priority projection delegates to the same source.
create or replace function public.get_my_store_priority_profile_v1()
returns table(
  employee_id uuid,
  primary_store_id uuid,
  primary_store_code text,
  primary_store_name text,
  priority_store_ids uuid[],
  priority_store_codes text[],
  priority_store_names text[]
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
    where p.id=auth.uid()
      and p.status='ACTIVE'
      and upper(coalesce(p.role,'')) in ('STAFF','EMPLOYEE')
  ) then raise exception 'EMPLOYEE_NOT_ACTIVE'; end if;

  return query
  select
    x.employee_id,
    x.primary_store_id,
    x.primary_store_code,
    x.primary_store_name,
    x.priority_store_ids,
    x.priority_store_codes,
    x.priority_store_names
  from public.employee_workforce_profile_projection_v1(auth.uid()) x;
end;
$function$;

-- Legacy Manager profile projection also delegates to the same source.
create or replace function public.list_employee_profile_projection_v1(
  p_store_id uuid default null
)
returns table(
  employee_id uuid,
  username text,
  full_name text,
  phone text,
  employee_role text,
  profile_status text,
  join_date date,
  primary_store_id uuid,
  primary_store_code text,
  primary_store_name text,
  employee_level text,
  pay_rule_reference text
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
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'PROFILE_VIEW_ROLE_NOT_ALLOWED'; end if;
  if not exists(
    select 1 from public.profiles p
    where p.id=auth.uid() and p.status='ACTIVE' and upper(coalesce(p.role,''))=v_role
  ) then raise exception 'PROFILE_VIEWER_INACTIVE'; end if;
  if p_store_id is not null and not public.can_access_store(p_store_id) then
    raise exception 'STORE_NOT_ALLOWED';
  end if;

  return query
  select
    x.employee_id,x.username,x.full_name,x.phone,x.employee_role,x.profile_status,
    x.join_date,x.primary_store_id,x.primary_store_code,x.primary_store_name,
    x.employee_level,x.pay_rule_reference
  from public.profiles p
  join lateral public.employee_workforce_profile_projection_v1(p.id) x on true
  where upper(coalesce(p.role,'')) in ('STAFF','EMPLOYEE')
    and (
      p_store_id is null
      or p_store_id=any(x.priority_store_ids)
    )
  order by lower(x.full_name),lower(x.username),x.employee_id;
end;
$function$;

-- Cross-store Availability now reads Store Priority from the same projection.
create or replace function public.get_cross_store_weekly_availability_v1(
  p_week_start date default null
)
returns table(
  availability_id uuid,
  work_date date,
  start_time time,
  end_time time,
  user_id uuid,
  employee_name text,
  username text,
  primary_store_id uuid,
  primary_store_code text,
  priority_store_ids uuid[],
  priority_store_codes text[],
  availability_type text,
  note text
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
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if not exists(
    select 1 from public.profiles p
    where p.id=auth.uid() and p.status='ACTIVE' and upper(coalesce(p.role,''))=v_role
  ) then raise exception 'ACTOR_NOT_ACTIVE'; end if;
  if extract(isodow from v_week_start)<>1 then raise exception 'WEEK_START_MUST_BE_MONDAY'; end if;

  return query
  select
    ea.id,
    ea.work_date,
    ea.start_time,
    ea.end_time,
    ea.user_id,
    coalesce(x.full_name,x.username),
    x.username,
    x.primary_store_id,
    x.primary_store_code,
    x.priority_store_ids,
    x.priority_store_codes,
    ea.availability_type,
    ea.note
  from public.employee_availability ea
  join lateral public.employee_workforce_profile_projection_v1(ea.user_id) x on true
  where ea.work_date between v_week_start and v_week_start+6
    and x.profile_status='ACTIVE'
    and (
      v_role='OWNER'
      or cardinality(x.priority_store_ids)=0
      or exists(
        select 1
        from unnest(x.priority_store_ids) sid
        where public.can_access_store(sid)
      )
    )
  order by ea.work_date,ea.start_time,ea.end_time,coalesce(x.full_name,x.username),ea.id;
end;
$function$;

revoke execute on function public.list_employee_store_priority_profiles_v1()
  from public,anon;
grant execute on function public.list_employee_store_priority_profiles_v1()
  to authenticated;

revoke execute on function public.get_my_store_priority_profile_v1()
  from public,anon;
grant execute on function public.get_my_store_priority_profile_v1()
  to authenticated;

revoke execute on function public.list_employee_profile_projection_v1(uuid)
  from public,anon;
grant execute on function public.list_employee_profile_projection_v1(uuid)
  to authenticated;

revoke execute on function public.get_cross_store_weekly_availability_v1(date)
  from public,anon;
grant execute on function public.get_cross_store_weekly_availability_v1(date)
  to authenticated;

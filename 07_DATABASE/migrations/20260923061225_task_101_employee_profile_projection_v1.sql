-- MAGASIN Workforce Operations V1 — TASK-101 Employee Profile Projection V1
-- Read-only operational profile projection. No payroll calculation or profile mutation is introduced.

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
set search_path = public
as $$
  select
    p.id as employee_id,
    p.username,
    p.full_name,
    p.phone,
    p.role as employee_role,
    p.status as profile_status,
    null::date as join_date,
    ec.preferred_store_id as primary_store_id,
    s.code as primary_store_code,
    s.name as primary_store_name,
    eg.grade as employee_level,
    null::text as pay_rule_reference
  from public.profiles p
  left join public.employee_constraints ec
    on ec.user_id = p.id
   and ec.status = 'ACTIVE'
  left join public.stores s
    on s.id = ec.preferred_store_id
  left join public.employee_grades eg
    on eg.user_id = p.id
   and eg.status = 'ACTIVE'
  where p.id = p_user_id
    and p.role in ('STAFF','EMPLOYEE');
$$;

revoke execute on function public.employee_profile_projection_row_v1(uuid)
  from public, anon, authenticated;
grant execute on function public.employee_profile_projection_row_v1(uuid)
  to postgres;

create or replace function public.get_my_employee_profile_v1()
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
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_uid;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if v_profile.status <> 'ACTIVE' then
    raise exception 'PROFILE_INACTIVE';
  end if;

  if v_profile.role not in ('STAFF','EMPLOYEE') then
    raise exception 'PROFILE_ROLE_NOT_ALLOWED';
  end if;

  return query
  select *
  from public.employee_profile_projection_row_v1(v_uid);
end;
$$;

revoke execute on function public.get_my_employee_profile_v1()
  from public, anon, authenticated;
grant execute on function public.get_my_employee_profile_v1()
  to authenticated, postgres;

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
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_actor public.profiles%rowtype;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into v_actor
  from public.profiles
  where id = v_uid;

  if not found then
    raise exception 'PROFILE_VIEWER_NOT_FOUND';
  end if;

  if v_actor.status <> 'ACTIVE' then
    raise exception 'PROFILE_VIEWER_INACTIVE';
  end if;

  if v_actor.role not in ('STORE_MANAGER','OWNER') then
    raise exception 'PROFILE_VIEW_ROLE_NOT_ALLOWED';
  end if;

  if v_actor.role = 'STORE_MANAGER' and p_store_id is null then
    raise exception 'PROFILE_STORE_REQUIRED';
  end if;

  if p_store_id is not null and not public.can_access_store(p_store_id) then
    raise exception 'STORE_NOT_ALLOWED';
  end if;

  return query
  select pr.*
  from public.profiles subject
  join lateral public.employee_profile_projection_row_v1(subject.id) pr on true
  left join public.employee_constraints scope_ec
    on scope_ec.user_id = subject.id
   and scope_ec.status = 'ACTIVE'
  where subject.role in ('STAFF','EMPLOYEE')
    and (
      (
        v_actor.role = 'OWNER'
        and (
          p_store_id is null
          or scope_ec.preferred_store_id = p_store_id
          or p_store_id = any(coalesce(scope_ec.allowed_store_ids, '{}'::uuid[]))
        )
      )
      or
      (
        v_actor.role = 'STORE_MANAGER'
        and (
          scope_ec.preferred_store_id = p_store_id
          or p_store_id = any(coalesce(scope_ec.allowed_store_ids, '{}'::uuid[]))
        )
      )
    )
  order by lower(pr.full_name), lower(pr.username), pr.employee_id;
end;
$$;

revoke execute on function public.list_employee_profile_projection_v1(uuid)
  from public, anon, authenticated;
grant execute on function public.list_employee_profile_projection_v1(uuid)
  to authenticated, postgres;

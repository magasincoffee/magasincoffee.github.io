-- MAGASIN Workforce Operations V1 — TASK-104 Employee Payroll Self-Check V1
-- Read-only payroll projections. No payroll state transition or monetary calculation is introduced.

create or replace function public.get_my_payroll_self_check_v1()
returns table(
  payroll_entry_id uuid,
  period_start date,
  period_end date,
  payroll_revision text,
  state text,
  confirmed_work_item_count integer,
  confirmed_work_minutes integer,
  updated_at timestamptz
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
    raise exception 'PAYROLL_SELF_PROFILE_NOT_FOUND';
  end if;

  if v_profile.status <> 'ACTIVE' then
    raise exception 'PAYROLL_SELF_PROFILE_INACTIVE';
  end if;

  if v_profile.role not in ('STAFF','EMPLOYEE') then
    raise exception 'PAYROLL_SELF_ROLE_NOT_ALLOWED';
  end if;

  return query
  select
    pe.id,
    pe.period_start,
    pe.period_end,
    pe.payroll_revision,
    pe.state,
    pe.confirmed_work_item_count,
    pe.confirmed_work_minutes,
    pe.updated_at
  from public.payroll_entries pe
  where pe.employee_id = v_uid
  order by pe.period_end desc, pe.period_start desc, pe.updated_at desc, pe.id;
end;
$$;

revoke execute on function public.get_my_payroll_self_check_v1()
  from public, anon, authenticated;
grant execute on function public.get_my_payroll_self_check_v1()
  to authenticated, postgres;

create or replace function public.list_scoped_payroll_self_check_v1(
  p_store_id uuid default null
)
returns table(
  payroll_entry_id uuid,
  employee_id uuid,
  employee_name text,
  period_start date,
  period_end date,
  payroll_revision text,
  state text,
  confirmed_work_item_count integer,
  confirmed_work_minutes integer,
  updated_at timestamptz
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
    raise exception 'PAYROLL_VIEWER_PROFILE_NOT_FOUND';
  end if;

  if v_actor.status <> 'ACTIVE' then
    raise exception 'PAYROLL_VIEWER_INACTIVE';
  end if;

  if v_actor.role not in ('STORE_MANAGER','OWNER') then
    raise exception 'PAYROLL_VIEW_ROLE_NOT_ALLOWED';
  end if;

  if v_actor.role = 'STORE_MANAGER' and p_store_id is null then
    raise exception 'PAYROLL_STORE_REQUIRED';
  end if;

  if p_store_id is not null and not public.can_access_store(p_store_id) then
    raise exception 'STORE_NOT_ALLOWED';
  end if;

  return query
  select
    pe.id,
    pe.employee_id,
    subject.full_name,
    pe.period_start,
    pe.period_end,
    pe.payroll_revision,
    pe.state,
    pe.confirmed_work_item_count,
    pe.confirmed_work_minutes,
    pe.updated_at
  from public.payroll_entries pe
  join public.profiles subject
    on subject.id = pe.employee_id
   and subject.role in ('STAFF','EMPLOYEE')
  left join public.employee_constraints scope_ec
    on scope_ec.user_id = pe.employee_id
   and scope_ec.status = 'ACTIVE'
  where
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
  order by pe.period_end desc, pe.period_start desc, lower(subject.full_name), pe.updated_at desc, pe.id;
end;
$$;

revoke execute on function public.list_scoped_payroll_self_check_v1(uuid)
  from public, anon, authenticated;
grant execute on function public.list_scoped_payroll_self_check_v1(uuid)
  to authenticated, postgres;

comment on function public.get_my_payroll_self_check_v1() is
  'TASK-104 self-only payroll read projection. Uses auth.uid(), returns canonical payroll state + confirmed work minutes, and exposes no pay-rule internals or monetary amount.';

comment on function public.list_scoped_payroll_self_check_v1(uuid) is
  'TASK-104 read-only Manager/Owner payroll projection. STORE_MANAGER is store-scoped through can_access_store + ACTIVE employee_constraints; OWNER may read enterprise scope with NULL store. No payroll review/finalization mutation authority is granted.';

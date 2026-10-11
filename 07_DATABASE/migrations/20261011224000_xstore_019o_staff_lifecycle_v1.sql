-- XSTORE-019O / STAFF-LIFECYCLE. PRE-RELEASE DRAFT ONLY.
-- No production DDL, real employee status mutation, Auth deletion, payroll or schedule changes approved.
-- ACTIVE / INACTIVE is the existing profile lifecycle authority. No account deletion or cascade.
create table if not exists public.employee_lifecycle_audit_v1 (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id),
  actor_id uuid not null references public.profiles(id),
  old_status text not null check(old_status in ('ACTIVE','INACTIVE')),
  new_status text not null check(new_status in ('ACTIVE','INACTIVE')),
  reason text not null check(char_length(btrim(reason)) between 3 and 300),
  changed_at timestamptz not null default now(),
  source text not null default 'XSTORE-019O'
);
alter table public.employee_lifecycle_audit_v1 enable row level security;
revoke all on public.employee_lifecycle_audit_v1 from public, anon, authenticated;

-- Centralized all-relevant-store check; avoid allowing a CN1 manager to terminate
-- a shared employee scheduled or prioritized in CN2. Unconfigured staff = OWNER only.
create or replace function public.employee_lifecycle_full_scope_v1(p_employee_id uuid)
returns boolean language plpgsql stable security definer set search_path=public
as $function$
declare
  v_role text := upper(coalesce(public.current_user_role(),''));
begin
  if auth.uid() is null then return false; end if;
  if v_role='OWNER' then return true; end if;
  if v_role<>'STORE_MANAGER' then return false; end if;
  -- Live Manager Store Priority writer validates only the NEW store set;
  -- a partial-scope manager could otherwise rewrite another employee's
  -- current priorities to a single accessible store, then terminate them.
  -- Initial production admission therefore requires enterprise ALL scope.
  -- Narrow-store lifecycle authority needs an immutable enrollment ledger
  -- and a separately qualified migration; do not infer from mutable priorities.
  if not exists(
    select 1 from public.profiles p where p.id=auth.uid()
      and exists(
        select 1 from regexp_split_to_table(upper(coalesce(p.access_scope,'')),'[,; ]+') token
        where token in ('ALL','*')
      )
  ) then return false; end if;
  if not exists(select 1 from public.employee_store_priorities esp
                where esp.employee_id=p_employee_id and public.can_access_store(esp.store_id))
  then return false; end if;
  if exists(select 1 from public.employee_store_priorities esp
            where esp.employee_id=p_employee_id and not coalesce(public.can_access_store(esp.store_id),false))
  then return false; end if;
  if exists(select 1 from public.work_schedules ws
            where ws.user_id=p_employee_id and not coalesce(public.can_access_store(ws.store_id),false))
  then return false; end if;
  if exists(select 1 from public.schedule_generation_assignments a
            where a.user_id=p_employee_id and not coalesce(public.can_access_store(a.store_id),false))
  then return false; end if;
  return true;
end;
$function$;
revoke execute on function public.employee_lifecycle_full_scope_v1(uuid) from public, anon, authenticated;

-- Read-only capability per canonical employee ID. The UI must use this result only to
-- display/gate controls; all actual authority is rechecked inside the writer.
create or replace function public.list_employee_lifecycle_controls_v1()
returns table(employee_id uuid, profile_status text, can_manage boolean)
language plpgsql stable security definer set search_path=public
as $function$
declare
  v_role text := upper(coalesce(public.current_user_role(),''));
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if not exists(select 1 from public.profiles actor where actor.id=auth.uid()
                and actor.status='ACTIVE' and upper(coalesce(actor.role,''))=v_role)
  then raise exception 'ACTOR_NOT_ACTIVE'; end if;
  return query
  select p.id,p.status,
    public.employee_lifecycle_full_scope_v1(p.id)
  from public.profiles p
  where upper(coalesce(p.role,'')) in ('STAFF','EMPLOYEE')
    and p.status in ('ACTIVE','INACTIVE')
    and (v_role='OWNER' or exists(
      select 1 from public.employee_store_priorities esp
      where esp.employee_id=p.id and coalesce(public.can_access_store(esp.store_id),false)
    ))
  order by p.id;
end;
$function$;
revoke execute on function public.list_employee_lifecycle_controls_v1() from public, anon, authenticated;
grant execute on function public.list_employee_lifecycle_controls_v1() to authenticated;

-- Two-way reversible employee offboarding. This changes profiles.status ONLY.
-- Existing drafts, published schedules, attendance, pay, Auth and history stay untouched.
create or replace function public.set_employee_lifecycle_status_v1(
  p_employee_id uuid,
  p_new_status text,
  p_reason text
) returns jsonb
language plpgsql security definer set search_path=public
as $function$
declare
  v_role text := upper(coalesce(public.current_user_role(),''));
  v_before text;
  v_reason text := btrim(coalesce(p_reason,''));
  v_open_shifts integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if not exists(select 1 from public.profiles actor where actor.id=auth.uid()
     and actor.status='ACTIVE' and upper(coalesce(actor.role,''))=v_role)
  then raise exception 'ACTOR_NOT_ACTIVE'; end if;
  if p_employee_id is null then raise exception 'EMPLOYEE_ID_REQUIRED'; end if;
  if p_new_status is null or p_new_status not in ('ACTIVE','INACTIVE')
  then raise exception 'LIFECYCLE_STATUS_INVALID'; end if;
  if char_length(v_reason) < 3 or char_length(v_reason) > 300
  then raise exception 'LIFECYCLE_REASON_INVALID'; end if;

  -- Same advisory family used by Store Priority writer, eliminating concurrent
  -- priority/scope reconfiguration between scope decision and profile update.
  perform pg_advisory_xact_lock(hashtextextended('employee_store_priority:'||p_employee_id::text,0));
  select p.status into v_before
  from public.profiles p
  where p.id=p_employee_id and upper(coalesce(p.role,'')) in ('STAFF','EMPLOYEE')
    and p.status in ('ACTIVE','INACTIVE')
  for update;
  if v_before is null then raise exception 'EMPLOYEE_NOT_FOUND'; end if;
  if not public.employee_lifecycle_full_scope_v1(p_employee_id)
  then raise exception 'EMPLOYEE_ALL_STORES_SCOPE_REQUIRED'; end if;
  if v_before=p_new_status then raise exception 'LIFECYCLE_NO_CHANGE'; end if;

  update public.profiles set status=p_new_status where id=p_employee_id;
  insert into public.employee_lifecycle_audit_v1
    (employee_id,actor_id,old_status,new_status,reason)
  values(p_employee_id,auth.uid(),v_before,p_new_status,v_reason);

  select count(*)::integer into v_open_shifts
  from public.work_schedules ws
  where ws.user_id=p_employee_id
    and ws.work_date>=current_date
    and ws.status in ('PENDING','APPROVED');
  return jsonb_build_object(
    'employee_id',p_employee_id,
    'old_status',v_before,'new_status',p_new_status,
    'changed',true,'existing_future_official_shifts_for_review',v_open_shifts
  );
end;
$function$;
revoke execute on function public.set_employee_lifecycle_status_v1(uuid,text,text)
 from public, anon, authenticated;
grant execute on function public.set_employee_lifecycle_status_v1(uuid,text,text) to authenticated;

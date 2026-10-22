-- ISSUE-487 / ISSUE-489: fail-closed employee availability window at the data boundary.
-- STAGED SOURCE ONLY. Do not run on production without authenticated negative QA,
-- authorization review and a rollback plan. No existing rows are modified.
--
-- Business: employees register only the NEXT Monday..Sunday, from Monday until
-- just BEFORE 12:00 Sunday Asia/Ho_Chi_Minh. Managers retain their separate RPC.
-- This trigger protects save_my_availability, delete_my_availability and any
-- other DML path executed as an authenticated employee (including SECURITY DEFINER).
-- clock_timestamp() is intentional: a transaction started before the deadline
-- must not write after it. Service/maintenance calls with no auth.uid() are
-- outside the employee path, subject to their separately controlled privileges.

create or replace function public.employee_availability_window_open_v1(
  p_work_date date,
  p_checked_at timestamptz
)
returns boolean
language sql
stable
set search_path=public
as $function$
  with local_clock as (
    select (p_checked_at at time zone 'Asia/Ho_Chi_Minh') as at_local
  ), current_week as (
    select
      at_local,
      (at_local::date - (extract(isodow from at_local)::integer - 1)) as monday
    from local_clock
  )
  select coalesce(
    p_work_date between (monday + 7) and (monday + 13)
    and at_local < ((monday + 6)::timestamp + time '12:00:00'),
    false
  )
  from current_week;
$function$;

create or replace function public.enforce_employee_availability_window_v1()
returns trigger
language plpgsql
security definer
set search_path=public
as $function$
declare
  v_actor uuid := auth.uid();
  v_role text;
  v_status text;
  v_old_date date;
  v_new_date date;
  v_time timestamptz;
begin
  -- Trusted maintenance/service operations have a separate authorization boundary.
  if v_actor is null then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;

  select upper(coalesce(p.role,'')), upper(coalesce(p.status,''))
    into v_role,v_status
  from public.profiles p
  where p.id=v_actor;

  if v_status is distinct from 'ACTIVE' then
    raise exception 'ACTOR_NOT_ACTIVE';
  end if;

  if v_role not in ('STAFF','EMPLOYEE') then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;

  if tg_op in ('UPDATE','DELETE') then
    if old.user_id is distinct from v_actor then
      raise exception 'AVAILABILITY_NOT_OWNED';
    end if;
    v_old_date:=old.work_date;
  end if;
  if tg_op in ('INSERT','UPDATE') then
    if new.user_id is distinct from v_actor then
      raise exception 'AVAILABILITY_NOT_OWNED';
    end if;
    v_new_date:=new.work_date;
  end if;

  -- Read wall-clock time at mutation, never transaction start.
  v_time:=clock_timestamp();
  if (tg_op in ('UPDATE','DELETE') and
      not public.employee_availability_window_open_v1(v_old_date,v_time))
     or (tg_op in ('INSERT','UPDATE') and
      not public.employee_availability_window_open_v1(v_new_date,v_time)) then
    raise exception 'AVAILABILITY_REGISTRATION_CLOSED';
  end if;

  if tg_op in ('INSERT','UPDATE') then
    if new.start_time is null or new.end_time is null
       or new.start_time < time '05:00:00'
       or new.end_time > time '22:00:00'
       or new.end_time <= new.start_time
       or mod(extract(epoch from new.start_time)::numeric,1800) <> 0
       or mod(extract(epoch from new.end_time)::numeric,1800) <> 0 then
      raise exception 'AVAILABILITY_INVALID_30_MINUTE_INTERVAL';
    end if;
  end if;

  if tg_op='DELETE' then return old; else return new; end if;
end;
$function$;

drop trigger if exists trg_employee_availability_window_v1
  on public.employee_availability;
create trigger trg_employee_availability_window_v1
before insert or update or delete on public.employee_availability
for each row execute function public.enforce_employee_availability_window_v1();

-- The trigger executes internally; API callers do not need direct EXECUTE.
revoke all on function public.employee_availability_window_open_v1(date,timestamptz)
  from public,anon,authenticated;
revoke all on function public.enforce_employee_availability_window_v1()
  from public,anon,authenticated;

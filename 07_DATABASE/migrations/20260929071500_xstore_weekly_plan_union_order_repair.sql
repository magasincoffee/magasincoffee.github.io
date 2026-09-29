-- XSTORE production repair — get_cross_store_weekly_plan_v1 UNION ORDER BY.
-- PostgreSQL set-operation ORDER BY may only reference result columns.
-- Wrap the UNION in a derived table and sort the derived result explicitly.

create or replace function public.get_cross_store_weekly_plan_v1(
  p_week_start date default null
)
returns table(
  plan_source text,
  generation_id uuid,
  generation_status text,
  assignment_id uuid,
  schedule_id uuid,
  store_id uuid,
  store_code text,
  store_name text,
  user_id uuid,
  employee_name text,
  work_date date,
  start_time time,
  end_time time,
  row_status text
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
    where p.id=auth.uid()
      and p.status='ACTIVE'
      and upper(coalesce(p.role,''))=v_role
  ) then raise exception 'ACTOR_NOT_ACTIVE'; end if;
  if extract(isodow from v_week_start)<>1 then
    raise exception 'WEEK_START_MUST_BE_MONDAY';
  end if;

  return query
  select
    q.plan_source,
    q.generation_id,
    q.generation_status,
    q.assignment_id,
    q.schedule_id,
    q.store_id,
    q.store_code,
    q.store_name,
    q.user_id,
    q.employee_name,
    q.work_date,
    q.start_time,
    q.end_time,
    q.row_status
  from (
    select
      'DRAFT'::text as plan_source,
      r.id as generation_id,
      r.status as generation_status,
      a.id as assignment_id,
      null::uuid as schedule_id,
      a.store_id,
      s.code as store_code,
      s.name as store_name,
      a.user_id,
      coalesce(p.full_name,p.username) as employee_name,
      a.work_date,
      a.start_time,
      a.end_time,
      a.status as row_status
    from public.schedule_generation_runs r
    join public.schedule_generation_assignments a on a.generation_id=r.id
    join public.stores s on s.id=a.store_id
    join public.profiles p on p.id=a.user_id
    where r.week_start=v_week_start
      and r.status in ('DRAFT','REVIEWED')
      and public.can_access_store(a.store_id)

    union all

    select
      'OFFICIAL'::text as plan_source,
      ws.source_generation_id as generation_id,
      'PUBLISHED'::text as generation_status,
      ws.source_generation_assignment_id as assignment_id,
      ws.id as schedule_id,
      ws.store_id,
      s.code as store_code,
      s.name as store_name,
      ws.user_id,
      coalesce(p.full_name,p.username) as employee_name,
      ws.work_date,
      ws.start_time,
      ws.end_time,
      ws.status as row_status
    from public.work_schedules ws
    join public.stores s on s.id=ws.store_id
    join public.profiles p on p.id=ws.user_id
    where ws.work_date between v_week_start and v_week_start+6
      and ws.status in ('PENDING','APPROVED')
      and public.can_access_store(ws.store_id)
  ) q
  order by q.store_code,q.work_date,q.start_time,q.employee_name,q.user_id;
end;
$function$;

revoke execute on function public.get_cross_store_weekly_plan_v1(date) from public,anon;
grant execute on function public.get_cross_store_weekly_plan_v1(date) to authenticated;

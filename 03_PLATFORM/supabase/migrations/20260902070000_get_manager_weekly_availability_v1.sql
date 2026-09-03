create or replace function public.get_manager_weekly_availability(p_store_id uuid default null, p_week_start date default null)
returns table(
  availability_id uuid,
  work_date date,
  start_time time,
  end_time time,
  user_id uuid,
  employee_name text,
  username text,
  preferred_store_id uuid,
  preferred_store_code text,
  preferred_store_name text,
  availability_type text,
  note text
)
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  v_role text := public.current_user_role();
  v_week_start date := coalesce(
    p_week_start,
    ((now() at time zone 'Asia/Ho_Chi_Minh')::date
      - (extract(isodow from (now() at time zone 'Asia/Ho_Chi_Minh')::date)::integer - 1))
  );
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if extract(isodow from v_week_start) <> 1 then raise exception 'WEEK_START_MUST_BE_MONDAY'; end if;
  if p_store_id is not null and not public.can_access_store(p_store_id) then raise exception 'STORE_NOT_ALLOWED'; end if;

  return query
  select
    ea.id,
    ea.work_date,
    ea.start_time,
    ea.end_time,
    ea.user_id,
    coalesce(p.full_name, p.username) as employee_name,
    p.username,
    ea.preferred_store_id,
    s.code,
    s.name,
    ea.availability_type,
    ea.note
  from public.employee_availability ea
  join public.profiles p on p.id = ea.user_id
  left join public.stores s on s.id = ea.preferred_store_id
  where ea.work_date between v_week_start and v_week_start + 6
    and p.status = 'ACTIVE'
    and (ea.preferred_store_id is null or public.can_access_store(ea.preferred_store_id))
    and (p_store_id is null or ea.preferred_store_id is null or ea.preferred_store_id = p_store_id)
  order by ea.work_date, ea.start_time, ea.end_time, coalesce(s.code,''), coalesce(p.full_name,p.username), ea.id;
end;
$function$;

grant execute on function public.get_manager_weekly_availability(uuid,date) to authenticated;

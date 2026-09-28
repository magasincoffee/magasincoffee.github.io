-- XSTORE-003 — Employee Availability becomes time-only.
-- Store preference authority moved to employee_store_priorities (XSTORE-002).
-- Existing availability rows retain date/time/note/type but legacy preferred_store_id values are cleared.

update public.employee_availability
set preferred_store_id=null,
    updated_at=now()
where preferred_store_id is not null;

create or replace function public.save_my_availability(
  p_availability_id uuid default null,
  p_work_date date default null,
  p_start_time time default null,
  p_end_time time default null,
  p_availability_type text default 'AVAILABLE',
  p_preferred_store_id uuid default null,
  p_note text default null
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
    where p.id=v_user
      and p.status='ACTIVE'
      and upper(coalesce(p.role,'')) in ('STAFF','EMPLOYEE')
  ) then raise exception 'EMPLOYEE_NOT_ACTIVE'; end if;

  if p_work_date is null or p_start_time is null or p_end_time is null then
    raise exception 'AVAILABILITY_TIME_REQUIRED';
  end if;
  if p_end_time<=p_start_time then raise exception 'INVALID_AVAILABILITY_INTERVAL'; end if;
  if v_type not in ('AVAILABLE','UNAVAILABLE','PREFERRED') then raise exception 'INVALID_AVAILABILITY_TYPE'; end if;

  if p_availability_id is null then
    insert into public.employee_availability(
      user_id,work_date,start_time,end_time,preferred_store_id,availability_type,note
    ) values(
      v_user,p_work_date,p_start_time,p_end_time,null,v_type,p_note
    ) returning id into v_id;
  else
    update public.employee_availability
       set work_date=p_work_date,
           start_time=p_start_time,
           end_time=p_end_time,
           preferred_store_id=null,
           availability_type=v_type,
           note=p_note,
           updated_at=now()
     where id=p_availability_id and user_id=v_user
     returning id into v_id;
    if v_id is null then raise exception 'AVAILABILITY_NOT_FOUND'; end if;
  end if;

  return v_id;
end;
$function$;

create or replace function public.get_manager_weekly_availability(
  p_store_id uuid default null,
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
  preferred_store_id uuid,
  preferred_store_code text,
  preferred_store_name text,
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
  if not exists(
    select 1 from public.profiles p
    where p.id=auth.uid()
      and p.status='ACTIVE'
      and upper(coalesce(p.role,''))=v_role
  ) then raise exception 'ACTOR_NOT_ACTIVE'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if extract(isodow from v_week_start)<>1 then raise exception 'WEEK_START_MUST_BE_MONDAY'; end if;

  if p_store_id is not null and not public.can_access_store(p_store_id) then
    raise exception 'STORE_NOT_ALLOWED';
  end if;

  if v_role='STORE_MANAGER'
     and p_store_id is null
     and exists(
       select 1 from public.stores s
       where s.status='ACTIVE' and not public.can_access_store(s.id)
     ) then
    raise exception 'STORE_REQUIRED_FOR_MANAGER';
  end if;

  return query
  select
    ea.id,
    ea.work_date,
    ea.start_time,
    ea.end_time,
    ea.user_id,
    coalesce(p.full_name,p.username),
    p.username,
    null::uuid,
    null::text,
    null::text,
    ea.availability_type,
    ea.note
  from public.employee_availability ea
  join public.profiles p on p.id=ea.user_id
  where ea.work_date between v_week_start and v_week_start+6
    and p.status='ACTIVE'
    and upper(coalesce(p.role,'')) in ('STAFF','EMPLOYEE')
    and (
      p_store_id is null
      or exists(
        select 1
        from public.employee_store_priorities esp
        where esp.employee_id=ea.user_id
          and esp.store_id=p_store_id
      )
    )
  order by ea.work_date,ea.start_time,ea.end_time,coalesce(p.full_name,p.username),ea.id;
end;
$function$;

revoke execute on function public.save_my_availability(uuid,date,time,time,text,uuid,text) from public,anon;
grant execute on function public.save_my_availability(uuid,date,time,time,text,uuid,text) to authenticated;
revoke execute on function public.get_manager_weekly_availability(uuid,date) from public,anon;
grant execute on function public.get_manager_weekly_availability(uuid,date) to authenticated;

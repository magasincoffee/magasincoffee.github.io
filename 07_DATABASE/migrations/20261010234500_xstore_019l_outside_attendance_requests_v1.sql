-- XSTORE-019L, PRE-RELEASE ONLY; do not apply to production until Owner-approved XSTORE-020.
-- Exceptional attendance outside published schedules is a request, not a scheduled shift,
-- official attendance row, approved payroll item, or automatic clock event.
create table if not exists public.attendance_outside_schedule_requests_v1 (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id),
  store_id uuid not null references public.stores(id),
  work_date date not null,
  actual_start time without time zone not null,
  actual_end time without time zone not null,
  note text,
  status text not null default 'PENDING'
    check (status in ('PENDING','APPROVED','REJECTED')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  confirmed_start time without time zone,
  confirmed_end time without time zone,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint x19l_outside_range check (actual_end > actual_start),
  constraint x19l_review_shape check (
    (status='PENDING' and reviewed_by is null and reviewed_at is null
      and confirmed_start is null and confirmed_end is null)
    or (status='REJECTED' and reviewed_by is not null and reviewed_at is not null
      and confirmed_start is null and confirmed_end is null)
    or (status='APPROVED' and reviewed_by is not null and reviewed_at is not null
      and confirmed_start is not null and confirmed_end>confirmed_start)
  )
);
create index if not exists x19l_outside_employee_week_idx
  on public.attendance_outside_schedule_requests_v1(employee_id,work_date desc);
create index if not exists x19l_outside_store_week_idx
  on public.attendance_outside_schedule_requests_v1(store_id,work_date desc,status);
create unique index if not exists x19l_outside_pending_once_idx
  on public.attendance_outside_schedule_requests_v1
    (employee_id,store_id,work_date,actual_start,actual_end)
  where status='PENDING';
alter table public.attendance_outside_schedule_requests_v1 enable row level security;
revoke all on public.attendance_outside_schedule_requests_v1 from public,anon,authenticated;

create table if not exists public.attendance_outside_schedule_review_events_v1 (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.attendance_outside_schedule_requests_v1(id),
  reviewer_id uuid not null references public.profiles(id),
  decision text not null check (decision in ('APPROVE','REJECT')),
  confirmed_start time without time zone,
  confirmed_end time without time zone,
  created_at timestamptz not null default now()
);
alter table public.attendance_outside_schedule_review_events_v1 enable row level security;
revoke all on public.attendance_outside_schedule_review_events_v1 from public,anon,authenticated;

create or replace function public.submit_outside_schedule_attendance_v1(
  p_store_id uuid,
  p_work_date date,
  p_actual_start time without time zone,
  p_actual_end time without time zone,
  p_note text default null
) returns jsonb
language plpgsql security definer set search_path=public as $function$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_previous public.attendance_outside_schedule_requests_v1%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.profiles where id=v_uid and status='ACTIVE'
      and upper(role) in ('STAFF','EMPLOYEE'))
  then raise exception 'EMPLOYEE_NOT_ACTIVE'; end if;
  if p_store_id is null or p_work_date is null or p_actual_start is null
      or p_actual_end is null or p_actual_end<=p_actual_start
  then raise exception 'ATTENDANCE_OUTSIDE_FIELDS_INVALID'; end if;
  if p_work_date>(now() at time zone 'Asia/Ho_Chi_Minh')::date
    or p_work_date<(now() at time zone 'Asia/Ho_Chi_Minh')::date-60
  then raise exception 'ATTENDANCE_OUTSIDE_DATE_NOT_ALLOWED'; end if;
  if length(coalesce(p_note,''))>500 then raise exception 'ATTENDANCE_NOTE_TOO_LONG'; end if;
  if not exists (select 1 from public.stores s
      join public.employee_store_priorities esp on esp.store_id=s.id
      where s.id=p_store_id and s.status='ACTIVE' and esp.employee_id=v_uid)
  then raise exception 'STORE_NOT_ELIGIBLE'; end if;
  -- A planned shift overlapping this actual interval requires the existing
  -- schedule-linked manual-time review, not an outside-schedule request.
  if exists(select 1 from public.work_schedules w
      where w.user_id=v_uid and w.work_date=p_work_date and w.status='APPROVED'
      and w.store_id=p_store_id and w.start_time<p_actual_end
      and p_actual_start<w.end_time)
  then raise exception 'ATTENDANCE_PUBLISHED_SHIFT_USE_SCHEDULE'; end if;
  perform pg_advisory_xact_lock(hashtextextended(
    'x19l_outside:'||v_uid::text||':'||p_store_id::text||':'||p_work_date::text,0));
  select * into v_previous
    from public.attendance_outside_schedule_requests_v1
    where employee_id=v_uid and store_id=p_store_id and work_date=p_work_date
      and actual_start=p_actual_start and actual_end=p_actual_end
    order by created_at desc,id desc limit 1;
  if found then
    return jsonb_build_object('request_id',v_previous.id,
      'status',v_previous.status,'already_submitted',true);
  end if;
  insert into public.attendance_outside_schedule_requests_v1(
    employee_id,store_id,work_date,actual_start,actual_end,note)
  values(v_uid,p_store_id,p_work_date,p_actual_start,p_actual_end,
    nullif(btrim(p_note),''))
  returning id into v_id;
  return jsonb_build_object('request_id',v_id,'status','PENDING',
    'already_submitted',false,'payroll_confirmed',false);
end;
$function$;
revoke execute on function public.submit_outside_schedule_attendance_v1(uuid,date,time,time,text) from public,anon,authenticated;
grant execute on function public.submit_outside_schedule_attendance_v1(uuid,date,time,time,text) to authenticated;

create or replace function public.list_my_outside_schedule_attendance_v1(
 p_from_date date,p_to_date date
) returns table(request_id uuid,store_id uuid,store_code text,work_date date,
 actual_start time,actual_end time,status text,confirmed_start time,confirmed_end time)
language plpgsql stable security definer set search_path=public as $function$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if not exists(select 1 from public.profiles p where p.id=auth.uid()
    and p.status='ACTIVE' and upper(p.role) in ('STAFF','EMPLOYEE'))
 then raise exception 'EMPLOYEE_NOT_ACTIVE'; end if;
 if p_from_date is null or p_to_date is null or p_to_date<p_from_date
    or p_to_date>p_from_date+31
 then raise exception 'DATE_RANGE_INVALID'; end if;
 return query select r.id,r.store_id,s.code,r.work_date,r.actual_start,
    r.actual_end,r.status,r.confirmed_start,r.confirmed_end
 from public.attendance_outside_schedule_requests_v1 r
 join public.stores s on s.id=r.store_id
 where r.employee_id=auth.uid() and r.work_date between p_from_date and p_to_date
 order by r.work_date desc,r.created_at desc;
end;
$function$;
revoke execute on function public.list_my_outside_schedule_attendance_v1(date,date) from public,anon,authenticated;
grant execute on function public.list_my_outside_schedule_attendance_v1(date,date) to authenticated;

create or replace function public.list_manager_outside_schedule_attendance_v1(
 p_store_id uuid,p_from_date date,p_to_date date
) returns table(request_id uuid,employee_id uuid,employee_name text,
 store_id uuid,work_date date,actual_start time,actual_end time,
 note text,status text,confirmed_start time,confirmed_end time)
language plpgsql stable security definer set search_path=public as $function$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if upper(coalesce(public.current_user_role(),'')) not in ('OWNER','STORE_MANAGER')
    or not exists(select 1 from public.profiles p where p.id=auth.uid()
      and p.status='ACTIVE'
      and upper(p.role)=upper(public.current_user_role()))
 then raise exception 'ROLE_NOT_ALLOWED'; end if;
 if p_store_id is null or not public.can_access_store(p_store_id)
 then raise exception 'STORE_NOT_ALLOWED'; end if;
 if p_from_date is null or p_to_date is null or p_to_date<p_from_date
   or p_to_date>p_from_date+31
 then raise exception 'DATE_RANGE_INVALID'; end if;
 return query select r.id,r.employee_id,coalesce(p.full_name,p.username),
    r.store_id,r.work_date,r.actual_start,r.actual_end,r.note,r.status,
    r.confirmed_start,r.confirmed_end
 from public.attendance_outside_schedule_requests_v1 r
 join public.profiles p on p.id=r.employee_id
 where r.store_id=p_store_id and r.work_date between p_from_date and p_to_date
 order by case when r.status='PENDING' then 0 else 1 end,
    r.work_date desc,r.created_at desc;
end;
$function$;
revoke execute on function public.list_manager_outside_schedule_attendance_v1(uuid,date,date) from public,anon,authenticated;
grant execute on function public.list_manager_outside_schedule_attendance_v1(uuid,date,date) to authenticated;

create or replace function public.review_outside_schedule_attendance_v1(
 p_request_id uuid,p_decision text,p_confirmed_start time default null,
 p_confirmed_end time default null
) returns jsonb
language plpgsql security definer set search_path=public as $function$
declare
 v_uid uuid:=auth.uid();
 v_row public.attendance_outside_schedule_requests_v1%rowtype;
 v_decision text:=upper(coalesce(p_decision,''));
 v_status text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if upper(coalesce(public.current_user_role(),'')) not in ('OWNER','STORE_MANAGER')
    or not exists(select 1 from public.profiles p where p.id=v_uid
      and p.status='ACTIVE'
      and upper(p.role)=upper(public.current_user_role()))
 then raise exception 'ROLE_NOT_ALLOWED'; end if;
 if p_request_id is null or v_decision not in ('APPROVE','REJECT')
 then raise exception 'OUTSIDE_REVIEW_INVALID'; end if;
 select * into v_row from public.attendance_outside_schedule_requests_v1
   where id=p_request_id for update;
 if not found then raise exception 'OUTSIDE_REQUEST_NOT_FOUND'; end if;
 if not public.can_access_store(v_row.store_id)
 then raise exception 'STORE_NOT_ALLOWED'; end if;
 if v_row.status<>'PENDING' then raise exception 'OUTSIDE_ALREADY_REVIEWED'; end if;
 if v_decision='APPROVE' and (p_confirmed_start is null or p_confirmed_end is null
    or p_confirmed_end<=p_confirmed_start)
 then raise exception 'OUTSIDE_CONFIRMED_RANGE_INVALID'; end if;
 if v_decision='APPROVE' and exists (
   select 1 from public.work_schedules w
   where w.user_id=v_row.employee_id and w.store_id=v_row.store_id
     and w.work_date=v_row.work_date and w.status='APPROVED'
     and w.start_time<p_confirmed_end and p_confirmed_start<w.end_time
 ) then raise exception 'OUTSIDE_REQUEST_SCHEDULE_CHANGED'; end if;
 if v_decision='REJECT' and (p_confirmed_start is not null or p_confirmed_end is not null)
 then raise exception 'OUTSIDE_REJECT_NO_CONFIRMED_TIME'; end if;
 v_status:=case when v_decision='APPROVE' then 'APPROVED' else 'REJECTED' end;
 update public.attendance_outside_schedule_requests_v1 set
   status=v_status,reviewed_by=v_uid,reviewed_at=now(),
   confirmed_start=case when v_decision='APPROVE' then p_confirmed_start else null end,
   confirmed_end=case when v_decision='APPROVE' then p_confirmed_end else null end,
   updated_at=now()
 where id=p_request_id;
 insert into public.attendance_outside_schedule_review_events_v1(
   request_id,reviewer_id,decision,confirmed_start,confirmed_end)
 values(p_request_id,v_uid,v_decision,p_confirmed_start,p_confirmed_end);
 return jsonb_build_object('request_id',p_request_id,'status',v_status,
   'reviewed_by',v_uid,'payroll_confirmed',false);
end;
$function$;
revoke execute on function public.review_outside_schedule_attendance_v1(uuid,text,time,time) from public,anon,authenticated;
grant execute on function public.review_outside_schedule_attendance_v1(uuid,text,time,time) to authenticated;

-- IMPORTANT: These requests intentionally do not generate canonical attendance rows,
-- published shifts, payroll-confirmed minutes or silent schedule changes.
-- Owner must approve future payroll reconciliation semantics independently.

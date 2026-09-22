-- MAGASIN Workforce Operations V1 — TASK-098 Manual-Time Attendance Authority V1
-- Reuse attendance.schedule_id as canonical assignment identity.
-- Historical OPEN/COMPLETED rows remain legacy evidence and are not rewritten.

alter table public.attendance
  add column if not exists actual_start time,
  add column if not exists actual_end time,
  add column if not exists submitted_at timestamptz,
  add column if not exists submission_status text,
  add column if not exists reviewed_by uuid references public.profiles(id),
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_decision text,
  add column if not exists confirmed_start time,
  add column if not exists confirmed_end time,
  add column if not exists confirmed_minutes integer;

alter table public.attendance drop constraint if exists attendance_status_check;
alter table public.attendance
  add constraint attendance_status_check
  check (status in (
    'OPEN','COMPLETED','DELETED','DELETED_BY_MANAGER',
    'DRAFT','SUBMITTED','NORMAL','NEEDS_REVIEW','APPROVED','ADJUSTED','REJECTED'
  ));

alter table public.attendance drop constraint if exists attendance_submission_status_check;
alter table public.attendance
  add constraint attendance_submission_status_check
  check (submission_status is null or submission_status = 'SUBMITTED');

alter table public.attendance drop constraint if exists attendance_actual_time_check;
alter table public.attendance
  add constraint attendance_actual_time_check
  check (
    (actual_start is null and actual_end is null)
    or
    (actual_start is not null and actual_end is not null and actual_end > actual_start)
  );

alter table public.attendance drop constraint if exists attendance_confirmed_time_check;
alter table public.attendance
  add constraint attendance_confirmed_time_check
  check (
    (confirmed_start is null and confirmed_end is null)
    or
    (confirmed_start is not null and confirmed_end is not null and confirmed_end > confirmed_start)
  );

alter table public.attendance drop constraint if exists attendance_confirmed_minutes_check;
alter table public.attendance
  add constraint attendance_confirmed_minutes_check
  check (confirmed_minutes is null or confirmed_minutes >= 0);

alter table public.attendance drop constraint if exists attendance_canonical_submission_shape_check;
alter table public.attendance
  add constraint attendance_canonical_submission_shape_check
  check (
    status not in ('SUBMITTED','NORMAL','NEEDS_REVIEW','APPROVED','ADJUSTED','REJECTED')
    or (
      schedule_id is not null
      and actual_start is not null
      and actual_end is not null
      and submitted_at is not null
      and submission_status = 'SUBMITTED'
    )
  );

alter table public.attendance drop constraint if exists attendance_confirmed_shape_check;
alter table public.attendance
  add constraint attendance_confirmed_shape_check
  check (
    status not in ('APPROVED','ADJUSTED')
    or (
      confirmed_start is not null
      and confirmed_end is not null
      and confirmed_minutes is not null
    )
  );

create or replace function public.validate_attendance_assignment_authority_v1(
  p_schedule_id uuid,
  p_employee_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_schedule public.work_schedules%rowtype;
  v_profile public.profiles%rowtype;
begin
  if p_schedule_id is null or p_employee_id is null then
    raise exception 'ATTENDANCE_AUTHORITY_FIELDS_REQUIRED';
  end if;

  select * into v_schedule
  from public.work_schedules
  where id = p_schedule_id;

  if not found then
    raise exception 'ATTENDANCE_SCHEDULE_NOT_FOUND';
  end if;

  if v_schedule.status <> 'APPROVED' then
    raise exception 'ATTENDANCE_SCHEDULE_NOT_APPROVED';
  end if;

  if v_schedule.user_id <> p_employee_id then
    raise exception 'ATTENDANCE_NOT_CURRENT_OWNER';
  end if;

  select * into v_profile
  from public.profiles
  where id = p_employee_id;

  if not found or v_profile.status <> 'ACTIVE' then
    raise exception 'ATTENDANCE_EMPLOYEE_INACTIVE';
  end if;

  if v_profile.role <> 'STAFF' then
    raise exception 'ATTENDANCE_EMPLOYEE_NOT_STAFF';
  end if;

  return jsonb_build_object(
    'ok', true,
    'schedule_id', v_schedule.id,
    'work_date', v_schedule.work_date,
    'store_id', v_schedule.store_id,
    'scheduled_start', v_schedule.start_time,
    'scheduled_end', v_schedule.end_time
  );
end;
$$;

revoke execute on function public.validate_attendance_assignment_authority_v1(uuid,uuid) from public, anon, authenticated;
grant execute on function public.validate_attendance_assignment_authority_v1(uuid,uuid) to postgres;

create or replace function public.submit_manual_time_attendance_v1(
  p_schedule_id uuid,
  p_actual_start time,
  p_actual_end time,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_schedule public.work_schedules%rowtype;
  v_existing public.attendance%rowtype;
  v_id uuid;
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_now_local timestamp := now() at time zone 'Asia/Ho_Chi_Minh';
  v_note text := nullif(btrim(coalesce(p_note,'')),'');
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_schedule_id is null or p_actual_start is null or p_actual_end is null then
    raise exception 'ATTENDANCE_FIELDS_REQUIRED';
  end if;

  if p_actual_end <= p_actual_start then
    raise exception 'ATTENDANCE_ACTUAL_RANGE_INVALID';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('shift_swap_schedule:' || p_schedule_id::text, 0)
  );

  select * into v_schedule
  from public.work_schedules
  where id = p_schedule_id
  for update;

  if not found then
    raise exception 'ATTENDANCE_SCHEDULE_NOT_FOUND';
  end if;

  perform public.validate_attendance_assignment_authority_v1(p_schedule_id, v_uid);

  if v_schedule.work_date > v_today then
    raise exception 'ATTENDANCE_SCHEDULE_IN_FUTURE';
  end if;

  if v_schedule.work_date = v_today
     and (v_schedule.work_date + v_schedule.end_time) > v_now_local then
    raise exception 'ATTENDANCE_SHIFT_NOT_FINISHED';
  end if;

  select * into v_existing
  from public.attendance
  where schedule_id = p_schedule_id
    and status not in ('DELETED','DELETED_BY_MANAGER')
  order by created_at desc, id desc
  limit 1
  for update;

  if found then
    if v_existing.user_id = v_uid
       and v_existing.submission_status = 'SUBMITTED'
       and v_existing.actual_start = p_actual_start
       and v_existing.actual_end = p_actual_end
       and v_existing.status in ('SUBMITTED','NORMAL','NEEDS_REVIEW') then
      return jsonb_build_object(
        'attendance_id', v_existing.id,
        'schedule_id', v_existing.schedule_id,
        'status', v_existing.status,
        'submission_status', v_existing.submission_status,
        'already_submitted', true
      );
    end if;

    raise exception 'ATTENDANCE_ACTIVE_SUBMISSION_EXISTS';
  end if;

  begin
    insert into public.attendance (
      work_date,
      user_id,
      store_id,
      schedule_id,
      status,
      planned_start,
      planned_end,
      actual_start,
      actual_end,
      submitted_at,
      submission_status,
      note
    ) values (
      v_schedule.work_date,
      v_uid,
      v_schedule.store_id,
      v_schedule.id,
      'NEEDS_REVIEW',
      v_schedule.start_time,
      v_schedule.end_time,
      p_actual_start,
      p_actual_end,
      now(),
      'SUBMITTED',
      v_note
    )
    returning id into v_id;
  exception
    when unique_violation then
      select * into v_existing
      from public.attendance
      where schedule_id = p_schedule_id
        and status not in ('DELETED','DELETED_BY_MANAGER')
      order by created_at desc, id desc
      limit 1;

      if found
         and v_existing.user_id = v_uid
         and v_existing.submission_status = 'SUBMITTED'
         and v_existing.actual_start = p_actual_start
         and v_existing.actual_end = p_actual_end
         and v_existing.status in ('SUBMITTED','NORMAL','NEEDS_REVIEW') then
        return jsonb_build_object(
          'attendance_id', v_existing.id,
          'schedule_id', v_existing.schedule_id,
          'status', v_existing.status,
          'submission_status', v_existing.submission_status,
          'already_submitted', true
        );
      end if;

      raise exception 'ATTENDANCE_ACTIVE_SUBMISSION_EXISTS';
  end;

  return jsonb_build_object(
    'attendance_id', v_id,
    'schedule_id', v_schedule.id,
    'status', 'NEEDS_REVIEW',
    'submission_status', 'SUBMITTED',
    'already_submitted', false
  );
end;
$$;

revoke execute on function public.submit_manual_time_attendance_v1(uuid,time,time,text) from public, anon;
grant execute on function public.submit_manual_time_attendance_v1(uuid,time,time,text) to authenticated, postgres;

-- Transitional legacy clock-in remains until TASK-099 replaces the Employee UI.
-- Harden it against Give/Swap races using the same per-schedule lock namespace.
create or replace function public.clock_in_for_schedule(p_schedule_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_schedule public.work_schedules%rowtype;
  v_grade public.employee_grades%rowtype;
  v_id uuid;
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_local_check_in timestamp;
  v_planned_start timestamp;
  v_grade_exists boolean;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_schedule_id is null then raise exception 'SCHEDULE_REQUIRED'; end if;

  perform pg_advisory_xact_lock(
    hashtextextended('shift_swap_schedule:' || p_schedule_id::text, 0)
  );

  select * into v_schedule
  from public.work_schedules
  where id = p_schedule_id
  for update;

  if not found then raise exception 'APPROVED_SCHEDULE_NOT_FOUND'; end if;

  perform public.validate_attendance_assignment_authority_v1(p_schedule_id, v_uid);

  if v_schedule.work_date <> v_today then raise exception 'SCHEDULE_NOT_TODAY'; end if;
  if exists(select 1 from public.attendance a where a.user_id=v_uid and a.status='OPEN') then raise exception 'OPEN_ATTENDANCE_EXISTS'; end if;
  if exists(select 1 from public.attendance a where a.schedule_id=p_schedule_id and a.status not in ('DELETED','DELETED_BY_MANAGER')) then raise exception 'SCHEDULE_ALREADY_ATTENDED'; end if;

  select * into v_grade from public.employee_grades where user_id=v_uid and status='ACTIVE';
  v_grade_exists := found;
  v_local_check_in := now() at time zone 'Asia/Ho_Chi_Minh';
  v_planned_start := v_schedule.work_date + v_schedule.start_time;

  insert into public.attendance(
    work_date,user_id,store_id,schedule_id,check_in,status,planned_start,planned_end,
    grade,hourly_rate,late_minutes,early_minutes,hours_worked,amount
  )
  values(
    v_schedule.work_date,v_uid,v_schedule.store_id,v_schedule.id,now(),'OPEN',
    v_schedule.start_time,v_schedule.end_time,
    case when v_grade_exists then v_grade.grade else null end,
    case when v_grade_exists then v_grade.hourly_rate else 0 end,
    greatest(0,floor(extract(epoch from(v_local_check_in-v_planned_start))/60))::integer,
    0,0,0
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.clock_in_for_schedule(uuid) from public, anon;
grant execute on function public.clock_in_for_schedule(uuid) to authenticated, postgres;

create or replace function public.clock_out_attendance(p_attendance_id uuid)
returns public.attendance
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_schedule_id uuid;
  v_att public.attendance%rowtype;
  v_local_checkout timestamp;
  v_planned_end timestamp;
  v_hours numeric(8,2);
  v_amount numeric(14,2);
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select a.schedule_id into v_schedule_id
  from public.attendance a
  where a.id = p_attendance_id
    and a.user_id = v_uid
    and a.status = 'OPEN';

  if not found or v_schedule_id is null then
    raise exception 'OPEN_ATTENDANCE_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('shift_swap_schedule:' || v_schedule_id::text, 0)
  );

  select * into v_att
  from public.attendance
  where id=p_attendance_id
    and user_id=v_uid
    and status='OPEN'
  for update;

  if not found then raise exception 'OPEN_ATTENDANCE_NOT_FOUND'; end if;

  perform public.validate_attendance_assignment_authority_v1(v_schedule_id, v_uid);

  v_local_checkout := now() at time zone 'Asia/Ho_Chi_Minh';
  v_planned_end := v_att.work_date + v_att.planned_end;
  v_hours := round(greatest(0,extract(epoch from(now()-v_att.check_in))/3600.0)::numeric,2);
  v_amount := round(v_hours*coalesce(v_att.hourly_rate,0),2);

  update public.attendance
  set check_out=now(),
      status='COMPLETED',
      early_minutes=greatest(0,floor(extract(epoch from(v_planned_end-v_local_checkout))/60))::integer,
      hours_worked=v_hours,
      amount=v_amount
  where id=v_att.id
  returning * into v_att;

  return v_att;
end;
$$;

revoke execute on function public.clock_out_attendance(uuid) from public, anon;
grant execute on function public.clock_out_attendance(uuid) to authenticated, postgres;

-- Transitional manual legacy RPC remains callable until TASK-099 switches the UI,
-- but now shares transfer locking and revalidates final current owner.
create or replace function public.manual_attendance_from_schedule(
  p_work_date date,
  p_store_code text,
  p_check_in time,
  p_check_out time
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_now_local timestamp := now() at time zone 'Asia/Ho_Chi_Minh';
  v_schedule public.work_schedules%rowtype;
  v_grade public.employee_grades%rowtype;
  v_schedule_id uuid;
  v_id uuid;
  v_count integer;
  v_in_local timestamp;
  v_out_local timestamp;
  v_hours numeric(8,2);
  v_amount numeric(14,2);
  v_late integer;
  v_early integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_work_date is null or p_store_code is null or p_check_in is null or p_check_out is null then raise exception 'ATTENDANCE_FIELDS_REQUIRED'; end if;
  if p_check_out <= p_check_in then raise exception 'CHECK_OUT_MUST_BE_AFTER_CHECK_IN'; end if;
  if p_work_date > v_today then raise exception 'SCHEDULE_IN_FUTURE'; end if;

  select count(*), (array_agg(ws.id order by ws.id))[1]
  into v_count, v_schedule_id
  from public.work_schedules ws
  join public.stores s on s.id = ws.store_id
  where ws.user_id = v_uid
    and ws.status = 'APPROVED'
    and ws.work_date = p_work_date
    and upper(s.code) = upper(trim(p_store_code))
    and ws.start_time = p_check_in
    and ws.end_time = p_check_out;

  if v_count = 0 then raise exception 'APPROVED_SCHEDULE_NOT_FOUND'; end if;
  if v_count > 1 then raise exception 'APPROVED_SCHEDULE_AMBIGUOUS'; end if;

  perform pg_advisory_xact_lock(
    hashtextextended('shift_swap_schedule:' || v_schedule_id::text, 0)
  );

  select ws.* into v_schedule
  from public.work_schedules ws
  join public.stores s on s.id = ws.store_id
  where ws.id = v_schedule_id
    and ws.user_id = v_uid
    and ws.status = 'APPROVED'
    and ws.work_date = p_work_date
    and upper(s.code) = upper(trim(p_store_code))
    and ws.start_time = p_check_in
    and ws.end_time = p_check_out
  for update of ws;

  if not found then raise exception 'APPROVED_SCHEDULE_NOT_FOUND'; end if;

  perform public.validate_attendance_assignment_authority_v1(v_schedule.id, v_uid);

  if exists (
    select 1 from public.attendance a
    where a.schedule_id = v_schedule.id
      and a.status not in ('DELETED','DELETED_BY_MANAGER')
  ) then
    raise exception 'SCHEDULE_ALREADY_ATTENDED';
  end if;

  if p_work_date = v_today and (p_work_date + p_check_out) > v_now_local then
    raise exception 'SHIFT_NOT_FINISHED';
  end if;

  select * into v_grade
  from public.employee_grades
  where user_id = v_uid and status = 'ACTIVE';

  v_in_local := p_work_date + p_check_in;
  v_out_local := p_work_date + p_check_out;
  v_hours := round(greatest(0, extract(epoch from (v_out_local - v_in_local)) / 3600.0)::numeric, 2);
  v_late := greatest(0, floor(extract(epoch from (v_in_local - (p_work_date + v_schedule.start_time))) / 60))::integer;
  v_early := greatest(0, floor(extract(epoch from ((p_work_date + v_schedule.end_time) - v_out_local)) / 60))::integer;
  v_amount := round(v_hours * coalesce(v_grade.hourly_rate, 0), 2);

  insert into public.attendance (
    work_date,user_id,store_id,schedule_id,check_in,check_out,status,
    late_minutes,early_minutes,note,grade,hourly_rate,hours_worked,amount,
    planned_start,planned_end
  ) values (
    v_schedule.work_date,v_uid,v_schedule.store_id,v_schedule.id,
    v_in_local at time zone 'Asia/Ho_Chi_Minh',
    v_out_local at time zone 'Asia/Ho_Chi_Minh',
    'COMPLETED',v_late,v_early,'Chấm công thủ công legacy theo lịch chính thức',
    case when v_grade.user_id is not null then v_grade.grade else null end,
    case when v_grade.user_id is not null then v_grade.hourly_rate else 0 end,
    v_hours,v_amount,v_schedule.start_time,v_schedule.end_time
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.manual_attendance_from_schedule(date,text,time,time) from public, anon;
grant execute on function public.manual_attendance_from_schedule(date,text,time,time) to authenticated, postgres;

-- Automatic attendance from planned schedules is incompatible with Manual-Time V1.
revoke execute on function public.auto_attendance_from_approved_schedules(date,date) from public, anon, authenticated;
grant execute on function public.auto_attendance_from_approved_schedules(date,date) to postgres;

-- Legacy reader must never be anonymous.
revoke execute on function public.get_my_attendance() from public, anon;
grant execute on function public.get_my_attendance() to authenticated, postgres;

-- Browser table mutation is never an attendance authority path.
revoke all on table public.attendance from public, anon, authenticated;

create or replace function public.notification_attendance_trigger_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.submission_status = 'SUBMITTED'
     and new.actual_start is not null
     and new.actual_end is not null
     and (tg_op='INSERT' or old.submitted_at is null) then

    perform public.enqueue_notification_v1(
      'attendance:'||new.id||':submitted',
      'ATTENDANCE_SUBMITTED','USER',new.user_id,new.store_id,auth.uid(),
      'ATTENDANCE',new.id,new.schedule_id,
      'Đã gửi giờ làm thực tế',
      'Giờ làm thực tế đã được gửi và đang chờ xử lý theo chính sách chấm công.',
      jsonb_build_object(
        'work_date',new.work_date,
        'actual_start',new.actual_start,
        'actual_end',new.actual_end,
        'status',new.status,
        'store_id',new.store_id
      ),
      now(),true
    );

    if new.status = 'NEEDS_REVIEW' then
      perform public.enqueue_notification_v1(
        'attendance:'||new.id||':needs_review',
        'ATTENDANCE_NEEDS_REVIEW','STORE_MANAGERS',null,new.store_id,auth.uid(),
        'ATTENDANCE',new.id,new.schedule_id,
        'Có chấm công cần xem xét',
        'Nhân viên đã gửi giờ làm thực tế; chưa có chính sách tự duyệt nên bản ghi cần quản lý xem xét.',
        jsonb_build_object(
          'work_date',new.work_date,
          'status',new.status,
          'store_id',new.store_id
        ),
        now(),true
      );
    end if;

    if new.schedule_id is not null then
      update public.notification_outbox
         set email_status='CANCELLED',updated_at=now()
       where event_type='CLOCK_OUT_REMINDER'
         and related_schedule_id=new.schedule_id
         and recipient_user_id=new.user_id
         and email_status in('PENDING','FAILED','PROCESSING');
    end if;

    return new;
  end if;

  -- Legacy compatibility only. New Manual-Time V1 rows never enter these branches.
  if new.check_in is not null and (tg_op='INSERT' or old.check_in is null) then
    perform public.enqueue_notification_v1(
      'attendance:'||new.id||':clock_in',
      'ATTENDANCE_CLOCKED_IN','USER',new.user_id,new.store_id,auth.uid(),
      'ATTENDANCE',new.id,new.schedule_id,
      'Đã chấm công vào ca',
      'Chấm công vào ca lúc '||to_char(new.check_in at time zone 'Asia/Ho_Chi_Minh','HH24:MI')||'.',
      jsonb_build_object('work_date',new.work_date,'check_in',new.check_in,'store_id',new.store_id),
      now(),false
    );
  end if;

  if new.check_out is not null and (tg_op='INSERT' or old.check_out is null) then
    if new.schedule_id is not null then
      update public.notification_outbox
         set email_status='CANCELLED',updated_at=now()
       where event_type='CLOCK_OUT_REMINDER'
         and related_schedule_id=new.schedule_id
         and recipient_user_id=new.user_id
         and email_status in('PENDING','FAILED','PROCESSING');
    end if;

    perform public.enqueue_notification_v1(
      'attendance:'||new.id||':clock_out',
      'ATTENDANCE_CLOCKED_OUT','USER',new.user_id,new.store_id,auth.uid(),
      'ATTENDANCE',new.id,new.schedule_id,
      'Đã chấm công ra ca',
      'Chấm công ra ca lúc '||to_char(new.check_out at time zone 'Asia/Ho_Chi_Minh','HH24:MI')||'.',
      jsonb_build_object('work_date',new.work_date,'check_out',new.check_out,'store_id',new.store_id),
      now(),false
    );
  end if;

  return new;
end;
$$;

revoke execute on function public.notification_attendance_trigger_v1() from public, anon, authenticated;
grant execute on function public.notification_attendance_trigger_v1() to postgres;

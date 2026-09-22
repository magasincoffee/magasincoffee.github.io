-- MAGASIN Workforce Operations V1 — TASK-100 Manager Attendance Review + Confirmed Work Time V1
-- Reuses attendance row + TASK-098 review/confirmed fields. No parallel confirmed-work-time table.

alter table public.attendance drop constraint if exists attendance_review_decision_check;
alter table public.attendance
  add constraint attendance_review_decision_check
  check (review_decision is null or review_decision in ('APPROVE','ADJUST','REJECT'));

alter table public.attendance drop constraint if exists attendance_review_shape_check;
alter table public.attendance
  add constraint attendance_review_shape_check
  check (
    status not in ('APPROVED','ADJUSTED','REJECTED')
    or (
      reviewed_by is not null
      and reviewed_at is not null
      and review_decision is not null
      and (
        (status = 'APPROVED' and review_decision = 'APPROVE')
        or (status = 'ADJUSTED' and review_decision = 'ADJUST')
        or (status = 'REJECTED' and review_decision = 'REJECT')
      )
    )
  );

alter table public.attendance drop constraint if exists attendance_unconfirmed_state_shape_check;
alter table public.attendance
  add constraint attendance_unconfirmed_state_shape_check
  check (
    status not in ('DRAFT','SUBMITTED','NORMAL','NEEDS_REVIEW','REJECTED')
    or (
      confirmed_start is null
      and confirmed_end is null
      and confirmed_minutes is null
    )
  );

create or replace function public.validate_manager_attendance_review_authority_v1(
  p_store_id uuid
)
returns jsonb
language plpgsql
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

  if p_store_id is null then
    raise exception 'ATTENDANCE_REVIEW_STORE_REQUIRED';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_uid;

  if not found then
    raise exception 'ATTENDANCE_REVIEW_MANAGER_PROFILE_NOT_FOUND';
  end if;

  if v_profile.status <> 'ACTIVE' then
    raise exception 'ATTENDANCE_REVIEW_MANAGER_INACTIVE';
  end if;

  if v_profile.role not in ('STORE_MANAGER','OWNER') then
    raise exception 'ATTENDANCE_REVIEW_ROLE_NOT_ALLOWED';
  end if;

  if v_profile.role <> 'OWNER' and not public.can_access_store(p_store_id) then
    raise exception 'STORE_NOT_ALLOWED';
  end if;

  return jsonb_build_object(
    'manager_id', v_uid,
    'manager_role', v_profile.role,
    'store_id', p_store_id
  );
end;
$$;

revoke execute on function public.validate_manager_attendance_review_authority_v1(uuid) from public, anon, authenticated;
grant execute on function public.validate_manager_attendance_review_authority_v1(uuid) to postgres;

create or replace function public.list_manager_attendance_review_v1(
  p_store_id uuid,
  p_from_date date default null,
  p_to_date date default null
)
returns table(
  attendance_id uuid,
  schedule_id uuid,
  employee_id uuid,
  employee_name text,
  work_date date,
  store_id uuid,
  store_code text,
  store_name text,
  planned_start time,
  planned_end time,
  actual_start time,
  actual_end time,
  submitted_at timestamptz,
  status text,
  note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_decision text,
  confirmed_start time,
  confirmed_end time,
  confirmed_minutes integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.validate_manager_attendance_review_authority_v1(p_store_id);

  if p_from_date is not null and p_to_date is not null and p_to_date < p_from_date then
    raise exception 'ATTENDANCE_REVIEW_DATE_RANGE_INVALID';
  end if;

  return query
  select
    a.id,
    a.schedule_id,
    a.user_id,
    p.full_name,
    a.work_date,
    a.store_id,
    s.code,
    s.name,
    a.planned_start,
    a.planned_end,
    a.actual_start,
    a.actual_end,
    a.submitted_at,
    a.status,
    a.note,
    a.reviewed_by,
    a.reviewed_at,
    a.review_decision,
    a.confirmed_start,
    a.confirmed_end,
    a.confirmed_minutes
  from public.attendance a
  join public.profiles p on p.id = a.user_id
  join public.stores s on s.id = a.store_id
  where a.store_id = p_store_id
    and a.schedule_id is not null
    and a.submission_status = 'SUBMITTED'
    and a.status in ('NORMAL','NEEDS_REVIEW','APPROVED','ADJUSTED','REJECTED')
    and (p_from_date is null or a.work_date >= p_from_date)
    and (p_to_date is null or a.work_date <= p_to_date)
  order by
    case when a.status in ('NORMAL','NEEDS_REVIEW') then 0 else 1 end,
    a.work_date desc,
    a.submitted_at asc nulls last,
    a.id;
end;
$$;

revoke execute on function public.list_manager_attendance_review_v1(uuid,date,date) from public, anon;
grant execute on function public.list_manager_attendance_review_v1(uuid,date,date) to authenticated, postgres;

create or replace function public.review_attendance_v1(
  p_attendance_id uuid,
  p_decision text,
  p_confirmed_start time default null,
  p_confirmed_end time default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_decision text := upper(btrim(coalesce(p_decision,'')));
  v_schedule_id uuid;
  v_att public.attendance%rowtype;
  v_schedule public.work_schedules%rowtype;
  v_start time;
  v_end time;
  v_minutes integer;
  v_target_status text;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_attendance_id is null or v_decision = '' then
    raise exception 'ATTENDANCE_REVIEW_FIELDS_REQUIRED';
  end if;

  if v_decision not in ('APPROVE','ADJUST','REJECT') then
    raise exception 'ATTENDANCE_REVIEW_DECISION_INVALID';
  end if;

  select a.schedule_id into v_schedule_id
  from public.attendance a
  where a.id = p_attendance_id;

  if not found or v_schedule_id is null then
    raise exception 'ATTENDANCE_REVIEW_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('shift_swap_schedule:' || v_schedule_id::text, 0)
  );

  select * into v_att
  from public.attendance
  where id = p_attendance_id
  for update;

  if not found or v_att.schedule_id is null or v_att.schedule_id <> v_schedule_id then
    raise exception 'ATTENDANCE_REVIEW_NOT_FOUND';
  end if;

  select * into v_schedule
  from public.work_schedules
  where id = v_att.schedule_id
  for update;

  if not found then
    raise exception 'ATTENDANCE_REVIEW_SCHEDULE_NOT_FOUND';
  end if;

  perform public.validate_manager_attendance_review_authority_v1(v_att.store_id);
  perform public.validate_attendance_assignment_authority_v1(v_att.schedule_id, v_att.user_id);

  if v_schedule.store_id <> v_att.store_id
     or v_schedule.work_date <> v_att.work_date
     or v_schedule.start_time is distinct from v_att.planned_start
     or v_schedule.end_time is distinct from v_att.planned_end then
    raise exception 'ATTENDANCE_REVIEW_SCHEDULE_SNAPSHOT_CHANGED';
  end if;

  if v_att.submission_status <> 'SUBMITTED'
     or v_att.actual_start is null
     or v_att.actual_end is null
     or v_att.submitted_at is null then
    raise exception 'ATTENDANCE_REVIEW_SUBMISSION_INVALID';
  end if;

  if v_att.status in ('APPROVED','ADJUSTED','REJECTED') then
    if v_att.status = 'APPROVED'
       and v_decision = 'APPROVE'
       and v_att.review_decision = 'APPROVE'
       and v_att.confirmed_start = v_att.actual_start
       and v_att.confirmed_end = v_att.actual_end then
      return jsonb_build_object(
        'attendance_id',v_att.id,
        'schedule_id',v_att.schedule_id,
        'status',v_att.status,
        'review_decision',v_att.review_decision,
        'confirmed_start',v_att.confirmed_start,
        'confirmed_end',v_att.confirmed_end,
        'confirmed_minutes',v_att.confirmed_minutes,
        'already_reviewed',true
      );
    end if;

    if v_att.status = 'ADJUSTED'
       and v_decision = 'ADJUST'
       and v_att.review_decision = 'ADJUST'
       and v_att.confirmed_start = p_confirmed_start
       and v_att.confirmed_end = p_confirmed_end then
      return jsonb_build_object(
        'attendance_id',v_att.id,
        'schedule_id',v_att.schedule_id,
        'status',v_att.status,
        'review_decision',v_att.review_decision,
        'confirmed_start',v_att.confirmed_start,
        'confirmed_end',v_att.confirmed_end,
        'confirmed_minutes',v_att.confirmed_minutes,
        'already_reviewed',true
      );
    end if;

    if v_att.status = 'REJECTED'
       and v_decision = 'REJECT'
       and v_att.review_decision = 'REJECT' then
      return jsonb_build_object(
        'attendance_id',v_att.id,
        'schedule_id',v_att.schedule_id,
        'status',v_att.status,
        'review_decision',v_att.review_decision,
        'confirmed_start',null,
        'confirmed_end',null,
        'confirmed_minutes',null,
        'already_reviewed',true
      );
    end if;

    raise exception 'ATTENDANCE_ALREADY_REVIEWED';
  end if;

  if v_att.status not in ('NORMAL','NEEDS_REVIEW') then
    raise exception 'ATTENDANCE_REVIEW_STATE_NOT_ALLOWED';
  end if;

  if v_decision = 'REJECT' then
    if p_confirmed_start is not null or p_confirmed_end is not null then
      raise exception 'ATTENDANCE_REJECT_CONFIRMED_TIME_NOT_ALLOWED';
    end if;

    update public.attendance
    set status = 'REJECTED',
        reviewed_by = v_uid,
        reviewed_at = now(),
        review_decision = 'REJECT',
        confirmed_start = null,
        confirmed_end = null,
        confirmed_minutes = null
    where id = v_att.id
    returning * into v_att;

    return jsonb_build_object(
      'attendance_id',v_att.id,
      'schedule_id',v_att.schedule_id,
      'status',v_att.status,
      'review_decision',v_att.review_decision,
      'confirmed_start',null,
      'confirmed_end',null,
      'confirmed_minutes',null,
      'already_reviewed',false
    );
  end if;

  if v_decision = 'APPROVE' then
    if p_confirmed_start is not null or p_confirmed_end is not null then
      raise exception 'ATTENDANCE_APPROVE_USES_ACTUAL_TIME';
    end if;
    v_start := v_att.actual_start;
    v_end := v_att.actual_end;
    v_target_status := 'APPROVED';
  else
    if p_confirmed_start is null or p_confirmed_end is null then
      raise exception 'ATTENDANCE_ADJUST_CONFIRMED_TIME_REQUIRED';
    end if;
    v_start := p_confirmed_start;
    v_end := p_confirmed_end;
    v_target_status := 'ADJUSTED';
  end if;

  if v_end <= v_start then
    raise exception 'ATTENDANCE_CONFIRMED_RANGE_INVALID';
  end if;

  if extract(second from v_start) <> 0 or extract(second from v_end) <> 0 then
    raise exception 'ATTENDANCE_CONFIRMED_TIME_MINUTE_PRECISION_REQUIRED';
  end if;

  v_minutes := (extract(epoch from (v_end - v_start)) / 60)::integer;

  update public.attendance
  set status = v_target_status,
      reviewed_by = v_uid,
      reviewed_at = now(),
      review_decision = v_decision,
      confirmed_start = v_start,
      confirmed_end = v_end,
      confirmed_minutes = v_minutes
  where id = v_att.id
  returning * into v_att;

  return jsonb_build_object(
    'attendance_id',v_att.id,
    'schedule_id',v_att.schedule_id,
    'status',v_att.status,
    'review_decision',v_att.review_decision,
    'confirmed_start',v_att.confirmed_start,
    'confirmed_end',v_att.confirmed_end,
    'confirmed_minutes',v_att.confirmed_minutes,
    'already_reviewed',false
  );
end;
$$;

revoke execute on function public.review_attendance_v1(uuid,text,time,time) from public, anon;
grant execute on function public.review_attendance_v1(uuid,text,time,time) to authenticated, postgres;

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

  if tg_op = 'UPDATE'
     and new.status in ('APPROVED','ADJUSTED')
     and old.status is distinct from new.status
     and new.confirmed_start is not null
     and new.confirmed_end is not null
     and new.confirmed_minutes is not null then
    perform public.enqueue_notification_v1(
      'attendance:'||new.id||':confirmed',
      'ATTENDANCE_CONFIRMED','USER',new.user_id,new.store_id,auth.uid(),
      'ATTENDANCE',new.id,new.schedule_id,
      'Giờ công đã được xác nhận',
      'Quản lý đã xác nhận giờ làm cho ngày '||to_char(new.work_date,'DD/MM/YYYY')||'.',
      jsonb_build_object(
        'work_date',new.work_date,
        'status',new.status,
        'confirmed_start',new.confirmed_start,
        'confirmed_end',new.confirmed_end,
        'confirmed_minutes',new.confirmed_minutes,
        'store_id',new.store_id
      ),
      now(),true
    );
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

revoke select, insert, update, delete on table public.attendance from public, anon, authenticated;

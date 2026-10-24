-- #487 P0 Emergency *write-behavior* rollback, derived from hosted pg_get_functiondef
-- 2026-10-24 (read-only snapshot). STOP new AUTO_CONFIRMED writes only.
-- It deliberately keeps AUTO_CONFIRMED constraints, Manager history, and payroll
-- consumption intact for previously committed work, avoiding pay-data loss.
-- This is NOT an automatic migration. Deploy manually only after Owner approval
-- and a safe database backup; do not use on H4 against production.
BEGIN;
CREATE OR REPLACE FUNCTION public.submit_manual_time_attendance_v1(p_schedule_id uuid, p_actual_start time without time zone, p_actual_end time without time zone, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;
REVOKE EXECUTE ON FUNCTION public.submit_manual_time_attendance_v1(uuid,time,time,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_manual_time_attendance_v1(uuid,time,time,text) TO authenticated, postgres;
COMMIT;

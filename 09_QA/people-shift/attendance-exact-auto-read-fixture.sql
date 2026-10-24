-- #487 disposable QA-only: install exact hosted Employee attendance reader.
-- SQL source retrieved read-only on 2026-10-24; extra historical columns are
-- needed to reproduce production's SELECT result schema. No hosted DB writes.
ALTER TABLE public.attendance
 ADD COLUMN check_in timestamptz,
 ADD COLUMN check_out timestamptz,
 ADD COLUMN late_minutes integer,
 ADD COLUMN early_minutes integer,
 ADD COLUMN hours_worked numeric,
 ADD COLUMN amount numeric,
 ADD COLUMN grade text,
 ADD COLUMN hourly_rate numeric;
-- Rebaseline after adding compatibility columns: EXCEPT ALL must compare
-- identical table shapes while still asserting zero synthetic attendance mutations.
DROP TABLE qa_private.attendance_baseline;
CREATE TABLE qa_private.attendance_baseline AS SELECT * FROM public.attendance;
CREATE OR REPLACE FUNCTION public.get_my_attendance_v2(p_from_date date DEFAULT NULL::date, p_to_date date DEFAULT NULL::date)
 RETURNS TABLE(attendance_id uuid, schedule_id uuid, work_date date, store_id uuid, store_code text, store_name text, planned_start time without time zone, planned_end time without time zone, check_in timestamp with time zone, check_out timestamp with time zone, status text, late_minutes integer, early_minutes integer, hours_worked numeric, amount numeric, grade text, hourly_rate numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 select a.id,a.schedule_id,a.work_date,a.store_id,s.code,s.name,a.planned_start,a.planned_end,a.check_in,a.check_out,a.status,a.late_minutes,a.early_minutes,a.hours_worked,a.amount,a.grade,a.hourly_rate
 from public.attendance a join public.stores s on s.id=a.store_id
 where a.user_id=auth.uid() and (p_from_date is null or a.work_date>=p_from_date) and (p_to_date is null or a.work_date<=p_to_date) and a.status not in ('DELETED','DELETED_BY_MANAGER')
 order by a.work_date desc,a.check_in desc nulls last,a.id desc;
$function$
;
REVOKE EXECUTE ON FUNCTION public.get_my_attendance_v2(date,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_attendance_v2(date,date) TO authenticated, postgres;

-- Exact hosted Manager reviewer writes only to disposable PostgreSQL.
CREATE OR REPLACE FUNCTION public.review_attendance_v1(p_attendance_id uuid, p_decision text, p_confirmed_start time without time zone DEFAULT NULL::time without time zone, p_confirmed_end time without time zone DEFAULT NULL::time without time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;
REVOKE EXECUTE ON FUNCTION public.review_attendance_v1(uuid,text,time,time) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_attendance_v1(uuid,text,time,time) TO authenticated,postgres;

-- Supabase CLI 2.122.0 generated migration filename on H4, 2026-10-24 UTC.
-- #487 P0; only apply after isolated QA, hosted function preflight and Owner signoff.
-- IMPORTANT: GitHub merge does not execute this migration on Supabase.
-- Before making the Employee/Manager UI publicly visible, deploy SQL first
-- in a dedicated gated step; verify post-deploy exact RPC shape and rollback.
-- #487 P0 staged migration. Not applied to hosted MAGASIN production.
-- Business choice: exact start+end and no note => AUTO_CONFIRMED. Deviations
-- (including an employee-entered exception note) => NEEDS_REVIEW.
-- No forged Manager reviewer identity. No payroll money is calculated.
-- Per-store pilot gate. Default OFF for every branch on deployment. Only an
-- authorized service-role operator may enable a specific branch after signoff.
CREATE TABLE IF NOT EXISTS public.attendance_auto_confirm_policy_v1(
 store_id uuid PRIMARY KEY REFERENCES public.stores(id),
 enabled boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.attendance_auto_confirm_policy_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.attendance_auto_confirm_policy_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON TABLE public.attendance_auto_confirm_policy_v1 TO service_role,postgres;
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_status_check;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_status_check
 CHECK (status IN ('OPEN','COMPLETED','DELETED','DELETED_BY_MANAGER',
 'DRAFT','SUBMITTED','NORMAL','NEEDS_REVIEW','AUTO_CONFIRMED',
 'APPROVED','ADJUSTED','REJECTED'));
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_confirmed_shape_check;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_confirmed_shape_check
 CHECK (status NOT IN ('APPROVED','ADJUSTED','AUTO_CONFIRMED')
   OR (confirmed_start IS NOT NULL AND confirmed_end IS NOT NULL
     AND confirmed_minutes IS NOT NULL));
ALTER TABLE public.attendance ADD CONSTRAINT attendance_auto_confirmed_shape_v1 CHECK
 (status <> 'AUTO_CONFIRMED' OR
   (submission_status = 'SUBMITTED'
    AND reviewed_by IS NULL AND reviewed_at IS NULL AND review_decision IS NULL
    AND actual_start = planned_start AND actual_end = planned_end
    AND actual_start = confirmed_start AND actual_end = confirmed_end
    AND confirmed_minutes = (extract(epoch FROM (actual_end - actual_start))/60)::integer));
-- Preserve existing unconfirmed status constraint and Manager REVIEWED terminal rules.

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
  v_auto boolean;
  v_new_status text;
  v_minutes integer;
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

  -- Only an *exact* match of both scheduled times at an explicitly enabled store can be self-confirmed.
  -- A note/exception always routes to Manager instead of silently confirming.
  v_auto := p_actual_start = v_schedule.start_time
    and p_actual_end = v_schedule.end_time
    and v_note is null
    and exists (
      select 1 from public.attendance_auto_confirm_policy_v1 policy
      where policy.store_id = v_schedule.store_id and policy.enabled is true
    );
  v_new_status := case when v_auto then 'AUTO_CONFIRMED' else 'NEEDS_REVIEW' end;
  v_minutes := case when v_auto then
    (extract(epoch from (p_actual_end - p_actual_start)) / 60)::integer
    else null end;

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
       and v_existing.status in ('SUBMITTED','NORMAL','NEEDS_REVIEW','AUTO_CONFIRMED') then
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
      note,
      confirmed_start,
      confirmed_end,
      confirmed_minutes
    ) values (
      v_schedule.work_date,
      v_uid,
      v_schedule.store_id,
      v_schedule.id,
      v_new_status,
      v_schedule.start_time,
      v_schedule.end_time,
      p_actual_start,
      p_actual_end,
      now(),
      'SUBMITTED',
      v_note,
      case when v_auto then p_actual_start else null end,
      case when v_auto then p_actual_end else null end,
      v_minutes
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
         and v_existing.status in ('SUBMITTED','NORMAL','NEEDS_REVIEW','AUTO_CONFIRMED') then
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
    'status', v_new_status,
    'submission_status', 'SUBMITTED',
    'already_submitted', false
  );
end;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_manual_time_attendance_v1(uuid,time,time,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_manual_time_attendance_v1(uuid,time,time,text) TO authenticated,postgres;

create or replace function public.build_payroll_estimate_v1(
  p_employee_id uuid,
  p_period_start date,
  p_period_end date,
  p_payroll_revision text,
  p_pay_rule_reference text,
  p_pay_rule_validated boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_revision text := btrim(coalesce(p_payroll_revision, ''));
  v_pay_rule_reference text := btrim(coalesce(p_pay_rule_reference, ''));
  v_identity text;
  v_item_count integer;
  v_total_minutes integer;
  v_source_revision text;
  v_existing public.payroll_entries%rowtype;
  v_created public.payroll_entries%rowtype;
begin
  if p_employee_id is null then
    raise exception 'PAYROLL_EMPLOYEE_ID_REQUIRED';
  end if;

  if p_period_start is null or p_period_end is null then
    raise exception 'PAYROLL_PERIOD_REQUIRED';
  end if;

  if p_period_start > p_period_end then
    raise exception 'PAYROLL_PERIOD_RANGE_INVALID';
  end if;

  if v_revision = '' then
    raise exception 'PAYROLL_REVISION_REQUIRED';
  end if;

  if v_pay_rule_reference = '' then
    raise exception 'PAY_RULE_REFERENCE_REQUIRED';
  end if;

  if p_pay_rule_validated is distinct from true then
    raise exception 'PAY_RULE_NOT_VALIDATED';
  end if;

  v_identity :=
    p_period_start::text || ':' ||
    p_period_end::text || ':' ||
    p_employee_id::text || ':' ||
    v_revision;

  perform pg_advisory_xact_lock(
    hashtextextended('payroll_estimate_v1:' || v_identity, 0)
  );

  select
    count(*)::integer,
    coalesce(sum(a.confirmed_minutes), 0)::integer,
    md5(
      string_agg(
        a.id::text || '|' ||
        a.work_date::text || '|' ||
        a.status || '|' ||
        coalesce(a.review_decision,'AUTO_CONFIRMED') || '|' ||
        coalesce(to_char(a.reviewed_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US'),'AUTO_CONFIRMED') || '|' ||
        a.confirmed_start::text || '|' ||
        a.confirmed_end::text || '|' ||
        a.confirmed_minutes::text,
        ';' order by a.work_date, a.id
      )
    )
  into
    v_item_count,
    v_total_minutes,
    v_source_revision
  from public.attendance a
  where a.user_id = p_employee_id
    and a.work_date between p_period_start and p_period_end
    and a.schedule_id is not null
    and a.submission_status = 'SUBMITTED'
    and (
      (a.status = 'AUTO_CONFIRMED'
        and a.reviewed_by is null and a.reviewed_at is null
        and a.review_decision is null
        and a.actual_start = a.confirmed_start
        and a.actual_end = a.confirmed_end)
      or
      (a.reviewed_by is not null and a.reviewed_at is not null
        and ((a.status = 'APPROVED' and a.review_decision = 'APPROVE')
          or (a.status = 'ADJUSTED' and a.review_decision = 'ADJUST')))
    )
    and a.confirmed_start is not null
    and a.confirmed_end is not null
    and a.confirmed_minutes is not null
    and a.confirmed_minutes >= 0;

  if coalesce(v_item_count, 0) = 0 or v_source_revision is null then
    raise exception 'PAYROLL_CONFIRMED_WORK_TIME_REQUIRED';
  end if;

  select *
  into v_existing
  from public.payroll_entries
  where period_start = p_period_start
    and period_end = p_period_end
    and employee_id = p_employee_id
    and payroll_revision = v_revision
  for update;

  if found then
    if v_existing.pay_rule_reference = v_pay_rule_reference
       and v_existing.pay_rule_validated is true
       and v_existing.source_type = 'CONFIRMED_WORK_TIME'
       and v_existing.confirmed_work_item_count = v_item_count
       and v_existing.confirmed_work_minutes = v_total_minutes
       and v_existing.confirmed_work_source_revision = v_source_revision then
      return jsonb_build_object(
        'payroll_entry_id', v_existing.id,
        'state', v_existing.state,
        'logical_identity', v_identity,
        'employee_id', v_existing.employee_id,
        'period_start', v_existing.period_start,
        'period_end', v_existing.period_end,
        'payroll_revision', v_existing.payroll_revision,
        'pay_rule_reference', v_existing.pay_rule_reference,
        'source_type', v_existing.source_type,
        'confirmed_work_item_count', v_existing.confirmed_work_item_count,
        'confirmed_work_minutes', v_existing.confirmed_work_minutes,
        'confirmed_work_source_revision', v_existing.confirmed_work_source_revision,
        'monetary_amount', null,
        'monetary_amount_reason', 'CANONICAL_PAY_RULE_EVALUATOR_UNRESOLVED',
        'already_existing', true
      );
    end if;

    raise exception 'PAYROLL_REVISION_CONFLICT';
  end if;

  insert into public.payroll_entries (
    employee_id,
    period_start,
    period_end,
    payroll_revision,
    state,
    pay_rule_reference,
    pay_rule_validated,
    source_type,
    confirmed_work_item_count,
    confirmed_work_minutes,
    confirmed_work_source_revision
  )
  values (
    p_employee_id,
    p_period_start,
    p_period_end,
    v_revision,
    'ESTIMATED',
    v_pay_rule_reference,
    true,
    'CONFIRMED_WORK_TIME',
    v_item_count,
    v_total_minutes,
    v_source_revision
  )
  returning * into v_created;

  return jsonb_build_object(
    'payroll_entry_id', v_created.id,
    'state', v_created.state,
    'logical_identity', v_identity,
    'employee_id', v_created.employee_id,
    'period_start', v_created.period_start,
    'period_end', v_created.period_end,
    'payroll_revision', v_created.payroll_revision,
    'pay_rule_reference', v_created.pay_rule_reference,
    'source_type', v_created.source_type,
    'confirmed_work_item_count', v_created.confirmed_work_item_count,
    'confirmed_work_minutes', v_created.confirmed_work_minutes,
    'confirmed_work_source_revision', v_created.confirmed_work_source_revision,
    'monetary_amount', null,
    'monetary_amount_reason', 'CANONICAL_PAY_RULE_EVALUATOR_UNRESOLVED',
    'already_existing', false
  );
end;
$$;

REVOKE EXECUTE ON FUNCTION public.build_payroll_estimate_v1(uuid,date,date,text,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.build_payroll_estimate_v1(uuid,date,date,text,text,boolean) TO service_role,postgres;

-- Manager history includes auto confirmations as read-only completed records.
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
    and a.status in ('NORMAL','NEEDS_REVIEW','AUTO_CONFIRMED','APPROVED','ADJUSTED','REJECTED')
    and (p_from_date is null or a.work_date >= p_from_date)
    and (p_to_date is null or a.work_date <= p_to_date)
  order by
    case when a.status in ('NORMAL','NEEDS_REVIEW') then 0 else 1 end,
    a.work_date desc,
    a.submitted_at asc nulls last,
    a.id;
end;
$$;
REVOKE EXECUTE ON FUNCTION public.list_manager_attendance_review_v1(uuid,date,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_manager_attendance_review_v1(uuid,date,date) TO authenticated,postgres;

-- #487 disposable attendance authorization + payroll fixture, synthetic rows only.
-- Installed after #517-#520 four-store signed JWT fixture and Manager publish rollback.
-- Do NOT run against hosted production. No employee names / secrets are imported.
DO $qa$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role')
 THEN CREATE ROLE service_role NOLOGIN; END IF;
END $qa$;
CREATE TABLE public.attendance(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 work_date date NOT NULL,
 user_id uuid NOT NULL REFERENCES public.profiles(id),
 store_id uuid NOT NULL REFERENCES public.stores(id),
 schedule_id uuid NOT NULL REFERENCES public.work_schedules(id),
 status text NOT NULL DEFAULT 'NEEDS_REVIEW',
 planned_start time,
 planned_end time,
 actual_start time,
 actual_end time,
 submitted_at timestamptz,
 submission_status text,
 note text,
 reviewed_by uuid,
 reviewed_at timestamptz,
 review_decision text,
 confirmed_start time,
 confirmed_end time,
 confirmed_minutes integer,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX qa_one_active_attendance_per_schedule ON public.attendance(schedule_id)
 WHERE status NOT IN ('DELETED','DELETED_BY_MANAGER');
create table public.payroll_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id),
  period_start date not null,
  period_end date not null,
  payroll_revision text not null,
  state text not null default 'ESTIMATED',
  pay_rule_reference text not null,
  pay_rule_validated boolean not null default false,
  source_type text not null default 'CONFIRMED_WORK_TIME',
  confirmed_work_item_count integer not null,
  confirmed_work_minutes integer not null,
  confirmed_work_source_revision text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint payroll_entries_period_check
    check (period_start <= period_end),
  constraint payroll_entries_revision_check
    check (btrim(payroll_revision) <> ''),
  constraint payroll_entries_state_check
    check (state in ('ESTIMATED','REVIEWED','FINALIZED','PAID')),
  constraint payroll_entries_pay_rule_reference_check
    check (btrim(pay_rule_reference) <> ''),
  constraint payroll_entries_pay_rule_validated_check
    check (pay_rule_validated is true),
  constraint payroll_entries_source_type_check
    check (source_type = 'CONFIRMED_WORK_TIME'),
  constraint payroll_entries_item_count_check
    check (confirmed_work_item_count > 0),
  constraint payroll_entries_minutes_check
    check (confirmed_work_minutes >= 0),
  constraint payroll_entries_source_revision_check
    check (btrim(confirmed_work_source_revision) <> ''),
  constraint payroll_entries_logical_identity_key
    unique (period_start, period_end, employee_id, payroll_revision)
);
-- Source-of-truth employee/schedule ownership check. Matches production TASK-098 RPC.
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
REVOKE EXECUTE ON FUNCTION public.validate_attendance_assignment_authority_v1(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.validate_attendance_assignment_authority_v1(uuid,uuid) TO postgres;
-- Distinct synthetic finished assignments, separate cases for auto / deviation / note.
INSERT INTO public.work_schedules(id,user_id,store_id,work_date,status,start_time,end_time,origin)
SELECT ('93000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
       '90000000-0000-4000-8000-000000000007'::uuid,
       '91000000-0000-4000-8000-000000000003'::uuid,
       (now() at time zone 'Asia/Ho_Chi_Minh')::date - 2,
       'APPROVED','06:00'::time,'10:00'::time,'MANAGER_ASSIGNED'
FROM generate_series(1,3) AS n;
INSERT INTO public.work_schedules(id,user_id,store_id,work_date,status,start_time,end_time,origin)
VALUES ('93000000-0000-4000-8000-000000000004',
'90000000-0000-4000-8000-000000000007',
'91000000-0000-4000-8000-000000000003',
(now() at time zone 'Asia/Ho_Chi_Minh')::date + 2,
'APPROVED','06:00','10:00','MANAGER_ASSIGNED');
REVOKE ALL ON public.attendance,public.payroll_entries FROM PUBLIC,anon,authenticated;
CREATE TABLE qa_private.attendance_baseline AS SELECT * FROM public.attendance;

-- Real TASK-100 active Manager/Owner store-scoped reader authority.
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
REVOKE EXECUTE ON FUNCTION public.validate_manager_attendance_review_authority_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.validate_manager_attendance_review_authority_v1(uuid) TO postgres;

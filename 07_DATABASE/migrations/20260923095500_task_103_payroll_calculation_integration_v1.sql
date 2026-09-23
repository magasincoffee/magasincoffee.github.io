-- MAGASIN Workforce Operations V1 — TASK-103 Payroll Calculation Integration V1
-- Persists only the canonical ESTIMATED payroll calculation basis.
-- No monetary amount is derived because the canonical pay-rule evaluator/rate semantics are unresolved.
-- Browser roles have no direct DML or EXECUTE authority.

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

alter table public.payroll_entries enable row level security;

revoke all on table public.payroll_entries from public, anon, authenticated;

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
        a.review_decision || '|' ||
        to_char(a.reviewed_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US') || '|' ||
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
    and a.reviewed_by is not null
    and a.reviewed_at is not null
    and (
      (a.status = 'APPROVED' and a.review_decision = 'APPROVE')
      or
      (a.status = 'ADJUSTED' and a.review_decision = 'ADJUST')
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

revoke execute on function public.build_payroll_estimate_v1(uuid,date,date,text,text,boolean)
  from public, anon, authenticated;
grant execute on function public.build_payroll_estimate_v1(uuid,date,date,text,text,boolean)
  to service_role, postgres;

comment on table public.payroll_entries is
  'TASK-103 canonical payroll calculation basis. ESTIMATED rows persist confirmed-work-time aggregation + validated opaque pay-rule reference; no monetary calculation is inferred.';

comment on function public.build_payroll_estimate_v1(uuid,date,date,text,text,boolean) is
  'TASK-103 server-only idempotent ESTIMATED payroll basis builder. Consumes only reviewed confirmed work time and never attendance.amount/hourly_rate/hours_worked.';

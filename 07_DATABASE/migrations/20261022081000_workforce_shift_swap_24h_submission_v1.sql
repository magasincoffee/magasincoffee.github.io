-- ISSUE-487 / ISSUE-498: server-owned >=24h notice for SHIFT_SWAP submission.
-- STAGED SOURCE ONLY: production migration requires review and authorized QA.
-- No existing swap/schedule row is changed; SHIFT_GIVE has NO 24-hour guard.
--
-- Enforce at INSERT of the request, not at Manager's later approval.
-- The confirmed business rule concerns WHEN THE REQUEST IS SUBMITTED.
-- Existing validate_shift_swap_v1 safety checks and peer/Manager workflow remain.
-- Clock source must be wall clock, not the time the transaction began.

create or replace function public.shift_swap_submission_on_time_v1(
  p_requester_date date,
  p_requester_start time,
  p_target_date date,
  p_target_start time,
  p_checked_at timestamptz
)
returns boolean
language sql
stable
set search_path=public
as $function$
  select coalesce(
    p_requester_date is not null
    and p_requester_start is not null
    and p_target_date is not null
    and p_target_start is not null
    and p_checked_at is not null
    and least(
      (p_requester_date + p_requester_start) at time zone 'Asia/Ho_Chi_Minh',
      (p_target_date + p_target_start) at time zone 'Asia/Ho_Chi_Minh'
    ) >= (p_checked_at + interval '24 hours'),
    false
  );
$function$;

create or replace function public.enforce_shift_swap_submission_time_v1()
returns trigger
language plpgsql
security definer
set search_path=public
as $function$
declare
  v_requester public.work_schedules%rowtype;
  v_target public.work_schedules%rowtype;
begin
  -- Guard submissions only. Later peer consent and Manager approval do NOT
  -- become subject to a second, unapproved rolling 24-hour condition.
  if new.status not in ('PENDING','PEER_ACCEPTED') then return new; end if;

  select * into v_requester from public.work_schedules
    where id=new.requester_schedule_id;
  select * into v_target from public.work_schedules
    where id=new.target_schedule_id;

  if v_requester.id is null or v_target.id is null then
    raise exception 'SHIFT_SWAP_SCHEDULE_NOT_FOUND';
  end if;

  if not public.shift_swap_submission_on_time_v1(
    v_requester.work_date,v_requester.start_time,
    v_target.work_date,v_target.start_time,
    clock_timestamp()
  ) then
    raise exception 'SHIFT_SWAP_REQUIRES_24H_NOTICE';
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_shift_swap_submission_time_v1 on public.shift_swaps;
create trigger trg_shift_swap_submission_time_v1
before insert or update of requester_schedule_id,target_schedule_id
  on public.shift_swaps
for each row execute function public.enforce_shift_swap_submission_time_v1();

revoke all on function public.shift_swap_submission_on_time_v1(date,time,date,time,timestamptz)
  from public,anon,authenticated;
revoke all on function public.enforce_shift_swap_submission_time_v1()
  from public,anon,authenticated;

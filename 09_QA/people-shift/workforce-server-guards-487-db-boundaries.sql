-- ISSUE-487: executable deterministic boundary assertions.
-- Run on DISPOSABLE PostgreSQL after applying BOTH 20261022 workforce migrations.
-- These pure-function assertions DO NOT replace signed JWT, trigger, RLS or
-- post-deploy browser E2E. Never use real employee/schedule rows in QA.
do $test$
begin
  -- Local Sunday 2026-09-27: 11:59:59 is OPEN, 12:00:00 is CLOSED.
  if not public.employee_availability_window_open_v1(
    '2026-09-28', '2026-09-27 11:59:59+07'::timestamptz
  ) then raise exception 'QA_FAIL: availability 11:59:59'; end if;

  if public.employee_availability_window_open_v1(
    '2026-09-28', '2026-09-27 12:00:00+07'::timestamptz
  ) then raise exception 'QA_FAIL: availability noon'; end if;

  if public.employee_availability_window_open_v1(
    '2026-09-28', '2026-09-27 12:00:01+07'::timestamptz
  ) then raise exception 'QA_FAIL: availability noon plus one'; end if;

  if public.employee_availability_window_open_v1(
    '2026-10-05', '2026-09-27 11:59:59+07'::timestamptz
  ) then raise exception 'QA_FAIL: forged following-fortnight date'; end if;

  if public.employee_availability_window_open_v1(
    '2026-09-27', '2026-09-27 11:59:59+07'::timestamptz
  ) then raise exception 'QA_FAIL: current-week date'; end if;

  -- At Monday local 00:00, the target must ROLL to the next Monday.
  if public.employee_availability_window_open_v1(
    '2026-09-28', '2026-09-28 00:00:00+07'::timestamptz
  ) then raise exception 'QA_FAIL: Monday rollover old week'; end if;

  if not public.employee_availability_window_open_v1(
    '2026-10-05', '2026-09-28 00:00:00+07'::timestamptz
  ) then raise exception 'QA_FAIL: Monday rollover next week'; end if;

  -- Swap: both shifts must start at or after exact now+24h.
  if not public.shift_swap_submission_on_time_v1(
    '2026-10-26','08:00','2026-10-26','11:00',
    '2026-10-25 08:00:00+07'::timestamptz
  ) then raise exception 'QA_FAIL: swap exactly 24h'; end if;

  if public.shift_swap_submission_on_time_v1(
    '2026-10-26','08:00','2026-10-26','11:00',
    '2026-10-25 08:00:01+07'::timestamptz
  ) then raise exception 'QA_FAIL: swap 23:59:59'; end if;

  -- The target shift can be earlier than the requester's shift.
  if public.shift_swap_submission_on_time_v1(
    '2026-10-26','11:00','2026-10-26','07:30',
    '2026-10-25 08:00:00+07'::timestamptz
  ) then raise exception 'QA_FAIL: earlier target shift'; end if;

  -- An overnight shift is judged by START, not END or calendar midnight.
  if not public.shift_swap_submission_on_time_v1(
    '2026-10-26','00:00','2026-10-26','03:00',
    '2026-10-25 00:00:00+07'::timestamptz
  ) then raise exception 'QA_FAIL: overnight exact 24h'; end if;
end
$test$;

-- Still REQUIRED in a disposable role-capable fixture with signed JWT:
-- * direct insert/update/delete using an ACTIVE employee actor at cutoff;
-- * owner != auth.uid() forged row must fail;
-- * inactive employee must fail; Manager override must continue to work;
-- * 05:00/22:00 step30 reject e.g. 05:15; same-row move of old locked week;
-- * concurrent session begun before noon but mutating after noon;
-- * shift_swaps INSERT with earlier requester/target and 23:59:59 must fail;
-- * shift_gives remains exempt; no premature official schedule mutation;
-- * auth cross-store negative test, rollback/permission + 3-role browser E2E.

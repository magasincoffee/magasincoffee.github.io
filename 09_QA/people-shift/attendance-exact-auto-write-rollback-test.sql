-- QA ONLY, executed AFTER emergency write rollback on disposable Postgres.
-- Assert new exact shifts go back to Manager review while *already* auto confirmed
-- records remain valid payroll source. Transaction rolls back all synthetic writes.
\set ON_ERROR_STOP on
BEGIN;
INSERT INTO public.attendance (
 schedule_id,user_id,store_id,work_date,status,
 planned_start,planned_end,actual_start,actual_end,submitted_at,submission_status,
 confirmed_start,confirmed_end,confirmed_minutes
)
SELECT id,user_id,store_id,work_date,'AUTO_CONFIRMED',
 start_time,end_time,start_time,end_time,now(),'SUBMITTED',
 start_time,end_time,240
FROM public.work_schedules
WHERE id='93000000-0000-4000-8000-000000000003';
SELECT set_config('request.jwt.claims',
 '{"role":"authenticated","sub":"90000000-0000-4000-8000-000000000007"}',true);
SET LOCAL ROLE authenticated;
DO $qa$
DECLARE v jsonb;
BEGIN
 v:=public.submit_manual_time_attendance_v1(
  '93000000-0000-4000-8000-000000000001','06:00','10:00',null);
 IF v->>'status'<>'NEEDS_REVIEW' OR v->>'submission_status'<>'SUBMITTED'
 THEN RAISE EXCEPTION 'QA_WRITE_ROLLBACK_DID_NOT_STOP_AUTOCONFIRM: %',v; END IF;
 RAISE NOTICE 'QA_WRITE_ROLLBACK_NEW_SUBMISSION_NEEDS_REVIEW=PASS';
END $qa$;
RESET ROLE;
DO $qa$
DECLARE v jsonb; n integer;
BEGIN
 v:=public.build_payroll_estimate_v1(
 '90000000-0000-4000-8000-000000000007',
 (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date-2,
 (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date-2,
 'QA_ROLLBACK_A','QA_VALIDATED_RULE',true);
 IF (v->>'confirmed_work_item_count')::int <> 1 OR
    (v->>'confirmed_work_minutes')::int <> 240
 THEN RAISE EXCEPTION 'QA_WRITE_ROLLBACK_OLD_AUTO_PAYROLL_LOST: %',v; END IF;
 SELECT count(*) INTO n FROM public.attendance WHERE status='NEEDS_REVIEW';
 IF n<>1 THEN RAISE EXCEPTION 'QA_WRITE_ROLLBACK_PENDING_COUNT_BAD %',n; END IF;
 RAISE NOTICE 'QA_WRITE_ROLLBACK_KEEP_PRIOR_AUTO_PAYROLL=PASS';
END $qa$;
ROLLBACK;
DO $qa$
BEGIN
 IF (SELECT count(*) FROM public.attendance)<>0 OR
    (SELECT count(*) FROM public.payroll_entries)<>0
 THEN RAISE EXCEPTION 'QA_WRITE_ROLLBACK_RESIDUAL_RECORDS'; END IF;
 RAISE NOTICE 'QA_WRITE_ROLLBACK_CLEAN=PASS';
END $qa$;

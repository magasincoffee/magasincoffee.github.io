-- QA independent PostgreSQL proof: exactly-one auto-confirmed row, no fabricated
-- reviewer, non-matching rows pending, payroll consumes only confirmed work time.
-- All operations in this file target disposable CI DB. No hosted credentials.
BEGIN;
DO $qa$
DECLARE n integer; x public.attendance%rowtype; got jsonb; repeat_got jsonb;
 d date:=(now() at time zone 'Asia/Ho_Chi_Minh')::date-2;
BEGIN
 SELECT count(*) INTO n FROM public.attendance;
 IF n<>4 THEN RAISE EXCEPTION 'QA_ATTENDANCE_SUBMISSION_COUNT_EXPECT_4 got %',n; END IF;
 SELECT * INTO x FROM public.attendance
 WHERE schedule_id='93000000-0000-4000-8000-000000000001';
 IF x.status<>'AUTO_CONFIRMED' OR x.submission_status<>'SUBMITTED'
    OR x.reviewed_by IS NOT NULL OR x.reviewed_at IS NOT NULL
    OR x.review_decision IS NOT NULL OR x.confirmed_minutes<>240
    OR x.confirmed_start IS DISTINCT FROM x.actual_start
    OR x.confirmed_end IS DISTINCT FROM x.actual_end
 THEN RAISE EXCEPTION 'QA_AUTO_CONFIRM_NOT_AUTHORITATIVE'; END IF;
 SELECT count(*) INTO n FROM public.attendance
 WHERE status='NEEDS_REVIEW' AND confirmed_minutes IS NULL AND reviewed_by IS NULL;
 IF n<>3 THEN RAISE EXCEPTION 'QA_EXCEPTIONS_NOT_PENDING n=%',n; END IF;
 got:=public.build_payroll_estimate_v1(
  '90000000-0000-4000-8000-000000000007',d,d,'QA_AUTO_A','QA_VALIDATED_RULE',true);
 IF (got->>'confirmed_work_item_count')::integer<>1
    OR (got->>'confirmed_work_minutes')::integer<>240
    OR got->>'state'<>'ESTIMATED'
 THEN RAISE EXCEPTION 'QA_PAYROLL_AUTO_SOURCE_FAIL %',got; END IF;
 repeat_got:=public.build_payroll_estimate_v1(
  '90000000-0000-4000-8000-000000000007',d,d,'QA_AUTO_A','QA_VALIDATED_RULE',true);
 IF (repeat_got->>'already_existing')::boolean IS DISTINCT FROM true
    OR repeat_got->>'payroll_entry_id'<>got->>'payroll_entry_id'
 THEN RAISE EXCEPTION 'QA_PAYROLL_IDEMPOTENCY_FAIL %',repeat_got; END IF;
 -- Manager-confirmed deviation should join AUTO_CONFIRMED in NEW revision only.
 UPDATE public.attendance
 SET status='APPROVED',reviewed_by='90000000-0000-4000-8000-000000000001',
  reviewed_at=now(),review_decision='APPROVE',
  confirmed_start=actual_start,confirmed_end=actual_end,
  confirmed_minutes=(extract(epoch FROM (actual_end-actual_start))/60)::integer
 WHERE schedule_id='93000000-0000-4000-8000-000000000002';
 got:=public.build_payroll_estimate_v1(
  '90000000-0000-4000-8000-000000000007',d,d,'QA_AUTO_B','QA_VALIDATED_RULE',true);
 IF (got->>'confirmed_work_item_count')::integer<>2
    OR (got->>'confirmed_work_minutes')::integer<>450
 THEN RAISE EXCEPTION 'QA_PAYROLL_MIXED_SOURCE_FAIL %',got; END IF;
 SELECT count(*) INTO n FROM public.payroll_entries;
 IF n<>2 THEN RAISE EXCEPTION 'QA_PAYROLL_REVISION_COUNT_INVALID %',n; END IF;
 RAISE NOTICE 'QA_ATTENDANCE_AUTO_VS_REVIEW=PASS 1 auto, 2 pending initially';
 RAISE NOTICE 'QA_PAYROLL_AUTO_SOURCE=PASS 240 minutes, mixed=450 minutes';
END $qa$;
-- Restore exactly original rows; QA database has no real attendance records.
DELETE FROM public.payroll_entries WHERE payroll_revision IN ('QA_AUTO_A','QA_AUTO_B');
DELETE FROM public.attendance
WHERE schedule_id IN (
'93000000-0000-4000-8000-000000000001',
'93000000-0000-4000-8000-000000000002',
'93000000-0000-4000-8000-000000000003',
'93000000-0000-4000-8000-000000000005');
DO $qa$
DECLARE add_count integer;del_count integer;
BEGIN
 SELECT count(*) INTO add_count FROM
  (SELECT * FROM public.attendance EXCEPT ALL SELECT * FROM qa_private.attendance_baseline) x;
 SELECT count(*) INTO del_count FROM
  (SELECT * FROM qa_private.attendance_baseline EXCEPT ALL SELECT * FROM public.attendance) x;
 IF add_count<>0 OR del_count<>0 OR EXISTS(SELECT 1 FROM public.payroll_entries)
 THEN RAISE EXCEPTION 'QA_ATTENDANCE_OR_PAYROLL_RESIDUAL add=% lost=%',add_count,del_count; END IF;
 RAISE NOTICE 'QA_ATTENDANCE_PAYROLL_RESTORED=PASS added=0 removed=0 payroll=0';
END $qa$;
COMMIT;

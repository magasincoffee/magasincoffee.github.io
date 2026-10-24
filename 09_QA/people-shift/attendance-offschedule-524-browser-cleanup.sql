-- Synthetic-only QA teardown (DO NOT RUN ON HOSTED). Deliberately irreversible
-- here because every row and UUID in this isolated database was created by the job.
DO $$ BEGIN
 IF (SELECT count(*) FROM public.attendance_offschedule_requests_v1)<2
 THEN RAISE EXCEPTION 'BROWSER_QA_ROWS_MISSING'; END IF;
 IF EXISTS(SELECT 1 FROM public.attendance_offschedule_requests_v1
 WHERE status='NEEDS_REVIEW')
 THEN RAISE EXCEPTION 'BROWSER_QA_UNREVIEWED_RESIDUAL'; END IF;
 IF EXISTS(SELECT 1 FROM public.attendance)
 OR EXISTS(SELECT 1 FROM public.payroll_entries)
 OR EXISTS(SELECT 1 FROM public.work_schedules)
 THEN RAISE EXCEPTION 'OFFSCHEDULE_CREATED_CANONICAL_OR_PAYROLL_ROWS'; END IF;
END $$;
DELETE FROM public.attendance_offschedule_requests_v1;
UPDATE public.attendance_offschedule_policy_v1 SET enabled=false;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.attendance_offschedule_requests_v1)
 OR EXISTS(SELECT 1 FROM public.attendance_offschedule_policy_v1 WHERE enabled)
 OR EXISTS(SELECT 1 FROM public.payroll_entries)
 THEN RAISE EXCEPTION 'OFFSCHEDULE_QA_CLEANUP_FAILED'; END IF;
END $$;
SELECT 'OFFSCHEDULE_524_ZERO_RESIDUAL_CLEANUP_PASS' AS evidence;

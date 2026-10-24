-- Transaction rollback ensures zero residual synthetic rows.
BEGIN;
INSERT INTO public.attendance_offschedule_policy_v1(store_id,enabled)
VALUES('91000000-0000-4000-8000-000000000003',true);
CREATE FUNCTION pg_temp.assert_failure(p_sql text,p_error text) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE error_text text;
BEGIN
 BEGIN EXECUTE p_sql; EXCEPTION WHEN OTHERS THEN
 GET STACKED DIAGNOSTICS error_text=MESSAGE_TEXT;
 IF position(p_error IN error_text)>0 THEN RETURN; END IF;
 RAISE EXCEPTION 'UNEXPECTED_ERROR: % (wanted %)',error_text,p_error;
 END;
 RAISE EXCEPTION 'EXPECTED_FAILURE: %',p_error;
END $$;
SELECT set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000007',true);
DO $qa$
DECLARE v jsonb; v2 jsonb;
BEGIN
 SELECT public.submit_offschedule_attendance_request_v1(
 '91000000-0000-4000-8000-000000000003',current_date-2,'12:00','15:00','No published shift') INTO v;
 IF v->>'status'<>'NEEDS_REVIEW' OR (v->>'already_submitted')::boolean THEN
 RAISE EXCEPTION 'EMPLOYEE_SUBMIT_FAILED'; END IF;
 SELECT public.submit_offschedule_attendance_request_v1(
 '91000000-0000-4000-8000-000000000003',current_date-2,'12:00','15:00','No published shift') INTO v2;
 IF NOT (v2->>'already_submitted')::boolean OR v->>'request_id'<>v2->>'request_id'
 THEN RAISE EXCEPTION 'IDEMPOTENCY_FAILED'; END IF;
END $qa$;
SELECT pg_temp.assert_failure($q$SELECT public.submit_offschedule_attendance_request_v1('91000000-0000-4000-8000-000000000001',current_date-2,'12:00','13:00','wrong store')$q$,'OFFSCHEDULE_PILOT_DISABLED');
SELECT pg_temp.assert_failure($q$SELECT public.submit_offschedule_attendance_request_v1('91000000-0000-4000-8000-000000000003',current_date-2,'14:00','16:00','Overlapping claim')$q$,'OFFSCHEDULE_OVERLAPPING_REQUEST');
SELECT pg_temp.assert_failure($q$SELECT public.submit_offschedule_attendance_request_v1('91000000-0000-4000-8000-000000000003',current_date+1,'12:00','13:00','future date')$q$,'OFFSCHEDULE_FUTURE_NOT_ALLOWED');
SELECT pg_temp.assert_failure($q$SELECT public.submit_offschedule_attendance_request_v1('91000000-0000-4000-8000-000000000003',current_date-2,'12:00','15:00','different explanation')$q$,'OFFSCHEDULE_DUPLICATE_CONFLICT');
SELECT pg_temp.assert_failure($q$SELECT public.review_offschedule_attendance_request_v1((SELECT id FROM public.attendance_offschedule_requests_v1 LIMIT 1),'APPROVE')$q$,'REVIEW_ROLE_NOT_ALLOWED');
SELECT set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000009',true);
SELECT pg_temp.assert_failure($q$SELECT public.review_offschedule_attendance_request_v1((SELECT id FROM public.attendance_offschedule_requests_v1 LIMIT 1),'APPROVE')$q$,'STORE_NOT_ALLOWED');
SELECT set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000010',true);
SELECT pg_temp.assert_failure($q$SELECT public.review_offschedule_attendance_request_v1((SELECT id FROM public.attendance_offschedule_requests_v1 LIMIT 1),'APPROVE')$q$,'OFFSCHEDULE_MANAGER_ONLY');
SELECT set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000008',true);
DO $qa$ DECLARE r jsonb; BEGIN
 SELECT public.review_offschedule_attendance_request_v1(
 (SELECT id FROM public.attendance_offschedule_requests_v1 LIMIT 1),'APPROVE') INTO r;
 IF r->>'payroll_included'<>'false' OR r->>'schedule_created'<>'false'
 THEN RAISE EXCEPTION 'REVIEW_FIREWALL_FAILED'; END IF;
END $qa$;
SELECT pg_temp.assert_failure($q$SELECT public.review_offschedule_attendance_request_v1((SELECT id FROM public.attendance_offschedule_requests_v1 LIMIT 1),'APPROVE')$q$,'OFFSCHEDULE_ALREADY_REVIEWED');
DO $qa$ BEGIN
 IF (SELECT count(*) FROM public.attendance_offschedule_requests_v1 WHERE status='APPROVED' AND confirmed_minutes=180 AND reviewed_by='90000000-0000-4000-8000-000000000008') <> 1
 THEN RAISE EXCEPTION 'CONFIRMED_MINUTES_INVALID'; END IF;
 IF (SELECT count(*) FROM public.attendance)<>0 OR (SELECT count(*) FROM public.work_schedules)<>0
 OR (SELECT count(*) FROM public.payroll_entries)<>0 THEN RAISE EXCEPTION 'PAYROLL_SCHEDULE_FIREWALL_BROKEN'; END IF;
END $qa$;
ROLLBACK;
DO $qa$ BEGIN IF (SELECT count(*) FROM public.attendance_offschedule_requests_v1)<>0
THEN RAISE EXCEPTION 'ROLLBACK_RESIDUAL'; END IF; END $qa$;
SELECT 'OFFSCHEDULE_524_ISOLATED_SQL_PASS' AS evidence;

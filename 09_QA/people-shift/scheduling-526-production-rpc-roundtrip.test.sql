-- Actual production RPCs run in a disposable PostgreSQL DB with fake actor claims/data.
-- The QA actor identity below is synthetic. This does not access hosted production.
INSERT INTO public.stores VALUES
 ('10000000-0000-4000-8000-000000000001','QA1','ACTIVE'),
 ('10000000-0000-4000-8000-000000000002','QA2','ACTIVE');
INSERT INTO public.profiles VALUES
 ('20000000-0000-4000-8000-000000000001','QA Manager','ACTIVE','STORE_MANAGER'),
 ('20000000-0000-4000-8000-000000000002','QA Unscoped Manager','ACTIVE','STORE_MANAGER'),
 ('20000000-0000-4000-8000-000000000003','QA Staff available','ACTIVE','STAFF'),
 ('20000000-0000-4000-8000-000000000004','QA Staff limited','ACTIVE','STAFF');
INSERT INTO public.qa_manager_scopes VALUES
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001');
INSERT INTO public.employee_store_priorities VALUES
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001'),
 ('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001');
INSERT INTO public.employee_availability VALUES
 ('20000000-0000-4000-8000-000000000003','2026-10-26','AVAILABLE','06:00','14:00'),
 ('20000000-0000-4000-8000-000000000004','2026-10-26','AVAILABLE','06:00','12:00');
INSERT INTO public.schedule_generation_runs VALUES
 ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',
  '2026-10-26','2026-11-01','DRAFT',0,now());

SELECT set_config('qa.actor_id','20000000-0000-4000-8000-000000000001',false);
SELECT set_config('qa.actor_role','STORE_MANAGER',false);

DO $qa$
DECLARE
 v_count integer; v_saved record; v_valid jsonb; v_hours numeric;
BEGIN
 SELECT public.replace_schedule_generation_assignments(
  '30000000-0000-4000-8000-000000000001',
  '[{"user_id":"20000000-0000-4000-8000-000000000003","store_id":"10000000-0000-4000-8000-000000000001",
     "work_date":"2026-10-26","start_time":"06:00","end_time":"14:00","status":"DRAFT"}]'::jsonb
 ) INTO v_count;
 IF v_count<>1 THEN RAISE EXCEPTION 'QA526_WRITER_COUNT_FAILED'; END IF;
 SELECT * INTO v_saved FROM public.get_schedule_generation_assignments('30000000-0000-4000-8000-000000000001');
 IF NOT FOUND OR v_saved.start_time<>time '06:00' OR v_saved.end_time<>time '14:00'
 THEN RAISE EXCEPTION 'QA526_DB_HHMM_ROUNDTRIP_FAILED'; END IF;
 v_valid:=public.validate_schedule_generation_v1('30000000-0000-4000-8000-000000000001');
 IF (v_valid->>'valid')::boolean IS DISTINCT FROM TRUE THEN
   RAISE EXCEPTION 'QA526_VALID_SHIFT_REJECTED: %',v_valid; END IF;
 SELECT total_hours INTO v_hours FROM public.schedule_generation_runs WHERE id='30000000-0000-4000-8000-000000000001';
 IF v_hours<>8 THEN RAISE EXCEPTION 'QA526_HOURS_BAD: %',v_hours; END IF;
 RAISE NOTICE 'QA526_REAL_PG_RPC_WRITE_READ_HHMM_8H_PASS';
END $qa$;

DO $qa$
DECLARE v_err text; v_saved record; v_count integer;
BEGIN
 BEGIN
  PERFORM public.replace_schedule_generation_assignments(
   '30000000-0000-4000-8000-000000000001',
   '[{"user_id":"20000000-0000-4000-8000-000000000004","store_id":"10000000-0000-4000-8000-000000000001",
      "work_date":"2026-10-26","start_time":"06:00","end_time":"14:00","status":"DRAFT"}]'::jsonb);
  RAISE EXCEPTION 'QA526_UNEXPECTED_MISMATCH_ACCEPTED';
 EXCEPTION WHEN OTHERS THEN
  v_err:=SQLERRM;
  IF position('AVAILABILITY_MISMATCH' IN v_err)=0 THEN
   RAISE EXCEPTION 'QA526_EXPECTED_AVAILABILITY_MISMATCH_BUT_GOT: %',v_err;
  END IF;
 END;
 SELECT count(*) INTO v_count FROM public.schedule_generation_assignments
   WHERE generation_id='30000000-0000-4000-8000-000000000001';
 SELECT * INTO v_saved FROM public.get_schedule_generation_assignments('30000000-0000-4000-8000-000000000001');
 IF v_count<>1 OR v_saved.user_id<>'20000000-0000-4000-8000-000000000003'
    OR v_saved.start_time<>time '06:00' OR v_saved.end_time<>time '14:00'
 THEN RAISE EXCEPTION 'QA526_FAILED_VALIDATION_MUST_ROLLBACK_ATOMICALLY'; END IF;
 RAISE NOTICE 'QA526_AVAILABILITY_MISMATCH_ATOMIC_ROLLBACK_PASS';
END $qa$;

INSERT INTO public.employee_availability VALUES
 ('20000000-0000-4000-8000-000000000003','2026-10-26','AVAILABLE','05:00','22:00');
DO $qa$
DECLARE v_saved record;
BEGIN
 PERFORM public.replace_schedule_generation_assignments(
  '30000000-0000-4000-8000-000000000001',
  '[{"user_id":"20000000-0000-4000-8000-000000000003","store_id":"10000000-0000-4000-8000-000000000001",
     "work_date":"2026-10-26","start_time":"05:00","end_time":"22:00","status":"DRAFT"}]'::jsonb);
 SELECT * INTO v_saved FROM public.get_schedule_generation_assignments('30000000-0000-4000-8000-000000000001');
 IF v_saved.start_time<>time '05:00' OR v_saved.end_time<>time '22:00'
 THEN RAISE EXCEPTION 'QA526_BOUNDARY_DB_ROUNDTRIP_FAILED'; END IF;
 RAISE NOTICE 'QA526_BOUNDARY_0500_2200_DB_ROUNDTRIP_PASS';
END $qa$;

SELECT set_config('qa.actor_id','20000000-0000-4000-8000-000000000002',false);
DO $qa$
DECLARE v_error text;
BEGIN
 BEGIN
  PERFORM public.replace_schedule_generation_assignments('30000000-0000-4000-8000-000000000001','[]'::jsonb);
  RAISE EXCEPTION 'QA526_UNSCOPED_MANAGER_ALLOWED';
 EXCEPTION WHEN OTHERS THEN
  v_error:=SQLERRM;
  IF position('STORE_NOT_ALLOWED' IN v_error)=0 THEN
   RAISE EXCEPTION 'QA526_ACL_EXPECTED_STORE_NOT_ALLOWED_BUT_GOT: %',v_error; END IF;
 END;
 RAISE NOTICE 'QA526_MANAGER_STORE_ACL_DENIED_PASS';
END $qa$;

SELECT set_config('qa.actor_id','20000000-0000-4000-8000-000000000003',false);
SELECT set_config('qa.actor_role','STAFF',false);
DO $qa$
DECLARE v_error text;
BEGIN
 BEGIN
  PERFORM public.replace_schedule_generation_assignments('30000000-0000-4000-8000-000000000001','[]'::jsonb);
  RAISE EXCEPTION 'QA526_STAFF_ALLOWED_MANAGER_RPC';
 EXCEPTION WHEN OTHERS THEN
  v_error:=SQLERRM;
  IF position('ROLE_NOT_ALLOWED' IN v_error)=0 THEN
   RAISE EXCEPTION 'QA526_ROLE_EXPECTED_DENIAL_BUT_GOT: %',v_error; END IF;
 END;
 RAISE NOTICE 'QA526_STAFF_CANNOT_WRITE_MANAGER_DRAFT_PASS';
END $qa$;

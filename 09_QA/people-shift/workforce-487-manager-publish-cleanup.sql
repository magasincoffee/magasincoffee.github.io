-- #487: independently attest exact published result and restore ephemeral SQL state.
-- Run ONLY in isolated CI PostgreSQL after the signed-JWT publish script succeeds.
BEGIN;
DO $qa$
DECLARE n_runs integer; n_official integer; n_assignments integer; n_extra integer;
BEGIN
 SELECT count(*) INTO n_runs FROM public.schedule_generation_runs
  WHERE store_id='91000000-0000-4000-8000-000000000003' AND status='PUBLISHED';
 SELECT count(*) INTO n_official FROM public.work_schedules
  WHERE store_id='91000000-0000-4000-8000-000000000003'
    AND source_generation_id IS NOT NULL AND status='APPROVED';
 SELECT count(*) INTO n_assignments FROM public.schedule_generation_assignments
  WHERE store_id='91000000-0000-4000-8000-000000000003';
 SELECT count(*) INTO n_extra FROM public.work_schedules
  WHERE source_generation_id IS NOT NULL
    AND store_id<>'91000000-0000-4000-8000-000000000003';
 IF n_runs<>1 OR n_official<>1 OR n_assignments<>1 OR n_extra<>0 THEN
  RAISE EXCEPTION 'QA_MANAGER_PUBLISH_EXPECTED_ONE run=% official=% assignments=% foreign=%',
   n_runs,n_official,n_assignments,n_extra;
 END IF;
 RAISE NOTICE 'QA_MANAGER_PUBLISH_EXACTLY_ONCE=PASS';
END $qa$;
DELETE FROM public.work_schedules
WHERE source_generation_id IN
 (SELECT id FROM public.schedule_generation_runs
  WHERE store_id='91000000-0000-4000-8000-000000000003');
DELETE FROM public.schedule_generation_assignments
WHERE generation_id IN
 (SELECT id FROM public.schedule_generation_runs
  WHERE store_id='91000000-0000-4000-8000-000000000003');
DELETE FROM public.schedule_generation_runs
WHERE store_id='91000000-0000-4000-8000-000000000003';
DO $qa$
DECLARE schedules_extra integer; schedules_missing integer;
 runs_extra integer; runs_missing integer;
 assignments_extra integer; assignments_missing integer;
BEGIN
 SELECT count(*) INTO schedules_extra FROM
  (SELECT * FROM public.work_schedules EXCEPT ALL
   SELECT * FROM qa_private.manager_publish_schedule_baseline) q;
 SELECT count(*) INTO schedules_missing FROM
  (SELECT * FROM qa_private.manager_publish_schedule_baseline EXCEPT ALL
   SELECT * FROM public.work_schedules) q;
 SELECT count(*) INTO runs_extra FROM
  (SELECT * FROM public.schedule_generation_runs EXCEPT ALL
   SELECT * FROM qa_private.manager_publish_generation_baseline) q;
 SELECT count(*) INTO runs_missing FROM
  (SELECT * FROM qa_private.manager_publish_generation_baseline EXCEPT ALL
   SELECT * FROM public.schedule_generation_runs) q;
 SELECT count(*) INTO assignments_extra FROM
  (SELECT * FROM public.schedule_generation_assignments EXCEPT ALL
   SELECT * FROM qa_private.manager_publish_assignment_baseline) q;
 SELECT count(*) INTO assignments_missing FROM
  (SELECT * FROM qa_private.manager_publish_assignment_baseline EXCEPT ALL
   SELECT * FROM public.schedule_generation_assignments) q;
 IF schedules_extra<>0 OR schedules_missing<>0
  OR runs_extra<>0 OR runs_missing<>0
  OR assignments_extra<>0 OR assignments_missing<>0 THEN
  RAISE EXCEPTION 'QA_MANAGER_PUBLISH_RESIDUAL_ROWS schedules=%,% runs=%,% assignments=%,%',
   schedules_extra,schedules_missing,runs_extra,runs_missing,assignments_extra,assignments_missing;
 END IF;
 RAISE NOTICE 'QA_MANAGER_PUBLISH_ROLLBACK_EXACT_BASELINE=PASS schedules=0 generations=0 assignments=0';
END $qa$;
COMMIT;

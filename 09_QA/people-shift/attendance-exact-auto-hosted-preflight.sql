-- #487 Attendance P0: READ-ONLY predeployment production drift gate.
-- Run by an authorized reviewer in SQL editor BEFORE applying the migration.
-- Never paste the P0 migration into production if this preflight fails.
-- Fingerprints captured from hosted pg_get_functiondef on 2026-10-24.
DO $qa$
DECLARE rec record; actual text; enabled boolean;
BEGIN
 FOR rec IN SELECT * FROM (VALUES
 ('submit_manual_time_attendance_v1','076849aa01f31513c420d903c78094e7'),
 ('build_payroll_estimate_v1','31eeb3f424f3699cf8571e1e70c3d0d2'),
 ('list_manager_attendance_review_v1','42db8b85f09e91e2faf27b1c0e5e14ed'),
 ('review_attendance_v1','b8f89535497f57adb0229ebe51c4e277'),
 ('get_my_attendance_v2','e10dabea17d7e524e4b800bf4c8efa8a')
 ) AS f(name,expected) LOOP
  SELECT md5(pg_get_functiondef(p.oid)) INTO actual
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname=rec.name;
  IF actual IS DISTINCT FROM rec.expected THEN
   RAISE EXCEPTION 'P0_DEPLOY_ABORT_FUNCTION_DRIFT % expected % actual %',
    rec.name,rec.expected,actual;
  END IF;
 END LOOP;
 SELECT c.relrowsecurity INTO enabled FROM pg_class c
 WHERE c.oid=to_regclass('public.attendance');
 IF enabled IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'P0_DEPLOY_ABORT_ATTENDANCE_RLS_NOT_ENABLED';
 END IF;
 IF NOT EXISTS (
  SELECT 1 FROM pg_constraint
  WHERE conrelid='public.attendance'::regclass
    AND conname='attendance_status_check'
    AND pg_get_constraintdef(oid) LIKE '%NEEDS_REVIEW%'
 ) THEN RAISE EXCEPTION 'P0_DEPLOY_ABORT_STATUS_CONSTRAINT_DRIFT'; END IF;
 IF has_table_privilege('authenticated','public.attendance','INSERT')
    OR has_table_privilege('authenticated','public.attendance','UPDATE')
    OR has_table_privilege('authenticated','public.attendance','DELETE')
 THEN RAISE EXCEPTION 'P0_DEPLOY_ABORT_DIRECT_ATTENDANCE_DML_GRANT'; END IF;
 RAISE NOTICE 'P0_ATTENDANCE_PREDEPLOY_FUNCTION_SCHEMA_PARITY=PASS';
END $qa$;

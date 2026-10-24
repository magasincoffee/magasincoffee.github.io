-- #524 PREDEPLOY METADATA-ONLY; READ ONLY; production comparison, not migration.
-- On ANY mismatch, STOP: re-evaluate real schema, roles, and function definitions.
-- Expected function fingerprints were captured on MAGASIN-NOIBO 24/10/2026.
WITH funcs AS (
 SELECT p.proname,md5(pg_get_functiondef(p.oid)) hash
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN
 ('can_access_store','validate_manager_attendance_review_authority_v1')
), summary AS (
 SELECT
 to_regclass('public.attendance_offschedule_requests_v1') IS NULL AS request_table_not_already_created,
 to_regclass('public.attendance_offschedule_policy_v1') IS NULL AS pilot_table_not_already_created,
 (SELECT count(*) FROM public.stores WHERE status='ACTIVE')=4 AS four_active_stores,
 (SELECT hash FROM funcs WHERE proname='can_access_store')=
 'f619ee8b547bdbe53a6d4d44ee92674c' AS store_scope_fingerprint_matches,
 (SELECT hash FROM funcs WHERE proname='validate_manager_attendance_review_authority_v1')=
 '3db9e2a40f61722dcfd96edd2548c1ad' AS review_authority_fingerprint_matches,
 (SELECT count(*) FROM information_schema.columns
  WHERE table_schema='public' AND table_name='profiles'
  AND column_name IN ('id','full_name','role','status'))=4 AS profile_shape_matches,
 (SELECT count(*) FROM information_schema.columns
  WHERE table_schema='public' AND table_name='work_schedules'
  AND column_name IN ('id','user_id','store_id','work_date','status','start_time','end_time'))=7
  AS schedule_shape_matches
)
SELECT *,(
 request_table_not_already_created AND pilot_table_not_already_created
 AND four_active_stores AND store_scope_fingerprint_matches
 AND review_authority_fingerprint_matches
 AND profile_shape_matches AND schedule_shape_matches
) AS metadata_preflight_pass
FROM summary;
-- PASS here is necessary, NOT sufficient: full FK/constraint/RLS, migration
-- order, grant and payroll gates are separate. No DDL/DML in this file.

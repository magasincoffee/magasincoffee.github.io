\set ON_ERROR_STOP on
-- After the Employee+Manager+Owner UI writes, payroll must see the same real
-- approved time through server-only canonical aggregation. Disposable QA only.
BEGIN;
DO $qa$
DECLARE v jsonb; d date:=(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date-2;
BEGIN
 v:=public.build_payroll_estimate_v1(
  '90000000-0000-4000-8000-000000000007',d,d,
  'QA_BROWSER_REVISION','QA_VALIDATED_RULE',true);
 IF (v->>'confirmed_work_item_count')::int<>2
   OR (v->>'confirmed_work_minutes')::int<>450
 THEN RAISE EXCEPTION 'QA_BROWSER_PAYROLL_MIXED_UI_CONFIRMED_SOURCE_BAD: %',v; END IF;
 RAISE NOTICE 'QA_BROWSER_PAYROLL_AUTO_PLUS_MANAGER_APPROVAL=PASS 450min';
END $qa$;
DELETE FROM public.payroll_entries WHERE payroll_revision='QA_BROWSER_REVISION';
DELETE FROM public.attendance WHERE schedule_id IN (
 '93000000-0000-4000-8000-000000000001',
 '93000000-0000-4000-8000-000000000002'
);
DO $qa$ BEGIN
 IF EXISTS(SELECT 1 FROM public.attendance) OR EXISTS(SELECT 1 FROM public.payroll_entries)
 THEN RAISE EXCEPTION 'QA_BROWSER_ATTENDANCE_RESIDUE'; END IF;
 RAISE NOTICE 'QA_BROWSER_ATTENDANCE_CLEAN=PASS';
END $qa$;
COMMIT;

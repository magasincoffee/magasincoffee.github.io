-- Disposable PostgreSQL fixture tests; no real identities, no Production endpoint.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL qa.actor_id='00000000-0000-0000-0000-000000000001';
DO $$
DECLARE v jsonb;
BEGIN
 IF (SELECT count(*) FROM public.list_employee_lifecycle_controls_v1())<>2 THEN RAISE EXCEPTION 'OWNER_READ_FAIL'; END IF;
 v:=public.set_employee_lifecycle_status_v1('00000000-0000-0000-0000-000000000004','INACTIVE','synthetic offboard test');
 IF v->>'new_status'<>'INACTIVE' THEN RAISE EXCEPTION 'OFFBOARD_FAIL'; END IF;
 IF (SELECT count(*) FROM public.employee_lifecycle_audit_v1)<>1 THEN RAISE EXCEPTION 'AUDIT_COUNT_FAIL'; END IF;
 IF (SELECT count(*) FROM public.work_schedules)<>1 OR (SELECT count(*) FROM public.schedule_generation_assignments)<>1 THEN RAISE EXCEPTION 'SCHEDULE_CHANGED'; END IF;
 IF (SELECT count(*) FROM public.attendance)<>1 OR (SELECT count(*) FROM public.payroll_entries)<>1 OR (SELECT count(*) FROM public.employee_availability)<>1 OR (SELECT count(*) FROM public.approval_requests)<>1 OR (SELECT count(*) FROM public.employee_skills)<>1 THEN RAISE EXCEPTION 'RELATED_FK_ROWS_CHANGED'; END IF;
 IF (SELECT count(*) FROM pg_constraint WHERE contype='f' AND confrelid='public.profiles'::regclass)<>46 THEN RAISE EXCEPTION 'PROFILE_FK_EDGE_COUNT_NOT_46: %', (SELECT count(*) FROM pg_constraint WHERE contype='f' AND confrelid='public.profiles'::regclass); END IF;
 IF (SELECT count(*) FROM pg_constraint WHERE contype='f' AND confrelid='public.profiles'::regclass AND conrelid IN ('public.attendance'::regclass,'public.payroll_entries'::regclass,'public.employee_availability'::regclass,'public.approval_requests'::regclass,'public.employee_skills'::regclass))<>8 THEN RAISE EXCEPTION 'FK_TOPOLOGY_INCOMPLETE'; END IF;
 v:=public.set_employee_lifecycle_status_v1('00000000-0000-0000-0000-000000000004','ACTIVE','synthetic restore test');
 IF (SELECT count(*) FROM public.employee_lifecycle_audit_v1)<>2 THEN RAISE EXCEPTION 'RESTORE_AUDIT_FAIL'; END IF;
END $$;
ROLLBACK;
-- No fixture writes are committed.

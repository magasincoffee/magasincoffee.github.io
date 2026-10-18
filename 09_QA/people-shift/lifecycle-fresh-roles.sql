\set ON_ERROR_STOP on
BEGIN;
DO $$
DECLARE failed boolean; n integer; result jsonb;
BEGIN
 PERFORM set_config('qa.actor_id','00000000-0000-0000-0000-000000000001',true);
 SELECT count(*) INTO n FROM public.list_employee_lifecycle_controls_v1();
 IF n<>2 THEN RAISE EXCEPTION 'OWNER_READER_FAIL'; END IF;
 PERFORM set_config('qa.actor_id','00000000-0000-0000-0000-000000000002',true);
 SELECT count(*) INTO n FROM public.list_employee_lifecycle_controls_v1();
 IF n<>2 THEN RAISE EXCEPTION 'MANAGER_ALL_READER_FAIL'; END IF;
 PERFORM set_config('qa.actor_id','00000000-0000-0000-0000-000000000003',true);
 failed:=false;
 BEGIN
  result:=public.set_employee_lifecycle_status_v1('00000000-0000-0000-0000-000000000004','INACTIVE','scope negative test');
 EXCEPTION WHEN OTHERS THEN failed:=SQLERRM LIKE '%EMPLOYEE_ALL_STORES_SCOPE_REQUIRED%'; END;
 IF NOT failed THEN RAISE EXCEPTION 'PARTIAL_MANAGER_WRITER_NOT_DENIED'; END IF;
 PERFORM set_config('qa.actor_id','00000000-0000-0000-0000-000000000004',true);
 failed:=false;
 BEGIN
  result:=public.set_employee_lifecycle_status_v1('00000000-0000-0000-0000-000000000005','ACTIVE','staff negative test');
 EXCEPTION WHEN OTHERS THEN failed:=SQLERRM LIKE '%ROLE_NOT_ALLOWED%'; END;
 IF NOT failed THEN RAISE EXCEPTION 'STAFF_WRITER_NOT_DENIED'; END IF;
 PERFORM set_config('qa.actor_id','00000000-0000-0000-0000-000000000006',true);
 failed:=false;
 BEGIN
  result:=public.set_employee_lifecycle_status_v1('00000000-0000-0000-0000-000000000004','INACTIVE','inactive negative test');
 EXCEPTION WHEN OTHERS THEN failed:=SQLERRM LIKE '%ACTOR_NOT_ACTIVE%'; END;
 IF NOT failed THEN RAISE EXCEPTION 'INACTIVE_MANAGER_NOT_DENIED'; END IF;
 IF (SELECT count(*) FROM public.employee_lifecycle_audit_v1)<>0 THEN RAISE EXCEPTION 'DENY_AUDIT_DIRTY'; END IF;
 -- Manager ALL writer must be permitted for synthetic employee.
 PERFORM set_config('qa.actor_id','00000000-0000-0000-0000-000000000002',true);
 result:=public.set_employee_lifecycle_status_v1('00000000-0000-0000-0000-000000000004','INACTIVE','manager all offboard');
 IF result->>'new_status'<>'INACTIVE' THEN RAISE EXCEPTION 'MANAGER_ALL_WRITER_FAIL'; END IF;
 IF (SELECT count(*) FROM public.employee_lifecycle_audit_v1)<>1 THEN RAISE EXCEPTION 'MANAGER_AUDIT_FAIL'; END IF;
 -- Reject no-op without extra audit writes.
 failed:=false;
 BEGIN
  result:=public.set_employee_lifecycle_status_v1('00000000-0000-0000-0000-000000000004','INACTIVE','duplicate forbidden');
 EXCEPTION WHEN OTHERS THEN failed:=SQLERRM LIKE '%LIFECYCLE_NO_CHANGE%'; END;
 IF NOT failed OR (SELECT count(*) FROM public.employee_lifecycle_audit_v1)<>1 THEN RAISE EXCEPTION 'NOOP_NOT_ATOMIC'; END IF;
 -- Reject missing and invalid length reasons.
 failed:=false;
 BEGIN
  result:=public.set_employee_lifecycle_status_v1('00000000-0000-0000-0000-000000000004','ACTIVE','');
 EXCEPTION WHEN OTHERS THEN failed:=SQLERRM LIKE '%LIFECYCLE_REASON_INVALID%'; END;
 IF NOT failed THEN RAISE EXCEPTION 'EMPTY_REASON_NOT_DENIED'; END IF;
 failed:=false;
 BEGIN
  result:=public.set_employee_lifecycle_status_v1('00000000-0000-0000-0000-000000000004','ACTIVE',repeat('x',301));
 EXCEPTION WHEN OTHERS THEN failed:=SQLERRM LIKE '%LIFECYCLE_REASON_INVALID%'; END;
 IF NOT failed OR (SELECT count(*) FROM public.employee_lifecycle_audit_v1)<>1 THEN RAISE EXCEPTION 'LONG_REASON_NOT_ATOMIC'; END IF;
 result:=public.set_employee_lifecycle_status_v1('00000000-0000-0000-0000-000000000004','ACTIVE','manager all restore');
 IF result->>'new_status'<>'ACTIVE' OR (SELECT count(*) FROM public.employee_lifecycle_audit_v1)<>2 THEN RAISE EXCEPTION 'RESTORE_AUDIT_ATOMIC_FAIL'; END IF;

END $$;
ROLLBACK;

-- Issue #524: ISOLATED CANDIDATE ONLY. Never run on hosted/prod.
-- Depends on authoritative public.profiles, public.stores, auth.uid(),
-- public.can_access_store(uuid), and existing attendance review authority.
-- Off-schedule claims are NOT shifts, attendance records or payroll sources.
-- OFF by default for every branch. No hosted mutation or employee/browser grants.
CREATE TABLE public.attendance_offschedule_policy_v1 (
 store_id uuid PRIMARY KEY REFERENCES public.stores(id),
 enabled boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.attendance_offschedule_policy_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.attendance_offschedule_policy_v1 FROM PUBLIC,anon,authenticated;

CREATE TABLE public.attendance_offschedule_requests_v1 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 employee_id uuid NOT NULL REFERENCES public.profiles(id),
 store_id uuid NOT NULL REFERENCES public.stores(id),
 work_date date NOT NULL,
 actual_start time NOT NULL,
 actual_end time NOT NULL,
 reason text NOT NULL,
 status text NOT NULL DEFAULT 'NEEDS_REVIEW',
 submitted_at timestamptz NOT NULL DEFAULT now(),
 reviewed_by uuid REFERENCES public.profiles(id),
 reviewed_at timestamptz,
 review_note text,
 confirmed_start time,
 confirmed_end time,
 confirmed_minutes integer,
 CONSTRAINT offschedule_valid_time CHECK(actual_start < actual_end),
 CONSTRAINT offschedule_reason CHECK(length(btrim(reason)) BETWEEN 3 AND 1000),
 CONSTRAINT offschedule_status CHECK(status IN ('NEEDS_REVIEW','APPROVED','ADJUSTED','REJECTED')),
 CONSTRAINT offschedule_review_shape CHECK(
   (status='NEEDS_REVIEW' AND reviewed_by IS NULL AND reviewed_at IS NULL
      AND confirmed_start IS NULL AND confirmed_end IS NULL AND confirmed_minutes IS NULL)
   OR
   (status='REJECTED' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL
      AND confirmed_start IS NULL AND confirmed_end IS NULL AND confirmed_minutes IS NULL)
   OR
   (status IN ('APPROVED','ADJUSTED') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL
      AND confirmed_start IS NOT NULL AND confirmed_end IS NOT NULL
      AND confirmed_start < confirmed_end AND confirmed_minutes =
      (extract(epoch from (confirmed_end-confirmed_start))/60)::integer)
 ),
 CONSTRAINT offschedule_no_duplicate_claim UNIQUE(employee_id,store_id,work_date,actual_start,actual_end)
);
ALTER TABLE public.attendance_offschedule_requests_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.attendance_offschedule_requests_v1 FROM PUBLIC,anon,authenticated;
-- No table policies and no direct browser DML. All access through audited RPC.

CREATE OR REPLACE FUNCTION public.submit_offschedule_attendance_request_v1(
 p_store_id uuid,p_work_date date,p_actual_start time,p_actual_end time,p_reason text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_uid uuid := auth.uid(); v_profile public.profiles%rowtype;
 v_request public.attendance_offschedule_requests_v1%rowtype;
 v_reason text := btrim(coalesce(p_reason,''));
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 SELECT * INTO v_profile FROM public.profiles WHERE id=v_uid;
 IF NOT FOUND OR v_profile.status <> 'ACTIVE' OR v_profile.role <> 'STAFF'
 THEN RAISE EXCEPTION 'OFFSCHEDULE_EMPLOYEE_NOT_ALLOWED'; END IF;
 IF p_store_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.stores
 WHERE id=p_store_id AND status='ACTIVE')
 THEN RAISE EXCEPTION 'STORE_NOT_ALLOWED'; END IF;
 -- This only permits an active Staff member to REPORT claimed work, not to
 -- self-authorize working in a store. Manager in that store makes the decision.
 -- Employee store priorities are preferences, NOT authorization/attendance proof.
 IF NOT EXISTS(SELECT 1 FROM public.attendance_offschedule_policy_v1
 WHERE store_id=p_store_id AND enabled IS TRUE)
 THEN RAISE EXCEPTION 'OFFSCHEDULE_PILOT_DISABLED'; END IF;
 IF p_work_date IS NULL OR p_actual_start IS NULL OR p_actual_end IS NULL
 OR p_actual_start >= p_actual_end
 THEN RAISE EXCEPTION 'OFFSCHEDULE_INVALID_TIME'; END IF;
 IF extract(second from p_actual_start)<>0 OR extract(second from p_actual_end)<>0
 THEN RAISE EXCEPTION 'OFFSCHEDULE_MINUTE_PRECISION_REQUIRED'; END IF;
 IF p_work_date > (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
 OR (p_work_date = (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
 AND p_actual_end > (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::time)
 THEN RAISE EXCEPTION 'OFFSCHEDULE_FUTURE_NOT_ALLOWED'; END IF;
 IF length(v_reason) NOT BETWEEN 3 AND 1000 THEN RAISE EXCEPTION 'OFFSCHEDULE_REASON_REQUIRED'; END IF;
 -- If any official assignment overlaps, use canonical scheduled-attendance path.
 IF EXISTS (
  SELECT 1 FROM public.work_schedules s
  WHERE s.user_id=v_uid AND s.work_date=p_work_date AND s.status='APPROVED'
  AND s.start_time < p_actual_end AND s.end_time > p_actual_start
 ) THEN RAISE EXCEPTION 'OFFSCHEDULE_HAS_OFFICIAL_SHIFT'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('offshift:'||v_uid::text||':'||p_work_date::text,0));
 -- Prevent two claims for overlapping actual work in different stores, but
 -- allow a byte-identical retry of the same logical claim.
 IF EXISTS(SELECT 1 FROM public.attendance_offschedule_requests_v1 r
 WHERE r.employee_id=v_uid AND r.work_date=p_work_date AND r.status<>'REJECTED'
 AND r.actual_start<p_actual_end AND r.actual_end>p_actual_start
 AND NOT (r.store_id=p_store_id AND r.actual_start=p_actual_start AND r.actual_end=p_actual_end))
 THEN RAISE EXCEPTION 'OFFSCHEDULE_OVERLAPPING_REQUEST'; END IF;
 INSERT INTO public.attendance_offschedule_requests_v1
 (employee_id,store_id,work_date,actual_start,actual_end,reason)
 VALUES(v_uid,p_store_id,p_work_date,p_actual_start,p_actual_end,v_reason)
 ON CONFLICT(employee_id,store_id,work_date,actual_start,actual_end) DO NOTHING
 RETURNING * INTO v_request;
 IF NOT FOUND THEN
  SELECT * INTO v_request FROM public.attendance_offschedule_requests_v1
  WHERE employee_id=v_uid AND store_id=p_store_id AND work_date=p_work_date
   AND actual_start=p_actual_start AND actual_end=p_actual_end;
  IF v_request.reason <> v_reason THEN RAISE EXCEPTION 'OFFSCHEDULE_DUPLICATE_CONFLICT'; END IF;
  RETURN jsonb_build_object('request_id',v_request.id,'status',v_request.status,'already_submitted',true);
 END IF;
 RETURN jsonb_build_object('request_id',v_request.id,'status',v_request.status,'already_submitted',false);
END; $$;
REVOKE ALL ON FUNCTION public.submit_offschedule_attendance_request_v1(uuid,date,time,time,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_offschedule_attendance_request_v1(uuid,date,time,time,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_offschedule_attendance_request_v1(
 p_request_id uuid,p_decision text,p_confirmed_start time DEFAULT NULL,
 p_confirmed_end time DEFAULT NULL,p_review_note text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_row public.attendance_offschedule_requests_v1%rowtype;
 v_uid uuid:=auth.uid();v_decision text:=upper(btrim(coalesce(p_decision,'')));
 v_start time; v_end time;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 SELECT * INTO v_row FROM public.attendance_offschedule_requests_v1 WHERE id=p_request_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'OFFSCHEDULE_REQUEST_NOT_FOUND'; END IF;
 PERFORM public.validate_manager_attendance_review_authority_v1(v_row.store_id);
 IF (SELECT role FROM public.profiles WHERE id=v_uid) <> 'STORE_MANAGER'
 THEN RAISE EXCEPTION 'OFFSCHEDULE_MANAGER_ONLY'; END IF;
 IF v_uid=v_row.employee_id THEN RAISE EXCEPTION 'OFFSCHEDULE_SELF_REVIEW_FORBIDDEN'; END IF;
 IF v_row.status <> 'NEEDS_REVIEW' THEN RAISE EXCEPTION 'OFFSCHEDULE_ALREADY_REVIEWED'; END IF;
 IF v_decision NOT IN ('APPROVE','ADJUST','REJECT') THEN RAISE EXCEPTION 'OFFSCHEDULE_INVALID_DECISION'; END IF;
 IF v_decision IN ('ADJUST','REJECT') AND length(btrim(coalesce(p_review_note,''))) NOT BETWEEN 3 AND 1000
 THEN RAISE EXCEPTION 'OFFSCHEDULE_REVIEW_NOTE_REQUIRED'; END IF;
 -- Recheck at review time: a schedule may have been published since submit.
 IF v_decision IN ('APPROVE','ADJUST') AND EXISTS(
 SELECT 1 FROM public.work_schedules sch
 WHERE sch.user_id=v_row.employee_id AND sch.work_date=v_row.work_date
 AND sch.status='APPROVED' AND sch.start_time<v_row.actual_end
 AND sch.end_time>v_row.actual_start)
 THEN RAISE EXCEPTION 'OFFSCHEDULE_SCHEDULE_PUBLISHED_AFTER_REQUEST'; END IF;
 v_start:=CASE WHEN v_decision='APPROVE' THEN v_row.actual_start ELSE p_confirmed_start END;
 v_end:=CASE WHEN v_decision='APPROVE' THEN v_row.actual_end ELSE p_confirmed_end END;
 IF v_decision='ADJUST' AND (v_start IS NULL OR v_end IS NULL OR v_start>=v_end)
 THEN RAISE EXCEPTION 'OFFSCHEDULE_INVALID_ADJUSTMENT'; END IF;
 IF v_decision='ADJUST' AND (extract(second from v_start)<>0 OR extract(second from v_end)<>0)
 THEN RAISE EXCEPTION 'OFFSCHEDULE_MINUTE_PRECISION_REQUIRED'; END IF;
 UPDATE public.attendance_offschedule_requests_v1 SET
 status=CASE v_decision WHEN 'APPROVE' THEN 'APPROVED'
 WHEN 'ADJUST' THEN 'ADJUSTED' ELSE 'REJECTED' END,
 reviewed_by=v_uid, reviewed_at=now(),review_note=nullif(btrim(coalesce(p_review_note,'')),''),
 confirmed_start=CASE WHEN v_decision='REJECT' THEN NULL ELSE v_start END,
 confirmed_end=CASE WHEN v_decision='REJECT' THEN NULL ELSE v_end END,
 confirmed_minutes=CASE WHEN v_decision='REJECT' THEN NULL
 ELSE (extract(epoch from (v_end-v_start))/60)::integer END
 WHERE id=v_row.id;
 RETURN jsonb_build_object('request_id',v_row.id,'decision',v_decision,
 'payroll_included',false,'schedule_created',false);
END; $$;
REVOKE ALL ON FUNCTION public.review_offschedule_attendance_request_v1(uuid,text,time,time,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_offschedule_attendance_request_v1(uuid,text,time,time,text) TO authenticated;

-- Deliberate payroll firewall: no changes to build_payroll_estimate_v1,
-- and zero rows inserted into public.attendance or public.work_schedules.
-- Payroll integration is a separate, audited owner-approved gate.

-- Read APIs are scoped; no direct SELECT is granted to browser roles.
CREATE OR REPLACE FUNCTION public.list_my_offschedule_attendance_requests_v1(
 p_from_date date DEFAULT NULL,p_to_date date DEFAULT NULL
) RETURNS TABLE(request_id uuid,store_id uuid,work_date date,
 actual_start time,actual_end time,reason text,status text,
 submitted_at timestamptz,reviewed_at timestamptz,review_note text,
 confirmed_start time,confirmed_end time,confirmed_minutes integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_uid uuid:=auth.uid();
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=v_uid AND p.status='ACTIVE' AND p.role='STAFF')
 THEN RAISE EXCEPTION 'OFFSCHEDULE_EMPLOYEE_NOT_ALLOWED'; END IF;
 IF p_from_date IS NOT NULL AND p_to_date IS NOT NULL AND p_from_date>p_to_date
 THEN RAISE EXCEPTION 'OFFSCHEDULE_DATE_RANGE_INVALID'; END IF;
 RETURN QUERY SELECT r.id,r.store_id,r.work_date,r.actual_start,r.actual_end,r.reason,
 r.status,r.submitted_at,r.reviewed_at,r.review_note,r.confirmed_start,
 r.confirmed_end,r.confirmed_minutes FROM public.attendance_offschedule_requests_v1 r
 WHERE r.employee_id=v_uid AND (p_from_date IS NULL OR r.work_date>=p_from_date)
 AND (p_to_date IS NULL OR r.work_date<=p_to_date)
 ORDER BY r.work_date DESC,r.submitted_at DESC,r.id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.list_my_offschedule_attendance_requests_v1(date,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_my_offschedule_attendance_requests_v1(date,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_manager_offschedule_attendance_requests_v1(
 p_store_id uuid,p_from_date date DEFAULT NULL,p_to_date date DEFAULT NULL
) RETURNS TABLE(request_id uuid,employee_id uuid,employee_name text,store_id uuid,work_date date,
 actual_start time,actual_end time,reason text,status text,submitted_at timestamptz,
 reviewed_by uuid,reviewed_at timestamptz,review_note text,
 confirmed_start time,confirmed_end time,confirmed_minutes integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM public.validate_manager_attendance_review_authority_v1(p_store_id);
 IF (SELECT role FROM public.profiles WHERE id=auth.uid()) <> 'STORE_MANAGER'
 THEN RAISE EXCEPTION 'OFFSCHEDULE_MANAGER_ONLY'; END IF;
 IF p_from_date IS NOT NULL AND p_to_date IS NOT NULL AND p_from_date>p_to_date
 THEN RAISE EXCEPTION 'OFFSCHEDULE_DATE_RANGE_INVALID'; END IF;
 RETURN QUERY SELECT r.id,r.employee_id,p.full_name,r.store_id,r.work_date,r.actual_start,r.actual_end,
 r.reason,r.status,r.submitted_at,r.reviewed_by,r.reviewed_at,r.review_note,
 r.confirmed_start,r.confirmed_end,r.confirmed_minutes
 FROM public.attendance_offschedule_requests_v1 r
 JOIN public.profiles p ON p.id=r.employee_id
 WHERE r.store_id=p_store_id AND (p_from_date IS NULL OR r.work_date>=p_from_date)
 AND (p_to_date IS NULL OR r.work_date<=p_to_date)
 ORDER BY CASE WHEN r.status='NEEDS_REVIEW' THEN 0 ELSE 1 END,
 r.work_date DESC,r.submitted_at DESC,r.id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.list_manager_offschedule_attendance_requests_v1(uuid,date,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_manager_offschedule_attendance_requests_v1(uuid,date,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_owner_offschedule_attendance_requests_v1(
 p_store_id uuid,p_from_date date DEFAULT NULL,p_to_date date DEFAULT NULL
) RETURNS TABLE(request_id uuid,employee_id uuid,employee_name text,store_id uuid,work_date date,
 actual_start time,actual_end time,status text,submitted_at timestamptz,
 reviewed_by uuid,reviewed_at timestamptz,confirmed_minutes integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p
 WHERE p.id=auth.uid() AND p.status='ACTIVE' AND p.role='OWNER')
 THEN RAISE EXCEPTION 'OFFSCHEDULE_OWNER_ONLY'; END IF;
 IF p_store_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.stores WHERE id=p_store_id)
 THEN RAISE EXCEPTION 'STORE_NOT_ALLOWED'; END IF;
 IF p_from_date IS NOT NULL AND p_to_date IS NOT NULL AND p_from_date>p_to_date
 THEN RAISE EXCEPTION 'OFFSCHEDULE_DATE_RANGE_INVALID'; END IF;
 RETURN QUERY SELECT r.id,r.employee_id,p.full_name,r.store_id,r.work_date,r.actual_start,r.actual_end,
 r.status,r.submitted_at,r.reviewed_by,r.reviewed_at,r.confirmed_minutes
 FROM public.attendance_offschedule_requests_v1 r
 JOIN public.profiles p ON p.id=r.employee_id WHERE r.store_id=p_store_id
 AND (p_from_date IS NULL OR r.work_date>=p_from_date)
 AND (p_to_date IS NULL OR r.work_date<=p_to_date)
 ORDER BY r.work_date DESC,r.submitted_at DESC,r.id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.list_owner_offschedule_attendance_requests_v1(uuid,date,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_owner_offschedule_attendance_requests_v1(uuid,date,date) TO authenticated;

-- Only eligible pilot stores shown to Employee. Read-only; no implied shift authority.
CREATE OR REPLACE FUNCTION public.list_my_offschedule_stores_v1()
RETURNS TABLE(store_id uuid,store_code text,store_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles p
 WHERE p.id=auth.uid() AND p.status='ACTIVE' AND p.role='STAFF')
 THEN RAISE EXCEPTION 'OFFSCHEDULE_EMPLOYEE_NOT_ALLOWED'; END IF;
 RETURN QUERY SELECT s.id,s.code,s.name FROM public.stores s
 JOIN public.attendance_offschedule_policy_v1 p ON p.store_id=s.id
 WHERE s.status='ACTIVE' AND p.enabled IS TRUE ORDER BY s.code,s.id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.list_my_offschedule_stores_v1() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_my_offschedule_stores_v1() TO authenticated;

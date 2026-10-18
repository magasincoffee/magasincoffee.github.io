-- Manager post-publication staffing adjustment.
-- This migration is intentionally staged for isolated database acceptance before Production deployment.
BEGIN;

CREATE TABLE IF NOT EXISTS public.manager_post_publish_shift_audit_v1 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 schedule_id uuid NOT NULL REFERENCES public.work_schedules(id),
 action text NOT NULL CHECK (action IN ('ADD','REASSIGN')),
 old_employee_id uuid NULL REFERENCES public.profiles(id),
 new_employee_id uuid NOT NULL REFERENCES public.profiles(id),
 store_id uuid NOT NULL REFERENCES public.stores(id),
 work_date date NOT NULL,
 old_assignment jsonb NULL,
 new_assignment jsonb NOT NULL,
 reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 3 AND 300),
 actor_id uuid NOT NULL REFERENCES public.profiles(id),
 changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_manager_post_publish_audit_store_date
 ON public.manager_post_publish_shift_audit_v1(store_id,work_date,changed_at DESC);
ALTER TABLE public.manager_post_publish_shift_audit_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.manager_post_publish_shift_audit_v1 FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.manager_validate_published_assignment_v1(
 p_store_id uuid, p_work_date date, p_start_time time, p_end_time time,
 p_employee_id uuid, p_exclude_schedule_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_role text := upper(coalesce(public.current_user_role(), ''));
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 IF v_role NOT IN ('OWNER','STORE_MANAGER') THEN RAISE EXCEPTION 'ROLE_NOT_ALLOWED'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid()
   AND p.status='ACTIVE' AND upper(coalesce(p.role,''))=v_role)
 THEN RAISE EXCEPTION 'ACTOR_NOT_ACTIVE'; END IF;
 IF p_store_id IS NULL OR NOT coalesce(public.can_access_store(p_store_id),false)
 THEN RAISE EXCEPTION 'STORE_NOT_ALLOWED'; END IF;
 IF p_work_date IS NULL OR p_start_time IS NULL OR p_end_time IS NULL
   OR p_start_time >= p_end_time THEN RAISE EXCEPTION 'INVALID_SHIFT_TIME'; END IF;
 IF p_work_date < (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
   OR (p_work_date = (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
     AND p_start_time <= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::time)
 THEN RAISE EXCEPTION 'SHIFT_ALREADY_STARTED'; END IF;
 IF p_employee_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id=p_employee_id
    AND p.status='ACTIVE' AND upper(coalesce(p.role,'')) IN ('STAFF','EMPLOYEE'))
 THEN RAISE EXCEPTION 'EMPLOYEE_INACTIVE_OR_INVALID'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.employee_store_priorities sp
   WHERE sp.employee_id=p_employee_id AND sp.store_id=p_store_id)
 THEN RAISE EXCEPTION 'EMPLOYEE_STORE_NOT_ALLOWED'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.schedule_generation_runs r
   WHERE r.store_id=p_store_id AND r.status='PUBLISHED'
   AND p_work_date BETWEEN r.week_start AND r.week_end)
 THEN RAISE EXCEPTION 'PUBLISHED_WEEK_REQUIRED'; END IF;
 -- Official conflicts are cross-store, not only within the selected store.
 IF EXISTS (SELECT 1 FROM public.work_schedules ws
   WHERE ws.user_id=p_employee_id AND ws.work_date=p_work_date
   AND ws.id IS DISTINCT FROM p_exclude_schedule_id
   AND ws.status IN ('PENDING','APPROVED')
   AND ws.start_time < p_end_time AND p_start_time < ws.end_time)
 THEN RAISE EXCEPTION 'OFFICIAL_SCHEDULE_OVERLAP'; END IF;
 IF (SELECT count(*) FROM public.work_schedules ws
   WHERE ws.user_id=p_employee_id AND ws.work_date=p_work_date
   AND ws.id IS DISTINCT FROM p_exclude_schedule_id
   AND ws.status IN ('PENDING','APPROVED')) >= 2
 THEN RAISE EXCEPTION 'MAX_TWO_ASSIGNMENTS_PER_EMPLOYEE_DAY'; END IF;
END
$function$;
REVOKE ALL ON FUNCTION public.manager_validate_published_assignment_v1(uuid,date,time,time,uuid,uuid)
 FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.add_published_shift_v1(
 p_store_id uuid, p_work_date date, p_start_time time, p_end_time time,
 p_employee_id uuid, p_reason text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_id uuid; v_reason text := btrim(coalesce(p_reason,'')); v_week date;
BEGIN
 IF char_length(v_reason) NOT BETWEEN 3 AND 300 THEN RAISE EXCEPTION 'ADJUSTMENT_REASON_INVALID'; END IF;
 IF p_work_date IS NULL THEN RAISE EXCEPTION 'WORK_DATE_REQUIRED'; END IF;
 v_week := p_work_date-(extract(isodow FROM p_work_date)::integer-1);
 PERFORM pg_advisory_xact_lock(hashtextextended('workforce_cross_store:'||v_week::text,0));
 PERFORM public.manager_validate_published_assignment_v1(
   p_store_id,p_work_date,p_start_time,p_end_time,p_employee_id,NULL);
 INSERT INTO public.work_schedules(work_date,start_time,end_time,store_id,user_id,status,approver_id,approved_at,note,origin)
 VALUES(p_work_date,p_start_time,p_end_time,p_store_id,p_employee_id,'APPROVED',auth.uid(),now(),v_reason,'MANAGER_POST_PUBLISH')
 RETURNING id INTO v_id;
 INSERT INTO public.manager_post_publish_shift_audit_v1(
   schedule_id,action,new_employee_id,store_id,work_date,new_assignment,reason,actor_id)
 VALUES(v_id,'ADD',p_employee_id,p_store_id,p_work_date,
   jsonb_build_object('schedule_id',v_id,'user_id',p_employee_id,'store_id',p_store_id,
     'work_date',p_work_date,'start_time',p_start_time,'end_time',p_end_time),
   v_reason,auth.uid());
 RETURN jsonb_build_object('saved',true,'action','ADD','schedule_id',v_id);
END
$function$;

CREATE OR REPLACE FUNCTION public.reassign_published_shift_v1(
 p_schedule_id uuid, p_employee_id uuid, p_reason text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_shift public.work_schedules%rowtype; v_reason text := btrim(coalesce(p_reason,'')); v_week date;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 IF char_length(v_reason) NOT BETWEEN 3 AND 300 THEN RAISE EXCEPTION 'ADJUSTMENT_REASON_INVALID'; END IF;
 IF p_schedule_id IS NULL THEN RAISE EXCEPTION 'SCHEDULE_ID_REQUIRED'; END IF;
 SELECT * INTO v_shift FROM public.work_schedules WHERE id=p_schedule_id FOR UPDATE;
 IF NOT FOUND OR v_shift.status<>'APPROVED' THEN RAISE EXCEPTION 'OFFICIAL_SHIFT_NOT_FOUND'; END IF;
 IF v_shift.user_id=p_employee_id THEN RAISE EXCEPTION 'EMPLOYEE_UNCHANGED'; END IF;
 v_week := v_shift.work_date-(extract(isodow FROM v_shift.work_date)::integer-1);
 PERFORM pg_advisory_xact_lock(hashtextextended('workforce_cross_store:'||v_week::text,0));
 PERFORM public.manager_validate_published_assignment_v1(
   v_shift.store_id,v_shift.work_date,v_shift.start_time,v_shift.end_time,p_employee_id,p_schedule_id);
 UPDATE public.work_schedules SET user_id=p_employee_id,updated_at=now()
 WHERE id=p_schedule_id AND status='APPROVED';
 INSERT INTO public.manager_post_publish_shift_audit_v1(
   schedule_id,action,old_employee_id,new_employee_id,store_id,work_date,
   old_assignment,new_assignment,reason,actor_id)
 VALUES(p_schedule_id,'REASSIGN',v_shift.user_id,p_employee_id,v_shift.store_id,v_shift.work_date,
   jsonb_build_object('schedule_id',p_schedule_id,'user_id',v_shift.user_id,
     'start_time',v_shift.start_time,'end_time',v_shift.end_time,'store_id',v_shift.store_id),
   jsonb_build_object('schedule_id',p_schedule_id,'user_id',p_employee_id,
     'start_time',v_shift.start_time,'end_time',v_shift.end_time,'store_id',v_shift.store_id),
   v_reason,auth.uid());
 RETURN jsonb_build_object('saved',true,'action','REASSIGN','schedule_id',p_schedule_id);
END
$function$;

CREATE OR REPLACE FUNCTION public.list_manager_post_publish_audit_v1(
 p_store_id uuid, p_week_start date
) RETURNS TABLE(
 schedule_id uuid, action text, old_employee_id uuid,
 new_employee_id uuid, work_date date, reason text, changed_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_role text := upper(coalesce(public.current_user_role(),''));
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 IF v_role NOT IN ('OWNER','STORE_MANAGER')
   OR NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid()
    AND p.status='ACTIVE' AND upper(coalesce(p.role,''))=v_role)
 THEN RAISE EXCEPTION 'ROLE_NOT_ALLOWED'; END IF;
 IF p_store_id IS NULL OR NOT coalesce(public.can_access_store(p_store_id),false)
 THEN RAISE EXCEPTION 'STORE_NOT_ALLOWED'; END IF;
 IF p_week_start IS NULL OR extract(isodow FROM p_week_start)<>1
 THEN RAISE EXCEPTION 'WEEK_START_MUST_BE_MONDAY'; END IF;
 RETURN QUERY SELECT a.schedule_id,a.action,a.old_employee_id,a.new_employee_id,
   a.work_date,a.reason,a.changed_at
 FROM public.manager_post_publish_shift_audit_v1 a
 WHERE a.store_id=p_store_id AND a.work_date BETWEEN p_week_start AND p_week_start+6
 ORDER BY a.changed_at DESC,a.id DESC LIMIT 250;
END
$function$;
REVOKE ALL ON FUNCTION public.add_published_shift_v1(uuid,date,time,time,uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.reassign_published_shift_v1(uuid,uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.list_manager_post_publish_audit_v1(uuid,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.add_published_shift_v1(uuid,date,time,time,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reassign_published_shift_v1(uuid,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_manager_post_publish_audit_v1(uuid,date) TO authenticated;
COMMIT;

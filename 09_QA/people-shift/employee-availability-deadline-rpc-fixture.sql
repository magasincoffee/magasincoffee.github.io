-- Synthetic-only adaptation of the ACTUAL two production RPC definitions read 23/10.
-- No service_role credentials, no real profiles; all application writes hit a disposable DB.
CREATE OR REPLACE FUNCTION public.save_my_availability(
 p_availability_id uuid DEFAULT NULL,
 p_work_date date DEFAULT NULL,
 p_start_time time without time zone DEFAULT NULL,
 p_end_time time without time zone DEFAULT NULL,
 p_availability_type text DEFAULT 'AVAILABLE',
 p_preferred_store_id uuid DEFAULT NULL,
 p_note text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
 v_id uuid;
 v_user uuid:=auth.uid();
 v_type text:=upper(coalesce(trim(p_availability_type),'AVAILABLE'));
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=v_user AND p.status='ACTIVE'
   AND upper(coalesce(p.role,'')) IN ('STAFF','EMPLOYEE')) THEN
   RAISE EXCEPTION 'EMPLOYEE_NOT_ACTIVE'; END IF;
 IF p_work_date IS NULL OR p_start_time IS NULL OR p_end_time IS NULL THEN
   RAISE EXCEPTION 'AVAILABILITY_TIME_REQUIRED'; END IF;
 IF p_end_time<=p_start_time THEN RAISE EXCEPTION 'INVALID_AVAILABILITY_INTERVAL'; END IF;
 IF v_type NOT IN ('AVAILABLE','UNAVAILABLE','PREFERRED') THEN
   RAISE EXCEPTION 'INVALID_AVAILABILITY_TYPE'; END IF;
 IF p_availability_id IS NULL THEN
   INSERT INTO public.employee_availability(
     user_id,work_date,start_time,end_time,preferred_store_id,availability_type,note
   ) VALUES(v_user,p_work_date,p_start_time,p_end_time,NULL,v_type,p_note)
     RETURNING id INTO v_id;
 ELSE
   UPDATE public.employee_availability
     SET work_date=p_work_date,start_time=p_start_time,end_time=p_end_time,
       preferred_store_id=NULL,availability_type=v_type,note=p_note,updated_at=now()
     WHERE id=p_availability_id AND user_id=v_user RETURNING id INTO v_id;
   IF v_id IS NULL THEN RAISE EXCEPTION 'AVAILABILITY_NOT_FOUND'; END IF;
 END IF;
 RETURN v_id;
END;
$function$;
CREATE OR REPLACE FUNCTION public.delete_my_availability(p_availability_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.status='ACTIVE'
  AND upper(coalesce(p.role,'')) IN ('STAFF','EMPLOYEE')) THEN
  RAISE EXCEPTION 'EMPLOYEE_NOT_ACTIVE'; END IF;
 DELETE FROM public.employee_availability ea WHERE ea.id=p_availability_id AND ea.user_id=auth.uid();
 RETURN FOUND;
END;
$function$;
REVOKE ALL ON FUNCTION public.save_my_availability(uuid,date,time,time,text,uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.delete_my_availability(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_my_availability(uuid,date,time,time,text,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_availability(uuid) TO authenticated;

-- Verbatim scoped read behavior from hosted get_my_availability, captured via
-- pg_get_functiondef 2026-10-23. Disposable DB ONLY: sign-in identity readback.
CREATE OR REPLACE FUNCTION public.get_my_availability(p_week_start date DEFAULT NULL::date)
RETURNS TABLE(id uuid,work_date date,start_time time without time zone,end_time time without time zone,
 preferred_store_id uuid,availability_type text,note text,updated_at timestamp with time zone)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.status='ACTIVE'
   AND upper(coalesce(p.role,'')) IN ('STAFF','EMPLOYEE')) THEN
   RAISE EXCEPTION 'EMPLOYEE_NOT_ACTIVE'; END IF;
 RETURN QUERY SELECT ea.id,ea.work_date,ea.start_time,ea.end_time,
   ea.preferred_store_id,ea.availability_type,ea.note,ea.updated_at
 FROM public.employee_availability ea
 WHERE ea.user_id=auth.uid() AND
  (p_week_start IS NULL OR ea.work_date BETWEEN p_week_start AND p_week_start+6)
 ORDER BY ea.work_date,ea.start_time,ea.end_time,ea.id;
END;
$function$;
REVOKE ALL ON FUNCTION public.get_my_availability(date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_availability(date) TO authenticated;

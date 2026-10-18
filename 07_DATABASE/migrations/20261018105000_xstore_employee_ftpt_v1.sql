-- XSTORE FT/PT employee classification V1. Candidate migration; NOT applied to Production.
-- Separate from lifecycle status and never deletes profiles, schedules or payroll.
CREATE TABLE IF NOT EXISTS public.employee_employment_types_v1 (
 employee_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE RESTRICT,
 employment_type text NOT NULL CHECK (employment_type IN ('FULL_TIME','PART_TIME')),
 updated_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_employment_types_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.employee_employment_types_v1 FROM PUBLIC, anon, authenticated;
-- Only existing authenticated Owner and enterprise-wide Manager can change workforce classification.
CREATE OR REPLACE FUNCTION public.list_employee_employment_types_v1()
RETURNS TABLE(employee_id uuid, employment_type text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public
AS $fn$
DECLARE v_role text := upper(coalesce(public.current_user_role(),''));
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 IF v_role NOT IN ('OWNER','STORE_MANAGER') THEN RAISE EXCEPTION 'ROLE_NOT_ALLOWED'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid()
    AND p.status='ACTIVE' AND upper(p.role)=v_role) THEN RAISE EXCEPTION 'ACTOR_NOT_ACTIVE'; END IF;
 RETURN QUERY
 SELECT e.employee_id, e.employment_type
 FROM public.employee_employment_types_v1 e
 WHERE v_role='OWNER' OR EXISTS (
   SELECT 1 FROM public.employee_store_priorities esp
   WHERE esp.employee_id=e.employee_id AND coalesce(public.can_access_store(esp.store_id),false)
 );
END
$fn$;
REVOKE EXECUTE ON FUNCTION public.list_employee_employment_types_v1() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_employee_employment_types_v1() TO authenticated;
CREATE OR REPLACE FUNCTION public.set_employee_employment_type_v1(p_employee_id uuid,p_employment_type text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $fn$
DECLARE v_role text := upper(coalesce(public.current_user_role(),''));
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 IF v_role NOT IN ('OWNER','STORE_MANAGER') THEN RAISE EXCEPTION 'ROLE_NOT_ALLOWED'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid()
    AND p.status='ACTIVE' AND upper(p.role)=v_role) THEN RAISE EXCEPTION 'ACTOR_NOT_ACTIVE'; END IF;
 IF p_employee_id IS NULL THEN RAISE EXCEPTION 'EMPLOYEE_ID_REQUIRED'; END IF;
 IF p_employment_type IS NULL OR p_employment_type NOT IN ('FULL_TIME','PART_TIME')
 THEN RAISE EXCEPTION 'EMPLOYMENT_TYPE_INVALID'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=p_employee_id
    AND upper(p.role) IN ('STAFF','EMPLOYEE')) THEN RAISE EXCEPTION 'EMPLOYEE_NOT_FOUND'; END IF;
 -- Manager write requires enterprise ALL; no mutable per-store priority alone can grant it.
 IF v_role='STORE_MANAGER' AND NOT EXISTS (
   SELECT 1 FROM public.profiles p WHERE p.id=auth.uid()
   AND EXISTS(SELECT 1 FROM regexp_split_to_table(upper(coalesce(p.access_scope,'')),'[,; ]+') x
              WHERE x IN ('ALL','*'))
 ) THEN RAISE EXCEPTION 'EMPLOYEE_ALL_STORES_SCOPE_REQUIRED'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('employee_store_priority:'||p_employee_id::text,0));
 INSERT INTO public.employee_employment_types_v1(employee_id,employment_type,updated_by)
 VALUES(p_employee_id,p_employment_type,auth.uid())
 ON CONFLICT (employee_id) DO UPDATE SET
 employment_type=EXCLUDED.employment_type,updated_by=EXCLUDED.updated_by,updated_at=now();
 RETURN jsonb_build_object('employee_id',p_employee_id,'employment_type',p_employment_type,'saved',true);
END
$fn$;
REVOKE EXECUTE ON FUNCTION public.set_employee_employment_type_v1(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_employee_employment_type_v1(uuid,text) TO authenticated;

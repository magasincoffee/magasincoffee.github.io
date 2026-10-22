-- Workforce #487: read-only registration creation time for same FT/PT candidate ranking.
-- STAGED ONLY: do not apply to production until isolated JWT/RLS positive+negative QA.
-- This does not change the existing get_manager_weekly_availability return type.
BEGIN;

CREATE OR REPLACE FUNCTION public.list_workforce_registration_order_v1(
  p_store_id uuid,
  p_week_start date
)
RETURNS TABLE(availability_id uuid, registered_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO public
AS $function$
DECLARE v_role text := upper(coalesce(public.current_user_role(),''));
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF v_role NOT IN ('OWNER','STORE_MANAGER') THEN RAISE EXCEPTION 'ROLE_NOT_ALLOWED'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id=auth.uid() AND p.status='ACTIVE'
      AND upper(coalesce(p.role,''))=v_role
  ) THEN RAISE EXCEPTION 'ACTOR_NOT_ACTIVE'; END IF;
  IF p_store_id IS NULL OR NOT public.can_access_store(p_store_id) THEN
    RAISE EXCEPTION 'STORE_NOT_ALLOWED';
  END IF;
  IF p_week_start IS NULL OR extract(isodow FROM p_week_start)<>1 THEN
    RAISE EXCEPTION 'WEEK_START_MUST_BE_MONDAY';
  END IF;

  RETURN QUERY
  SELECT ea.id,ea.created_at
  FROM public.employee_availability ea
  JOIN public.profiles p ON p.id=ea.user_id
  WHERE ea.work_date BETWEEN p_week_start AND p_week_start+6
    AND p.status='ACTIVE'
    AND upper(coalesce(p.role,'')) IN ('STAFF','EMPLOYEE')
    AND EXISTS (
      SELECT 1 FROM public.employee_store_priorities esp
      WHERE esp.employee_id=ea.user_id AND esp.store_id=p_store_id
    )
  ORDER BY ea.created_at,ea.id;
END;
$function$;

REVOKE ALL ON FUNCTION public.list_workforce_registration_order_v1(uuid,date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.list_workforce_registration_order_v1(uuid,date) TO authenticated;
COMMIT;

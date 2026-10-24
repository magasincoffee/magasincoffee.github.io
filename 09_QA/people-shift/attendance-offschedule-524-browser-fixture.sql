-- Browser-only canonical RPC facades. A disposable PostgREST schema,
-- never hosted, intentionally returns no official schedules or attendance.
CREATE FUNCTION public.list_my_approved_schedules_v2(p_week_start date)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$ SELECT '[]'::jsonb $$;
CREATE FUNCTION public.get_my_attendance_v2(p_from_date date,p_to_date date)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$ SELECT '[]'::jsonb $$;
CREATE FUNCTION public.list_manager_attendance_review_v1(p_store_id uuid,p_from_date date,p_to_date date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM public.validate_manager_attendance_review_authority_v1(p_store_id);
 RETURN '[]'::jsonb;
END $$;
GRANT EXECUTE ON FUNCTION public.list_my_approved_schedules_v2(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_attendance_v2(date,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_manager_attendance_review_v1(uuid,date,date) TO authenticated;
NOTIFY pgrst, 'reload schema';

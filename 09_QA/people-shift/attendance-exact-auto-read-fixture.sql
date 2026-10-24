-- #487 disposable QA-only: install exact hosted Employee attendance reader.
-- SQL source retrieved read-only on 2026-10-24; extra historical columns are
-- needed to reproduce production's SELECT result schema. No hosted DB writes.
ALTER TABLE public.attendance
 ADD COLUMN check_in timestamptz,
 ADD COLUMN check_out timestamptz,
 ADD COLUMN late_minutes integer,
 ADD COLUMN early_minutes integer,
 ADD COLUMN hours_worked numeric,
 ADD COLUMN amount numeric,
 ADD COLUMN grade text,
 ADD COLUMN hourly_rate numeric;
CREATE OR REPLACE FUNCTION public.get_my_attendance_v2(p_from_date date DEFAULT NULL::date, p_to_date date DEFAULT NULL::date)
 RETURNS TABLE(attendance_id uuid, schedule_id uuid, work_date date, store_id uuid, store_code text, store_name text, planned_start time without time zone, planned_end time without time zone, check_in timestamp with time zone, check_out timestamp with time zone, status text, late_minutes integer, early_minutes integer, hours_worked numeric, amount numeric, grade text, hourly_rate numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 select a.id,a.schedule_id,a.work_date,a.store_id,s.code,s.name,a.planned_start,a.planned_end,a.check_in,a.check_out,a.status,a.late_minutes,a.early_minutes,a.hours_worked,a.amount,a.grade,a.hourly_rate
 from public.attendance a join public.stores s on s.id=a.store_id
 where a.user_id=auth.uid() and (p_from_date is null or a.work_date>=p_from_date) and (p_to_date is null or a.work_date<=p_to_date) and a.status not in ('DELETED','DELETED_BY_MANAGER')
 order by a.work_date desc,a.check_in desc nulls last,a.id desc;
$function$
;
REVOKE EXECUTE ON FUNCTION public.get_my_attendance_v2(date,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_attendance_v2(date,date) TO authenticated, postgres;

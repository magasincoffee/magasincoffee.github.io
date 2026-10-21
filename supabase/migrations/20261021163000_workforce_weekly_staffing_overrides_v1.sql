-- MAGASIN Workforce P1: one-week overrides of the canonical recurring template.
-- Additive migration. Does not mutate or replace preexisting demand/template rows.
-- Confirmed rule 2026-10-20 §3: only the selected week may differ; next week inherits base.
BEGIN;

CREATE TABLE IF NOT EXISTS public.workforce_weekly_staffing_overrides_v1 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 store_id uuid NOT NULL REFERENCES public.stores(id),
 work_date date NOT NULL,
 start_time time without time zone NOT NULL,
 end_time time without time zone NOT NULL,
 target_headcount integer NOT NULL,
 updated_by uuid NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT workforce_weekly_staffing_override_unique_v1 UNIQUE(store_id,work_date,start_time,end_time),
 CONSTRAINT workforce_weekly_staffing_override_headcount_v1 CHECK(target_headcount BETWEEN 0 AND 20),
 CONSTRAINT workforce_weekly_staffing_override_clock_v1 CHECK(
  start_time>=time '05:00' AND end_time<=time '22:00'
  AND start_time<end_time
  AND extract(minute from start_time) IN (0,30)
  AND extract(minute from end_time) IN (0,30)
  AND extract(second from start_time)=0
  AND extract(second from end_time)=0
 )
);
ALTER TABLE public.workforce_weekly_staffing_overrides_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.workforce_weekly_staffing_overrides_v1 FROM PUBLIC, anon, authenticated;

-- Source includes the zero override explicitly: managers can distinguish intentional 0 from missing.
CREATE OR REPLACE FUNCTION public.list_workforce_effective_weekly_staffing_v1(
 p_store_id uuid, p_week_start date
) RETURNS TABLE(
 store_id uuid, work_date date, start_time time without time zone,
 end_time time without time zone, target_headcount integer, demand_source text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO public
AS $f$
DECLARE v_role text := upper(coalesce(public.current_user_role(),''));
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 IF v_role NOT IN ('OWNER','STORE_MANAGER') THEN RAISE EXCEPTION 'ROLE_NOT_ALLOWED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.status='ACTIVE'
               AND upper(p.role)=v_role) THEN RAISE EXCEPTION 'ACTOR_NOT_ACTIVE'; END IF;
 IF p_week_start IS NULL OR extract(isodow from p_week_start)<>1 THEN
   RAISE EXCEPTION 'WEEK_START_MUST_BE_MONDAY';
 END IF;
 IF p_store_id IS NULL OR NOT EXISTS(
    SELECT 1 FROM public.get_manager_accessible_stores() s WHERE s.id=p_store_id
 ) THEN RAISE EXCEPTION 'STORE_NOT_ALLOWED'; END IF;

 RETURN QUERY
 WITH base AS (
  SELECT t.store_id, p_week_start+(t.day_of_week::integer-1) AS work_date,
         t.start_time,t.end_time,t.target_headcount
  FROM public.workforce_recurring_staffing_requirements t
  WHERE t.store_id=p_store_id AND t.day_of_week BETWEEN 1 AND 7
 ),
 effective AS (
  SELECT b.store_id,b.work_date,b.start_time,b.end_time,
         coalesce(o.target_headcount,b.target_headcount) AS target_headcount,
         CASE WHEN o.id IS NULL THEN 'RECURRING' ELSE 'WEEK_OVERRIDE' END::text AS demand_source
  FROM base b
  LEFT JOIN public.workforce_weekly_staffing_overrides_v1 o
     ON o.store_id=b.store_id AND o.work_date=b.work_date
    AND o.start_time=b.start_time AND o.end_time=b.end_time
 ),
 extra AS (
  SELECT o.store_id,o.work_date,o.start_time,o.end_time,o.target_headcount,
         'WEEK_OVERRIDE'::text AS demand_source
  FROM public.workforce_weekly_staffing_overrides_v1 o
  WHERE o.store_id=p_store_id AND o.work_date BETWEEN p_week_start AND p_week_start+6
    AND NOT EXISTS (
      SELECT 1 FROM base b WHERE b.store_id=o.store_id AND b.work_date=o.work_date
        AND b.start_time=o.start_time AND b.end_time=o.end_time
    )
 )
 SELECT x.store_id,x.work_date,x.start_time,x.end_time,x.target_headcount,x.demand_source
 FROM (SELECT * FROM effective UNION ALL SELECT * FROM extra) x
 ORDER BY x.work_date,x.start_time,x.end_time;
END;
$f$;

-- Shared allowlisted scope proof for raw weekly state and fingerprint.
CREATE OR REPLACE FUNCTION public.get_workforce_weekly_override_state_v1(
 p_store_id uuid,p_week_start date
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO public
AS $f$
DECLARE v_role text := upper(coalesce(public.current_user_role(),''));
DECLARE v_rows jsonb;
DECLARE v_fingerprint text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 IF v_role NOT IN ('OWNER','STORE_MANAGER') THEN RAISE EXCEPTION 'ROLE_NOT_ALLOWED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.status='ACTIVE'
               AND upper(p.role)=v_role) THEN RAISE EXCEPTION 'ACTOR_NOT_ACTIVE'; END IF;
 IF p_week_start IS NULL OR extract(isodow from p_week_start)<>1 THEN
   RAISE EXCEPTION 'WEEK_START_MUST_BE_MONDAY';
 END IF;
 IF p_store_id IS NULL OR NOT EXISTS(
    SELECT 1 FROM public.get_manager_accessible_stores() s WHERE s.id=p_store_id
 ) THEN RAISE EXCEPTION 'STORE_NOT_ALLOWED'; END IF;
 SELECT
   coalesce(jsonb_agg(jsonb_build_object(
    'work_date',o.work_date,'start_time',to_char(o.start_time,'HH24:MI'),
    'end_time',to_char(o.end_time,'HH24:MI'),'target_headcount',o.target_headcount
   ) ORDER BY o.work_date,o.start_time,o.end_time),'[]'::jsonb),
   md5(coalesce(string_agg(o.work_date::text||'|'||to_char(o.start_time,'HH24:MI')||'|'||
     to_char(o.end_time,'HH24:MI')||'|'||o.target_headcount::text,';' ORDER BY
     o.work_date,o.start_time,o.end_time),''))
 INTO v_rows,v_fingerprint
 FROM public.workforce_weekly_staffing_overrides_v1 o
 WHERE o.store_id=p_store_id AND o.work_date BETWEEN p_week_start AND p_week_start+6;
 RETURN jsonb_build_object('store_id',p_store_id,'week_start',p_week_start,
   'overrides',v_rows,'fingerprint',v_fingerprint);
END;
$f$;

CREATE OR REPLACE FUNCTION public.replace_workforce_weekly_overrides_v1(
 p_store_id uuid,p_week_start date,p_overrides jsonb,p_expected_fingerprint text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public
AS $f$
DECLARE v_role text := upper(coalesce(public.current_user_role(),''));
DECLARE v_item jsonb;
DECLARE v_date date;
DECLARE v_start time without time zone;
DECLARE v_end time without time zone;
DECLARE v_target integer;
DECLARE v_count integer := 0;
DECLARE v_fingerprint text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 IF v_role NOT IN ('OWNER','STORE_MANAGER') THEN RAISE EXCEPTION 'ROLE_NOT_ALLOWED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.status='ACTIVE'
               AND upper(p.role)=v_role) THEN RAISE EXCEPTION 'ACTOR_NOT_ACTIVE'; END IF;
 IF p_week_start IS NULL OR extract(isodow from p_week_start)<>1 THEN
   RAISE EXCEPTION 'WEEK_START_MUST_BE_MONDAY';
 END IF;
 IF p_store_id IS NULL OR NOT EXISTS(
    SELECT 1 FROM public.get_manager_accessible_stores() s WHERE s.id=p_store_id
 ) THEN RAISE EXCEPTION 'STORE_NOT_ALLOWED'; END IF;
 IF p_expected_fingerprint IS NULL OR length(p_expected_fingerprint)<>32
    THEN RAISE EXCEPTION 'WEEK_OVERRIDE_EXPECTED_STATE_REQUIRED'; END IF;
 IF jsonb_typeof(p_overrides)<>'array' OR jsonb_array_length(p_overrides)>1500
    THEN RAISE EXCEPTION 'WEEK_OVERRIDE_INVALID_PAYLOAD'; END IF;

 -- Only one editor may replace one branch/week at a time.
 PERFORM pg_advisory_xact_lock(hashtextextended(
   'workforce_weekly_staffing:'||p_store_id::text||'|'||p_week_start::text,0));

 SELECT md5(coalesce(string_agg(o.work_date::text||'|'||to_char(o.start_time,'HH24:MI')||'|'||
  to_char(o.end_time,'HH24:MI')||'|'||o.target_headcount::text,';' ORDER BY
  o.work_date,o.start_time,o.end_time),''))
 INTO v_fingerprint
 FROM public.workforce_weekly_staffing_overrides_v1 o
 WHERE o.store_id=p_store_id AND o.work_date BETWEEN p_week_start AND p_week_start+6;
 IF v_fingerprint<>p_expected_fingerprint THEN
  RAISE EXCEPTION 'WEEK_OVERRIDE_STALE_RELOAD';
 END IF;

 -- Validate complete board BEFORE deleting anything; duplicate keys fail atomically.
 FOR v_item IN SELECT value FROM jsonb_array_elements(p_overrides) LOOP
   BEGIN
     v_date:=(v_item->>'work_date')::date;
     v_start:=(v_item->>'start_time')::time;
     v_end:=(v_item->>'end_time')::time;
     v_target:=(v_item->>'target_headcount')::integer;
   EXCEPTION WHEN others THEN
     RAISE EXCEPTION 'WEEK_OVERRIDE_FIELDS_INVALID';
   END;
   IF v_date IS NULL OR v_start IS NULL OR v_end IS NULL OR v_target IS NULL
     THEN RAISE EXCEPTION 'WEEK_OVERRIDE_FIELDS_REQUIRED'; END IF;
   IF v_date NOT BETWEEN p_week_start AND p_week_start+6
     THEN RAISE EXCEPTION 'WEEK_OVERRIDE_DATE_OUT_OF_SCOPE'; END IF;
   IF v_start<time '05:00' OR v_end>time '22:00' OR v_end<=v_start
    OR extract(minute from v_start) NOT IN(0,30)
    OR extract(minute from v_end) NOT IN(0,30)
    OR extract(second from v_start)<>0 OR extract(second from v_end)<>0
     THEN RAISE EXCEPTION 'WEEK_OVERRIDE_INVALID_SLOT'; END IF;
   IF v_target<0 OR v_target>20
     THEN RAISE EXCEPTION 'WEEK_OVERRIDE_INVALID_HEADCOUNT'; END IF;
 END LOOP;

 DELETE FROM public.workforce_weekly_staffing_overrides_v1 o
 WHERE o.store_id=p_store_id AND o.work_date BETWEEN p_week_start AND p_week_start+6;
 FOR v_item IN SELECT value FROM jsonb_array_elements(p_overrides) LOOP
   INSERT INTO public.workforce_weekly_staffing_overrides_v1(
     store_id,work_date,start_time,end_time,target_headcount,updated_by
   ) VALUES (
     p_store_id,(v_item->>'work_date')::date,
     (v_item->>'start_time')::time,(v_item->>'end_time')::time,
     (v_item->>'target_headcount')::integer,auth.uid()
   );
   v_count:=v_count+1;
 END LOOP;
 RETURN jsonb_build_object('store_id',p_store_id,'week_start',p_week_start,'saved',v_count);
END;
$f$;

REVOKE ALL ON FUNCTION public.list_workforce_effective_weekly_staffing_v1(uuid,date) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_workforce_weekly_override_state_v1(uuid,date) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.replace_workforce_weekly_overrides_v1(uuid,date,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_workforce_effective_weekly_staffing_v1(uuid,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workforce_weekly_override_state_v1(uuid,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_workforce_weekly_overrides_v1(uuid,date,jsonb,text) TO authenticated;
COMMIT;

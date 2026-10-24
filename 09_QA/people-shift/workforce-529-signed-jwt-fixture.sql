-- Disposable QA only: executed AFTER the #529 PostgreSQL contract tests.
-- No production credentials or network routes; all IDs are synthetic.
DO $r$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticator') THEN
  CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD 'qa-529-synthetic-only';
 END IF;
END $r$;
GRANT anon, authenticated TO authenticator;
GRANT USAGE ON SCHEMA public,auth TO anon,authenticated;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
 AS $uid$ SELECT coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $uid$;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
CREATE OR REPLACE FUNCTION public.current_user_role() RETURNS text
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
 AS $role$ SELECT upper(p.role) FROM public.profiles p WHERE p.id=auth.uid() $role$;
CREATE OR REPLACE FUNCTION public.can_access_store(p_store_id uuid) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
 AS $scope$ SELECT EXISTS(
   SELECT 1 FROM public.profiles p
   JOIN public.stores s ON s.id=p_store_id
   WHERE p.id=auth.uid() AND p.status='ACTIVE'
     AND (upper(p.role)='OWNER' OR upper(p.role)='STORE_MANAGER' AND
          (s.code='CN1' OR p.username='manager-all'))
 ) $scope$;
GRANT EXECUTE ON FUNCTION public.current_user_role(),public.can_access_store(uuid) TO authenticated;
-- Real RPC grants are inherited from staged migrations; do not allow direct writes.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon,authenticated;
INSERT INTO public.stores(id,code,status) VALUES
 ('20000000-0000-0000-0000-000000000001','CN1','ACTIVE'),
 ('20000000-0000-0000-0000-000000000002','CN2','ACTIVE');
INSERT INTO public.profiles(id,status,role,full_name,username) VALUES
 ('11111111-1111-1111-1111-111111111112','ACTIVE','STORE_MANAGER','Manager QA','manager-cn1'),
 ('11111111-1111-1111-1111-111111111113','ACTIVE','STAFF','Employee QA','staff'),
 ('11111111-1111-1111-1111-111111111114','INACTIVE','STORE_MANAGER','Inactive QA','inactive');
INSERT INTO public.employee_store_priorities(employee_id,store_id,priority)
 VALUES('11111111-1111-1111-1111-111111111113','20000000-0000-0000-0000-000000000001',1);
INSERT INTO public.employee_availability(user_id,work_date,availability_type,start_time,end_time)
 VALUES('11111111-1111-1111-1111-111111111113','2026-10-26','AVAILABLE','06:00','14:00');
INSERT INTO public.employee_employment_types_v1(employee_id,employment_type)
 VALUES('11111111-1111-1111-1111-111111111113','FULL_TIME');
INSERT INTO public.workforce_recurring_staffing_requirements(id,store_id,day_of_week,start_time,end_time,target_headcount)
 VALUES('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',1,'06:00','14:00',1),
       ('40000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002',1,'06:00','14:00',1);

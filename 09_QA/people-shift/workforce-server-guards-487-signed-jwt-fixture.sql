-- TEST FIXTURE ONLY. All rows, UUIDs, keys and policies are SYNTHETIC.
-- Never run on production. This fixture intentionally grants broad QA-only
-- table RLS permissions so the staged TRIGGERS (not RLS) own denial decisions.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE workforce_qa_authenticator LOGIN NOINHERIT PASSWORD 'qa-workforce-temporary-password';
GRANT anon, authenticated TO workforce_qa_authenticator;
CREATE SCHEMA auth;
-- Match real Supabase auth.uid UUID contract for verified PostgREST JWT.\nCREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SET search_path TO '' AS $auth$
 SELECT (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid
$auth$;
CREATE TABLE public.profiles(id uuid PRIMARY KEY, role text, status text);
CREATE TABLE public.employee_availability(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
  work_date date NOT NULL,start_time time NOT NULL,end_time time NOT NULL,
  availability_type text NOT NULL DEFAULT 'AVAILABLE',
  preferred_store_id uuid,note text
);
CREATE TABLE public.work_schedules(
  id uuid PRIMARY KEY, user_id uuid NOT NULL,store_id uuid,
  work_date date NOT NULL,start_time time NOT NULL,end_time time NOT NULL,
  status text NOT NULL DEFAULT 'PUBLISHED'
);
CREATE TABLE public.shift_swaps(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_schedule_id uuid,target_schedule_id uuid,
  requester_id uuid, target_user_id uuid, status text NOT NULL DEFAULT 'PENDING'
);
CREATE TABLE public.shift_gives(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),schedule_id uuid,giver_id uuid,
  status text NOT NULL DEFAULT 'PENDING'
);
INSERT INTO public.profiles VALUES
 ('00000000-0000-4000-8000-000000000001','EMPLOYEE','ACTIVE'),
 ('00000000-0000-4000-8000-000000000002','STAFF','ACTIVE'),
 ('00000000-0000-4000-8000-000000000003','EMPLOYEE','INACTIVE'),
 ('00000000-0000-4000-8000-000000000004','STORE_MANAGER','ACTIVE'),
 ('00000000-0000-4000-8000-000000000005','OWNER','ACTIVE');
-- Schedule early starts approximately 23 hours after this fixture is loaded,
-- and future starts 49 hours after fixture. Run live-clock tests promptly.
WITH anchor AS (
 SELECT (clock_timestamp() at time zone 'Asia/Ho_Chi_Minh') local_now
)
INSERT INTO public.work_schedules(id,user_id,store_id,work_date,start_time,end_time)
SELECT x.id::uuid,x.user_id::uuid,NULL,x.starts::date,x.starts::time,(x.starts+interval '4 hours')::time
FROM anchor a CROSS JOIN LATERAL (
 VALUES
 ('00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000001',a.local_now+interval '23 hours'),
 ('00000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000002',a.local_now+interval '23 hours'),
 ('00000000-0000-4000-8000-000000000303','00000000-0000-4000-8000-000000000001',a.local_now+interval '49 hours'),
 ('00000000-0000-4000-8000-000000000304','00000000-0000-4000-8000-000000000002',a.local_now+interval '49 hours')
) x(id,user_id,starts);
-- Synthetic-only RLS: deny nothing for authenticated so each negative
-- result must be produced by staged trigger itself. Real RLS/RPC is separate.
ALTER TABLE public.employee_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_swaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_gives ENABLE ROW LEVEL SECURITY;
CREATE POLICY qa_employee_open ON public.employee_availability TO authenticated
 USING (true) WITH CHECK (true);
CREATE POLICY qa_swap_open ON public.shift_swaps TO authenticated
 USING (true) WITH CHECK (true);
CREATE POLICY qa_give_open ON public.shift_gives TO authenticated
 USING (true) WITH CHECK (true);
GRANT USAGE ON SCHEMA public TO authenticated,anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.employee_availability,public.shift_swaps,public.shift_gives TO authenticated;
GRANT SELECT ON public.work_schedules TO authenticated;
-- Functions invoked by SECURITY DEFINER triggers can inspect profiles; no
-- authenticated table-grant is needed and no production grants are changed.

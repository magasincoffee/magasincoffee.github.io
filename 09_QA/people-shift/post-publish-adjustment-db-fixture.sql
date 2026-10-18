-- Isolated stub schema: never run against Production.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION public.current_user_role() RETURNS text LANGUAGE sql STABLE AS
$$ SELECT current_setting('app.mock_role',true) $$;
CREATE TABLE public.stores(id uuid PRIMARY KEY);
CREATE TABLE public.profiles(id uuid PRIMARY KEY,role text NOT NULL,status text NOT NULL);
CREATE TABLE public.employee_store_priorities(employee_id uuid,store_id uuid,priority integer DEFAULT 1);
CREATE TABLE public.schedule_generation_runs(
 id uuid PRIMARY KEY,store_id uuid NOT NULL,status text NOT NULL,
 week_start date NOT NULL,week_end date NOT NULL
);
CREATE TABLE public.work_schedules(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 work_date date NOT NULL,start_time time NOT NULL,end_time time NOT NULL,
 store_id uuid NOT NULL,user_id uuid NOT NULL,status text NOT NULL DEFAULT 'PENDING',
 approver_id uuid,approved_at timestamptz,note text,origin text NOT NULL DEFAULT 'USER_REQUEST',
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 source_generation_id uuid,source_generation_assignment_id uuid
);
CREATE FUNCTION public.can_access_store(p_store uuid) RETURNS boolean
 LANGUAGE sql STABLE AS $$SELECT p_store='11111111-1111-4111-8111-111111111111'::uuid$$;
INSERT INTO public.stores VALUES('11111111-1111-4111-8111-111111111111');
INSERT INTO public.profiles VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','OWNER','ACTIVE'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','STAFF','ACTIVE'),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','STAFF','ACTIVE'),
 ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','STAFF','INACTIVE'),
 ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','STAFF','ACTIVE');
INSERT INTO public.employee_store_priorities(employee_id,store_id,priority)
SELECT id,'11111111-1111-4111-8111-111111111111',1
FROM public.profiles WHERE role='STAFF';
INSERT INTO public.schedule_generation_runs(id,store_id,status,week_start,week_end)
SELECT '99999999-9999-4999-8999-999999999999',
 '11111111-1111-4111-8111-111111111111','PUBLISHED',
 date_trunc('week', (now() at time zone 'Asia/Ho_Chi_Minh')::date+7)::date,
 date_trunc('week', (now() at time zone 'Asia/Ho_Chi_Minh')::date+7)::date+6;
GRANT USAGE ON SCHEMA public,auth TO authenticated;

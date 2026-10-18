-- Disposable local PostgreSQL QA ONLY. Synthetic rows; NOT a full Production clone.
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('qa.actor_id',true),'')::uuid$$;
CREATE SCHEMA IF NOT EXISTS public;
CREATE TABLE public.profiles(id uuid PRIMARY KEY,role text NOT NULL,status text NOT NULL,access_scope text);
CREATE TABLE public.employee_store_priorities(employee_id uuid REFERENCES public.profiles(id),store_id uuid NOT NULL);
CREATE TABLE public.work_schedules(id uuid PRIMARY KEY,user_id uuid REFERENCES public.profiles(id),store_id uuid NOT NULL,work_date date NOT NULL,status text NOT NULL);
CREATE TABLE public.schedule_generation_assignments(id uuid PRIMARY KEY,user_id uuid REFERENCES public.profiles(id),store_id uuid NOT NULL);
CREATE FUNCTION public.current_user_role() RETURNS text LANGUAGE sql STABLE AS $$SELECT role FROM public.profiles WHERE id=auth.uid()$$;
CREATE FUNCTION public.can_access_store(target_store_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND (role='OWNER' OR access_scope='ALL' OR access_scope=target_store_id::text))
$$;
INSERT INTO public.profiles VALUES
 ('00000000-0000-0000-0000-000000000001','OWNER','ACTIVE','ALL'),
 ('00000000-0000-0000-0000-000000000002','STORE_MANAGER','ACTIVE','ALL'),
 ('00000000-0000-0000-0000-000000000003','STORE_MANAGER','ACTIVE','00000000-0000-0000-0000-000000000101'),
 ('00000000-0000-0000-0000-000000000004','STAFF','ACTIVE',null),
 ('00000000-0000-0000-0000-000000000005','STAFF','INACTIVE',null),
 ('00000000-0000-0000-0000-000000000006','STORE_MANAGER','INACTIVE','ALL');
INSERT INTO public.employee_store_priorities VALUES
 ('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000101'),
 ('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000101');
INSERT INTO public.work_schedules VALUES
 ('00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000101',CURRENT_DATE+7,'APPROVED');
INSERT INTO public.schedule_generation_assignments VALUES
 ('00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000101');
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;

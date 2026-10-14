-- XSTORE-019O JWT QA only. Synthetic identities in disposable PG17 DB, never production.
DO $block$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN;END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN;END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticator') THEN
  CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD 'synthetic-only-jwt-test';
 ELSE
  ALTER ROLE authenticator LOGIN NOINHERIT PASSWORD 'synthetic-only-jwt-test';
 END IF;
END;$block$;
GRANT anon, authenticated TO authenticator;
CREATE SCHEMA IF NOT EXISTS auth;
GRANT USAGE ON SCHEMA public TO anon,authenticated;
GRANT USAGE ON SCHEMA auth TO authenticated;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $function$
SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.sub',true),''),
 NULLIF(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid
$function$;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
CREATE TABLE public.stores(id uuid PRIMARY KEY,code text UNIQUE NOT NULL);
CREATE TABLE public.profiles(id uuid PRIMARY KEY,role text NOT NULL,status text NOT NULL,access_scope text);
CREATE TABLE public.employee_store_priorities(employee_id uuid NOT NULL REFERENCES public.profiles(id),store_id uuid NOT NULL REFERENCES public.stores(id),rank int NOT NULL,PRIMARY KEY(employee_id,store_id));
CREATE TABLE public.work_schedules(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES public.profiles(id),store_id uuid NOT NULL REFERENCES public.stores(id),work_date date NOT NULL,status text NOT NULL);
CREATE TABLE public.schedule_generation_assignments(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES public.profiles(id),store_id uuid NOT NULL REFERENCES public.stores(id),work_date date NOT NULL,status text NOT NULL);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_store_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_generation_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profiles,public.employee_store_priorities,public.work_schedules,public.schedule_generation_assignments FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.current_user_role() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $function$
SELECT p.role FROM public.profiles p WHERE p.id=auth.uid()
$function$;
CREATE OR REPLACE FUNCTION public.can_access_store(target_store_id uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $function$
DECLARE v_role text;v_status text;v_scope text;v_code text;
BEGIN
 IF auth.uid() IS NULL OR target_store_id IS NULL THEN RETURN FALSE; END IF;
 SELECT upper(coalesce(role,'')),status,coalesce(access_scope,'') INTO v_role,v_status,v_scope FROM public.profiles WHERE id=auth.uid();
 IF NOT FOUND OR v_status<>'ACTIVE' THEN RETURN FALSE; END IF;
 IF v_role='OWNER' THEN RETURN TRUE; END IF;
 IF v_role<>'STORE_MANAGER' THEN RETURN FALSE; END IF;
 SELECT upper(code) INTO v_code FROM public.stores WHERE id=target_store_id;
 IF v_code IS NULL THEN RETURN FALSE; END IF;
 RETURN EXISTS(SELECT 1 FROM regexp_split_to_table(upper(v_scope),'[,; ]+') token WHERE token IN ('ALL','*',v_code));
END;$function$;
GRANT EXECUTE ON FUNCTION public.current_user_role(),public.can_access_store(uuid) TO authenticated;
INSERT INTO public.stores VALUES
('00000000-0000-4000-8000-000000000011','CN1'),
('00000000-0000-4000-8000-000000000012','CN2');
INSERT INTO public.profiles VALUES
('00000000-0000-4000-8000-000000000001','OWNER','ACTIVE','ALL'),
('00000000-0000-4000-8000-000000000002','STORE_MANAGER','ACTIVE','ALL'),
('00000000-0000-4000-8000-000000000003','STORE_MANAGER','ACTIVE','CN1'),
('00000000-0000-4000-8000-000000000004','STAFF','ACTIVE',NULL),
('00000000-0000-4000-8000-000000000005','STAFF','ACTIVE',NULL),
('00000000-0000-4000-8000-000000000006','STAFF','ACTIVE',NULL),
('00000000-0000-4000-8000-000000000007','STORE_MANAGER','INACTIVE','ALL');
INSERT INTO public.employee_store_priorities VALUES
('00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000011',1),
('00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000012',2),
('00000000-0000-4000-8000-000000000006','00000000-0000-4000-8000-000000000012',1);
INSERT INTO public.work_schedules VALUES
('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000012',current_date+2,'APPROVED');
INSERT INTO public.schedule_generation_assignments VALUES
('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000012',current_date+3,'DRAFT');

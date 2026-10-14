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
-- Authority implementations below transcribed from 2026-10-14 production pg_get_functiondef().
-- Only the identities and rows below are synthetic; production signatures are unchanged.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select role from public.profiles where id = auth.uid();
$function$;
CREATE OR REPLACE FUNCTION public.can_access_store(target_store_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  v_role text;
  v_status text;
  v_scope text;
  v_code text;
begin
  if auth.uid() is null or target_store_id is null then return false; end if;
  select upper(coalesce(p.role,'')),p.status,coalesce(p.access_scope,'')
    into v_role,v_status,v_scope
    from public.profiles p
   where p.id=auth.uid();
  if not found or v_status<>'ACTIVE' then return false; end if;
  if v_role='OWNER' then return true; end if;
  if v_role<>'STORE_MANAGER' then return false; end if;
  select upper(s.code) into v_code
  from public.stores s
  where s.id=target_store_id;
  if v_code is null then return false; end if;
  return exists(
    select 1
    from regexp_split_to_table(upper(v_scope),'[,; ]+') token
    where token in ('ALL','*',v_code)
  );
end;
$function$;
GRANT EXECUTE ON FUNCTION public.current_user_role(),public.can_access_store(uuid) TO authenticated;
-- Match verified production role privileges + Owner-only RLS for direct profile PATCH.
-- Authenticated column grants alone do not confer an UPDATE when RLS denies it.
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE(status,role,access_scope) ON public.profiles TO authenticated;
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
USING (id=auth.uid() OR public.current_user_role()='OWNER');
CREATE POLICY profiles_update_owner ON public.profiles FOR UPDATE TO authenticated
USING (public.current_user_role()='OWNER')
WITH CHECK (public.current_user_role()='OWNER');
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

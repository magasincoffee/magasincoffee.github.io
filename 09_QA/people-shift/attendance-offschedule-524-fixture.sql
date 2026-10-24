-- Disposable QA only. Minimal projection for #524; NOT hosted schema parity.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA auth;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE TABLE public.stores(id uuid PRIMARY KEY);
CREATE TABLE public.profiles(id uuid PRIMARY KEY,role text NOT NULL,status text NOT NULL,access_scope text NOT NULL);
CREATE TABLE public.work_schedules(id uuid PRIMARY KEY,user_id uuid,store_id uuid,work_date date,status text,start_time time,end_time time);
CREATE TABLE public.attendance(id uuid PRIMARY KEY);
CREATE TABLE public.payroll_entries(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),
 nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid
$$;
CREATE FUNCTION public.can_access_store(p_store uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND status='ACTIVE'
 AND (access_scope='ALL' OR (access_scope='CN3' AND p_store='91000000-0000-4000-8000-000000000003'::uuid)))
$$;
CREATE FUNCTION public.validate_manager_attendance_review_authority_v1(p_store uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.profiles%rowtype;
BEGIN
 SELECT * INTO r FROM public.profiles WHERE id=auth.uid();
 IF NOT FOUND OR r.status<>'ACTIVE' OR r.role NOT IN ('STORE_MANAGER','OWNER')
 THEN RAISE EXCEPTION 'REVIEW_ROLE_NOT_ALLOWED'; END IF;
 IF r.role<>'OWNER' AND NOT public.can_access_store(p_store)
 THEN RAISE EXCEPTION 'STORE_NOT_ALLOWED'; END IF;
 RETURN jsonb_build_object('ok',true);
END $$;
INSERT INTO public.stores VALUES
 ('91000000-0000-4000-8000-000000000001'),
 ('91000000-0000-4000-8000-000000000003');
INSERT INTO public.profiles VALUES
 ('90000000-0000-4000-8000-000000000007','STAFF','ACTIVE','CN3'),
 ('90000000-0000-4000-8000-000000000008','STORE_MANAGER','ACTIVE','CN3'),
 ('90000000-0000-4000-8000-000000000009','STORE_MANAGER','ACTIVE','CN1'),
 ('90000000-0000-4000-8000-000000000010','OWNER','ACTIVE','ALL');
-- Tests only use synthetic stable user IDs and no PII.

-- #487/#489: disposable Postgres identities, never production.
CREATE SCHEMA IF NOT EXISTS auth;
DO $ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
END $;
CREATE ROLE qa_authenticator LOGIN NOINHERIT PASSWORD 'qa-local-disposable-password';
GRANT anon, authenticated TO qa_authenticator;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql VOLATILE SET search_path=''
AS $SELECT COALESCE(
 nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub',
 nullif(current_setting('request.jwt.claim.sub',true),'')
)::uuid$;
CREATE TABLE public.profiles (
 id uuid PRIMARY KEY, role text NOT NULL, status text NOT NULL
);
CREATE TABLE public.employee_availability (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.profiles(id),
 work_date date NOT NULL,
 start_time time without time zone NOT NULL,
 end_time time without time zone NOT NULL,
 preferred_store_id uuid,
 availability_type text NOT NULL DEFAULT 'AVAILABLE',
 note text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.profiles(id,role,status) VALUES
 ('90000000-0000-4000-8000-000000000001','STORE_MANAGER','ACTIVE'),
 ('90000000-0000-4000-8000-000000000002','EMPLOYEE','ACTIVE'),
 ('90000000-0000-4000-8000-000000000003','EMPLOYEE','ACTIVE'),
 ('90000000-0000-4000-8000-000000000004','EMPLOYEE','INACTIVE');

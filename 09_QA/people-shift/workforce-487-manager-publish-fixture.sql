-- #487 Manager publish signed JWT E2E — synthetic disposable DB only.
-- Loaded after employee RPC fixture and four-store read fixture; before hosted RPC bodies.
-- Never run against MAGASIN production.
INSERT INTO public.profiles(id,role,status,full_name,username)
VALUES ('90000000-0000-4000-8000-000000000007','STAFF','ACTIVE','QA Staff CN3','qa-staff7');
INSERT INTO public.qa_manager_access(user_id,store_id)
VALUES ('90000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000003');
INSERT INTO public.employee_store_priorities(employee_id,store_id)
VALUES ('90000000-0000-4000-8000-000000000007','91000000-0000-4000-8000-000000000003');

-- Seed existing availability purely as a precondition to test Manager publishing.
-- The Sunday noon availability trigger is disabled ONLY around this one synthetic
-- SQL seed, then reenabled; earlier signed-JWT registration tests still exercise it.
ALTER TABLE public.employee_availability DISABLE TRIGGER trg_employee_availability_window_v1;
INSERT INTO public.employee_availability(user_id,work_date,start_time,end_time,availability_type)
VALUES (
 '90000000-0000-4000-8000-000000000007',
 ((now() at time zone 'Asia/Ho_Chi_Minh')::date
  -(extract(isodow from (now() at time zone 'Asia/Ho_Chi_Minh'))::integer-1)+7),
 '06:00','12:00','AVAILABLE');
ALTER TABLE public.employee_availability ENABLE TRIGGER trg_employee_availability_window_v1;
-- Extend the preexisting isolated snapshot to include this explicit seed.
INSERT INTO qa_private.employee_availability_baseline
SELECT * FROM public.employee_availability WHERE user_id='90000000-0000-4000-8000-000000000007';

CREATE TABLE public.schedule_generation_runs(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 store_id uuid NOT NULL REFERENCES public.stores(id),
 week_start date NOT NULL,
 week_end date NOT NULL,
 algorithm_version text NOT NULL DEFAULT 'RULE_V1',
 status text NOT NULL DEFAULT 'DRAFT',
 created_by uuid NOT NULL REFERENCES public.profiles(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 reviewed_by uuid, reviewed_at timestamptz,
 published_by uuid, published_at timestamptz,
 total_hours numeric NOT NULL DEFAULT 0
);
CREATE TABLE public.schedule_generation_assignments(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 generation_id uuid NOT NULL REFERENCES public.schedule_generation_runs(id),
 user_id uuid NOT NULL REFERENCES public.profiles(id),
 store_id uuid NOT NULL REFERENCES public.stores(id),
 work_date date NOT NULL,
 start_time time NOT NULL,
 end_time time NOT NULL,
 skill_code text,skill_level integer NOT NULL DEFAULT 0,
 score numeric NOT NULL DEFAULT 0,warning text,
 status text NOT NULL DEFAULT 'DRAFT',note text
);
CREATE TABLE public.workforce_recurring_staffing_requirements(
 store_id uuid NOT NULL REFERENCES public.stores(id),
 target_headcount integer NOT NULL DEFAULT 0,
 start_time time NOT NULL,
 end_time time NOT NULL,
 day_of_week integer NOT NULL
);
-- Production schedules use a server-generated UUID; the earlier synthetic read fixture
-- seeded explicit IDs and therefore lacked this default until the write-path rehearsal.
ALTER TABLE public.work_schedules ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.work_schedules
 ADD COLUMN approver_id uuid,
 ADD COLUMN approved_at timestamptz,
 ADD COLUMN note text,
 ADD COLUMN source_generation_id uuid,
 ADD COLUMN source_generation_assignment_id uuid;
CREATE UNIQUE INDEX uq_qa_schedule_lineage
ON public.work_schedules(source_generation_assignment_id)
WHERE source_generation_assignment_id IS NOT NULL;

-- Real browser roles must go via RPCs; no direct canonical table DML/SELECT.
REVOKE ALL ON public.schedule_generation_runs,public.schedule_generation_assignments,
 public.workforce_recurring_staffing_requirements,public.work_schedules
FROM PUBLIC,anon,authenticated;
CREATE TABLE qa_private.manager_publish_schedule_baseline AS SELECT * FROM public.work_schedules;
CREATE TABLE qa_private.manager_publish_generation_baseline AS SELECT * FROM public.schedule_generation_runs;
CREATE TABLE qa_private.manager_publish_assignment_baseline AS SELECT * FROM public.schedule_generation_assignments;

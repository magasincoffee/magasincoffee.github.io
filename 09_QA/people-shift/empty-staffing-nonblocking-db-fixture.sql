-- Runs only after post-publish-adjustment-db-fixture.sql on isolated PostgreSQL.
ALTER TABLE public.stores ADD COLUMN status text NOT NULL DEFAULT 'ACTIVE';
CREATE TABLE public.schedule_generation_assignments(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 generation_id uuid NOT NULL,
 user_id uuid NOT NULL,
 store_id uuid NOT NULL,
 work_date date NOT NULL,
 start_time time NOT NULL,
 end_time time NOT NULL,
 status text NOT NULL DEFAULT 'DRAFT'
);
CREATE TABLE public.employee_availability(
 user_id uuid, work_date date, start_time time, end_time time,
 availability_type text
);
CREATE TABLE public.workforce_recurring_staffing_requirements(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 store_id uuid, day_of_week smallint, start_time time, end_time time, target_headcount integer
);
INSERT INTO public.schedule_generation_runs(id,store_id,status,week_start,week_end)
SELECT '88888888-8888-4888-8888-888888888888'::uuid,
 '11111111-1111-4111-8111-111111111111'::uuid,
 'DRAFT',
 date_trunc('week',(now() at time zone 'Asia/Ho_Chi_Minh')::date+14)::date,
 date_trunc('week',(now() at time zone 'Asia/Ho_Chi_Minh')::date+14)::date+6;
INSERT INTO public.workforce_recurring_staffing_requirements(store_id,day_of_week,start_time,end_time,target_headcount)
VALUES ('11111111-1111-4111-8111-111111111111',1,'08:00','12:00',2);
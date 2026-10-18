-- Disposable local PostgreSQL QA ONLY. Synthetic rows; NOT a full Production clone.
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('qa.actor_id',true),'')::uuid$$;
CREATE SCHEMA IF NOT EXISTS public;
CREATE TABLE public.profiles(id uuid PRIMARY KEY,role text NOT NULL,status text NOT NULL,access_scope text);
CREATE TABLE public.employee_store_priorities(employee_id uuid REFERENCES public.profiles(id),store_id uuid NOT NULL);
CREATE TABLE public.work_schedules(id uuid PRIMARY KEY,user_id uuid REFERENCES public.profiles(id),store_id uuid NOT NULL,work_date date NOT NULL,status text NOT NULL);
CREATE TABLE public.schedule_generation_assignments(id uuid PRIMARY KEY,user_id uuid REFERENCES public.profiles(id),store_id uuid NOT NULL);
-- Referential topology mirrors current Production FK relationships in the lifecycle-critical subset.
-- This deliberately does not pretend to reproduce the full database schema.
CREATE TABLE public.attendance(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES public.profiles(id),reviewed_by uuid REFERENCES public.profiles(id));
CREATE TABLE public.payroll_entries(id uuid PRIMARY KEY,employee_id uuid NOT NULL REFERENCES public.profiles(id));
CREATE TABLE public.employee_availability(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE);
CREATE TABLE public.approval_requests(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,reviewed_by uuid REFERENCES public.profiles(id));
CREATE TABLE public.employee_skills(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,verified_by uuid REFERENCES public.profiles(id));
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
INSERT INTO public.attendance VALUES ('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000004',NULL);
INSERT INTO public.payroll_entries VALUES ('00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000004');
INSERT INTO public.employee_availability VALUES ('00000000-0000-0000-0000-000000000601','00000000-0000-0000-0000-000000000004');
INSERT INTO public.approval_requests VALUES ('00000000-0000-0000-0000-000000000701','00000000-0000-0000-0000-000000000004',NULL);
INSERT INTO public.employee_skills VALUES ('00000000-0000-0000-0000-000000000801','00000000-0000-0000-0000-000000000004',NULL);

-- Synthetic FK edges sourced from current production catalog; NOT full schema parity.
CREATE TABLE public.employee_constraints (qa_id uuid PRIMARY KEY, user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE);
CREATE TABLE public.employee_grades (qa_id uuid PRIMARY KEY, user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE);
ALTER TABLE public.employee_store_priorities ADD COLUMN updated_by uuid REFERENCES public.profiles(id) ;
CREATE TABLE public.kpi_records (qa_id uuid PRIMARY KEY, evaluator_id uuid REFERENCES public.profiles(id) , user_id uuid REFERENCES public.profiles(id) );
CREATE TABLE public.notification_outbox (qa_id uuid PRIMARY KEY, actor_user_id uuid REFERENCES public.profiles(id) , recipient_user_id uuid REFERENCES public.profiles(id) );
CREATE TABLE public.procurement_audit_log (qa_id uuid PRIMARY KEY, actor_id uuid REFERENCES public.profiles(id) );
CREATE TABLE public.procurement_product_packages (qa_id uuid PRIMARY KEY, created_by uuid REFERENCES public.profiles(id) , updated_by uuid REFERENCES public.profiles(id) );
CREATE TABLE public.procurement_products (qa_id uuid PRIMARY KEY, created_by uuid REFERENCES public.profiles(id) , updated_by uuid REFERENCES public.profiles(id) );
CREATE TABLE public.procurement_purchase_order_items (qa_id uuid PRIMARY KEY, created_by uuid REFERENCES public.profiles(id) );
CREATE TABLE public.procurement_purchase_orders (qa_id uuid PRIMARY KEY, created_by uuid REFERENCES public.profiles(id) , updated_by uuid REFERENCES public.profiles(id) );
CREATE TABLE public.procurement_supplier_payments (qa_id uuid PRIMARY KEY, created_by uuid REFERENCES public.profiles(id) , updated_by uuid REFERENCES public.profiles(id) );
CREATE TABLE public.procurement_suppliers (qa_id uuid PRIMARY KEY, created_by uuid REFERENCES public.profiles(id) , updated_by uuid REFERENCES public.profiles(id) );
CREATE TABLE public.schedule_generation_runs (qa_id uuid PRIMARY KEY, created_by uuid REFERENCES public.profiles(id) , published_by uuid REFERENCES public.profiles(id) , reviewed_by uuid REFERENCES public.profiles(id) );
CREATE TABLE public.shift_gives (qa_id uuid PRIMARY KEY, giver_id uuid REFERENCES public.profiles(id) , manager_id uuid REFERENCES public.profiles(id) , recipient_id uuid REFERENCES public.profiles(id) );
CREATE TABLE public.shift_swaps (qa_id uuid PRIMARY KEY, approver_id uuid REFERENCES public.profiles(id) , requester_id uuid REFERENCES public.profiles(id) , target_user_id uuid REFERENCES public.profiles(id) );
CREATE TABLE public.staffing_requirements (qa_id uuid PRIMARY KEY, confirmed_by uuid REFERENCES public.profiles(id) , created_by uuid REFERENCES public.profiles(id) );
CREATE TABLE public.store_transfer_requests (qa_id uuid PRIMARY KEY, requester_id uuid REFERENCES public.profiles(id) , reviewed_by uuid REFERENCES public.profiles(id) );
ALTER TABLE public.work_schedules ADD COLUMN approver_id uuid REFERENCES public.profiles(id) ;
CREATE TABLE public.workforce_recurring_staffing_requirements (qa_id uuid PRIMARY KEY, created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL, updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL);

-- #487: disposable four-store fixture. Only GitHub Actions ephemeral PostgreSQL.
ALTER TABLE public.profiles ADD COLUMN full_name text;
ALTER TABLE public.profiles ADD COLUMN username text;
UPDATE public.profiles SET full_name='QA '||id::text, username='qa-'||right(id::text,4);
INSERT INTO public.profiles(id,role,status,full_name,username) VALUES
('90000000-0000-4000-8000-000000000005','OWNER','ACTIVE','QA Owner','qa-owner'),
('90000000-0000-4000-8000-000000000006','STORE_MANAGER','ACTIVE','QA Manager CN2','qa-manager2');
CREATE TABLE public.stores(id uuid PRIMARY KEY,code text NOT NULL,name text NOT NULL,status text NOT NULL);
INSERT INTO public.stores VALUES
('91000000-0000-4000-8000-000000000001','CN1','Chi nhánh QA CN1','ACTIVE'),
('91000000-0000-4000-8000-000000000002','CN2','Chi nhánh QA CN2','ACTIVE'),
('91000000-0000-4000-8000-000000000003','CN3','Chi nhánh QA CN3','ACTIVE'),
('91000000-0000-4000-8000-000000000004','CN4','Chi nhánh QA CN4','ACTIVE');
CREATE TABLE public.qa_manager_access(user_id uuid NOT NULL,store_id uuid NOT NULL);
INSERT INTO public.qa_manager_access VALUES
('90000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001'),
('90000000-0000-4000-8000-000000000006','91000000-0000-4000-8000-000000000002');
CREATE TABLE public.employee_store_priorities(employee_id uuid NOT NULL,store_id uuid NOT NULL);
INSERT INTO public.employee_store_priorities VALUES
('90000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000001'),
('90000000-0000-4000-8000-000000000003','91000000-0000-4000-8000-000000000002');
CREATE TABLE public.work_schedules (
 id uuid PRIMARY KEY, work_date date NOT NULL,start_time time NOT NULL,end_time time NOT NULL,
 store_id uuid NOT NULL REFERENCES public.stores(id),user_id uuid NOT NULL REFERENCES public.profiles(id),
 status text NOT NULL,origin text NOT NULL
);
CREATE OR REPLACE FUNCTION public.current_user_role() RETURNS text
LANGUAGE sql STABLE SET search_path='' AS $qa$
 SELECT p.role FROM public.profiles p WHERE p.id=auth.uid()
$qa$;
CREATE OR REPLACE FUNCTION public.can_access_store(p_store_id uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path='' AS $qa$
 SELECT CASE
 WHEN (SELECT role FROM public.profiles WHERE id=auth.uid() AND status='ACTIVE')='OWNER'
 THEN EXISTS(SELECT 1 FROM public.stores s WHERE s.id=p_store_id AND s.status='ACTIVE')
 ELSE EXISTS(SELECT 1 FROM public.qa_manager_access a
   JOIN public.stores s ON s.id=a.store_id AND s.status='ACTIVE'
   WHERE a.user_id=auth.uid() AND a.store_id=p_store_id)
 END
$qa$;
-- Synthetic approved rows seeded by SQL fixture, NOT a test of Manager publish.
INSERT INTO public.work_schedules
SELECT '92000000-0000-4000-8000-000000000001'::uuid,
       ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
         -(extract(isodow from (now() AT TIME ZONE 'Asia/Ho_Chi_Minh'))::integer-1)+7),
       '06:00'::time,'10:00'::time,
       '91000000-0000-4000-8000-000000000001'::uuid,'90000000-0000-4000-8000-000000000002'::uuid,
       'APPROVED','MANAGER_ASSIGNED'
UNION ALL
SELECT '92000000-0000-4000-8000-000000000002'::uuid,
       ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
         -(extract(isodow from (now() AT TIME ZONE 'Asia/Ho_Chi_Minh'))::integer-1)+8),
       '10:00'::time,'14:00'::time,
       '91000000-0000-4000-8000-000000000002'::uuid,'90000000-0000-4000-8000-000000000003'::uuid,
       'APPROVED','MANAGER_ASSIGNED';
REVOKE ALL ON public.work_schedules,public.stores,public.qa_manager_access,public.employee_store_priorities FROM PUBLIC,anon,authenticated;

-- The following three functions are copied from hosted pg_get_functiondef on 2026-10-23
-- (read-only introspection; no production DML).
CREATE OR REPLACE FUNCTION public.get_manager_weekly_availability(p_store_id uuid DEFAULT NULL::uuid, p_week_start date DEFAULT NULL::date)
 RETURNS TABLE(availability_id uuid, work_date date, start_time time without time zone, end_time time without time zone, user_id uuid, employee_name text, username text, preferred_store_id uuid, preferred_store_code text, preferred_store_name text, availability_type text, note text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_role text := upper(coalesce(public.current_user_role(),''));
  v_week_start date := coalesce(
    p_week_start,
    ((now() at time zone 'Asia/Ho_Chi_Minh')::date
      - (extract(isodow from (now() at time zone 'Asia/Ho_Chi_Minh')::date)::integer - 1))
  );
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(
    select 1 from public.profiles p
    where p.id=auth.uid()
      and p.status='ACTIVE'
      and upper(coalesce(p.role,''))=v_role
  ) then raise exception 'ACTOR_NOT_ACTIVE'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if extract(isodow from v_week_start)<>1 then raise exception 'WEEK_START_MUST_BE_MONDAY'; end if;

  if p_store_id is not null and not public.can_access_store(p_store_id) then
    raise exception 'STORE_NOT_ALLOWED';
  end if;

  if v_role='STORE_MANAGER'
     and p_store_id is null
     and exists(
       select 1 from public.stores s
       where s.status='ACTIVE' and not public.can_access_store(s.id)
     ) then
    raise exception 'STORE_REQUIRED_FOR_MANAGER';
  end if;

  return query
  select
    ea.id,
    ea.work_date,
    ea.start_time,
    ea.end_time,
    ea.user_id,
    coalesce(p.full_name,p.username),
    p.username,
    null::uuid,
    null::text,
    null::text,
    ea.availability_type,
    ea.note
  from public.employee_availability ea
  join public.profiles p on p.id=ea.user_id
  where ea.work_date between v_week_start and v_week_start+6
    and p.status='ACTIVE'
    and upper(coalesce(p.role,'')) in ('STAFF','EMPLOYEE')
    and (
      p_store_id is null
      or exists(
        select 1
        from public.employee_store_priorities esp
        where esp.employee_id=ea.user_id
          and esp.store_id=p_store_id
      )
    )
  order by ea.work_date,ea.start_time,ea.end_time,coalesce(p.full_name,p.username),ea.id;
end;
$function$

CREATE OR REPLACE FUNCTION public.get_manager_weekly_schedule(p_store_id uuid DEFAULT NULL::uuid, p_week_start date DEFAULT NULL::date)
 RETURNS TABLE(schedule_id uuid, work_date date, start_time time without time zone, end_time time without time zone, store_id uuid, store_code text, store_name text, user_id uuid, employee_name text, status text, origin text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_role text := upper(coalesce(public.current_user_role(),''));
  v_week_start date := coalesce(
    p_week_start,
    ((now() at time zone 'Asia/Ho_Chi_Minh')::date
      - (extract(isodow from (now() at time zone 'Asia/Ho_Chi_Minh')::date)::integer - 1))
  );
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(
    select 1 from public.profiles p
    where p.id=auth.uid() and p.status='ACTIVE'
      and upper(coalesce(p.role,''))=v_role
  ) then raise exception 'ACTOR_NOT_ACTIVE'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if extract(isodow from v_week_start)<>1 then raise exception 'WEEK_START_MUST_BE_MONDAY'; end if;
  if v_role='STORE_MANAGER' and p_store_id is null then raise exception 'STORE_REQUIRED_FOR_MANAGER'; end if;
  if p_store_id is not null and not public.can_access_store(p_store_id) then raise exception 'STORE_NOT_ALLOWED'; end if;

  return query
  select ws.id,ws.work_date,ws.start_time,ws.end_time,ws.store_id,
         s.code,s.name,ws.user_id,p.full_name,ws.status,ws.origin
  from public.work_schedules ws
  join public.stores s on s.id=ws.store_id
  join public.profiles p on p.id=ws.user_id
  where ws.status='APPROVED'
    and ws.work_date between v_week_start and v_week_start+6
    and public.can_access_store(ws.store_id)
    and (p_store_id is null or ws.store_id=p_store_id)
  order by ws.work_date,ws.start_time,ws.end_time,s.code,p.full_name,ws.id;
end;
$function$

CREATE OR REPLACE FUNCTION public.list_my_approved_schedules_v2(p_week_start date DEFAULT NULL::date)
 RETURNS TABLE(schedule_id uuid, work_date date, start_time time without time zone, end_time time without time zone, store_id uuid, store_code text, store_name text, status text, origin text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_week_start date := coalesce(
    p_week_start,
    ((now() at time zone 'Asia/Ho_Chi_Minh')::date
      - (extract(isodow from (now() at time zone 'Asia/Ho_Chi_Minh')::date)::integer - 1))
  );
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(
    select 1 from public.profiles p
    where p.id=auth.uid() and p.status='ACTIVE'
      and upper(coalesce(p.role,'')) in ('STAFF','EMPLOYEE')
  ) then raise exception 'EMPLOYEE_NOT_ACTIVE'; end if;
  if extract(isodow from v_week_start)<>1 then raise exception 'WEEK_START_MUST_BE_MONDAY'; end if;

  return query
  select ws.id,ws.work_date,ws.start_time,ws.end_time,
         ws.store_id,s.code,s.name,ws.status,ws.origin
  from public.work_schedules ws
  join public.stores s on s.id=ws.store_id
  where ws.user_id=auth.uid()
    and ws.status='APPROVED'
    and ws.work_date between v_week_start and v_week_start+6
  order by ws.work_date,ws.start_time,ws.end_time,ws.id;
end;
$function$

REVOKE ALL ON FUNCTION public.get_manager_weekly_availability(uuid,date) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_manager_weekly_schedule(uuid,date) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.list_my_approved_schedules_v2(date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_manager_weekly_availability(uuid,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_manager_weekly_schedule(uuid,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_approved_schedules_v2(date) TO authenticated;
DO $qa$ BEGIN
 IF has_table_privilege('authenticated','public.work_schedules','SELECT') OR
    has_table_privilege('authenticated','public.work_schedules','INSERT') OR
    has_table_privilege('authenticated','public.work_schedules','UPDATE') THEN
   RAISE EXCEPTION 'QA_PUBLIC_SCHEDULE_TABLE_LEAK';
 END IF;
END $qa$;

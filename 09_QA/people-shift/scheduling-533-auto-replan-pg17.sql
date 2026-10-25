-- #533 P0: Synthetic, ephemeral PostgreSQL 17 test ONLY. No production credentials.
create extension if not exists pgcrypto;
create schema if not exists auth;
do $roles$
begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
end $roles$;

create table public.profiles(id uuid primary key,status text,role text);
create table public.stores(id uuid primary key, status text);
create table public.employee_store_priorities(employee_id uuid,store_id uuid,priority int);
create table public.employee_employment_types_v1(employee_id uuid primary key,employment_type text);
create table public.employee_availability(user_id uuid,work_date date,availability_type text,start_time time,end_time time);
create table public.schedule_generation_runs(
 id uuid primary key,store_id uuid,week_start date,week_end date,status text,
 total_hours numeric default 0,updated_at timestamptz default now()
);
create table public.schedule_generation_assignments(
 id uuid primary key default gen_random_uuid(),generation_id uuid,user_id uuid,
 store_id uuid,work_date date,start_time time,end_time time,skill_code text,
 skill_level int,score numeric,warning text,status text,note text
);
create table public.work_schedules(user_id uuid,store_id uuid,work_date date,start_time time,end_time time,status text);
create function auth.uid() returns uuid language sql stable as $body$
 select nullif(current_setting('qa.actor_id',true),'')::uuid
$body$;
create function public.current_user_role() returns text language sql stable as $body$
 select current_setting('qa.actor_role',true)
$body$;
create function public.can_access_store(uuid) returns boolean language sql stable as $body$
 select current_setting('qa.store_allowed',true)='yes'
$body$;
create function public.validate_schedule_generation_v1(uuid) returns jsonb language sql stable as $body$
 select '{"valid":true,"violations":[],"warnings":[]}'::jsonb
$body$;

-- Versioned-only installation: never replace #532 or V1.
\i supabase/migrations/20261025132500_workforce_533_v2_confirmed_auto_replan.sql

begin;
select set_config('qa.actor_id','11111111-1111-1111-1111-111111111111',true);
select set_config('qa.actor_role','OWNER',true);
select set_config('qa.store_allowed','yes',true);
insert into public.profiles values
 ('11111111-1111-1111-1111-111111111111','ACTIVE','OWNER'),
 ('22222222-2222-2222-2222-222222222222','ACTIVE','STAFF'),
 ('33333333-3333-3333-3333-333333333333','ACTIVE','STAFF');
insert into public.stores values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','ACTIVE');
insert into public.employee_store_priorities values
 ('22222222-2222-2222-2222-222222222222','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',1);
insert into public.employee_employment_types_v1 values
 ('22222222-2222-2222-2222-222222222222','FULL_TIME');
insert into public.employee_availability values
 ('22222222-2222-2222-2222-222222222222','2026-10-26','AVAILABLE','06:00','14:00');
insert into public.schedule_generation_runs(id,store_id,week_start,week_end,status) values
 ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '2026-10-26','2026-11-01','DRAFT');
insert into public.schedule_generation_assignments(
 id,generation_id,user_id,store_id,work_date,start_time,end_time,skill_level,score,status,note
) values
 ('cccccccc-cccc-cccc-cccc-cccccccccccc','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '22222222-2222-2222-2222-222222222222','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '2026-10-26','06:00','10:00',0,0,'DRAFT','V2_STORE_SCOPED_PROPOSAL'),
 ('dddddddd-dddd-dddd-dddd-dddddddddddd','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '33333333-3333-3333-3333-333333333333','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '2026-10-26','16:00','18:00',0,0,'DRAFT','MANAGER_DIRECT_FROM_AVAILABILITY');

do $test$
declare
 x jsonb; expected jsonb; res jsonb;
 begin
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',a.id::text,'user_id',a.user_id::text,'store_id',a.store_id::text,
  'work_date',a.work_date::text,'start_time',to_char(a.start_time,'HH24:MI'),
  'end_time',to_char(a.end_time,'HH24:MI'),'note',coalesce(a.note,''),'status',a.status
 ) order by a.id::text),'[]'::jsonb) into expected
 from public.schedule_generation_assignments a
 where a.generation_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
 begin
  perform public.apply_schedule_v2_auto_proposals_533(
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',expected,
   array['cccccccc-cccc-cccc-cccc-cccccccccccc']::uuid[],'[]'::jsonb,false);
  raise exception 'UNCONFIRMED_REPLAN_WAS_ALLOWED';
 exception when others then
  if sqlerrm<>'CONFIRMATION_REQUIRED' then raise; end if;
 end;
 begin
  perform public.apply_schedule_v2_auto_proposals_533(
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',expected,
   array['dddddddd-dddd-dddd-dddd-dddddddddddd']::uuid[],'[]'::jsonb,true);
  raise exception 'MANUAL_DELETE_WAS_ALLOWED';
 exception when others then
  if sqlerrm<>'AUTO_ORIGIN_RECHECK_FAILED' then raise; end if;
 end;
 begin
  perform public.apply_schedule_v2_auto_proposals_533(
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','[]'::jsonb,
   array[]::uuid[],'[]'::jsonb,true);
  raise exception 'STALE_FINGERPRINT_WAS_ALLOWED';
 exception when others then
  if sqlerrm<>'DRAFT_CHANGED_BEFORE_SAVE' then raise; end if;
 end;
 perform set_config('qa.actor_role','STAFF',true);
 begin
  perform public.apply_schedule_v2_auto_proposals_533(
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',expected,
   array[]::uuid[],'[]'::jsonb,true);
  raise exception 'STAFF_WRITE_WAS_ALLOWED';
 exception when others then
  if sqlerrm<>'ROLE_NOT_ALLOWED' then raise; end if;
 end;
 perform set_config('qa.actor_role','OWNER',true);
 res:=public.apply_schedule_v2_auto_proposals_533(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',expected,
  array['cccccccc-cccc-cccc-cccc-cccccccccccc']::uuid[],
  jsonb_build_array(jsonb_build_object(
   'user_id','22222222-2222-2222-2222-222222222222',
   'store_id','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'work_date','2026-10-26','start_time','06:00','end_time','14:00',
   'note','V2_STORE_SCOPED_PROPOSAL')),true);
 if res->>'saved'<>'true' or (res->>'removed')::int<>1 or (res->>'added')::int<>1 then
  raise exception 'FT8_REPLAN_FAILED: %',res;
 end if;
 if not exists(select 1 from public.schedule_generation_assignments
  where id='dddddddd-dddd-dddd-dddd-dddddddddddd'
    and note='MANAGER_DIRECT_FROM_AVAILABILITY') then
  raise exception 'MANAGER_SHIFT_WAS_CHANGED';
 end if;
 if exists(select 1 from public.schedule_generation_assignments
  where id='cccccccc-cccc-cccc-cccc-cccccccccccc') then
  raise exception 'OLD_V2_AUTOMATION_STILL_PRESENT';
 end if;
 if not exists(select 1 from public.schedule_generation_assignments
  where user_id='22222222-2222-2222-2222-222222222222'
   and start_time='06:00' and end_time='14:00') then
  raise exception 'CONTIGUOUS_FT8_MISSING';
 end if;
 update public.schedule_generation_runs set status='PUBLISHED'
 where id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
 begin
  perform public.apply_schedule_v2_auto_proposals_533(
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','[]'::jsonb,
   array[]::uuid[],'[]'::jsonb,true);
  raise exception 'PUBLISHED_GENERATION_WAS_EDITABLE';
 exception when others then
  if sqlerrm<>'GENERATION_NOT_DRAFT' then raise; end if;
 end;
 raise notice 'SCHEDULING_533_PG17_CONFIRMATION_FT8_MANUAL_ROLE_PUBLISHED_GATES=PASS';
end $test$;
rollback;

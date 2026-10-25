-- #533: global four-store bridge suite, after scheduling-533-auto-replan-pg17.sql.
-- All test rows are synthetic. Every schedule write is rolled back.
create table public.qa_global_calls(version text);
create or replace function public.auto_generate_cross_store_schedule_529_core(
 p_week_start date,p_replace_existing boolean default false,p_algorithm_version text default 'QA'
) returns jsonb language plpgsql as $body$
begin
 if p_replace_existing is not true then raise exception 'QA_GLOBAL_REPLACE_REQUIRED'; end if;
 insert into public.qa_global_calls values(p_algorithm_version);
 return jsonb_build_object('assignment_count',2,'shortages','[]'::jsonb,'published',false);
end $body$;
\i supabase/migrations/20261025144500_workforce_533_global_atomic_bridge.sql

begin;
select set_config('qa.actor_id','11111111-1111-1111-1111-111111111111',true);
select set_config('qa.actor_role','OWNER',true);
select set_config('qa.store_allowed','yes',true);
insert into public.profiles values
 ('11111111-1111-1111-1111-111111111111','ACTIVE','OWNER'),
 ('22222222-2222-2222-2222-222222222222','ACTIVE','STAFF'),
 ('33333333-3333-3333-3333-333333333333','ACTIVE','STAFF');
insert into public.stores(id,status) values
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1','ACTIVE'),
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2','ACTIVE'),
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3','ACTIVE'),
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4','ACTIVE');
insert into public.schedule_generation_runs(id,store_id,week_start,week_end,status)
select ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb'||n)::uuid,
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa'||n)::uuid,
 '2026-10-26'::date,'2026-11-01'::date,'DRAFT'
from generate_series(1,4) as n;
insert into public.schedule_generation_assignments(
 id,generation_id,user_id,store_id,work_date,start_time,end_time,skill_level,score,status,note)
values
 ('cccccccc-cccc-cccc-cccc-ccccccccccc1','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
 '22222222-2222-2222-2222-222222222222','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
 '2026-10-26','06:00','10:00',0,0,'DRAFT','V2_STORE_SCOPED_PROPOSAL'),
 ('dddddddd-dddd-dddd-dddd-ddddddddddd2','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
 '33333333-3333-3333-3333-333333333333','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
 '2026-10-26','12:00','17:00',0,0,'DRAFT','MANAGER_DIRECT_FROM_AVAILABILITY');

do $test$
declare
 s jsonb;result jsonb;
begin
 s:=public.get_workforce_global_week_snapshot_533('2026-10-26');
 if s->>'revision'<>'533_GLOBAL_FT8'
    or (s->>'active_store_count')::int<>4
    or (s->>'v2_auto_draft_count')::int<>1
    or (s->>'manual_or_unclassified_count')::int<>1 then
  raise exception 'BAD_GLOBAL_SNAPSHOT: %',s;
 end if;
 begin
  perform public.auto_generate_cross_store_schedule_533('2026-10-26',s->>'fingerprint',false);
  raise exception 'UNCONFIRMED_GLOBAL_WRITE_ALLOWED';
 exception when others then
  if sqlerrm<>'CONFIRMATION_REQUIRED' then raise; end if;
 end;
 begin
  perform public.auto_generate_cross_store_schedule_533('2026-10-26',md5('outdated'),true);
  raise exception 'STALE_GLOBAL_WRITE_ALLOWED';
 exception when others then
  if sqlerrm<>'DRAFT_CHANGED_BEFORE_SAVE' then raise; end if;
 end;
 perform set_config('qa.actor_role','STAFF',true);
 begin
  perform public.auto_generate_cross_store_schedule_533('2026-10-26',s->>'fingerprint',true);
  raise exception 'STAFF_GLOBAL_WRITE_ALLOWED';
 exception when others then
  if sqlerrm<>'ROLE_NOT_ALLOWED' then raise; end if;
 end;
 perform set_config('qa.actor_role','OWNER',true);
 perform set_config('qa.store_allowed','no',true);
 begin
  perform public.auto_generate_cross_store_schedule_533('2026-10-26',s->>'fingerprint',true);
  raise exception 'PARTIAL_STORE_SCOPE_ALLOWED';
 exception when others then
  if sqlerrm<>'GLOBAL_FOUR_STORE_SCOPE_REQUIRED' then raise; end if;
 end;
 perform set_config('qa.store_allowed','yes',true);
 result:=public.auto_generate_cross_store_schedule_533('2026-10-26',s->>'fingerprint',true);
 if result->>'revision'<>'533_GLOBAL_FT8'
  or result->>'published'<>'false'
  or (result->>'v2_auto_replaced')::int<>1 then
  raise exception 'GLOBAL_ATOMIC_REPLAN_RESULT_BAD: %',result;
 end if;
 if (select count(*) from public.qa_global_calls)<>1 then
  raise exception 'SINGLE_ENGINE_WAS_NOT_CALLED_EXACTLY_ONCE';
 end if;
 if exists(select 1 from public.schedule_generation_assignments
    where id='cccccccc-cccc-cccc-cccc-ccccccccccc1') then
  raise exception 'V2_AUTO_ROW_NOT_REPLACED';
 end if;
 if not exists(select 1 from public.schedule_generation_assignments
    where id='dddddddd-dddd-dddd-dddd-ddddddddddd2'
      and note='MANAGER_DIRECT_FROM_AVAILABILITY') then
  raise exception 'GLOBAL_REPLAN_CHANGED_MANUAL_ROW';
 end if;
 update public.schedule_generation_runs set status='REVIEWED'
 where id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2';
 s:=public.get_workforce_global_week_snapshot_533('2026-10-26');
 begin
  perform public.auto_generate_cross_store_schedule_533('2026-10-26',s->>'fingerprint',true);
  raise exception 'REVIEWED_GLOBAL_WEEK_WAS_WRITABLE';
 exception when others then
  if sqlerrm<>'PUBLISHED_OR_REVIEWED_WEEK_LOCKED' then raise; end if;
 end;
 raise notice 'SCHEDULING_533_GLOBAL_FOUR_STORE_FINGERPRINT_ROLES_MANUAL=PASS';
end $test$;
rollback;

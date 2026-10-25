-- #533 P0: Use one global four-store decision engine for all auto-schedule entry points.
-- Versioned wrapper uses existing guarded #529 engine INSIDE the same transaction.
-- This migration creates functions only; it never schedules or deletes employee shifts.
create or replace function public.get_workforce_global_week_snapshot_533(p_week_start date)
returns jsonb language plpgsql stable security definer set search_path=public
as $body$
declare
 v_role text:=upper(coalesce(public.current_user_role(),''));
 v_all integer;
 v_visible integer;
 v_digest text;
 v_v2_auto integer;
 v_manual integer;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
 if not exists(select 1 from public.profiles p where p.id=auth.uid()
   and p.status='ACTIVE' and upper(p.role)=v_role)
 then raise exception 'ACTOR_NOT_ACTIVE'; end if;
 if p_week_start is null or extract(isodow from p_week_start)<>1
 then raise exception 'WEEK_START_MUST_BE_MONDAY'; end if;

 select count(*),count(*) filter(where public.can_access_store(id))
 into v_all,v_visible from public.stores where status='ACTIVE';
 if v_all<>4 or v_visible<>v_all then
  raise exception 'GLOBAL_FOUR_STORE_SCOPE_REQUIRED';
 end if;

 select md5(coalesce(string_agg(concat_ws('|',
   g.id::text,g.store_id::text,g.status,g.updated_at::text,
   coalesce(a.id::text,''),
   coalesce(a.user_id::text,''),coalesce(a.work_date::text,''),
   coalesce(a.start_time::text,''),coalesce(a.end_time::text,''),
   coalesce(a.note,''),coalesce(a.status,'')),
   chr(10) order by g.store_id,g.id,a.id),'')),
  count(a.id) filter (where a.note='V2_STORE_SCOPED_PROPOSAL'),
  count(a.id) filter (where a.note is distinct from 'V2_STORE_SCOPED_PROPOSAL'
    and a.note is distinct from 'AUTO_XSTORE_INTERVAL_COMPOSED_V1'
    and a.note is distinct from 'AUTO_XSTORE_FT8_529_V1')
 into v_digest,v_v2_auto,v_manual
 from public.schedule_generation_runs g
 left join public.schedule_generation_assignments a on a.generation_id=g.id
 where g.week_start=p_week_start
   and g.status in ('DRAFT','REVIEWED')
   and public.can_access_store(g.store_id);

 return jsonb_build_object(
  'revision','533_GLOBAL_FT8',
  'week_start',p_week_start,
  'active_store_count',v_all,
  'fingerprint',v_digest,
  'v2_auto_draft_count',v_v2_auto,
  'manual_or_unclassified_count',v_manual,
  'is_draft_only',not exists(select 1 from public.schedule_generation_runs g
     where g.week_start=p_week_start and g.status in ('REVIEWED','PUBLISHED')),
  'official_exists',exists(select 1 from public.work_schedules w
     where w.work_date between p_week_start and p_week_start+6
       and w.status in ('PENDING','APPROVED'))
 );
end $body$;

revoke all on function public.get_workforce_global_week_snapshot_533(date) from public,anon;
grant execute on function public.get_workforce_global_week_snapshot_533(date) to authenticated;

create or replace function public.auto_generate_cross_store_schedule_533(
 p_week_start date,p_expected_fingerprint text,p_confirmed boolean)
returns jsonb language plpgsql security definer set search_path=public
as $body$
declare
 v_snapshot jsonb;
 v_deleted integer;
 v_generation record;
 v_assignment record;
 v_result jsonb;
begin
 if p_confirmed is distinct from true then raise exception 'CONFIRMATION_REQUIRED'; end if;
 if p_expected_fingerprint is null or length(p_expected_fingerprint)<>32 then
   raise exception 'EXPECTED_DRAFT_FINGERPRINT_REQUIRED';
 end if;

 -- Snapshot RPC authorizes the actor, ensures Owner/Manager ACTIVE, and verifies
 -- visibility of ALL FOUR active stores. Never mutate a partial-store week.
 v_snapshot:=public.get_workforce_global_week_snapshot_533(p_week_start);
 perform pg_advisory_xact_lock(hashtextextended('workforce_cross_store:'||p_week_start::text,0));

 -- Lock generations and their assignments before the final optimistic check.
 for v_generation in
  select g.id from public.schedule_generation_runs g
  where g.week_start=p_week_start and g.status in ('DRAFT','REVIEWED')
  order by g.id for update
 loop
  for v_assignment in
   select a.id from public.schedule_generation_assignments a
   where a.generation_id=v_generation.id order by a.id for update
  loop null; end loop;
 end loop;

 v_snapshot:=public.get_workforce_global_week_snapshot_533(p_week_start);
 if v_snapshot->>'fingerprint'<>p_expected_fingerprint then
   raise exception 'DRAFT_CHANGED_BEFORE_SAVE';
 end if;
 if coalesce((v_snapshot->>'is_draft_only')::boolean,false) is not true
    or coalesce((v_snapshot->>'official_exists')::boolean,false) is true then
   raise exception 'PUBLISHED_OR_REVIEWED_WEEK_LOCKED';
 end if;

 -- Only the explicitly tagged V2-generated drafts may be replaced. Unknown
 -- and Manager-edited rows are immutable. The #529 core will safely replan
 -- other known #529 auto drafts and preserve manual/official shifts.
 delete from public.schedule_generation_assignments a
 using public.schedule_generation_runs g
 where g.id=a.generation_id and g.week_start=p_week_start
   and g.status='DRAFT' and public.can_access_store(g.store_id)
   and a.note='V2_STORE_SCOPED_PROPOSAL';
 get diagnostics v_deleted=row_count;

 -- This is the ONLY scheduling decision engine called by the new global action.
 -- Its FT8 and interval passes operate across all stores under the same week lock.
 v_result:=public.auto_generate_cross_store_schedule_529_core(
    p_week_start,true,'XSTORE_GLOBAL_FT8_533');
 return v_result || jsonb_build_object(
   'revision','533_GLOBAL_FT8','v2_auto_replaced',v_deleted,
   'published',false,'confirmation_recorded',true);
end $body$;

revoke all on function public.auto_generate_cross_store_schedule_533(date,text,boolean) from public,anon;
grant execute on function public.auto_generate_cross_store_schedule_533(date,text,boolean) to authenticated;

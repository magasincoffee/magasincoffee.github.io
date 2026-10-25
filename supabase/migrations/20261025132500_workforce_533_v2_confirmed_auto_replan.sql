-- #533 P0: Atomic, confirmed re-planning of tagged Scheduling V2 AUTO DRAFT rows.
-- Re-plan must be able to replace an otherwise-valid short auto shift with an eligible FT8 shift.
-- Manual/unknown-origin/REVIEWED/PUBLISHED rows retain their original identity.
-- Explicit Manager confirmation, exact full-draft fingerprint, week lock, and server validation remain mandatory.
-- Versioned alongside #532. Never replace legacy V1 or mutate roster during migration.
create or replace function public.apply_schedule_v2_auto_proposals_533(
  p_generation_id uuid,
  p_expected_rows jsonb,
  p_obsolete_ids uuid[],
  p_additions jsonb,
  p_confirmed boolean
) returns jsonb
language plpgsql security definer set search_path=public
as $body$
declare
  v_role text:=upper(coalesce(public.current_user_role(),''));
  v_run public.schedule_generation_runs%rowtype;
  v_actual jsonb:='[]'::jsonb;
  v_id uuid;
  v_item jsonb;
  v_user uuid;
  v_store uuid;
  v_date date;
  v_start time;
  v_end time;
  v_note text;
  v_removed integer:=0;
  v_added integer:=0;
  v_check jsonb;
  v_daily_count integer;
  v_daily_hours numeric;
  v_weekly_hours numeric;
  v_shift_hours numeric;
  v_max_daily_hours numeric;
  v_max_weekly_hours numeric;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if not exists(select 1 from public.profiles p
    where p.id=auth.uid() and p.status='ACTIVE' and upper(p.role)=v_role)
  then raise exception 'ACTOR_NOT_ACTIVE'; end if;
  if p_confirmed is distinct from true then raise exception 'CONFIRMATION_REQUIRED'; end if;
  if p_generation_id is null
     or jsonb_typeof(p_expected_rows) is distinct from 'array'
     or jsonb_typeof(p_additions) is distinct from 'array'
     or p_obsolete_ids is null then
    raise exception 'PROPOSAL_DELTA_INVALID';
  end if;
  if cardinality(p_obsolete_ids)<>(
       select count(distinct id) from unnest(p_obsolete_ids) as t(id)
     ) or array_position(p_obsolete_ids,null) is not null then
    raise exception 'PROPOSAL_DELTA_IDS_INVALID';
  end if;

  select * into v_run from public.schedule_generation_runs
  where id=p_generation_id for update;
  if not found then raise exception 'GENERATION_NOT_FOUND'; end if;
  if v_run.status<>'DRAFT' then raise exception 'GENERATION_NOT_DRAFT'; end if;
  if not coalesce(public.can_access_store(v_run.store_id),false) then
    raise exception 'STORE_NOT_ALLOWED'; end if;
  if not exists(select 1 from public.stores s where s.id=v_run.store_id and s.status='ACTIVE') then
    raise exception 'STORE_NOT_ACTIVE'; end if;
  if exists(select 1 from public.work_schedules w
    where w.store_id=v_run.store_id and w.work_date between v_run.week_start and v_run.week_end
      and w.status in ('PENDING','APPROVED')) then
    raise exception 'OFFICIAL_WEEK_ALREADY_EXISTS';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('workforce_cross_store:'||v_run.week_start::text,0));

  -- Full source fingerprint, not just the rows being removed.
  -- Both SQL and client use lexicographic ID order and HH:MI wall clock.
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',a.id::text,'user_id',a.user_id::text,'store_id',a.store_id::text,
    'work_date',a.work_date::text,
    'start_time',to_char(a.start_time,'HH24:MI'),
    'end_time',to_char(a.end_time,'HH24:MI'),
    'note',coalesce(a.note,''),'status',a.status
  ) order by a.id::text),'[]'::jsonb)
  into v_actual
  from public.schedule_generation_assignments a
  where a.generation_id=p_generation_id;
  if v_actual<>p_expected_rows then raise exception 'DRAFT_CHANGED_BEFORE_SAVE'; end if;

  foreach v_id in array p_obsolete_ids loop
    if not exists(
      select 1 from public.schedule_generation_assignments a
      where a.generation_id=p_generation_id and a.id=v_id
        and a.note='V2_STORE_SCOPED_PROPOSAL'
    ) then raise exception 'AUTO_ORIGIN_RECHECK_FAILED'; end if;
    delete from public.schedule_generation_assignments
    where id=v_id and generation_id=p_generation_id
      and note='V2_STORE_SCOPED_PROPOSAL';
    get diagnostics v_daily_count=row_count;
    if v_daily_count<>1 then raise exception 'OBSOLETE_AUTO_SHIFT_DELETE_FAILED'; end if;
    v_removed:=v_removed+1;
  end loop;

  for v_item in select value from jsonb_array_elements(p_additions) loop
    begin
      v_user:=nullif(v_item->>'user_id','')::uuid;
      v_store:=nullif(v_item->>'store_id','')::uuid;
      v_date:=nullif(v_item->>'work_date','')::date;
      v_start:=nullif(v_item->>'start_time','')::time;
      v_end:=nullif(v_item->>'end_time','')::time;
      v_note:=v_item->>'note';
    exception when others then raise exception 'PROPOSAL_PAYLOAD_MALFORMED';
    end;
    if v_user is null or v_store is distinct from v_run.store_id
       or v_date not between v_run.week_start and v_run.week_end
       or v_start is null or v_end is null or v_end<=v_start
       or v_start<time '05:00' or v_end>time '22:00'
       or mod(extract(epoch from v_start)::integer,1800)<>0
       or mod(extract(epoch from v_end)::integer,1800)<>0
       or v_note is distinct from 'V2_STORE_SCOPED_PROPOSAL' then
      raise exception 'INVALID_AUTO_PROPOSAL';
    end if;
    if not exists(select 1 from public.profiles p
      where p.id=v_user and p.status='ACTIVE'
        and upper(p.role) in ('STAFF','EMPLOYEE')) then
      raise exception 'ASSIGNMENT_EMPLOYEE_NOT_FOUND'; end if;
    if not exists(select 1 from public.employee_employment_types_v1 et
      where et.employee_id=v_user and et.employment_type in ('FULL_TIME','PART_TIME')) then
      raise exception 'EMPLOYMENT_TYPE_REQUIRED'; end if;
    if not exists(select 1 from public.employee_store_priorities esp
      where esp.employee_id=v_user and esp.store_id=v_store) then
      raise exception 'STORE_NOT_ELIGIBLE_FOR_NEW_PROPOSAL'; end if;
    if not exists(select 1 from public.employee_availability ea
      where ea.user_id=v_user and ea.work_date=v_date
        and ea.availability_type in ('AVAILABLE','PREFERRED')
        and ea.start_time<=v_start and ea.end_time>=v_end) then
      raise exception 'AVAILABILITY_MISMATCH_FOR_NEW_PROPOSAL'; end if;

    -- #533: Apply employee_constraints to every new generated shift.
    -- Count all branches, including official hours, not merely shifts in this store.
    -- Recalculate after each insertion so consecutive additions cannot evade the cap.
    v_shift_hours:=extract(epoch from (v_end-v_start))/3600.0;
    select coalesce(ec.max_daily_hours,0),coalesce(ec.max_weekly_hours,0)
      into v_max_daily_hours,v_max_weekly_hours
    from public.employee_constraints ec
    where ec.user_id=v_user and ec.status='ACTIVE';
    if found then
      select coalesce(sum(hours),0) into v_daily_hours
      from (
        select extract(epoch from (a.end_time-a.start_time))/3600.0 as hours
        from public.schedule_generation_assignments a
        join public.schedule_generation_runs r on r.id=a.generation_id
        where a.user_id=v_user and a.work_date=v_date
          and r.status in ('DRAFT','REVIEWED')
        union all
        select extract(epoch from (w.end_time-w.start_time))/3600.0
        from public.work_schedules w
        where w.user_id=v_user and w.work_date=v_date
          and w.status in ('PENDING','APPROVED')
      ) assigned;
      select coalesce(sum(hours),0) into v_weekly_hours
      from (
        select extract(epoch from (a.end_time-a.start_time))/3600.0 as hours
        from public.schedule_generation_assignments a
        join public.schedule_generation_runs r on r.id=a.generation_id
        where a.user_id=v_user
          and a.work_date between v_run.week_start and v_run.week_end
          and r.status in ('DRAFT','REVIEWED')
        union all
        select extract(epoch from (w.end_time-w.start_time))/3600.0
        from public.work_schedules w
        where w.user_id=v_user
          and w.work_date between v_run.week_start and v_run.week_end
          and w.status in ('PENDING','APPROVED')
      ) assigned;
      if v_max_daily_hours>0 and v_daily_hours+v_shift_hours>v_max_daily_hours then
        raise exception 'DAILY_HOURS_CAP_EXCEEDED';
      end if;
      if v_max_weekly_hours>0 and v_weekly_hours+v_shift_hours>v_max_weekly_hours then
        raise exception 'WEEKLY_HOURS_CAP_EXCEEDED';
      end if;
    end if;

    if exists(
      select 1 from public.schedule_generation_assignments a
      join public.schedule_generation_runs r on r.id=a.generation_id
      where a.user_id=v_user and a.work_date=v_date
        and r.status in ('DRAFT','REVIEWED','PUBLISHED')
        and a.start_time<v_end and v_start<a.end_time
    ) or exists(select 1 from public.work_schedules w
      where w.user_id=v_user and w.work_date=v_date
        and w.status in ('PENDING','APPROVED')
        and w.start_time<v_end and v_start<w.end_time)
    then raise exception 'CROSS_STORE_SHIFT_OVERLAP'; end if;

    select (
      (select count(*) from public.schedule_generation_assignments a
       join public.schedule_generation_runs r on r.id=a.generation_id
       where a.user_id=v_user and a.work_date=v_date
         and r.status in ('DRAFT','REVIEWED','PUBLISHED'))
      + (select count(*) from public.work_schedules w
         where w.user_id=v_user and w.work_date=v_date
           and w.status in ('PENDING','APPROVED'))
    ) into v_daily_count;
    if v_daily_count>=2 then raise exception 'MAX_TWO_ASSIGNMENTS_PER_EMPLOYEE_DAY'; end if;

    insert into public.schedule_generation_assignments(
      generation_id,user_id,store_id,work_date,start_time,end_time,
      skill_code,skill_level,score,warning,status,note
    ) values (
      p_generation_id,v_user,v_store,v_date,v_start,v_end,
      null,0,coalesce(nullif(v_item->>'score','')::numeric,0),
      null,'DRAFT','V2_STORE_SCOPED_PROPOSAL'
    );
    v_added:=v_added+1;
  end loop;

  v_check:=public.validate_schedule_generation_v1(p_generation_id);
  if not coalesce((v_check->>'valid')::boolean,false) then
    raise exception 'ASSIGNMENT_VALIDATION_FAILED: %',v_check->'violations';
  end if;
  update public.schedule_generation_runs
    set total_hours=coalesce((
      select sum(extract(epoch from (a.end_time-a.start_time))/3600.0)
      from public.schedule_generation_assignments a where a.generation_id=p_generation_id
    ),0),updated_at=now()
    where id=p_generation_id and status='DRAFT';
  return jsonb_build_object('saved',true,'added',v_added,'removed',v_removed,
    'valid',true,'violations',v_check->'violations','warnings',v_check->'warnings');
end;
$body$;
revoke all on function public.apply_schedule_v2_auto_proposals_533(uuid,jsonb,uuid[],jsonb,boolean) from public,anon;
grant execute on function public.apply_schedule_v2_auto_proposals_533(uuid,jsonb,uuid[],jsonb,boolean) to authenticated;

-- TASK-097 — Give Lifecycle Reconciliation + Hardening
-- Keep existing semantic-compatible storage:
--   PENDING_RECIPIENT = OFFERED / waiting recipient
--   PENDING_MANAGER   = recipient accepted / waiting Manager
--   APPROVED          = Manager approved + ownership transfer APPLIED atomically
--   REJECTED_RECIPIENT / REJECTED_MANAGER remain terminal.
-- CANCELLED / EXPIRED remain Owner-undefined and are not invented here.
-- No historical rewrite or destructive cleanup.

create or replace function public.validate_shift_give_v1(
  p_schedule_id uuid,
  p_recipient_user_id uuid,
  p_giver_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_schedule public.work_schedules%rowtype;
  v_violations jsonb := '[]'::jsonb;
  v_daily numeric := 0;
  v_weekly numeric := 0;
  v_daily_cap numeric := 0;
  v_weekly_cap numeric := 0;
  v_week_start date;
  v_recipient_count integer := 0;
begin
  select * into v_schedule
  from public.work_schedules
  where id=p_schedule_id;

  if v_schedule.id is null then
    v_violations:=v_violations||jsonb_build_object('code','SCHEDULE_NOT_FOUND');
    return jsonb_build_object(
      'valid',false,
      'violations',v_violations,
      'violation_count',jsonb_array_length(v_violations)
    );
  end if;

  if v_schedule.user_id<>p_giver_user_id then
    v_violations:=v_violations||jsonb_build_object('code','GIVER_SCHEDULE_NOT_OWNED');
  end if;
  if v_schedule.status<>'APPROVED' then
    v_violations:=v_violations||jsonb_build_object('code','SCHEDULE_NOT_APPROVED');
  end if;
  if p_recipient_user_id=p_giver_user_id then
    v_violations:=v_violations||jsonb_build_object('code','SAME_EMPLOYEE_GIVE');
  end if;

  if not exists(
    select 1 from public.profiles
    where id=p_giver_user_id and status='ACTIVE'
  ) then
    v_violations:=v_violations||jsonb_build_object('code','GIVER_INACTIVE');
  end if;
  if not exists(
    select 1 from public.profiles
    where id=p_giver_user_id and role='STAFF'
  ) then
    v_violations:=v_violations||jsonb_build_object('code','GIVER_NOT_STAFF');
  end if;
  if not exists(
    select 1 from public.profiles
    where id=p_recipient_user_id and status='ACTIVE'
  ) then
    v_violations:=v_violations||jsonb_build_object('code','RECIPIENT_INACTIVE');
  end if;
  if not exists(
    select 1 from public.profiles
    where id=p_recipient_user_id and role='STAFF'
  ) then
    v_violations:=v_violations||jsonb_build_object('code','RECIPIENT_NOT_STAFF');
  end if;

  if exists(
    select 1 from public.attendance a
    where a.schedule_id=v_schedule.id
      and a.status not in('DELETED','DELETED_BY_MANAGER')
  ) then
    v_violations:=v_violations||jsonb_build_object('code','ATTENDANCE_ALREADY_EXISTS');
  end if;

  if not exists(
    select 1 from public.employee_availability ea
    where ea.user_id=p_recipient_user_id
      and ea.work_date=v_schedule.work_date
      and ea.availability_type in('AVAILABLE','PREFERRED')
      and ea.start_time<=v_schedule.start_time
      and ea.end_time>=v_schedule.end_time
  ) then
    v_violations:=v_violations||jsonb_build_object('code','RECIPIENT_NOT_AVAILABLE');
  end if;

  if exists(
    select 1 from public.employee_availability ea
    where ea.user_id=p_recipient_user_id
      and ea.work_date=v_schedule.work_date
      and ea.availability_type='UNAVAILABLE'
      and ea.start_time<v_schedule.end_time
      and v_schedule.start_time<ea.end_time
  ) then
    v_violations:=v_violations||jsonb_build_object('code','RECIPIENT_UNAVAILABLE');
  end if;

  if exists(
    select 1 from public.work_schedules ws
    where ws.user_id=p_recipient_user_id
      and ws.id<>v_schedule.id
      and ws.status in('PENDING','APPROVED')
      and ws.work_date=v_schedule.work_date
      and ws.start_time<v_schedule.end_time
      and v_schedule.start_time<ws.end_time
  ) then
    v_violations:=v_violations||jsonb_build_object('code','RECIPIENT_RESULTING_OVERLAP');
  end if;

  if exists(
    select 1 from public.shift_swaps ss
    where ss.status in('PENDING','PEER_ACCEPTED')
      and (
        ss.requester_schedule_id=v_schedule.id
        or ss.target_schedule_id=v_schedule.id
      )
  ) then
    v_violations:=v_violations||jsonb_build_object('code','SCHEDULE_HAS_ACTIVE_SWAP');
  end if;

  select count(*)::integer into v_recipient_count
  from public.work_schedules ws
  where ws.user_id=p_recipient_user_id
    and ws.id<>v_schedule.id
    and ws.work_date=v_schedule.work_date
    and ws.status in('PENDING','APPROVED');

  v_recipient_count:=v_recipient_count+1;

  if v_recipient_count>2 then
    v_violations:=v_violations||jsonb_build_object(
      'code','RECIPIENT_MAX_TWO_ASSIGNMENTS_PER_DAY',
      'assignment_count',v_recipient_count
    );
  end if;

  select coalesce(max(max_daily_hours),0),coalesce(max(max_weekly_hours),0)
    into v_daily_cap,v_weekly_cap
  from public.employee_constraints
  where user_id=p_recipient_user_id and status='ACTIVE';

  select coalesce(sum(extract(epoch from(ws.end_time-ws.start_time))/3600.0),0)
    into v_daily
  from public.work_schedules ws
  where ws.user_id=p_recipient_user_id
    and ws.id<>v_schedule.id
    and ws.work_date=v_schedule.work_date
    and ws.status in('PENDING','APPROVED');

  v_daily:=v_daily+extract(epoch from(v_schedule.end_time-v_schedule.start_time))/3600.0;

  v_week_start:=v_schedule.work_date-(extract(isodow from v_schedule.work_date)::integer-1);

  select coalesce(sum(extract(epoch from(ws.end_time-ws.start_time))/3600.0),0)
    into v_weekly
  from public.work_schedules ws
  where ws.user_id=p_recipient_user_id
    and ws.id<>v_schedule.id
    and ws.work_date between v_week_start and v_week_start+6
    and ws.status in('PENDING','APPROVED');

  v_weekly:=v_weekly+extract(epoch from(v_schedule.end_time-v_schedule.start_time))/3600.0;

  if v_daily_cap>0 and v_daily>v_daily_cap then
    v_violations:=v_violations||jsonb_build_object(
      'code','RECIPIENT_DAILY_HOURS_LIMIT',
      'hours',v_daily,
      'limit',v_daily_cap
    );
  end if;

  if v_weekly_cap>0 and v_weekly>v_weekly_cap then
    v_violations:=v_violations||jsonb_build_object(
      'code','RECIPIENT_WEEKLY_HOURS_LIMIT',
      'hours',v_weekly,
      'limit',v_weekly_cap
    );
  end if;

  return jsonb_build_object(
    'valid',jsonb_array_length(v_violations)=0,
    'violations',v_violations,
    'violation_count',jsonb_array_length(v_violations)
  );
end;
$function$;

create or replace function public.list_shift_give_candidates_v1(p_schedule_id uuid)
returns table(
  user_id uuid,
  user_name text,
  work_date date,
  start_time time without time zone,
  end_time time without time zone,
  store_id uuid,
  store_code text,
  store_name text
)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_schedule public.work_schedules%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_schedule
  from public.work_schedules
  where id=p_schedule_id;

  if v_schedule.id is null
     or v_schedule.user_id<>auth.uid()
     or v_schedule.status<>'APPROVED' then
    raise exception 'GIVER_SCHEDULE_NOT_OWNED';
  end if;

  if exists(
    select 1 from public.shift_gives g
    where g.schedule_id=v_schedule.id
      and g.status in('PENDING_RECIPIENT','PENDING_MANAGER')
  ) then
    return;
  end if;

  return query
  select
    p.id,p.full_name,
    v_schedule.work_date,v_schedule.start_time,v_schedule.end_time,
    v_schedule.store_id,s.code,s.name
  from public.profiles p
  join public.stores s on s.id=v_schedule.store_id
  where p.id<>auth.uid()
    and p.status='ACTIVE'
    and p.role='STAFF'
    and coalesce(
      (public.validate_shift_give_v1(v_schedule.id,p.id,auth.uid())->>'valid')::boolean,
      false
    )
  order by p.full_name,p.id;
end;
$function$;

create or replace function public.submit_shift_give_request(
  p_schedule_id uuid,
  p_recipient_user_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_schedule public.work_schedules%rowtype;
  v_validation jsonb;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_schedule_id is null or p_recipient_user_id is null then raise exception 'GIVE_FIELDS_REQUIRED'; end if;
  if nullif(trim(coalesce(p_reason,'')),'') is null then raise exception 'REASON_REQUIRED'; end if;

  -- Reuse TASK-096 schedule lock namespace so Give and Swap cannot both
  -- pass their conflict checks concurrently for the same assignment.
  perform pg_advisory_xact_lock(
    hashtextextended('shift_swap_schedule:'||p_schedule_id::text,0)
  );

  select * into v_schedule
  from public.work_schedules
  where id=p_schedule_id
  for update;

  if v_schedule.id is null
     or v_schedule.user_id<>auth.uid() then
    raise exception 'GIVER_SCHEDULE_NOT_OWNED';
  end if;
  if v_schedule.status<>'APPROVED' then
    raise exception 'SCHEDULE_NOT_APPROVED';
  end if;

  v_validation:=public.validate_shift_give_v1(
    p_schedule_id,p_recipient_user_id,auth.uid()
  );

  if not coalesce((v_validation->>'valid')::boolean,false) then
    raise exception 'SHIFT_GIVE_VALIDATION_FAILED: %',v_validation->'violations';
  end if;

  if exists(
    select 1 from public.shift_gives g
    where g.schedule_id=p_schedule_id
      and g.status in('PENDING_RECIPIENT','PENDING_MANAGER')
  ) then
    raise exception 'SHIFT_GIVE_ALREADY_PENDING';
  end if;

  insert into public.shift_gives(
    giver_id,recipient_id,schedule_id,store_id,reason,status
  )
  values(
    auth.uid(),p_recipient_user_id,p_schedule_id,
    v_schedule.store_id,trim(p_reason),'PENDING_RECIPIENT'
  )
  returning id into v_id;

  return v_id;
exception
  when unique_violation then
    raise exception 'SHIFT_GIVE_ALREADY_PENDING';
end;
$function$;

create or replace function public.respond_shift_give_request(
  p_give_id uuid,
  p_accept boolean
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_give public.shift_gives%rowtype;
  v_schedule public.work_schedules%rowtype;
  v_validation jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_give_id is null or p_accept is null then raise exception 'RESPONSE_FIELDS_REQUIRED'; end if;

  select * into v_give
  from public.shift_gives
  where id=p_give_id
  for update;

  if not found then raise exception 'SHIFT_GIVE_NOT_FOUND'; end if;
  if v_give.recipient_id<>auth.uid() then raise exception 'RECIPIENT_NOT_ALLOWED'; end if;

  if v_give.status='PENDING_MANAGER' and p_accept then
    return jsonb_build_object(
      'id',p_give_id,
      'status','PENDING_MANAGER',
      'accepted',true,
      'already_accepted',true
    );
  end if;

  if v_give.status='REJECTED_RECIPIENT'
     and not p_accept then
    return jsonb_build_object(
      'id',p_give_id,
      'status','REJECTED_RECIPIENT',
      'accepted',false,
      'already_rejected',true
    );
  end if;

  if v_give.status<>'PENDING_RECIPIENT' then
    raise exception 'SHIFT_GIVE_NOT_PENDING_RECIPIENT';
  end if;

  if not p_accept then
    update public.shift_gives
       set status='REJECTED_RECIPIENT',
           recipient_responded_at=now(),
           resolved_at=now(),
           updated_at=now()
     where id=p_give_id and status='PENDING_RECIPIENT';

    if not found then raise exception 'SHIFT_GIVE_RESPONSE_CONFLICT'; end if;

    return jsonb_build_object(
      'id',p_give_id,
      'status','REJECTED_RECIPIENT',
      'accepted',false,
      'already_rejected',false
    );
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('shift_swap_schedule:'||v_give.schedule_id::text,0)
  );

  select * into v_schedule
  from public.work_schedules
  where id=v_give.schedule_id
  for update;

  if v_schedule.id is null then raise exception 'SCHEDULE_NOT_FOUND'; end if;
  if v_schedule.user_id<>v_give.giver_id then raise exception 'GIVER_OWNERSHIP_CHANGED'; end if;
  if v_schedule.status<>'APPROVED' then raise exception 'SCHEDULE_NOT_APPROVED'; end if;

  v_validation:=public.validate_shift_give_v1(
    v_give.schedule_id,v_give.recipient_id,v_give.giver_id
  );

  if not coalesce((v_validation->>'valid')::boolean,false) then
    raise exception 'SHIFT_GIVE_REVALIDATION_FAILED: %',v_validation->'violations';
  end if;

  update public.shift_gives
     set status='PENDING_MANAGER',
         recipient_responded_at=now(),
         updated_at=now()
   where id=p_give_id and status='PENDING_RECIPIENT';

  if not found then raise exception 'SHIFT_GIVE_RESPONSE_CONFLICT'; end if;

  return jsonb_build_object(
    'id',p_give_id,
    'status','PENDING_MANAGER',
    'accepted',true,
    'already_accepted',false
  );
end;
$function$;

create or replace function public.approve_shift_give(p_give_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_give public.shift_gives%rowtype;
  v_schedule public.work_schedules%rowtype;
  v_validation jsonb;
  v_role text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  v_role:=public.current_user_role();
  if v_role not in('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if not exists(
    select 1 from public.profiles
    where id=auth.uid() and status='ACTIVE' and role=v_role
  ) then
    raise exception 'ACTOR_NOT_ACTIVE';
  end if;

  select * into v_give
  from public.shift_gives
  where id=p_give_id
  for update;

  if not found then raise exception 'SHIFT_GIVE_NOT_FOUND'; end if;
  if v_role='STORE_MANAGER' and not public.can_access_store(v_give.store_id) then
    raise exception 'STORE_NOT_ALLOWED';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('shift_swap_schedule:'||v_give.schedule_id::text,0)
  );

  select * into v_schedule
  from public.work_schedules
  where id=v_give.schedule_id
  for update;

  if v_schedule.id is null then raise exception 'SCHEDULE_NOT_FOUND'; end if;

  if v_give.status='APPROVED' then
    if v_schedule.user_id<>v_give.recipient_id then
      raise exception 'SHIFT_GIVE_APPROVED_OWNERSHIP_MISMATCH';
    end if;

    return jsonb_build_object(
      'id',p_give_id,
      'status','APPROVED',
      'transferred',false,
      'already_applied',true,
      'schedule_id',v_give.schedule_id,
      'giver_id',v_give.giver_id,
      'recipient_id',v_give.recipient_id
    );
  end if;

  if v_give.status<>'PENDING_MANAGER' then
    raise exception 'SHIFT_GIVE_NOT_PENDING_MANAGER';
  end if;
  if v_give.recipient_responded_at is null then
    raise exception 'SHIFT_GIVE_RECIPIENT_CONSENT_REQUIRED';
  end if;
  if v_schedule.user_id<>v_give.giver_id then
    raise exception 'GIVER_OWNERSHIP_CHANGED';
  end if;
  if v_schedule.status<>'APPROVED' then
    raise exception 'SCHEDULE_NOT_APPROVED';
  end if;

  v_validation:=public.validate_shift_give_v1(
    v_give.schedule_id,v_give.recipient_id,v_give.giver_id
  );

  if not coalesce((v_validation->>'valid')::boolean,false) then
    raise exception 'SHIFT_GIVE_REVALIDATION_FAILED: %',v_validation->'violations';
  end if;

  update public.work_schedules
     set user_id=v_give.recipient_id,
         note=concat_ws(E'\n',nullif(note,''),'Shift give approved #'||p_give_id::text),
         updated_at=now()
   where id=v_schedule.id
     and user_id=v_give.giver_id
     and status='APPROVED';

  if not found then raise exception 'SHIFT_GIVE_TRANSFER_CONFLICT'; end if;

  update public.shift_gives
     set status='APPROVED',
         manager_id=auth.uid(),
         resolved_at=now(),
         manager_note=concat_ws(E'\n',nullif(manager_note,''),'Approved'),
         updated_at=now()
   where id=p_give_id and status='PENDING_MANAGER';

  if not found then raise exception 'SHIFT_GIVE_APPROVAL_CONFLICT'; end if;

  return jsonb_build_object(
    'id',p_give_id,
    'status','APPROVED',
    'transferred',true,
    'already_applied',false,
    'schedule_id',v_give.schedule_id,
    'giver_id',v_give.giver_id,
    'recipient_id',v_give.recipient_id
  );
end;
$function$;

create or replace function public.reject_shift_give(
  p_give_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_give public.shift_gives%rowtype;
  v_role text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  v_role:=public.current_user_role();
  if v_role not in('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if not exists(
    select 1 from public.profiles
    where id=auth.uid() and status='ACTIVE' and role=v_role
  ) then
    raise exception 'ACTOR_NOT_ACTIVE';
  end if;

  select * into v_give
  from public.shift_gives
  where id=p_give_id
  for update;

  if not found then raise exception 'SHIFT_GIVE_NOT_FOUND'; end if;
  if v_role='STORE_MANAGER' and not public.can_access_store(v_give.store_id) then
    raise exception 'STORE_NOT_ALLOWED';
  end if;

  if v_give.status='REJECTED_MANAGER' then
    return jsonb_build_object(
      'id',p_give_id,
      'status','REJECTED_MANAGER',
      'already_rejected',true
    );
  end if;

  if v_give.status<>'PENDING_MANAGER' then
    raise exception 'SHIFT_GIVE_NOT_PENDING_MANAGER';
  end if;
  if v_give.recipient_responded_at is null then
    raise exception 'SHIFT_GIVE_RECIPIENT_CONSENT_REQUIRED';
  end if;

  update public.shift_gives
     set status='REJECTED_MANAGER',
         manager_id=auth.uid(),
         resolved_at=now(),
         manager_note=concat_ws(E'\n',nullif(manager_note,''),nullif(p_note,'')),
         updated_at=now()
   where id=p_give_id and status='PENDING_MANAGER';

  if not found then raise exception 'SHIFT_GIVE_REJECTION_CONFLICT'; end if;

  return jsonb_build_object(
    'id',p_give_id,
    'status','REJECTED_MANAGER',
    'already_rejected',false
  );
end;
$function$;

revoke execute on function public.validate_shift_give_v1(uuid,uuid,uuid)
  from public,anon,authenticated;
revoke execute on function public.list_shift_give_candidates_v1(uuid)
  from public,anon;
revoke execute on function public.submit_shift_give_request(uuid,uuid,text)
  from public,anon;
revoke execute on function public.respond_shift_give_request(uuid,boolean)
  from public,anon;
revoke execute on function public.approve_shift_give(uuid)
  from public,anon;
revoke execute on function public.reject_shift_give(uuid,text)
  from public,anon;

grant execute on function public.list_shift_give_candidates_v1(uuid) to authenticated;
grant execute on function public.submit_shift_give_request(uuid,uuid,text) to authenticated;
grant execute on function public.respond_shift_give_request(uuid,boolean) to authenticated;
grant execute on function public.approve_shift_give(uuid) to authenticated;
grant execute on function public.reject_shift_give(uuid,text) to authenticated;

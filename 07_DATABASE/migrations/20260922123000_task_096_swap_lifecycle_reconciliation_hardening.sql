-- TASK-096 — Swap Lifecycle Reconciliation + Hardening
-- Canonical mapping:
--   PENDING       = REQUESTED / waiting target Employee response
--   PEER_ACCEPTED = target Employee accepted / waiting Manager
--   APPROVED      = Manager approved + ownership exchange APPLIED atomically
--   REJECTED      = peer or Manager rejection (approver_id distinguishes Manager resolution)
--   CANCELLED     = requester cancellation before peer acceptance
-- EXPIRED remains Owner-undefined and is not invented here.
-- No destructive cleanup/backfill. Live pre-audit had zero shift_swaps rows.

alter table public.shift_swaps
  add column if not exists peer_responded_at timestamptz;

alter table public.shift_swaps
  drop constraint if exists shift_swaps_status_check;

alter table public.shift_swaps
  add constraint shift_swaps_status_check
  check (status in ('PENDING','PEER_ACCEPTED','APPROVED','CANCELLED','REJECTED'));

drop index if exists public.uq_shift_swaps_pending_requester_schedule;
drop index if exists public.uq_shift_swaps_pending_target_schedule;

create unique index uq_shift_swaps_active_requester_schedule
  on public.shift_swaps(requester_schedule_id)
  where status in ('PENDING','PEER_ACCEPTED') and requester_schedule_id is not null;

create unique index uq_shift_swaps_active_target_schedule
  on public.shift_swaps(target_schedule_id)
  where status in ('PENDING','PEER_ACCEPTED') and target_schedule_id is not null;

create index if not exists idx_shift_swaps_target_user_status
  on public.shift_swaps(target_user_id,status,requested_at desc);

-- Browser/UI must use permissioned RPCs, never direct canonical-table mutation.
revoke all on table public.shift_swaps from anon, authenticated;
grant select,insert,update,delete on table public.shift_swaps to service_role;

create or replace function public.validate_shift_swap_v1(
  p_requester_schedule_id uuid,
  p_target_schedule_id uuid,
  p_requester_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_req public.work_schedules%rowtype;
  v_target public.work_schedules%rowtype;
  v_violations jsonb := '[]'::jsonb;
  v_req_daily numeric := 0;
  v_target_daily numeric := 0;
  v_req_weekly numeric := 0;
  v_target_weekly numeric := 0;
  v_req_daily_cap numeric := 0;
  v_target_daily_cap numeric := 0;
  v_req_weekly_cap numeric := 0;
  v_target_weekly_cap numeric := 0;
  v_week_start date;
  v_req_count integer := 0;
  v_target_count integer := 0;
begin
  select * into v_req from public.work_schedules where id=p_requester_schedule_id;
  select * into v_target from public.work_schedules where id=p_target_schedule_id;

  if v_req.id is null then v_violations:=v_violations||jsonb_build_object('code','REQUESTER_SCHEDULE_NOT_FOUND'); end if;
  if v_target.id is null then v_violations:=v_violations||jsonb_build_object('code','TARGET_SCHEDULE_NOT_FOUND'); end if;
  if v_req.id is null or v_target.id is null then
    return jsonb_build_object('valid',false,'violations',v_violations,'violation_count',jsonb_array_length(v_violations));
  end if;

  if v_req.user_id<>p_requester_user_id then v_violations:=v_violations||jsonb_build_object('code','REQUESTER_SCHEDULE_NOT_OWNED'); end if;
  if v_req.user_id=v_target.user_id then v_violations:=v_violations||jsonb_build_object('code','SAME_EMPLOYEE_SWAP'); end if;
  if v_req.status<>'APPROVED' then v_violations:=v_violations||jsonb_build_object('code','REQUESTER_SCHEDULE_NOT_APPROVED'); end if;
  if v_target.status<>'APPROVED' then v_violations:=v_violations||jsonb_build_object('code','TARGET_SCHEDULE_NOT_APPROVED'); end if;
  if v_req.store_id<>v_target.store_id then v_violations:=v_violations||jsonb_build_object('code','STORE_MISMATCH'); end if;
  if v_req.work_date<>v_target.work_date then v_violations:=v_violations||jsonb_build_object('code','DATE_MISMATCH'); end if;

  if not exists(select 1 from public.profiles where id=v_req.user_id and status='ACTIVE') then
    v_violations:=v_violations||jsonb_build_object('code','REQUESTER_INACTIVE');
  end if;
  if not exists(select 1 from public.profiles where id=v_target.user_id and status='ACTIVE') then
    v_violations:=v_violations||jsonb_build_object('code','TARGET_INACTIVE');
  end if;
  if not exists(select 1 from public.profiles where id=v_req.user_id and role='STAFF') then
    v_violations:=v_violations||jsonb_build_object('code','REQUESTER_NOT_STAFF');
  end if;
  if not exists(select 1 from public.profiles where id=v_target.user_id and role='STAFF') then
    v_violations:=v_violations||jsonb_build_object('code','TARGET_NOT_STAFF');
  end if;

  if exists(
    select 1 from public.attendance a
    where a.schedule_id in(v_req.id,v_target.id)
      and a.status not in('DELETED','DELETED_BY_MANAGER')
  ) then
    v_violations:=v_violations||jsonb_build_object('code','ATTENDANCE_ALREADY_EXISTS');
  end if;

  if exists(
    select 1 from public.shift_gives g
    where g.status in('PENDING_RECIPIENT','PENDING_MANAGER')
      and g.schedule_id in(v_req.id,v_target.id)
  ) then
    v_violations:=v_violations||jsonb_build_object('code','SCHEDULE_HAS_PENDING_GIVE');
  end if;

  if not exists(
    select 1 from public.employee_availability ea
    where ea.user_id=v_req.user_id
      and ea.work_date=v_target.work_date
      and ea.availability_type in('AVAILABLE','PREFERRED')
      and ea.start_time<=v_target.start_time
      and ea.end_time>=v_target.end_time
  ) then
    v_violations:=v_violations||jsonb_build_object('code','REQUESTER_NOT_AVAILABLE_FOR_TARGET_SHIFT');
  end if;
  if exists(
    select 1 from public.employee_availability ea
    where ea.user_id=v_req.user_id
      and ea.work_date=v_target.work_date
      and ea.availability_type='UNAVAILABLE'
      and ea.start_time<v_target.end_time
      and v_target.start_time<ea.end_time
  ) then
    v_violations:=v_violations||jsonb_build_object('code','REQUESTER_UNAVAILABLE_FOR_TARGET_SHIFT');
  end if;
  if not exists(
    select 1 from public.employee_availability ea
    where ea.user_id=v_target.user_id
      and ea.work_date=v_req.work_date
      and ea.availability_type in('AVAILABLE','PREFERRED')
      and ea.start_time<=v_req.start_time
      and ea.end_time>=v_req.end_time
  ) then
    v_violations:=v_violations||jsonb_build_object('code','TARGET_NOT_AVAILABLE_FOR_REQUESTER_SHIFT');
  end if;
  if exists(
    select 1 from public.employee_availability ea
    where ea.user_id=v_target.user_id
      and ea.work_date=v_req.work_date
      and ea.availability_type='UNAVAILABLE'
      and ea.start_time<v_req.end_time
      and v_req.start_time<ea.end_time
  ) then
    v_violations:=v_violations||jsonb_build_object('code','TARGET_UNAVAILABLE_FOR_REQUESTER_SHIFT');
  end if;

  if exists(
    select 1 from public.work_schedules ws
    where ws.user_id=v_req.user_id
      and ws.id not in(v_req.id,v_target.id)
      and ws.status in('PENDING','APPROVED')
      and ws.work_date=v_target.work_date
      and ws.start_time<v_target.end_time
      and v_target.start_time<ws.end_time
  ) then
    v_violations:=v_violations||jsonb_build_object('code','REQUESTER_RESULTING_OVERLAP');
  end if;
  if exists(
    select 1 from public.work_schedules ws
    where ws.user_id=v_target.user_id
      and ws.id not in(v_req.id,v_target.id)
      and ws.status in('PENDING','APPROVED')
      and ws.work_date=v_req.work_date
      and ws.start_time<v_req.end_time
      and v_req.start_time<ws.end_time
  ) then
    v_violations:=v_violations||jsonb_build_object('code','TARGET_RESULTING_OVERLAP');
  end if;

  select count(*)::integer into v_req_count
  from public.work_schedules ws
  where ws.user_id=v_req.user_id
    and ws.work_date=v_target.work_date
    and ws.status in('PENDING','APPROVED')
    and ws.id not in(v_req.id,v_target.id);
  v_req_count:=v_req_count+1;

  select count(*)::integer into v_target_count
  from public.work_schedules ws
  where ws.user_id=v_target.user_id
    and ws.work_date=v_req.work_date
    and ws.status in('PENDING','APPROVED')
    and ws.id not in(v_req.id,v_target.id);
  v_target_count:=v_target_count+1;

  if v_req_count>2 then
    v_violations:=v_violations||jsonb_build_object(
      'code','REQUESTER_MAX_TWO_ASSIGNMENTS_PER_DAY',
      'assignment_count',v_req_count
    );
  end if;
  if v_target_count>2 then
    v_violations:=v_violations||jsonb_build_object(
      'code','TARGET_MAX_TWO_ASSIGNMENTS_PER_DAY',
      'assignment_count',v_target_count
    );
  end if;

  select coalesce(max(max_daily_hours),0),coalesce(max(max_weekly_hours),0)
    into v_req_daily_cap,v_req_weekly_cap
  from public.employee_constraints
  where user_id=v_req.user_id and status='ACTIVE';

  select coalesce(max(max_daily_hours),0),coalesce(max(max_weekly_hours),0)
    into v_target_daily_cap,v_target_weekly_cap
  from public.employee_constraints
  where user_id=v_target.user_id and status='ACTIVE';

  select coalesce(sum(extract(epoch from(ws.end_time-ws.start_time))/3600.0),0)
    into v_req_daily
  from public.work_schedules ws
  where ws.user_id=v_req.user_id
    and ws.work_date=v_target.work_date
    and ws.status in('PENDING','APPROVED')
    and ws.id not in(v_req.id,v_target.id);
  v_req_daily:=v_req_daily+extract(epoch from(v_target.end_time-v_target.start_time))/3600.0;

  select coalesce(sum(extract(epoch from(ws.end_time-ws.start_time))/3600.0),0)
    into v_target_daily
  from public.work_schedules ws
  where ws.user_id=v_target.user_id
    and ws.work_date=v_req.work_date
    and ws.status in('PENDING','APPROVED')
    and ws.id not in(v_req.id,v_target.id);
  v_target_daily:=v_target_daily+extract(epoch from(v_req.end_time-v_req.start_time))/3600.0;

  v_week_start:=v_req.work_date-(extract(isodow from v_req.work_date)::integer-1);

  select coalesce(sum(extract(epoch from(ws.end_time-ws.start_time))/3600.0),0)
    into v_req_weekly
  from public.work_schedules ws
  where ws.user_id=v_req.user_id
    and ws.work_date between v_week_start and v_week_start+6
    and ws.status in('PENDING','APPROVED')
    and ws.id not in(v_req.id,v_target.id);
  v_req_weekly:=v_req_weekly+extract(epoch from(v_target.end_time-v_target.start_time))/3600.0;

  select coalesce(sum(extract(epoch from(ws.end_time-ws.start_time))/3600.0),0)
    into v_target_weekly
  from public.work_schedules ws
  where ws.user_id=v_target.user_id
    and ws.work_date between v_week_start and v_week_start+6
    and ws.status in('PENDING','APPROVED')
    and ws.id not in(v_req.id,v_target.id);
  v_target_weekly:=v_target_weekly+extract(epoch from(v_req.end_time-v_req.start_time))/3600.0;

  if v_req_daily_cap>0 and v_req_daily>v_req_daily_cap then
    v_violations:=v_violations||jsonb_build_object('code','REQUESTER_DAILY_HOURS_LIMIT','hours',v_req_daily,'limit',v_req_daily_cap);
  end if;
  if v_target_daily_cap>0 and v_target_daily>v_target_daily_cap then
    v_violations:=v_violations||jsonb_build_object('code','TARGET_DAILY_HOURS_LIMIT','hours',v_target_daily,'limit',v_target_daily_cap);
  end if;
  if v_req_weekly_cap>0 and v_req_weekly>v_req_weekly_cap then
    v_violations:=v_violations||jsonb_build_object('code','REQUESTER_WEEKLY_HOURS_LIMIT','hours',v_req_weekly,'limit',v_req_weekly_cap);
  end if;
  if v_target_weekly_cap>0 and v_target_weekly>v_target_weekly_cap then
    v_violations:=v_violations||jsonb_build_object('code','TARGET_WEEKLY_HOURS_LIMIT','hours',v_target_weekly,'limit',v_target_weekly_cap);
  end if;

  return jsonb_build_object(
    'valid',jsonb_array_length(v_violations)=0,
    'violations',v_violations,
    'violation_count',jsonb_array_length(v_violations)
  );
end;
$function$;

create or replace function public.list_shift_swap_candidates_v1(p_requester_schedule_id uuid)
returns table(
  schedule_id uuid,
  user_id uuid,
  user_name text,
  work_date date,
  start_time time without time zone,
  end_time time without time zone,
  store_id uuid,
  store_code text,
  store_name text
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select ws.id,ws.user_id,p.full_name,ws.work_date,ws.start_time,ws.end_time,ws.store_id,s.code,s.name
  from public.work_schedules ws
  join public.profiles p on p.id=ws.user_id
  join public.stores s on s.id=ws.store_id
  where ws.status='APPROVED'
    and p.status='ACTIVE'
    and p.role='STAFF'
    and ws.user_id<>auth.uid()
    and exists(
      select 1
      from public.work_schedules mine
      where mine.id=p_requester_schedule_id
        and mine.user_id=auth.uid()
        and mine.status='APPROVED'
        and mine.store_id=ws.store_id
        and mine.work_date=ws.work_date
    )
    and not exists(
      select 1 from public.attendance a
      where a.schedule_id=ws.id
        and a.status not in('DELETED','DELETED_BY_MANAGER')
    )
    and not exists(
      select 1 from public.shift_swaps ss
      where ss.status in('PENDING','PEER_ACCEPTED')
        and (ss.requester_schedule_id=ws.id or ss.target_schedule_id=ws.id)
    )
    and not exists(
      select 1 from public.shift_gives g
      where g.status in('PENDING_RECIPIENT','PENDING_MANAGER')
        and g.schedule_id=ws.id
    )
  order by ws.start_time,ws.user_id,ws.id;
$function$;

create or replace function public.submit_shift_swap_request(
  p_requester_schedule_id uuid,
  p_target_schedule_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_req public.work_schedules%rowtype;
  v_target public.work_schedules%rowtype;
  v_validation jsonb;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if nullif(trim(coalesce(p_reason,'')),'') is null then raise exception 'REASON_REQUIRED'; end if;
  if p_requester_schedule_id is null or p_target_schedule_id is null then raise exception 'SCHEDULE_ID_REQUIRED'; end if;
  if p_requester_schedule_id=p_target_schedule_id then raise exception 'SAME_SCHEDULE_SWAP'; end if;

  if p_requester_schedule_id::text < p_target_schedule_id::text then
    perform pg_advisory_xact_lock(hashtextextended('shift_swap_schedule:'||p_requester_schedule_id::text,0));
    perform pg_advisory_xact_lock(hashtextextended('shift_swap_schedule:'||p_target_schedule_id::text,0));
    select * into v_req from public.work_schedules where id=p_requester_schedule_id for update;
    select * into v_target from public.work_schedules where id=p_target_schedule_id for update;
  else
    perform pg_advisory_xact_lock(hashtextextended('shift_swap_schedule:'||p_target_schedule_id::text,0));
    perform pg_advisory_xact_lock(hashtextextended('shift_swap_schedule:'||p_requester_schedule_id::text,0));
    select * into v_target from public.work_schedules where id=p_target_schedule_id for update;
    select * into v_req from public.work_schedules where id=p_requester_schedule_id for update;
  end if;

  if v_req.id is null or v_req.user_id<>auth.uid() then raise exception 'REQUESTER_SCHEDULE_NOT_OWNED'; end if;
  if v_target.id is null then raise exception 'TARGET_SCHEDULE_NOT_FOUND'; end if;

  v_validation:=public.validate_shift_swap_v1(
    p_requester_schedule_id,
    p_target_schedule_id,
    auth.uid()
  );
  if not coalesce((v_validation->>'valid')::boolean,false) then
    raise exception 'SHIFT_SWAP_VALIDATION_FAILED: %',v_validation->'violations';
  end if;

  if exists(
    select 1 from public.shift_swaps ss
    where ss.status in('PENDING','PEER_ACCEPTED')
      and (
        ss.requester_schedule_id in(p_requester_schedule_id,p_target_schedule_id)
        or ss.target_schedule_id in(p_requester_schedule_id,p_target_schedule_id)
      )
  ) then
    raise exception 'SHIFT_SWAP_ALREADY_ACTIVE';
  end if;

  insert into public.shift_swaps(
    requester_id,current_shift,requested_shift,store_id,reason,status,
    requester_schedule_id,target_schedule_id,target_user_id,peer_responded_at
  )
  values(
    auth.uid(),
    to_char(v_req.work_date,'YYYY-MM-DD')||' '||to_char(v_req.start_time,'HH24:MI')||'-'||to_char(v_req.end_time,'HH24:MI'),
    to_char(v_target.work_date,'YYYY-MM-DD')||' '||to_char(v_target.start_time,'HH24:MI')||'-'||to_char(v_target.end_time,'HH24:MI'),
    v_req.store_id,
    trim(p_reason),
    'PENDING',
    p_requester_schedule_id,
    p_target_schedule_id,
    v_target.user_id,
    null
  )
  returning id into v_id;

  return v_id;
exception
  when unique_violation then
    raise exception 'SHIFT_SWAP_ALREADY_ACTIVE';
end;
$function$;

create or replace function public.list_my_incoming_shift_swaps_v1()
returns table(
  id uuid,
  status text,
  reason text,
  requested_at timestamptz,
  peer_responded_at timestamptz,
  store_code text,
  store_name text,
  requester_name text,
  requester_schedule_id uuid,
  target_schedule_id uuid,
  requester_date date,
  requester_start time without time zone,
  requester_end time without time zone,
  target_date date,
  target_start time without time zone,
  target_end time without time zone
)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  return query
  select
    ss.id,ss.status,ss.reason,ss.requested_at,ss.peer_responded_at,
    s.code,s.name,rp.full_name,
    ss.requester_schedule_id,ss.target_schedule_id,
    r.work_date,r.start_time,r.end_time,
    t.work_date,t.start_time,t.end_time
  from public.shift_swaps ss
  join public.stores s on s.id=ss.store_id
  left join public.profiles rp on rp.id=ss.requester_id
  left join public.work_schedules r on r.id=ss.requester_schedule_id
  left join public.work_schedules t on t.id=ss.target_schedule_id
  where ss.target_user_id=auth.uid()
  order by ss.requested_at desc,ss.id desc;
end;
$function$;

create or replace function public.respond_shift_swap_request(
  p_swap_id uuid,
  p_accept boolean
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_swap public.shift_swaps%rowtype;
  v_req public.work_schedules%rowtype;
  v_target public.work_schedules%rowtype;
  v_validation jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_swap_id is null or p_accept is null then raise exception 'RESPONSE_FIELDS_REQUIRED'; end if;

  select * into v_swap
  from public.shift_swaps
  where id=p_swap_id
  for update;

  if not found then raise exception 'SHIFT_SWAP_NOT_FOUND'; end if;
  if v_swap.target_user_id<>auth.uid() then raise exception 'SHIFT_SWAP_NOT_TARGET'; end if;

  if v_swap.status='PEER_ACCEPTED' and p_accept then
    return jsonb_build_object(
      'id',p_swap_id,'status','PEER_ACCEPTED',
      'accepted',true,'already_accepted',true
    );
  end if;

  if v_swap.status='REJECTED'
     and not p_accept
     and v_swap.peer_responded_at is not null
     and v_swap.approver_id is null then
    return jsonb_build_object(
      'id',p_swap_id,'status','REJECTED',
      'accepted',false,'already_rejected',true
    );
  end if;

  if v_swap.status<>'PENDING' then
    raise exception 'SHIFT_SWAP_NOT_AWAITING_PEER';
  end if;
  if v_swap.requester_schedule_id is null or v_swap.target_schedule_id is null then
    raise exception 'SHIFT_SWAP_LEGACY_REQUEST';
  end if;

  if v_swap.requester_schedule_id::text < v_swap.target_schedule_id::text then
    perform pg_advisory_xact_lock(hashtextextended('shift_swap_schedule:'||v_swap.requester_schedule_id::text,0));
    perform pg_advisory_xact_lock(hashtextextended('shift_swap_schedule:'||v_swap.target_schedule_id::text,0));
    select * into v_req from public.work_schedules where id=v_swap.requester_schedule_id for update;
    select * into v_target from public.work_schedules where id=v_swap.target_schedule_id for update;
  else
    perform pg_advisory_xact_lock(hashtextextended('shift_swap_schedule:'||v_swap.target_schedule_id::text,0));
    perform pg_advisory_xact_lock(hashtextextended('shift_swap_schedule:'||v_swap.requester_schedule_id::text,0));
    select * into v_target from public.work_schedules where id=v_swap.target_schedule_id for update;
    select * into v_req from public.work_schedules where id=v_swap.requester_schedule_id for update;
  end if;

  if v_req.id is null or v_req.user_id<>v_swap.requester_id then
    raise exception 'REQUESTER_OWNERSHIP_CHANGED';
  end if;
  if v_target.id is null or v_target.user_id<>v_swap.target_user_id then
    raise exception 'TARGET_OWNERSHIP_CHANGED';
  end if;
  if v_req.status<>'APPROVED' or v_target.status<>'APPROVED' then
    raise exception 'SHIFT_SWAP_SCHEDULE_NOT_APPROVED';
  end if;

  if p_accept then
    v_validation:=public.validate_shift_swap_v1(
      v_swap.requester_schedule_id,
      v_swap.target_schedule_id,
      v_swap.requester_id
    );
    if not coalesce((v_validation->>'valid')::boolean,false) then
      raise exception 'SHIFT_SWAP_PEER_REVALIDATION_FAILED: %',v_validation->'violations';
    end if;

    if exists(
      select 1 from public.shift_swaps ss
      where ss.id<>p_swap_id
        and ss.status in('PENDING','PEER_ACCEPTED')
        and (
          ss.requester_schedule_id in(v_swap.requester_schedule_id,v_swap.target_schedule_id)
          or ss.target_schedule_id in(v_swap.requester_schedule_id,v_swap.target_schedule_id)
        )
    ) then
      raise exception 'SHIFT_SWAP_COMPETING_ACTIVE';
    end if;

    update public.shift_swaps
       set status='PEER_ACCEPTED',peer_responded_at=now()
     where id=p_swap_id and status='PENDING';

    if not found then raise exception 'SHIFT_SWAP_PEER_RESPONSE_CONFLICT'; end if;

    return jsonb_build_object(
      'id',p_swap_id,'status','PEER_ACCEPTED',
      'accepted',true,'already_accepted',false
    );
  end if;

  update public.shift_swaps
     set status='REJECTED',
         peer_responded_at=now(),
         note=concat_ws(E'\n',nullif(note,''),'Peer rejected')
   where id=p_swap_id and status='PENDING';

  if not found then raise exception 'SHIFT_SWAP_PEER_RESPONSE_CONFLICT'; end if;

  return jsonb_build_object(
    'id',p_swap_id,'status','REJECTED',
    'accepted',false,'already_rejected',false
  );
end;
$function$;

create or replace function public.approve_shift_swap(p_swap_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_swap public.shift_swaps%rowtype;
  v_req public.work_schedules%rowtype;
  v_target public.work_schedules%rowtype;
  v_validation jsonb;
  v_tmp uuid;
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

  select * into v_swap
  from public.shift_swaps
  where id=p_swap_id
  for update;

  if not found then raise exception 'SHIFT_SWAP_NOT_FOUND'; end if;
  if v_role='STORE_MANAGER' and not public.can_access_store(v_swap.store_id) then
    raise exception 'STORE_NOT_ALLOWED';
  end if;

  if v_swap.status='APPROVED' then
    return jsonb_build_object(
      'id',p_swap_id,'status','APPROVED',
      'swapped',false,'already_applied',true,
      'requester_schedule_id',v_swap.requester_schedule_id,
      'target_schedule_id',v_swap.target_schedule_id
    );
  end if;

  if v_swap.status<>'PEER_ACCEPTED' then
    raise exception 'SHIFT_SWAP_PEER_ACCEPTANCE_REQUIRED';
  end if;
  if v_swap.requester_schedule_id is null or v_swap.target_schedule_id is null then
    raise exception 'SHIFT_SWAP_LEGACY_REQUEST';
  end if;

  if v_swap.requester_schedule_id::text < v_swap.target_schedule_id::text then
    perform pg_advisory_xact_lock(hashtextextended('shift_swap_schedule:'||v_swap.requester_schedule_id::text,0));
    perform pg_advisory_xact_lock(hashtextextended('shift_swap_schedule:'||v_swap.target_schedule_id::text,0));
    select * into v_req from public.work_schedules where id=v_swap.requester_schedule_id for update;
    select * into v_target from public.work_schedules where id=v_swap.target_schedule_id for update;
  else
    perform pg_advisory_xact_lock(hashtextextended('shift_swap_schedule:'||v_swap.target_schedule_id::text,0));
    perform pg_advisory_xact_lock(hashtextextended('shift_swap_schedule:'||v_swap.requester_schedule_id::text,0));
    select * into v_target from public.work_schedules where id=v_swap.target_schedule_id for update;
    select * into v_req from public.work_schedules where id=v_swap.requester_schedule_id for update;
  end if;

  if v_req.id is null or v_target.id is null then raise exception 'SCHEDULE_NOT_FOUND'; end if;
  if v_req.user_id<>v_swap.requester_id then raise exception 'REQUESTER_OWNERSHIP_CHANGED'; end if;
  if v_target.user_id<>v_swap.target_user_id then raise exception 'TARGET_OWNERSHIP_CHANGED'; end if;

  v_validation:=public.validate_shift_swap_v1(
    v_swap.requester_schedule_id,
    v_swap.target_schedule_id,
    v_swap.requester_id
  );
  if not coalesce((v_validation->>'valid')::boolean,false) then
    raise exception 'SHIFT_SWAP_REVALIDATION_FAILED: %',v_validation->'violations';
  end if;

  if exists(
    select 1 from public.shift_swaps ss
    where ss.id<>p_swap_id
      and ss.status in('PENDING','PEER_ACCEPTED')
      and (
        ss.requester_schedule_id in(v_swap.requester_schedule_id,v_swap.target_schedule_id)
        or ss.target_schedule_id in(v_swap.requester_schedule_id,v_swap.target_schedule_id)
      )
  ) then
    raise exception 'SHIFT_SWAP_COMPETING_ACTIVE';
  end if;

  v_tmp:=v_req.user_id;

  update public.work_schedules
     set user_id=v_target.user_id,
         note=concat_ws(E'\n',nullif(note,''),'Shift swap approved #'||p_swap_id::text)
   where id=v_req.id;

  update public.work_schedules
     set user_id=v_tmp,
         note=concat_ws(E'\n',nullif(note,''),'Shift swap approved #'||p_swap_id::text)
   where id=v_target.id;

  update public.shift_swaps
     set status='APPROVED',
         approver_id=auth.uid(),
         approved_at=now(),
         note=concat_ws(E'\n',nullif(note,''),'Approved')
   where id=p_swap_id and status='PEER_ACCEPTED';

  if not found then raise exception 'SHIFT_SWAP_APPROVAL_CONFLICT'; end if;

  return jsonb_build_object(
    'id',p_swap_id,'status','APPROVED',
    'swapped',true,'already_applied',false,
    'requester_schedule_id',v_swap.requester_schedule_id,
    'target_schedule_id',v_swap.target_schedule_id
  );
end;
$function$;

create or replace function public.reject_shift_swap(
  p_swap_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_swap public.shift_swaps%rowtype;
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

  select * into v_swap
  from public.shift_swaps
  where id=p_swap_id
  for update;

  if not found then raise exception 'SHIFT_SWAP_NOT_FOUND'; end if;
  if v_role='STORE_MANAGER' and not public.can_access_store(v_swap.store_id) then
    raise exception 'STORE_NOT_ALLOWED';
  end if;

  if v_swap.status='REJECTED' then
    return jsonb_build_object(
      'id',p_swap_id,'status','REJECTED',
      'already_rejected',true,
      'rejection_source',case when v_swap.approver_id is null then 'PEER' else 'MANAGER' end
    );
  end if;

  if v_swap.status<>'PEER_ACCEPTED' then
    raise exception 'SHIFT_SWAP_PEER_ACCEPTANCE_REQUIRED';
  end if;

  update public.shift_swaps
     set status='REJECTED',
         approver_id=auth.uid(),
         approved_at=now(),
         note=concat_ws(E'\n',nullif(note,''),nullif(p_note,''))
   where id=p_swap_id and status='PEER_ACCEPTED';

  if not found then raise exception 'SHIFT_SWAP_REJECTION_CONFLICT'; end if;

  return jsonb_build_object(
    'id',p_swap_id,'status','REJECTED',
    'already_rejected',false,'rejection_source','MANAGER'
  );
end;
$function$;

create or replace function public.cancel_shift_swap(p_swap_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_swap public.shift_swaps%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_swap
  from public.shift_swaps
  where id=p_swap_id
  for update;

  if not found then raise exception 'SHIFT_SWAP_NOT_FOUND'; end if;
  if v_swap.requester_id<>auth.uid() then raise exception 'SHIFT_SWAP_NOT_OWNED'; end if;

  if v_swap.status='CANCELLED' then
    return jsonb_build_object('id',p_swap_id,'status','CANCELLED','already_cancelled',true);
  end if;
  if v_swap.status='PEER_ACCEPTED' then raise exception 'SHIFT_SWAP_ALREADY_PEER_ACCEPTED'; end if;
  if v_swap.status<>'PENDING' then raise exception 'SHIFT_SWAP_ALREADY_RESOLVED'; end if;

  update public.shift_swaps
     set status='CANCELLED'
   where id=p_swap_id and status='PENDING';

  if not found then raise exception 'SHIFT_SWAP_CANCELLATION_CONFLICT'; end if;

  return jsonb_build_object('id',p_swap_id,'status','CANCELLED','already_cancelled',false);
end;
$function$;

create or replace function public.notification_shift_swap_trigger_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if tg_op='INSERT' and new.status='PENDING' then
    if new.target_user_id is not null then
      perform public.enqueue_notification_v1(
        'swap:'||new.id||':requested:target',
        'SHIFT_SWAP_REQUESTED','USER',new.target_user_id,new.store_id,auth.uid(),
        'SHIFT_SWAP',new.id,new.target_schedule_id,
        'Có yêu cầu đổi ca cần bạn phản hồi',
        'Một nhân viên muốn đổi ca với ca của bạn. Hãy đồng ý hoặc từ chối trước khi quản lý có thể duyệt.',
        jsonb_build_object('swap_id',new.id,'status',new.status,'store_id',new.store_id),
        now(),true
      );
    end if;
  end if;

  if tg_op='UPDATE' and old.status is distinct from new.status then
    if new.status='PEER_ACCEPTED' then
      perform public.enqueue_notification_v1(
        'swap:'||new.id||':peer_accepted:requester',
        'SHIFT_SWAP_PEER_ACCEPTED','USER',new.requester_id,new.store_id,auth.uid(),
        'SHIFT_SWAP',new.id,new.requester_schedule_id,
        'Người kia đã đồng ý đổi ca',
        'Yêu cầu đổi ca đang chờ quản lý duyệt.',
        jsonb_build_object('swap_id',new.id,'status',new.status,'store_id',new.store_id),
        now(),true
      );

      perform public.enqueue_notification_v1(
        'swap:'||new.id||':manager_review',
        'SHIFT_SWAP_MANAGER_REVIEW','STORE_MANAGERS',null,new.store_id,auth.uid(),
        'SHIFT_SWAP',new.id,new.requester_schedule_id,
        'Có yêu cầu đổi ca cần duyệt',
        'Hai nhân viên đã đồng ý đổi ca; yêu cầu đang chờ quản lý duyệt.',
        jsonb_build_object('swap_id',new.id,'status',new.status,'store_id',new.store_id),
        now(),true
      );

    elsif new.status='REJECTED' and new.approver_id is null and new.peer_responded_at is not null then
      perform public.enqueue_notification_v1(
        'swap:'||new.id||':peer_rejected:requester',
        'SHIFT_SWAP_PEER_REJECTED','USER',new.requester_id,new.store_id,auth.uid(),
        'SHIFT_SWAP',new.id,new.requester_schedule_id,
        'Người kia đã từ chối đổi ca',
        'Yêu cầu đổi ca của bạn đã bị người nhận từ chối.',
        jsonb_build_object('swap_id',new.id,'status',new.status,'store_id',new.store_id),
        now(),true
      );

    elsif new.status='REJECTED' and new.approver_id is not null then
      perform public.enqueue_notification_v1(
        'swap:'||new.id||':manager_rejected:requester',
        'SHIFT_SWAP_REJECTED','USER',new.requester_id,new.store_id,auth.uid(),
        'SHIFT_SWAP',new.id,new.requester_schedule_id,
        'Quản lý đã từ chối đổi ca',
        'Yêu cầu đổi ca của bạn đã bị quản lý từ chối.',
        jsonb_build_object('swap_id',new.id,'status',new.status,'store_id',new.store_id),
        now(),true
      );
      if new.target_user_id is not null then
        perform public.enqueue_notification_v1(
          'swap:'||new.id||':manager_rejected:target',
          'SHIFT_SWAP_REJECTED','USER',new.target_user_id,new.store_id,auth.uid(),
          'SHIFT_SWAP',new.id,new.target_schedule_id,
          'Quản lý đã từ chối đổi ca',
          'Yêu cầu đổi ca liên quan đến bạn đã bị quản lý từ chối.',
          jsonb_build_object('swap_id',new.id,'status',new.status,'store_id',new.store_id),
          now(),true
        );
      end if;

    elsif new.status='APPROVED' then
      perform public.enqueue_notification_v1(
        'swap:'||new.id||':approved:requester',
        'SHIFT_SWAP_APPROVED','USER',new.requester_id,new.store_id,auth.uid(),
        'SHIFT_SWAP',new.id,new.requester_schedule_id,
        'Đổi ca đã được duyệt',
        'Đổi ca đã hoàn tất và lịch chính thức của bạn đã được cập nhật.',
        jsonb_build_object('swap_id',new.id,'status',new.status,'store_id',new.store_id),
        now(),true
      );
      if new.target_user_id is not null then
        perform public.enqueue_notification_v1(
          'swap:'||new.id||':approved:target',
          'SHIFT_SWAP_APPROVED','USER',new.target_user_id,new.store_id,auth.uid(),
          'SHIFT_SWAP',new.id,new.target_schedule_id,
          'Đổi ca đã được duyệt',
          'Đổi ca đã hoàn tất và lịch chính thức của bạn đã được cập nhật.',
          jsonb_build_object('swap_id',new.id,'status',new.status,'store_id',new.store_id),
          now(),true
        );
      end if;

    elsif new.status='CANCELLED' and new.target_user_id is not null then
      perform public.enqueue_notification_v1(
        'swap:'||new.id||':cancelled:target',
        'SHIFT_SWAP_CANCELLED','USER',new.target_user_id,new.store_id,auth.uid(),
        'SHIFT_SWAP',new.id,new.target_schedule_id,
        'Yêu cầu đổi ca đã được hủy',
        'Người gửi đã hủy yêu cầu đổi ca.',
        jsonb_build_object('swap_id',new.id,'status',new.status,'store_id',new.store_id),
        now(),true
      );
    end if;
  end if;

  return new;
end;
$function$;

revoke execute on function public.validate_shift_swap_v1(uuid,uuid,uuid)
  from public,anon,authenticated;
revoke execute on function public.list_shift_swap_candidates_v1(uuid)
  from public,anon;
revoke execute on function public.submit_shift_swap_request(uuid,uuid,text)
  from public,anon;
revoke execute on function public.list_my_shift_swaps_v2()
  from public,anon;
revoke execute on function public.list_my_incoming_shift_swaps_v1()
  from public,anon;
revoke execute on function public.respond_shift_swap_request(uuid,boolean)
  from public,anon;
revoke execute on function public.list_shift_swap_requests_v1(uuid,text)
  from public,anon;
revoke execute on function public.approve_shift_swap(uuid)
  from public,anon;
revoke execute on function public.reject_shift_swap(uuid,text)
  from public,anon;
revoke execute on function public.cancel_shift_swap(uuid)
  from public,anon;
revoke execute on function public.notification_shift_swap_trigger_v1()
  from public,anon,authenticated;

grant execute on function public.list_shift_swap_candidates_v1(uuid) to authenticated;
grant execute on function public.submit_shift_swap_request(uuid,uuid,text) to authenticated;
grant execute on function public.list_my_shift_swaps_v2() to authenticated;
grant execute on function public.list_my_incoming_shift_swaps_v1() to authenticated;
grant execute on function public.respond_shift_swap_request(uuid,boolean) to authenticated;
grant execute on function public.list_shift_swap_requests_v1(uuid,text) to authenticated;
grant execute on function public.approve_shift_swap(uuid) to authenticated;
grant execute on function public.reject_shift_swap(uuid,text) to authenticated;
grant execute on function public.cancel_shift_swap(uuid) to authenticated;

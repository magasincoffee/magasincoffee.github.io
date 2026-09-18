-- TASK-033 / SFB-001
-- Production migration applied via Supabase as version 20260918112940.
-- Canonical lifecycle: giver submits -> recipient accepts -> Manager approves -> server transfers schedule.

create table public.shift_gives (
  id uuid primary key default gen_random_uuid(),
  requested_at timestamptz not null default now(),
  giver_id uuid not null references public.profiles(id),
  recipient_id uuid not null references public.profiles(id),
  schedule_id uuid not null references public.work_schedules(id),
  store_id uuid not null references public.stores(id),
  reason text not null,
  status text not null default 'PENDING_RECIPIENT'
    check (status in ('PENDING_RECIPIENT','PENDING_MANAGER','APPROVED','REJECTED_RECIPIENT','REJECTED_MANAGER')),
  recipient_responded_at timestamptz,
  manager_id uuid references public.profiles(id),
  resolved_at timestamptz,
  manager_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shift_gives_distinct_users check (giver_id <> recipient_id)
);

create index idx_shift_gives_giver on public.shift_gives(giver_id, requested_at desc);
create index idx_shift_gives_recipient on public.shift_gives(recipient_id, requested_at desc);
create index idx_shift_gives_store_status on public.shift_gives(store_id, status, requested_at desc);
create unique index uq_shift_gives_pending_schedule
  on public.shift_gives(schedule_id)
  where status in ('PENDING_RECIPIENT','PENDING_MANAGER');

alter table public.shift_gives enable row level security;

revoke all on table public.shift_gives from anon, authenticated;
grant select, insert, update, delete on table public.shift_gives to service_role;

create policy shift_gives_select
on public.shift_gives
for select
to authenticated
using (
  giver_id = (select auth.uid())
  or recipient_id = (select auth.uid())
  or public.current_user_role() = 'OWNER'
  or (
    public.current_user_role() = 'STORE_MANAGER'
    and public.can_access_store(store_id)
  )
);

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
begin
  select * into v_schedule
  from public.work_schedules
  where id = p_schedule_id;

  if v_schedule.id is null then
    v_violations := v_violations || jsonb_build_object('code','SCHEDULE_NOT_FOUND');
    return jsonb_build_object('valid',false,'violations',v_violations,'violation_count',jsonb_array_length(v_violations));
  end if;

  if v_schedule.user_id <> p_giver_user_id then
    v_violations := v_violations || jsonb_build_object('code','GIVER_SCHEDULE_NOT_OWNED');
  end if;
  if v_schedule.status <> 'APPROVED' then
    v_violations := v_violations || jsonb_build_object('code','SCHEDULE_NOT_APPROVED');
  end if;
  if p_recipient_user_id = p_giver_user_id then
    v_violations := v_violations || jsonb_build_object('code','SAME_EMPLOYEE_GIVE');
  end if;
  if not exists(
    select 1 from public.profiles
    where id=p_recipient_user_id and status='ACTIVE'
  ) then
    v_violations := v_violations || jsonb_build_object('code','RECIPIENT_INACTIVE');
  end if;
  if exists(
    select 1 from public.attendance a
    where a.schedule_id=v_schedule.id
      and a.status not in('DELETED','DELETED_BY_MANAGER')
  ) then
    v_violations := v_violations || jsonb_build_object('code','ATTENDANCE_ALREADY_EXISTS');
  end if;
  if not exists(
    select 1 from public.employee_availability ea
    where ea.user_id=p_recipient_user_id
      and ea.work_date=v_schedule.work_date
      and ea.availability_type in('AVAILABLE','PREFERRED')
      and ea.start_time<=v_schedule.start_time
      and ea.end_time>=v_schedule.end_time
  ) then
    v_violations := v_violations || jsonb_build_object('code','RECIPIENT_NOT_AVAILABLE');
  end if;
  if exists(
    select 1 from public.employee_availability ea
    where ea.user_id=p_recipient_user_id
      and ea.work_date=v_schedule.work_date
      and ea.availability_type='UNAVAILABLE'
      and ea.start_time<v_schedule.end_time
      and v_schedule.start_time<ea.end_time
  ) then
    v_violations := v_violations || jsonb_build_object('code','RECIPIENT_UNAVAILABLE');
  end if;
  if exists(
    select 1 from public.work_schedules ws
    where ws.user_id=p_recipient_user_id
      and ws.status in('PENDING','APPROVED')
      and ws.work_date=v_schedule.work_date
      and ws.start_time<v_schedule.end_time
      and v_schedule.start_time<ws.end_time
  ) then
    v_violations := v_violations || jsonb_build_object('code','RECIPIENT_RESULTING_OVERLAP');
  end if;
  if exists(
    select 1 from public.shift_swaps ss
    where ss.status='PENDING'
      and (ss.requester_schedule_id=v_schedule.id or ss.target_schedule_id=v_schedule.id)
  ) then
    v_violations := v_violations || jsonb_build_object('code','SCHEDULE_HAS_PENDING_SWAP');
  end if;

  select coalesce(max(max_daily_hours),0),coalesce(max(max_weekly_hours),0)
    into v_daily_cap,v_weekly_cap
  from public.employee_constraints
  where user_id=p_recipient_user_id and status='ACTIVE';

  select coalesce(sum(extract(epoch from(ws.end_time-ws.start_time))/3600.0),0)
    into v_daily
  from public.work_schedules ws
  where ws.user_id=p_recipient_user_id
    and ws.work_date=v_schedule.work_date
    and ws.status in('PENDING','APPROVED');

  v_daily := v_daily + extract(epoch from(v_schedule.end_time-v_schedule.start_time))/3600.0;

  v_week_start := v_schedule.work_date-(extract(isodow from v_schedule.work_date)::integer-1);

  select coalesce(sum(extract(epoch from(ws.end_time-ws.start_time))/3600.0),0)
    into v_weekly
  from public.work_schedules ws
  where ws.user_id=p_recipient_user_id
    and ws.work_date between v_week_start and v_week_start+6
    and ws.status in('PENDING','APPROVED');

  v_weekly := v_weekly + extract(epoch from(v_schedule.end_time-v_schedule.start_time))/3600.0;

  if v_daily_cap>0 and v_daily>v_daily_cap then
    v_violations := v_violations || jsonb_build_object('code','RECIPIENT_DAILY_HOURS_LIMIT','hours',v_daily,'limit',v_daily_cap);
  end if;
  if v_weekly_cap>0 and v_weekly>v_weekly_cap then
    v_violations := v_violations || jsonb_build_object('code','RECIPIENT_WEEKLY_HOURS_LIMIT','hours',v_weekly,'limit',v_weekly_cap);
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

  return query
  select p.id,p.full_name,v_schedule.work_date,v_schedule.start_time,v_schedule.end_time,
         v_schedule.store_id,s.code,s.name
  from public.profiles p
  join public.stores s on s.id=v_schedule.store_id
  where p.id<>auth.uid()
    and p.status='ACTIVE'
    and coalesce((public.validate_shift_give_v1(v_schedule.id,p.id,auth.uid())->>'valid')::boolean,false)
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
  if nullif(trim(coalesce(p_reason,'')),'') is null then raise exception 'REASON_REQUIRED'; end if;

  select * into v_schedule
  from public.work_schedules
  where id=p_schedule_id;

  if v_schedule.id is null
     or v_schedule.user_id<>auth.uid()
     or v_schedule.status<>'APPROVED' then
    raise exception 'GIVER_SCHEDULE_NOT_OWNED';
  end if;

  v_validation := public.validate_shift_give_v1(p_schedule_id,p_recipient_user_id,auth.uid());
  if not coalesce((v_validation->>'valid')::boolean,false) then
    raise exception 'SHIFT_GIVE_VALIDATION_FAILED: %',v_validation->'violations';
  end if;

  if exists(
    select 1 from public.shift_gives
    where schedule_id=p_schedule_id
      and status in('PENDING_RECIPIENT','PENDING_MANAGER')
  ) then
    raise exception 'SHIFT_GIVE_ALREADY_PENDING';
  end if;

  insert into public.shift_gives(
    giver_id,recipient_id,schedule_id,store_id,reason,status
  )
  values(
    auth.uid(),p_recipient_user_id,p_schedule_id,v_schedule.store_id,trim(p_reason),'PENDING_RECIPIENT'
  )
  returning id into v_id;

  return v_id;
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
  v_validation jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_give
  from public.shift_gives
  where id=p_give_id
  for update;

  if not found then raise exception 'SHIFT_GIVE_NOT_FOUND'; end if;
  if v_give.recipient_id<>auth.uid() then raise exception 'RECIPIENT_NOT_ALLOWED'; end if;
  if v_give.status<>'PENDING_RECIPIENT' then raise exception 'SHIFT_GIVE_NOT_PENDING_RECIPIENT'; end if;

  if not coalesce(p_accept,false) then
    update public.shift_gives
      set status='REJECTED_RECIPIENT',
          recipient_responded_at=now(),
          resolved_at=now(),
          updated_at=now()
    where id=p_give_id and status='PENDING_RECIPIENT';

    return jsonb_build_object('id',p_give_id,'status','REJECTED_RECIPIENT');
  end if;

  v_validation := public.validate_shift_give_v1(v_give.schedule_id,v_give.recipient_id,v_give.giver_id);
  if not coalesce((v_validation->>'valid')::boolean,false) then
    raise exception 'SHIFT_GIVE_REVALIDATION_FAILED: %',v_validation->'violations';
  end if;

  update public.shift_gives
    set status='PENDING_MANAGER',
        recipient_responded_at=now(),
        updated_at=now()
  where id=p_give_id and status='PENDING_RECIPIENT';

  if not found then raise exception 'SHIFT_GIVE_RESPONSE_CONFLICT'; end if;

  return jsonb_build_object('id',p_give_id,'status','PENDING_MANAGER');
end;
$function$;

create or replace function public.list_my_shift_gives_v1()
returns table(
  id uuid,
  requested_at timestamptz,
  status text,
  reason text,
  giver_id uuid,
  giver_name text,
  recipient_id uuid,
  recipient_name text,
  schedule_id uuid,
  work_date date,
  start_time time without time zone,
  end_time time without time zone,
  store_id uuid,
  store_code text,
  store_name text,
  recipient_responded_at timestamptz,
  manager_id uuid,
  resolved_at timestamptz,
  manager_note text
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select g.id,g.requested_at,g.status,g.reason,
         g.giver_id,pg.full_name,
         g.recipient_id,pr.full_name,
         g.schedule_id,ws.work_date,ws.start_time,ws.end_time,
         g.store_id,s.code,s.name,
         g.recipient_responded_at,g.manager_id,g.resolved_at,g.manager_note
  from public.shift_gives g
  join public.profiles pg on pg.id=g.giver_id
  join public.profiles pr on pr.id=g.recipient_id
  join public.work_schedules ws on ws.id=g.schedule_id
  join public.stores s on s.id=g.store_id
  where auth.uid() is not null
    and auth.uid() in(g.giver_id,g.recipient_id)
  order by g.requested_at desc,g.id desc;
$function$;

create or replace function public.list_shift_give_requests_v1(
  p_store_id uuid default null,
  p_status text default 'PENDING_MANAGER'
)
returns table(
  id uuid,
  requested_at timestamptz,
  status text,
  reason text,
  giver_id uuid,
  giver_name text,
  recipient_id uuid,
  recipient_name text,
  schedule_id uuid,
  work_date date,
  start_time time without time zone,
  end_time time without time zone,
  store_id uuid,
  store_code text,
  store_name text,
  recipient_responded_at timestamptz
)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if public.current_user_role() not in('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;

  return query
  select g.id,g.requested_at,g.status,g.reason,
         g.giver_id,pg.full_name,
         g.recipient_id,pr.full_name,
         g.schedule_id,ws.work_date,ws.start_time,ws.end_time,
         g.store_id,s.code,s.name,g.recipient_responded_at
  from public.shift_gives g
  join public.profiles pg on pg.id=g.giver_id
  join public.profiles pr on pr.id=g.recipient_id
  join public.work_schedules ws on ws.id=g.schedule_id
  join public.stores s on s.id=g.store_id
  where (p_store_id is null or g.store_id=p_store_id)
    and (p_status is null or g.status=p_status)
    and (
      public.current_user_role()='OWNER'
      or public.can_access_store(g.store_id)
    )
  order by g.requested_at asc,g.id asc;
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
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if public.current_user_role() not in('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;

  select * into v_give
  from public.shift_gives
  where id=p_give_id
  for update;

  if not found then raise exception 'SHIFT_GIVE_NOT_FOUND'; end if;
  if v_give.status<>'PENDING_MANAGER' then raise exception 'SHIFT_GIVE_NOT_PENDING_MANAGER'; end if;
  if public.current_user_role()='STORE_MANAGER' and not public.can_access_store(v_give.store_id) then
    raise exception 'STORE_NOT_ALLOWED';
  end if;

  select * into v_schedule
  from public.work_schedules
  where id=v_give.schedule_id
  for update;

  if v_schedule.id is null then raise exception 'SCHEDULE_NOT_FOUND'; end if;
  if v_schedule.user_id<>v_give.giver_id then raise exception 'GIVER_OWNERSHIP_CHANGED'; end if;
  if v_schedule.status<>'APPROVED' then raise exception 'SCHEDULE_NOT_APPROVED'; end if;

  v_validation := public.validate_shift_give_v1(v_give.schedule_id,v_give.recipient_id,v_give.giver_id);
  if not coalesce((v_validation->>'valid')::boolean,false) then
    raise exception 'SHIFT_GIVE_REVALIDATION_FAILED: %',v_validation->'violations';
  end if;

  update public.work_schedules
    set user_id=v_give.recipient_id,
        note=concat_ws(E'\n',nullif(note,''),'Shift give approved #'||p_give_id::text),
        updated_at=now()
  where id=v_schedule.id and user_id=v_give.giver_id;

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
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if public.current_user_role() not in('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;

  select * into v_give
  from public.shift_gives
  where id=p_give_id
  for update;

  if not found then raise exception 'SHIFT_GIVE_NOT_FOUND'; end if;
  if v_give.status<>'PENDING_MANAGER' then raise exception 'SHIFT_GIVE_NOT_PENDING_MANAGER'; end if;
  if public.current_user_role()='STORE_MANAGER' and not public.can_access_store(v_give.store_id) then
    raise exception 'STORE_NOT_ALLOWED';
  end if;

  update public.shift_gives
    set status='REJECTED_MANAGER',
        manager_id=auth.uid(),
        resolved_at=now(),
        manager_note=concat_ws(E'\n',nullif(manager_note,''),nullif(p_note,'')),
        updated_at=now()
  where id=p_give_id and status='PENDING_MANAGER';

  if not found then raise exception 'SHIFT_GIVE_REJECTION_CONFLICT'; end if;

  return jsonb_build_object('id',p_give_id,'status','REJECTED_MANAGER');
end;
$function$;

-- Prevent a schedule with a pending Give from entering a Swap.
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
  if not exists(select 1 from public.profiles where id=v_req.user_id and status='ACTIVE') then v_violations:=v_violations||jsonb_build_object('code','REQUESTER_INACTIVE'); end if;
  if not exists(select 1 from public.profiles where id=v_target.user_id and status='ACTIVE') then v_violations:=v_violations||jsonb_build_object('code','TARGET_INACTIVE'); end if;
  if exists(select 1 from public.attendance a where a.schedule_id in(v_req.id,v_target.id) and a.status not in('DELETED','DELETED_BY_MANAGER')) then
    v_violations:=v_violations||jsonb_build_object('code','ATTENDANCE_ALREADY_EXISTS');
  end if;

  if exists(
    select 1 from public.shift_gives g
    where g.status in('PENDING_RECIPIENT','PENDING_MANAGER')
      and g.schedule_id in(v_req.id,v_target.id)
  ) then
    v_violations:=v_violations||jsonb_build_object('code','SCHEDULE_HAS_PENDING_GIVE');
  end if;

  if not exists(select 1 from public.employee_availability ea where ea.user_id=v_req.user_id and ea.work_date=v_target.work_date and ea.availability_type in('AVAILABLE','PREFERRED') and ea.start_time<=v_target.start_time and ea.end_time>=v_target.end_time) then
    v_violations:=v_violations||jsonb_build_object('code','REQUESTER_NOT_AVAILABLE_FOR_TARGET_SHIFT');
  end if;
  if exists(select 1 from public.employee_availability ea where ea.user_id=v_req.user_id and ea.work_date=v_target.work_date and ea.availability_type='UNAVAILABLE' and ea.start_time<v_target.end_time and v_target.start_time<ea.end_time) then
    v_violations:=v_violations||jsonb_build_object('code','REQUESTER_UNAVAILABLE_FOR_TARGET_SHIFT');
  end if;
  if not exists(select 1 from public.employee_availability ea where ea.user_id=v_target.user_id and ea.work_date=v_req.work_date and ea.availability_type in('AVAILABLE','PREFERRED') and ea.start_time<=v_req.start_time and ea.end_time>=v_req.end_time) then
    v_violations:=v_violations||jsonb_build_object('code','TARGET_NOT_AVAILABLE_FOR_REQUESTER_SHIFT');
  end if;
  if exists(select 1 from public.employee_availability ea where ea.user_id=v_target.user_id and ea.work_date=v_req.work_date and ea.availability_type='UNAVAILABLE' and ea.start_time<v_req.end_time and v_req.start_time<ea.end_time) then
    v_violations:=v_violations||jsonb_build_object('code','TARGET_UNAVAILABLE_FOR_REQUESTER_SHIFT');
  end if;
  if exists(select 1 from public.work_schedules ws where ws.user_id=v_req.user_id and ws.id not in(v_req.id,v_target.id) and ws.status in('PENDING','APPROVED') and ws.work_date=v_req.work_date and ws.start_time<v_target.end_time and v_target.start_time<ws.end_time) then
    v_violations:=v_violations||jsonb_build_object('code','REQUESTER_RESULTING_OVERLAP');
  end if;
  if exists(select 1 from public.work_schedules ws where ws.user_id=v_target.user_id and ws.id not in(v_req.id,v_target.id) and ws.status in('PENDING','APPROVED') and ws.work_date=v_target.work_date and ws.start_time<v_req.end_time and v_req.start_time<ws.end_time) then
    v_violations:=v_violations||jsonb_build_object('code','TARGET_RESULTING_OVERLAP');
  end if;

  select coalesce(max(max_daily_hours),0),coalesce(max(max_weekly_hours),0)
    into v_req_daily_cap,v_req_weekly_cap
  from public.employee_constraints where user_id=v_req.user_id and status='ACTIVE';
  select coalesce(max(max_daily_hours),0),coalesce(max(max_weekly_hours),0)
    into v_target_daily_cap,v_target_weekly_cap
  from public.employee_constraints where user_id=v_target.user_id and status='ACTIVE';

  select coalesce(sum(extract(epoch from(ws.end_time-ws.start_time))/3600.0),0) into v_req_daily
  from public.work_schedules ws
  where ws.user_id=v_req.user_id and ws.work_date=v_req.work_date and ws.status in('PENDING','APPROVED') and ws.id<>v_req.id;
  v_req_daily:=v_req_daily+extract(epoch from(v_target.end_time-v_target.start_time))/3600.0;

  select coalesce(sum(extract(epoch from(ws.end_time-ws.start_time))/3600.0),0) into v_target_daily
  from public.work_schedules ws
  where ws.user_id=v_target.user_id and ws.work_date=v_target.work_date and ws.status in('PENDING','APPROVED') and ws.id<>v_target.id;
  v_target_daily:=v_target_daily+extract(epoch from(v_req.end_time-v_req.start_time))/3600.0;

  v_week_start:=v_req.work_date-(extract(isodow from v_req.work_date)::integer-1);

  select coalesce(sum(extract(epoch from(ws.end_time-ws.start_time))/3600.0),0) into v_req_weekly
  from public.work_schedules ws
  where ws.user_id=v_req.user_id and ws.work_date between v_week_start and v_week_start+6 and ws.status in('PENDING','APPROVED') and ws.id<>v_req.id;
  v_req_weekly:=v_req_weekly+extract(epoch from(v_target.end_time-v_target.start_time))/3600.0;

  select coalesce(sum(extract(epoch from(ws.end_time-ws.start_time))/3600.0),0) into v_target_weekly
  from public.work_schedules ws
  where ws.user_id=v_target.user_id and ws.work_date between v_week_start and v_week_start+6 and ws.status in('PENDING','APPROVED') and ws.id<>v_target.id;
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

  return jsonb_build_object('valid',jsonb_array_length(v_violations)=0,'violations',v_violations,'violation_count',jsonb_array_length(v_violations));
end;
$function$;

revoke execute on function public.validate_shift_give_v1(uuid,uuid,uuid) from public,anon,authenticated;
revoke execute on function public.list_shift_give_candidates_v1(uuid) from public,anon;
revoke execute on function public.submit_shift_give_request(uuid,uuid,text) from public,anon;
revoke execute on function public.respond_shift_give_request(uuid,boolean) from public,anon;
revoke execute on function public.list_my_shift_gives_v1() from public,anon;
revoke execute on function public.list_shift_give_requests_v1(uuid,text) from public,anon;
revoke execute on function public.approve_shift_give(uuid) from public,anon;
revoke execute on function public.reject_shift_give(uuid,text) from public,anon;

grant execute on function public.list_shift_give_candidates_v1(uuid) to authenticated;
grant execute on function public.submit_shift_give_request(uuid,uuid,text) to authenticated;
grant execute on function public.respond_shift_give_request(uuid,boolean) to authenticated;
grant execute on function public.list_my_shift_gives_v1() to authenticated;
grant execute on function public.list_shift_give_requests_v1(uuid,text) to authenticated;
grant execute on function public.approve_shift_give(uuid) to authenticated;
grant execute on function public.reject_shift_give(uuid,text) to authenticated;

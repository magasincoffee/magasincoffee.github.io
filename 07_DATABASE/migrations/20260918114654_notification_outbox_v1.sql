-- TASK-034 / SFB-002
-- Production migration applied via Supabase as version 20260918114654.
-- Durable event outbox for schedule / attendance / Swap / Give notifications.
-- Email provider activation remains TASK-035.

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  event_type text not null check (event_type ~ '^[A-Z0-9_]+$'),
  audience_type text not null check (audience_type in ('USER','STORE_MANAGERS','OWNER')),
  recipient_user_id uuid references public.profiles(id),
  store_id uuid references public.stores(id),
  actor_user_id uuid references public.profiles(id),
  entity_type text not null,
  entity_id uuid not null,
  related_schedule_id uuid references public.work_schedules(id),
  title text not null,
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  available_at timestamptz not null default now(),
  email_required boolean not null default true,
  email_status text not null default 'PENDING'
    check (email_status in ('PENDING','PROCESSING','SENT','FAILED','SKIPPED','CANCELLED')),
  email_attempts integer not null default 0 check (email_attempts >= 0),
  email_last_error text,
  email_processing_started_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_outbox_audience_check check (
    (audience_type='USER' and recipient_user_id is not null)
    or (audience_type='STORE_MANAGERS' and store_id is not null)
    or audience_type='OWNER'
  )
);

create index idx_notification_outbox_user_available
  on public.notification_outbox(recipient_user_id,available_at desc)
  where audience_type='USER';
create index idx_notification_outbox_store_available
  on public.notification_outbox(store_id,available_at desc)
  where audience_type='STORE_MANAGERS';
create index idx_notification_outbox_email_queue
  on public.notification_outbox(email_status,available_at,created_at)
  where email_required;
create index idx_notification_outbox_event_created
  on public.notification_outbox(event_type,created_at desc);

alter table public.notification_outbox enable row level security;

revoke all on table public.notification_outbox from anon,authenticated;
grant select,insert,update,delete on table public.notification_outbox to service_role;

create policy notification_outbox_select
on public.notification_outbox
for select
to authenticated
using (
  (audience_type='USER' and recipient_user_id=(select auth.uid()))
  or (
    audience_type='STORE_MANAGERS'
    and public.current_user_role()='STORE_MANAGER'
    and public.can_access_store(store_id)
  )
  or (
    audience_type='OWNER'
    and public.current_user_role()='OWNER'
  )
);

create trigger trg_notification_outbox_updated_at
before update on public.notification_outbox
for each row execute function public.set_updated_at();

create or replace function public.enqueue_notification_v1(
  p_event_key text,
  p_event_type text,
  p_audience_type text,
  p_recipient_user_id uuid,
  p_store_id uuid,
  p_actor_user_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_related_schedule_id uuid,
  p_title text,
  p_message text,
  p_payload jsonb default '{}'::jsonb,
  p_available_at timestamptz default now(),
  p_email_required boolean default true
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid;
  v_email_status text;
begin
  if nullif(trim(coalesce(p_event_key,'')),'') is null then raise exception 'EVENT_KEY_REQUIRED'; end if;
  if nullif(trim(coalesce(p_event_type,'')),'') is null then raise exception 'EVENT_TYPE_REQUIRED'; end if;
  if p_audience_type not in('USER','STORE_MANAGERS','OWNER') then raise exception 'AUDIENCE_TYPE_INVALID'; end if;
  if p_audience_type='USER' and p_recipient_user_id is null then raise exception 'RECIPIENT_REQUIRED'; end if;
  if p_audience_type='STORE_MANAGERS' and p_store_id is null then raise exception 'STORE_REQUIRED'; end if;

  v_email_status := case when p_email_required then 'PENDING' else 'SKIPPED' end;

  insert into public.notification_outbox(
    event_key,event_type,audience_type,recipient_user_id,store_id,actor_user_id,
    entity_type,entity_id,related_schedule_id,title,message,payload,available_at,
    email_required,email_status
  )
  values(
    p_event_key,p_event_type,p_audience_type,p_recipient_user_id,p_store_id,p_actor_user_id,
    p_entity_type,p_entity_id,p_related_schedule_id,p_title,p_message,coalesce(p_payload,'{}'::jsonb),
    coalesce(p_available_at,now()),p_email_required,v_email_status
  )
  on conflict(event_key) do update
    set event_type=excluded.event_type,
        audience_type=excluded.audience_type,
        recipient_user_id=excluded.recipient_user_id,
        store_id=excluded.store_id,
        actor_user_id=excluded.actor_user_id,
        entity_type=excluded.entity_type,
        entity_id=excluded.entity_id,
        related_schedule_id=excluded.related_schedule_id,
        title=excluded.title,
        message=excluded.message,
        payload=excluded.payload,
        available_at=excluded.available_at,
        email_required=excluded.email_required,
        email_status=case
          when public.notification_outbox.email_status='SENT' then 'SENT'
          else excluded.email_status
        end,
        email_attempts=case
          when public.notification_outbox.email_status='SENT' then public.notification_outbox.email_attempts
          else 0
        end,
        email_last_error=case
          when public.notification_outbox.email_status='SENT' then public.notification_outbox.email_last_error
          else null
        end,
        email_processing_started_at=null,
        updated_at=now()
  returning id into v_id;

  return v_id;
end;
$function$;

create or replace function public.list_my_notifications_v1(p_limit integer default 50)
returns table(
  id uuid,
  event_type text,
  audience_type text,
  title text,
  message text,
  payload jsonb,
  available_at timestamptz,
  created_at timestamptz,
  entity_type text,
  entity_id uuid,
  related_schedule_id uuid,
  store_id uuid
)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_role text;
  v_limit integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  v_role:=public.current_user_role();
  v_limit:=least(greatest(coalesce(p_limit,50),1),100);

  return query
  select n.id,n.event_type,n.audience_type,n.title,n.message,n.payload,
         n.available_at,n.created_at,n.entity_type,n.entity_id,n.related_schedule_id,n.store_id
  from public.notification_outbox n
  where n.available_at<=now()
    and n.email_status<>'CANCELLED'
    and (
      (n.audience_type='USER' and n.recipient_user_id=auth.uid())
      or (n.audience_type='STORE_MANAGERS' and v_role='STORE_MANAGER' and public.can_access_store(n.store_id))
      or (n.audience_type='OWNER' and v_role='OWNER')
    )
  order by n.available_at desc,n.created_at desc,n.id desc
  limit v_limit;
end;
$function$;

create or replace function public.claim_notification_email_batch_v1(p_limit integer default 50)
returns setof public.notification_outbox
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_limit integer;
begin
  v_limit:=least(greatest(coalesce(p_limit,50),1),100);

  return query
  with picked as (
    select n.id
    from public.notification_outbox n
    where n.email_required
      and n.available_at<=now()
      and n.email_attempts<5
      and (
        n.email_status in('PENDING','FAILED')
        or (
          n.email_status='PROCESSING'
          and n.email_processing_started_at<now()-interval '10 minutes'
        )
      )
    order by n.available_at,n.created_at,n.id
    for update skip locked
    limit v_limit
  )
  update public.notification_outbox n
     set email_status='PROCESSING',
         email_attempts=n.email_attempts+1,
         email_processing_started_at=now(),
         updated_at=now()
  from picked
  where n.id=picked.id
  returning n.*;
end;
$function$;

create or replace function public.complete_notification_email_v1(
  p_notification_id uuid,
  p_success boolean,
  p_error text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_row public.notification_outbox%rowtype;
begin
  select * into v_row
  from public.notification_outbox
  where id=p_notification_id
  for update;

  if not found then raise exception 'NOTIFICATION_NOT_FOUND'; end if;
  if v_row.email_status<>'PROCESSING' then raise exception 'NOTIFICATION_NOT_PROCESSING'; end if;

  if coalesce(p_success,false) then
    update public.notification_outbox
       set email_status='SENT',
           email_sent_at=now(),
           email_last_error=null,
           email_processing_started_at=null,
           updated_at=now()
     where id=p_notification_id;
  else
    update public.notification_outbox
       set email_status='FAILED',
           email_last_error=nullif(left(coalesce(p_error,'UNKNOWN_ERROR'),1000),''),
           email_processing_started_at=null,
           available_at=now()+interval '5 minutes',
           updated_at=now()
     where id=p_notification_id;
  end if;

  return jsonb_build_object(
    'id',p_notification_id,
    'email_status',case when coalesce(p_success,false) then 'SENT' else 'FAILED' end
  );
end;
$function$;

create or replace function public.notification_schedule_trigger_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_end_at timestamptz;
  v_stamp text;
begin
  v_stamp:=to_char(coalesce(new.updated_at,now()) at time zone 'UTC','YYYYMMDDHH24MISSUS');

  if new.status='APPROVED' and (tg_op='INSERT' or old.status is distinct from new.status) then
    perform public.enqueue_notification_v1(
      'schedule:'||new.id||':published',
      'SCHEDULE_PUBLISHED','USER',new.user_id,new.store_id,auth.uid(),
      'WORK_SCHEDULE',new.id,new.id,
      'Lịch làm đã được phát hành',
      'Ca '||to_char(new.work_date,'DD/MM/YYYY')||' · '||to_char(new.start_time,'HH24:MI')||'–'||to_char(new.end_time,'HH24:MI')||' đã được phát hành.',
      jsonb_build_object('work_date',new.work_date,'start_time',new.start_time,'end_time',new.end_time,'store_id',new.store_id),
      now(),true
    );

    v_end_at:=((new.work_date+new.end_time) at time zone 'Asia/Ho_Chi_Minh');
    perform public.enqueue_notification_v1(
      'schedule:'||new.id||':clock_out_reminder:'||new.user_id,
      'CLOCK_OUT_REMINDER','USER',new.user_id,new.store_id,auth.uid(),
      'WORK_SCHEDULE',new.id,new.id,
      'Nhắc chấm công ra ca',
      'Ca '||to_char(new.work_date,'DD/MM/YYYY')||' kết thúc lúc '||to_char(new.end_time,'HH24:MI')||'. Hãy chấm công ra ca.',
      jsonb_build_object('work_date',new.work_date,'end_time',new.end_time,'store_id',new.store_id),
      v_end_at,true
    );
  end if;

  if tg_op='UPDATE' and old.user_id is distinct from new.user_id and new.status='APPROVED' then
    update public.notification_outbox
       set email_status='CANCELLED',updated_at=now()
     where event_type='CLOCK_OUT_REMINDER'
       and related_schedule_id=new.id
       and recipient_user_id=old.user_id
       and email_status in('PENDING','FAILED','PROCESSING');

    perform public.enqueue_notification_v1(
      'schedule:'||new.id||':transfer:'||old.user_id||':'||new.user_id||':'||v_stamp||':out',
      'SCHEDULE_TRANSFERRED_OUT','USER',old.user_id,new.store_id,auth.uid(),
      'WORK_SCHEDULE',new.id,new.id,
      'Ca làm đã được chuyển',
      'Ca '||to_char(new.work_date,'DD/MM/YYYY')||' · '||to_char(new.start_time,'HH24:MI')||'–'||to_char(new.end_time,'HH24:MI')||' không còn thuộc lịch của bạn.',
      jsonb_build_object('work_date',new.work_date,'start_time',new.start_time,'end_time',new.end_time,'store_id',new.store_id),
      now(),true
    );
    perform public.enqueue_notification_v1(
      'schedule:'||new.id||':transfer:'||old.user_id||':'||new.user_id||':'||v_stamp||':in',
      'SCHEDULE_TRANSFERRED_IN','USER',new.user_id,new.store_id,auth.uid(),
      'WORK_SCHEDULE',new.id,new.id,
      'Bạn đã nhận một ca làm',
      'Bạn đã nhận ca '||to_char(new.work_date,'DD/MM/YYYY')||' · '||to_char(new.start_time,'HH24:MI')||'–'||to_char(new.end_time,'HH24:MI')||'.',
      jsonb_build_object('work_date',new.work_date,'start_time',new.start_time,'end_time',new.end_time,'store_id',new.store_id),
      now(),true
    );

    v_end_at:=((new.work_date+new.end_time) at time zone 'Asia/Ho_Chi_Minh');
    perform public.enqueue_notification_v1(
      'schedule:'||new.id||':clock_out_reminder:'||new.user_id,
      'CLOCK_OUT_REMINDER','USER',new.user_id,new.store_id,auth.uid(),
      'WORK_SCHEDULE',new.id,new.id,
      'Nhắc chấm công ra ca',
      'Ca '||to_char(new.work_date,'DD/MM/YYYY')||' kết thúc lúc '||to_char(new.end_time,'HH24:MI')||'. Hãy chấm công ra ca.',
      jsonb_build_object('work_date',new.work_date,'end_time',new.end_time,'store_id',new.store_id),
      v_end_at,true
    );
  end if;

  if tg_op='UPDATE'
     and new.status='APPROVED'
     and not (old.user_id is distinct from new.user_id)
     and (
       old.work_date is distinct from new.work_date
       or old.start_time is distinct from new.start_time
       or old.end_time is distinct from new.end_time
       or old.store_id is distinct from new.store_id
     ) then
    perform public.enqueue_notification_v1(
      'schedule:'||new.id||':changed:'||v_stamp,
      'SCHEDULE_CHANGED','USER',new.user_id,new.store_id,auth.uid(),
      'WORK_SCHEDULE',new.id,new.id,
      'Lịch làm đã thay đổi',
      'Ca của bạn được cập nhật: '||to_char(new.work_date,'DD/MM/YYYY')||' · '||to_char(new.start_time,'HH24:MI')||'–'||to_char(new.end_time,'HH24:MI')||'.',
      jsonb_build_object('work_date',new.work_date,'start_time',new.start_time,'end_time',new.end_time,'store_id',new.store_id),
      now(),true
    );
    v_end_at:=((new.work_date+new.end_time) at time zone 'Asia/Ho_Chi_Minh');
    perform public.enqueue_notification_v1(
      'schedule:'||new.id||':clock_out_reminder:'||new.user_id,
      'CLOCK_OUT_REMINDER','USER',new.user_id,new.store_id,auth.uid(),
      'WORK_SCHEDULE',new.id,new.id,
      'Nhắc chấm công ra ca',
      'Ca '||to_char(new.work_date,'DD/MM/YYYY')||' kết thúc lúc '||to_char(new.end_time,'HH24:MI')||'. Hãy chấm công ra ca.',
      jsonb_build_object('work_date',new.work_date,'end_time',new.end_time,'store_id',new.store_id),
      v_end_at,true
    );
  end if;

  if tg_op='UPDATE' and old.status='APPROVED' and new.status='CANCELLED' then
    update public.notification_outbox
       set email_status='CANCELLED',updated_at=now()
     where event_type='CLOCK_OUT_REMINDER'
       and related_schedule_id=new.id
       and email_status in('PENDING','FAILED','PROCESSING');

    perform public.enqueue_notification_v1(
      'schedule:'||new.id||':cancelled',
      'SCHEDULE_CANCELLED','USER',new.user_id,new.store_id,auth.uid(),
      'WORK_SCHEDULE',new.id,new.id,
      'Ca làm đã bị hủy',
      'Ca '||to_char(new.work_date,'DD/MM/YYYY')||' · '||to_char(new.start_time,'HH24:MI')||'–'||to_char(new.end_time,'HH24:MI')||' đã bị hủy.',
      jsonb_build_object('work_date',new.work_date,'start_time',new.start_time,'end_time',new.end_time,'store_id',new.store_id),
      now(),true
    );
  end if;

  return new;
end;
$function$;

create or replace function public.notification_attendance_trigger_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.check_in is not null and (tg_op='INSERT' or old.check_in is null) then
    perform public.enqueue_notification_v1(
      'attendance:'||new.id||':clock_in',
      'ATTENDANCE_CLOCKED_IN','USER',new.user_id,new.store_id,auth.uid(),
      'ATTENDANCE',new.id,new.schedule_id,
      'Đã chấm công vào ca',
      'Chấm công vào ca lúc '||to_char(new.check_in at time zone 'Asia/Ho_Chi_Minh','HH24:MI')||'.',
      jsonb_build_object('work_date',new.work_date,'check_in',new.check_in,'store_id',new.store_id),
      now(),false
    );
  end if;

  if new.check_out is not null and (tg_op='INSERT' or old.check_out is null) then
    if new.schedule_id is not null then
      update public.notification_outbox
         set email_status='CANCELLED',updated_at=now()
       where event_type='CLOCK_OUT_REMINDER'
         and related_schedule_id=new.schedule_id
         and recipient_user_id=new.user_id
         and email_status in('PENDING','FAILED','PROCESSING');
    end if;

    perform public.enqueue_notification_v1(
      'attendance:'||new.id||':clock_out',
      'ATTENDANCE_CLOCKED_OUT','USER',new.user_id,new.store_id,auth.uid(),
      'ATTENDANCE',new.id,new.schedule_id,
      'Đã chấm công ra ca',
      'Chấm công ra ca lúc '||to_char(new.check_out at time zone 'Asia/Ho_Chi_Minh','HH24:MI')||'.',
      jsonb_build_object('work_date',new.work_date,'check_out',new.check_out,'store_id',new.store_id),
      now(),false
    );
  end if;

  return new;
end;
$function$;

create or replace function public.notification_shift_swap_trigger_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_type text;
  v_label text;
begin
  if tg_op='INSERT' and new.status='PENDING' then
    if new.target_user_id is not null then
      perform public.enqueue_notification_v1(
        'swap:'||new.id||':requested:target',
        'SHIFT_SWAP_REQUESTED','USER',new.target_user_id,new.store_id,auth.uid(),
        'SHIFT_SWAP',new.id,new.target_schedule_id,
        'Có yêu cầu đổi ca liên quan đến bạn',
        'Một yêu cầu đổi ca đang chờ quản lý xem xét.',
        jsonb_build_object('swap_id',new.id,'store_id',new.store_id),
        now(),true
      );
    end if;
    perform public.enqueue_notification_v1(
      'swap:'||new.id||':manager_review',
      'SHIFT_SWAP_MANAGER_REVIEW','STORE_MANAGERS',null,new.store_id,auth.uid(),
      'SHIFT_SWAP',new.id,new.requester_schedule_id,
      'Có yêu cầu đổi ca mới',
      'Một yêu cầu đổi ca đang chờ quản lý duyệt.',
      jsonb_build_object('swap_id',new.id,'store_id',new.store_id),
      now(),true
    );
  end if;

  if tg_op='UPDATE' and old.status is distinct from new.status
     and new.status in('APPROVED','REJECTED','CANCELLED') then
    v_type:='SHIFT_SWAP_'||new.status;
    v_label:=case new.status when 'APPROVED' then 'đã được duyệt' when 'REJECTED' then 'đã bị từ chối' else 'đã bị hủy' end;

    perform public.enqueue_notification_v1(
      'swap:'||new.id||':'||lower(new.status)||':requester',
      v_type,'USER',new.requester_id,new.store_id,auth.uid(),
      'SHIFT_SWAP',new.id,new.requester_schedule_id,
      'Yêu cầu đổi ca '||v_label,
      'Yêu cầu đổi ca của bạn '||v_label||'.',
      jsonb_build_object('swap_id',new.id,'status',new.status,'store_id',new.store_id),
      now(),true
    );

    if new.target_user_id is not null then
      perform public.enqueue_notification_v1(
        'swap:'||new.id||':'||lower(new.status)||':target',
        v_type,'USER',new.target_user_id,new.store_id,auth.uid(),
        'SHIFT_SWAP',new.id,new.target_schedule_id,
        'Yêu cầu đổi ca '||v_label,
        'Yêu cầu đổi ca liên quan đến bạn '||v_label||'.',
        jsonb_build_object('swap_id',new.id,'status',new.status,'store_id',new.store_id),
        now(),true
      );
    end if;
  end if;

  return new;
end;
$function$;

create or replace function public.notification_shift_give_trigger_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if tg_op='INSERT' and new.status='PENDING_RECIPIENT' then
    perform public.enqueue_notification_v1(
      'give:'||new.id||':recipient_request',
      'SHIFT_GIVE_REQUESTED','USER',new.recipient_id,new.store_id,auth.uid(),
      'SHIFT_GIVE',new.id,new.schedule_id,
      'Có người muốn cho bạn một ca',
      'Bạn có một yêu cầu nhận ca đang chờ phản hồi.',
      jsonb_build_object('give_id',new.id,'store_id',new.store_id),
      now(),true
    );
  end if;

  if tg_op='UPDATE' and old.status is distinct from new.status then
    if new.status='PENDING_MANAGER' then
      perform public.enqueue_notification_v1(
        'give:'||new.id||':recipient_accepted:giver',
        'SHIFT_GIVE_RECIPIENT_ACCEPTED','USER',new.giver_id,new.store_id,auth.uid(),
        'SHIFT_GIVE',new.id,new.schedule_id,
        'Người nhận đã đồng ý nhận ca',
        'Yêu cầu cho ca đang chờ quản lý duyệt.',
        jsonb_build_object('give_id',new.id,'store_id',new.store_id),
        now(),true
      );
      perform public.enqueue_notification_v1(
        'give:'||new.id||':manager_review',
        'SHIFT_GIVE_MANAGER_REVIEW','STORE_MANAGERS',null,new.store_id,auth.uid(),
        'SHIFT_GIVE',new.id,new.schedule_id,
        'Có yêu cầu cho ca cần duyệt',
        'Người nhận đã đồng ý; yêu cầu cho ca đang chờ quản lý duyệt.',
        jsonb_build_object('give_id',new.id,'store_id',new.store_id),
        now(),true
      );
    elsif new.status='REJECTED_RECIPIENT' then
      perform public.enqueue_notification_v1(
        'give:'||new.id||':recipient_rejected:giver',
        'SHIFT_GIVE_RECIPIENT_REJECTED','USER',new.giver_id,new.store_id,auth.uid(),
        'SHIFT_GIVE',new.id,new.schedule_id,
        'Người nhận đã từ chối ca',
        'Yêu cầu cho ca đã bị người nhận từ chối.',
        jsonb_build_object('give_id',new.id,'store_id',new.store_id),
        now(),true
      );
    elsif new.status in('APPROVED','REJECTED_MANAGER') then
      perform public.enqueue_notification_v1(
        'give:'||new.id||':'||lower(new.status)||':giver',
        case when new.status='APPROVED' then 'SHIFT_GIVE_APPROVED' else 'SHIFT_GIVE_REJECTED_MANAGER' end,
        'USER',new.giver_id,new.store_id,auth.uid(),
        'SHIFT_GIVE',new.id,new.schedule_id,
        case when new.status='APPROVED' then 'Yêu cầu cho ca đã được duyệt' else 'Quản lý đã từ chối yêu cầu cho ca' end,
        case when new.status='APPROVED' then 'Ca đã được chuyển cho người nhận.' else 'Yêu cầu cho ca đã bị quản lý từ chối.' end,
        jsonb_build_object('give_id',new.id,'status',new.status,'store_id',new.store_id),
        now(),true
      );
      perform public.enqueue_notification_v1(
        'give:'||new.id||':'||lower(new.status)||':recipient',
        case when new.status='APPROVED' then 'SHIFT_GIVE_APPROVED' else 'SHIFT_GIVE_REJECTED_MANAGER' end,
        'USER',new.recipient_id,new.store_id,auth.uid(),
        'SHIFT_GIVE',new.id,new.schedule_id,
        case when new.status='APPROVED' then 'Bạn đã nhận ca' else 'Quản lý đã từ chối yêu cầu nhận ca' end,
        case when new.status='APPROVED' then 'Ca đã được chuyển vào lịch của bạn.' else 'Yêu cầu nhận ca đã bị quản lý từ chối.' end,
        jsonb_build_object('give_id',new.id,'status',new.status,'store_id',new.store_id),
        now(),true
      );
    end if;
  end if;

  return new;
end;
$function$;

create trigger trg_notification_work_schedules
after insert or update on public.work_schedules
for each row execute function public.notification_schedule_trigger_v1();

create trigger trg_notification_attendance
after insert or update on public.attendance
for each row execute function public.notification_attendance_trigger_v1();

create trigger trg_notification_shift_swaps
after insert or update on public.shift_swaps
for each row execute function public.notification_shift_swap_trigger_v1();

create trigger trg_notification_shift_gives
after insert or update on public.shift_gives
for each row execute function public.notification_shift_give_trigger_v1();

revoke execute on function public.enqueue_notification_v1(text,text,text,uuid,uuid,uuid,text,uuid,uuid,text,text,jsonb,timestamptz,boolean)
  from public,anon,authenticated;
revoke execute on function public.list_my_notifications_v1(integer)
  from public,anon;
revoke execute on function public.claim_notification_email_batch_v1(integer)
  from public,anon,authenticated;
revoke execute on function public.complete_notification_email_v1(uuid,boolean,text)
  from public,anon,authenticated;

grant execute on function public.list_my_notifications_v1(integer) to authenticated;
grant execute on function public.enqueue_notification_v1(text,text,text,uuid,uuid,uuid,text,uuid,uuid,text,text,jsonb,timestamptz,boolean)
  to service_role;
grant execute on function public.claim_notification_email_batch_v1(integer) to service_role;
grant execute on function public.complete_notification_email_v1(uuid,boolean,text) to service_role;

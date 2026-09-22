-- TASK-095 — Employee Published Weekly Schedule V1
-- Workforce V1 overrides legacy TASK-032 realtime attendance reminder semantics.
-- Keep canonical schedule notifications, but do not create new CLOCK_OUT_REMINDER rows.
-- Historical reminder rows are not deleted/backfilled; cancellation guards remain for safe cleanup on later schedule changes.

create or replace function public.notification_schedule_trigger_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
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

-- Trigger functions remain Postgres-trigger-only; do not expose them as browser RPCs.
revoke execute on function public.notification_schedule_trigger_v1()
  from public,anon,authenticated;

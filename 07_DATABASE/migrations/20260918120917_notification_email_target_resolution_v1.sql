-- TASK-035 concurrent execution history.
-- Applied to production as 20260918120917, then compensatingly reverted by
-- 20260918121457 after main already contained the canonical provider-neutral
-- worker from PR #104. Retained here so repository migration history matches
-- production history. Final schema ownership remains in the Edge Function.

create or replace function public.resolve_notification_email_targets_v1(p_notification_id uuid)
returns table(user_id uuid, email text)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_row public.notification_outbox%rowtype;
begin
  select *
  into v_row
  from public.notification_outbox
  where id = p_notification_id;

  if not found then
    raise exception 'NOTIFICATION_NOT_FOUND';
  end if;

  if v_row.audience_type = 'USER' then
    return query
    select p.id, trim(p.email)
    from public.profiles p
    where p.id = v_row.recipient_user_id
      and p.status = 'ACTIVE'
      and nullif(trim(p.email),'') is not null;
    return;
  end if;

  if v_row.audience_type = 'STORE_MANAGERS' then
    return query
    select distinct on (lower(trim(p.email)))
      p.id,
      trim(p.email)
    from public.profiles p
    join public.stores s on s.id = v_row.store_id
    where p.role = 'STORE_MANAGER'
      and p.status = 'ACTIVE'
      and nullif(trim(p.email),'') is not null
      and (
        upper(trim(coalesce(p.access_scope,''))) in ('ALL','*')
        or upper(s.code) = any(
          regexp_split_to_array(
            upper(replace(coalesce(p.access_scope,''),' ','')),
            '[,;]+'
          )
        )
      )
    order by lower(trim(p.email)), p.id;
    return;
  end if;

  if v_row.audience_type = 'OWNER' then
    return query
    select distinct on (lower(trim(p.email)))
      p.id,
      trim(p.email)
    from public.profiles p
    where p.role = 'OWNER'
      and p.status = 'ACTIVE'
      and nullif(trim(p.email),'') is not null
    order by lower(trim(p.email)), p.id;
    return;
  end if;

  raise exception 'NOTIFICATION_AUDIENCE_INVALID';
end;
$function$;

create or replace function public.skip_notification_email_v1(
  p_notification_id uuid,
  p_reason text default 'NO_ACTIVE_EMAIL_TARGET'
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_row public.notification_outbox%rowtype;
  v_reason text;
begin
  select *
  into v_row
  from public.notification_outbox
  where id = p_notification_id
  for update;

  if not found then
    raise exception 'NOTIFICATION_NOT_FOUND';
  end if;

  if v_row.email_status <> 'PROCESSING' then
    raise exception 'NOTIFICATION_NOT_PROCESSING';
  end if;

  v_reason := nullif(left(trim(coalesce(p_reason,'NO_ACTIVE_EMAIL_TARGET')),1000),'');
  if v_reason is null then
    v_reason := 'NO_ACTIVE_EMAIL_TARGET';
  end if;

  update public.notification_outbox
  set email_status = 'SKIPPED',
      email_last_error = v_reason,
      email_processing_started_at = null,
      updated_at = now()
  where id = p_notification_id;

  return jsonb_build_object(
    'id', p_notification_id,
    'email_status', 'SKIPPED',
    'reason', v_reason
  );
end;
$function$;

revoke execute on function public.resolve_notification_email_targets_v1(uuid)
  from public, anon, authenticated;
revoke execute on function public.skip_notification_email_v1(uuid,text)
  from public, anon, authenticated;

grant execute on function public.resolve_notification_email_targets_v1(uuid)
  to service_role;
grant execute on function public.skip_notification_email_v1(uuid,text)
  to service_role;

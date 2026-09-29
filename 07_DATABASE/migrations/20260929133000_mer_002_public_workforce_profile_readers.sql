-- MER-002 — Public role-safe readers over the canonical Employee Workforce Profile.
-- Manager and Employee UI consume the same shape/revision.

create or replace function public.get_my_employee_workforce_profile_v1()
returns table(
  employee_id uuid,
  username text,
  full_name text,
  phone text,
  employee_role text,
  profile_status text,
  join_date date,
  primary_store_id uuid,
  primary_store_code text,
  primary_store_name text,
  priority_store_ids uuid[],
  priority_store_codes text[],
  priority_store_names text[],
  employee_level text,
  pay_rule_reference text,
  store_priority_updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path=public
as $function$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(
    select 1 from public.profiles p
    where p.id=auth.uid()
      and p.status='ACTIVE'
      and upper(coalesce(p.role,'')) in ('STAFF','EMPLOYEE')
  ) then raise exception 'EMPLOYEE_NOT_ACTIVE'; end if;

  return query
  select * from public.employee_workforce_profile_projection_v1(auth.uid());
end;
$function$;

create or replace function public.list_employee_workforce_profiles_v1()
returns table(
  employee_id uuid,
  username text,
  full_name text,
  phone text,
  employee_role text,
  profile_status text,
  join_date date,
  primary_store_id uuid,
  primary_store_code text,
  primary_store_name text,
  priority_store_ids uuid[],
  priority_store_codes text[],
  priority_store_names text[],
  employee_level text,
  pay_rule_reference text,
  store_priority_updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path=public
as $function$
declare
  v_role text := upper(coalesce(public.current_user_role(),''));
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if not exists(
    select 1 from public.profiles p
    where p.id=auth.uid()
      and p.status='ACTIVE'
      and upper(coalesce(p.role,''))=v_role
  ) then raise exception 'ACTOR_NOT_ACTIVE'; end if;

  return query
  select x.*
  from public.profiles p
  join lateral public.employee_workforce_profile_projection_v1(p.id) x on true
  where upper(coalesce(p.role,'')) in ('STAFF','EMPLOYEE')
    and (
      v_role='OWNER'
      or cardinality(x.priority_store_ids)=0
      or exists(
        select 1
        from unnest(x.priority_store_ids) sid
        where public.can_access_store(sid)
      )
    )
  order by lower(x.full_name),lower(x.username),x.employee_id;
end;
$function$;

revoke execute on function public.get_my_employee_workforce_profile_v1()
  from public,anon;
grant execute on function public.get_my_employee_workforce_profile_v1()
  to authenticated;

revoke execute on function public.list_employee_workforce_profiles_v1()
  from public,anon;
grant execute on function public.list_employee_workforce_profiles_v1()
  to authenticated;

-- XSTORE-002 — Management-owned Employee Store Priority Profile V1.
-- Canonical semantics:
--   priority 1 = primary store
--   later rows = secondary stores in descending preference
--   absent store = NOT_ELIGIBLE
-- Employee is read-only. OWNER / STORE_MANAGER are the only writers.

create table if not exists public.employee_store_priorities (
  employee_id uuid not null references public.profiles(id) on delete cascade,
  store_id uuid not null references public.stores(id),
  priority smallint not null check (priority between 1 and 4),
  is_primary boolean not null default false,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  primary key (employee_id, store_id),
  unique (employee_id, priority)
);

create unique index if not exists employee_store_priorities_one_primary
  on public.employee_store_priorities(employee_id)
  where is_primary;

alter table public.employee_store_priorities enable row level security;
revoke all on table public.employee_store_priorities from anon, authenticated;

create or replace function public.set_employee_store_priority_profile_v1(
  p_employee_id uuid,
  p_store_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $function$
declare
  v_role text := upper(coalesce(public.current_user_role(),''));
  v_count integer;
  v_distinct_count integer;
  v_store uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if not exists(
    select 1 from public.profiles p
    where p.id=auth.uid() and p.status='ACTIVE' and upper(coalesce(p.role,''))=v_role
  ) then raise exception 'ACTOR_NOT_ACTIVE'; end if;

  if not exists(
    select 1 from public.profiles p
    where p.id=p_employee_id
      and p.status in ('ACTIVE','INACTIVE')
      and upper(coalesce(p.role,'')) in ('STAFF','EMPLOYEE')
  ) then raise exception 'EMPLOYEE_NOT_FOUND'; end if;

  v_count := coalesce(array_length(p_store_ids,1),0);
  if v_count < 1 or v_count > 4 then raise exception 'STORE_PRIORITY_COUNT_INVALID'; end if;
  if exists(select 1 from unnest(p_store_ids) x where x is null) then raise exception 'STORE_PRIORITY_NULL_STORE'; end if;

  select count(distinct x) into v_distinct_count from unnest(p_store_ids) x;
  if v_distinct_count <> v_count then raise exception 'STORE_PRIORITY_DUPLICATE_STORE'; end if;

  foreach v_store in array p_store_ids loop
    if not exists(select 1 from public.stores s where s.id=v_store and s.status='ACTIVE') then
      raise exception 'STORE_NOT_ACTIVE';
    end if;
    if not coalesce(public.can_access_store(v_store),false) then
      raise exception 'STORE_NOT_ALLOWED';
    end if;
  end loop;

  perform pg_advisory_xact_lock(hashtextextended('employee_store_priority:'||p_employee_id::text,0));

  delete from public.employee_store_priorities
  where employee_id=p_employee_id;

  insert into public.employee_store_priorities(employee_id,store_id,priority,is_primary,updated_by,updated_at)
  select p_employee_id,x.store_id,x.ord::smallint,(x.ord=1),auth.uid(),now()
  from unnest(p_store_ids) with ordinality as x(store_id,ord)
  order by x.ord;

  return jsonb_build_object(
    'employee_id',p_employee_id,
    'primary_store_id',p_store_ids[1],
    'store_ids',to_jsonb(p_store_ids),
    'priority_count',v_count
  );
end;
$function$;

create or replace function public.list_employee_store_priority_profiles_v1()
returns table(
  employee_id uuid,
  username text,
  full_name text,
  phone text,
  employee_role text,
  profile_status text,
  primary_store_id uuid,
  primary_store_code text,
  primary_store_name text,
  priority_store_ids uuid[],
  priority_store_codes text[],
  priority_store_names text[]
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
    where p.id=auth.uid() and p.status='ACTIVE' and upper(coalesce(p.role,''))=v_role
  ) then raise exception 'ACTOR_NOT_ACTIVE'; end if;

  return query
  select
    p.id,
    p.username,
    p.full_name,
    p.phone,
    p.role,
    p.status,
    max(esp.store_id) filter(where esp.is_primary),
    max(s.code) filter(where esp.is_primary),
    max(s.name) filter(where esp.is_primary),
    coalesce(array_agg(esp.store_id order by esp.priority) filter(where esp.store_id is not null),'{}'::uuid[]),
    coalesce(array_agg(s.code order by esp.priority) filter(where esp.store_id is not null),'{}'::text[]),
    coalesce(array_agg(s.name order by esp.priority) filter(where esp.store_id is not null),'{}'::text[])
  from public.profiles p
  left join public.employee_store_priorities esp on esp.employee_id=p.id
  left join public.stores s on s.id=esp.store_id
  where upper(coalesce(p.role,'')) in ('STAFF','EMPLOYEE')
  group by p.id,p.username,p.full_name,p.phone,p.role,p.status
  order by lower(p.full_name),lower(p.username),p.id;
end;
$function$;

create or replace function public.get_my_store_priority_profile_v1()
returns table(
  employee_id uuid,
  primary_store_id uuid,
  primary_store_code text,
  primary_store_name text,
  priority_store_ids uuid[],
  priority_store_codes text[],
  priority_store_names text[]
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
  select
    auth.uid(),
    max(esp.store_id) filter(where esp.is_primary),
    max(s.code) filter(where esp.is_primary),
    max(s.name) filter(where esp.is_primary),
    coalesce(array_agg(esp.store_id order by esp.priority) filter(where esp.store_id is not null),'{}'::uuid[]),
    coalesce(array_agg(s.code order by esp.priority) filter(where esp.store_id is not null),'{}'::text[]),
    coalesce(array_agg(s.name order by esp.priority) filter(where esp.store_id is not null),'{}'::text[])
  from public.employee_store_priorities esp
  join public.stores s on s.id=esp.store_id
  where esp.employee_id=auth.uid();
end;
$function$;

create or replace function public.employee_profile_projection_row_v1(
  p_user_id uuid
)
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
  employee_level text,
  pay_rule_reference text
)
language sql
stable
security definer
set search_path=public
as $function$
  select
    p.id,
    p.username,
    p.full_name,
    p.phone,
    p.role,
    p.status,
    null::date,
    esp.store_id,
    s.code,
    s.name,
    eg.grade,
    null::text
  from public.profiles p
  left join public.employee_store_priorities esp
    on esp.employee_id=p.id and esp.is_primary
  left join public.stores s on s.id=esp.store_id
  left join public.employee_grades eg
    on eg.user_id=p.id and eg.status='ACTIVE'
  where p.id=p_user_id
    and upper(coalesce(p.role,'')) in ('STAFF','EMPLOYEE');
$function$;

create or replace function public.list_employee_profile_projection_v1(
  p_store_id uuid default null
)
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
  employee_level text,
  pay_rule_reference text
)
language plpgsql
stable
security definer
set search_path=public
as $function$
declare
  v_uid uuid := auth.uid();
  v_actor public.profiles%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_actor from public.profiles where id=v_uid;
  if not found then raise exception 'PROFILE_VIEWER_NOT_FOUND'; end if;
  if v_actor.status<>'ACTIVE' then raise exception 'PROFILE_VIEWER_INACTIVE'; end if;
  if upper(coalesce(v_actor.role,'')) not in ('STORE_MANAGER','OWNER') then raise exception 'PROFILE_VIEW_ROLE_NOT_ALLOWED'; end if;

  if p_store_id is not null and not public.can_access_store(p_store_id) then raise exception 'STORE_NOT_ALLOWED'; end if;

  return query
  select pr.*
  from public.profiles subject
  join lateral public.employee_profile_projection_row_v1(subject.id) pr on true
  where upper(coalesce(subject.role,'')) in ('STAFF','EMPLOYEE')
    and (
      p_store_id is null
      or exists(
        select 1 from public.employee_store_priorities esp
        where esp.employee_id=subject.id and esp.store_id=p_store_id
      )
    )
  order by lower(pr.full_name),lower(pr.username),pr.employee_id;
end;
$function$;

revoke execute on function public.set_employee_store_priority_profile_v1(uuid,uuid[]) from public,anon;
grant execute on function public.set_employee_store_priority_profile_v1(uuid,uuid[]) to authenticated;
revoke execute on function public.list_employee_store_priority_profiles_v1() from public,anon;
grant execute on function public.list_employee_store_priority_profiles_v1() to authenticated;
revoke execute on function public.get_my_store_priority_profile_v1() from public,anon;
grant execute on function public.get_my_store_priority_profile_v1() to authenticated;

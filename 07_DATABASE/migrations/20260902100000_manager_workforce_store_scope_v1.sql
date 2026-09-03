create or replace function public.get_manager_accessible_stores()
returns table(id uuid, code text, name text, status text)
language plpgsql
stable security definer
set search_path = public
as $$
declare v_role text := public.current_user_role(); v_scope text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if v_role = 'STORE_MANAGER' then
    select access_scope into v_scope from public.profiles where id = auth.uid();
  end if;
  return query
  select s.id, s.code, s.name, s.status
  from public.stores s
  where s.status = 'ACTIVE'
    and (
      v_role = 'OWNER'
      or position('ALL' in upper(coalesce(v_scope,''))) > 0
      or position(upper(s.code) in upper(replace(replace(coalesce(v_scope,''), ',', ';'), ' ', ''))) > 0
    )
  order by s.code;
end;
$$;
grant execute on function public.get_manager_accessible_stores() to authenticated;

drop function if exists public.upsert_workforce_staffing_requirement(uuid,uuid,date,time without time zone,time without time zone,text,integer,integer,integer,integer,text,text);
create or replace function public.upsert_workforce_staffing_requirement(
  p_requirement_id uuid default null,
  p_store_id uuid default null,
  p_work_date date default null,
  p_start_time time default null,
  p_end_time time default null,
  p_skill_code text default null,
  p_min_skill_level integer default 0,
  p_minimum_headcount integer default 0,
  p_target_headcount integer default 0,
  p_maximum_headcount integer default 0,
  p_status text default 'ACTIVE',
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid; v_role text := public.current_user_role(); v_status text := upper(coalesce(trim(p_status),'ACTIVE')); v_skill text := nullif(trim(coalesce(p_skill_code,'')),'');
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_role <> 'OWNER' then raise exception 'OWNER_ONLY'; end if;
  if p_store_id is null or p_work_date is null or p_start_time is null or p_end_time is null then raise exception 'STAFFING_REQUIREMENT_FIELDS_REQUIRED'; end if;
  if not public.can_access_store(p_store_id) then raise exception 'STORE_NOT_ALLOWED'; end if;
  if p_end_time <= p_start_time then raise exception 'INVALID_STAFFING_INTERVAL'; end if;
  if p_min_skill_level < 0 or p_min_skill_level > 4 then raise exception 'INVALID_MIN_SKILL_LEVEL'; end if;
  if p_minimum_headcount < 0 or p_target_headcount < p_minimum_headcount or p_maximum_headcount < p_target_headcount then raise exception 'INVALID_HEADCOUNT_HIERARCHY'; end if;
  if v_status not in ('ACTIVE','INACTIVE') then raise exception 'INVALID_STAFFING_STATUS'; end if;
  if v_skill is null and p_min_skill_level <> 0 then raise exception 'GENERIC_REQUIREMENT_SKILL_LEVEL_MUST_BE_ZERO'; end if;
  if p_requirement_id is null then
    insert into public.staffing_requirements(store_id,work_date,start_time,end_time,skill_code,min_skill_level,minimum_headcount,target_headcount,maximum_headcount,status,note,created_by)
    values(p_store_id,p_work_date,p_start_time,p_end_time,v_skill,p_min_skill_level,p_minimum_headcount,p_target_headcount,p_maximum_headcount,v_status,p_note,auth.uid()) returning id into v_id;
  else
    if not exists(select 1 from public.staffing_requirements where id=p_requirement_id) then raise exception 'STAFFING_REQUIREMENT_NOT_FOUND'; end if;
    update public.staffing_requirements set store_id=p_store_id, work_date=p_work_date, start_time=p_start_time, end_time=p_end_time, skill_code=v_skill, min_skill_level=p_min_skill_level, minimum_headcount=p_minimum_headcount, target_headcount=p_target_headcount, maximum_headcount=p_maximum_headcount, status=v_status, note=p_note, updated_at=now() where id=p_requirement_id returning id into v_id;
  end if;
  return v_id;
end;
$$;
grant execute on function public.upsert_workforce_staffing_requirement(uuid,uuid,date,time,time,text,integer,integer,integer,integer,text,text) to authenticated;

create table if not exists public.staffing_requirement_templates (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  start_time time without time zone not null,
  end_time time without time zone not null,
  skill_code text,
  min_skill_level integer not null default 0 check (min_skill_level >= 0),
  minimum_headcount integer not null default 0 check (minimum_headcount >= 0),
  target_headcount integer not null default 0 check (target_headcount >= 0),
  maximum_headcount integer not null default 0 check (maximum_headcount >= 0),
  status text not null default 'ACTIVE',
  note text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staffing_requirement_templates_time_check check (end_time > start_time)
);

create unique index if not exists uq_staffing_requirement_templates_slot
  on public.staffing_requirement_templates(store_id, day_of_week, start_time, end_time, coalesce(skill_code, ''));
create index if not exists idx_staffing_requirement_templates_store_day
  on public.staffing_requirement_templates(store_id, day_of_week, status);

alter table public.staffing_requirement_templates enable row level security;
drop policy if exists staffing_requirement_templates_select on public.staffing_requirement_templates;
create policy staffing_requirement_templates_select on public.staffing_requirement_templates
for select using (store_id in (select id from public.get_manager_accessible_stores()));
drop policy if exists staffing_requirement_templates_owner_write on public.staffing_requirement_templates;
create policy staffing_requirement_templates_owner_write on public.staffing_requirement_templates
for all using (public.current_user_role() = 'OWNER') with check (public.current_user_role() = 'OWNER');

insert into public.staffing_requirement_templates(
  store_id, day_of_week, start_time, end_time, skill_code, min_skill_level,
  minimum_headcount, target_headcount, maximum_headcount, status, note, created_by, created_at, updated_at
)
select distinct on (r.store_id, extract(isodow from r.work_date)::smallint, r.start_time, r.end_time, coalesce(r.skill_code,''))
  r.store_id, extract(isodow from r.work_date)::smallint, r.start_time, r.end_time, r.skill_code, r.min_skill_level,
  r.minimum_headcount, r.target_headcount, r.maximum_headcount, r.status, r.note, r.created_by, r.created_at, r.updated_at
from public.staffing_requirements r
where r.status='ACTIVE'
order by r.store_id, extract(isodow from r.work_date)::smallint, r.start_time, r.end_time, coalesce(r.skill_code,''), r.updated_at desc;

create or replace function public.get_workforce_staffing_requirements(
  p_store_id uuid default null,
  p_week_start date default null
)
returns table(id uuid, store_id uuid, store_code text, store_name text, work_date date, start_time time without time zone, end_time time without time zone, skill_code text, min_skill_level integer, minimum_headcount integer, target_headcount integer, maximum_headcount integer, status text, note text)
language sql security definer set search_path=public
as $$
  with scope as (
    select p_store_id as store_id
    where p_store_id is not null and p_store_id in (select id from public.get_manager_accessible_stores())
    union all
    select id from public.get_manager_accessible_stores() where p_store_id is null
  )
  select t.id,t.store_id,s.code,s.name,
         coalesce(p_week_start,current_date)+(t.day_of_week-1)*interval '1 day',
         t.start_time,t.end_time,t.skill_code,t.min_skill_level,t.minimum_headcount,t.target_headcount,t.maximum_headcount,t.status,t.note
  from public.staffing_requirement_templates t
  join public.stores s on s.id=t.store_id
  join scope sc on sc.store_id=t.store_id
  where t.status='ACTIVE'
  order by 5,6,7,1;
$$;

create or replace function public.upsert_workforce_staffing_requirement(
  p_requirement_id uuid default null,
  p_store_id uuid default null,
  p_work_date date default null,
  p_start_time time without time zone default null,
  p_end_time time without time zone default null,
  p_skill_code text default null,
  p_min_skill_level integer default 0,
  p_minimum_headcount integer default 0,
  p_target_headcount integer default 0,
  p_maximum_headcount integer default 0,
  p_status text default 'ACTIVE',
  p_note text default null
)
returns uuid language plpgsql security definer set search_path=public
as $$
declare v_id uuid; v_day smallint;
begin
  if public.current_user_role()<>'OWNER' then raise exception 'OWNER_ONLY'; end if;
  if p_store_id is null or p_work_date is null or p_start_time is null or p_end_time is null then raise exception 'REQUIRED_FIELDS'; end if;
  if not public.can_access_store(p_store_id) then raise exception 'STORE_FORBIDDEN'; end if;
  if p_end_time<=p_start_time then raise exception 'INVALID_TIME_RANGE'; end if;
  if p_start_time<time '05:00' or p_end_time>time '22:00' then raise exception 'TIME_OUT_OF_RANGE'; end if;
  if extract(minute from p_start_time)::int%30<>0 or extract(minute from p_end_time)::int%30<>0 then raise exception 'TIME_STEP_30_MIN'; end if;
  v_day:=extract(isodow from p_work_date)::smallint;
  if p_requirement_id is not null then
    update public.staffing_requirement_templates
       set store_id=p_store_id,day_of_week=v_day,start_time=p_start_time,end_time=p_end_time,
           skill_code=nullif(trim(p_skill_code),''),min_skill_level=greatest(0,p_min_skill_level),
           minimum_headcount=greatest(0,p_minimum_headcount),target_headcount=greatest(0,p_target_headcount),maximum_headcount=greatest(0,p_maximum_headcount),
           status=coalesce(nullif(p_status,''),'ACTIVE'),note=p_note,updated_at=now()
     where id=p_requirement_id returning id into v_id;
  end if;
  if v_id is null then
    insert into public.staffing_requirement_templates(store_id,day_of_week,start_time,end_time,skill_code,min_skill_level,minimum_headcount,target_headcount,maximum_headcount,status,note,created_by)
    values(p_store_id,v_day,p_start_time,p_end_time,nullif(trim(p_skill_code),''),greatest(0,p_min_skill_level),greatest(0,p_minimum_headcount),greatest(0,p_target_headcount),greatest(0,p_maximum_headcount),coalesce(nullif(p_status,''),'ACTIVE'),p_note,auth.uid())
    on conflict (store_id,day_of_week,start_time,end_time,coalesce(skill_code,'')) do update set
      min_skill_level=excluded.min_skill_level,minimum_headcount=excluded.minimum_headcount,target_headcount=excluded.target_headcount,maximum_headcount=excluded.maximum_headcount,status=excluded.status,note=excluded.note,updated_at=now()
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

create or replace function public.auto_generate_schedule_generation(p_store_id uuid, p_week_start date, p_algorithm_version text default 'GREEDY_V1')
returns jsonb language plpgsql security definer set search_path=public
as $$
declare
  v_role text:=public.current_user_role(); v_generation uuid; v_count integer:=0; v_shortages jsonb:='[]'::jsonb; r record; c record; v_daily numeric; v_weekly numeric; v_assigned integer; v_hours numeric;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if p_store_id is null or p_week_start is null then raise exception 'GENERATION_FIELDS_REQUIRED'; end if;
  if extract(isodow from p_week_start)<>1 then raise exception 'WEEK_START_MUST_BE_MONDAY'; end if;
  if not public.can_access_store(p_store_id) then raise exception 'STORE_NOT_ALLOWED'; end if;
  select id into v_generation from public.schedule_generation_runs where store_id=p_store_id and week_start=p_week_start and status='DRAFT' order by created_at desc limit 1;
  if v_generation is null then v_generation:=public.create_schedule_generation(p_store_id,p_week_start,coalesce(nullif(trim(p_algorithm_version),''),'GREEDY_V1')); else delete from public.schedule_generation_assignments where generation_id=v_generation; end if;
  for r in select * from public.get_workforce_staffing_requirements(p_store_id,p_week_start) where status='ACTIVE' order by work_date,start_time,end_time,skill_code nulls first,id loop
    v_hours:=extract(epoch from (r.end_time-r.start_time))/3600.0;
    for c in
      select p.id as user_id,ea.availability_type,ea.preferred_store_id,coalesce(cn.max_daily_hours,0) max_daily_hours,coalesce(cn.max_weekly_hours,0) max_weekly_hours,coalesce(es.level,0) skill_level
      from public.employee_availability ea join public.profiles p on p.id=ea.user_id and p.status='ACTIVE' and p.role='STAFF'
      left join public.employee_constraints cn on cn.user_id=p.id and cn.status='ACTIVE'
      left join lateral (select es1.level from public.employee_skills es1 where es1.user_id=p.id and es1.status='ACTIVE' and (r.skill_code is null or es1.skill_code=r.skill_code) order by es1.level desc limit 1) es on true
      where ea.work_date=r.work_date and ea.start_time<=r.start_time and ea.end_time>=r.end_time and ea.availability_type in ('AVAILABLE','PREFERRED')
        and (ea.preferred_store_id is null or ea.preferred_store_id=p_store_id)
        and (cn.user_id is null or coalesce(array_length(cn.allowed_store_ids,1),0)=0 or p_store_id=any(cn.allowed_store_ids))
        and (r.skill_code is null or coalesce(es.level,0)>=r.min_skill_level)
        and not exists(select 1 from public.schedule_generation_assignments x where x.generation_id=v_generation and x.user_id=p.id and x.work_date=r.work_date and x.start_time<r.end_time and r.start_time<x.end_time)
        and not exists(select 1 from public.work_schedules ws where ws.user_id=p.id and ws.work_date=r.work_date and ws.status in ('PENDING','APPROVED') and ws.start_time<r.end_time and r.start_time<ws.end_time)
      order by case when ea.availability_type='PREFERRED' then 0 else 1 end,case when ea.preferred_store_id=p_store_id then 0 else 1 end,
        (select coalesce(sum(extract(epoch from (x.end_time-x.start_time))/3600.0),0) from public.schedule_generation_assignments x where x.generation_id=v_generation and x.user_id=p.id),p.full_name,p.id
    loop
      select coalesce(sum(extract(epoch from (x.end_time-x.start_time))/3600.0),0) into v_daily from public.schedule_generation_assignments x where x.generation_id=v_generation and x.user_id=c.user_id and x.work_date=r.work_date;
      select coalesce(sum(extract(epoch from (x.end_time-x.start_time))/3600.0),0) into v_weekly from public.schedule_generation_assignments x where x.generation_id=v_generation and x.user_id=c.user_id;
      if c.max_daily_hours>0 and v_daily+v_hours>c.max_daily_hours then continue; end if;
      if c.max_weekly_hours>0 and v_weekly+v_hours>c.max_weekly_hours then continue; end if;
      insert into public.schedule_generation_assignments(generation_id,user_id,store_id,work_date,start_time,end_time,skill_code,skill_level,score,warning,status,note)
      values(v_generation,c.user_id,p_store_id,r.work_date,r.start_time,r.end_time,r.skill_code,coalesce(r.min_skill_level,0),case when c.availability_type='PREFERRED' then 100 else 50 end+case when c.preferred_store_id=p_store_id then 20 else 0 end,null,'DRAFT',null);
      v_count:=v_count+1;
      select count(*) into v_assigned from public.schedule_generation_assignments x where x.generation_id=v_generation and x.work_date=r.work_date and x.start_time<=r.start_time and x.end_time>=r.end_time and x.store_id=p_store_id and (r.skill_code is null or exists(select 1 from public.employee_skills es2 where es2.user_id=x.user_id and es2.skill_code=r.skill_code and es2.status='ACTIVE' and es2.level>=r.min_skill_level));
      exit when v_assigned>=r.target_headcount;
    end loop;
    select count(*) into v_assigned from public.schedule_generation_assignments x where x.generation_id=v_generation and x.work_date=r.work_date and x.start_time<=r.start_time and x.end_time>=r.end_time and x.store_id=p_store_id and (r.skill_code is null or exists(select 1 from public.employee_skills es3 where es3.user_id=x.user_id and es3.skill_code=r.skill_code and es3.status='ACTIVE' and es3.level>=r.min_skill_level));
    if v_assigned<r.minimum_headcount then v_shortages:=v_shortages||jsonb_build_object('requirement_id',r.id,'work_date',r.work_date,'start_time',r.start_time,'end_time',r.end_time,'minimum',r.minimum_headcount,'assigned',v_assigned,'target',r.target_headcount,'skill_code',r.skill_code); end if;
  end loop;
  update public.schedule_generation_runs set total_hours=coalesce((select sum(extract(epoch from (end_time-start_time))/3600.0) from public.schedule_generation_assignments where generation_id=v_generation),0) where id=v_generation;
  return jsonb_build_object('generation_id',v_generation,'status','DRAFT','assignment_count',v_count,'minimum_shortages',v_shortages,'warning_count',jsonb_array_length(v_shortages),'algorithm_version',coalesce(nullif(trim(p_algorithm_version),''),'GREEDY_V1'));
end;
$$;
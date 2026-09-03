create or replace function public.auto_generate_schedule_generation(p_store_id uuid, p_week_start date, p_algorithm_version text default 'GREEDY_V1') returns jsonb language plpgsql security definer set search_path=public as $function$
declare
  v_role text:=public.current_user_role();
  v_generation uuid;
  v_count integer:=0;
  v_shortages jsonb:='[]'::jsonb;
  r record;
  c record;
  v_daily numeric;
  v_weekly numeric;
  v_assigned integer;
  v_hours numeric;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_role not in ('OWNER','STORE_MANAGER') then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if p_store_id is null or p_week_start is null then raise exception 'GENERATION_FIELDS_REQUIRED'; end if;
  if extract(isodow from p_week_start)<>1 then raise exception 'WEEK_START_MUST_BE_MONDAY'; end if;
  if not public.can_access_store(p_store_id) then raise exception 'STORE_NOT_ALLOWED'; end if;

  select id into v_generation
    from public.schedule_generation_runs
   where store_id=p_store_id and week_start=p_week_start and status='DRAFT'
   order by created_at desc limit 1;
  if v_generation is null then
    v_generation:=public.create_schedule_generation(p_store_id,p_week_start,coalesce(nullif(trim(p_algorithm_version),''),'GREEDY_V1'));
  else
    delete from public.schedule_generation_assignments where generation_id=v_generation;
  end if;

  for r in
    select * from public.staffing_requirements
     where store_id=p_store_id and work_date between p_week_start and p_week_start+6 and status='ACTIVE'
     order by work_date,start_time,end_time,skill_code nulls first,id
  loop
    v_hours:=extract(epoch from (r.end_time-r.start_time))/3600.0;
    for c in
      select p.id as user_id,
             ea.availability_type,
             ea.preferred_store_id,
             coalesce(cn.max_daily_hours,0) as max_daily_hours,
             coalesce(cn.max_weekly_hours,0) as max_weekly_hours,
             coalesce(es.level,0) as skill_level
        from public.employee_availability ea
        join public.profiles p on p.id=ea.user_id and p.status='ACTIVE' and p.role='STAFF'
        left join public.employee_constraints cn on cn.user_id=p.id and cn.status='ACTIVE'
        left join lateral (
          select es1.level
            from public.employee_skills es1
           where es1.user_id=p.id and es1.status='ACTIVE'
             and (r.skill_code is null or es1.skill_code=r.skill_code)
           order by es1.level desc
           limit 1
        ) es on true
       where ea.work_date=r.work_date
         and ea.start_time<=r.start_time and ea.end_time>=r.end_time
         and ea.availability_type in ('AVAILABLE','PREFERRED')
         and (ea.preferred_store_id is null or ea.preferred_store_id=p_store_id)
         and (cn.user_id is null or coalesce(array_length(cn.allowed_store_ids,1),0)=0 or p_store_id=any(cn.allowed_store_ids))
         and (r.skill_code is null or coalesce(es.level,0)>=r.min_skill_level)
         and not exists(
           select 1 from public.schedule_generation_assignments x
            where x.generation_id=v_generation and x.user_id=p.id
              and x.work_date=r.work_date
              and x.start_time<r.end_time and r.start_time<x.end_time
         )
         and not exists(
           select 1 from public.work_schedules ws
            where ws.user_id=p.id and ws.work_date=r.work_date
              and ws.status in ('PENDING','APPROVED')
              and ws.start_time<r.end_time and r.start_time<ws.end_time
         )
       order by case when ea.availability_type='PREFERRED' then 0 else 1 end,
                case when ea.preferred_store_id=p_store_id then 0 else 1 end,
                (select coalesce(sum(extract(epoch from (x.end_time-x.start_time))/3600.0),0) from public.schedule_generation_assignments x where x.generation_id=v_generation and x.user_id=p.id),
                p.full_name,p.id
    loop
      select coalesce(sum(extract(epoch from (x.end_time-x.start_time))/3600.0),0)
        into v_daily
        from public.schedule_generation_assignments x
       where x.generation_id=v_generation and x.user_id=c.user_id and x.work_date=r.work_date;
      select coalesce(sum(extract(epoch from (x.end_time-x.start_time))/3600.0),0)
        into v_weekly
        from public.schedule_generation_assignments x
       where x.generation_id=v_generation and x.user_id=c.user_id;
      if c.max_daily_hours>0 and v_daily+v_hours>c.max_daily_hours then continue; end if;
      if c.max_weekly_hours>0 and v_weekly+v_hours>c.max_weekly_hours then continue; end if;

      insert into public.schedule_generation_assignments(
        generation_id,user_id,store_id,work_date,start_time,end_time,skill_code,skill_level,score,warning,status,note
      ) values(
        v_generation,c.user_id,p_store_id,r.work_date,r.start_time,r.end_time,r.skill_code,coalesce(r.min_skill_level,0),
        case when c.availability_type='PREFERRED' then 100 else 50 end + case when c.preferred_store_id=p_store_id then 20 else 0 end,
        null,'DRAFT',null
      );
      v_count:=v_count+1;

      select count(*) into v_assigned
        from public.schedule_generation_assignments x
       where x.generation_id=v_generation
         and x.work_date=r.work_date
         and x.start_time<=r.start_time and x.end_time>=r.end_time
         and x.store_id=p_store_id
         and (r.skill_code is null or exists(
           select 1 from public.employee_skills es2
            where es2.user_id=x.user_id and es2.skill_code=r.skill_code
              and es2.status='ACTIVE' and es2.level>=r.min_skill_level
         ));
      exit when v_assigned>=r.target_headcount;
    end loop;

    select count(*) into v_assigned
      from public.schedule_generation_assignments x
     where x.generation_id=v_generation
       and x.work_date=r.work_date
       and x.start_time<=r.start_time and x.end_time>=r.end_time
       and x.store_id=p_store_id
       and (r.skill_code is null or exists(
         select 1 from public.employee_skills es3
          where es3.user_id=x.user_id and es3.skill_code=r.skill_code
            and es3.status='ACTIVE' and es3.level>=r.min_skill_level
       ));
    if v_assigned<r.minimum_headcount then
      v_shortages:=v_shortages||jsonb_build_object(
        'requirement_id',r.id,'work_date',r.work_date,'start_time',r.start_time,'end_time',r.end_time,
        'minimum',r.minimum_headcount,'assigned',v_assigned,'target',r.target_headcount,'skill_code',r.skill_code
      );
    end if;
  end loop;

  update public.schedule_generation_runs
     set total_hours=coalesce((select sum(extract(epoch from (end_time-start_time))/3600.0) from public.schedule_generation_assignments where generation_id=v_generation),0)
   where id=v_generation;

  return jsonb_build_object(
    'generation_id',v_generation,
    'status','DRAFT',
    'assignment_count',v_count,
    'minimum_shortages',v_shortages,
    'warning_count',jsonb_array_length(v_shortages),
    'algorithm_version',coalesce(nullif(trim(p_algorithm_version),''),'GREEDY_V1')
  );
end;
$function$;
revoke all on function public.auto_generate_schedule_generation(uuid,date,text) from public;
grant execute on function public.auto_generate_schedule_generation(uuid,date,text) to authenticated;

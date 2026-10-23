-- #487/#489: run only in disposable Postgres after the unchanged staged migration.
-- This is trigger integration QA with synthetic JWT-identity context, not signed JWT E2E.
CREATE OR REPLACE FUNCTION public.qa_expect_rejected(label text, statement text, expected_error text)
RETURNS void LANGUAGE plpgsql SET search_path=''
AS $test$
BEGIN
 EXECUTE statement;
 RAISE EXCEPTION 'QA_MUTATION_NOT_BLOCKED: %',label;
EXCEPTION WHEN OTHERS THEN
 IF position(expected_error IN SQLERRM)=0 THEN
   RAISE EXCEPTION 'QA_WRONG_ERROR %: %, expected %',label,SQLERRM,expected_error;
 END IF;
END;
$test$;

DO $test$
DECLARE
 actor_manager constant uuid:='90000000-0000-4000-8000-000000000001';
 actor_employee constant uuid:='90000000-0000-4000-8000-000000000002';
 actor_other constant uuid:='90000000-0000-4000-8000-000000000003';
 actor_inactive constant uuid:='90000000-0000-4000-8000-000000000004';
 row_old constant uuid:='a0000000-0000-4000-8000-000000000001';
 row_other constant uuid:='a0000000-0000-4000-8000-000000000002';
 row_next constant uuid:='a0000000-0000-4000-8000-000000000003';
 local_time timestamp:=clock_timestamp() AT TIME ZONE 'Asia/Ho_Chi_Minh';
 current_monday date;
 next_monday date;
 window_open boolean;
 actual integer;
BEGIN
 current_monday:=local_time::date-(extract(isodow from local_time)::integer-1);
 next_monday:=current_monday+7;
 window_open:=public.employee_availability_window_open_v1(next_monday,clock_timestamp());

 -- Manager is a separate authorized business path, not subject to employee deadline.
 PERFORM set_config('request.jwt.claim.sub',actor_manager::text,true);
 INSERT INTO public.employee_availability(id,user_id,work_date,start_time,end_time)
 VALUES(row_old,actor_employee,current_monday,'06:00','10:00'),
       (row_other,actor_other,next_monday,'06:00','10:00'),
       (row_next,actor_employee,next_monday,'06:00','10:00');

 -- No direct client DML; real callers use authorized RPCs.
 IF has_table_privilege('authenticated','public.employee_availability','INSERT') OR
    has_table_privilege('authenticated','public.employee_availability','UPDATE') OR
    has_table_privilege('authenticated','public.employee_availability','DELETE') THEN
   RAISE EXCEPTION 'QA_DIRECT_TABLE_WRITE_PRIVILEGE';
 END IF;
 IF has_function_privilege('anon','public.enforce_employee_availability_window_v1()','EXECUTE') OR
    has_function_privilege('authenticated','public.enforce_employee_availability_window_v1()','EXECUTE') OR
    has_function_privilege('anon','public.employee_availability_window_open_v1(date,timestamptz)','EXECUTE') OR
    has_function_privilege('authenticated','public.employee_availability_window_open_v1(date,timestamptz)','EXECUTE')
 THEN RAISE EXCEPTION 'QA_TRIGGER_FUNCTION_EXECUTE_EXPOSED'; END IF;

 PERFORM set_config('request.jwt.claim.sub',actor_employee::text,true);
 PERFORM public.qa_expect_rejected('insert-this-week',
   format('INSERT INTO public.employee_availability(user_id,work_date,start_time,end_time) VALUES (%L,%L,%L,%L)',actor_employee,current_monday,'06:00','10:00'),
   'AVAILABILITY_REGISTRATION_CLOSED');
 PERFORM public.qa_expect_rejected('insert-two-weeks-later',
   format('INSERT INTO public.employee_availability(user_id,work_date,start_time,end_time) VALUES (%L,%L,%L,%L)',actor_employee,next_monday+7,'06:00','10:00'),
   'AVAILABILITY_REGISTRATION_CLOSED');
 PERFORM public.qa_expect_rejected('delete-expired-existing-row',
   format('DELETE FROM public.employee_availability WHERE id=%L',row_old),
   'AVAILABILITY_REGISTRATION_CLOSED');
 PERFORM public.qa_expect_rejected('move-old-row-to-next-week',
   format('UPDATE public.employee_availability SET work_date=%L WHERE id=%L',next_monday,row_old),
   'AVAILABILITY_REGISTRATION_CLOSED');
 PERFORM public.qa_expect_rejected('move-valid-row-to-current-week',
   format('UPDATE public.employee_availability SET work_date=%L WHERE id=%L',current_monday,row_next),
   'AVAILABILITY_REGISTRATION_CLOSED');
 PERFORM public.qa_expect_rejected('update-foreign-employee-row',
   format('UPDATE public.employee_availability SET start_time=%L WHERE id=%L','06:30',row_other),
   'AVAILABILITY_NOT_OWNED');
 PERFORM public.qa_expect_rejected('delete-foreign-employee-row',
   format('DELETE FROM public.employee_availability WHERE id=%L',row_other),
   'AVAILABILITY_NOT_OWNED');

 IF window_open THEN
   PERFORM public.qa_expect_rejected('off-half-hour',
     format('UPDATE public.employee_availability SET start_time=%L WHERE id=%L','06:15',row_next),
     'AVAILABILITY_INVALID_30_MINUTE_INTERVAL');
   PERFORM public.qa_expect_rejected('before-05',
     format('UPDATE public.employee_availability SET start_time=%L WHERE id=%L','04:30',row_next),
     'AVAILABILITY_INVALID_30_MINUTE_INTERVAL');
   PERFORM public.qa_expect_rejected('after-22',
     format('UPDATE public.employee_availability SET end_time=%L WHERE id=%L','22:30',row_next),
     'AVAILABILITY_INVALID_30_MINUTE_INTERVAL');
   UPDATE public.employee_availability SET start_time='06:30' WHERE id=row_next;
   IF NOT FOUND THEN RAISE EXCEPTION 'QA_VALID_UPDATE_FAILED'; END IF;
   DELETE FROM public.employee_availability WHERE id=row_next;
   IF NOT FOUND THEN RAISE EXCEPTION 'QA_VALID_DELETE_FAILED'; END IF;
 ELSE
   PERFORM public.qa_expect_rejected('cutoff-closed-next-week',
     format('UPDATE public.employee_availability SET start_time=%L WHERE id=%L','06:30',row_next),
     'AVAILABILITY_REGISTRATION_CLOSED');
 END IF;

 PERFORM set_config('request.jwt.claim.sub',actor_inactive::text,true);
 PERFORM public.qa_expect_rejected('inactive-actor',
   format('DELETE FROM public.employee_availability WHERE id=%L',row_next),
   'ACTOR_NOT_ACTIVE');
 SELECT count(*) INTO actual FROM public.employee_availability WHERE id IN(row_old,row_other);
 IF actual<>2 THEN RAISE EXCEPTION 'QA_NEGATIVE_TEST_CHANGED_ROWS %',actual; END IF;
 RAISE NOTICE 'EMPLOYEE_AVAILABILITY_TRIGGER_DML_PASS: open=%, checks include ownership, week, delete/update, 30m, ACL',window_open;
END;
$test$;

DO $test$
DECLARE bad_count integer;
BEGIN
 WITH test_cases(label,d,t,expected) AS (
 VALUES
 ('MONDAY_OPEN','2026-10-26'::date,'2026-10-19 00:00:00+07'::timestamptz,true),
 ('SUNDAY_115959_OPEN','2026-10-26'::date,'2026-10-25 11:59:59+07'::timestamptz,true),
 ('SUNDAY_120000_CLOSED','2026-10-26'::date,'2026-10-25 12:00:00+07'::timestamptz,false),
 ('SUNDAY_120001_CLOSED','2026-10-26'::date,'2026-10-25 12:00:01+07'::timestamptz,false),
 ('OUTSIDE_THIS_WEEK','2026-10-25'::date,'2026-10-23 07:00:00+07'::timestamptz,false),
 ('OUTSIDE_TWO_WEEKS','2026-11-02'::date,'2026-10-23 07:00:00+07'::timestamptz,false),
 ('SUNDAY_NEXT_WEEK_OPEN','2026-11-01'::date,'2026-10-23 07:00:00+07'::timestamptz,true),
 ('MONDAY_OLD_WEEK_CLOSED','2026-10-26'::date,'2026-10-26 00:00:00+07'::timestamptz,false),
 ('MONDAY_NEW_WEEK_OPEN','2026-11-02'::date,'2026-10-26 00:00:00+07'::timestamptz,true),
 ('YEAR_CHANGE_OPEN','2027-01-04'::date,'2026-12-28 01:00:00+07'::timestamptz,true),
 ('YEAR_CHANGE_OLD_CLOSED','2026-12-31'::date,'2026-12-28 01:00:00+07'::timestamptz,false)
 )
 SELECT count(*) INTO bad_count FROM test_cases
 WHERE public.employee_availability_window_open_v1(d,t) IS DISTINCT FROM expected;
 IF bad_count<>0 THEN RAISE EXCEPTION 'QA_VN_WINDOW_CASES_FAILED %',bad_count; END IF;
 RAISE NOTICE 'EMPLOYEE_AVAILABILITY_WINDOW_11_OF_11_PASS';
END;
$test$;

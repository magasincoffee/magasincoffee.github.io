-- Run only against the isolated CI database initialized from post-publish-adjustment-db-fixture.sql.
SET ROLE authenticated;
DO $test$
DECLARE
 v_date date := date_trunc('week',(now() at time zone 'Asia/Ho_Chi_Minh')::date+7)::date;
 v_store uuid := '11111111-1111-4111-8111-111111111111';
 v_a uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 v_b uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
 v_inactive uuid := 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
 v_replacement uuid := 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
 v_added jsonb;
 v_id uuid;
 v_count integer;
BEGIN
 PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
 PERFORM set_config('app.mock_role','OWNER',true);
 v_added:=public.add_published_shift_v1(v_store,v_date,'08:00','12:00',v_a,'Bổ sung vì thiếu người');
 IF NOT coalesce((v_added->>'saved')::boolean,false) THEN RAISE EXCEPTION 'ADD_FAILED'; END IF;
 v_id:=(v_added->>'schedule_id')::uuid;
 BEGIN
  PERFORM public.add_published_shift_v1(v_store,v_date,'09:00','11:00',v_a,'Trùng ca trong ngày');
  RAISE EXCEPTION 'OVERLAP_NOT_BLOCKED';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM<>'OFFICIAL_SCHEDULE_OVERLAP' THEN RAISE; END IF;
 END;
 PERFORM public.add_published_shift_v1(v_store,v_date,'08:00','12:00',v_b,'Bổ sung ca thứ nhất');
 PERFORM public.add_published_shift_v1(v_store,v_date,'13:00','16:00',v_b,'Bổ sung ca thứ hai');
 BEGIN
  PERFORM public.add_published_shift_v1(v_store,v_date,'17:00','19:00',v_b,'Thử ca thứ ba');
  RAISE EXCEPTION 'MAX_TWO_NOT_BLOCKED';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM<>'MAX_TWO_ASSIGNMENTS_PER_EMPLOYEE_DAY' THEN RAISE; END IF;
 END;
 BEGIN
  PERFORM public.reassign_published_shift_v1(v_id,v_inactive,'Thử điều động người nghỉ');
  RAISE EXCEPTION 'INACTIVE_NOT_BLOCKED';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM<>'EMPLOYEE_INACTIVE_OR_INVALID' THEN RAISE; END IF;
 END;
 BEGIN
  PERFORM public.reassign_published_shift_v1(v_id,v_b,'Thử điều động trùng ca');
  RAISE EXCEPTION 'REASSIGN_OVERLAP_NOT_BLOCKED';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM<>'OFFICIAL_SCHEDULE_OVERLAP' THEN RAISE; END IF;
 END;
 v_added:=public.reassign_published_shift_v1(v_id,v_replacement,'Đổi nhân viên theo điều động');
 IF NOT coalesce((v_added->>'saved')::boolean,false) THEN RAISE EXCEPTION 'REASSIGN_FAILED'; END IF;
 SELECT count(*) INTO v_count FROM public.list_manager_post_publish_audit_v1(v_store,v_date);
 IF v_count<>4 THEN RAISE EXCEPTION 'AUDIT_COUNT_FAILED %',v_count; END IF;
 PERFORM set_config('app.mock_role','STAFF',true);
 BEGIN
  PERFORM public.add_published_shift_v1(v_store,v_date,'16:00','18:00',v_a,'Không đủ quyền quản lý');
  RAISE EXCEPTION 'ROLE_NOT_BLOCKED';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM<>'ROLE_NOT_ALLOWED' THEN RAISE; END IF;
 END;
 PERFORM set_config('app.mock_role','OWNER',true);
 PERFORM set_config('request.jwt.claim.sub','',true);
 BEGIN
  PERFORM public.add_published_shift_v1(v_store,v_date,'16:00','18:00',v_a,'Không đăng nhập');
  RAISE EXCEPTION 'UNAUTH_NOT_BLOCKED';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM<>'AUTH_REQUIRED' THEN RAISE; END IF;
 END;
 RAISE NOTICE 'POST_PUBLISH_POSTGRES_SMOKE=PASS';
END
$test$;
RESET ROLE;
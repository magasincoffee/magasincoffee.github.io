-- #487 disposable QA pilot: only synthetic CN3 enabled, all other stores OFF.
-- Never run this fixture on hosted MAGASIN production.
INSERT INTO public.attendance_auto_confirm_policy_v1(store_id,enabled)
VALUES('91000000-0000-4000-8000-000000000003',true);
DO $qa$ BEGIN
 IF (SELECT count(*) FROM public.attendance_auto_confirm_policy_v1 WHERE enabled)=1
    AND EXISTS(SELECT 1 FROM public.attendance_auto_confirm_policy_v1
       WHERE store_id='91000000-0000-4000-8000-000000000003' AND enabled)
    AND NOT EXISTS(SELECT 1 FROM public.attendance_auto_confirm_policy_v1
       WHERE store_id='91000000-0000-4000-8000-000000000001' AND enabled)
 THEN RAISE NOTICE 'QA_STORE_PILOT_ONLY_CN3_ENABLED=PASS';
 ELSE RAISE EXCEPTION 'QA_STORE_PILOT_SCOPE_INVALID'; END IF;
END $qa$;

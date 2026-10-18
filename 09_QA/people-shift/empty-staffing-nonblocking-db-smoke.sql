-- Read/write only inside isolated GitHub Actions PostgreSQL fixture.
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
SELECT set_config('app.mock_role','OWNER',false);
SET ROLE authenticated;
DO $test$
DECLARE r jsonb;
BEGIN
 r:=public.validate_schedule_generation_v1('88888888-8888-4888-8888-888888888888');
 IF NOT coalesce((r->>'valid')::boolean,false)
   OR (r->>'assignment_count')::integer<>0
   OR (r->>'warning_count')::integer<>1
   OR NOT (r->'warnings' @> '[{"code":"EMPTY_STAFFING_SHORTAGE_NON_BLOCKING"}]'::jsonb)
 THEN RAISE EXCEPTION 'CONFIGURED_EMPTY_WEEK_SHOULD_BE_VALID %',r; END IF;
 RAISE NOTICE 'EMPTY_STAFFING_WITH_REQUIREMENTS=PASS';
END
$test$;
RESET ROLE;
-- Remove requirements only in ephemeral fixture to verify fail-closed behaviour.
DELETE FROM public.workforce_recurring_staffing_requirements;
SET ROLE authenticated;
DO $test$
DECLARE r jsonb;
BEGIN
 r:=public.validate_schedule_generation_v1('88888888-8888-4888-8888-888888888888');
 IF coalesce((r->>'valid')::boolean,true)
  OR NOT (r->'violations' @> '[{"code":"EMPTY_GENERATION"}]'::jsonb)
 THEN RAISE EXCEPTION 'UNCONFIGURED_EMPTY_WEEK_MUST_BE_BLOCKED %',r; END IF;
 RAISE NOTICE 'EMPTY_STAFFING_WITHOUT_REQUIREMENTS=PASS';
END
$test$;
RESET ROLE;
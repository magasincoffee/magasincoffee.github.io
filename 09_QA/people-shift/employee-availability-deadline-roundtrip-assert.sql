-- #487: SQL-independent after-check in disposable PostgreSQL only.
-- Compare every persisted column, not just count, against pre-E2E fixture snapshot.
DO $qa$
DECLARE
  added integer;
  removed integer;
BEGIN
  SELECT count(*) INTO added
  FROM (
    SELECT * FROM public.employee_availability
    EXCEPT ALL
    SELECT * FROM qa_private.employee_availability_baseline
  ) x;
  SELECT count(*) INTO removed
  FROM (
    SELECT * FROM qa_private.employee_availability_baseline
    EXCEPT ALL
    SELECT * FROM public.employee_availability
  ) x;
  IF added<>0 OR removed<>0 THEN
    RAISE EXCEPTION 'QA_ISOLATED_AVAILABILITY_NOT_RESTORED: added=% removed=%',added,removed;
  END IF;
  RAISE NOTICE 'QA_ISOLATED_AVAILABILITY_ROUNDTRIP_RESTORED=PASS added=% removed=%',added,removed;
END;
$qa$;

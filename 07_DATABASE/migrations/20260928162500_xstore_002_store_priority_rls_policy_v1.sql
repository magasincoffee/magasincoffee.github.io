-- XSTORE-002 hardening — explicit deny direct table access.
-- RPCs remain the only browser authority for employee_store_priorities.

drop policy if exists employee_store_priorities_no_direct_access
  on public.employee_store_priorities;

create policy employee_store_priorities_no_direct_access
  on public.employee_store_priorities
  for all
  to authenticated
  using (false)
  with check (false);

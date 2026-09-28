-- AUTH-PROD-005 correction: allow Owner Access UI to update role/status through RLS.
-- Security model:
--   * authenticated receives UPDATE privilege only for role + status columns.
--   * public.profiles RLS remains enabled.
--   * profiles_update_owner remains the authorization boundary; non-OWNER users are denied.
--   * no INSERT/DELETE privilege is granted.

revoke update on table public.profiles from anon;
grant update (role, status) on table public.profiles to authenticated;

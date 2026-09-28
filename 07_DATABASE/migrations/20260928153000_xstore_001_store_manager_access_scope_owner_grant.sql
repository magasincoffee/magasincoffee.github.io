-- XSTORE-001 — Store Manager access scope assignment from Owner Access.
-- STORE_MANAGER = Quản lý cửa hàng and receives ALL store scope for the shared Workforce model.
-- INVENTORY_MANAGER = Quản lý kho and remains outside Workforce.
-- Security: authenticated receives UPDATE privilege only on access_scope in addition to the existing bounded role/status grants.
-- public.profiles RLS remains the authorization boundary; profiles_update_owner permits only OWNER updates.

revoke update (access_scope) on table public.profiles from anon;
grant update (access_scope) on table public.profiles to authenticated;

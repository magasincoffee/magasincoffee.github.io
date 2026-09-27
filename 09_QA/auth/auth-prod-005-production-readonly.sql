-- AUTH-PROD-005 / Layer B — production read-only reconciliation.
-- READ ONLY. Do not add UPDATE/INSERT/DELETE/DDL statements to this file.

-- 1) Auth/profile cardinality and aggregate lifecycle state. No identities are returned.
with auth_counts as (
  select count(*)::int as auth_users,
         count(*) filter (where email_confirmed_at is not null)::int as confirmed_users
  from auth.users
),
profile_counts as (
  select count(*)::int as profiles,
         count(*) filter (where upper(status)='ACTIVE')::int as active,
         count(*) filter (where upper(status)='PENDING')::int as pending,
         count(*) filter (where upper(status)='INACTIVE')::int as inactive,
         count(*) filter (where upper(role)='OWNER')::int as owners
  from public.profiles
),
missing_profile as (
  select count(*)::int as auth_without_profile
  from auth.users u left join public.profiles p on p.id=u.id
  where p.id is null
),
orphan_profile as (
  select count(*)::int as profile_without_auth
  from public.profiles p left join auth.users u on u.id=p.id
  where u.id is null
)
select a.*, p.*, m.auth_without_profile, o.profile_without_auth
from auth_counts a, profile_counts p, missing_profile m, orphan_profile o;

-- 2) Aggregate role/status distribution only; no usernames/emails/UUIDs.
select upper(coalesce(role,'<NULL>')) as role,
       upper(coalesce(status,'<NULL>')) as status,
       count(*)::int as count
from public.profiles
group by 1,2
order by 1,2;

-- 3) profiles RLS and policy contract.
select c.relrowsecurity as profiles_rls_enabled
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='profiles';

select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname='public' and tablename='profiles'
order by policyname;

-- 4) Username resolver execution/security contract.
select p.proname as name,
       p.prosecdef as security_definer,
       pg_get_function_identity_arguments(p.oid) as identity_args,
       has_function_privilege('public', p.oid, 'EXECUTE') as execute_public,
       has_function_privilege('anon', p.oid, 'EXECUTE') as execute_anon,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as execute_authenticated
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='resolve_login_email';

-- 5) Auth-user profile projection trigger contract.
select t.tgname as trigger_name, p.proname as function_name, t.tgenabled as enabled
from pg_trigger t
join pg_class c on c.oid=t.tgrelid
join pg_namespace n on n.oid=c.relnamespace
join pg_proc p on p.oid=t.tgfoid
where n.nspname='auth' and c.relname='users' and not t.tgisinternal
order by t.tgname;

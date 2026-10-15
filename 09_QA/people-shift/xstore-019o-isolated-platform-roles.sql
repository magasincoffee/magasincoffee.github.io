-- XSTORE-019O strictly isolated, test-only role replay.
-- Based solely on read-only production pg_roles / pg_auth_members inventory (2026-10-15).
-- Does NOT include passwords, Auth users, employee data or other production secrets.
-- Never run this script against production. Container MUST have --network none.
DO $bootstrap$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('anon',false,true,false,false,false,false,false),
      ('authenticated',false,true,false,false,false,false,false),
      ('authenticator',true,false,false,false,false,false,false),
      ('dashboard_user',false,true,false,true,true,true,false),
      ('pgbouncer',true,true,false,false,false,false,false),
      ('postgres',true,true,false,true,true,true,true),
      ('service_role',false,true,false,false,false,false,true),
      ('supabase_admin',true,true,true,true,true,true,true),
      ('supabase_auth_admin',true,false,false,true,false,false,false),
      ('supabase_etl_admin',true,true,false,false,false,true,true),
      ('supabase_privileged_role',false,true,false,false,false,false,false),
      ('supabase_read_only_user',true,true,false,false,false,false,true),
      ('supabase_realtime_admin',false,false,false,false,false,false,false),
      ('supabase_replication_admin',true,true,false,false,false,true,false),
      ('supabase_storage_admin',true,false,false,true,false,false,false)
    ) AS role_spec(name, login_flag, inherit_flag, super_flag, create_role_flag, create_db_flag, replication_flag, bypass_flag)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname=r.name) THEN
      EXECUTE format(
        'CREATE ROLE %I WITH %s %s %s %s %s %s %s',
        r.name,
        CASE WHEN r.login_flag THEN 'LOGIN' ELSE 'NOLOGIN' END,
        CASE WHEN r.inherit_flag THEN 'INHERIT' ELSE 'NOINHERIT' END,
        CASE WHEN r.super_flag THEN 'SUPERUSER' ELSE 'NOSUPERUSER' END,
        CASE WHEN r.create_role_flag THEN 'CREATEROLE' ELSE 'NOCREATEROLE' END,
        CASE WHEN r.create_db_flag THEN 'CREATEDB' ELSE 'NOCREATEDB' END,
        CASE WHEN r.replication_flag THEN 'REPLICATION' ELSE 'NOREPLICATION' END,
        CASE WHEN r.bypass_flag THEN 'BYPASSRLS' ELSE 'NOBYPASSRLS' END
      );
    END IF;
  END LOOP;
END
$bootstrap$;

-- Rehydrate source-side global membership graph. No credentials copied.
GRANT anon TO authenticator;
GRANT anon TO postgres WITH ADMIN OPTION;
GRANT anon TO supabase_realtime_admin;
GRANT authenticated TO authenticator;
GRANT authenticated TO postgres WITH ADMIN OPTION;
GRANT authenticated TO supabase_realtime_admin;
GRANT authenticator TO postgres WITH ADMIN OPTION;
GRANT authenticator TO supabase_storage_admin;
GRANT service_role TO authenticator;
GRANT service_role TO postgres WITH ADMIN OPTION;
GRANT service_role TO supabase_realtime_admin;
GRANT supabase_privileged_role TO postgres;
GRANT supabase_privileged_role TO supabase_etl_admin;

-- This is metadata-only, never read actual Auth/passwords/employee records.
DO $verify$
DECLARE missing int;
BEGIN
  SELECT count(*) INTO missing FROM (VALUES
    ('anon'),('authenticated'),('authenticator'),('dashboard_user'),
    ('pgbouncer'),('postgres'),('service_role'),('supabase_admin'),
    ('supabase_auth_admin'),('supabase_etl_admin'),('supabase_privileged_role'),
    ('supabase_read_only_user'),('supabase_realtime_admin'),
    ('supabase_replication_admin'),('supabase_storage_admin')
  ) AS required_roles(name)
  WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname=required_roles.name);
  IF missing<>0 THEN RAISE EXCEPTION 'ISOLATED_ROLE_BOOTSTRAP_INCOMPLETE'; END IF;
END
$verify$;

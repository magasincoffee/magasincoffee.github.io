-- XSTORE-019O: fingerprint only, never select/store data rows.
-- Expected against read-only MAGASIN-NOIBO catalog, 2026-10-15.
-- Differential ownership/ACL assurance on an isolated full backup restore.
WITH acl_entries AS (
 SELECT 'rel|'||n.nspname||'.'||c.relname||'|'||c.relkind::text||'|'||
  pg_get_userbyid(c.relowner)||'|'||
  coalesce((select string_agg(a::text,',' ORDER BY a::text) from unnest(c.relacl) a),'<DEFAULT>')||
  '|'||c.relrowsecurity::text AS line
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S','f')
 UNION ALL
 SELECT 'fn|'||n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')|'||
  pg_get_userbyid(p.proowner)||'|'||
  coalesce((select string_agg(a::text,',' ORDER BY a::text) from unnest(p.proacl) a),'<DEFAULT>')||
  '|'||p.prosecdef::text
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
), acl_summary AS (
 SELECT md5(string_agg(line,E'\n' ORDER BY line)) AS fingerprint,
 count(*)::int AS objects,
 count(*) FILTER(WHERE line LIKE 'fn|%')::int AS functions,
 count(*) FILTER(WHERE line LIKE 'rel|%')::int AS relations FROM acl_entries
), policy_summary AS (
 SELECT md5(string_agg(schemaname||'.'||tablename||'|'||policyname||'|'||cmd||'|'||
 permissive||'|'||coalesce(array_to_string(roles,','),'')||'|'||coalesce(qual,'')||'|'||
 coalesce(with_check,''),E'\n' ORDER BY schemaname,tablename,policyname)) AS fingerprint,
 count(*)::int AS policies
 FROM pg_policies WHERE schemaname='public'
)
SELECT CASE WHEN acl_summary.fingerprint='b5b88de4957daa0e8ad372002134cdf0'
  AND acl_summary.objects=171 AND acl_summary.functions=114 AND acl_summary.relations=57
  AND policy_summary.fingerprint='e28436fb4f8558416d23eb8f5af57795'
  AND policy_summary.policies=54
 THEN 'PASS' ELSE 'FAIL' END
FROM acl_summary,policy_summary;

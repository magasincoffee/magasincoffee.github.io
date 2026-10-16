-- XSTORE-019O: read-only catalog parity dimensions on a disconnected disposable clone.
-- Outputs only PASS/FAIL tokens, never names, values, SQL statements or data rows.
-- Reference hashes captured from read-only MAGASIN-NOIBO metadata on 2026-10-16.
WITH rel AS (
 SELECT n.nspname||'.'||c.relname||'|'||c.relkind::text AS object_key,
 pg_get_userbyid(c.relowner) AS owner,
 coalesce((SELECT string_agg(a::text,',' ORDER BY a::text) FROM unnest(c.relacl) a),'<DEFAULT>') AS acl,
 c.relrowsecurity::text AS rls
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S','f')
), fn AS (
 SELECT n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' AS object_key,
 pg_get_userbyid(p.proowner) AS owner,
 coalesce((SELECT string_agg(a::text,',' ORDER BY a::text) FROM unnest(p.proacl) a),'<DEFAULT>') AS acl,
 p.prosecdef::text AS secdef
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
), pol AS (
 SELECT schemaname||'.'||tablename||'|'||policyname AS object_key,
 cmd||'|'||permissive||'|'||coalesce(array_to_string(roles,','),'') AS access,
 coalesce(qual,'')||'|'||coalesce(with_check,'') AS predicate
 FROM pg_policies WHERE schemaname='public'
)
SELECT 'XSTORE_019O_PARITY_DIMENSIONS; ' ||
  'REL_OWNER=' || (CASE WHEN (SELECT md5(string_agg(object_key||'|'||owner,chr(10) ORDER BY object_key)) FROM rel)='8511ab98658ddf32dde8375391d0a81e' THEN 'PASS' ELSE 'FAIL' END) || '; ' ||
  'REL_ACL=' || (CASE WHEN (SELECT md5(string_agg(object_key||'|'||acl,chr(10) ORDER BY object_key)) FROM rel)='80d9c103bbbfa48b2528a12f51041b14' THEN 'PASS' ELSE 'FAIL' END) || '; ' ||
  'REL_RLS=' || (CASE WHEN (SELECT md5(string_agg(object_key||'|'||rls,chr(10) ORDER BY object_key)) FROM rel)='a533fbd75ae8045df63857e2f9fc9398' THEN 'PASS' ELSE 'FAIL' END) || '; ' ||
  'FN_OWNER=' || (CASE WHEN (SELECT md5(string_agg(object_key||'|'||owner,chr(10) ORDER BY object_key)) FROM fn)='09e6683e6b44bcba646fb377e474cfed' THEN 'PASS' ELSE 'FAIL' END) || '; ' ||
  'FN_ACL=' || (CASE WHEN (SELECT md5(string_agg(object_key||'|'||acl,chr(10) ORDER BY object_key)) FROM fn)='7d695ee49d44f17078eb766fbd443859' THEN 'PASS' ELSE 'FAIL' END) || '; ' ||
  'FN_DEFINER=' || (CASE WHEN (SELECT md5(string_agg(object_key||'|'||secdef,chr(10) ORDER BY object_key)) FROM fn)='d1f1533ffef69ce67f008072f45e6913' THEN 'PASS' ELSE 'FAIL' END) || '; ' ||
  'POL_ACCESS=' || (CASE WHEN (SELECT md5(string_agg(object_key||'|'||access,chr(10) ORDER BY object_key)) FROM pol)='acf4e6b4edff6752b70eaf7b12638dba' THEN 'PASS' ELSE 'FAIL' END) || '; ' ||
  'POL_PREDICATE=' || (CASE WHEN (SELECT md5(string_agg(object_key||'|'||predicate,chr(10) ORDER BY object_key)) FROM pol)='9032a1255e0a27f27c55f4b64804d763' THEN 'PASS' ELSE 'FAIL' END) || '; ' ||
  'REL_COUNT=' || (CASE WHEN (SELECT count(*) FROM rel)=57 THEN 'PASS' ELSE 'FAIL' END) || '; ' ||
  'FN_COUNT=' || (CASE WHEN (SELECT count(*) FROM fn)=114 THEN 'PASS' ELSE 'FAIL' END) || '; ' ||
  'POL_COUNT=' || (CASE WHEN (SELECT count(*) FROM pol)=54 THEN 'PASS' ELSE 'FAIL' END) AS result;

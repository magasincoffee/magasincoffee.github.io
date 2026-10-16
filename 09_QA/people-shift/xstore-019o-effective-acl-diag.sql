-- XSTORE-019O owner/ACL diagnostics in network-disconnected private restore target.
-- Only fixed-format binary PASS/FAIL flags are safe for Actions logs.
WITH r AS (
 SELECT n.nspname||'.'||c.relname||'|'||c.relkind::text AS obj, 
   c.relacl AS acl, c.relowner AS owner_oid,
   CASE WHEN c.relkind='S' THEN 'S' ELSE 'r' END::"char" AS acl_type
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S','f')
), f AS (
 SELECT n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' AS obj,
 p.proacl AS acl, p.proowner AS owner_oid
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public'
), ra AS (
 SELECT r.obj,
   CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,
   pg_get_userbyid(a.grantor) AS grantor,a.privilege_type,a.is_grantable
 FROM r CROSS JOIN LATERAL aclexplode(coalesce(r.acl,acldefault(r.acl_type,r.owner_oid))) a
), fa AS (
 SELECT f.obj,
   CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,
   pg_get_userbyid(a.grantor) AS grantor,a.privilege_type,a.is_grantable
 FROM f CROSS JOIN LATERAL aclexplode(coalesce(f.acl,acldefault('f'::"char",f.owner_oid))) a
), result AS (
 SELECT
  (SELECT count(*) FROM ra)=947 AS rel_edges,
  (SELECT count(*) FROM fa)=210 AS fn_edges,
  (SELECT count(*) FILTER(WHERE acl IS NULL) FROM r)=0 AS rel_null,
  (SELECT count(*) FILTER(WHERE acl IS NULL) FROM f)=6 AS fn_null,
  (SELECT md5(string_agg(obj||'|'||grantee||'|'||privilege_type||'|'||is_grantable,chr(10) ORDER BY obj,grantee,privilege_type,is_grantable)) FROM ra)='6fe5e0761690f3ac3394e3f519d38e8e' AS rel_semantics,
  (SELECT md5(string_agg(obj||'|'||grantee||'|'||privilege_type||'|'||is_grantable,chr(10) ORDER BY obj,grantee,privilege_type,is_grantable)) FROM fa)='b32678a73ab42dd3fa33d9e88d452130' AS fn_semantics,
  (SELECT md5(string_agg(obj||'|'||grantee||'|'||grantor||'|'||privilege_type||'|'||is_grantable,chr(10) ORDER BY obj,grantee,grantor,privilege_type,is_grantable)) FROM ra)='246d5a1c81ae9f0e2a73aae4b3535945' AS rel_grantor,
  (SELECT md5(string_agg(obj||'|'||grantee||'|'||grantor||'|'||privilege_type||'|'||is_grantable,chr(10) ORDER BY obj,grantee,grantor,privilege_type,is_grantable)) FROM fa)='502b92fefe374cce1daf59766124a572' AS fn_grantor
)
SELECT 'XSTORE_019O_ACL_EFFECTIVE_DIAG; '||
 'REL_EDGES='||CASE WHEN rel_edges THEN 'PASS' ELSE 'FAIL' END||'; '||
 'FN_EDGES='||CASE WHEN fn_edges THEN 'PASS' ELSE 'FAIL' END||'; '||
 'REL_NULL='||CASE WHEN rel_null THEN 'PASS' ELSE 'FAIL' END||'; '||
 'FN_NULL='||CASE WHEN fn_null THEN 'PASS' ELSE 'FAIL' END||'; '||
 'REL_SEMANTICS='||CASE WHEN rel_semantics THEN 'PASS' ELSE 'FAIL' END||'; '||
 'FN_SEMANTICS='||CASE WHEN fn_semantics THEN 'PASS' ELSE 'FAIL' END||'; '||
 'REL_GRANTOR='||CASE WHEN rel_grantor THEN 'PASS' ELSE 'FAIL' END||'; '||
 'FN_GRANTOR='||CASE WHEN fn_grantor THEN 'PASS' ELSE 'FAIL' END AS result
FROM result;

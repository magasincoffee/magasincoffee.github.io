-- XSTORE-019O: diagnostic only on disposable clone, fixed role aggregates; never output private names/data.
WITH objects AS (
 SELECT 'REL' AS kind, c.relacl AS acl, c.relowner AS owner_oid,
 CASE WHEN c.relkind='S' THEN 'S' ELSE 'r' END::"char" AS acltype
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN('r','p','v','m','S','f')
 UNION ALL
 SELECT 'FN', p.proacl,p.proowner,'f'::"char" FROM pg_proc p
 JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
), grants AS (
 SELECT objects.kind, CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,
 pg_get_userbyid(a.grantor) AS grantor
 FROM objects CROSS JOIN LATERAL aclexplode(coalesce(objects.acl,acldefault(objects.acltype,objects.owner_oid))) a
), metrics AS (
 SELECT
 count(*) FILTER(WHERE kind='REL')::int AS rel_total,
 count(*) FILTER(WHERE kind='REL' AND grantee='postgres')::int AS rel_owner,
 count(*) FILTER(WHERE kind='REL' AND grantee='anon')::int AS rel_anon,
 count(*) FILTER(WHERE kind='REL' AND grantee='authenticated')::int AS rel_auth,
 count(*) FILTER(WHERE kind='REL' AND grantee='service_role')::int AS rel_service,
 count(*) FILTER(WHERE kind='REL' AND grantee='PUBLIC')::int AS rel_public,
 count(*) FILTER(WHERE kind='REL' AND grantee NOT IN ('postgres','anon','authenticated','service_role','PUBLIC'))::int AS rel_other,
 count(*) FILTER(WHERE kind='FN')::int AS fn_total,
 count(*) FILTER(WHERE kind='FN' AND grantee='postgres')::int AS fn_owner,
 count(*) FILTER(WHERE kind='FN' AND grantee='anon')::int AS fn_anon,
 count(*) FILTER(WHERE kind='FN' AND grantee='authenticated')::int AS fn_auth,
 count(*) FILTER(WHERE kind='FN' AND grantee='service_role')::int AS fn_service,
 count(*) FILTER(WHERE kind='FN' AND grantee='PUBLIC')::int AS fn_public,
 count(*) FILTER(WHERE kind='FN' AND grantee NOT IN ('postgres','anon','authenticated','service_role','PUBLIC'))::int AS fn_other,
 count(*) FILTER(WHERE kind='REL' AND grantor='postgres')::int AS rel_grantor_postgres,
 count(*) FILTER(WHERE kind='FN' AND grantor='postgres')::int AS fn_grantor_postgres
 FROM grants
)
SELECT 'XSTORE_019O_ACL_AGGREGATE; '||
 'REL_TOTAL='||rel_total::text||'; '||
 'REL_OWNER='||rel_owner::text||'; '||
 'REL_ANON='||rel_anon::text||'; '||
 'REL_AUTH='||rel_auth::text||'; '||
 'REL_SERVICE='||rel_service::text||'; '||
 'REL_PUBLIC='||rel_public::text||'; '||
 'REL_OTHER='||rel_other::text||'; '||
 'FN_TOTAL='||fn_total::text||'; '||
 'FN_OWNER='||fn_owner::text||'; '||
 'FN_ANON='||fn_anon::text||'; '||
 'FN_AUTH='||fn_auth::text||'; '||
 'FN_SERVICE='||fn_service::text||'; '||
 'FN_PUBLIC='||fn_public::text||'; '||
 'FN_OTHER='||fn_other::text||'; '||
 'REL_GRANTOR_POSTGRES='||rel_grantor_postgres::text||'; '||
 'FN_GRANTOR_POSTGRES='||fn_grantor_postgres::text AS result FROM metrics;

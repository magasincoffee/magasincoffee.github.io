-- SAPO branch resolution: isolate elevated direct EXECUTE from public API actors.
-- SECURITY DRAFT ONLY. Must pass full schema/real robot integration and Owner production approval.
-- The trusted ingestion worker uses ingest_sapo_batch with a separate integration token.
-- Retain that token-gated wrapper's existing ACL unchanged.
--
-- Existing live function: public.resolve_sapo_order_branches(date DEFAULT NULL)
-- Existing guarded wrapper: public.ingest_sapo_batch(text,jsonb,jsonb,jsonb,jsonb)
-- Do not invoke the resolver on live data during migration or QA.

do $preflight$
declare
  v_resolver oid := to_regprocedure('public.resolve_sapo_order_branches(date)');
  v_ingest oid := to_regprocedure('public.ingest_sapo_batch(text,jsonb,jsonb,jsonb,jsonb)');
begin
  if v_resolver is null or v_ingest is null then
    raise exception 'SAPO_ACL_MISSING_REQUIRED_RPC';
  end if;
  if not exists (
    select 1 from pg_proc where oid=v_resolver and prosecdef
  ) then
    raise exception 'SAPO_ACL_RESOLVER_DEFINITION_CHANGED';
  end if;
  if not exists (
    select 1 from pg_proc where oid=v_ingest and prosecdef
  ) then
    raise exception 'SAPO_ACL_INGEST_DEFINITION_CHANGED';
  end if;
  if position('magasin_verify_integration_token(p_token)'
    in lower(pg_get_functiondef(v_ingest)))=0
     or position('resolve_sapo_order_branches' 
    in lower(pg_get_functiondef(v_ingest)))=0 then
    raise exception 'SAPO_ACL_INGEST_TOKEN_BOUNDARY_CHANGED';
  end if;
end;
$preflight$;

-- Revoke PUBLIC inherited access (revoke from anon alone is not sufficient).
-- The privileged ingestion wrapper executes as postgres and retains its
-- internal function call; no change to ingest_sapo_batch grants or body.
revoke execute on function public.resolve_sapo_order_branches(date)
  from public, anon, authenticated;

-- Keep a dedicated server role eligible for explicit maintenance workflows.
-- Never expose service_role credentials in the browser, robot manifest or logs.
grant execute on function public.resolve_sapo_order_branches(date)
  to service_role;

do $postcondition$
begin
  if has_function_privilege('anon',
     'public.resolve_sapo_order_branches(date)','EXECUTE')
     or has_function_privilege('authenticated',
     'public.resolve_sapo_order_branches(date)','EXECUTE') then
    raise exception 'SAPO_ACL_PUBLIC_RESOLVER_STILL_EXECUTABLE';
  end if;
  if not has_function_privilege('service_role',
     'public.resolve_sapo_order_branches(date)','EXECUTE')
     or not has_function_privilege('anon',
     'public.ingest_sapo_batch(text,jsonb,jsonb,jsonb,jsonb)','EXECUTE') then
    raise exception 'SAPO_ACL_REQUIRED_INGEST_SERVICE_PATH_BROKEN';
  end if;
end;
$postcondition$;

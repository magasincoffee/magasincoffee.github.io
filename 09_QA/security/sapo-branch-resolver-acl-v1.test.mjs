import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration=readFileSync(
  '07_DATABASE/migrations/20261011053056_sapo_branch_resolution_acl_v1.sql',
  'utf8'
);

test('SAPO P0 prevents PUBLIC, anon and authenticated direct resolver execution',()=>{
  assert.match(migration,/revoke\s+execute\s+on\s+function\s+public\.resolve_sapo_order_branches\(date\)\s+from\s+public,\s*anon,\s*authenticated\s*;/i);
  assert.match(migration,/grant\s+execute\s+on\s+function\s+public\.resolve_sapo_order_branches\(date\)\s+to\s+service_role\s*;/i);
  assert.match(migration,/SAPO_ACL_PUBLIC_RESOLVER_STILL_EXECUTABLE/);
});
test('SAPO P0 preserves existing guarded ingestion contract',()=>{
  assert.match(migration,/to_regprocedure\('public\.ingest_sapo_batch\(text,jsonb,jsonb,jsonb,jsonb\)'\)/);
  assert.match(migration,/magasin_verify_integration_token\(p_token\)/);
  assert.match(migration,/SAPO_ACL_REQUIRED_INGEST_SERVICE_PATH_BROKEN/);
  assert.doesNotMatch(migration,/\b(revoke|alter)\s+.*public\.ingest_sapo_batch\(/i);
});
test('SAPO P0 modifies grants only, not paid orders or schedules',()=>{
  assert.doesNotMatch(migration,/\b(insert\s+into|update|delete\s+from|truncate)\s+public\.sapo_orders\b/i);
  assert.doesNotMatch(migration,/\bperform\s+public\.resolve_sapo_order_branches\s*\(/i);
  assert.doesNotMatch(migration,/\bdrop\s+function\b/i);
});
console.log('SAPO_BRANCH_RESOLVER_ACL_STATIC=PASS');

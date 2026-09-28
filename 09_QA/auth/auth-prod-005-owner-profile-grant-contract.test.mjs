import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationPath = new URL('../../07_DATABASE/migrations/20260928094000_auth_prod_005_owner_profile_update_grant.sql', import.meta.url);
const sql = (await readFile(migrationPath, 'utf8')).replace(/--.*$/gm, '').replace(/\s+/g, ' ').trim().toLowerCase();

test('AUTH-PROD-005: Owner Access writer gets only bounded role/status UPDATE privilege', () => {
  assert.match(
    sql,
    /grant update\s*\(\s*role\s*,\s*status\s*\)\s+on\s+(table\s+)?public\.profiles\s+to\s+authenticated\s*;/,
    'authenticated must receive UPDATE only for role/status columns'
  );
  assert.doesNotMatch(
    sql,
    /grant\s+update\s+on\s+(table\s+)?public\.profiles\s+to\s+authenticated/,
    'migration must not grant broad table-level UPDATE'
  );
  assert.match(
    sql,
    /revoke\s+update\s+on\s+(table\s+)?public\.profiles\s+from\s+anon\s*;/,
    'anon UPDATE must remain revoked'
  );
});

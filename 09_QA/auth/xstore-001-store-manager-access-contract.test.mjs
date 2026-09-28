import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const accessPath = new URL('../../04_OWNER/Access/index.html', import.meta.url);
const migrationPath = new URL('../../07_DATABASE/migrations/20260928153000_xstore_001_store_manager_access_scope_owner_grant.sql', import.meta.url);
const access = await readFile(accessPath, 'utf8');
const sql = (await readFile(migrationPath, 'utf8')).replace(/--.*$/gm, '').replace(/\s+/g, ' ').trim().toLowerCase();

test('XSTORE-001: Owner Access exposes distinct Store Manager and Inventory Manager roles', () => {
  assert.match(access, /\['STORE_MANAGER','Quản lý cửa hàng'\]/);
  assert.match(access, /\['INVENTORY_MANAGER','Quản lý kho'\]/);
});

test('XSTORE-001: Store Manager receives ALL cross-store Workforce scope and other roles do not retain it', () => {
  assert.match(access, /nextRole==='STORE_MANAGER'\?'ALL':''/);
  assert.match(access, /access_scope:nextScope/);
  assert.match(access, /select\('id,full_name,username,email,role,status,access_scope'\)/);
});

test('XSTORE-001: access_scope UPDATE stays bounded by existing Owner-only RLS', () => {
  assert.match(sql, /revoke update\s*\(\s*access_scope\s*\)\s+on\s+(table\s+)?public\.profiles\s+from\s+anon\s*;/);
  assert.match(sql, /grant update\s*\(\s*access_scope\s*\)\s+on\s+(table\s+)?public\.profiles\s+to\s+authenticated\s*;/);
  assert.doesNotMatch(sql, /grant\s+update\s+on\s+(table\s+)?public\.profiles\s+to\s+authenticated/);
});


test('XSTORE-001: Owner Access save action remains usable for non-Owner accounts', () => {
  assert.match(access, /<button class="btn primary" data-save>Lưu quyền & trạng thái<\/button>/);
  assert.match(access, /function syncSaveState\(row\)[\s\S]*btn\.disabled=false;/);
  assert.doesNotMatch(access, /data-save disabled>Lưu quyền & trạng thái/);
});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const employeeShell = fs.readFileSync('02_CORE/ui/magasin-ui-v2-employee-shell.js', 'utf8');
const employeeApp = fs.readFileSync('06_EMPLOYEE/app/employee-v40.html', 'utf8');

test('AUTH-PROD-005: Employee logout clears local Supabase session before returning to Auth', () => {
  assert.match(employeeApp, /class=["']logout-btn["']/, 'Employee surface must expose logout');
  assert.match(employeeShell, /querySelector\(\s*['"]\.logout-btn['"]\s*\)/, 'shell must bind the source logout control');
  assert.match(employeeShell, /removeAttribute\(\s*['"]onclick['"]\s*\)/, 'legacy navigation-only logout must be neutralized');
  assert.match(employeeShell, /MAGASIN_CORE[\s\S]*supabase[\s\S]*get/, 'logout must reuse the canonical parent Supabase client');
  assert.match(employeeShell, /signOut\s*\(\s*\{\s*scope\s*:\s*['"]local['"]\s*\}\s*\)/, 'logout must clear the local Auth session');
  assert.match(employeeShell, /location\.replace\(\s*['"]\/03_PLATFORM\/01_AUTH\/['"]\s*\)/, 'successful logout must return to Auth');
  assert.doesNotMatch(employeeShell, /signOut[\s\S]{0,500}finally\s*\{[\s\S]{0,200}location\.replace/, 'logout must not redirect after a failed signOut');
});

test('AUTH-PROD-005: Employee legacy logout cannot remain navigation-only', () => {
  const legacyButton = employeeApp.match(/<button[^>]*class=["']logout-btn["'][^>]*>/)?.[0] || '';
  assert.ok(legacyButton, 'Employee logout button must be discoverable');
  assert.match(legacyButton, /Đăng xuất|logout-btn/, 'Employee logout source button must remain present');
});

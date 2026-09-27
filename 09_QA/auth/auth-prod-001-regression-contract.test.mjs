import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const authRuntime = fs.readFileSync('03_PLATFORM/01_AUTH/auth-runtime-v2.js', 'utf8');
const pendingPage = fs.readFileSync('03_PLATFORM/01_AUTH/pending-access.html', 'utf8');
const ownerAccess = fs.readFileSync('04_OWNER/Access/index.html', 'utf8');

const loginStart = authRuntime.indexOf("$('loginForm').addEventListener");
const registerStart = authRuntime.indexOf("$('registerForm').addEventListener");
assert.ok(loginStart >= 0 && registerStart > loginStart, 'auth login/register blocks must be discoverable');
const loginBlock = authRuntime.slice(loginStart, registerStart);

test('AUTH-PROD D1: pending surface provides an authenticated escape and access recheck', () => {
  assert.match(
    pendingPage,
    /@supabase\/supabase-js@2/,
    'pending page must load the canonical Supabase browser SDK before it can clear the persisted session'
  );
  assert.match(
    pendingPage,
    /id=["']checkAccessBtn["']/,
    'pending page must expose a bounded Check access action'
  );
  assert.match(
    pendingPage,
    /id=["']switchAccountBtn["']/,
    'pending page must expose Sign out / Use another account'
  );
  assert.match(
    pendingPage,
    /signOut\s*\(\s*\{\s*scope\s*:\s*["']local["']\s*\}\s*\)/s,
    'switch-account action must clear the local Supabase session'
  );
  assert.match(
    pendingPage,
    /from\s*\(\s*["']profiles["']\s*\)[\s\S]*select\s*\(\s*["']role,status["']\s*\)/,
    'Check access must re-read authoritative profile role/status'
  );
});

test('AUTH-PROD D1/D3: signup cannot leave a returned PENDING session capturing the browser', () => {
  assert.match(authRuntime, /const\s+result\s*=\s*await\s+sb\.auth\.signUp\s*\(/);
  assert.match(
    authRuntime,
    /if\s*\(\s*result\.data\.session\s*\)\s*\{[\s\S]*await\s+sb\.auth\.signOut\s*\(\s*\{\s*scope\s*:\s*["']local["']\s*\}\s*\)/,
    'signup returning a session for a PENDING account must clear the local session before normal login continuation'
  );
});

test('AUTH-PROD D2: Owner activation is explicit and independent from ACCOUNTANT role assignment', () => {
  assert.doesNotMatch(
    ownerAccess,
    /next\s*===\s*["']ACCOUNTANT["'][\s\S]{0,240}payload\.status\s*=\s*["']ACTIVE["']/,
    'ACCOUNTANT must not be a hidden activation bridge'
  );
  assert.match(
    ownerAccess,
    /data-account-status|data-status-control|data-activate/,
    'Owner Access must expose an account-status/activation control separate from role selection'
  );
  assert.match(
    ownerAccess,
    /PENDING[\s\S]*(ACTIVE|Kích hoạt)|Kích hoạt[\s\S]*ACTIVE/i,
    'Owner Access must make PENDING -> ACTIVE an explicit bounded action'
  );
});

test('AUTH-PROD D3: Auth boot explicitly distinguishes ACTIVE, PENDING and INACTIVE', () => {
  assert.match(authRuntime, /ACTIVE/);
  assert.match(authRuntime, /PENDING/);
  assert.match(authRuntime, /INACTIVE/);
  assert.doesNotMatch(
    authRuntime,
    /if\s*\(\s*String\(profile\.status\)\.toUpperCase\(\)\s*===\s*["']ACTIVE["']\s*\)\s*route\(profile\);\s*else\s*pending\(\)/,
    'boot must not collapse every non-ACTIVE authorization state into one redirect'
  );
});

test('AUTH-PROD baseline: username/email resolution and role routes remain canonical', () => {
  assert.match(authRuntime, /normalized\.includes\(["']@["']\)/);
  assert.match(authRuntime, /sb\.rpc\(["']resolve_login_email["']/);
  assert.match(authRuntime, /role\s*===\s*["']OWNER["'][\s\S]*\/04_OWNER\//);
  assert.match(authRuntime, /role\s*===\s*["']ACCOUNTANT["'][\s\S]*\/nhap-hang\//);
  assert.match(authRuntime, /\[['"]STAFF['"],\s*['"]EMPLOYEE['"]\]\.includes\(role\)[\s\S]*\/06_EMPLOYEE\//);
  assert.match(authRuntime, /\/05_MANAGER\//);
});

test('AUTH-PROD D4: credential failure path remains separate from authorization mutation', () => {
  assert.match(loginBlock, /signInWithPassword\s*\(/);
  assert.doesNotMatch(loginBlock, /\.update\s*\(/, 'login failure must not mutate profiles');
  assert.doesNotMatch(loginBlock, /status\s*[:=]\s*["']ACTIVE["']/, 'login failure must not activate an account');
  assert.match(loginBlock, /Tên đăng nhập hoặc mật khẩu không đúng/);
});

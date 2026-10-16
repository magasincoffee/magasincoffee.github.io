import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const username = String(process.env.AUTH_PROD_ACTIVE_USERNAME || '').trim();
const password = String(process.env.AUTH_PROD_ACTIVE_PASSWORD || '');
const pendingUsername = String(process.env.AUTH_PROD_PENDING_USERNAME || '').trim();
const pendingPassword = String(process.env.AUTH_PROD_PENDING_PASSWORD || '');
const requireLogout = String(process.env.AUTH_PROD_REQUIRE_ACTIVE_LOGOUT || '').toLowerCase() === 'true';
const runRecoveryRequest = String(process.env.AUTH_PROD_RUN_RECOVERY_REQUEST || '').toLowerCase() === 'true';
if (!username || !password) {
  console.error('AUTH_PROD_005_ACTIVE_SMOKE=OWNER_REQUIRED missing=active_qa_credentials');
  process.exit(2);
}

const baseUrl = String(process.env.AUTH_PROD_BASE_URL || 'https://magasincoffee.github.io').replace(/\/$/, '');
const authUrl = `${baseUrl}/03_PLATFORM/01_AUTH/`;
const supabaseUrl = 'https://menvbzlsncmpuvnaifxa.supabase.co';
const publishableKey = 'sb_publishable_HsvCS6HDZnCDInd9PUoh0g_V34wJVqx';
const allowedActiveRoute = /\/(?:04_OWNER|05_MANAGER|06_EMPLOYEE|nhap-hang)(?:\/|$)/;

async function resolveEmail(loginName) {
  const normalized = String(loginName || '').trim();
  if (normalized.includes('@')) {
    assert.match(normalized, /@/, 'ACTIVE credential email must be an email address');
    return normalized.toLowerCase();
  }
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/resolve_login_email`, {
    method: 'POST',
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_username: normalized })
  });
  assert.equal(response.status, 200, 'username resolver must return HTTP 200');
  const value = await response.json();
  const shape = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  const keys = value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value).sort() : [];
  assert.equal(typeof value, 'string', `username resolver must return one email string; response-shape=${shape}; field-names=${keys.join(',') || 'none'} (values withheld)`);
  assert.match(value, /@/, 'resolved login email must be an email address');
  return value;
}

function attachDiagnostics(page) {
  const diagnostics = { pageErrors: [], http5xx: [] };
  page.on('pageerror', error => diagnostics.pageErrors.push(String(error?.message || error)));
  page.on('response', response => {
    if (response.status() >= 500 && /magasincoffee\.github\.io|supabase\.co/.test(response.url())) {
      diagnostics.http5xx.push(`${response.status()} ${response.url()}`);
    }
  });
  return diagnostics;
}

function assertDiagnosticsClean(diagnostics, label) {
  assert.deepEqual(diagnostics.pageErrors, [], `${label}: page errors`);
  assert.deepEqual(diagnostics.http5xx, [], `${label}: HTTP 5xx`);
}

async function login(page, loginValue, secret) {
  await page.goto(authUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.locator('#login.active').waitFor({ timeout: 20_000 });
  await page.fill('#username', loginValue);
  await page.fill('#password', secret);
  await page.click('#loginForm button[type="submit"]');
  await page.waitForURL(url => allowedActiveRoute.test(url.pathname) || /pending-access\.html$/.test(url.pathname), { timeout: 30_000 });
}

async function assertActiveDestination(page, label) {
  assert.match(new URL(page.url()).pathname, allowedActiveRoute, `${label}: must reach a canonical active role route`);
  if (/\/nhap-hang\/|\/04_OWNER\/Procurement\//.test(new URL(page.url()).pathname)) {
    await page.locator('#app:not(.hidden)').waitFor({ timeout: 30_000 });
  }
}

const email = await resolveEmail(username);
const browser = await chromium.launch({ headless: true });

try {
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    const diagnostics = attachDiagnostics(page);
    await login(page, username, password);
    await assertActiveDestination(page, 'ACTIVE username login');
    assertDiagnosticsClean(diagnostics, 'ACTIVE username login');
    console.log('AUTH_PROD_005_ACTIVE_USERNAME_LOGIN=PASS');
    await context.close();
  }

  {
    const context = await browser.newContext();
    const page = await context.newPage();
    const diagnostics = attachDiagnostics(page);
    await login(page, email, password);
    await assertActiveDestination(page, 'ACTIVE email login');

    const shellLogout = page.locator('[data-shell-logout]:visible');
    const sourceLogout = page.locator('#logoutBtn:visible');
    const hasVisibleLogout = (await shellLogout.count()) > 0 || (await sourceLogout.count()) > 0;

    if (hasVisibleLogout) {
      if (await shellLogout.count()) await shellLogout.click();
      else await sourceLogout.click();
      await page.waitForURL('**/03_PLATFORM/01_AUTH/**', { timeout: 30_000 });
      await page.locator('#login.active').waitFor({ timeout: 20_000 });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator('#login.active').waitFor({ timeout: 20_000 });
      assert.match(new URL(page.url()).pathname, /\/03_PLATFORM\/01_AUTH\/?$/, 'logout must remain on Auth after reload');
      console.log('AUTH_PROD_005_ACTIVE_LOGOUT=PASS');
    } else if (requireLogout) {
      assert.fail('exact-main active role surface must expose a visible logout control');
    } else {
      console.log('AUTH_PROD_005_ACTIVE_LOGOUT=DEFERRED_UNTIL_EXACT_MAIN');
    }

    assertDiagnosticsClean(diagnostics, 'ACTIVE email login/logout');
    console.log('AUTH_PROD_005_ACTIVE_EMAIL_LOGIN=PASS');
    await context.close();
  }

  if (runRecoveryRequest) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const diagnostics = attachDiagnostics(page);
    await page.goto(authUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.locator('#login.active').waitFor({ timeout: 20_000 });
    await page.click('[data-view="forgot"]');
    await page.fill('#forgotEmail', email);
    await page.click('#forgotForm button[type="submit"]');
    await page.waitForFunction(() => document.querySelector('#msg')?.textContent.includes('Nếu email tồn tại'), null, { timeout: 20_000 });
    assertDiagnosticsClean(diagnostics, 'password recovery request');
    console.log('AUTH_PROD_005_RECOVERY_REQUEST=PASS');
    await context.close();
  }

  if (pendingUsername && pendingPassword) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const diagnostics = attachDiagnostics(page);
    await page.goto(authUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.locator('#login.active').waitFor({ timeout: 20_000 });
    await page.fill('#username', pendingUsername);
    await page.fill('#password', pendingPassword);
    await page.click('#loginForm button[type="submit"]');
    await page.waitForURL('**/03_PLATFORM/01_AUTH/pending-access.html', { timeout: 30_000 });
    await page.locator('#switchAccountBtn').click();
    await page.waitForURL('**/03_PLATFORM/01_AUTH/**', { timeout: 30_000 });
    await page.locator('#login.active').waitFor({ timeout: 20_000 });
    await page.fill('#username', username);
    await page.fill('#password', password);
    await page.click('#loginForm button[type="submit"]');
    await page.waitForURL(url => allowedActiveRoute.test(url.pathname), { timeout: 30_000 });
    await assertActiveDestination(page, 'PENDING switch to ACTIVE');
    assertDiagnosticsClean(diagnostics, 'PENDING sign-out/switch');
    console.log('AUTH_PROD_005_PENDING_SWITCH=PASS');
    await context.close();
  } else {
    console.log('AUTH_PROD_005_PENDING_SWITCH=OWNER_REQUIRED');
  }

  console.log('AUTH_PROD_005_ACTIVE_PRODUCTION_SMOKE=PASS');
  console.log('AUTH_PROD_005_REMAINING_OWNER_SMOKE=owner_activation,pending_credential_switch,password_recovery_completion');
} finally {
  await browser.close();
}

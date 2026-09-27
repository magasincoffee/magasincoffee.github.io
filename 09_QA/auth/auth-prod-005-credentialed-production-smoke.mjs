import assert from 'node:assert/strict';

const required = [
  'AUTH_PROD_ACTIVE_USERNAME',
  'AUTH_PROD_ACTIVE_EMAIL',
  'AUTH_PROD_ACTIVE_PASSWORD',
  'AUTH_PROD_PENDING_USERNAME',
  'AUTH_PROD_PENDING_PASSWORD'
];
const missing = required.filter(name => !String(process.env[name] || '').trim());
if (missing.length) {
  console.error(`AUTH_PROD_005_CREDENTIAL_SMOKE=OWNER_REQUIRED missing=${missing.join(',')}`);
  process.exit(2);
}

const { chromium } = await import('playwright');
const baseUrl = String(process.env.AUTH_PROD_BASE_URL || 'https://magasincoffee.github.io').replace(/\/$/, '');
const authUrl = `${baseUrl}/03_PLATFORM/01_AUTH/`;
const allowedActiveRoute = /\/(?:04_OWNER|05_MANAGER|06_EMPLOYEE|nhap-hang)(?:\/|$)/;

const credentials = {
  activeUsername: process.env.AUTH_PROD_ACTIVE_USERNAME,
  activeEmail: process.env.AUTH_PROD_ACTIVE_EMAIL,
  activePassword: process.env.AUTH_PROD_ACTIVE_PASSWORD,
  pendingUsername: process.env.AUTH_PROD_PENDING_USERNAME,
  pendingPassword: process.env.AUTH_PROD_PENDING_PASSWORD
};

function attachDiagnostics(page) {
  const diagnostics = { consoleErrors: [], pageErrors: [], failedRequests: [], http5xx: [] };
  page.on('console', msg => { if (msg.type() === 'error') diagnostics.consoleErrors.push(msg.text()); });
  page.on('pageerror', err => diagnostics.pageErrors.push(String(err?.message || err)));
  page.on('requestfailed', req => diagnostics.failedRequests.push(req.url()));
  page.on('response', response => { if (response.status() >= 500) diagnostics.http5xx.push(`${response.status()} ${response.url()}`); });
  return diagnostics;
}

function assertDiagnosticsClean(diagnostics, label) {
  assert.deepEqual(diagnostics.pageErrors, [], `${label}: page errors`);
  assert.deepEqual(diagnostics.http5xx, [], `${label}: HTTP 5xx`);
}

async function login(page, loginValue, password) {
  await page.goto(authUrl, { waitUntil: 'networkidle' });
  await page.locator('#login.active').waitFor();
  await page.fill('#username', loginValue);
  await page.fill('#password', password);
  await page.click('#loginForm button[type="submit"]');
}

const browser = await chromium.launch({ headless: true });
try {
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    const diagnostics = attachDiagnostics(page);
    await login(page, credentials.activeEmail, credentials.activePassword);
    await page.waitForURL(url => allowedActiveRoute.test(url.pathname), { timeout: 20_000 });
    assert.match(new URL(page.url()).pathname, allowedActiveRoute, 'ACTIVE email login must route to a canonical role destination');
    assertDiagnosticsClean(diagnostics, 'ACTIVE email login');
    await context.close();
  }

  {
    const context = await browser.newContext();
    const page = await context.newPage();
    const diagnostics = attachDiagnostics(page);
    await login(page, credentials.activeUsername, credentials.activePassword);
    await page.waitForURL(url => allowedActiveRoute.test(url.pathname), { timeout: 20_000 });
    assert.match(new URL(page.url()).pathname, allowedActiveRoute, 'ACTIVE username login must route to a canonical role destination');
    assertDiagnosticsClean(diagnostics, 'ACTIVE username login');
    await context.close();
  }

  {
    const context = await browser.newContext();
    const page = await context.newPage();
    const diagnostics = attachDiagnostics(page);
    await login(page, credentials.pendingUsername, credentials.pendingPassword);
    await page.waitForURL('**/03_PLATFORM/01_AUTH/pending-access.html', { timeout: 20_000 });
    await page.locator('#switchAccountBtn').click();
    await page.waitForURL('**/03_PLATFORM/01_AUTH/**', { timeout: 20_000 });
    await page.locator('#login.active').waitFor();

    await page.fill('#username', credentials.activeUsername);
    await page.fill('#password', credentials.activePassword);
    await page.click('#loginForm button[type="submit"]');
    await page.waitForURL(url => allowedActiveRoute.test(url.pathname), { timeout: 20_000 });
    assert.match(new URL(page.url()).pathname, allowedActiveRoute, 'same-browser switch from PENDING to ACTIVE must succeed');
    assertDiagnosticsClean(diagnostics, 'PENDING sign-out/switch');
    await context.close();
  }

  console.log('AUTH_PROD_005_CREDENTIAL_SMOKE=PASS');
  console.log('AUTH_PROD_005_MANUAL_OWNER_SMOKE_REQUIRED=owner_activation,password_recovery,active_role_logout');
} finally {
  await browser.close();
}

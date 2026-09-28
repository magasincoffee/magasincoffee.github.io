import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.QA_BASE_URL || 'http://127.0.0.1:8769';

const sharedCoreMock = String.raw`
(() => {
  const sb = {
    auth: {
      async signOut(options) {
        localStorage.setItem('__auth_prod_005_logout_audit', JSON.stringify({
          calls: 1,
          scope: options && options.scope
        }));
        return { error: null };
      }
    }
  };
  window.MAGASIN_CORE = {
    supabase: { get() { return sb; } },
    roles: { hasRole() { return true; } },
    date: { dateKey() { return '2026-09-28'; } }
  };
})();
`;

const ownerModuleMock = String.raw`
document.getElementById('loading')?.classList.add('hidden');
document.getElementById('denied')?.classList.add('hidden');
document.getElementById('app')?.classList.remove('hidden');
`;

const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext();

  await context.route('https://cdn.jsdelivr.net/**', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: 'window.supabase = window.supabase || {};'
  }));

  await context.route('**/02_CORE/shared/shared-core-v1.js*', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: sharedCoreMock
  }));

  await context.route('**/04_OWNER/ControlTower/control-tower-v1.js*', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: ownerModuleMock
  }));

  await context.route('**/03_PLATFORM/01_AUTH/**', route => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<!doctype html><title>Auth QA target</title><main id="auth-target">Auth</main>'
  }));

  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error?.message || error)));

  await page.goto(`${baseUrl}/04_OWNER/`, { waitUntil: 'networkidle' });
  const logout = page.locator('[data-shell-logout]');
  await logout.waitFor({ state: 'visible' });

  await page.evaluate(() => {
    sessionStorage.setItem('magasin.auth.recovery.session.v1', 'stale-recovery-marker');
  });

  await logout.click();
  await page.waitForURL('**/03_PLATFORM/01_AUTH/?switch=1', { timeout: 10_000 });

  const state = await page.evaluate(() => ({
    audit: JSON.parse(localStorage.getItem('__auth_prod_005_logout_audit') || '{}'),
    recoveryMarker: sessionStorage.getItem('magasin.auth.recovery.session.v1')
  }));

  assert.deepEqual(state.audit, { calls: 1, scope: 'local' });
  assert.equal(state.recoveryMarker, null);
  assert.deepEqual(pageErrors, []);

  console.log('AUTH_PROD_005_OWNER_LOGOUT_BROWSER=PASS');
  await context.close();
} finally {
  await browser.close();
}

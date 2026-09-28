import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.QA_BASE_URL || 'http://127.0.0.1:8769';

const mockSdk = String.raw`
(() => {
  const params = new URLSearchParams(location.search);
  const scenario = params.get('scenario') || 'pending';
  const sessionKey = '__auth_prod_002_session';
  const auditKey = '__auth_prod_002_audit';
  const defaultSession = { user: { id: 'user-1', email: 'qa@example.com' } };

  const readSession = () => {
    try {
      const raw = localStorage.getItem(sessionKey);
      if (raw === 'null') return null;
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    if (scenario === 'no-session') return null;
    localStorage.setItem(sessionKey, JSON.stringify(defaultSession));
    return defaultSession;
  };

  const profileForScenario = () => {
    if (scenario === 'active-owner') return { role: 'OWNER', status: 'ACTIVE' };
    if (scenario === 'inactive') return { role: 'STAFF', status: 'INACTIVE' };
    return { role: 'STAFF', status: 'PENDING' };
  };

  window.supabase = {
    createClient() {
      return {
        auth: {
          onAuthStateChange() {
            return { data: { subscription: { unsubscribe() {} } } };
          },
          async getSession() {
            return { data: { session: readSession() }, error: null };
          },
          async signOut(options) {
            localStorage.setItem(sessionKey, 'null');
            localStorage.setItem(auditKey, JSON.stringify({ signOut: 1, scope: options && options.scope }));
            return { error: null };
          },
          async signInWithPassword() {
            return { data: { user: defaultSession.user, session: defaultSession }, error: null };
          },
          async signUp() {
            return { data: { session: null }, error: null };
          },
          async resetPasswordForEmail() {
            return { data: {}, error: null };
          },
          async exchangeCodeForSession() {
            return { data: { session: null }, error: { code: 'invalid' } };
          },
          async verifyOtp() {
            return { data: { session: null }, error: { code: 'invalid' } };
          },
          async updateUser() {
            return { data: { user: defaultSession.user }, error: null };
          }
        },
        rpc() {
          return Promise.resolve({ data: 'qa@example.com', error: null });
        },
        from(table) {
          return {
            select() { return this; },
            eq() { return this; },
            order() { return this; },
            async single() {
              if (table === 'profiles') return { data: profileForScenario(), error: null };
              return { data: null, error: null };
            }
          };
        }
      };
    }
  };
})();
`;

const browser = await chromium.launch({ headless: true });

async function openPending(scenario) {
  const context = await browser.newContext();
  await context.route('**/npm/@supabase/supabase-js@2*', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: mockSdk
  }));
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => pageErrors.push(String(err && err.message || err)));
  page.on('requestfailed', req => failedRequests.push(req.url()));
  await page.goto(`${baseUrl}/03_PLATFORM/01_AUTH/pending-access.html?scenario=${scenario}`, { waitUntil: 'networkidle' });
  return { context, page, consoleErrors, pageErrors, failedRequests };
}

try {
  {
    const { context, page, consoleErrors, pageErrors } = await openPending('pending');
    await page.click('#checkAccessBtn');
    await page.waitForFunction(() => document.querySelector('#pendingStatus')?.textContent.includes('vẫn đang chờ'));
    assert.match(await page.locator('#pendingStatus').textContent(), /vẫn đang chờ/i);
    assert.match(page.url(), /pending-access\.html/);
    assert.deepEqual(consoleErrors, []);
    assert.deepEqual(pageErrors, []);
    await context.close();
  }

  {
    const { context, page, consoleErrors, pageErrors } = await openPending('inactive');
    await page.click('#checkAccessBtn');
    await page.waitForFunction(() => document.querySelector('#pendingStatus')?.textContent.includes('không hoạt động'));
    assert.match(await page.locator('#pendingStatus').textContent(), /không hoạt động/i);
    assert.deepEqual(consoleErrors, []);
    assert.deepEqual(pageErrors, []);
    await context.close();
  }

  {
    const { context, page } = await openPending('active-owner');
    await page.click('#checkAccessBtn');
    await page.waitForURL('**/04_OWNER/**', { waitUntil: 'commit' });
    assert.match(page.url(), /\/04_OWNER\//);
    await context.close();
  }

  {
    const { context, page, consoleErrors, pageErrors } = await openPending('pending');
    await page.click('#switchAccountBtn');
    await page.waitForURL('**/03_PLATFORM/01_AUTH/**', { waitUntil: 'domcontentloaded' });
    await page.locator('#login.active').waitFor();
    const audit = await page.evaluate(() => JSON.parse(localStorage.getItem('__auth_prod_002_audit')));
    const sessionRaw = await page.evaluate(() => localStorage.getItem('__auth_prod_002_session'));
    assert.deepEqual(audit, { signOut: 1, scope: 'local' });
    assert.equal(sessionRaw, 'null');
    await page.waitForFunction(() =>
      document.querySelector('#msg')?.textContent.includes('sẵn sàng đăng nhập bằng tài khoản khác')
    );
    assert.doesNotMatch(page.url(), /[?&]switch=1/, 'switch query must be removed after cleanup handshake');
    assert.deepEqual(consoleErrors, []);
    assert.deepEqual(pageErrors, []);
    await context.close();
  }

  console.log('AUTH_PROD_002_PENDING_BROWSER=PASS');
} finally {
  await browser.close();
}

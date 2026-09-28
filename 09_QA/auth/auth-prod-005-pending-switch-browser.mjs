import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.QA_BASE_URL || 'http://127.0.0.1:8769';

const mockSdk = String.raw`
(() => {
  const sessionKey = '__auth_prod_005_switch_session';
  const signOutCountKey = '__auth_prod_005_switch_signout_count';
  const pendingSession = { user: { id: 'pending-1', email: 'pending@example.com' } };
  const activeSession = { user: { id: 'active-1', email: 'active@example.com' } };

  const readSession = () => {
    const raw = localStorage.getItem(sessionKey);
    if (raw === 'null') return null;
    if (raw) return JSON.parse(raw);
    if (location.pathname.endsWith('/pending-access.html')) {
      localStorage.setItem(sessionKey, JSON.stringify(pendingSession));
      return pendingSession;
    }
    return null;
  };

  const writeSession = value => {
    localStorage.setItem(sessionKey, value ? JSON.stringify(value) : 'null');
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
            const count = Number(localStorage.getItem(signOutCountKey) || '0') + 1;
            localStorage.setItem(signOutCountKey, String(count));

            const simulateStaleHandoff =
              location.pathname.endsWith('/pending-access.html') &&
              new URLSearchParams(location.search).get('simulate') === 'stale';

            if (!simulateStaleHandoff) writeSession(null);
            return { error: null, scope: options && options.scope };
          },
          async signInWithPassword({ email }) {
            if (String(email).toLowerCase() !== 'active@example.com') {
              return { data: { user: null, session: null }, error: { message: 'invalid_credentials' } };
            }
            writeSession(activeSession);
            return { data: { user: activeSession.user, session: activeSession }, error: null };
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
            return { data: { user: activeSession.user }, error: null };
          }
        },
        rpc(name) {
          if (name === 'resolve_login_email') {
            return Promise.resolve({ data: 'active@example.com', error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
        from(table) {
          return {
            select() { return this; },
            eq() { return this; },
            async single() {
              if (table !== 'profiles') return { data: null, error: null };
              const session = readSession();
              if (session?.user?.id === 'active-1') {
                return { data: { role: 'OWNER', status: 'ACTIVE' }, error: null };
              }
              if (session?.user?.id === 'pending-1') {
                return { data: { role: 'STAFF', status: 'PENDING' }, error: null };
              }
              return { data: null, error: { message: 'profile_not_found' } };
            }
          };
        }
      };
    }
  };
})();
`;

const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext();
  await context.route('**/npm/@supabase/supabase-js@2*', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: mockSdk
  }));

  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error?.message || error)));

  await page.goto(
    `${baseUrl}/03_PLATFORM/01_AUTH/pending-access.html?simulate=stale`,
    { waitUntil: 'networkidle' }
  );

  await page.locator('#switchAccountBtn').click();

  await page.waitForURL(url =>
    url.pathname === '/03_PLATFORM/01_AUTH/' && !url.searchParams.has('switch'),
    { timeout: 10_000 }
  );
  await page.locator('#login.active').waitFor({ timeout: 10_000 });
  await page.waitForFunction(() =>
    document.querySelector('#msg')?.textContent.includes('sẵn sàng đăng nhập bằng tài khoản khác')
  );

  const afterHandshake = await page.evaluate(() => ({
    session: localStorage.getItem('__auth_prod_005_switch_session'),
    signOutCount: Number(localStorage.getItem('__auth_prod_005_switch_signout_count') || '0')
  }));

  assert.equal(afterHandshake.session, 'null', 'switch handshake must clear a stale PENDING session');
  assert.equal(afterHandshake.signOutCount, 2, 'pending page + Auth handoff must each perform local sign-out');

  await page.fill('#username', 'active-user');
  await page.fill('#password', 'active-password');
  await page.click('#loginForm button[type="submit"]');
  await page.waitForURL('**/04_OWNER/**', { timeout: 10_000 });

  const finalSession = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('__auth_prod_005_switch_session') || 'null')
  );
  assert.equal(finalSession?.user?.id, 'active-1');
  assert.deepEqual(pageErrors, []);

  console.log('AUTH_PROD_005_PENDING_SWITCH_HANDOFF=PASS');
  await context.close();
} finally {
  await browser.close();
}

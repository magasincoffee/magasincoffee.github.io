import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.QA_BASE_URL || 'http://127.0.0.1:8769';

const mockSdk = String.raw`
(() => {
  const user = { id: 'active-retry-user', email: 'active@example.test' };
  const session = { access_token: 'mock', refresh_token: 'mock', user };
  let attempts = 0;

  window.supabase = {
    createClient() {
      return {
        auth: {
          onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
          async getSession() { return { data: { session: null }, error: null }; },
          async signInWithPassword({ password }) {
            attempts += 1;
            await new Promise(resolve => setTimeout(resolve, 25));
            if (password !== 'correct-password') {
              return { data: { user: null, session: null }, error: { code: 'invalid_credentials' } };
            }
            localStorage.setItem('__auth_prod_005_retry_attempts', String(attempts));
            return { data: { user, session }, error: null };
          },
          async signOut() { return { error: null }; },
          async signUp() { return { data: { session: null }, error: null }; },
          async resetPasswordForEmail() { return { data: {}, error: null }; },
          async exchangeCodeForSession() { return { data: { session: null }, error: { code: 'invalid' } }; },
          async verifyOtp() { return { data: { session: null }, error: { code: 'invalid' } }; },
          async updateUser() { return { data: { user }, error: null }; }
        },
        async rpc() { return { data: 'active@example.test', error: null }; },
        from(table) {
          return {
            select() { return this; },
            eq() { return this; },
            async single() {
              if (table === 'profiles') return { data: { role: 'OWNER', status: 'ACTIVE' }, error: null };
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

  await page.goto(`${baseUrl}/03_PLATFORM/01_AUTH/`, { waitUntil: 'networkidle' });

  const submit = page.locator('#loginForm button[type="submit"]');
  const username = page.locator('#username');
  const password = page.locator('#password');

  await username.fill('active-user');
  await password.fill('wrong-password');
  await submit.click();

  await page.waitForFunction(() =>
    document.querySelector('#msg')?.textContent.includes('không đúng')
  );

  assert.equal(await submit.isEnabled(), true, 'submit button must be enabled after invalid credentials');
  assert.equal((await submit.textContent())?.trim(), 'Đăng nhập', 'submit label must be restored');
  assert.equal(await username.isEnabled(), true, 'username field must be re-enabled');
  assert.equal(await password.isEnabled(), true, 'password field must be re-enabled');

  await password.fill('correct-password');
  await submit.click();
  await page.waitForURL('**/04_OWNER/**', { timeout: 10_000 });

  const attempts = await page.evaluate(() =>
    Number(localStorage.getItem('__auth_prod_005_retry_attempts') || '0')
  );
  assert.equal(attempts, 2, 'same form must allow a second login attempt');
  assert.deepEqual(pageErrors, []);

  console.log('AUTH_PROD_005_INVALID_CREDENTIAL_RETRY=PASS');
  await context.close();
} finally {
  await browser.close();
}

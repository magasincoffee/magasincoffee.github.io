import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.QA_BASE_URL || 'http://127.0.0.1:8769';

const mockSdk = String.raw`
(() => {
  const auditKey = '__auth_prod_007_signup_audit';
  const read = () => {
    try { return JSON.parse(localStorage.getItem(auditKey) || '{}'); }
    catch (_) { return {}; }
  };
  const write = patch => localStorage.setItem(auditKey, JSON.stringify({ ...read(), ...patch }));

  window.supabase = {
    createClient() {
      return {
        auth: {
          onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
          async getSession() { return { data: { session: null }, error: null }; },
          async signOut() { return { error: null }; },
          async signInWithPassword() { return { data: { user: null, session: null }, error: { code: 'invalid_credentials' } }; },
          async signUp(input) {
            const a = read();
            write({ signUp: (a.signUp || 0) + 1, signUpEmailPresent: !!input?.email });
            return { data: { user: { id: 'new-user' }, session: null }, error: null };
          },
          async resetPasswordForEmail() { return { data: {}, error: null }; },
          async exchangeCodeForSession() { return { data: { session: null }, error: { code: 'invalid' } }; },
          async verifyOtp() { return { data: { session: null }, error: { code: 'invalid' } }; },
          async updateUser() { return { data: { user: null }, error: null }; }
        },
        async rpc(name, args) {
          const a = read();
          write({ usernameChecks: (a.usernameChecks || 0) + 1 });
          if (name === 'resolve_login_email' && args?.p_username === 'taken.username') {
            return { data: 'existing@example.test', error: null };
          }
          if (name === 'resolve_login_email') return { data: null, error: null };
          return { data: null, error: null };
        },
        from() {
          return {
            select() { return this; },
            eq() { return this; },
            async single() { return { data: null, error: null }; }
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
  const errors = [];
  page.on('pageerror', error => errors.push(String(error?.message || error)));

  await page.goto(`${baseUrl}/03_PLATFORM/01_AUTH/`, { waitUntil: 'networkidle' });
  await page.click('[data-view="register"]');

  await page.fill('#fullName', 'QA Duplicate Username');
  await page.fill('#phone', '0900000000');
  await page.fill('#email', 'new.user@example.test');
  await page.fill('#regUsername', 'taken.username');
  await page.fill('#regPassword', 'Password123');

  const submit = page.locator('#registerForm button[type="submit"]');
  await submit.click();

  await page.waitForFunction(() =>
    document.querySelector('#msg')?.textContent.includes('Tên đăng nhập đã tồn tại')
  );

  let audit = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('__auth_prod_007_signup_audit') || '{}')
  );
  assert.equal(audit.signUp || 0, 0, 'duplicate username must be rejected before Supabase signUp');
  assert.equal(await submit.isEnabled(), true, 'registration form must be retryable after duplicate username');

  await page.fill('#regUsername', 'unique.username');
  await submit.click();
  await page.locator('#login.active').waitFor();
  await page.waitForFunction(() =>
    document.querySelector('#msg')?.textContent.includes('xác nhận email')
  );

  audit = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('__auth_prod_007_signup_audit') || '{}')
  );
  assert.equal(audit.signUp, 1, 'unique username should reach Supabase signUp exactly once');
  assert.equal(audit.usernameChecks, 2, 'both registration attempts must check username uniqueness');
  assert.deepEqual(errors, []);

  console.log('AUTH_PROD_007_DUPLICATE_USERNAME_GUARD=PASS');
  await context.close();
} finally {
  await browser.close();
}

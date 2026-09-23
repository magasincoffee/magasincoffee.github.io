import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';

const baseUrl = process.env.QA_BASE_URL || 'http://127.0.0.1:8768';
const runtimeSource = fs.readFileSync('03_PLATFORM/01_AUTH/auth-runtime-v2.js', 'utf8');
const indexSource = fs.readFileSync('03_PLATFORM/01_AUTH/index.html', 'utf8');
const emailTemplate = fs.readFileSync('03_PLATFORM/01_AUTH/recovery-email-template.html', 'utf8');

assert.match(runtimeSource, /exchangeCodeForSession\(code\)/);
assert.match(runtimeSource, /verifyOtp\(\{ token_hash: tokenHash, type: 'recovery' \}\)/);
assert.match(runtimeSource, /PASSWORD_RECOVERY/);
assert.match(runtimeSource, /updateUser\(\{ password \}\)/);
assert.match(runtimeSource, /signOut\(\{ scope: 'local' \}\)/);
assert.doesNotMatch(runtimeSource, /Auth session missing!/);
assert.doesNotMatch(runtimeSource, /console\.log|console\.error|console\.warn/);
assert.match(indexSource, /id="resetInvalid"/);
assert.match(indexSource, /Gửi lại liên kết đặt mật khẩu/);
assert.match(indexSource, /data-toggle-password="newPassword"/);
assert.match(emailTemplate, /{{ \.ConfirmationURL }}/);
assert.match(emailTemplate, /MAGASIN/);

const mockSdk = String.raw`
(() => {
  const params = new URLSearchParams(location.search);
  const scenario = params.get('scenario') || '';
  window.__authCalls = { exchange: 0, verify: 0, getSession: 0, update: 0, signOut: 0, reset: 0, signIn: 0 };
  window.__loginPassword = '';
  window.__updatedPassword = '';
  const auditKey = '__auth_mock_audit';

  const storageKey = '__mock_supabase_session';
  const readSession = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  };
  const writeSession = session => {
    if (session) localStorage.setItem(storageKey, JSON.stringify(session));
    else localStorage.removeItem(storageKey);
  };
  const makeSession = () => ({ access_token: 'mock-access', refresh_token: 'mock-refresh', user: { id: 'user-1', email: 'qa@example.com' } });

  window.supabase = {
    createClient() {
      let session = readSession();
      return {
        auth: {
          onAuthStateChange(callback) {
            if (scenario === 'implicit-valid' && location.hash.includes('type=recovery')) {
              queueMicrotask(() => {
                session = makeSession();
                writeSession(session);
                callback('PASSWORD_RECOVERY', session);
              });
            }
            return { data: { subscription: { unsubscribe() {} } } };
          },
          async exchangeCodeForSession(code) {
            window.__authCalls.exchange += 1;
            if (scenario === 'valid-code' && code === 'valid-recovery') {
              session = makeSession();
              writeSession(session);
              return { data: { session }, error: null };
            }
            return { data: { session: null }, error: { code: 'otp_expired', message: 'technical raw error' } };
          },
          async verifyOtp(input) {
            window.__authCalls.verify += 1;
            if (scenario === 'valid-token-hash' && input.token_hash === 'mock-hash' && input.type === 'recovery') {
              session = makeSession();
              writeSession(session);
              return { data: { session }, error: null };
            }
            return { data: { session: null }, error: { code: 'otp_expired', message: 'technical raw error' } };
          },
          async getSession() {
            window.__authCalls.getSession += 1;
            session = readSession();
            return { data: { session }, error: null };
          },
          async updateUser({ password }) {
            window.__authCalls.update += 1;
            window.__updatedPassword = password;
            session = readSession();
            if (!session) return { data: { user: null }, error: { code: 'session_missing', message: 'technical raw error' } };
            return { data: { user: session.user }, error: null };
          },
          async signOut() {
            window.__authCalls.signOut += 1;
            session = null;
            writeSession(null);
            return { error: null };
          },
          async resetPasswordForEmail() {
            window.__authCalls.reset += 1;
            await new Promise(resolve => setTimeout(resolve, 120));
            return { data: {}, error: null };
          },
          async signInWithPassword({ password }) {
            window.__authCalls.signIn += 1;
            window.__loginPassword = password;
            localStorage.setItem(auditKey, JSON.stringify({ signIn: window.__authCalls.signIn, password }));
            session = makeSession();
            writeSession(session);
            return { data: { user: session.user, session }, error: null };
          },
          async signUp() {
            return { data: { session: null }, error: null };
          }
        },
        async rpc() {
          return { data: 'qa@example.com', error: null };
        },
        from() {
          return {
            select() { return this; },
            eq() { return this; },
            async single() { return { data: { role: 'OWNER', status: 'ACTIVE' }, error: null }; }
          };
        }
      };
    }
  };
})();
`;

const browser = await chromium.launch({ headless: true });

async function newPage() {
  const context = await browser.newContext();
  await context.route('**/npm/@supabase/supabase-js@2*', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: mockSdk }));
  const page = await context.newPage();
  return { context, page };
}

try {
  {
    const { context, page } = await newPage();
    await page.goto(baseUrl + '/03_PLATFORM/01_AUTH/?auth=reset&code=valid-recovery&scenario=valid-code');
    await page.locator('#reset.active').waitFor();
    assert.match(page.url(), /auth=reset&status=ready/);
    assert.doesNotMatch(page.url(), /code=/);

    await page.reload();
    await page.locator('#reset.active').waitFor();
    assert.equal(await page.locator('#newPassword').isVisible(), true);

    await page.fill('#newPassword', 'NewPassword123');
    await page.fill('#confirmPassword', 'NewPassword123');
    await page.evaluate(() => {
      const form = document.querySelector('#resetForm');
      form.requestSubmit();
      form.requestSubmit();
    });
    await page.locator('#login.active').waitFor();
    const afterReset = await page.evaluate(() => ({ calls: window.__authCalls, updated: window.__updatedPassword, url: location.href }));
    assert.equal(afterReset.calls.update, 1);
    assert.equal(afterReset.calls.signOut, 1);
    assert.equal(afterReset.updated, 'NewPassword123');
    assert.equal(new URL(afterReset.url).search, '');
    assert.match(await page.locator('#msg').textContent(), /Mật khẩu đã được cập nhật/);

    await page.fill('#username', 'qa@example.com');
    await page.fill('#password', 'NewPassword123');
    await page.click('#loginForm button[type="submit"]');
    await page.waitForURL('**/04_OWNER/**');
    const loginAudit = await page.evaluate(() => JSON.parse(localStorage.getItem('__auth_mock_audit')));
    assert.equal(loginAudit.signIn, 1);
    assert.equal(loginAudit.password, 'NewPassword123');
    await context.close();
  }

  {
    const { context, page } = await newPage();
    await page.goto(baseUrl + '/03_PLATFORM/01_AUTH/?auth=reset&token_hash=mock-hash&type=recovery&scenario=valid-token-hash');
    await page.locator('#reset.active').waitFor();
    const calls = await page.evaluate(() => window.__authCalls);
    assert.equal(calls.verify, 1);
    assert.equal(calls.exchange, 0);
    await context.close();
  }

  {
    const { context, page } = await newPage();
    await page.goto(baseUrl + '/03_PLATFORM/01_AUTH/?auth=reset&error=access_denied&error_code=otp_expired&error_description=Email%20link%20is%20invalid%20or%20has%20expired&scenario=expired');
    await page.locator('#resetInvalid.active').waitFor();
    assert.equal(await page.locator('#reset').isVisible(), false);
    const text = await page.locator('#resetInvalid').textContent();
    assert.match(text, /hết hạn|không còn hợp lệ/i);
    assert.doesNotMatch(text, /otp_expired|Auth session missing|Email link is invalid/i);
    assert.doesNotMatch(page.url(), /error_code|error_description|access_denied/);
    await page.click('#resendResetBtn');
    await page.locator('#forgot.active').waitFor();
    await context.close();
  }

  {
    const { context, page } = await newPage();
    await page.goto(baseUrl + '/03_PLATFORM/01_AUTH/?auth=reset&code=already-used&scenario=replay');
    await page.locator('#resetInvalid.active').waitFor();
    assert.equal(await page.locator('#reset').isVisible(), false);
    const calls = await page.evaluate(() => window.__authCalls);
    assert.equal(calls.exchange, 1);
    await context.close();
  }

  {
    const { context, page } = await newPage();
    await page.goto(baseUrl + '/03_PLATFORM/01_AUTH/?auth=reset&scenario=missing');
    await page.locator('#resetInvalid.active').waitFor();
    assert.equal(await page.locator('#reset').isVisible(), false);
    await context.close();
  }

  {
    const { context, page } = await newPage();
    await page.goto(baseUrl + '/03_PLATFORM/01_AUTH/?scenario=forgot-double');
    await page.click('[data-view="forgot"]');
    await page.fill('#forgotEmail', 'qa@example.com');
    await page.evaluate(() => {
      const form = document.querySelector('#forgotForm');
      form.requestSubmit();
      form.requestSubmit();
    });
    await page.waitForFunction(() => window.__authCalls.reset === 1);
    await page.waitForTimeout(180);
    const calls = await page.evaluate(() => window.__authCalls);
    assert.equal(calls.reset, 1);
    assert.match(await page.locator('#msg').textContent(), /Chỉ sử dụng email mới nhất/);
    await context.close();
  }

  {
    const { context, page } = await newPage();
    await page.goto(baseUrl + '/03_PLATFORM/01_AUTH/?auth=reset&code=valid-recovery&scenario=valid-code');
    await page.locator('#reset.active').waitFor();
    await page.fill('#newPassword', 'NewPassword123');
    await page.fill('#confirmPassword', 'NewPassword123');
    await page.click('#resetForm button[type="submit"]');
    await page.locator('#login.active').waitFor();

    await page.goto(baseUrl + '/03_PLATFORM/01_AUTH/?auth=reset&status=ready&scenario=replay');
    await page.locator('#resetInvalid.active').waitFor();
    assert.equal(await page.locator('#reset').isVisible(), false);
    await context.close();
  }

  console.log('AUTH_PASSWORD_RESET_HOTFIX=PASS');
} finally {
  await browser.close();
}

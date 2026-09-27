(()=> {
  'use strict';

  const RECOVERY_STORAGE_KEY = 'magasin.auth.recovery.session.v1';
  const RECOVERY_REDIRECT_URL = location.origin + location.pathname + '?auth=reset';
  const sb = supabase.createClient(
    'https://menvbzlsncmpuvnaifxa.supabase.co',
    'sb_publishable_HsvCS6HDZnCDInd9PUoh0g_V34wJVqx',
    { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } }
  );

  const $ = id => document.getElementById(id);
  const state = {
    loginSubmitting: false,
    registerSubmitting: false,
    forgotSubmitting: false,
    resetSubmitting: false,
    recoveryReady: false,
    recoveryUserId: '',
    recoveryEventSession: null
  };

  const setMessage = (text, kind = '') => {
    const box = $('msg');
    box.textContent = text || '';
    box.hidden = !text;
    box.className = 'msg' + (kind ? ' ' + kind : '');
  };

  const setView = name => {
    document.querySelectorAll('.view').forEach(node => node.classList.toggle('active', node.id === name));
    setMessage('');
  };

  const setFormBusy = (form, busy, busyLabel) => {
    const button = form && form.querySelector('button[type="submit"]');
    if (!button) return;
    if (!button.dataset.label) button.dataset.label = button.textContent.trim();
    button.disabled = !!busy;
    button.textContent = busy ? busyLabel : button.dataset.label;
    Array.from(form.elements).forEach(el => {
      if (el !== button && el.matches('input,button')) el.disabled = !!busy;
    });
  };

  const emailOf = async value => {
    const normalized = String(value || '').trim();
    if (normalized.includes('@')) return normalized.toLowerCase();
    const query = await sb.rpc('resolve_login_email', { p_username: normalized });
    if (query.error) throw new Error('Không thể xác minh tên đăng nhập lúc này.');
    if (!query.data) throw new Error('Tên đăng nhập không tồn tại.');
    return String(query.data).toLowerCase();
  };

  const profileOf = async id => {
    const query = await sb.from('profiles').select('role,status').eq('id', id).single();
    if (query.error) throw query.error;
    return query.data;
  };

  const route = profile => {
    const role = String(profile.role || '').toUpperCase();
    if (role === 'OWNER') location.replace('/04_OWNER/');
    else if (role === 'ACCOUNTANT') location.replace('/nhap-hang/');
    else if (['STAFF', 'EMPLOYEE'].includes(role)) location.replace('/06_EMPLOYEE/');
    else location.replace('/05_MANAGER/');
  };

  const pending = () => location.replace('/03_PLATFORM/01_AUTH/pending-access.html');

  const clearRecoveryMarker = () => {
    sessionStorage.removeItem(RECOVERY_STORAGE_KEY);
    state.recoveryReady = false;
    state.recoveryUserId = '';
  };

  const replaceUrl = suffix => {
    history.replaceState({}, document.title, location.pathname + (suffix || ''));
  };

  const parseAuthParams = () => {
    const search = new URLSearchParams(location.search || '');
    const hash = new URLSearchParams((location.hash || '').replace(/^#/, ''));
    const get = key => search.get(key) || hash.get(key) || '';
    return { search, hash, get };
  };

  const friendlyRecoveryMessage = code => {
    const normalized = String(code || '').toLowerCase();
    if (normalized.includes('expired') || normalized.includes('otp_expired')) {
      return 'Liên kết đặt lại mật khẩu đã hết hạn. Hãy yêu cầu một liên kết mới và chỉ sử dụng email mới nhất.';
    }
    return 'Liên kết đặt lại mật khẩu đã hết hạn, đã được sử dụng hoặc không còn hợp lệ. Hãy yêu cầu một liên kết mới.';
  };

  const showInvalidRecovery = code => {
    clearRecoveryMarker();
    replaceUrl('?auth=reset&status=invalid');
    $('resetInvalidText').textContent = friendlyRecoveryMessage(code);
    setView('resetInvalid');
  };

  const acceptRecoverySession = session => {
    if (!session || !session.user || !session.user.id) {
      showInvalidRecovery('missing_session');
      return false;
    }
    state.recoveryReady = true;
    state.recoveryUserId = String(session.user.id);
    sessionStorage.setItem(RECOVERY_STORAGE_KEY, state.recoveryUserId);
    replaceUrl('?auth=reset&status=ready');
    setView('reset');
    $('newPassword').focus();
    return true;
  };

  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY' && session && session.user) {
      state.recoveryEventSession = session;
    }
  });

  const establishRecoverySession = async () => {
    const params = parseAuthParams();
    const errorCode = params.get('error_code') || params.get('error');
    if (errorCode) {
      showInvalidRecovery(errorCode);
      return;
    }

    const status = params.search.get('status') || '';
    if (status === 'invalid') {
      showInvalidRecovery('invalid');
      return;
    }

    setView('resetChecking');

    try {
      if (status === 'ready') {
        const expectedUserId = sessionStorage.getItem(RECOVERY_STORAGE_KEY) || '';
        const current = await sb.auth.getSession();
        if (current.error || !expectedUserId || !current.data.session || String(current.data.session.user.id) !== expectedUserId) {
          showInvalidRecovery('missing_session');
          return;
        }
        acceptRecoverySession(current.data.session);
        return;
      }

      const code = params.search.get('code') || '';
      if (code) {
        const exchanged = await sb.auth.exchangeCodeForSession(code);
        if (exchanged.error || !exchanged.data || !exchanged.data.session) {
          showInvalidRecovery(exchanged.error && exchanged.error.code);
          return;
        }
        acceptRecoverySession(exchanged.data.session);
        return;
      }

      const tokenHash = params.search.get('token_hash') || '';
      const tokenType = params.search.get('type') || '';
      if (tokenHash && tokenType === 'recovery') {
        const verified = await sb.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
        if (verified.error || !verified.data || !verified.data.session) {
          showInvalidRecovery(verified.error && verified.error.code);
          return;
        }
        acceptRecoverySession(verified.data.session);
        return;
      }

      const hashType = params.hash.get('type') || '';
      const hasImplicitRecovery = hashType === 'recovery' && !!params.hash.get('access_token') && !!params.hash.get('refresh_token');
      if (hasImplicitRecovery) {
        const current = await sb.auth.getSession();
        const session = state.recoveryEventSession || (current.data && current.data.session);
        if (current.error || !session) {
          showInvalidRecovery(current.error && current.error.code);
          return;
        }
        acceptRecoverySession(session);
        return;
      }

      showInvalidRecovery('missing_recovery_callback');
    } catch (_) {
      showInvalidRecovery('recovery_failed');
    }
  };

  const establishVerificationSession = async () => {
    const params = parseAuthParams();
    const callbackError = params.get('error_code') || params.get('error');
    setView('login');
    setMessage('Đang xác nhận email…');

    try {
      if (callbackError) throw new Error('verification_callback_error');

      let current = await sb.auth.getSession();
      if (current.error) throw current.error;
      let session = current.data && current.data.session;

      const code = params.search.get('code') || '';
      if (!session && code) {
        const exchanged = await sb.auth.exchangeCodeForSession(code);
        if (exchanged.error || !exchanged.data || !exchanged.data.session) throw exchanged.error || new Error('verification_exchange_failed');
        session = exchanged.data.session;
      }

      const tokenHash = params.get('token_hash') || '';
      const tokenType = String(params.get('type') || '').toLowerCase();
      if (!session && tokenHash && ['signup', 'email'].includes(tokenType)) {
        const verified = await sb.auth.verifyOtp({ token_hash: tokenHash, type: tokenType });
        if (verified.error || !verified.data || !verified.data.session) throw verified.error || new Error('verification_otp_failed');
        session = verified.data.session;
      }

      if (!session || !session.user) throw new Error('verification_session_missing');

      const profile = await profileOf(session.user.id);
      const accountStatus = String(profile.status || '').toUpperCase();
      if (accountStatus === 'ACTIVE') {
        replaceUrl('');
        route(profile);
        return;
      }

      await sb.auth.signOut({ scope: 'local' });
      clearRecoveryMarker();
      replaceUrl('');
      setView('login');
      if (accountStatus === 'PENDING') {
        setMessage('Email đã được xác nhận. Tài khoản đang chờ quản lý kích hoạt.');
      } else if (accountStatus === 'INACTIVE') {
        setMessage('Email đã được xác nhận nhưng tài khoản hiện không hoạt động.', 'error');
      } else {
        setMessage('Không thể xác minh trạng thái tài khoản. Vui lòng liên hệ quản lý.', 'error');
      }
      $('username').focus();
    } catch (_) {
      try { await sb.auth.signOut({ scope: 'local' }); } catch (_) {}
      clearRecoveryMarker();
      replaceUrl('');
      setView('login');
      setMessage('Liên kết xác nhận email không hợp lệ hoặc đã hết hạn. Vui lòng thử đăng nhập hoặc đăng ký lại.', 'error');
      $('username').focus();
    }
  };

  document.querySelectorAll('[data-view]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      setView(link.dataset.view);
    });
  });

  document.querySelectorAll('[data-toggle-password]').forEach(button => {
    button.addEventListener('click', () => {
      const input = $(button.dataset.togglePassword);
      if (!input) return;
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      button.textContent = showing ? 'Hiện' : 'Ẩn';
      button.setAttribute('aria-pressed', String(!showing));
      input.focus();
    });
  });

  $('resendResetBtn').addEventListener('click', () => {
    clearRecoveryMarker();
    replaceUrl('');
    setView('forgot');
    $('forgotEmail').focus();
  });

  $('loginForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (state.loginSubmitting) return;
    state.loginSubmitting = true;
    setFormBusy(event.currentTarget, true, 'Đang đăng nhập…');
    try {
      const email = await emailOf($('username').value);
      const result = await sb.auth.signInWithPassword({ email, password: $('password').value });
      if (result.error) throw new Error('Tên đăng nhập hoặc mật khẩu không đúng.');

      let profile;
      try {
        profile = await profileOf(result.data.user.id);
      } catch (_) {
        await sb.auth.signOut({ scope: 'local' });
        setView('login');
        setMessage('Không thể xác minh quyền truy cập của tài khoản. Vui lòng đăng nhập lại.', 'error');
        return;
      }

      const accountStatus = String(profile.status || '').toUpperCase();
      if (accountStatus === 'ACTIVE') {
        route(profile);
        return;
      }
      if (accountStatus === 'PENDING') {
        pending();
        return;
      }

      await sb.auth.signOut({ scope: 'local' });
      setView('login');
      if (accountStatus === 'INACTIVE') {
        setMessage('Tài khoản hiện không hoạt động. Vui lòng liên hệ quản lý.', 'error');
      } else {
        setMessage('Trạng thái tài khoản không hợp lệ. Vui lòng liên hệ quản lý.', 'error');
      }
    } catch (error) {
      setMessage(error.message || 'Không thể đăng nhập lúc này.', 'error');
    } finally {
      state.loginSubmitting = false;
      setFormBusy(event.currentTarget, false, '');
    }
  });

  $('registerForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (state.registerSubmitting) return;
    state.registerSubmitting = true;
    setFormBusy(event.currentTarget, true, 'Đang tạo tài khoản…');
    try {
      const full = $('fullName').value.trim();
      const phone = $('phone').value.trim();
      const email = $('email').value.trim().toLowerCase();
      const username = $('regUsername').value.trim();
      const password = $('regPassword').value;
      if (!full || !email || !username || password.length < 8) throw new Error('Vui lòng nhập đủ thông tin; mật khẩu tối thiểu 8 ký tự.');
      if (!/^[A-Za-z0-9._-]{3,30}$/.test(username)) throw new Error('Tên đăng nhập không hợp lệ.');
      const result = await sb.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: location.origin + location.pathname + '?auth=verify',
          data: { username, full_name: full, phone }
        }
      });
      if (result.error) throw new Error('Không thể tạo tài khoản lúc này.');
      if (result.data && result.data.session) {
        const signedOut = await sb.auth.signOut({ scope: 'local' });
        if (signedOut && signedOut.error) throw new Error('Không thể kết thúc phiên đăng ký lúc này.');
        clearRecoveryMarker();
        setView('login');
        setMessage('Đăng ký thành công. Tài khoản đang chờ quản lý kích hoạt. Bạn có thể đăng nhập bằng tài khoản khác trong lúc chờ.');
      } else {
        setView('login');
        setMessage('Đăng ký thành công. Hãy xác nhận email trước khi đăng nhập.');
      }
    } catch (error) {
      setMessage(error.message || 'Không thể tạo tài khoản lúc này.', 'error');
    } finally {
      state.registerSubmitting = false;
      setFormBusy(event.currentTarget, false, '');
    }
  });

  $('forgotForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (state.forgotSubmitting) return;
    state.forgotSubmitting = true;
    setFormBusy(event.currentTarget, true, 'Đang gửi…');
    try {
      const email = $('forgotEmail').value.trim().toLowerCase();
      if (!email) throw new Error('Vui lòng nhập email.');
      const result = await sb.auth.resetPasswordForEmail(email, { redirectTo: RECOVERY_REDIRECT_URL });
      if (result.error) throw result.error;
      setMessage('Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi. Chỉ sử dụng email mới nhất và không bấm gửi nhiều lần.');
    } catch (_) {
      setMessage('Chưa thể gửi liên kết đặt lại mật khẩu lúc này. Vui lòng thử lại sau.', 'error');
    } finally {
      state.forgotSubmitting = false;
      setFormBusy(event.currentTarget, false, '');
    }
  });

  $('resetForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (state.resetSubmitting) return;
    if (!state.recoveryReady || !state.recoveryUserId) {
      showInvalidRecovery('missing_session');
      return;
    }

    state.resetSubmitting = true;
    setFormBusy(event.currentTarget, true, 'Đang cập nhật…');
    try {
      const password = $('newPassword').value;
      const confirm = $('confirmPassword').value;
      if (password.length < 8) throw new Error('Mật khẩu mới phải có ít nhất 8 ký tự.');
      if (password !== confirm) throw new Error('Hai mật khẩu chưa trùng khớp.');

      const current = await sb.auth.getSession();
      if (current.error || !current.data.session || String(current.data.session.user.id) !== state.recoveryUserId) {
        showInvalidRecovery('stale_session');
        return;
      }

      const updated = await sb.auth.updateUser({ password });
      if (updated.error) {
        if (String(updated.error.code || '').toLowerCase().includes('session')) {
          showInvalidRecovery(updated.error.code);
          return;
        }
        throw new Error('Chưa thể cập nhật mật khẩu. Vui lòng yêu cầu liên kết mới.');
      }

      clearRecoveryMarker();
      replaceUrl('');
      await sb.auth.signOut({ scope: 'local' });
      $('newPassword').value = '';
      $('confirmPassword').value = '';
      setView('login');
      setMessage('Mật khẩu đã được cập nhật. Bạn có thể đăng nhập bằng mật khẩu mới.');
      $('username').focus();
    } catch (error) {
      setMessage(error.message || 'Chưa thể cập nhật mật khẩu. Vui lòng yêu cầu liên kết mới.', 'error');
    } finally {
      state.resetSubmitting = false;
      setFormBusy(event.currentTarget, false, '');
    }
  });

  const boot = async () => {
    const params = parseAuthParams();
    if (params.search.get('auth') === 'reset' || params.hash.get('type') === 'recovery') {
      await establishRecoverySession();
      return;
    }

    const sessionResult = await sb.auth.getSession();
    if (sessionResult.error) {
      setMessage('Không thể kiểm tra phiên đăng nhập lúc này. Vui lòng thử lại.', 'error');
      return;
    }
    if (!sessionResult.data.session) return;

    try {
      const profile = await profileOf(sessionResult.data.session.user.id);
      const accountStatus = String(profile.status || '').toUpperCase();
      if (accountStatus === 'ACTIVE') {
        route(profile);
        return;
      }
      if (accountStatus === 'PENDING') {
        pending();
        return;
      }

      await sb.auth.signOut({ scope: 'local' });
      setView('login');
      if (accountStatus === 'INACTIVE') {
        setMessage('Tài khoản hiện không hoạt động. Vui lòng liên hệ quản lý.', 'error');
      } else {
        setMessage('Trạng thái tài khoản không hợp lệ. Vui lòng liên hệ quản lý.', 'error');
      }
    } catch (_) {
      try { await sb.auth.signOut({ scope: 'local' }); } catch (_) {}
      setView('login');
      setMessage('Không thể xác minh quyền truy cập của tài khoản. Vui lòng đăng nhập lại.', 'error');
    }
  };

  boot();
})();

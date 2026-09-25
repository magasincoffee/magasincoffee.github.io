/*
 * MAGASIN UI/UX V2 — Employee shell adapter
 * UI2-005
 *
 * Presentation/navigation only. Delegates to existing Employee source nav and
 * showView hooks; does not own business data, engines, RPCs or authority.
 */
(() => {
  'use strict';

  if (window.MAGASIN_EMPLOYEE_UI_V2_SHELL) return;

  const PRIMARY = Object.freeze([
    ['dashboard', '⌂', 'Hôm nay'],
    ['schedule', '▦', 'Lịch'],
    ['attendance', '◷', 'Công'],
    ['payroll', '₫', 'Lương'],
    ['profile', '○', 'Tôi']
  ]);

  const CANONICAL = new Set(['dashboard', 'schedule', 'attendance', 'swap', 'payroll', 'profile']);
  const ALIAS = Object.freeze({
    'hom-nay': 'dashboard',
    'lich-lam': 'schedule',
    'cham-cong': 'attendance',
    'doi-ca': 'swap',
    'cho-ca': 'swap',
    'luong': 'payroll',
    'ca-nhan': 'profile'
  });
  const PRIMARY_PARENT = Object.freeze({
    swap: 'schedule',
    inventory: 'dashboard',
    settings: 'profile'
  });

  let originalShowView = null;
  let originalToggleDrawer = null;
  let originalCloseDrawer = null;
  let applyingRoute = false;
  let drawerReturnFocus = null;
  let observer = null;

  const normalize = value => {
    const key = String(value || '').replace(/^#/, '').trim().toLowerCase();
    return ALIAS[key] || key;
  };

  const topWindow = () => {
    try { return window.top || window; } catch (_) { return window; }
  };

  const parentWindow = () => {
    try { return window.parent || window; } catch (_) { return window; }
  };

  const hashOf = target => {
    try { return normalize(target?.location?.hash || ''); } catch (_) { return ''; }
  };

  const canonicalFromHistory = () => {
    for (const target of [topWindow(), parentWindow(), window]) {
      const key = hashOf(target);
      if (CANONICAL.has(key)) return key;
    }
    return 'dashboard';
  };

  const replaceHash = (target, view) => {
    try {
      const url = new URL(target.location.href);
      url.hash = view;
      target.history.replaceState(target.history.state, '', url.pathname + url.search + url.hash);
    } catch (_) {}
  };

  const pushCanonicalRoute = view => {
    const key = normalize(view);
    if (!CANONICAL.has(key) || applyingRoute) return;

    const top = topWindow();
    try {
      if (normalize(top.location.hash) !== key) top.location.hash = key;
    } catch (_) {}

    const parent = parentWindow();
    if (parent !== top) replaceHash(parent, key);
    if (window !== top && window !== parent) replaceHash(window, key);
    else if (window !== top) replaceHash(window, key);
  };

  const primaryFor = view => {
    const key = normalize(view);
    if (PRIMARY.some(([route]) => route === key)) return key;
    if (PRIMARY_PARENT[key]) return PRIMARY_PARENT[key];
    if (key === 'notice') {
      const fromHistory = canonicalFromHistory();
      return PRIMARY.some(([route]) => route === fromHistory)
        ? fromHistory
        : (fromHistory === 'swap' ? 'schedule' : 'dashboard');
    }
    return '';
  };

  const setPrimaryActive = view => {
    const active = primaryFor(view);
    document.querySelectorAll('[data-employee-primary-view]').forEach(button => {
      const yes = button.dataset.employeePrimaryView === active;
      button.dataset.active = String(yes);
      if (yes) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  };

  const sourceLink = view =>
    document.querySelector('.drawer .nav [data-view="' + CSS.escape(normalize(view)) + '"]') ||
    document.querySelector('.nav [data-view="' + CSS.escape(normalize(view)) + '"]');

  const currentView = () => {
    const active = document.querySelector('.page-view.active[id^="view-"]');
    return active ? active.id.replace(/^view-/, '') : canonicalFromHistory();
  };

  const closeSecondaryDrawer = ({ restoreFocus = false } = {}) => {
    originalCloseDrawer?.();
    document.getElementById('drawer')?.classList.remove('open');
    document.getElementById('drawerBackdrop')?.classList.remove('open');
    const trigger = document.querySelector('.header-menu');
    trigger?.setAttribute('aria-expanded', 'false');
    document.body.dataset.employeeDrawerOpen = 'false';
    if (restoreFocus && drawerReturnFocus && typeof drawerReturnFocus.focus === 'function') {
      drawerReturnFocus.focus();
    }
    if (restoreFocus) drawerReturnFocus = null;
  };

  const openSecondaryDrawer = trigger => {
    drawerReturnFocus = trigger || document.activeElement;
    originalToggleDrawer?.();
    document.getElementById('drawer')?.classList.add('open');
    document.getElementById('drawerBackdrop')?.classList.add('open');
    const menu = document.querySelector('.header-menu');
    menu?.setAttribute('aria-expanded', 'true');
    document.body.dataset.employeeDrawerOpen = 'true';
    requestAnimationFrame(() => {
      document.querySelector('.drawer .nav a:not(.employee-v2-primary-source)')?.focus();
    });
  };

  const activateSourceView = view => {
    const key = normalize(view);
    const link = sourceLink(key);
    if (link) {
      link.click();
      return true;
    }
    if (typeof originalShowView === 'function' && document.getElementById('view-' + key)) {
      originalShowView.call(window, key);
      return true;
    }
    return false;
  };

  const applyCanonicalRoute = (view, attempt = 0) => {
    const key = normalize(view);
    if (!CANONICAL.has(key)) return false;
    applyingRoute = true;
    const ok = activateSourceView(key);
    applyingRoute = false;
    if (ok) {
      setPrimaryActive(key);
      replaceHash(parentWindow(), key);
      if (window !== parentWindow()) replaceHash(window, key);
      return true;
    }
    if (attempt < 30) setTimeout(() => applyCanonicalRoute(key, attempt + 1), 75);
    return false;
  };

  const installShowViewBridge = () => {
    if (typeof window.showView !== 'function' || window.showView.__magasinUi2Wrapped) return;
    originalShowView = window.showView;
    const wrapped = function(view, link) {
      const key = normalize(view);
      const result = originalShowView.call(this, view, link);
      setPrimaryActive(key);
      if (CANONICAL.has(key)) pushCanonicalRoute(key);
      closeSecondaryDrawer();
      return result;
    };
    wrapped.__magasinUi2Wrapped = true;
    window.showView = wrapped;
  };

  const decorateSecondaryDrawer = () => {
    const drawer = document.getElementById('drawer');
    const nav = drawer?.querySelector('.nav');
    if (!drawer || !nav) return;

    if (!drawer.querySelector('.employee-v2-drawer-close')) {
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'employee-v2-drawer-close';
      close.setAttribute('aria-label', 'Đóng menu phụ');
      close.textContent = '×';
      close.addEventListener('click', () => closeSecondaryDrawer({ restoreFocus: true }));
      drawer.prepend(close);
    }

    if (!drawer.querySelector('.employee-v2-secondary-label')) {
      const label = document.createElement('div');
      label.className = 'employee-v2-secondary-label';
      label.textContent = 'Tiện ích khác';
      nav.before(label);
    }

    const primaryKeys = new Set(PRIMARY.map(([route]) => route));
    nav.querySelectorAll('[data-view]').forEach(link => {
      const view = normalize(link.dataset.view);
      link.classList.toggle('employee-v2-primary-source', primaryKeys.has(view));
      const label = view === 'swap'
        ? '⇄ Đổi / Cho ca'
        : view === 'inventory'
          ? '□ Tồn hàng'
          : view === 'settings'
            ? '⚙ Cài đặt'
            : null;
      if (label && link.textContent !== label) link.textContent = label;
    });
  };

  const buildPrimaryNav = () => {
    if (document.getElementById('employeeV2PrimaryNav')) return;
    const nav = document.createElement('nav');
    nav.id = 'employeeV2PrimaryNav';
    nav.className = 'employee-v2-primary-nav';
    nav.setAttribute('aria-label', 'Điều hướng chính nhân viên');

    for (const [view, icon, label] of PRIMARY) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'employee-v2-primary-nav__item';
      button.dataset.employeePrimaryView = view;
      button.innerHTML =
        '<span class="employee-v2-primary-nav__icon" aria-hidden="true">' + icon + '</span>' +
        '<span class="employee-v2-primary-nav__label">' + label + '</span>';
      button.addEventListener('click', () => {
        if (activateSourceView(view)) {
          setPrimaryActive(view);
          pushCanonicalRoute(view);
          closeSecondaryDrawer();
        }
      });
      nav.appendChild(button);
    }

    document.body.appendChild(nav);
  };

  const syncSourceNavigation = () => {
    decorateSecondaryDrawer();
    setPrimaryActive(currentView());
  };

  const bindSourceNav = () => {
    document.addEventListener('click', event => {
      const link = event.target.closest?.('.nav [data-view]');
      if (!link) return;
      const view = normalize(link.dataset.view);
      setTimeout(() => {
        setPrimaryActive(view);
        if (CANONICAL.has(view)) pushCanonicalRoute(view);
      }, 0);
    }, true);
  };

  const bindHistory = () => {
    const handler = () => {
      const key = canonicalFromHistory();
      if (normalize(currentView()) === key) {
        setPrimaryActive(key);
        return;
      }
      applyCanonicalRoute(key);
    };
    const targets = new Set([topWindow(), parentWindow(), window]);
    for (const target of targets) {
      try {
        target.addEventListener('popstate', handler);
        target.addEventListener('hashchange', handler);
      } catch (_) {}
    }
  };

  const bindDrawer = () => {
    originalToggleDrawer = typeof window.toggleDrawer === 'function' ? window.toggleDrawer : null;
    originalCloseDrawer = typeof window.closeDrawer === 'function' ? window.closeDrawer : null;

    window.toggleDrawer = function() {
      const open = document.body.dataset.employeeDrawerOpen === 'true';
      if (open) closeSecondaryDrawer({ restoreFocus: true });
      else openSecondaryDrawer(document.querySelector('.header-menu'));
    };
    window.closeDrawer = function() {
      closeSecondaryDrawer();
    };

    const menu = document.querySelector('.header-menu');
    menu?.setAttribute('aria-controls', 'drawer');
    menu?.setAttribute('aria-expanded', 'false');

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && document.body.dataset.employeeDrawerOpen === 'true') {
        closeSecondaryDrawer({ restoreFocus: true });
      }
    });
  };

  const verifyScheduleSecondaryReachability = () => {
    document.body.dataset.employeeScheduleSecondary = 'availability-swap-give';
  };

  const boot = () => {
    if (!document.body || document.getElementById('employeeV2PrimaryNav')) return;

    document.body.dataset.magasinUiV2 = '';
    document.body.dataset.mPhonePrimary = 'true';
    document.body.dataset.magasinEmployeeShellV2 = '';
    document.body.dataset.employeeDrawerOpen = 'false';

    buildPrimaryNav();
    installShowViewBridge();
    bindDrawer();
    bindSourceNav();
    bindHistory();
    syncSourceNavigation();
    verifyScheduleSecondaryReachability();

    observer = new MutationObserver(() => {
      decorateSecondaryDrawer();
      setPrimaryActive(currentView());
    });
    const drawerNav = document.querySelector('.drawer .nav');
    const pageWrap = document.querySelector('.page-wrap');
    if (drawerNav) observer.observe(drawerNav, { childList: true, subtree: true });
    if (pageWrap) observer.observe(pageWrap, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

    const initial = canonicalFromHistory();
    applyCanonicalRoute(initial);

    window.MAGASIN_EMPLOYEE_UI_V2_SHELL = Object.freeze({
      version: '2.0',
      primary: PRIMARY.map(item => item[0]),
      getCurrentView: currentView,
      activate: view => applyCanonicalRoute(view),
      openSecondaryDrawer: () => openSecondaryDrawer(document.querySelector('.header-menu')),
      closeSecondaryDrawer: () => closeSecondaryDrawer({ restoreFocus: true })
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();

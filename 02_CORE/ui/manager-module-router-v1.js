/*
 * #506 P0.2 — same-document Manager navigation.
 * A presentation controller only: authorized hosts keep their existing role gates
 * and modules continue using their original Supabase/RLS checks.
 */
(() => {
  'use strict';
  if (window.MAGASIN_MANAGER_MODULE_ROUTER) return;
  const shell = window.MAGASIN_UI_V2_SHELL;
  if (shell?.role !== 'MANAGER') return;
  const host = document.getElementById('magasinUiV2Shell');
  // The standalone host is authoritative. Never start a second router in its
  // legacy-content frame (that would overwrite its history/popstate owner).
  if (window !== window.top && window.top.MAGASIN_MANAGER_SPA_ROUTER) return;
  const legacyHost = shell.mode === 'legacy-manager';
  const canonicalSchedulingHost = shell.mode === 'standalone' &&
    /^\/manager\/scheduling\/?$/i.test(window.top.location.pathname);
  if (!host || (!legacyHost && !canonicalSchedulingHost)) return;
  if (legacyHost && !/^\/manager(?:\/|$)/i.test(window.top.location.pathname)) return;

  const top = window.top;
  const currentURL = () => top.location.pathname + top.location.search + top.location.hash;
  const lookup = view => ({
    dashboard: '/manager/', workforce: '/manager/scheduling/',
    demand: '/manager/scheduling/?section=demand',
    schedule: '/manager/schedule/'
  })[view] || '/manager/#' + encodeURIComponent(view);
  const routeView = () => {
    const p = top.location.pathname.toLowerCase().replace(/\/+$/, '');
    if (p === '/manager/scheduling') {
      return new URLSearchParams(top.location.search).get('section') === 'demand' ? 'demand' : 'workforce';
    }
    if (p === '/manager/schedule') return 'schedule';
    const hash = top.location.hash.slice(1);
    return hash || 'dashboard';
  };
  const isSchedule = view => view === 'demand' || view === 'workforce';
  const all = new Map();
  const context = { storeId: '', weekStart: '' };
  let active = routeView();
  let transition = false;
  let syncing = null;
  const sources = {
    workforce: '/05_MANAGER/SchedulingV2/index.html?mode=live&draft-editor&release-preview&auto-preview&post-publish-preview&v=20261021-manager-nav-b3',
    demand: '/05_MANAGER/SchedulingV2/Demand/index.html?mode=live&demand-preview&v=20261021-demand-fix1'
  };
  const moduleKey = view => isSchedule(view) ? view : 'legacy';
  const frameOf = view => all.get(moduleKey(view));

  function snapshot(frame) {
    try {
      const d = frame?.contentDocument;
      if (!d) return;
      const store = d.querySelector('#sv2Store, #sv2DemandStore');
      const week = d.querySelector('#sv2Week');
      if (store?.value && [...store.options].some(o => o.value === store.value)) context.storeId = store.value;
      if (/^\d{4}-\d{2}-\d{2}$/.test(week?.value || '')) context.weekStart = week.value;
    } catch (_) { /* same-origin frame can be not ready */ }
  }
  function dirty(frame) {
    try {
      const w = frame?.contentWindow, d = frame?.contentDocument;
      if (!w || !d) return false;
      return !!(w.MAGASIN_MANAGER_EDIT_STATE?.isDirty?.() ||
        w.MAGASIN_SCHEDULING_V2_WEEKLY_DEMAND?.isDirty?.() ||
        d.getElementById('sv2ShiftLayer') ||
        d.querySelector('[data-manager-unsaved="true"]'));
    } catch (_) { return true; } // Fail closed if an editor becomes inaccessible.
  }
  function dirtyAny() {
    return [...all.values()].some(frame => dirty(frame));
  }
  function acceptLeaving(next) {
    const frame = frameOf(active);
    if (!frame || next === active || !dirty(frame)) return true;
    return top.confirm('Bạn có thay đổi chưa lưu. Nội dung sẽ được giữ lại khi chuyển mục. Tiếp tục chuyển?');
  }
  function applyContext(frame) {
    if (!frame || syncing === frame) return;
    syncing = frame;
    let tries = 0;
    const timer = window.setInterval(() => {
      if (!frame.isConnected || ++tries > 80) { window.clearInterval(timer); syncing = null; return; }
      try {
        const d = frame.contentDocument;
        if (!d || d.readyState === 'loading') return;
        const store = d.querySelector('#sv2Store, #sv2DemandStore');
        const week = d.querySelector('#sv2Week');
        const readyStore = !store || !context.storeId ||
          [...store.options].some(o => o.value === context.storeId);
        if (store && context.storeId && readyStore && store.value !== context.storeId) {
          store.value = context.storeId;
          store.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (week && context.weekStart && week.value !== context.weekStart) {
          week.value = context.weekStart;
          week.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (readyStore && (!week || !context.weekStart || week.value === context.weekStart)) {
          window.clearInterval(timer);
          syncing = null;
        }
      } catch (_) { window.clearInterval(timer); syncing = null; }
    }, 200);
  }
  function interceptChildLinks(frame) {
    try {
      const doc = frame.contentDocument;
      if (!doc || doc.documentElement.dataset.managerSpaLinks === '1') return;
      doc.documentElement.dataset.managerSpaLinks = '1';
      doc.addEventListener('click', e => {
        const a = e.target.closest?.('a[href]');
        if (!a) return;
        const target = new URL(a.href, top.location.href);
        if (target.origin !== top.location.origin || !target.pathname.startsWith('/manager/')) return;
        let view;
        if (/^\/manager\/scheduling\/?$/.test(target.pathname))
          view = target.searchParams.get('section') === 'demand' ? 'demand' : 'workforce';
        else if (/^\/manager\/schedule\/?$/.test(target.pathname)) view = 'schedule';
        else if (/^\/manager\/?$/.test(target.pathname))
          view = target.hash.slice(1) || 'dashboard';
        else return;
        e.preventDefault();
        e.stopImmediatePropagation();
        navigate(view);
      }, true);
      for (const sel of ['#sv2Store', '#sv2DemandStore', '#sv2Week']) {
        doc.querySelector(sel)?.addEventListener('change', () => snapshot(frame));
      }
      doc.addEventListener('magasin:scheduling-v2-week-loaded', () => snapshot(frame));
    } catch (_) { /* do not use iframe access as an authorization shortcut */ }
  }
  function setupSchedule(frame) {
    frame.addEventListener('load', () => {
      interceptChildLinks(frame);
      applyContext(frame);
    });
    if (frame.contentDocument?.readyState === 'complete') {
      interceptChildLinks(frame);
      applyContext(frame);
    }
  }
  function createSchedule(view) {
    if (all.has(view)) return all.get(view);
    const frame = document.createElement('iframe');
    frame.className = 'm-manager-router-frame';
    frame.dataset.managerModule = view;
    frame.title = view === 'demand' ? 'Nhu cầu nhân sự' : 'Xếp lịch làm việc';
    frame.hidden = true;
    document.body.append(frame);
    all.set(view, frame);
    setupSchedule(frame);
    frame.src = sources[view];
    return frame;
  }
  function setupLegacyFromStandalone(frame) {
    // This host has already passed requireActive STORE_MANAGER. The legacy runtime
    // still performs its own server-side/role authorization; no data is passed in.
    frame.addEventListener('load', () => {
      const outer = frame.contentDocument?.getElementById('app');
      if (!outer) return;
      const reveal = () => {
        try {
          const d = outer.contentDocument;
          if (!d?.getElementById('magasinUiV2Shell')) return false;
          if (!d.getElementById('magasinManagerSpaChromeMask')) {
            const style = d.createElement('style');
            style.id = 'magasinManagerSpaChromeMask';
            style.textContent = [
              'body[data-magasin-shell-v2] #magasinUiV2Shell{display:none!important}',
              'body[data-magasin-shell-v2]>.app>.main{margin-left:0!important;padding-top:0!important}',
              'body[data-magasin-shell-v2]>.app>.sidebar{display:none!important}',
              'body[data-magasin-shell-v2] .main>.header{display:none!important}'
            ].join(';');
            d.head.append(style);
          }
          frame.style.visibility = 'visible';
          const shell = d.defaultView.MAGASIN_UI_V2_SHELL;
          shell?.setActive?.(active);
          const btn = d.querySelector('.sidebar [data-view="' + CSS.escape(active) + '"]');
          if (btn && !btn.classList.contains('active')) btn.click();
          return true;
        } catch (_) { return false; }
      };
      if (reveal()) return;
      let tries = 0;
      const timer = window.setInterval(() => {
        if (reveal() || ++tries > 80) {
          window.clearInterval(timer);
          if (tries > 80 && frame.style.visibility === 'hidden') {
            const status = document.createElement('p');
            status.className = 'm-manager-router-error';
            status.setAttribute('role', 'alert');
            status.textContent = 'Không thể mở phân hệ. Hãy thử lại từ trang Quản lý.';
            document.body.append(status);
          }
        }
      }, 150);
    });
  }
  function createLegacy() {
    if (all.has('legacy')) return all.get('legacy');
    const frame = document.createElement('iframe');
    frame.className = 'm-manager-router-frame';
    frame.dataset.managerModule = 'legacy';
    frame.title = 'Quản lý cửa hàng';
    frame.hidden = true;
    document.body.append(frame);
    all.set('legacy', frame);
    // Do not expose a nested chrome while its mask and source view initialize.
    frame.style.visibility = 'hidden';
    setupLegacyFromStandalone(frame);
    frame.src = '/05_MANAGER/runtime/manager-runtime-v1.html?v=20261021-manager-nav-b3';
    return frame;
  }
  function activateLegacy(view) {
    if (legacyHost) {
      const btn = document.querySelector('.sidebar [data-view="' + CSS.escape(view) + '"]');
      if (btn && !btn.classList.contains('active')) btn.click();
    } else {
      const frame = createLegacy();
      const doc = frame.contentDocument?.getElementById('app')?.contentDocument;
      const btn = doc?.querySelector('.sidebar [data-view="' + CSS.escape(view) + '"]');
      if (btn && !btn.classList.contains('active')) btn.click();
    }
  }
  function show(view) {
    const key = moduleKey(view);
    let target;
    if (key === 'legacy') target = legacyHost ? all.get('legacy') : createLegacy();
    else target = createSchedule(view);
    for (const [k, frame] of all) if (frame) frame.hidden = k !== key;
    document.body.dataset.managerRouterActive = key === 'legacy' ? 'legacy' : 'embedded';
    if (key === 'legacy') activateLegacy(view);
    else applyContext(target);
    active = view;
    shell.setActive(view);
    shell.closeDrawer();
  }
  function navigate(view, options = {}) {
    if (transition) return false;
    const safe = new Set(['dashboard', 'staff', 'demand', 'workforce', 'schedule',
      'swap', 'attendance', 'payroll-self-check', 'tasks', 'reports', 'settings']);
    if (!safe.has(view)) return false;
    if (!acceptLeaving(view)) {
      if (options.fromPopstate) top.history.pushState({}, '', lookup(active));
      return true;
    }
    transition = true;
    try {
      snapshot(frameOf(active));
      const next = lookup(view);
      if (options.history !== 'none' && currentURL() !== next) {
        (options.replace ? top.history.replaceState : top.history.pushState).call(
          top.history, { magasinManagerRouter: true }, '', next);
      }
      show(view);
      return true;
    } finally { transition = false; }
  }

  // Reuse the existing live iframe when arriving from a direct Scheduling URL.
  if (legacyHost) all.set('legacy', null);
  else {
    const initial = document.getElementById('app');
    if (initial) {
      initial.classList.add('m-manager-router-frame');
      initial.dataset.managerModule = active;
      all.set(active, initial);
      setupSchedule(initial);
    }
  }
  top.addEventListener('popstate', () => navigate(routeView(), { history: 'none', fromPopstate: true }));
  top.addEventListener('beforeunload', event => {
    if (dirtyAny()) { event.preventDefault(); event.returnValue = ''; }
  });
  window.MAGASIN_MANAGER_MODULE_ROUTER = Object.freeze({
    navigate, current: () => active, context: () => ({ ...context }),
    dirty: dirtyAny
  });
  top.MAGASIN_MANAGER_SPA_ROUTER = window.MAGASIN_MANAGER_MODULE_ROUTER;
})();

/*
 * MAGASIN UI/UX V2 — authenticated shell behavior
 * UI2-004
 *
 * Presentation/navigation adapter only. It never reads or writes business data,
 * never changes role authority, and delegates Manager view activation to the
 * existing canonical source nav.
 */
(() => {
  'use strict';

  if (window.MAGASIN_UI_V2_SHELL) return;

  const MANAGER_NAV = Object.freeze({
    primary: Object.freeze([
      ['dashboard', '⌂', 'Tổng quan'],
      ['staff', '◎', 'Nhân viên'],
      ['payroll-self-check', '₫', 'Công / Lương (xem)']
    ]),
    groups: Object.freeze([
      { key: 'planning', title: 'Lập lịch nhân sự', icon: '▦', items: [
        ['demand', '▤', 'Nhu cầu nhân sự'],
        ['workforce', '▦', 'Xếp lịch'],
        ['availability', '▤', 'Đăng ký lịch làm việc'],
        ['schedule', '▤', 'Lịch đã công bố']
      ] },
      { key: 'time', title: 'Công & Điều chỉnh ca', icon: '◷', items: [
        ['attendance', '◷', 'Chấm công'],
        ['swap', '⇄', 'Cho / Đổi ca']
      ] }
    ]),
    hidden: Object.freeze(['kpi', 'academy', 'tasks', 'reports', 'settings'])
  });

  const OWNER_NAV = Object.freeze({
    primary: Object.freeze([
      ['overview', '⌂', 'Tổng quan', '/owner/'],
      ['attention', '!', 'Cần chú ý', '/04_OWNER/ControlTower/'],
      ['workforce', '▦', 'Nhân sự', '/owner/scheduling/'],
      ['availability', '▤', 'Đăng ký lịch làm việc', '/owner/scheduling/?view=availability'],
      ['procurement', '□', 'Mua hàng', '/nhap-hang/'],
      ['access', '⌘', 'Phân quyền', '/04_OWNER/Access/']
    ]),
    secondary: Object.freeze([]),
    hidden: Object.freeze([])
  });

  const MANAGER_META = Object.freeze({
    dashboard: ['Tổng quan cửa hàng', 'Hoạt động và các việc cần xử lý hôm nay'],
    demand: ['Nhu cầu nhân sự', 'Định mức nhân sự cố định trong tuần theo chi nhánh'],
    workforce: ['Xếp lịch', 'Thời gian có thể làm → Lịch nháp → Kiểm tra → Duyệt → Phát hành'],
    availability: ['Đăng ký lịch làm việc', 'Tổng hợp khả dụng theo tuần và chi nhánh'],
    swap: ['Đổi / Cho ca', 'Kiểm tra và xử lý yêu cầu chuyển ca'],
    attendance: ['Chấm công', 'Kiểm tra giờ công theo lịch đã phát hành'],
    staff: ['Nhân viên', 'Danh sách và trạng thái nhân sự'],
    'payroll-self-check': ['Công / Lương', 'Đối soát công và lương'],
    schedule: ['Lịch đã phát hành', 'Lịch làm chính thức từ hệ thống'],
    tasks: ['Công việc', 'Nguồn công việc và quy trình hiện có'],
    reports: ['Báo cáo', 'Trạng thái nguồn dữ liệu báo cáo và đối soát'],
    settings: ['Cài đặt', 'Cấu hình hiện có']
  });

  const OWNER_META = Object.freeze({
    overview: ['Tổng quan', 'Điều hành hệ thống MAGASIN'],
    attention: ['Cần chú ý', 'Các vấn đề cần theo dõi trên toàn hệ thống'],
    workforce: ['Nhân sự', 'Giám sát lịch và hỗ trợ theo cửa hàng'],
    availability: ['Đăng ký lịch làm việc', 'Tổng hợp nhân viên đăng ký khả dụng theo chi nhánh'],
    procurement: ['Mua hàng', 'Nhập hàng · công nợ · báo cáo mua hàng'],
    access: ['Phân quyền', 'Quản lý quyền tài khoản nội bộ']
  });

  let activeKey = '';
  let config = null;
  let shell = null;
  let returnFocus = null;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));

  const roleOf = () => {
    const requested = String(
      window.__MAGASIN_UI_V2_SHELL__?.role ||
      document.body?.dataset?.magasinShellRole ||
      ''
    ).toUpperCase();
    return requested === 'OWNER' ? 'OWNER' : 'MANAGER';
  };

  const modeOf = () => String(
    window.__MAGASIN_UI_V2_SHELL__?.mode ||
    document.body?.dataset?.magasinShellMode ||
    (document.querySelector('.sidebar [data-view]') ? 'legacy-manager' : 'standalone')
  );

  const topWindow = () => {
    try { return window.top || window; } catch (_) { return window; }
  };

  const topPath = () => {
    try { return topWindow().location.pathname || location.pathname || '/'; }
    catch (_) { return location.pathname || '/'; }
  };

  const ownerKeyFromPath = path => {
    const p = String(path || '/').toLowerCase();
    if (p.startsWith('/owner/scheduling')) return 'workforce';
    if (p === '/owner' || p.startsWith('/owner/')) return 'overview';
    if (p.startsWith('/04_owner/controltower')) return 'attention';
    if (p.startsWith('/04_owner/workforce')) return 'workforce';
    if (p.startsWith('/nhap-hang') || p.startsWith('/04_owner/procurement')) return 'procurement';
    if (p.startsWith('/04_owner/access')) return 'access';
    return 'overview';
  };

  const currentManagerView = () => {
    // The top canonical URL is authoritative; old V1 active classes may be stale
    // while an iframe is loading or after a click routed to another module.
    try {
      const topLocation = topWindow().location;
      const path = String(topLocation.pathname || '').toLowerCase();
      if (path.startsWith('/manager/scheduling')) return new URLSearchParams(topLocation.search).get('section') === 'demand' ? 'demand' : 'workforce';
      if (path.startsWith('/manager/schedule/')) return 'schedule';
      const topHash = String(topLocation.hash || '').replace(/^#/, '');
      if (topHash) return topHash;
      if (path === '/manager/' || path === '/manager') return 'dashboard';
    } catch (_) {}
    const hash = String(location.hash || '').replace(/^#/, '');
    if (hash) return hash;
    const source = document.querySelector('.sidebar [data-view].active');
    return source?.dataset.view || 'dashboard';
  };

  const sourceButton = view =>
    document.querySelector('.sidebar [data-view="' + CSS.escape(view) + '"]');

  const currentKey = () => {
    if (config.role === 'OWNER') {
      try { if (new URLSearchParams(topWindow().location.search).get('view') === 'availability') return 'availability'; } catch (_) {}
      return String(
        window.__MAGASIN_UI_V2_SHELL__?.current ||
        document.body.dataset.magasinShellCurrent ||
        ownerKeyFromPath(topPath())
      );
    }
    return currentManagerView();
  };

  const accountSnapshot = () => {
    const roleFallback = config.role === 'OWNER' ? 'OWNER' : 'Quản lý';
    const nameNode =
      document.querySelector('#profileName') ||
      document.querySelector('#ownerIdentity') ||
      document.querySelector('#userName');
    const metaNode = document.querySelector('#profileMeta');
    const rawName = (nameNode?.textContent || roleFallback).trim();
    const name = rawName.replace(/\s*·\s*OWNER\s*$/i, '') || roleFallback;
    const meta = (metaNode?.textContent || roleFallback).trim();
    return { name, meta };
  };

  const initials = name => {
    const parts = String(name || 'M').trim().split(/\s+/).filter(Boolean);
    return (parts.length ? parts[parts.length - 1][0] : 'M').toUpperCase();
  };

  const metaFor = key => {
    const source = config.role === 'OWNER' ? OWNER_META : MANAGER_META;
    return source[key] || (config.role === 'OWNER'
      ? ['Chủ hệ thống', 'Giám sát và quản trị']
      : ['Quản lý cửa hàng', 'Vận hành cửa hàng']);
  };

  const setPageMeta = key => {
    const [title, subtitle] = metaFor(key);
    const titleNode = shell?.querySelector('[data-shell-page-title]');
    const subNode = shell?.querySelector('[data-shell-page-subtitle]');
    if (titleNode) titleNode.textContent = title;
    if (subNode) subNode.textContent = subtitle;
  };

  const setActive = key => {
    activeKey = key || currentKey();
    document.querySelectorAll('.m-shell-v2-nav__item[data-shell-key]').forEach(node => {
      const active = node.dataset.shellKey === activeKey;
      node.dataset.active = String(active);
      if (active) node.setAttribute('aria-current', 'page');
      else node.removeAttribute('aria-current');
    });
    setPageMeta(activeKey);
    if (config?.role === 'MANAGER' && shell) {
      shell.querySelectorAll('[data-shell-disclosure]').forEach(button => {
        const panel = document.getElementById(button.getAttribute('aria-controls'));
        if (panel?.querySelector('[data-shell-key="' + CSS.escape(activeKey) + '"]')) {
          button.setAttribute('aria-expanded', 'true');
          panel.hidden = false;
        }
      });
    }
  };

  const closeDrawer = () => {
    if (!document.body) return;
    document.body.dataset.shellDrawerOpen = 'false';
    const menu = shell?.querySelector('.m-shell-v2-menu');
    menu?.setAttribute('aria-expanded', 'false');
    if (returnFocus && typeof returnFocus.focus === 'function') returnFocus.focus();
    returnFocus = null;
  };

  const openDrawer = trigger => {
    if (!document.body) return;
    returnFocus = trigger || document.activeElement;
    document.body.dataset.shellDrawerOpen = 'true';
    const menu = shell?.querySelector('.m-shell-v2-menu');
    menu?.setAttribute('aria-expanded', 'true');
    shell?.querySelector('.m-shell-v2-nav__item')?.focus();
  };

  const activateManagerView = (view, attempt = 0) => {
    // #506: route in one document when the authorized Manager module host is ready.
    // The existing allowlisted route remains the fallback for hard/deep links.
    if (window.MAGASIN_MANAGER_MODULE_ROUTER?.navigate(view)) return true;
    // Dedicated modules have one canonical host, not a legacy V1 button.
    const path = String(topPath()).toLowerCase();
    // On the dedicated Scheduling host, this very same Manager shell owns the nav.
    // There are intentionally no legacy V1 buttons inside its content iframe.
    if(config.mode==='standalone' && (path==='/manager/scheduling/'||path==='/manager/scheduling')){
      const target=view==='dashboard'?'/manager/':
        view==='workforce'?'/manager/scheduling/':
        view==='demand'?'/manager/scheduling/?section=demand':
        view==='schedule'?'/manager/schedule/':'/manager/#'+encodeURIComponent(view);
      setActive(view);
      closeDrawer();
      const current=String(topWindow().location.pathname||'')+String(topWindow().location.search||'')+String(topWindow().location.hash||'');
      if(current!==target)topWindow().location.assign(target);
      return true;
    }
    const canonicalHost = path === '/manager/' || path === '/manager' || path === '/05_manager/';
    if (canonicalHost && (view === 'workforce' || view === 'demand' || view === 'schedule')) {
      const href = view === 'workforce' ? '/manager/scheduling/' :
        view === 'demand' ? '/manager/scheduling/?section=demand' : '/manager/schedule/';
      closeDrawer();
      topWindow().location.assign(href);
      return true;
    }
    const button = sourceButton(view);
    if (button && !button.hidden && button.getAttribute('aria-hidden') !== 'true') {
      button.click();
      setActive(view);
      closeDrawer();
      return true;
    }
    // Avoid delayed V1 actions overriding a newer navigation request.
    if (attempt === 0) console.warn('[MAGASIN_MANAGER_NAV] Missing source view:', view);
    return false;
  };

  const navigateOwner = (key, href) => {
    setActive(key);
    closeDrawer();
    try { topWindow().location.assign(href); }
    catch (_) { location.assign(href); }
  };

  const buildNavGroup = (label, items) => {
    if (!items?.length) return '';
    const role = config.role;
    const itemMarkup = items.map(item => {
      const [key, icon, text, href] = item;
      const attrs = role === 'OWNER'
        ? 'href="' + esc(href) + '"'
        : 'href="#" role="button"';
      return '<a class="m-shell-v2-nav__item" ' + attrs +
        ' data-shell-key="' + esc(key) + '"' +
        (role === 'MANAGER' ? ' data-shell-view="' + esc(key) + '"' : '') +
        '><span class="m-shell-v2-nav__icon" aria-hidden="true">' + esc(icon) +
        '</span><span>' + esc(text) + '</span></a>';
    }).join('');
    return '<section class="m-shell-v2-nav__group">' +
      '<div class="m-shell-v2-nav__label">' + esc(label) + '</div>' +
      '<div class="m-shell-v2-nav__items">' + itemMarkup + '</div>' +
      '</section>';
  };

  const buildManagerDisclosure = group => {
    const id = 'm-shell-v2-menu-' + group.key;
    const items = group.items.map(([key, icon, label]) =>
      '<a class="m-shell-v2-nav__item" href="#" role="button" data-shell-key="' + esc(key) +
      '" data-shell-view="' + esc(key) + '">' +
      '<span class="m-shell-v2-nav__icon" aria-hidden="true">' + esc(icon) + '</span>' +
      '<span>' + esc(label) + '</span></a>'
    ).join('');
    return '<section class="m-shell-v2-nav__group m-shell-v2-nav__disclosure">' +
      '<button type="button" class="m-shell-v2-nav__item m-shell-v2-nav__disclosure-btn" ' +
      'data-shell-disclosure="' + esc(group.key) + '" aria-expanded="false" aria-controls="' + id + '">' +
      '<span class="m-shell-v2-nav__icon" aria-hidden="true">' + esc(group.icon) + '</span>' +
      '<span>' + esc(group.title) + '</span><span class="m-shell-v2-nav__chevron" aria-hidden="true">⌄</span></button>' +
      '<div class="m-shell-v2-nav__submenu" id="' + id + '" hidden>' + items + '</div></section>';
  };

  const buildShell = () => {
    const nav = config.role === 'OWNER' ? OWNER_NAV : MANAGER_NAV;
    const account = accountSnapshot();
    const roleLabel = config.role === 'OWNER' ? 'OWNER · Chủ hệ thống' : 'Quản lý cửa hàng';
    const root = document.createElement('div');
    root.id = 'magasinUiV2Shell';
    root.className = 'm-ui-v2';
    root.dataset.magasinUiV2 = '';

    root.innerHTML =
      '<div class="m-shell-v2-backdrop" data-shell-backdrop aria-hidden="true"></div>' +
      '<aside class="m-shell-v2-sidebar" id="magasinV2Sidebar" aria-label="Điều hướng chính">' +
        '<div class="m-shell-v2-brand">' +
          '<div class="m-shell-v2-brand__mark" aria-hidden="true">M</div>' +
          '<div><div class="m-shell-v2-brand__name">MAGASIN</div>' +
          '<div class="m-shell-v2-brand__role">' + esc(roleLabel) + '</div></div>' +
        '</div>' +
        '<nav class="m-shell-v2-nav">' +
          buildNavGroup('Chính', nav.primary) +
          (config.role === 'MANAGER' ? nav.groups.map(buildManagerDisclosure).join('') : '') +
        '</nav>' +
        '<div class="m-shell-v2-sidebar__footer">' +
          '<div class="m-shell-v2-account">' +
            '<div class="m-shell-v2-account__name" data-shell-account-name>' + esc(account.name) + '</div>' +
            '<div class="m-shell-v2-account__meta" data-shell-account-meta>' + esc(account.meta) + '</div>' +
          '</div>' +
          '<button type="button" class="m-button m-shell-v2-logout" data-shell-logout>Đăng xuất</button>' +
        '</div>' +
      '</aside>' +
      '<header class="m-shell-v2-topbar">' +
        '<div class="m-shell-v2-topbar__left">' +
          '<button type="button" class="m-icon-button m-shell-v2-menu" data-shell-menu aria-label="Mở điều hướng" aria-controls="magasinV2Sidebar" aria-expanded="false">☰</button>' +
          '<div class="m-shell-v2-page">' +
            '<div class="m-shell-v2-page__title" data-shell-page-title></div>' +
            '<div class="m-shell-v2-page__subtitle" data-shell-page-subtitle></div>' +
          '</div>' +
        '</div>' +
        '<div class="m-shell-v2-topbar__right">' +
          '<div class="m-shell-v2-store-slot" data-shell-store-slot hidden></div>' +
          '<div class="m-shell-v2-user" aria-label="Tài khoản hiện tại">' +
            '<div class="m-shell-v2-user__copy">' +
              '<div class="m-shell-v2-user__name" data-shell-user-name>' + esc(account.name) + '</div>' +
              '<div class="m-shell-v2-user__meta">' + esc(roleLabel) + '</div>' +
            '</div>' +
            '<div class="m-shell-v2-user__avatar" aria-hidden="true">' + esc(initials(account.name)) + '</div>' +
          '</div>' +
        '</div>' +
      '</header>';

    document.body.prepend(root);
    return root;
  };

  const enforceManagerVisibilityContract = () => {
    if (config.role !== 'MANAGER') return;
    MANAGER_NAV.hidden.forEach(view => {
      const button = sourceButton(view);
      if (!button) return;
      if (!button.hidden) button.hidden = true;
      if (button.getAttribute('aria-hidden') !== 'true') button.setAttribute('aria-hidden', 'true');
      if (button.tabIndex !== -1) button.tabIndex = -1;
    });
  };

  const syncAccount = () => {
    const account = accountSnapshot();
    shell?.querySelectorAll('[data-shell-account-name],[data-shell-user-name]').forEach(node => {
      node.textContent = account.name;
    });
    const meta = shell?.querySelector('[data-shell-account-meta]');
    if (meta) meta.textContent = account.meta;
    const avatar = shell?.querySelector('.m-shell-v2-user__avatar');
    if (avatar) avatar.textContent = initials(account.name);
  };

  const bind = () => {
    shell.querySelector('[data-shell-menu]')?.addEventListener('click', event => {
      const open = document.body.dataset.shellDrawerOpen === 'true';
      if (open) closeDrawer();
      else openDrawer(event.currentTarget);
    });

    shell.querySelector('[data-shell-backdrop]')?.addEventListener('click', closeDrawer);
    shell.querySelectorAll('[data-shell-disclosure]').forEach(button => {
      button.addEventListener('click', () => {
        const panel = document.getElementById(button.getAttribute('aria-controls'));
        if (!panel) return;
        const expanded = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', String(!expanded));
        panel.hidden = expanded;
      });
    });

    shell.querySelectorAll('.m-shell-v2-nav__item[data-shell-key]').forEach(node => {
      node.addEventListener('click', event => {
        const key = node.dataset.shellKey;
      if (config.role === 'MANAGER') {
          event.preventDefault();
          activateManagerView(node.dataset.shellView || key);
        } else {
          event.preventDefault();
          navigateOwner(key, node.getAttribute('href'));
        }
      });
    });

    // Profile data can arrive after mount in the nested Manager runtime.
    // Subscribe once per shell, not once per navigation click.
    const accountSources = ['#profileName', '#ownerIdentity', '#userName', '#profileMeta']
      .map(selector => document.querySelector(selector))
      .filter(Boolean);
    if (accountSources.length) {
      const accountObserver = new MutationObserver(syncAccount);
      accountSources.forEach(node => accountObserver.observe(node, {
        childList: true, subtree: true, characterData: true
      }));
    }

    const logout = shell.querySelector('[data-shell-logout]');
    logout?.addEventListener('click', async () => {
      const currentLogout = document.querySelector('#logoutBtn');
      if (currentLogout && currentLogout !== logout) {
        currentLogout.click();
        return;
      }

      logout.disabled = true;
      try {
        const sb = window.MAGASIN_CORE?.supabase?.get?.();
        if (!sb?.auth?.signOut) throw new Error('Supabase logout unavailable.');
        const result = await sb.auth.signOut({ scope: 'local' });
        if (result?.error) throw result.error;
        try { sessionStorage.removeItem('magasin.auth.recovery.session.v1'); } catch (_) {}
        location.replace('/03_PLATFORM/01_AUTH/?switch=1');
      } catch (error) {
        console.error('[MAGASIN_SHELL_LOGOUT]', error);
        logout.disabled = false;
        logout.textContent = 'Thử lại đăng xuất';
      }
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && document.body.dataset.shellDrawerOpen === 'true') {
        closeDrawer();
      }
    });

    if (config.role === 'MANAGER') {
      document.querySelectorAll('.sidebar [data-view]').forEach(button => {
        button.addEventListener('click', () => setTimeout(() => setActive(button.dataset.view), 0));
      });

      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        const observer = new MutationObserver(() => {
          enforceManagerVisibilityContract();
          setActive(currentManagerView());
          syncAccount();
        });
        observer.observe(sidebar, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'hidden', 'aria-hidden'] });
      }

      const title = document.querySelector('#pageTitle');
      if (title) {
        const titleObserver = new MutationObserver(() => setActive(currentManagerView()));
        titleObserver.observe(title, { childList: true, subtree: true, characterData: true });
      }

      window.addEventListener('hashchange', () => setTimeout(() => setActive(currentManagerView()), 0));
    }
  };

  const mountStoreSwitcher = node => {
    const slot = shell?.querySelector('[data-shell-store-slot]');
    if (!slot) return false;
    slot.replaceChildren();
    if (!node) {
      slot.hidden = true;
      return true;
    }
    slot.appendChild(node);
    slot.hidden = false;
    return true;
  };

  const boot = () => {
    if (!document.body || document.getElementById('magasinUiV2Shell')) return;

    config = {
      role: roleOf(),
      mode: modeOf()
    };

    document.body.dataset.magasinUiV2 = '';
    document.body.dataset.magasinShellV2 = '';
    document.body.dataset.magasinShellRole = config.role.toLowerCase();
    document.body.dataset.magasinShellMode = config.mode;
    document.body.dataset.shellDrawerOpen = 'false';

    enforceManagerVisibilityContract();
    shell = buildShell();
    bind();
    setActive(currentKey());
    syncAccount();

    window.MAGASIN_UI_V2_SHELL = Object.freeze({
      version: '2.0',
      role: config.role,
      mode: config.mode,
      managerNav: MANAGER_NAV,
      ownerNav: OWNER_NAV,
      getActive: () => activeKey,
      setActive,
      openDrawer: () => openDrawer(shell?.querySelector('[data-shell-menu]')),
      closeDrawer,
      mountStoreSwitcher
    });
    if (config.role === 'MANAGER') {
      const script = document.createElement('script');
      script.src = '/02_CORE/ui/manager-module-router-v1.js?v=20261022-manager-spa-p02';
      script.onerror = () => console.error('[MAGASIN_MANAGER_MODULE_ROUTER] load failed; canonical links remain available');
      document.body.appendChild(script);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();

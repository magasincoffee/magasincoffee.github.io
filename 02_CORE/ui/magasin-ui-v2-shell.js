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
      ['dashboard', '⌂', 'Hôm nay'],
      ['workforce', '▦', 'Xếp lịch'],
      ['swap', '⇄', 'Đổi / Cho ca'],
      ['attendance', '◷', 'Chấm công'],
      ['staff', '◎', 'Nhân viên'],
      ['payroll-self-check', '₫', 'Công / Lương']
    ]),
    secondary: Object.freeze([
      ['schedule', '▤', 'Lịch đã phát hành'],
      ['tasks', '✓', 'Công việc'],
      ['settings', '⚙', 'Cài đặt']
    ]),
    hidden: Object.freeze(['kpi', 'academy'])
  });

  const OWNER_NAV = Object.freeze({
    primary: Object.freeze([
      ['overview', '⌂', 'Tổng quan', '/04_OWNER/'],
      ['attention', '!', 'Cần chú ý', '/04_OWNER/ControlTower/'],
      ['workforce', '▦', 'Workforce', '/04_OWNER/Workforce/'],
      ['procurement', '□', 'Mua hàng', '/nhap-hang/'],
      ['access', '⌘', 'Phân quyền', '/04_OWNER/Access/']
    ]),
    secondary: Object.freeze([]),
    hidden: Object.freeze([])
  });

  const MANAGER_META = Object.freeze({
    dashboard: ['Hôm nay', 'Điều hành Workforce và ngoại lệ cần xử lý'],
    workforce: ['Xếp lịch', 'Availability → Draft → Validate → Review → Publish'],
    swap: ['Đổi / Cho ca', 'Review và xử lý yêu cầu chuyển ca'],
    attendance: ['Chấm công', 'Review giờ công theo lịch đã phát hành'],
    staff: ['Nhân viên', 'Danh sách và trạng thái nhân sự'],
    'payroll-self-check': ['Công / Lương', 'Đối soát công và lương'],
    schedule: ['Lịch đã phát hành', 'Lịch làm chính thức từ server'],
    tasks: ['Công việc', 'Nguồn Task / SOP hiện có'],
    settings: ['Cài đặt', 'Cấu hình hiện có']
  });

  const OWNER_META = Object.freeze({
    overview: ['Tổng quan', 'MAGASIN Owner'],
    attention: ['Cần chú ý', 'Control Tower · read-only attention'],
    workforce: ['Workforce', 'Giám sát lịch và can thiệp theo cửa hàng'],
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
    if (p.startsWith('/04_owner/controltower')) return 'attention';
    if (p.startsWith('/04_owner/workforce')) return 'workforce';
    if (p.startsWith('/nhap-hang') || p.startsWith('/04_owner/procurement')) return 'procurement';
    if (p.startsWith('/04_owner/access')) return 'access';
    return 'overview';
  };

  const currentManagerView = () => {
    const source = document.querySelector('.sidebar [data-view].active');
    if (source?.dataset.view) return source.dataset.view;
    const hash = String(location.hash || '').replace(/^#/, '');
    if (hash) return hash;
    try {
      const topHash = String(topWindow().location.hash || '').replace(/^#/, '');
      if (topHash) return topHash;
    } catch (_) {}
    return 'dashboard';
  };

  const sourceButton = view =>
    document.querySelector('.sidebar [data-view="' + CSS.escape(view) + '"]');

  const currentKey = () => {
    if (config.role === 'OWNER') {
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
    const name = rawName.replace(/s*·s*OWNERs*$/i, '') || roleFallback;
    const meta = (metaNode?.textContent || roleFallback).trim();
    return { name, meta };
  };

  const initials = name => {
    const parts = String(name || 'M').trim().split(/s+/).filter(Boolean);
    return (parts.length ? parts[parts.length - 1][0] : 'M').toUpperCase();
  };

  const metaFor = key => {
    const source = config.role === 'OWNER' ? OWNER_META : MANAGER_META;
    return source[key] || (config.role === 'OWNER'
      ? ['MAGASIN Owner', 'Oversight & administration']
      : ['MAGASIN Manager', 'Vận hành cửa hàng']);
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
    const button = sourceButton(view);
    if (button && !button.hidden && button.getAttribute('aria-hidden') !== 'true') {
      button.click();
      setActive(view);
      closeDrawer();
      return true;
    }
    if (attempt < 20) {
      setTimeout(() => activateManagerView(view, attempt + 1), 100);
    }
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
          buildNavGroup('Khác', nav.secondary) +
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

    shell.querySelectorAll('.m-shell-v2-nav__item[data-shell-key]').forEach(node => {
      node.addEventListener('click', event => {
        const key = node.dataset.shellKey;
        if (config.role === 'OWNER') {
      const accountSource =
        document.querySelector('#ownerIdentity') ||
        document.querySelector('#userName') ||
        document.querySelector('#profileName');
      if (accountSource) {
        const accountObserver = new MutationObserver(syncAccount);
        accountObserver.observe(accountSource, { childList: true, subtree: true, characterData: true });
      }
    }

    if (config.role === 'MANAGER') {
          event.preventDefault();
          activateManagerView(node.dataset.shellView || key);
        } else {
          event.preventDefault();
          navigateOwner(key, node.getAttribute('href'));
        }
      });
    });

    const logout = shell.querySelector('[data-shell-logout]');
    const sourceLogout = document.querySelector('#logoutBtn');
    if (logout && !sourceLogout) logout.hidden = true;
    logout?.addEventListener('click', () => {
      const currentLogout = document.querySelector('#logoutBtn');
      if (currentLogout) currentLogout.click();
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
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();

/*
 * MAGASIN Scheduling V2 — shared Manager navigation for scheduling + weekly demand.
 * Presentation only: never changes user roles, schedules, or backend data.
 * External Manager routes always leave an embedded iframe via target="_top".
 */
(() => {
  'use strict';
  if (window.MAGASIN_SCHEDULING_V2_MANAGER_NAV) return;
  // Only direct/standalone V2 pages require the compatibility sidebar.
  // The canonical Manager host already mounts /02_CORE/ui/magasin-ui-v2-shell.js.
  if (document.documentElement.dataset.sv2ManagerHost === 'shared') return;

  const sidebar = document.querySelector('.sv2-sidebar');
  const nav = sidebar?.querySelector('.sv2-nav');
  const header = document.querySelector('.sv2-app-header');
  if (!sidebar || !nav || !header) return;

  const demandPage = location.pathname.includes('/SchedulingV2/Demand/');
  const sections = Object.freeze([
    { title: 'Chính', items: [
      ['dashboard', '⌂', 'Tổng quan', '/manager/'],
      ['staff', '◎', 'Nhân viên', '/manager/#staff'],
      ['payroll-self-check', '₫', 'Công / Lương (xem)', '/manager/#payroll-self-check']
    ] },
    { title: 'Lập lịch nhân sự', collapsible: true, items: [
      ['demand', '▤', 'Nhu cầu nhân sự', '/manager/scheduling/?section=demand'],
      ['workforce', '▦', 'Xếp lịch', '/manager/scheduling/'],
      ['schedule', '▤', 'Lịch đã công bố', '/manager/schedule/']
    ] },
    { title: 'Công & Điều chỉnh ca', collapsible: true, items: [
      ['attendance', '◷', 'Chấm công', '/manager/#attendance'],
      ['swap', '⇄', 'Cho / Đổi ca', '/manager/#swap']
    ] }
  ]);
  // Direct fallback pages retain the same IA as the single authenticated shell.
  const current = demandPage ? 'demand' : 'workforce';
  nav.replaceChildren();
  nav.setAttribute('aria-label', 'Các phân hệ quản lý');
  sidebar.id = 'sv2Sidebar';

  for (const section of sections) {
    const group = document.createElement(section.collapsible ? 'details' : 'div');
    group.className = 'sv2-nav-group' + (section.collapsible ? ' sv2-nav-disclosure' : '');
    if (section.collapsible && section.items.some(([key]) => key === current)) group.open = true;
    const heading = document.createElement(section.collapsible ? 'summary' : 'p');
    heading.className = 'sv2-nav-group-title';
    heading.textContent = section.title;
    group.append(heading);
    for (const [key, symbol, title, href] of section.items) {
      const link = document.createElement('a');
      link.href = href;
      link.dataset.sv2NavKey = key;
      link.target = '_top';
      link.className = key === current ? 'is-active' : '';
      if (key === current) link.setAttribute('aria-current', 'page');
      const icon = document.createElement('span');
      icon.className = 'sv2-nav-symbol';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = symbol;
      const label = document.createElement('span');
      label.textContent = title;
      link.append(icon, label);
      group.append(link);
    }
    nav.append(group);
  }

  const menu = document.createElement('button');
  menu.className = 'sv2-menu-toggle';
  menu.type = 'button';
  menu.textContent = '☰';
  menu.setAttribute('aria-label', 'Mở menu quản lý');
  menu.setAttribute('aria-controls', 'sv2Sidebar');
  menu.setAttribute('aria-expanded', 'false');
  header.prepend(menu);

  const backdrop = document.createElement('div');
  backdrop.className = 'sv2-nav-backdrop';
  backdrop.hidden = true;
  backdrop.setAttribute('aria-hidden', 'true');
  document.querySelector('.sv2-app')?.append(backdrop);

  let returnFocus = null;
  const close = (restoreFocus = false) => {
    document.body.classList.remove('sv2-nav-open');
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Mở menu quản lý');
    backdrop.hidden = true;
    if (restoreFocus && returnFocus?.isConnected) returnFocus.focus();
    returnFocus = null;
  };
  const open = () => {
    returnFocus = document.activeElement;
    document.body.classList.add('sv2-nav-open');
    menu.setAttribute('aria-expanded', 'true');
    menu.setAttribute('aria-label', 'Đóng menu quản lý');
    backdrop.hidden = false;
    nav.querySelector('a')?.focus();
  };
  menu.addEventListener('click', () => {
    if (document.body.classList.contains('sv2-nav-open')) close(true);
    else open();
  });
  backdrop.addEventListener('click', () => close(true));
  nav.addEventListener('click', event => {
    if (event.target.closest('a')) close(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('sv2-nav-open')) close(true);
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) close(false);
  });
  document.body.classList.add('sv2-nav-ready');
  window.MAGASIN_SCHEDULING_V2_MANAGER_NAV = Object.freeze({ current, close });
})();

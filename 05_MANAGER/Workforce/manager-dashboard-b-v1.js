/* MAGASIN Manager Dashboard B — read-only operational view.
 * This adapter presents existing, permission-scoped domain snapshots only.
 * It must never synthesize sales, customers, shortages or attendance.
 */
(() => {
  'use strict';
  if (window.MAGASIN_MANAGER_DASHBOARD_B) return;
  let chosenStore = '';
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const tr = (v, fallback = '—') => v == null || v === '' ? fallback : String(v);
  const parts = date => Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit',
    day: '2-digit', weekday: 'long'
  }).formatToParts(date).filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
  const currentDay = () => {
    const p = parts(new Date());
    return { iso: p.year + '-' + p.month + '-' + p.day,
      label: p.day + '/' + p.month + '/' + p.year };
  };
  const weekStart = day => {
    const d = new Date(day + 'T00:00:00Z');
    const delta = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - delta);
    return d.toISOString().slice(0, 10);
  };
  const minute = value => {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(value || ''));
    if (!m) return NaN;
    const hh = Number(m[1]), mm = Number(m[2]);
    return hh <= 23 && mm <= 59 ? hh * 60 + mm : NaN;
  };
  const clock = value => {
    const n = minute(value);
    return Number.isFinite(n) ? String(Math.floor(n / 60)).padStart(2, '0') +
      ':' + String(n % 60).padStart(2, '0') : '—';
  };
  const shiftBand = value => {
    const n = minute(value);
    return n < 720 ? 'morning' : n < 1020 ? 'afternoon' : 'evening';
  };
  const source = () => {
    const api = window.MAGASIN_MANAGER_OFFICIAL_SCHEDULE;
    if (typeof api?.getState !== 'function') return { ready: false, loading: false, error: false, rows: [], stores: [] };
    try {
      const state = api.getState() || {};
      const ctx = window.MAGASIN_MANAGER_WORKFORCE_CONTEXT?.getSnapshot?.() || {};
      const stores = Array.isArray(state.stores) && state.stores.length
        ? state.stores : (ctx.ready && Array.isArray(ctx.stores) ? ctx.stores : []);
      return { ready: true, loading: !!state.loading, error: !!state.lastError,
        week: state.week, rows: Array.isArray(state.rows) ? state.rows : [], stores };
    } catch (_) {
      return { ready: false, loading: false, error: true, rows: [], stores: [] };
    }
  };
  function status(s, day) {
    if (!s.ready) return 'unavailable';
    if (s.loading) return 'loading';
    if (s.error) return 'error';
    if (s.week !== weekStart(day)) return 'wrong-week';
    return 'ready';
  }
  function ensureStyles() {
    if (document.getElementById('manager-dashboard-b-css')) return;
    const link = document.createElement('link');
    link.id = 'manager-dashboard-b-css';
    link.rel = 'stylesheet';
    link.href = '/05_MANAGER/Workforce/manager-dashboard-b-v1.css?v=20261021-dashboard-b1';
    document.head.appendChild(link);
  }
  function kpi({ label, value, caption, icon, tone, state }) {
    return '<article class="mdb-kpi mdb-tone-' + escapeHtml(tone || 'blue') + '" data-kpi-source="' +
      escapeHtml(state || 'NOT_CONNECTED') + '">' +
      '<div class="mdb-kpi-heading"><span class="mdb-kpi-icon" aria-hidden="true">' + icon +
      '</span><span>' + escapeHtml(label) + '</span></div>' +
      '<strong class="mdb-kpi-value">' + escapeHtml(value) + '</strong>' +
      '<p class="mdb-kpi-caption">' + escapeHtml(caption) + '</p></article>';
  }
  const messages = {
    unavailable: 'Nguồn lịch chưa kết nối.',
    loading: 'Đang tải lịch đã công bố…',
    error: 'Chưa tải được lịch chính thức. Hãy thử tải lại.',
    'wrong-week': 'Lịch đang hiển thị tuần khác. Mở Lịch đã phát hành để xem tuần hiện tại.',
    ready: 'Chưa có ca nào được công bố cho hôm nay.'
  };
  function roster(rows, sourceState) {
    if (sourceState !== 'ready' || !rows.length) {
      return '<div class="mdb-empty" role="status">' + escapeHtml(sourceState === 'ready'
        ? messages.ready : messages[sourceState]) + '</div>';
    }
    return '<div class="mdb-roster-list">' + rows.slice(0, 8).map(row => {
      const name = tr(row.employee_name, 'Nhân viên');
      const initials = name.trim().split(/\s+/).slice(-1)[0].slice(0, 1).toUpperCase() || 'N';
      const time = clock(row.start_time) + ' – ' + clock(row.end_time);
      const store = tr(row.store_code || row.store_name, 'Chi nhánh');
      return '<div class="mdb-person"><span class="mdb-avatar" aria-hidden="true">' +
        escapeHtml(initials) + '</span><div class="mdb-person-name"><strong>' + escapeHtml(name) +
        '</strong><small>' + escapeHtml(store) + '</small></div><span class="mdb-time">' +
        escapeHtml(time) + '</span><span class="mdb-shift-tag mdb-' + shiftBand(row.start_time) +
        '">Đã xếp</span></div>';
    }).join('') + (rows.length > 8 ? '<p class="mdb-more">Còn ' + (rows.length - 8) +
      ' ca khác. Xem trong Lịch đã phát hành.</p>' : '') + '</div>';
  }
  function coverage(rows, sourceState) {
    if (sourceState !== 'ready' || !rows.length) {
      return '<div class="mdb-empty" role="status">' + escapeHtml(sourceState === 'ready'
        ? 'Chưa có ca được công bố để hiển thị phân bổ theo giờ.' : messages[sourceState]) + '</div>';
    }
    const min = 5 * 60, max = 22 * 60, span = max - min;
    const visible = rows.filter(row => Number.isFinite(minute(row.start_time)) &&
      Number.isFinite(minute(row.end_time)) && minute(row.end_time) > minute(row.start_time)).slice(0, 6);
    if (!visible.length) return '<div class="mdb-empty">Dữ liệu giờ ca chưa hợp lệ.</div>';
    return '<div class="mdb-timeline" role="img" aria-label="Phân bổ giờ các ca đã công bố, không phản ánh trạng thái chấm công">' +
      visible.map(row => {
        const from = minute(row.start_time), to = minute(row.end_time);
        const left = Math.max(0, Math.min(100, (Math.max(from, min) - min) / span * 100));
        const right = Math.max(0, Math.min(100, (Math.min(to, max) - min) / span * 100));
        const width = Math.max(0, right - left);
        return '<div class="mdb-timeline-row"><span class="mdb-timeline-name" title="' +
          escapeHtml(tr(row.employee_name, 'Nhân viên')) + '">' +
          escapeHtml(tr(row.employee_name, 'Nhân viên')) + '</span>' +
          '<div class="mdb-track"><span class="mdb-track-bar mdb-' + shiftBand(row.start_time) +
          '" style="left:' + left.toFixed(2) + '%;width:' + width.toFixed(2) + '%" title="' +
          escapeHtml(clock(row.start_time) + ' – ' + clock(row.end_time)) + '"></span></div></div>';
      }).join('') +
      '<div class="mdb-axis"><span>05:00</span><span>09:00</span><span>13:00</span><span>17:00</span><span>22:00</span></div></div>';
  }
  function taskRow(x) {
    const statusText = {
      ERROR: 'Không tải được', LOADING: 'Đang tải', NOT_CONNECTED: 'Chưa kết nối',
      ACTION_REQUIRED: 'Cần xử lý', EMPTY: 'Không có yêu cầu', READY: 'Đã có dữ liệu'
    }[x.state] || 'Đang cập nhật';
    return '<div class="mdb-task"><div><strong>' + escapeHtml(x.label) +
      '</strong><span>' + escapeHtml(statusText) + '</span></div>' +
      (x.route ? '<button type="button" data-workforce-jump="' + escapeHtml(x.route) +
      '">Xem <span aria-hidden="true">→</span></button>' : '') + '</div>';
  }
  function render(root, models, { refreshing = false } = {}) {
    if (!root) return false;
    ensureStyles();
    const day = currentDay();
    const published = source(), state = status(published, day.iso);
    const stores = published.stores.filter(x => x && x.id);
    if (chosenStore && !stores.some(x => String(x.id) === chosenStore)) chosenStore = '';
    const selected = chosenStore;
    const rows = state === 'ready' ? published.rows.filter(x =>
      String(x.work_date || '').slice(0, 10) === day.iso &&
      (!selected || String(x.store_id || '') === selected)) : [];
    rows.sort((a, b) => minute(a.start_time) - minute(b.start_time));
    const workers = new Set(rows.map(x => String(x.user_id || '').trim()).filter(Boolean));
    const connected = state === 'ready';
    const stateCaption = connected
      ? 'Nhân viên có ca đã công bố hôm nay' : messages[state];
    const storeOptions = stores.map(x => '<option value="' + escapeHtml(x.id) + '"' +
      (String(x.id) === selected ? ' selected' : '') + '>' +
      escapeHtml(tr(x.code || x.name, 'Chi nhánh')) + '</option>').join('');
    root.dataset.managerDashboardB = '1';
    root.innerHTML =
      '<section class="mdb" aria-label="Tổng quan cửa hàng">' +
        '<header class="mdb-heading"><div><h1>Tổng quan cửa hàng</h1>' +
          '<p>Hoạt động nhân sự và điều phối hôm nay từ nguồn dữ liệu thực tế</p></div>' +
          '<div class="mdb-controls"><label>Chi nhánh<select data-mdb-store' + (!stores.length ? ' disabled' : '') +
          '><option value="">Tất cả chi nhánh được phép</option>' + storeOptions + '</select></label>' +
          '<div class="mdb-date"><span>Hôm nay</span><strong>' + escapeHtml(day.label) + '</strong></div>' +
          '<button type="button" class="mdb-refresh" data-manager-today-refresh' +
          (refreshing ? ' disabled aria-busy="true"' : '') + '>' +
          (refreshing ? 'Đang làm mới…' : '↻ Làm mới') + '</button></div></header>' +
        '<div class="mdb-kpis">' +
          kpi({ label: 'Nhân sự hôm nay', value: connected ? String(workers.size) : '—',
            caption: stateCaption, icon: '♧', tone: 'green', state: connected ? 'ACTUAL' : state }) +
          kpi({ label: 'Khách trong ngày', value: '—',
            caption: 'Chưa kết nối nguồn khách hàng hoặc POS', icon: '♙',
            tone: 'teal', state: 'NOT_CONNECTED' }) +
          kpi({ label: 'Doanh thu hôm nay', value: '—',
            caption: 'Chưa kết nối dữ liệu bán hàng có xác minh', icon: '▤',
            tone: 'blue', state: 'NOT_CONNECTED' }) +
          kpi({ label: 'Ca đang thiếu', value: '—',
            caption: 'Cần nguồn nhu cầu nhân sự để đối chiếu', icon: '!',
            tone: 'red', state: 'NOT_CONNECTED' }) +
        '</div>' +
        '<div class="mdb-panels"><section class="mdb-panel"><header class="mdb-panel-head"><div>' +
          '<h2>Lịch làm hôm nay</h2><p>Ca đã công bố · Không phải dữ liệu chấm công</p></div>' +
          '<button type="button" data-workforce-jump="schedule">Xem toàn bộ →</button></header>' +
          roster(rows, state) + '</section>' +
          '<section class="mdb-panel"><header class="mdb-panel-head"><div>' +
          '<h2>Tình trạng ca hôm nay</h2><p>Phân bổ giờ làm theo lịch đã công bố</p></div></header>' +
          '<div class="mdb-legend"><span><i class="mdb-legend-published"></i>Ca đã xếp</span>' +
          '<span><i class="mdb-legend-unknown"></i>Chưa đánh giá đủ/thiếu</span></div>' +
          coverage(rows, state) +
          '<p class="mdb-coverage-foot">Chưa có đối chiếu nhu cầu nhân sự theo từng khung giờ; không suy diễn ca đủ hay thiếu.</p>' +
          '</section></div>' +
        '<section class="mdb-activity" aria-label="Công việc cần xử lý"><header><h2>Công việc cần xử lý</h2>' +
          '<span>Liên kết tới đúng màn hình nghiệp vụ</span></header>' +
          '<div class="mdb-task-list">' + models.map(taskRow).join('') + '</div></section>' +
      '</section>';
    root.querySelector('[data-mdb-store]')?.addEventListener('change', e => {
      chosenStore = e.target.value || '';
      render(root, models, { refreshing });
    });
    return true;
  }
  window.MAGASIN_MANAGER_DASHBOARD_B = Object.freeze({ render });
})();

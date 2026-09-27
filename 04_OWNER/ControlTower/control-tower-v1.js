import {
  formatCount,
  formatMoney,
  normalizeControlTowerSnapshot
} from "./snapshot-v1.mjs";
import { requireOwnerAccess } from "./access-v1.mjs";
import { loadProcurementPayables } from "./payables-adapter-v1.mjs";
import { loadWorkforceAttention } from "./workforce-adapter-v1.mjs";
import { loadReconciledRevenue } from "./revenue-adapter-v1.mjs";
import { loadSectionSafely } from "./source-isolation-v1.mjs";

const PLACEHOLDERS = Object.freeze({
  inventory: Object.freeze({
    quality: "NOT_CONNECTED",
    source: null,
    asOf: null,
    message: "Nguồn tồn kho chưa được kết nối vào Control Tower."
  }),
  tasks: Object.freeze({
    quality: "NOT_CONNECTED",
    source: null,
    asOf: null,
    message: "Nguồn Task / SOP chưa được kết nối vào Control Tower."
  })
});

const rawState = {
  context: {
    reportingDate: null,
    branchScope: "ALL",
    refreshedAt: null
  },
  revenue: undefined,
  payables: undefined,
  workforce: undefined,
  inventory: PLACEHOLDERS.inventory,
  tasks: PLACEHOLDERS.tasks
};

const SECTION_ROUTE = Object.freeze({
  payables: "/nhap-hang/",
  workforce: "/04_OWNER/Workforce/"
});

let refreshPromise = null;

function qualityLabel(value) {
  return {
    ACTUAL: "ACTUAL",
    ESTIMATE: "ESTIMATE",
    GAP: "GAP",
    NOT_CONNECTED: "NOT CONNECTED"
  }[value] || "GAP";
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function paintQuality(id, quality) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = qualityLabel(quality);
  el.dataset.quality = quality;
}

function sourceLine(section) {
  const parts = [];
  if (section.source) parts.push(section.source);
  if (section.asOf) parts.push(`as of ${section.asOf}`);
  if (section.message) parts.push(section.message);
  return parts.join(" · ") || "Chưa có metadata nguồn.";
}

function attentionItem({ key, title, detail, route = null, routeLabel = "Mở module" }) {
  return { key, title, detail, route, routeLabel };
}

function buildAttention(snapshot) {
  const items = [];
  const sections = [
    ["revenue", "Revenue", snapshot.revenue],
    ["payables", "Payables", snapshot.payables],
    ["workforce", "Workforce", snapshot.workforce],
    ["inventory", "Inventory", snapshot.inventory],
    ["tasks", "Tasks", snapshot.tasks]
  ];

  for (const [key, label, section] of sections) {
    if (section.quality === "GAP") {
      items.push(attentionItem({
        key: `${key}-gap`,
        title: `${label}: nguồn hiện ở GAP`,
        detail: sourceLine(section),
        route: SECTION_ROUTE[key] || null
      }));
    } else if (section.quality === "ESTIMATE") {
      items.push(attentionItem({
        key: `${key}-estimate`,
        title: `${label}: dữ liệu hiện là ESTIMATE`,
        detail: sourceLine(section),
        route: SECTION_ROUTE[key] || null
      }));
    }
  }

  if (["ACTUAL", "ESTIMATE"].includes(snapshot.payables.quality)) {
    const overdueAmount = snapshot.payables.overdueAmount;
    const overdueOrders = snapshot.payables.overdueOrders;
    if ((Number.isFinite(overdueAmount) && overdueAmount > 0) ||
        (Number.isFinite(overdueOrders) && overdueOrders > 0)) {
      items.push(attentionItem({
        key: "payables-overdue",
        title: "Công nợ có khoản hoặc đơn quá hạn",
        detail: `Quá hạn ${formatMoney(overdueAmount)} · ${formatCount(overdueOrders)} đơn quá hạn.`,
        route: SECTION_ROUTE.payables,
        routeLabel: "Mở Mua hàng"
      }));
    }
  }

  if (["ACTUAL", "ESTIMATE"].includes(snapshot.workforce.quality)) {
    const gap = snapshot.workforce.staffingGapCount;
    const unresolved = snapshot.workforce.unresolvedCount;
    if ((Number.isFinite(gap) && gap > 0) ||
        (Number.isFinite(unresolved) && unresolved > 0)) {
      items.push(attentionItem({
        key: "workforce-attention",
        title: "Workforce còn factual exception",
        detail: `Staffing gap ${formatCount(gap)} · ${formatCount(unresolved)} mục chưa xử lý.`,
        route: SECTION_ROUTE.workforce,
        routeLabel: "Mở Workforce"
      }));
    }
  }

  if (["ACTUAL", "ESTIMATE"].includes(snapshot.inventory.quality) &&
      Number.isFinite(snapshot.inventory.warningCount) &&
      snapshot.inventory.warningCount > 0) {
    items.push(attentionItem({
      key: "inventory-warning",
      title: "Tồn kho có cảnh báo",
      detail: `${formatCount(snapshot.inventory.warningCount)} cảnh báo từ canonical inventory snapshot.`
    }));
  }

  if (["ACTUAL", "ESTIMATE"].includes(snapshot.tasks.quality) &&
      Number.isFinite(snapshot.tasks.overdueCount) &&
      snapshot.tasks.overdueCount > 0) {
    items.push(attentionItem({
      key: "tasks-overdue",
      title: "Task / SOP có mục quá hạn",
      detail: `${formatCount(snapshot.tasks.overdueCount)} task quá hạn từ canonical task snapshot.`
    }));
  }

  return items;
}

function renderQuality(snapshot) {
  const qualityList = document.getElementById("qualityList");
  if (!qualityList) return;
  qualityList.innerHTML = "";
  for (const item of snapshot.dataQuality) {
    const row = document.createElement("div");
    row.className = "quality-row";
    row.innerHTML = `
      <span class="quality-name"></span>
      <span class="quality-chip" data-quality="${item.quality}"></span>
      <span class="quality-source"></span>
      <span class="quality-freshness"></span>
    `;
    row.querySelector(".quality-name").textContent = item.name;
    row.querySelector(".quality-chip").textContent = qualityLabel(item.quality);
    row.querySelector(".quality-source").textContent =
      item.source || item.message || "Chưa có nguồn canonical";
    row.querySelector(".quality-freshness").textContent =
      item.asOf ? `Freshness: ${item.asOf}` : "Freshness: chưa có";
    qualityList.appendChild(row);
  }
}

function renderAttention(snapshot, { loading = false } = {}) {
  const list = document.getElementById("attentionList");
  const empty = document.getElementById("noAttention");
  const loadingEl = document.getElementById("attentionLoading");
  const count = document.getElementById("attentionCount");
  if (!list || !empty || !loadingEl || !count) return;

  list.innerHTML = "";
  empty.classList.add("hidden");
  loadingEl.classList.toggle("hidden", !loading);

  if (loading) {
    count.textContent = "ĐANG TẢI";
    return;
  }

  const items = buildAttention(snapshot);
  count.textContent = `${items.length} mục`;

  if (!items.length) {
    empty.classList.remove("hidden");
    return;
  }

  for (const item of items) {
    const row = document.createElement("article");
    row.className = "attention-item";
    row.dataset.attentionKey = item.key;
    const copy = document.createElement("div");
    copy.className = "attention-copy";
    const title = document.createElement("strong");
    const detail = document.createElement("span");
    title.textContent = item.title;
    detail.textContent = item.detail;
    copy.append(title, detail);
    row.appendChild(copy);
    if (item.route) {
      const link = document.createElement("a");
      link.href = item.route;
      link.textContent = `${item.routeLabel} →`;
      row.appendChild(link);
    }
    list.appendChild(row);
  }
}

function render(snapshot, { loading = false } = {}) {
  document.body.dataset.ownerOverviewLoading = loading ? "true" : "false";
  const refreshButton = document.getElementById("refreshControlTower");
  if (refreshButton) {
    refreshButton.disabled = loading;
    refreshButton.setAttribute("aria-busy", loading ? "true" : "false");
    refreshButton.textContent = loading ? "Đang làm mới…" : "Làm mới";
  }
  const overall = document.getElementById("overallState");
  if (overall) {
    overall.dataset.state = loading ? "loading" : "ready";
    overall.textContent = loading ? "Đang tải canonical sources" : "Đã đồng bộ";
  }

  setText("reportingDate", snapshot.context.reportingDate || "Chưa chọn ngày");
  setText("branchScope", snapshot.context.branchScope || "ALL");
  setText("refreshedAt", snapshot.context.refreshedAt || (loading ? "Đang làm mới" : "Chưa đồng bộ"));

  setText("revenueValue", formatMoney(snapshot.revenue.amount));
  setText("revenueMeta", sourceLine(snapshot.revenue));
  paintQuality("revenueQuality", snapshot.revenue.quality);

  setText("payableValue", formatMoney(snapshot.payables.totalDue));
  setText("payableOverdue", formatMoney(snapshot.payables.overdueAmount));
  setText("payableOpenOrders", formatCount(snapshot.payables.openOrders));
  setText("payableOverdueOrders", formatCount(snapshot.payables.overdueOrders));
  setText("payableMeta", sourceLine(snapshot.payables));
  paintQuality("payableQuality", snapshot.payables.quality);

  setText("workforceGap", formatCount(snapshot.workforce.staffingGapCount));
  setText("workforceUnresolved", formatCount(snapshot.workforce.unresolvedCount));
  setText("workforceMeta", sourceLine(snapshot.workforce));
  paintQuality("workforceQuality", snapshot.workforce.quality);

  setText("inventoryWarnings", formatCount(snapshot.inventory.warningCount));
  setText("inventoryMeta", sourceLine(snapshot.inventory));
  paintQuality("inventoryQuality", snapshot.inventory.quality);

  setText("taskOverdue", formatCount(snapshot.tasks.overdueCount));
  setText("taskOpen", formatCount(snapshot.tasks.openCount));
  setText("taskMeta", sourceLine(snapshot.tasks));
  paintQuality("taskQuality", snapshot.tasks.quality);

  renderQuality(snapshot);
  renderAttention(snapshot, { loading });
}

function clearLoadedSectionsForRefresh() {
  rawState.revenue = undefined;
  rawState.payables = undefined;
  rawState.workforce = undefined;
  rawState.inventory = PLACEHOLDERS.inventory;
  rawState.tasks = PLACEHOLDERS.tasks;
  rawState.context.refreshedAt = null;
}

async function refreshAll(core) {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    clearLoadedSectionsForRefresh();
    render(normalizeControlTowerSnapshot(rawState), { loading: true });

    const [revenue, payables, workforce] = await Promise.all([
      loadSectionSafely(
        async () =>
          await loadReconciledRevenue({
            reportingDate: rawState.context.reportingDate
          }),
        {
          source: "reconciled daily revenue read model",
          message: "Nguồn doanh thu đã đối chiếu tạm thời không khả dụng."
        }
      ),
      loadSectionSafely(
        async () => await loadProcurementPayables(core.supabase.get()),
        {
          source: "v_procurement_supplier_payables + v_procurement_order_summary",
          message: "Nguồn công nợ mua hàng tạm thời không khả dụng."
        }
      ),
      loadSectionSafely(
        async () => await loadWorkforceAttention(core),
        {
          source: "get_manager_transfer_requests + list_schedule_generations + get_workforce_staffing_requirements + get_schedule_generation_assignments",
          message: "Nguồn Workforce tạm thời không khả dụng."
        }
      )
    ]);

    rawState.revenue = revenue;
    rawState.payables = payables;
    rawState.workforce = workforce;
    rawState.context.refreshedAt = new Date().toISOString();
    render(normalizeControlTowerSnapshot(rawState), { loading: false });
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function boot() {
  const loading = document.getElementById("loading");
  const denied = document.getElementById("denied");
  const app = document.getElementById("app");
  const deniedText = document.getElementById("deniedText");
  const core = globalThis.MAGASIN_CORE;

  let profile;
  try {
    profile = await requireOwnerAccess(core);
  } catch (error) {
    console.error("[CONTROL_TOWER_AUTH]", error);
    loading.classList.add("hidden");
    app.classList.add("hidden");
    denied.classList.remove("hidden");
    deniedText.textContent = error?.message || "Không thể xác thực quyền Owner.";
    return;
  }

  setText("ownerIdentity", `${profile.full_name || profile.username || "Owner"} · OWNER`);
  rawState.context.reportingDate = core.date?.dateKey?.() || null;
  render(normalizeControlTowerSnapshot(rawState), { loading: true });
  loading.classList.add("hidden");
  denied.classList.add("hidden");
  app.classList.remove("hidden");

  document.getElementById("refreshControlTower")?.addEventListener("click", () => {
    refreshAll(core);
  });

  await refreshAll(core);
}

boot();

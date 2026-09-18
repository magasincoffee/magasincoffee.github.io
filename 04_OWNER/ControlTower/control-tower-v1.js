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

const rawState = {
  context: {
    reportingDate: null,
    branchScope: "ALL",
    refreshedAt: null
  }
};

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

function render(snapshot) {
  setText("reportingDate", snapshot.context.reportingDate || "Chưa chọn ngày");
  setText("branchScope", snapshot.context.branchScope || "ALL");
  setText("refreshedAt", snapshot.context.refreshedAt || "Chưa đồng bộ");

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

  const qualityList = document.getElementById("qualityList");
  qualityList.innerHTML = "";
  for (const item of snapshot.dataQuality) {
    const row = document.createElement("div");
    row.className = "quality-row";
    row.innerHTML = `
      <span class="quality-name"></span>
      <span class="quality-chip" data-quality="${item.quality}"></span>
      <span class="quality-source"></span>
    `;
    row.querySelector(".quality-name").textContent = item.name;
    row.querySelector(".quality-chip").textContent = qualityLabel(item.quality);
    row.querySelector(".quality-source").textContent =
      item.source || item.message || "Chưa có nguồn";
    qualityList.appendChild(row);
  }
}

function updateSection(name, section) {
  rawState[name] = section;
  rawState.context.refreshedAt =
    section?.asOf || rawState.context.refreshedAt || new Date().toISOString();
  render(normalizeControlTowerSnapshot(rawState));
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
  render(normalizeControlTowerSnapshot(rawState));
  loading.classList.add("hidden");
  denied.classList.add("hidden");
  app.classList.remove("hidden");

  await Promise.all([
    (async () => {
      const revenue = await loadSectionSafely(
        async () =>
          await loadReconciledRevenue({
            reportingDate: rawState.context.reportingDate
          }),
        {
          source: "reconciled daily revenue read model",
          message: "Nguồn doanh thu đã đối chiếu tạm thời không khả dụng."
        }
      );
      rawState.revenue = revenue;
      updateSection("revenue", revenue);
    })(),
    (async () => {
      const payables = await loadSectionSafely(
        async () => await loadProcurementPayables(core.supabase.get()),
        {
          source: "v_procurement_supplier_payables + v_procurement_order_summary",
          message: "Nguồn công nợ mua hàng tạm thời không khả dụng."
        }
      );
      rawState.payables = payables;
      updateSection("payables", payables);
    })(),
    (async () => {
      const workforce = await loadSectionSafely(
        async () => await loadWorkforceAttention(core),
        {
          source: "get_manager_transfer_requests + list_schedule_generations",
          message: "Nguồn Workforce tạm thời không khả dụng."
        }
      );
      rawState.workforce = workforce;
      updateSection("workforce", workforce);
    })()
  ]);
}

boot();

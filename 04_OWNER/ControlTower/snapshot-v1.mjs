export const QUALITY_STATES = Object.freeze([
  "ACTUAL",
  "ESTIMATE",
  "GAP",
  "NOT_CONNECTED"
]);

const DEFAULT_MESSAGE = Object.freeze({
  ACTUAL: "",
  ESTIMATE: "Dữ liệu đang là ước tính.",
  GAP: "Nguồn dữ liệu chưa đủ tin cậy.",
  NOT_CONNECTED: "Nguồn dữ liệu chưa được kết nối."
});

function normalizeQuality(value) {
  if (value == null || value === "") return "NOT_CONNECTED";
  return QUALITY_STATES.includes(value) ? value : "GAP";
}

function nullableNumber(value) {
  return Number.isFinite(value) ? value : null;
}

function normalizeMetricSection(raw = {}, fields = []) {
  const quality = normalizeQuality(raw.quality);
  const section = {
    quality,
    source: typeof raw.source === "string" && raw.source.trim() ? raw.source.trim() : null,
    asOf: typeof raw.asOf === "string" && raw.asOf.trim() ? raw.asOf.trim() : null,
    message:
      typeof raw.message === "string" && raw.message.trim()
        ? raw.message.trim()
        : DEFAULT_MESSAGE[quality]
  };

  const metricsTrusted = quality === "ACTUAL" || quality === "ESTIMATE";
  for (const field of fields) {
    section[field] = metricsTrusted ? nullableNumber(raw[field]) : null;
  }

  return section;
}

export function normalizeControlTowerSnapshot(raw = {}) {
  const context = raw.context || {};

  const snapshot = {
    context: {
      reportingDate:
        typeof context.reportingDate === "string" && context.reportingDate.trim()
          ? context.reportingDate.trim()
          : null,
      branchScope:
        typeof context.branchScope === "string" && context.branchScope.trim()
          ? context.branchScope.trim()
          : "ALL",
      refreshedAt:
        typeof context.refreshedAt === "string" && context.refreshedAt.trim()
          ? context.refreshedAt.trim()
          : null
    },
    revenue: normalizeMetricSection(raw.revenue, ["amount"]),
    payables: normalizeMetricSection(raw.payables, [
      "totalDue",
      "overdueAmount",
      "openOrders",
      "overdueOrders"
    ]),
    workforce: normalizeMetricSection(raw.workforce, [
      "staffingGapCount",
      "unresolvedCount"
    ]),
    inventory: normalizeMetricSection(raw.inventory, ["warningCount"]),
    tasks: normalizeMetricSection(raw.tasks, ["overdueCount", "openCount"])
  };

  snapshot.dataQuality = [
    ["Revenue", snapshot.revenue],
    ["Payables", snapshot.payables],
    ["Workforce", snapshot.workforce],
    ["Inventory", snapshot.inventory],
    ["Tasks", snapshot.tasks]
  ].map(([name, section]) => ({
    name,
    quality: section.quality,
    source: section.source,
    asOf: section.asOf,
    message: section.message
  }));

  return snapshot;
}

export function formatMoney(value, locale = "vi-VN", currency = "VND") {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

export function formatCount(value) {
  return Number.isFinite(value) ? new Intl.NumberFormat("vi-VN").format(value) : "—";
}

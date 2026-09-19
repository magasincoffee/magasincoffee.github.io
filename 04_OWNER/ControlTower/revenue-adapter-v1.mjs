import { loadMonthlyRevenueBaseline } from "../../02_CORE/shared/monthly-revenue-baseline-v1.mjs";

const SOURCE_CONTRACT = "reconciled daily revenue read model";
const MONTHLY_SOURCE_CONTRACT = "MONTHLY_REVENUE_BASELINE_V1";
const QUALITY_STATES = Object.freeze(["ACTUAL", "ESTIMATE", "GAP", "NOT_CONNECTED"]);

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function privacySafeText(value) {
  const normalized = text(value);
  if (!normalized) return null;
  if (/https?:\/\//i.test(normalized)) return null;
  if (/\b(?:drive|docs)\.google\.com\b/i.test(normalized)) return null;
  return normalized;
}

function isIsoTimestampWithZone(value) {
  const normalized = text(value);
  if (!normalized) return false;
  if (!/T/.test(normalized) || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(normalized)) return false;
  return Number.isFinite(Date.parse(normalized));
}

function safeList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(privacySafeText).filter(Boolean))].sort();
}

function safeScope(raw = {}) {
  const branch = privacySafeText(raw?.branch);
  const channel = privacySafeText(raw?.channel);
  const aggregateProven = raw?.aggregate_proven === true;
  return {
    branch,
    channel,
    aggregate_proven: aggregateProven
  };
}

function safeCoverage(raw = {}) {
  const status = text(raw?.status).toUpperCase();
  const mode = text(raw?.mode).toUpperCase();
  const safeUnits = (value) =>
    Array.isArray(value) ? value.map(privacySafeText).filter(Boolean) : [];

  return {
    status: ["COMPLETE", "PARTIAL", "MISSING"].includes(status) ? status : null,
    mode: ["DAILY", "PERIODS"].includes(mode) ? mode : null,
    target_start: privacySafeText(raw?.target_start),
    target_end: privacySafeText(raw?.target_end),
    expected_count: Number.isInteger(raw?.expected_count) && raw.expected_count >= 0 ? raw.expected_count : null,
    covered_count: Number.isInteger(raw?.covered_count) && raw.covered_count >= 0 ? raw.covered_count : null,
    expected_units: safeUnits(raw?.expected_units),
    covered_units: safeUnits(raw?.covered_units),
    missing_units: safeUnits(raw?.missing_units),
    reason: privacySafeText(raw?.reason)
  };
}

function monthlyProjectionBase(baseline = {}) {
  const sourceClass = privacySafeText(baseline?.source?.class);
  const sourceLabel = privacySafeText(baseline?.source?.label);
  const source = sourceClass && sourceLabel ? sourceLabel : null;
  const asOf = isIsoTimestampWithZone(baseline?.as_of) ? baseline.as_of : null;
  const qualityRaw = text(baseline?.quality).toUpperCase();
  const quality = QUALITY_STATES.includes(qualityRaw) ? qualityRaw : "GAP";

  return {
    quality,
    amount: null,
    source,
    asOf,
    message:
      privacySafeText(baseline?.message) ||
      (quality === "NOT_CONNECTED"
        ? "Nguồn Revenue baseline chưa được kết nối."
        : "Revenue baseline chưa đủ điều kiện hiển thị ACTUAL."),
    scope: safeScope(baseline?.scope),
    coverage: safeCoverage(baseline?.coverage),
    diagnostics: safeList(baseline?.diagnostics),
    lineage: safeList(baseline?.lineage),
    reconciliationStatus: privacySafeText(baseline?.reconciliation_status),
    canonicalSource: {
      class: sourceClass,
      label: sourceLabel
    },
    projectionReason: null
  };
}

function failMonthlyProjection(section, reason, message) {
  return {
    ...section,
    quality: "GAP",
    amount: null,
    message: privacySafeText(message) || section.message,
    projectionReason: reason
  };
}

export function projectMonthlyRevenueBaseline(baseline) {
  const section = monthlyProjectionBase(
    baseline && typeof baseline === "object" && !Array.isArray(baseline) ? baseline : {}
  );

  if (section.quality === "NOT_CONNECTED") {
    return { ...section, amount: null };
  }

  if (section.quality === "GAP" || section.quality === "ESTIMATE") {
    return { ...section, amount: null };
  }

  if (text(baseline?.group).toUpperCase() !== "REVENUE") {
    return failMonthlyProjection(
      section,
      "NON_REVENUE_BASELINE",
      "Revenue projection rejected a non-Revenue baseline."
    );
  }

  if (section.coverage.status !== "COMPLETE") {
    return failMonthlyProjection(
      section,
      "INCOMPLETE_REVENUE_COVERAGE",
      "Revenue coverage is not complete; amount is hidden."
    );
  }

  if (text(baseline?.reconciliation_status).toUpperCase() !== "RECONCILED") {
    return failMonthlyProjection(
      section,
      "REVENUE_NOT_RECONCILED",
      "Revenue is not fully reconciled; amount is hidden."
    );
  }

  const amount = baseline?.value;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
    return failMonthlyProjection(
      section,
      "INVALID_REVENUE_AMOUNT",
      "Revenue amount is invalid; amount is hidden."
    );
  }

  const scope = section.scope;
  if (!scope.branch || !scope.channel) {
    return failMonthlyProjection(
      section,
      "INVALID_REVENUE_SCOPE",
      "Revenue scope is not explicit; amount is hidden."
    );
  }

  if (
    (scope.branch.toUpperCase() === "ALL" || scope.channel.toUpperCase() === "ALL") &&
    scope.aggregate_proven !== true
  ) {
    return failMonthlyProjection(
      section,
      "UNPROVEN_AGGREGATE_SCOPE",
      "Aggregate Revenue scope is not proven; amount is hidden."
    );
  }

  if (!section.canonicalSource.class || !section.canonicalSource.label || !section.asOf) {
    return failMonthlyProjection(
      section,
      "INVALID_REVENUE_SOURCE_METADATA",
      "Revenue source metadata is incomplete; amount is hidden."
    );
  }

  if (section.lineage.length === 0) {
    return failMonthlyProjection(
      section,
      "MISSING_REVENUE_LINEAGE",
      "Revenue lineage is missing; amount is hidden."
    );
  }

  return {
    ...section,
    quality: "ACTUAL",
    amount: Object.is(amount, -0) ? 0 : amount,
    projectionReason: "COMPLETE_RECONCILED_REVENUE_BASELINE"
  };
}

export async function loadMonthlyRevenueForControlTower({
  targetPeriod,
  scope,
  coverage,
  reader
} = {}) {
  const baseline = await loadMonthlyRevenueBaseline({
    targetPeriod,
    scope,
    coverage,
    reader
  });
  return projectMonthlyRevenueBaseline(baseline);
}

function failClosed({ quality = "GAP", source = SOURCE_CONTRACT, asOf, message }) {
  return {
    quality,
    source: text(source) || SOURCE_CONTRACT,
    asOf,
    message
  };
}

export function assessRevenueCandidate(
  candidate,
  { reportingDate, now = () => new Date() } = {}
) {
  const fallbackAsOf = now().toISOString();
  const source = text(candidate?.source) || SOURCE_CONTRACT;
  const asOf = text(candidate?.asOf) || fallbackAsOf;

  if (!candidate || typeof candidate !== "object") {
    return failClosed({
      source,
      asOf,
      message: "Chưa có bản ghi doanh thu đã đối chiếu cho ngày báo cáo."
    });
  }

  if (!text(reportingDate)) {
    return failClosed({
      source,
      asOf,
      message: "Thiếu ngày báo cáo để kiểm tra doanh thu đã đối chiếu."
    });
  }

  if (text(candidate.reportingDate) !== text(reportingDate)) {
    return failClosed({
      source,
      asOf,
      message: "Bản ghi doanh thu không khớp ngày báo cáo."
    });
  }

  if (candidate.trusted !== true) {
    return failClosed({
      source,
      asOf,
      message: "Nguồn doanh thu chưa được xác nhận là nguồn chính thức."
    });
  }

  if (text(candidate.reconciliationStatus).toUpperCase() !== "RECONCILED") {
    return failClosed({
      source,
      asOf,
      message: "Doanh thu chưa hoàn tất đối chiếu; không hiển thị số chưa chốt."
    });
  }

  const rawAmount = candidate.amount;
  if (
    rawAmount === null ||
    rawAmount === undefined ||
    (typeof rawAmount === "string" && !rawAmount.trim())
  ) {
    return failClosed({
      source,
      asOf,
      message: "Giá trị doanh thu đã đối chiếu không hợp lệ."
    });
  }

  const amount = Number(rawAmount);
  if (!Number.isFinite(amount) || amount < 0) {
    return failClosed({
      source,
      asOf,
      message: "Giá trị doanh thu đã đối chiếu không hợp lệ."
    });
  }

  return {
    quality: "ACTUAL",
    source,
    asOf,
    amount,
    message: "Doanh thu chính thức sau đối chiếu cho ngày báo cáo."
  };
}

export async function loadReconciledRevenue(
  { reportingDate, reader, now = () => new Date() } = {}
) {
  const asOf = now().toISOString();

  if (typeof reader !== "function") {
    return failClosed({
      quality: "NOT_CONNECTED",
      asOf,
      message:
        "Chưa kết nối read model doanh thu đã đối chiếu; không dùng số gross/ước tính thay thế."
    });
  }

  try {
    const candidate = await reader({ reportingDate });
    return assessRevenueCandidate(candidate, { reportingDate, now });
  } catch {
    return failClosed({
      asOf,
      message: "Nguồn doanh thu đã đối chiếu tạm thời không khả dụng."
    });
  }
}

export const REVENUE_ADAPTER_CONTRACTS = Object.freeze({
  daily: SOURCE_CONTRACT,
  monthly: MONTHLY_SOURCE_CONTRACT
});

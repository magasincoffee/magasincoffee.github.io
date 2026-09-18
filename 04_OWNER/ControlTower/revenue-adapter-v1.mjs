const SOURCE_LABEL = "reconciled_daily_revenue_contract";
const RECONCILED_STATUSES = new Set(["RECONCILED", "CLOSED"]);

function finiteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function cleanString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function evaluateRevenueRecord(row, { reportingDate } = {}) {
  const source = cleanString(row?.source) || SOURCE_LABEL;
  const asOf =
    cleanString(row?.reconciledAt) ||
    cleanString(row?.closedAt) ||
    cleanString(row?.asOf);

  if (!row || typeof row !== "object") {
    return {
      quality: "GAP",
      source,
      asOf,
      message:
        "Chưa có bản ghi doanh thu đã đối soát cho ngày báo cáo; không hiển thị số gross/pending."
    };
  }

  const recordDate =
    cleanString(row.reportingDate) ||
    cleanString(row.reporting_date) ||
    cleanString(row.date);
  if (!reportingDate || !recordDate || recordDate !== reportingDate) {
    return {
      quality: "GAP",
      source,
      asOf,
      message:
        "Bản ghi doanh thu không khớp ngày báo cáo; không được dùng làm doanh thu chính thức."
    };
  }

  const status = String(
    row.reconciliationStatus ||
      row.reconciliation_status ||
      row.closeStatus ||
      row.close_status ||
      row.status ||
      ""
  ).toUpperCase();

  if (!RECONCILED_STATUSES.has(status)) {
    return {
      quality: "GAP",
      source,
      asOf,
      message:
        "Doanh thu chưa hoàn tất đối soát/chốt; số nguồn trung gian không được hiển thị là ACTUAL."
    };
  }

  if (!asOf) {
    return {
      quality: "GAP",
      source,
      asOf: null,
      message:
        "Bản ghi thiếu thời điểm đối soát/chốt; chưa đủ bằng chứng để hiển thị ACTUAL."
    };
  }

  const amount = finiteNumber(row.amount);
  if (amount == null) {
    return {
      quality: "GAP",
      source,
      asOf,
      message:
        "Bản ghi đối soát không có số doanh thu hợp lệ; không hiển thị số liệu."
    };
  }

  return {
    quality: "ACTUAL",
    source,
    asOf,
    amount,
    message: "Doanh thu đã đối soát/chốt cho ngày báo cáo."
  };
}

export async function loadRevenueStatus(
  core,
  {
    reportingDate = core?.date?.dateKey?.(),
    now = () => new Date()
  } = {}
) {
  const asOf = now().toISOString();
  const reader = core?.revenue?.getDailyReconciliation;

  if (typeof reader !== "function") {
    return {
      quality: "NOT_CONNECTED",
      source: SOURCE_LABEL,
      asOf,
      message:
        "Chưa có read model doanh thu đã đối soát được kết nối; Control Tower không dùng Sapo/marketplace gross làm số chính thức."
    };
  }

  try {
    const row = await reader.call(core.revenue, { reportingDate });
    const evaluated = evaluateRevenueRecord(row, { reportingDate });
    return {
      ...evaluated,
      asOf: evaluated.asOf || asOf
    };
  } catch {
    return {
      quality: "GAP",
      source: SOURCE_LABEL,
      asOf,
      message:
        "Nguồn doanh thu đã đối soát tạm thời không khả dụng; số doanh thu được ẩn để fail-closed."
    };
  }
}

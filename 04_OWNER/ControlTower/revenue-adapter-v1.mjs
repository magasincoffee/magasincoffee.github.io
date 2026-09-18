const DEFAULT_SOURCE = "REVENUE_PROVIDER_NOT_CONNECTED";

function finiteNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function cleanText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeRevenueReadResult(raw = {}, { reportingDate = null } = {}) {
  const status = String(raw.status || "").toUpperCase();
  const amount = finiteNumber(raw.amount);
  const source = cleanText(raw.source) || DEFAULT_SOURCE;
  const asOf = cleanText(raw.asOf) || cleanText(raw.reconciledAt) || null;
  const rowDate = cleanText(raw.reportingDate) || reportingDate || null;

  if (status === "RECONCILED" && amount !== null) {
    return {
      quality: "ACTUAL",
      source,
      asOf,
      amount,
      reportingDate: rowDate,
      message: cleanText(raw.message) || "Doanh thu đã đối chiếu."
    };
  }

  if (status === "ESTIMATE" && amount !== null) {
    return {
      quality: "ESTIMATE",
      source,
      asOf,
      amount,
      reportingDate: rowDate,
      message:
        cleanText(raw.message) ||
        "Doanh thu đang là ước tính; chưa phải số đối chiếu cuối cùng."
    };
  }

  const pendingStatuses = new Set([
    "PENDING",
    "UNRECONCILED",
    "GROSS",
    "RAW",
    "REVIEW_REQUIRED"
  ]);

  if (pendingStatuses.has(status)) {
    return {
      quality: "GAP",
      source,
      asOf,
      amount: null,
      reportingDate: rowDate,
      message:
        cleanText(raw.message) ||
        "Doanh thu chưa đối chiếu; không hiển thị số như doanh thu chính thức."
    };
  }

  if (status === "NO_DATA") {
    return {
      quality: "GAP",
      source,
      asOf,
      amount: null,
      reportingDate: rowDate,
      message:
        cleanText(raw.message) ||
        "Chưa có dữ liệu doanh thu đã đối chiếu cho ngày này."
    };
  }

  return {
    quality: "GAP",
    source,
    asOf,
    amount: null,
    reportingDate: rowDate,
    message:
      cleanText(raw.message) ||
      "Nguồn doanh thu chưa cung cấp trạng thái đối chiếu hợp lệ."
  };
}

export async function loadRevenueStatus(
  provider,
  {
    reportingDate,
    now = () => new Date()
  } = {}
) {
  const fallbackAsOf = now().toISOString();

  if (typeof provider !== "function") {
    return {
      quality: "NOT_CONNECTED",
      source: DEFAULT_SOURCE,
      asOf: fallbackAsOf,
      amount: null,
      reportingDate: reportingDate || null,
      message:
        "Chưa kết nối read provider doanh thu đã đối chiếu; không hiển thị số doanh thu."
    };
  }

  try {
    const raw = await provider({ reportingDate });
    const normalized = normalizeRevenueReadResult(raw, { reportingDate });
    return {
      ...normalized,
      asOf: normalized.asOf || fallbackAsOf
    };
  } catch {
    return {
      quality: "GAP",
      source: "REVENUE_PROVIDER_ERROR",
      asOf: fallbackAsOf,
      amount: null,
      reportingDate: reportingDate || null,
      message:
        "Nguồn doanh thu tạm thời không khả dụng; không hiển thị số doanh thu."
    };
  }
}

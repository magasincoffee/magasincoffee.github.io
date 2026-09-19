import { normalizeFinancialTruth } from "./financial-truth-v1.mjs";
import { normalizeCashEvent } from "./cash-bridge-v1.mjs";

export const PROCUREMENT_FINANCIAL_TRUTH_SCHEMA_VERSION = "procurement-financial-truth.v1";

export const PROCUREMENT_FINANCIAL_SOURCES = Object.freeze({
  PAYMENTS: "PROCUREMENT_SUPPLIER_PAYMENTS",
  AP: "V_PROCUREMENT_SUPPLIER_PAYABLES"
});

const PAYMENT_SOURCE = Object.freeze({
  class: "RECORDED_PROCUREMENT_PAYMENT",
  label: PROCUREMENT_FINANCIAL_SOURCES.PAYMENTS
});

const AP_SOURCE = Object.freeze({
  class: "PROCUREMENT_CURRENT_AP_VIEW",
  label: PROCUREMENT_FINANCIAL_SOURCES.AP
});

function text(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function safeText(value) {
  const normalized = text(value);
  if (!normalized) return null;
  if (/https?:\/\//i.test(normalized)) return null;
  if (/\b(?:drive|docs)\.google\.com\b/i.test(normalized)) return null;
  return normalized;
}

function safeList(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map(safeText).filter(Boolean))].sort();
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isIsoTimestampWithZone(value) {
  const normalized = text(value);
  if (!normalized || !/T/.test(normalized) || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(normalized)) {
    return false;
  }
  return Number.isFinite(Date.parse(normalized));
}

function normalizePeriod(raw = {}) {
  const start = isIsoDate(raw?.start) ? raw.start : null;
  const end = isIsoDate(raw?.end) ? raw.end : null;
  const timezone = text(raw?.timezone);
  return {
    start,
    end,
    timezone,
    valid: Boolean(start && end && timezone && start <= end)
  };
}

function normalizeScope(raw = {}) {
  const aggregateProven = raw?.aggregate_proven === true || raw?.aggregateProven === true;
  const dimension = (value) => {
    const normalized = text(value);
    if (!normalized) return null;
    if (normalized.toUpperCase() === "ALL") return aggregateProven ? "ALL" : null;
    return normalized;
  };
  const branch = dimension(raw?.branch ?? raw?.branchScope);
  const channel = dimension(raw?.channel ?? raw?.channelScope);
  return {
    branch,
    channel,
    aggregate_proven: aggregateProven,
    valid: Boolean(branch && channel)
  };
}

function sameScope(left = {}, right = {}) {
  return (
    left?.branch === right?.branch &&
    left?.channel === right?.channel &&
    left?.aggregate_proven === right?.aggregate_proven
  );
}

function strictFiniteNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function currentDateInTimezone(now, timezone) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(now);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const result = `${values.year}-${values.month}-${values.day}`;
    return isIsoDate(result) ? result : null;
  } catch {
    return null;
  }
}

function nullTruth({
  metric,
  quality,
  pointDate,
  timezone,
  scope,
  asOf,
  source,
  reason,
  lineage = []
}) {
  return normalizeFinancialTruth({
    period: {
      start: pointDate,
      end: pointDate,
      timezone
    },
    scope,
    group: "AP",
    metric,
    value: null,
    quality,
    source,
    as_of: asOf,
    reconciliation_status: "NOT_APPLICABLE",
    evidence: [],
    lineage,
    reason
  }, { allowNegative: false });
}

function paymentIdentity(row = {}) {
  const raw = safeText(row?.id ?? row?.payment_id ?? row?.paymentId);
  return raw ? `PROCUREMENT_PAYMENT:${raw}` : null;
}

function paymentFingerprint(row = {}) {
  return JSON.stringify({
    id: safeText(row?.id ?? row?.payment_id ?? row?.paymentId),
    payment_date: text(row?.payment_date ?? row?.paymentDate),
    amount: strictFiniteNumber(row?.amount),
    method: text(row?.method)?.toUpperCase() || null,
    status: text(row?.status)?.toUpperCase() || null
  });
}

export function mapProcurementSupplierPayment(
  row,
  { targetPeriod, scope, asOf } = {}
) {
  const period = normalizePeriod(targetPeriod);
  const normalizedScope = normalizeScope(scope);
  const paymentDate = text(row?.payment_date ?? row?.paymentDate);
  const status = text(row?.status)?.toUpperCase() || null;
  const method = text(row?.method)?.toUpperCase() || null;
  const amount = strictFiniteNumber(row?.amount);

  if (!period.valid) return { event: null, reason: "INVALID_TARGET_PERIOD" };
  if (!normalizedScope.valid) return { event: null, reason: "INVALID_SCOPE" };
  if (!isIsoTimestampWithZone(asOf)) return { event: null, reason: "INVALID_SOURCE_AS_OF" };
  if (status === "VOID") return { event: null, reason: "VOID_PAYMENT_EXCLUDED" };
  if (status !== "ACTIVE") return { event: null, reason: "PAYMENT_NOT_ACTIVE" };
  if (!isIsoDate(paymentDate)) return { event: null, reason: "INVALID_PAYMENT_DATE" };
  if (paymentDate < period.start || paymentDate > period.end) {
    return { event: null, reason: "PAYMENT_OUTSIDE_TARGET_PERIOD" };
  }
  if (!["CASH", "BANK", "MOMO", "OTHER"].includes(method)) {
    return { event: null, reason: "INVALID_PAYMENT_METHOD" };
  }
  if (amount === null || amount <= 0) {
    return { event: null, reason: "INVALID_PAYMENT_AMOUNT" };
  }

  const event = normalizeCashEvent({
    event_id: paymentIdentity(row),
    direction: "OUTFLOW",
    category: "SUPPLIER_PAYMENT",
    event_date: paymentDate,
    timezone: period.timezone,
    scope: {
      branch: normalizedScope.branch,
      channel: normalizedScope.channel,
      aggregate_proven: normalizedScope.aggregate_proven
    },
    amount,
    quality: "ACTUAL",
    source: PAYMENT_SOURCE,
    as_of: asOf,
    reconciliation_status: "NOT_APPLICABLE",
    evidence: ["RECORDED_PROCUREMENT_PAYMENT"],
    lineage: ["PROCUREMENT_SUPPLIER_PAYMENTS"],
    cash_movement_proven: true,
    proof_basis: "SUPPLIER_PAYMENT",
    status: "ACTIVE",
    payment_method: method
  });

  if (event.amount_truth.quality !== "ACTUAL" || event.amount_truth.value === null) {
    return {
      event: null,
      reason: event.diagnostics[0] || event.amount_truth.reason || "PAYMENT_FAILED_CASH_NORMALIZATION"
    };
  }

  return { event, reason: null };
}

export function mapProcurementSupplierPayments(
  rows = [],
  { targetPeriod, scope, asOf, readComplete = true } = {}
) {
  const diagnostics = [];
  const events = [];
  const seen = new Map();
  let invalidActiveRow = false;

  for (const row of Array.isArray(rows) ? rows : []) {
    const id = paymentIdentity(row);
    if (id) {
      const fingerprint = paymentFingerprint(row);
      if (seen.has(id)) {
        if (seen.get(id) === fingerprint) {
          diagnostics.push("DUPLICATE_PAYMENT_ID_DEDUPED");
          continue;
        }
        diagnostics.push("DUPLICATE_PAYMENT_ID_CONFLICT");
        invalidActiveRow = true;
        continue;
      }
      seen.set(id, fingerprint);
    }

    const mapped = mapProcurementSupplierPayment(row, { targetPeriod, scope, asOf });
    if (mapped.event) {
      events.push(mapped.event);
      continue;
    }

    diagnostics.push(mapped.reason);
    if (!["VOID_PAYMENT_EXCLUDED", "PAYMENT_OUTSIDE_TARGET_PERIOD"].includes(mapped.reason)) {
      invalidActiveRow = true;
    }
  }

  events.sort((a, b) => {
    const ka = [a.event_date || "", a.event_id || "", a.category || ""].join("|");
    const kb = [b.event_date || "", b.event_id || "", b.category || ""].join("|");
    return ka.localeCompare(kb);
  });

  const quality = readComplete && !invalidActiveRow ? "ACTUAL" : "GAP";
  const coverageStatus = readComplete && !invalidActiveRow ? "COMPLETE" : "PARTIAL";

  return {
    schema_version: PROCUREMENT_FINANCIAL_TRUTH_SCHEMA_VERSION,
    source: PROCUREMENT_FINANCIAL_SOURCES.PAYMENTS,
    quality,
    events,
    coverage: {
      source: PROCUREMENT_FINANCIAL_SOURCES.PAYMENTS,
      status: coverageStatus,
      whole_cash_bridge_complete: false
    },
    diagnostics: [...new Set(diagnostics.filter(Boolean))].sort()
  };
}

function normalizeApPointTruth({
  metric,
  value,
  pointDate,
  timezone,
  scope,
  asOf,
  lineage
}) {
  return normalizeFinancialTruth({
    period: {
      start: pointDate,
      end: pointDate,
      timezone
    },
    scope,
    group: "AP",
    metric,
    value,
    quality: "ACTUAL",
    source: AP_SOURCE,
    as_of: asOf,
    reconciliation_status: "NOT_APPLICABLE",
    evidence: ["CURRENT_PROCUREMENT_AP_VIEW"],
    lineage
  }, { allowNegative: false });
}

export function mapProcurementApRows(
  rows = [],
  {
    pointDate,
    currentSourceDate,
    timezone,
    scope,
    asOf,
    readComplete = true
  } = {}
) {
  const normalizedScope = normalizeScope(scope);
  const diagnostics = [];

  if (!isIsoDate(pointDate) || !isIsoDate(currentSourceDate) || !text(timezone)) {
    diagnostics.push("INVALID_AP_POINT_CONTEXT");
  }
  if (!normalizedScope.valid) diagnostics.push("INVALID_SCOPE");
  if (!isIsoTimestampWithZone(asOf)) diagnostics.push("INVALID_SOURCE_AS_OF");

  if (
    isIsoDate(pointDate) &&
    isIsoDate(currentSourceDate) &&
    pointDate !== currentSourceDate
  ) {
    const reason = "HISTORICAL_AP_SNAPSHOT_NOT_AVAILABLE";
    return {
      schema_version: PROCUREMENT_FINANCIAL_TRUTH_SCHEMA_VERSION,
      source: PROCUREMENT_FINANCIAL_SOURCES.AP,
      quality: "GAP",
      outstanding: nullTruth({
        metric: "procurement_supplier_ap_outstanding",
        quality: "GAP",
        pointDate,
        timezone,
        scope,
        asOf,
        source: AP_SOURCE,
        reason,
        lineage: ["V_PROCUREMENT_SUPPLIER_PAYABLES_CURRENT_STATE"]
      }),
      overdue: nullTruth({
        metric: "procurement_supplier_ap_overdue",
        quality: "GAP",
        pointDate,
        timezone,
        scope,
        asOf,
        source: AP_SOURCE,
        reason,
        lineage: ["V_PROCUREMENT_SUPPLIER_PAYABLES_CURRENT_STATE"]
      }),
      coverage: {
        source: PROCUREMENT_FINANCIAL_SOURCES.AP,
        status: "MISSING",
        point_in_time: true,
        current_source_date: currentSourceDate
      },
      diagnostics: [reason]
    };
  }

  if (diagnostics.length > 0 || !readComplete) {
    const reason = diagnostics[0] || "AP_SOURCE_READ_INCOMPLETE";
    return {
      schema_version: PROCUREMENT_FINANCIAL_TRUTH_SCHEMA_VERSION,
      source: PROCUREMENT_FINANCIAL_SOURCES.AP,
      quality: "GAP",
      outstanding: nullTruth({
        metric: "procurement_supplier_ap_outstanding",
        quality: "GAP",
        pointDate,
        timezone,
        scope,
        asOf,
        source: AP_SOURCE,
        reason,
        lineage: ["V_PROCUREMENT_SUPPLIER_PAYABLES_CURRENT_STATE"]
      }),
      overdue: nullTruth({
        metric: "procurement_supplier_ap_overdue",
        quality: "GAP",
        pointDate,
        timezone,
        scope,
        asOf,
        source: AP_SOURCE,
        reason,
        lineage: ["V_PROCUREMENT_SUPPLIER_PAYABLES_CURRENT_STATE"]
      }),
      coverage: {
        source: PROCUREMENT_FINANCIAL_SOURCES.AP,
        status: "PARTIAL",
        point_in_time: true,
        current_source_date: currentSourceDate || null
      },
      diagnostics: [...new Set(diagnostics.concat(readComplete ? [] : ["AP_SOURCE_READ_INCOMPLETE"]))].sort()
    };
  }

  let outstandingTotal = 0;
  let overdueTotal = 0;
  let malformed = false;

  for (const row of Array.isArray(rows) ? rows : []) {
    const outstanding = strictFiniteNumber(row?.balance_due);
    const overdue = strictFiniteNumber(row?.overdue_balance);

    if (
      outstanding === null ||
      overdue === null ||
      outstanding < 0 ||
      overdue < 0
    ) {
      malformed = true;
      diagnostics.push("INVALID_AP_NUMERIC_ROW");
      continue;
    }
    if (overdue > outstanding) {
      malformed = true;
      diagnostics.push("AP_OVERDUE_EXCEEDS_OUTSTANDING");
      continue;
    }

    outstandingTotal += outstanding;
    overdueTotal += overdue;
  }

  if (malformed || overdueTotal > outstandingTotal) {
    const reason = diagnostics.includes("AP_OVERDUE_EXCEEDS_OUTSTANDING")
      ? "AP_OVERDUE_EXCEEDS_OUTSTANDING"
      : "INVALID_AP_NUMERIC_ROW";
    return {
      schema_version: PROCUREMENT_FINANCIAL_TRUTH_SCHEMA_VERSION,
      source: PROCUREMENT_FINANCIAL_SOURCES.AP,
      quality: "GAP",
      outstanding: nullTruth({
        metric: "procurement_supplier_ap_outstanding",
        quality: "GAP",
        pointDate,
        timezone,
        scope,
        asOf,
        source: AP_SOURCE,
        reason,
        lineage: ["V_PROCUREMENT_SUPPLIER_PAYABLES_CURRENT_STATE"]
      }),
      overdue: nullTruth({
        metric: "procurement_supplier_ap_overdue",
        quality: "GAP",
        pointDate,
        timezone,
        scope,
        asOf,
        source: AP_SOURCE,
        reason,
        lineage: ["V_PROCUREMENT_SUPPLIER_PAYABLES_CURRENT_STATE"]
      }),
      coverage: {
        source: PROCUREMENT_FINANCIAL_SOURCES.AP,
        status: "PARTIAL",
        point_in_time: true,
        current_source_date: currentSourceDate
      },
      diagnostics: [...new Set(diagnostics)].sort()
    };
  }

  const lineage = ["V_PROCUREMENT_SUPPLIER_PAYABLES_CURRENT_STATE"];
  const outstanding = normalizeApPointTruth({
    metric: "procurement_supplier_ap_outstanding",
    value: outstandingTotal,
    pointDate,
    timezone,
    scope: {
      branch: normalizedScope.branch,
      channel: normalizedScope.channel,
      aggregate_proven: normalizedScope.aggregate_proven
    },
    asOf,
    lineage
  });
  const overdue = normalizeApPointTruth({
    metric: "procurement_supplier_ap_overdue",
    value: overdueTotal,
    pointDate,
    timezone,
    scope: {
      branch: normalizedScope.branch,
      channel: normalizedScope.channel,
      aggregate_proven: normalizedScope.aggregate_proven
    },
    asOf,
    lineage
  });

  return {
    schema_version: PROCUREMENT_FINANCIAL_TRUTH_SCHEMA_VERSION,
    source: PROCUREMENT_FINANCIAL_SOURCES.AP,
    quality:
      outstanding.quality === "ACTUAL" && overdue.quality === "ACTUAL"
        ? "ACTUAL"
        : "GAP",
    outstanding,
    overdue,
    coverage: {
      source: PROCUREMENT_FINANCIAL_SOURCES.AP,
      status: "COMPLETE",
      point_in_time: true,
      current_source_date: currentSourceDate
    },
    diagnostics: []
  };
}

function disconnectedPaymentSection() {
  return {
    schema_version: PROCUREMENT_FINANCIAL_TRUTH_SCHEMA_VERSION,
    source: PROCUREMENT_FINANCIAL_SOURCES.PAYMENTS,
    quality: "NOT_CONNECTED",
    events: [],
    coverage: {
      source: PROCUREMENT_FINANCIAL_SOURCES.PAYMENTS,
      status: "NOT_CONNECTED",
      whole_cash_bridge_complete: false
    },
    diagnostics: ["PAYMENT_SOURCE_NOT_CONNECTED"]
  };
}

function failedPaymentSection() {
  return {
    schema_version: PROCUREMENT_FINANCIAL_TRUTH_SCHEMA_VERSION,
    source: PROCUREMENT_FINANCIAL_SOURCES.PAYMENTS,
    quality: "GAP",
    events: [],
    coverage: {
      source: PROCUREMENT_FINANCIAL_SOURCES.PAYMENTS,
      status: "MISSING",
      whole_cash_bridge_complete: false
    },
    diagnostics: ["PAYMENT_SOURCE_READ_FAILED"]
  };
}

function disconnectedApSection({ pointDate, currentSourceDate, timezone, scope, asOf }) {
  const reason = "AP_SOURCE_NOT_CONNECTED";
  return {
    schema_version: PROCUREMENT_FINANCIAL_TRUTH_SCHEMA_VERSION,
    source: PROCUREMENT_FINANCIAL_SOURCES.AP,
    quality: "NOT_CONNECTED",
    outstanding: nullTruth({
      metric: "procurement_supplier_ap_outstanding",
      quality: "NOT_CONNECTED",
      pointDate,
      timezone,
      scope,
      asOf,
      source: AP_SOURCE,
      reason,
      lineage: ["V_PROCUREMENT_SUPPLIER_PAYABLES_CURRENT_STATE"]
    }),
    overdue: nullTruth({
      metric: "procurement_supplier_ap_overdue",
      quality: "NOT_CONNECTED",
      pointDate,
      timezone,
      scope,
      asOf,
      source: AP_SOURCE,
      reason,
      lineage: ["V_PROCUREMENT_SUPPLIER_PAYABLES_CURRENT_STATE"]
    }),
    coverage: {
      source: PROCUREMENT_FINANCIAL_SOURCES.AP,
      status: "NOT_CONNECTED",
      point_in_time: true,
      current_source_date: currentSourceDate || null
    },
    diagnostics: [reason]
  };
}

function failedApSection({ pointDate, currentSourceDate, timezone, scope, asOf }) {
  const reason = "AP_SOURCE_READ_FAILED";
  return {
    schema_version: PROCUREMENT_FINANCIAL_TRUTH_SCHEMA_VERSION,
    source: PROCUREMENT_FINANCIAL_SOURCES.AP,
    quality: "GAP",
    outstanding: nullTruth({
      metric: "procurement_supplier_ap_outstanding",
      quality: "GAP",
      pointDate,
      timezone,
      scope,
      asOf,
      source: AP_SOURCE,
      reason,
      lineage: ["V_PROCUREMENT_SUPPLIER_PAYABLES_CURRENT_STATE"]
    }),
    overdue: nullTruth({
      metric: "procurement_supplier_ap_overdue",
      quality: "GAP",
      pointDate,
      timezone,
      scope,
      asOf,
      source: AP_SOURCE,
      reason,
      lineage: ["V_PROCUREMENT_SUPPLIER_PAYABLES_CURRENT_STATE"]
    }),
    coverage: {
      source: PROCUREMENT_FINANCIAL_SOURCES.AP,
      status: "MISSING",
      point_in_time: true,
      current_source_date: currentSourceDate || null
    },
    diagnostics: [reason]
  };
}

export async function loadProcurementFinancialTruth({
  paymentReader,
  apReader,
  targetPeriod,
  scope,
  apPointDate,
  now = () => new Date()
} = {}) {
  const period = normalizePeriod(targetPeriod);
  const nowValue = now();
  const asOf = nowValue.toISOString();
  const currentSourceDate = period.timezone
    ? currentDateInTimezone(nowValue, period.timezone)
    : null;
  const pointDate = apPointDate ?? currentSourceDate;

  const paymentPromise =
    typeof paymentReader === "function"
      ? Promise.resolve()
          .then(() =>
            paymentReader({
              start: period.start,
              end: period.end,
              status: "ACTIVE"
            })
          )
          .then((result) => {
            const rows = Array.isArray(result) ? result : result?.rows;
            if (!Array.isArray(rows)) throw new Error("PAYMENT_READER_INVALID_RESULT");
            return mapProcurementSupplierPayments(rows, {
              targetPeriod,
              scope,
              asOf,
              readComplete: true
            });
          })
          .catch(() => failedPaymentSection())
      : Promise.resolve(disconnectedPaymentSection());

  const apPromise =
    typeof apReader === "function"
      ? Promise.resolve()
          .then(() => apReader())
          .then((result) => {
            const rows = Array.isArray(result) ? result : result?.rows;
            if (!Array.isArray(rows)) throw new Error("AP_READER_INVALID_RESULT");
            return mapProcurementApRows(rows, {
              pointDate,
              currentSourceDate,
              timezone: period.timezone,
              scope,
              asOf,
              readComplete: true
            });
          })
          .catch(() =>
            failedApSection({
              pointDate,
              currentSourceDate,
              timezone: period.timezone,
              scope,
              asOf
            })
          )
      : Promise.resolve(
          disconnectedApSection({
            pointDate,
            currentSourceDate,
            timezone: period.timezone,
            scope,
            asOf
          })
        );

  const [payments, ap] = await Promise.all([paymentPromise, apPromise]);

  return {
    schema_version: PROCUREMENT_FINANCIAL_TRUTH_SCHEMA_VERSION,
    target_period: {
      start: period.start,
      end: period.end,
      timezone: period.timezone
    },
    scope: normalizeScope(scope),
    payments,
    ap,
    coverage: {
      payments: payments.coverage,
      ap: ap.coverage,
      whole_cash_bridge_complete: false
    },
    diagnostics: safeList([
      ...(payments.diagnostics || []),
      ...(ap.diagnostics || [])
    ])
  };
}

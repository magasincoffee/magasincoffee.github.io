import { normalizeFinancialTruth } from "./financial-truth-v1.mjs";

export const CASH_BRIDGE_SCHEMA_VERSION = "cash-bridge.v1";

export const CASH_EVENT_DIRECTIONS = Object.freeze([
  "INFLOW",
  "OUTFLOW",
  "TRANSFER"
]);

export const CASH_EVENT_CATEGORIES = Object.freeze({
  INFLOW: Object.freeze([
    "SALES_COLLECTION",
    "OTHER_OPERATING_INFLOW",
    "OWNER_CONTRIBUTION",
    "FINANCING_INFLOW",
    "OTHER_EVIDENCED_INFLOW"
  ]),
  OUTFLOW: Object.freeze([
    "SUPPLIER_PAYMENT",
    "PAYROLL",
    "RENT_UTILITIES",
    "PLATFORM_DELIVERY",
    "MARKETING",
    "OTHER_OPEX",
    "DEBT_REPAYMENT",
    "CAPEX_INVESTMENT",
    "OWNER_WITHDRAWAL",
    "OTHER_EVIDENCED_OUTFLOW"
  ]),
  TRANSFER: Object.freeze(["INTERNAL_TRANSFER"])
});

export const CASH_PAYMENT_METHODS = Object.freeze([
  "CASH",
  "BANK",
  "MOMO",
  "OTHER"
]);

const FORBIDDEN_PROOF_BASIS = Object.freeze([
  "PURCHASE",
  "AP_BALANCE",
  "REVENUE_RECOGNITION",
  "EXPENSE_RECOGNITION",
  "FOODAPP_GROSS",
  "DEBT_SCHEDULE_ESTIMATE",
  "OWNER_FREE_TEXT_NOTE"
]);

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

function normalizeEnum(value, allowed) {
  const normalized = text(value)?.toUpperCase() || null;
  return allowed.includes(normalized) ? normalized : null;
}

function safeLocation(raw = {}) {
  return {
    class: safeText(raw?.class ?? raw?.account_class ?? raw?.accountClass),
    label: safeText(raw?.label ?? raw?.location_label ?? raw?.locationLabel)
  };
}

function eventPeriod(raw = {}) {
  const eventDate = text(raw.event_date ?? raw.eventDate);
  const period = raw.period && typeof raw.period === "object"
    ? raw.period
    : {
        start: eventDate,
        end: eventDate,
        timezone: raw.timezone
      };
  return {
    start: period?.start ?? null,
    end: period?.end ?? null,
    timezone: period?.timezone ?? raw.timezone ?? null
  };
}

function normalizedScope(raw = {}) {
  return raw.scope && typeof raw.scope === "object"
    ? raw.scope
    : {
        branch: raw.branch ?? raw.branchScope,
        channel: raw.channel ?? raw.channelScope,
        aggregate_proven: raw.aggregate_proven === true || raw.aggregateProven === true
      };
}

function diagnosticResult({
  raw,
  direction,
  category,
  paymentMethod,
  location,
  reason,
  quality = "GAP"
}) {
  const truth = normalizeFinancialTruth({
    period: eventPeriod(raw),
    scope: normalizedScope(raw),
    group: "CASH",
    metric: "cash_movement_amount",
    value: null,
    quality,
    source: raw?.source,
    as_of: raw?.as_of ?? raw?.asOf,
    reconciliation_status: raw?.reconciliation_status ?? raw?.reconciliationStatus,
    evidence: raw?.evidence,
    lineage: raw?.lineage,
    message: raw?.message,
    reason
  }, { allowNegative: false });

  return {
    schema_version: CASH_BRIDGE_SCHEMA_VERSION,
    event_id: safeText(raw?.event_id ?? raw?.eventId ?? raw?.identity),
    direction,
    category,
    event_date: text(raw?.event_date ?? raw?.eventDate),
    scope: truth.scope,
    payment_method: paymentMethod,
    cash_location: location,
    status: normalizeEnum(raw?.status, ["ACTIVE", "VOID"]),
    cash_movement_proven: raw?.cash_movement_proven === true,
    proof_basis: safeText(raw?.proof_basis ?? raw?.proofBasis),
    amount_truth: { ...truth, value: null, quality },
    consolidated_role: direction === "TRANSFER" ? "NEUTRAL_TRANSFER" : direction,
    diagnostics: [reason]
  };
}

export function normalizeCashEvent(raw = {}) {
  const direction = normalizeEnum(raw.direction, CASH_EVENT_DIRECTIONS);
  const category = text(raw.category)?.toUpperCase() || null;
  const paymentMethod = raw.payment_method == null && raw.paymentMethod == null
    ? null
    : normalizeEnum(raw.payment_method ?? raw.paymentMethod, CASH_PAYMENT_METHODS);
  const location = safeLocation(raw.cash_location ?? raw.cashLocation ?? {});
  const status = normalizeEnum(raw.status, ["ACTIVE", "VOID"]);
  const proofBasis = safeText(raw.proof_basis ?? raw.proofBasis);
  const movementProven = raw.cash_movement_proven === true;
  const quality = text(raw.quality)?.toUpperCase() || null;

  if (!direction) {
    return diagnosticResult({
      raw,
      direction: null,
      category,
      paymentMethod,
      location,
      reason: "INVALID_CASH_DIRECTION"
    });
  }

  if (!CASH_EVENT_CATEGORIES[direction].includes(category)) {
    return diagnosticResult({
      raw,
      direction,
      category: null,
      paymentMethod,
      location,
      reason: "INVALID_CASH_CATEGORY"
    });
  }

  if ((raw.payment_method != null || raw.paymentMethod != null) && !paymentMethod) {
    return diagnosticResult({
      raw,
      direction,
      category,
      paymentMethod: null,
      location,
      reason: "INVALID_PAYMENT_METHOD"
    });
  }

  if (status === "VOID") {
    return diagnosticResult({
      raw,
      direction,
      category,
      paymentMethod,
      location,
      reason: "VOID_CASH_EVENT_EXCLUDED"
    });
  }

  if (proofBasis && FORBIDDEN_PROOF_BASIS.includes(proofBasis.toUpperCase())) {
    return diagnosticResult({
      raw,
      direction,
      category,
      paymentMethod,
      location,
      reason: "NON_CASH_RECOGNITION_IS_NOT_MOVEMENT"
    });
  }

  if (
    (category === "OWNER_CONTRIBUTION" || category === "OWNER_WITHDRAWAL") &&
    proofBasis?.toUpperCase() !== "OWNER_MOVEMENT"
  ) {
    return diagnosticResult({
      raw,
      direction,
      category,
      paymentMethod,
      location,
      reason: "OWNER_MOVEMENT_NOT_STRUCTURED"
    });
  }

  if (
    category === "SUPPLIER_PAYMENT" &&
    (proofBasis?.toUpperCase() !== "SUPPLIER_PAYMENT" || status !== "ACTIVE")
  ) {
    return diagnosticResult({
      raw,
      direction,
      category,
      paymentMethod,
      location,
      reason: "SUPPLIER_PAYMENT_NOT_ACTIVE_EVIDENCED"
    });
  }

  if (!movementProven && quality === "ACTUAL") {
    return diagnosticResult({
      raw,
      direction,
      category,
      paymentMethod,
      location,
      reason: "CASH_MOVEMENT_NOT_PROVEN"
    });
  }

  const truth = normalizeFinancialTruth({
    period: eventPeriod(raw),
    scope: normalizedScope(raw),
    group: "CASH",
    metric: "cash_movement_amount",
    value: raw.amount ?? raw.value,
    quality: raw.quality,
    source: raw.source,
    as_of: raw.as_of ?? raw.asOf,
    reconciliation_status: raw.reconciliation_status ?? raw.reconciliationStatus,
    evidence: raw.evidence,
    lineage: raw.lineage,
    message: raw.message,
    reason: raw.reason
  }, {
    allowNegative: false
  });

  if (
    truth.quality === "ACTUAL" &&
    (typeof truth.value !== "number" || !Number.isFinite(truth.value) || truth.value <= 0)
  ) {
    return diagnosticResult({
      raw,
      direction,
      category,
      paymentMethod,
      location,
      reason: truth.value === 0 ? "ZERO_CASH_MOVEMENT_NOT_EVENT" : "INVALID_CASH_MOVEMENT_AMOUNT"
    });
  }

  const diagnostics = [];
  if (truth.quality === "GAP" && truth.reason) diagnostics.push(truth.reason);
  if (truth.quality === "NOT_CONNECTED") diagnostics.push("CASH_SOURCE_NOT_CONNECTED");

  return {
    schema_version: CASH_BRIDGE_SCHEMA_VERSION,
    event_id: safeText(raw.event_id ?? raw.eventId ?? raw.identity),
    direction,
    category,
    event_date: text(raw.event_date ?? raw.eventDate),
    scope: truth.scope,
    payment_method: paymentMethod,
    cash_location: location,
    status,
    cash_movement_proven: movementProven,
    proof_basis: proofBasis,
    amount_truth: truth,
    consolidated_role: direction === "TRANSFER" ? "NEUTRAL_TRANSFER" : direction,
    diagnostics: [...new Set(diagnostics)].sort()
  };
}

export function isConsolidatedNeutralTransfer(event) {
  return Boolean(
    event &&
    event.direction === "TRANSFER" &&
    event.category === "INTERNAL_TRANSFER" &&
    event.consolidated_role === "NEUTRAL_TRANSFER"
  );
}

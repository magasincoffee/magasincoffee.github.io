import {
  CASH_BALANCE_METRICS,
  normalizeCashBalanceTruth
} from "./cash-balance-truth-v1.mjs";

export const CASH_BALANCE_SOURCE_MAPPER_VERSION = "cash-balance-source-mapper.v1";

export const CASH_BALANCE_SOURCE_CLASSES = Object.freeze([
  "INTERNAL_MONTHLY_CASH_WORKBOOK",
  "PHYSICAL_STORE_TILL_COUNT",
  "BANK_ACCOUNT_BALANCE_STATEMENT",
  "MOMO_WALLET_BALANCE",
  "COD_DELIVERY_HELD_CASH",
  "OWNER_HELD_COMPANY_CASH",
  "PROVIDER_ACCOUNT_BALANCE",
  "INTERNAL_CASH_MOVEMENT_ROWS",
  "STORE_OPERATING_SUMMARY",
  "FOODAPP_PROVIDER_SETTLEMENT_EXPORT",
  "PROCUREMENT_SUPPLIER_PAYMENT",
  "POS_INVENTORY_FACT",
  "FINANCE_PNL_BUDGET_CONTEXT"
]);

export const SOURCE_CLASSIFICATIONS = Object.freeze([
  "OBSERVED_BALANCE",
  "COMPUTED_BALANCE",
  "MOVEMENT_ONLY",
  "CONTEXT_ONLY",
  "NOT_CONNECTED"
]);

export const SOURCE_COVERAGE_HINTS = Object.freeze([
  "COMPLETE",
  "PARTIAL",
  "MISSING",
  "NOT_CONNECTED"
]);

const OBSERVED_SOURCE_CLASSES = new Set([
  "PHYSICAL_STORE_TILL_COUNT",
  "BANK_ACCOUNT_BALANCE_STATEMENT",
  "MOMO_WALLET_BALANCE",
  "COD_DELIVERY_HELD_CASH",
  "OWNER_HELD_COMPANY_CASH",
  "PROVIDER_ACCOUNT_BALANCE"
]);

const NOT_CONNECTED_SOURCE_CLASSES = new Set([
  "PHYSICAL_STORE_TILL_COUNT",
  "BANK_ACCOUNT_BALANCE_STATEMENT",
  "MOMO_WALLET_BALANCE",
  "COD_DELIVERY_HELD_CASH",
  "OWNER_HELD_COMPANY_CASH",
  "PROVIDER_ACCOUNT_BALANCE"
]);

const MOVEMENT_SOURCE_CLASSES = new Set([
  "INTERNAL_CASH_MOVEMENT_ROWS",
  "STORE_OPERATING_SUMMARY",
  "FOODAPP_PROVIDER_SETTLEMENT_EXPORT",
  "PROCUREMENT_SUPPLIER_PAYMENT"
]);

const CONTEXT_SOURCE_CLASSES = new Set([
  "POS_INVENTORY_FACT",
  "FINANCE_PNL_BUDGET_CONTEXT"
]);

function text(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function enumValue(value, allowed) {
  const normalized = text(value)?.toUpperCase() || null;
  return allowed.includes(normalized) ? normalized : null;
}

function unsafeText(value) {
  const normalized = text(value);
  if (!normalized) return false;
  return (
    /https?:\/\//i.test(normalized) ||
    /\b(?:drive|docs)\.google\.com\b/i.test(normalized) ||
    /(?:api[_-]?key|access[_-]?token|refresh[_-]?token|secret|password)\s*[:=]/i.test(normalized)
  );
}

function safeText(value) {
  const normalized = text(value);
  return normalized && !unsafeText(normalized) ? normalized : null;
}

function safeList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(safeText).filter(Boolean))].sort();
}

function strictNumeric(value) {
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? { ok: true, value: Object.is(value, -0) ? 0 : value }
      : { ok: false, value: null, reason: "INVALID_SOURCE_NUMERIC_VALUE" };
  }

  if (typeof value !== "string") {
    return { ok: false, value: null, reason: "MISSING_SOURCE_NUMERIC_VALUE" };
  }

  const normalized = value.trim();
  if (!normalized) {
    return { ok: false, value: null, reason: "MISSING_SOURCE_NUMERIC_VALUE" };
  }

  if (!/^[+-]?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(normalized)) {
    return { ok: false, value: null, reason: "MALFORMED_SOURCE_NUMERIC_VALUE" };
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed)
    ? { ok: true, value: Object.is(parsed, -0) ? 0 : parsed }
    : { ok: false, value: null, reason: "INVALID_SOURCE_NUMERIC_VALUE" };
}

function normalizeCoverageHint(value) {
  return enumValue(value, SOURCE_COVERAGE_HINTS);
}

function canonicalResult({
  sourceClass,
  classification,
  balance,
  diagnostics = [],
  coverageHint = null
}) {
  const truth = balance?.truth ?? null;
  const sourceStatus =
    truth?.quality === "NOT_CONNECTED"
      ? "NOT_CONNECTED"
      : truth?.quality === "ACTUAL" || truth?.quality === "ESTIMATE"
        ? "MAPPED"
        : "FAIL_CLOSED";

  return {
    mapper_version: CASH_BALANCE_SOURCE_MAPPER_VERSION,
    source_class: sourceClass,
    classification,
    balance,
    source_status: sourceStatus,
    coverage_hint: normalizeCoverageHint(coverageHint),
    diagnostics: [...new Set([
      ...(Array.isArray(balance?.diagnostics) ? balance.diagnostics : []),
      ...diagnostics.map(safeText).filter(Boolean)
    ])].sort(),
    lineage: safeList(truth?.lineage)
  };
}

function pointPeriod(point = {}) {
  return {
    start: point?.date ?? null,
    end: point?.date ?? null,
    timezone: point?.timezone ?? null
  };
}

function baseTruth({
  role,
  point,
  scope,
  value,
  quality,
  source,
  asOf,
  reconciliationStatus,
  evidence,
  lineage,
  message,
  reason
}) {
  return {
    period: pointPeriod(point),
    scope,
    group: "CASH",
    metric: CASH_BALANCE_METRICS[role] ?? null,
    value,
    quality,
    source,
    as_of: asOf,
    reconciliation_status: reconciliationStatus,
    evidence,
    lineage,
    message,
    reason
  };
}

function invalidNumericBalance({
  role,
  basis,
  point,
  account,
  scope,
  source,
  asOf,
  reconciliationStatus,
  evidence,
  lineage,
  reason,
  proof,
  paymentMethod,
  targetPoint,
  targetScope
}) {
  const balance = normalizeCashBalanceTruth({
    balance_role: role,
    balance_basis: basis,
    point,
    account,
    truth: baseTruth({
      role,
      point,
      scope,
      value: null,
      quality: "GAP",
      source,
      asOf,
      reconciliationStatus,
      evidence,
      lineage,
      reason
    }),
    proof,
    payment_method: paymentMethod
  }, {
    targetPoint,
    targetScope
  });

  return balance?.truth?.reason === reason
    ? balance
    : {
        ...balance,
        truth: {
          ...balance.truth,
          value: null,
          quality: "GAP",
          reason
        },
        diagnostics: [...new Set([
          ...(balance.diagnostics || []),
          reason
        ])].sort()
      };
}

export function mapInternalMonthlyCashOpening(raw = {}, {
  targetPoint = null,
  targetScope = null
} = {}) {
  const numeric = strictNumeric(raw.value);
  const point = raw.point ?? {};
  const scope = raw.scope ?? {};
  const lineage = safeList(raw.lineage);
  const proof = {
    computation_proven: raw.computation_proven === true,
    anchor_observed: raw.anchor_observed === true,
    movement_coverage: normalizeCoverageHint(raw.movement_coverage),
    dependency_qualities: Array.isArray(raw.dependency_qualities)
      ? raw.dependency_qualities
      : [],
    computation_lineage: safeList(raw.computation_lineage)
  };

  if (!numeric.ok) {
    const balance = invalidNumericBalance({
      role: "OPENING",
      basis: "COMPUTED_BALANCE",
      point,
      account: raw.account,
      scope,
      source: raw.source,
      asOf: raw.as_of,
      reconciliationStatus: raw.reconciliation_status,
      evidence: raw.evidence,
      lineage,
      reason: numeric.reason,
      proof,
      paymentMethod: raw.payment_method ?? raw.paymentMethod,
      targetPoint,
      targetScope
    });
    return canonicalResult({
      sourceClass: "INTERNAL_MONTHLY_CASH_WORKBOOK",
      classification: "COMPUTED_BALANCE",
      balance,
      diagnostics: [numeric.reason],
      coverageHint: raw.coverage_hint
    });
  }

  const balance = normalizeCashBalanceTruth({
    balance_role: "OPENING",
    balance_basis: "COMPUTED_BALANCE",
    point,
    account: raw.account,
    truth: baseTruth({
      role: "OPENING",
      point,
      scope,
      value: numeric.value,
      quality: raw.quality,
      source: raw.source,
      asOf: raw.as_of,
      reconciliationStatus: raw.reconciliation_status,
      evidence: raw.evidence,
      lineage,
      message: raw.message,
      reason: raw.reason
    }),
    proof,
    payment_method: raw.payment_method ?? raw.paymentMethod
  }, {
    targetPoint,
    targetScope
  });

  return canonicalResult({
    sourceClass: "INTERNAL_MONTHLY_CASH_WORKBOOK",
    classification: "COMPUTED_BALANCE",
    balance,
    diagnostics: [],
    coverageHint: raw.coverage_hint
  });
}

export function mapInternalMonthlyCashRemainder(raw = {}, {
  targetPoint = null,
  targetScope = null
} = {}) {
  const numeric = strictNumeric(raw.value);
  const point = raw.point ?? {};
  const scope = raw.scope ?? {};
  const proof = {
    computation_proven: raw.computation_proven === true,
    anchor_observed: raw.anchor_observed === true,
    movement_coverage: normalizeCoverageHint(raw.movement_coverage),
    dependency_qualities: Array.isArray(raw.dependency_qualities)
      ? raw.dependency_qualities
      : [],
    computation_lineage: safeList(raw.computation_lineage)
  };

  const balance = normalizeCashBalanceTruth({
    balance_role: "OBSERVED_ENDING",
    balance_basis: "COMPUTED_BALANCE",
    point,
    account: raw.account,
    truth: baseTruth({
      role: "OBSERVED_ENDING",
      point,
      scope,
      value: numeric.ok ? numeric.value : null,
      quality: numeric.ok ? raw.quality : "GAP",
      source: raw.source,
      asOf: raw.as_of,
      reconciliationStatus: raw.reconciliation_status,
      evidence: raw.evidence,
      lineage: safeList(raw.lineage),
      message: raw.message,
      reason: numeric.ok ? raw.reason : numeric.reason
    }),
    proof,
    payment_method: raw.payment_method ?? raw.paymentMethod
  }, {
    targetPoint,
    targetScope
  });

  return canonicalResult({
    sourceClass: "INTERNAL_MONTHLY_CASH_WORKBOOK",
    classification: "COMPUTED_BALANCE",
    balance,
    diagnostics: [
      "COMPUTED_REMAINDER_NOT_OBSERVED_ENDING",
      ...(numeric.ok ? [] : [numeric.reason])
    ],
    coverageHint: raw.coverage_hint
  });
}

export function mapObservedCashPoint(raw = {}, {
  targetPoint = null,
  targetScope = null
} = {}) {
  const sourceClass = enumValue(raw.source_class, CASH_BALANCE_SOURCE_CLASSES);
  const numeric = strictNumeric(raw.value);
  const point = raw.point ?? {};
  const scope = raw.scope ?? {};

  if (!sourceClass || !OBSERVED_SOURCE_CLASSES.has(sourceClass)) {
    const balance = invalidNumericBalance({
      role: raw.balance_role ?? "OPENING",
      basis: "CONTEXT_ONLY",
      point,
      account: raw.account,
      scope,
      source: raw.source,
      asOf: raw.as_of,
      reconciliationStatus: raw.reconciliation_status,
      evidence: raw.evidence,
      lineage: safeList(raw.lineage),
      reason: "SOURCE_CLASS_NOT_OBSERVED_BALANCE",
      proof: {},
      targetPoint,
      targetScope
    });
    return canonicalResult({
      sourceClass,
      classification: "CONTEXT_ONLY",
      balance,
      diagnostics: ["SOURCE_CLASS_NOT_OBSERVED_BALANCE"],
      coverageHint: raw.coverage_hint
    });
  }

  if (!numeric.ok) {
    const balance = invalidNumericBalance({
      role: raw.balance_role,
      basis: "OBSERVED_BALANCE",
      point,
      account: raw.account,
      scope,
      source: raw.source,
      asOf: raw.as_of,
      reconciliationStatus: raw.reconciliation_status,
      evidence: raw.evidence,
      lineage: safeList(raw.lineage),
      reason: numeric.reason,
      proof: { observed_proven: raw.observed_proven === true },
      targetPoint,
      targetScope
    });
    return canonicalResult({
      sourceClass,
      classification: "OBSERVED_BALANCE",
      balance,
      diagnostics: [numeric.reason],
      coverageHint: raw.coverage_hint
    });
  }

  const balance = normalizeCashBalanceTruth({
    balance_role: raw.balance_role,
    balance_basis: "OBSERVED_BALANCE",
    point,
    account: raw.account,
    truth: baseTruth({
      role: raw.balance_role,
      point,
      scope,
      value: numeric.value,
      quality: raw.quality,
      source: raw.source,
      asOf: raw.as_of,
      reconciliationStatus: raw.reconciliation_status,
      evidence: raw.evidence,
      lineage: safeList(raw.lineage),
      message: raw.message,
      reason: raw.reason
    }),
    proof: {
      observed_proven: raw.observed_proven === true,
      evidence_kind: raw.evidence_kind
    },
    payment_method: raw.payment_method ?? raw.paymentMethod
  }, {
    targetPoint,
    targetScope
  });

  return canonicalResult({
    sourceClass,
    classification: "OBSERVED_BALANCE",
    balance,
    diagnostics: [],
    coverageHint: raw.coverage_hint
  });
}

export function mapUnavailableCashBalanceSource(raw = {}, {
  targetPoint = null,
  targetScope = null
} = {}) {
  const sourceClass = enumValue(raw.source_class, CASH_BALANCE_SOURCE_CLASSES);
  const point = raw.point ?? {};
  const scope = raw.scope ?? {};
  const role = raw.balance_role ?? "OPENING";

  const balance = normalizeCashBalanceTruth({
    balance_role: role,
    balance_basis: "NOT_CONNECTED",
    point,
    account: raw.account,
    truth: baseTruth({
      role,
      point,
      scope,
      value: null,
      quality: "NOT_CONNECTED",
      source: raw.source,
      asOf: raw.as_of,
      reconciliationStatus: raw.reconciliation_status,
      evidence: raw.evidence,
      lineage: safeList(raw.lineage),
      message: raw.message,
      reason: "BALANCE_SOURCE_NOT_CONNECTED"
    }),
    proof: {},
    payment_method: raw.payment_method ?? raw.paymentMethod
  }, {
    targetPoint,
    targetScope
  });

  return canonicalResult({
    sourceClass,
    classification: "NOT_CONNECTED",
    balance,
    diagnostics: ["BALANCE_SOURCE_NOT_CONNECTED"],
    coverageHint: raw.coverage_hint ?? "NOT_CONNECTED"
  });
}

export function mapNonBalanceSourceFact(raw = {}, {
  targetPoint = null,
  targetScope = null
} = {}) {
  const sourceClass = enumValue(raw.source_class, CASH_BALANCE_SOURCE_CLASSES);
  const classification = MOVEMENT_SOURCE_CLASSES.has(sourceClass)
    ? "MOVEMENT_ONLY"
    : CONTEXT_SOURCE_CLASSES.has(sourceClass)
      ? "CONTEXT_ONLY"
      : enumValue(raw.classification, ["MOVEMENT_ONLY", "CONTEXT_ONLY"]);

  const point = raw.point ?? {};
  const scope = raw.scope ?? {};
  const role = raw.balance_role ?? "OPENING";
  const basis = classification || "CONTEXT_ONLY";

  const balance = normalizeCashBalanceTruth({
    balance_role: role,
    balance_basis: basis,
    point,
    account: raw.account,
    truth: baseTruth({
      role,
      point,
      scope,
      value: null,
      quality: "GAP",
      source: raw.source,
      asOf: raw.as_of,
      reconciliationStatus: raw.reconciliation_status,
      evidence: raw.evidence,
      lineage: safeList(raw.lineage),
      message: raw.message,
      reason: basis === "MOVEMENT_ONLY"
        ? "MOVEMENT_ONLY_IS_NOT_BALANCE"
        : "CONTEXT_ONLY_IS_NOT_BALANCE"
    }),
    proof: {
      evidence_kind: basis
    },
    payment_method: raw.payment_method ?? raw.paymentMethod
  }, {
    targetPoint,
    targetScope
  });

  return canonicalResult({
    sourceClass,
    classification: basis,
    balance,
    diagnostics: [
      basis === "MOVEMENT_ONLY"
        ? "MOVEMENT_ONLY_IS_NOT_BALANCE"
        : "CONTEXT_ONLY_IS_NOT_BALANCE"
    ],
    coverageHint: raw.coverage_hint
  });
}

export function mapCashBalanceSourceFact(raw = {}, options = {}) {
  const sourceClass = enumValue(raw.source_class, CASH_BALANCE_SOURCE_CLASSES);

  if (sourceClass === "INTERNAL_MONTHLY_CASH_WORKBOOK") {
    if (text(raw.fact_kind)?.toUpperCase() === "CALCULATED_REMAINDER") {
      return mapInternalMonthlyCashRemainder(raw, options);
    }
    return mapInternalMonthlyCashOpening(raw, options);
  }

  if (raw.source_status === "NOT_CONNECTED" || raw.connected === false) {
    return mapUnavailableCashBalanceSource(raw, options);
  }

  if (sourceClass && OBSERVED_SOURCE_CLASSES.has(sourceClass)) {
    return mapObservedCashPoint(raw, options);
  }

  if (
    sourceClass &&
    (MOVEMENT_SOURCE_CLASSES.has(sourceClass) || CONTEXT_SOURCE_CLASSES.has(sourceClass))
  ) {
    return mapNonBalanceSourceFact(raw, options);
  }

  return mapNonBalanceSourceFact({
    ...raw,
    classification: "CONTEXT_ONLY"
  }, options);
}

export function isCurrentlyUnconnectedBalanceSource(sourceClass) {
  const normalized = enumValue(sourceClass, CASH_BALANCE_SOURCE_CLASSES);
  return Boolean(normalized && NOT_CONNECTED_SOURCE_CLASSES.has(normalized));
}

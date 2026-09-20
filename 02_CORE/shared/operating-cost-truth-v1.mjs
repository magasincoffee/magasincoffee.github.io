import { normalizeFinancialTruth } from "./financial-truth-v1.mjs";

export const OPERATING_COST_TRUTH_SCHEMA_VERSION = "operating-cost-truth.v1";

export const OPERATING_COST_FAMILIES = Object.freeze([
  "PAYROLL_LABOR",
  "RENT",
  "UTILITIES",
  "PLATFORM_FEES_PROMOTIONS",
  "DELIVERY_COST",
  "MARKETING_ADVERTISING",
  "OTHER_BRANCH_OPEX",
  "SHARED_COMPANY_OPEX",
  "BANK_PAYMENT_FEES"
]);

export const OPERATING_COST_CLAIM_TYPES = Object.freeze([
  "EXACT_ITEM",
  "PERIOD_AGGREGATE"
]);

export const OPERATING_COST_SOURCE_ROLES = Object.freeze([
  "RECOGNITION_SOURCE",
  "PAYMENT_SOURCE",
  "SETTLEMENT_SOURCE",
  "ALLOCATION_CONTEXT",
  "BUDGET_CONTEXT",
  "NOT_CONNECTED"
]);

export const OPERATING_COST_AMOUNT_SEMANTICS = Object.freeze([
  "RECOGNIZED_COST",
  "ESTIMATED_COST",
  "PAYMENT_AMOUNT",
  "SETTLEMENT_GROSS",
  "SETTLEMENT_NET_PAYOUT",
  "BUDGET_AMOUNT",
  "ALLOCATION_WEIGHT",
  "UNKNOWN"
]);

export const OPERATING_COST_COVERAGE_STATES = Object.freeze([
  "COMPLETE",
  "PARTIAL",
  "MISSING",
  "NOT_CONNECTED"
]);

const SAFE_FAILURE_SOURCE = Object.freeze({
  class: "OPERATING_COST_TRUTH_CONTRACT",
  label: "OPERATING_COST_TRUTH_V1"
});

function text(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function upper(value) {
  return text(value)?.toUpperCase() || null;
}

function privacyUnsafeText(value) {
  if (typeof value !== "string") return false;
  if (/https?:\/\//i.test(value)) return true;
  if (/\b(?:drive|docs)\.google\.com\b/i.test(value)) return true;
  return false;
}

function containsPrivacyUnsafeText(value) {
  if (typeof value === "string") return privacyUnsafeText(value);
  if (Array.isArray(value)) return value.some(containsPrivacyUnsafeText);
  if (value && typeof value === "object") {
    return Object.values(value).some(containsPrivacyUnsafeText);
  }
  return false;
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
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
  const normalizeDimension = (value) => {
    const normalized = text(value);
    if (!normalized) return null;
    if (normalized.toUpperCase() === "ALL") return aggregateProven ? "ALL" : null;
    return normalized;
  };
  const branch = normalizeDimension(raw?.branch ?? raw?.branchScope);
  const channel = normalizeDimension(raw?.channel ?? raw?.channelScope);
  return {
    branch,
    channel,
    aggregate_proven: aggregateProven,
    valid: Boolean(branch && channel)
  };
}

function samePeriod(a, b) {
  return Boolean(
    a?.start &&
    b?.start &&
    a.start === b.start &&
    a.end === b.end &&
    a.timezone === b.timezone
  );
}

function sameScope(a, b) {
  return Boolean(
    a?.branch &&
    b?.branch &&
    a.branch === b.branch &&
    a.channel === b.channel &&
    Boolean(a.aggregate_proven) === Boolean(b.aggregate_proven)
  );
}

function normalizeEnum(value, allowed) {
  const normalized = upper(value);
  return allowed.includes(normalized) ? normalized : null;
}

function normalizeCoverage(raw = {}) {
  const status = normalizeEnum(raw?.status, OPERATING_COST_COVERAGE_STATES) || "MISSING";
  return {
    status,
    coverage_proven: raw?.coverage_proven === true || raw?.coverageProven === true
  };
}

function normalizeProof(raw = {}) {
  return {
    actuality_proven: raw?.actuality_proven === true || raw?.actualityProven === true,
    recognition_period_proven:
      raw?.recognition_period_proven === true || raw?.recognitionPeriodProven === true,
    amount_semantics_proven:
      raw?.amount_semantics_proven === true || raw?.amountSemanticsProven === true,
    scope_proven: raw?.scope_proven === true || raw?.scopeProven === true,
    estimate_proven: raw?.estimate_proven === true || raw?.estimateProven === true
  };
}

function normalizeAllocation(raw = {}) {
  return {
    is_shared: raw?.is_shared === true || raw?.isShared === true,
    applied: raw?.applied === true,
    approved: raw?.approved === true,
    rule_label: privacyUnsafeText(raw?.rule_label ?? raw?.ruleLabel)
      ? null
      : text(raw?.rule_label ?? raw?.ruleLabel)
  };
}

function defaultMetric(costFamily, claimType) {
  if (claimType === "PERIOD_AGGREGATE") return "operating_costs";
  return costFamily ? `operating_cost_${costFamily.toLowerCase()}` : "operating_cost";
}

function safeRawTruth(raw = {}) {
  if (raw?.schema_version === OPERATING_COST_TRUTH_SCHEMA_VERSION && raw?.truth) {
    return raw.truth;
  }
  return raw?.truth ?? raw?.financial_truth ?? raw;
}

function failureTruth(rawTruth, costFamily, claimType, reason, quality = "GAP") {
  const period = normalizePeriod(rawTruth?.period ?? {});
  const scope = normalizeScope(rawTruth?.scope ?? {});
  return normalizeFinancialTruth({
    period: { start: period.start, end: period.end, timezone: period.timezone },
    scope: {
      branch: scope.branch,
      channel: scope.channel,
      aggregate_proven: scope.aggregate_proven
    },
    group: "OPEX",
    metric: defaultMetric(costFamily, claimType),
    value: null,
    quality,
    source: SAFE_FAILURE_SOURCE,
    as_of: null,
    reconciliation_status: "NOT_APPLICABLE",
    evidence: [],
    lineage: ["OPERATING_COST_TRUTH_V1"],
    reason,
    message: reason
  }, { allowNegative: false });
}

function wrapper({
  costFamily,
  claimType,
  sourceRole,
  amountSemantics,
  sourcePeriod,
  sourceScope,
  coverage,
  proof,
  allocation,
  truth,
  diagnostics
}) {
  return {
    schema_version: OPERATING_COST_TRUTH_SCHEMA_VERSION,
    cost_family: costFamily,
    claim_type: claimType,
    source_role: sourceRole,
    amount_semantics: amountSemantics,
    source_period: {
      start: sourcePeriod.start,
      end: sourcePeriod.end,
      timezone: sourcePeriod.timezone
    },
    source_scope: {
      branch: sourceScope.branch,
      channel: sourceScope.channel,
      aggregate_proven: sourceScope.aggregate_proven
    },
    coverage,
    proof,
    allocation,
    truth,
    diagnostics: [...new Set(diagnostics.filter(Boolean))].sort()
  };
}

function failClosed(meta, rawTruth, reason, quality = "GAP") {
  return wrapper({
    ...meta,
    truth: failureTruth(rawTruth, meta.costFamily, meta.claimType, reason, quality),
    diagnostics: [...meta.diagnostics, reason]
  });
}

export function normalizeOperatingCostTruth(raw = {}) {
  const canonicalWrapper =
    raw?.schema_version === OPERATING_COST_TRUTH_SCHEMA_VERSION && raw?.truth ? raw : null;
  const rawTruth = safeRawTruth(raw);

  const costFamily = normalizeEnum(
    canonicalWrapper?.cost_family ?? raw?.cost_family ?? raw?.costFamily,
    OPERATING_COST_FAMILIES
  );
  const claimType = normalizeEnum(
    canonicalWrapper?.claim_type ?? raw?.claim_type ?? raw?.claimType,
    OPERATING_COST_CLAIM_TYPES
  );
  const sourceRole = normalizeEnum(
    canonicalWrapper?.source_role ?? raw?.source_role ?? raw?.sourceRole,
    OPERATING_COST_SOURCE_ROLES
  );
  const amountSemantics = normalizeEnum(
    canonicalWrapper?.amount_semantics ?? raw?.amount_semantics ?? raw?.amountSemantics,
    OPERATING_COST_AMOUNT_SEMANTICS
  );

  const sourcePeriod = normalizePeriod(
    canonicalWrapper?.source_period ?? raw?.source_period ?? raw?.sourcePeriod ?? {}
  );
  const sourceScope = normalizeScope(
    canonicalWrapper?.source_scope ?? raw?.source_scope ?? raw?.sourceScope ?? {}
  );
  const coverage = normalizeCoverage(canonicalWrapper?.coverage ?? raw?.coverage ?? {});
  const proof = normalizeProof(canonicalWrapper?.proof ?? raw?.proof ?? {});
  const allocation = normalizeAllocation(canonicalWrapper?.allocation ?? raw?.allocation ?? {});
  const diagnostics = Array.isArray(canonicalWrapper?.diagnostics ?? raw?.diagnostics)
    ? (canonicalWrapper?.diagnostics ?? raw.diagnostics).filter((x) => typeof x === "string" && x.trim())
    : [];

  const meta = {
    costFamily,
    claimType,
    sourceRole,
    amountSemantics,
    sourcePeriod,
    sourceScope,
    coverage,
    proof,
    allocation,
    diagnostics
  };

  const privacyInput = {
    source: rawTruth?.source,
    evidence: rawTruth?.evidence,
    lineage: rawTruth?.lineage,
    message: rawTruth?.message,
    reason: rawTruth?.reason,
    allocation_rule_label:
      canonicalWrapper?.allocation?.rule_label ?? raw?.allocation?.rule_label ?? raw?.allocation?.ruleLabel
  };
  if (containsPrivacyUnsafeText(privacyInput)) {
    return failClosed(meta, rawTruth, "PRIVACY_UNSAFE_OPERATING_COST_EVIDENCE");
  }

  if (!costFamily) return failClosed(meta, rawTruth, "INVALID_COST_FAMILY");
  if (!claimType) return failClosed(meta, rawTruth, "INVALID_CLAIM_TYPE");
  if (!sourceRole) return failClosed(meta, rawTruth, "INVALID_SOURCE_ROLE");
  if (!amountSemantics) return failClosed(meta, rawTruth, "INVALID_AMOUNT_SEMANTICS");

  if (sourceRole === "NOT_CONNECTED") {
    return failClosed(meta, rawTruth, "OPERATING_COST_SOURCE_NOT_CONNECTED", "NOT_CONNECTED");
  }

  const normalizedTruth = normalizeFinancialTruth({
    ...rawTruth,
    group: rawTruth?.group ?? "OPEX",
    metric: rawTruth?.metric ?? defaultMetric(costFamily, claimType)
  }, { allowNegative: false });

  if (normalizedTruth.group !== "OPEX") {
    return failClosed(meta, rawTruth, "OPERATING_COST_GROUP_MISMATCH");
  }

  if (normalizedTruth.quality === "GAP" || normalizedTruth.quality === "NOT_CONNECTED") {
    return wrapper({
      ...meta,
      truth: normalizedTruth,
      diagnostics
    });
  }

  if (sourceRole === "PAYMENT_SOURCE") {
    return failClosed(meta, rawTruth, "PAYMENT_SOURCE_NOT_OPERATING_COST_RECOGNITION");
  }

  if (
    ["PAYMENT_AMOUNT", "SETTLEMENT_GROSS", "SETTLEMENT_NET_PAYOUT", "ALLOCATION_WEIGHT", "UNKNOWN"]
      .includes(amountSemantics)
  ) {
    return failClosed(meta, rawTruth, "AMOUNT_SEMANTICS_NOT_RECOGNIZED_COST");
  }

  if (sourceRole === "SETTLEMENT_SOURCE" && amountSemantics !== "RECOGNIZED_COST") {
    return failClosed(meta, rawTruth, "SETTLEMENT_PROCEEDS_NOT_FEE_RECOGNITION");
  }

  if (normalizedTruth.quality === "ACTUAL") {
    if (["BUDGET_CONTEXT", "ALLOCATION_CONTEXT"].includes(sourceRole)) {
      return failClosed(meta, rawTruth, "CONTEXT_SOURCE_CANNOT_BE_ACTUAL_RECOGNITION");
    }
    if (amountSemantics !== "RECOGNIZED_COST") {
      return failClosed(meta, rawTruth, "ACTUAL_REQUIRES_RECOGNIZED_COST_SEMANTICS");
    }
    if (
      !proof.actuality_proven ||
      !proof.recognition_period_proven ||
      !proof.amount_semantics_proven ||
      !proof.scope_proven
    ) {
      return failClosed(meta, rawTruth, "ACTUAL_RECOGNITION_PROOF_INCOMPLETE");
    }
    if (!sourcePeriod.valid || !samePeriod(sourcePeriod, normalizedTruth.period)) {
      return failClosed(meta, rawTruth, "SOURCE_PERIOD_MISMATCH");
    }
    if (!sourceScope.valid || !sameScope(sourceScope, normalizedTruth.scope)) {
      return failClosed(meta, rawTruth, "SOURCE_SCOPE_MISMATCH");
    }
    if (
      claimType === "PERIOD_AGGREGATE" &&
      (coverage.status !== "COMPLETE" || !coverage.coverage_proven)
    ) {
      return failClosed(meta, rawTruth, "PERIOD_AGGREGATE_COVERAGE_INCOMPLETE");
    }
  }

  if (normalizedTruth.quality === "ESTIMATE") {
    if (amountSemantics !== "ESTIMATED_COST" || !proof.estimate_proven) {
      return failClosed(meta, rawTruth, "ESTIMATE_SEMANTICS_NOT_PROVEN");
    }
  }

  if (allocation.applied && !allocation.approved) {
    return failClosed(meta, rawTruth, "UNAPPROVED_ALLOCATION");
  }

  if (
    costFamily === "SHARED_COMPANY_OPEX" &&
    normalizedTruth.scope?.branch !== "ALL" &&
    !(allocation.applied && allocation.approved)
  ) {
    return failClosed(meta, rawTruth, "SHARED_OPEX_BRANCH_ALLOCATION_NOT_PROVEN");
  }

  return wrapper({
    ...meta,
    truth: normalizedTruth,
    diagnostics
  });
}

export function operatingCostTruthForBaseline(raw = {}) {
  const normalized = normalizeOperatingCostTruth(raw);
  if (normalized.claim_type !== "PERIOD_AGGREGATE") {
    return failureTruth(
      normalized.truth,
      normalized.cost_family,
      "PERIOD_AGGREGATE",
      "BASELINE_REQUIRES_PERIOD_AGGREGATE"
    );
  }
  return normalized.truth;
}

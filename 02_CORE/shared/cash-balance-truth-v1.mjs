import { normalizeFinancialTruth } from "./financial-truth-v1.mjs";

export const CASH_BALANCE_TRUTH_SCHEMA_VERSION = "cash-balance-truth.v1";

export const CASH_BALANCE_ROLES = Object.freeze([
  "OPENING",
  "OBSERVED_ENDING"
]);

export const CASH_BALANCE_BASES = Object.freeze([
  "OBSERVED_BALANCE",
  "COMPUTED_BALANCE",
  "MOVEMENT_ONLY",
  "CONTEXT_ONLY",
  "NOT_CONNECTED"
]);

export const CASH_BALANCE_ACCOUNT_CLASSES = Object.freeze([
  "PHYSICAL_CASH",
  "BANK",
  "MOMO_WALLET",
  "COD_HELD_CASH",
  "OWNER_HELD_COMPANY_CASH",
  "PROVIDER_ACCOUNT",
  "OTHER_EVIDENCED_CASH"
]);

export const CASH_BALANCE_METRICS = Object.freeze({
  OPENING: "cash_opening_balance",
  OBSERVED_ENDING: "cash_observed_ending_balance"
});

const COMPUTATION_COVERAGE_STATES = Object.freeze([
  "COMPLETE",
  "PARTIAL",
  "MISSING",
  "NOT_CONNECTED"
]);

const QUALITY_STATES = Object.freeze([
  "ACTUAL",
  "ESTIMATE",
  "GAP",
  "NOT_CONNECTED"
]);

const FORBIDDEN_EVIDENCE_KINDS = Object.freeze([
  "PAYMENT_METHOD",
  "REVENUE",
  "PURCHASE",
  "AP",
  "FOODAPP_GROSS",
  "MOVEMENT_ONLY"
]);

function text(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function enumValue(value, allowed) {
  const normalized = text(value)?.toUpperCase() || null;
  return allowed.includes(normalized) ? normalized : null;
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

function dateInTimezone(timestamp, timezone) {
  if (!isIsoTimestampWithZone(timestamp) || !text(timezone)) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date(timestamp));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const result = `${values.year}-${values.month}-${values.day}`;
    return isIsoDate(result) ? result : null;
  } catch {
    return null;
  }
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

function unsafeAccountLabel(value) {
  const normalized = text(value);
  if (!normalized) return false;
  return unsafeText(normalized) || /\b\d{8,}\b/.test(normalized);
}

function unsafeList(value) {
  return Array.isArray(value) && value.some((entry) => unsafeText(entry));
}

function privacyViolation(raw = {}) {
  const truth = raw.truth && typeof raw.truth === "object" ? raw.truth : raw;
  const proof = raw.proof && typeof raw.proof === "object" ? raw.proof : {};
  return Boolean(
    unsafeAccountLabel(raw?.account?.label) ||
    unsafeText(truth?.source?.class) ||
    unsafeText(truth?.source?.label) ||
    unsafeText(typeof truth?.source === "string" ? truth.source : null) ||
    unsafeList(truth?.evidence) ||
    unsafeList(truth?.lineage) ||
    unsafeText(truth?.message) ||
    unsafeText(truth?.reason) ||
    unsafeList(proof?.computation_lineage ?? proof?.computationLineage)
  );
}

function normalizePoint(raw = {}) {
  const date = isIsoDate(raw?.date) ? raw.date : null;
  const timezone = text(raw?.timezone);
  const timestampRaw = raw?.timestamp ?? raw?.as_of ?? raw?.asOf;
  const timestamp = isIsoTimestampWithZone(timestampRaw) ? timestampRaw : null;
  const timestampDate = timestamp && timezone ? dateInTimezone(timestamp, timezone) : null;
  return {
    date,
    timezone,
    timestamp,
    boundary_proven: raw?.boundary_proven === true || raw?.boundaryProven === true,
    valid: Boolean(date && timezone && timestamp && timestampDate === date)
  };
}

function normalizeTargetPoint(raw = {}) {
  if (!raw || typeof raw !== "object") return null;
  const date = isIsoDate(raw.date) ? raw.date : null;
  const timezone = text(raw.timezone);
  const timestampRaw = raw.timestamp ?? raw.as_of ?? raw.asOf;
  const timestamp = timestampRaw == null
    ? null
    : (isIsoTimestampWithZone(timestampRaw) ? timestampRaw : "__INVALID__");
  return {
    date,
    timezone,
    timestamp,
    valid: Boolean(date && timezone && timestamp !== "__INVALID__")
  };
}

function normalizeAccount(raw = {}) {
  const accountClass = enumValue(
    raw?.class ?? raw?.account_class ?? raw?.accountClass,
    CASH_BALANCE_ACCOUNT_CLASSES
  );
  const label = text(raw?.label ?? raw?.account_label ?? raw?.accountLabel);
  const aggregateProven = raw?.aggregate_proven === true || raw?.aggregateProven === true;
  const all = label?.toUpperCase() === "ALL";
  return {
    class: accountClass,
    label: unsafeAccountLabel(label) ? null : label,
    aggregate_proven: aggregateProven,
    valid: Boolean(accountClass && label && !unsafeAccountLabel(label) && (!all || aggregateProven))
  };
}

function rawTruth(raw = {}) {
  return raw.truth && typeof raw.truth === "object" && !Array.isArray(raw.truth)
    ? raw.truth
    : raw;
}

function scopeFromTruth(truth = {}) {
  return truth.scope && typeof truth.scope === "object"
    ? truth.scope
    : {
        branch: truth.branch ?? truth.branchScope,
        channel: truth.channel ?? truth.channelScope,
        aggregate_proven: truth.aggregate_proven === true || truth.aggregateProven === true
      };
}

function sameScope(left = {}, right = {}) {
  return (
    left?.branch === right?.branch &&
    left?.channel === right?.channel &&
    left?.aggregate_proven === right?.aggregate_proven
  );
}

function failureTruth({
  raw,
  point,
  role,
  reason,
  quality = "GAP"
}) {
  const sourceTruth = rawTruth(raw);
  return normalizeFinancialTruth({
    period: {
      start: point?.date,
      end: point?.date,
      timezone: point?.timezone
    },
    scope: scopeFromTruth(sourceTruth),
    group: "CASH",
    metric: CASH_BALANCE_METRICS[role] ?? null,
    value: null,
    quality,
    source: sourceTruth?.source,
    as_of: sourceTruth?.as_of ?? sourceTruth?.asOf,
    reconciliation_status: sourceTruth?.reconciliation_status ?? sourceTruth?.reconciliationStatus,
    evidence: sourceTruth?.evidence,
    lineage: sourceTruth?.lineage,
    message: sourceTruth?.message,
    reason
  });
}

function resultShape({
  role,
  basis,
  point,
  account,
  truth,
  proof,
  diagnostics
}) {
  return {
    schema_version: CASH_BALANCE_TRUTH_SCHEMA_VERSION,
    balance_role: role,
    balance_basis: basis,
    point: {
      date: point?.date ?? null,
      timezone: point?.timezone ?? null,
      timestamp: point?.timestamp ?? null,
      boundary_proven: point?.boundary_proven === true
    },
    account: {
      class: account?.class ?? null,
      label: account?.label ?? null,
      aggregate_proven: account?.aggregate_proven === true
    },
    truth,
    proof,
    diagnostics: [...new Set((diagnostics || []).filter(Boolean))].sort()
  };
}

function fail({
  raw,
  role,
  basis,
  point,
  account,
  proof,
  reason,
  quality = "GAP"
}) {
  return resultShape({
    role,
    basis,
    point,
    account,
    proof,
    truth: failureTruth({ raw, point, role, reason, quality }),
    diagnostics: [reason]
  });
}

function normalizeProof(raw = {}) {
  const proof = raw && typeof raw === "object" ? raw : {};
  const dependencyQualities = Array.isArray(
    proof.dependency_qualities ?? proof.dependencyQualities
  )
    ? (proof.dependency_qualities ?? proof.dependencyQualities)
        .map((quality) => enumValue(quality, QUALITY_STATES))
        .filter(Boolean)
    : [];

  const computationLineage = Array.isArray(
    proof.computation_lineage ?? proof.computationLineage
  )
    ? [...new Set((proof.computation_lineage ?? proof.computationLineage)
        .map((entry) => text(entry))
        .filter((entry) => entry && !unsafeText(entry)))]
        .sort()
    : [];

  return {
    observed_proven: proof.observed_proven === true || proof.observedProven === true,
    computation_proven: proof.computation_proven === true || proof.computationProven === true,
    anchor_observed: proof.anchor_observed === true || proof.anchorObserved === true,
    movement_coverage: enumValue(
      proof.movement_coverage ?? proof.movementCoverage,
      COMPUTATION_COVERAGE_STATES
    ),
    dependency_qualities: dependencyQualities,
    computation_lineage: computationLineage,
    evidence_kind: text(proof.evidence_kind ?? proof.evidenceKind)?.toUpperCase() || null
  };
}

function dependencyQuality(proof, requestedQuality) {
  const qualities = [requestedQuality, ...(proof.dependency_qualities || [])]
    .map((quality) => enumValue(quality, QUALITY_STATES))
    .filter(Boolean);

  if (qualities.includes("NOT_CONNECTED")) return "NOT_CONNECTED";
  if (qualities.includes("GAP")) return "GAP";
  if (qualities.includes("ESTIMATE")) return "ESTIMATE";
  return qualities.includes("ACTUAL") ? "ACTUAL" : null;
}

function normalizeCanonicalTruth({
  sourceTruth,
  point,
  role,
  qualityOverride = null
}) {
  return normalizeFinancialTruth({
    period: {
      start: point.date,
      end: point.date,
      timezone: point.timezone
    },
    scope: scopeFromTruth(sourceTruth),
    group: "CASH",
    metric: CASH_BALANCE_METRICS[role],
    value: sourceTruth.value,
    quality: qualityOverride ?? sourceTruth.quality,
    source: sourceTruth.source,
    as_of: sourceTruth.as_of ?? sourceTruth.asOf,
    reconciliation_status: sourceTruth.reconciliation_status ?? sourceTruth.reconciliationStatus,
    evidence: sourceTruth.evidence,
    lineage: sourceTruth.lineage,
    message: sourceTruth.message,
    reason: sourceTruth.reason
  }, {
    allowNegative: true
  });
}

export function normalizeCashBalanceTruth(raw = {}, {
  targetPoint = null,
  targetScope = null
} = {}) {
  const role = enumValue(raw.balance_role ?? raw.balanceRole, CASH_BALANCE_ROLES);
  const basis = enumValue(raw.balance_basis ?? raw.balanceBasis, CASH_BALANCE_BASES);
  const point = normalizePoint(raw.point ?? {});
  const account = normalizeAccount(raw.account ?? {});
  const proof = normalizeProof(raw.proof ?? {});
  const sourceTruth = rawTruth(raw);
  const expectedMetric = role ? CASH_BALANCE_METRICS[role] : null;

  if (!role) {
    return fail({ raw, role: null, basis, point, account, proof, reason: "INVALID_BALANCE_ROLE" });
  }

  if (!basis) {
    return fail({ raw, role, basis: null, point, account, proof, reason: "INVALID_BALANCE_BASIS" });
  }

  if (!point.valid) {
    return fail({ raw, role, basis, point, account, proof, reason: "INVALID_BALANCE_POINT" });
  }

  if (!account.valid) {
    return fail({ raw, role, basis, point, account, proof, reason: "INVALID_BALANCE_ACCOUNT" });
  }

  if (privacyViolation(raw)) {
    return fail({ raw, role, basis, point, account, proof, reason: "PRIVACY_UNSAFE_BALANCE_EVIDENCE" });
  }

  if (
    raw.payment_method != null ||
    raw.paymentMethod != null ||
    sourceTruth.payment_method != null ||
    sourceTruth.paymentMethod != null ||
    FORBIDDEN_EVIDENCE_KINDS.includes(proof.evidence_kind)
  ) {
    return fail({ raw, role, basis, point, account, proof, reason: "NON_BALANCE_EVIDENCE_FORBIDDEN" });
  }

  const suppliedGroup = text(sourceTruth.group)?.toUpperCase() || null;
  const suppliedMetric = text(sourceTruth.metric);
  if (suppliedGroup && suppliedGroup !== "CASH") {
    return fail({ raw, role, basis, point, account, proof, reason: "INVALID_BALANCE_GROUP" });
  }
  if (suppliedMetric && suppliedMetric !== expectedMetric) {
    return fail({ raw, role, basis, point, account, proof, reason: "BALANCE_ROLE_METRIC_MISMATCH" });
  }

  if (sourceTruth.period && typeof sourceTruth.period === "object") {
    if (
      sourceTruth.period.start !== point.date ||
      sourceTruth.period.end !== point.date
    ) {
      return fail({ raw, role, basis, point, account, proof, reason: "BALANCE_POINT_DATE_MISMATCH" });
    }
    if (sourceTruth.period.timezone !== point.timezone) {
      return fail({ raw, role, basis, point, account, proof, reason: "BALANCE_POINT_TIMEZONE_MISMATCH" });
    }
  }

  const requestedTargetPoint = normalizeTargetPoint(targetPoint);
  if (targetPoint && !requestedTargetPoint?.valid) {
    return fail({ raw, role, basis, point, account, proof, reason: "INVALID_TARGET_POINT" });
  }
  if (requestedTargetPoint) {
    if (point.date !== requestedTargetPoint.date) {
      return fail({ raw, role, basis, point, account, proof, reason: "BALANCE_POINT_DATE_MISMATCH" });
    }
    if (point.timezone !== requestedTargetPoint.timezone) {
      return fail({ raw, role, basis, point, account, proof, reason: "BALANCE_POINT_TIMEZONE_MISMATCH" });
    }
    if (
      requestedTargetPoint.timestamp &&
      point.timestamp !== requestedTargetPoint.timestamp
    ) {
      return fail({ raw, role, basis, point, account, proof, reason: "BALANCE_POINT_TIMESTAMP_MISMATCH" });
    }
  }

  if (basis === "NOT_CONNECTED") {
    return fail({
      raw,
      role,
      basis,
      point,
      account,
      proof,
      reason: "BALANCE_SOURCE_NOT_CONNECTED",
      quality: "NOT_CONNECTED"
    });
  }

  if (basis === "MOVEMENT_ONLY") {
    return fail({ raw, role, basis, point, account, proof, reason: "MOVEMENT_ONLY_IS_NOT_BALANCE" });
  }

  if (basis === "CONTEXT_ONLY") {
    return fail({ raw, role, basis, point, account, proof, reason: "CONTEXT_ONLY_IS_NOT_BALANCE" });
  }

  if (role === "OBSERVED_ENDING" && basis !== "OBSERVED_BALANCE") {
    return fail({
      raw,
      role,
      basis,
      point,
      account,
      proof,
      reason: "OBSERVED_ENDING_REQUIRES_OBSERVED_BALANCE"
    });
  }

  if (basis === "COMPUTED_BALANCE" && role !== "OPENING") {
    return fail({
      raw,
      role,
      basis,
      point,
      account,
      proof,
      reason: "COMPUTED_BALANCE_ONLY_SUPPORTED_FOR_OPENING"
    });
  }

  if (!point.boundary_proven) {
    return fail({ raw, role, basis, point, account, proof, reason: "BALANCE_BOUNDARY_NOT_PROVEN" });
  }

  if (basis === "OBSERVED_BALANCE" && !proof.observed_proven) {
    return fail({ raw, role, basis, point, account, proof, reason: "OBSERVED_BALANCE_NOT_PROVEN" });
  }

  let qualityOverride = null;
  if (basis === "COMPUTED_BALANCE") {
    if (!proof.computation_proven) {
      return fail({ raw, role, basis, point, account, proof, reason: "COMPUTATION_NOT_PROVEN" });
    }
    if (!proof.anchor_observed) {
      return fail({ raw, role, basis, point, account, proof, reason: "COMPUTED_BALANCE_REQUIRES_OBSERVED_ANCHOR" });
    }
    if (proof.movement_coverage !== "COMPLETE") {
      return fail({
        raw,
        role,
        basis,
        point,
        account,
        proof,
        reason: proof.movement_coverage === "NOT_CONNECTED"
          ? "COMPUTATION_MOVEMENT_SOURCE_NOT_CONNECTED"
          : "COMPUTATION_MOVEMENT_COVERAGE_INCOMPLETE",
        quality: proof.movement_coverage === "NOT_CONNECTED" ? "NOT_CONNECTED" : "GAP"
      });
    }
    if (proof.computation_lineage.length === 0) {
      return fail({ raw, role, basis, point, account, proof, reason: "MISSING_COMPUTATION_LINEAGE" });
    }

    const requestedQuality = enumValue(sourceTruth.quality, QUALITY_STATES);
    const dependencyResult = dependencyQuality(proof, requestedQuality);
    if (dependencyResult === "NOT_CONNECTED") {
      return fail({
        raw,
        role,
        basis,
        point,
        account,
        proof,
        reason: "COMPUTED_BALANCE_DEPENDENCY_NOT_CONNECTED",
        quality: "NOT_CONNECTED"
      });
    }
    if (dependencyResult === "GAP" || !dependencyResult) {
      return fail({ raw, role, basis, point, account, proof, reason: "COMPUTED_BALANCE_DEPENDENCY_INCOMPLETE" });
    }
    qualityOverride = dependencyResult;
  }

  const truth = normalizeCanonicalTruth({
    sourceTruth,
    point,
    role,
    qualityOverride
  });

  if (
    targetScope &&
    (truth.quality === "ACTUAL" || truth.quality === "ESTIMATE") &&
    !sameScope(truth.scope, normalizeFinancialTruth({
      period: { start: point.date, end: point.date, timezone: point.timezone },
      scope: targetScope,
      group: "CASH",
      metric: expectedMetric,
      value: 0,
      quality: "ACTUAL",
      source: { class: "TARGET_SCOPE_VALIDATION", label: "TARGET_SCOPE" },
      as_of: point.timestamp,
      reconciliation_status: "NOT_APPLICABLE",
      lineage: ["TARGET_SCOPE_VALIDATION"]
    }).scope)
  ) {
    return fail({ raw, role, basis, point, account, proof, reason: "BALANCE_SCOPE_MISMATCH" });
  }

  if (
    (truth.quality === "ACTUAL" || truth.quality === "ESTIMATE") &&
    (typeof truth.value !== "number" || !Number.isFinite(truth.value))
  ) {
    return fail({ raw, role, basis, point, account, proof, reason: "INVALID_BALANCE_VALUE" });
  }

  const diagnostics = [];
  if (truth.quality === "GAP" && truth.reason) diagnostics.push(truth.reason);
  if (truth.quality === "NOT_CONNECTED") diagnostics.push("BALANCE_SOURCE_NOT_CONNECTED");

  return resultShape({
    role,
    basis,
    point,
    account,
    proof,
    truth,
    diagnostics
  });
}

export function cashBalanceTruthForBridge(balance, expectedRole) {
  const role = enumValue(expectedRole, CASH_BALANCE_ROLES);
  if (
    !balance ||
    balance.schema_version !== CASH_BALANCE_TRUTH_SCHEMA_VERSION ||
    !role ||
    balance.balance_role !== role ||
    !balance.truth ||
    balance.truth.group !== "CASH" ||
    balance.truth.metric !== CASH_BALANCE_METRICS[role]
  ) {
    return null;
  }
  return balance.truth;
}

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

export const CASH_BRIDGE_COVERAGE_STATES = Object.freeze([
  "COMPLETE",
  "PARTIAL",
  "MISSING"
]);

export const CASH_BRIDGE_QUALITY_PRECEDENCE = Object.freeze([
  "NOT_CONNECTED",
  "GAP",
  "ESTIMATE",
  "ACTUAL"
]);

const SOURCE_COVERAGE_STATES = Object.freeze([
  "COMPLETE",
  "PARTIAL",
  "MISSING",
  "NOT_CONNECTED"
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

const DERIVED_SOURCE = Object.freeze({
  class: "DERIVED_CALCULATION",
  label: "CASH_BRIDGE_V1"
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
    (truth.quality === "ACTUAL" || truth.quality === "ESTIMATE") &&
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

function normalizeTargetPeriod(raw = {}) {
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

function normalizeTargetScope(raw = {}) {
  const aggregateProven = raw?.aggregate_proven === true || raw?.aggregateProven === true;
  const normalizeDimension = (value) => {
    const normalized = text(value);
    if (!normalized) return null;
    if (normalized.toUpperCase() === "ALL") return aggregateProven ? "ALL" : null;
    return normalized;
  };
  const branch = normalizeDimension(raw?.branch ?? raw?.branchScope);
  const channel = normalizeDimension(raw?.channel ?? raw?.channelScope);
  const accountQualifier = safeText(
    raw?.account ??
    raw?.account_id ??
    raw?.accountId ??
    raw?.cash_location ??
    raw?.cashLocation
  );
  return {
    branch,
    channel,
    aggregate_proven: aggregateProven,
    account_scoped: Boolean(accountQualifier),
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

function maxAsOf(values) {
  let selected = null;
  let selectedTime = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (!isIsoTimestampWithZone(value)) continue;
    const time = Date.parse(value);
    if (time > selectedTime) {
      selected = value;
      selectedTime = time;
    }
  }
  return selected;
}

function worstQuality(qualities) {
  const normalized = qualities
    .map((quality) => text(quality)?.toUpperCase())
    .filter(Boolean);
  for (const quality of CASH_BRIDGE_QUALITY_PRECEDENCE) {
    if (normalized.includes(quality)) return quality;
  }
  return "GAP";
}

function normalizeCoverage(raw) {
  let source = raw;
  if (typeof raw === "boolean") {
    source = { status: raw ? "COMPLETE" : "MISSING" };
  } else if (typeof raw === "string") {
    source = { status: raw };
  } else if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    source = {};
  }

  const declaredStatus = normalizeEnum(source.status, CASH_BRIDGE_COVERAGE_STATES);
  const sourceCoverage = Array.isArray(source.source_coverage ?? source.sourceCoverage)
    ? (source.source_coverage ?? source.sourceCoverage)
        .map((entry) => {
          const label = safeText(entry?.source ?? entry?.label);
          const status = normalizeEnum(entry?.status, SOURCE_COVERAGE_STATES);
          if (!label || !status) return null;
          return {
            source: label,
            status,
            required: entry?.required !== false,
            as_of: isIsoTimestampWithZone(entry?.as_of ?? entry?.asOf)
              ? (entry.as_of ?? entry.asOf)
              : null,
            lineage: safeList(entry?.lineage)
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.source.localeCompare(b.source) || a.status.localeCompare(b.status))
    : [];

  const requiredSources = sourceCoverage.filter((entry) => entry.required);
  const requiredNotConnected = requiredSources.some((entry) => entry.status === "NOT_CONNECTED");
  const requiredIncomplete = requiredSources.some((entry) => entry.status !== "COMPLETE");

  let status = declaredStatus || "MISSING";
  if (status === "COMPLETE" && requiredIncomplete) status = "PARTIAL";

  const diagnostics = safeList(source.diagnostics);
  if (!declaredStatus) diagnostics.push("MISSING_EVENT_SOURCE_COVERAGE");
  if (requiredNotConnected) diagnostics.push("REQUIRED_EVENT_SOURCE_NOT_CONNECTED");
  if (declaredStatus === "COMPLETE" && requiredIncomplete) {
    diagnostics.push("COVERAGE_COMPLETE_CONTRADICTS_SOURCE_STATUS");
  }

  return {
    status,
    declared_status: declaredStatus,
    source_coverage: sourceCoverage,
    as_of: isIsoTimestampWithZone(source.as_of ?? source.asOf)
      ? (source.as_of ?? source.asOf)
      : null,
    lineage: safeList(source.lineage),
    diagnostics: [...new Set(diagnostics)].sort(),
    required_not_connected: requiredNotConnected
  };
}

function bridgeFailureTruth({
  metric,
  targetPeriod,
  targetScope,
  pointDate = null,
  quality = "GAP",
  reason,
  lineage = []
}) {
  const period = pointDate
    ? { start: pointDate, end: pointDate, timezone: targetPeriod.timezone }
    : {
        start: targetPeriod.start,
        end: targetPeriod.end,
        timezone: targetPeriod.timezone
      };

  return normalizeFinancialTruth({
    period,
    scope: targetScope,
    group: "CASH",
    metric,
    value: null,
    quality,
    source: DERIVED_SOURCE,
    as_of: null,
    reconciliation_status: "UNKNOWN",
    evidence: [],
    lineage: ["CASH_BRIDGE_V1", ...lineage],
    message: "Cash Bridge dependency is incomplete.",
    reason
  });
}

function normalizeBalanceTruth(raw, {
  metric,
  pointDate,
  targetPeriod,
  targetScope,
  missingReason
}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return bridgeFailureTruth({
      metric,
      targetPeriod,
      targetScope,
      pointDate,
      reason: missingReason
    });
  }

  const suppliedGroup = text(raw.group)?.toUpperCase();
  const suppliedMetric = text(raw.metric);
  if (suppliedGroup && suppliedGroup !== "CASH") {
    return bridgeFailureTruth({
      metric,
      targetPeriod,
      targetScope,
      pointDate,
      reason: "INVALID_BALANCE_GROUP"
    });
  }
  if (suppliedMetric && suppliedMetric !== metric) {
    return bridgeFailureTruth({
      metric,
      targetPeriod,
      targetScope,
      pointDate,
      reason: "INVALID_BALANCE_METRIC"
    });
  }

  const truth = normalizeFinancialTruth({
    period: raw.period,
    scope: raw.scope,
    group: suppliedGroup || "CASH",
    metric: suppliedMetric || metric,
    value: raw.value,
    quality: raw.quality,
    source: raw.source,
    as_of: raw.as_of ?? raw.asOf,
    reconciliation_status: raw.reconciliation_status ?? raw.reconciliationStatus,
    evidence: raw.evidence,
    lineage: raw.lineage,
    message: raw.message,
    reason: raw.reason
  });

  if (truth.quality !== "ACTUAL" && truth.quality !== "ESTIMATE") {
    return truth;
  }

  if (
    truth.period.start !== pointDate ||
    truth.period.end !== pointDate ||
    truth.period.timezone !== targetPeriod.timezone
  ) {
    return bridgeFailureTruth({
      metric,
      targetPeriod,
      targetScope,
      pointDate,
      reason: "BALANCE_PERIOD_MISMATCH",
      lineage: truth.lineage
    });
  }

  if (!sameScope(truth.scope, targetScope)) {
    return bridgeFailureTruth({
      metric,
      targetPeriod,
      targetScope,
      pointDate,
      reason: "BALANCE_SCOPE_MISMATCH",
      lineage: truth.lineage
    });
  }

  return truth;
}

function normalizeEventInput(raw = {}) {
  if (raw?.amount_truth && typeof raw.amount_truth === "object") {
    const truth = raw.amount_truth;
    if (
      truth.group && truth.group !== "CASH" ||
      truth.metric && truth.metric !== "cash_movement_amount"
    ) {
      return diagnosticResult({
        raw: {
          ...raw,
          period: truth.period,
          scope: truth.scope,
          source: truth.source,
          as_of: truth.as_of,
          reconciliation_status: truth.reconciliation_status,
          evidence: truth.evidence,
          lineage: truth.lineage
        },
        direction: normalizeEnum(raw.direction, CASH_EVENT_DIRECTIONS),
        category: text(raw.category)?.toUpperCase() || null,
        paymentMethod: normalizeEnum(raw.payment_method, CASH_PAYMENT_METHODS),
        location: safeLocation(raw.cash_location),
        reason: "INVALID_CASH_EVENT_TRUTH_IDENTITY"
      });
    }

    return normalizeCashEvent({
      event_id: raw.event_id,
      direction: raw.direction,
      category: raw.category,
      event_date: raw.event_date,
      period: truth.period,
      scope: truth.scope,
      payment_method: raw.payment_method,
      cash_location: raw.cash_location,
      status: raw.status,
      cash_movement_proven: raw.cash_movement_proven,
      proof_basis: raw.proof_basis,
      amount: truth.value,
      quality: truth.quality,
      source: truth.source,
      as_of: truth.as_of,
      reconciliation_status: truth.reconciliation_status,
      evidence: truth.evidence,
      lineage: truth.lineage,
      message: truth.message,
      reason: truth.reason
    });
  }
  return normalizeCashEvent(raw);
}

function eventFingerprint(event) {
  return JSON.stringify({
    direction: event.direction,
    category: event.category,
    event_date: event.event_date,
    scope: event.scope,
    payment_method: event.payment_method,
    cash_location: event.cash_location,
    status: event.status,
    cash_movement_proven: event.cash_movement_proven,
    proof_basis: event.proof_basis,
    amount_truth: event.amount_truth,
    consolidated_role: event.consolidated_role
  });
}

function eventSortKey(event) {
  return [
    event.event_date || "",
    event.direction || "",
    event.category || "",
    event.event_id || "",
    eventFingerprint(event)
  ].join("|");
}

function eventCompatibilityDiagnostics(event, targetPeriod, targetScope) {
  const diagnostics = [];
  const truth = event.amount_truth || {};
  const period = truth.period || {};

  if (
    period.start &&
    period.end &&
    (
      period.start < targetPeriod.start ||
      period.end > targetPeriod.end
    )
  ) {
    diagnostics.push("EVENT_PERIOD_OUTSIDE_TARGET");
  }
  if (period.timezone && period.timezone !== targetPeriod.timezone) {
    diagnostics.push("EVENT_TIMEZONE_MISMATCH");
  }
  if (truth.scope && !sameScope(truth.scope, targetScope)) {
    diagnostics.push("EVENT_SCOPE_MISMATCH");
  }
  return diagnostics;
}

function isConsolidatedTarget(scope, accountScoped = false) {
  return Boolean(
    !accountScoped &&
    scope?.aggregate_proven === true &&
    scope?.branch === "ALL" &&
    scope?.channel === "ALL"
  );
}

function normalizeAndDeduplicateEvents(rawEvents, targetPeriod, targetScope, accountScoped = false) {
  const rawList = Array.isArray(rawEvents) ? rawEvents : [];
  const normalized = rawList.map(normalizeEventInput);

  const byId = new Map();
  const noId = [];
  for (const event of normalized) {
    if (!event.event_id) {
      noId.push(event);
      continue;
    }
    const entries = byId.get(event.event_id) || [];
    entries.push(event);
    byId.set(event.event_id, entries);
  }

  const diagnostics = [];
  const kept = [...noId];
  for (const entries of byId.values()) {
    const fingerprints = [...new Set(entries.map(eventFingerprint))];
    if (fingerprints.length === 1) {
      kept.push(entries[0]);
    } else {
      diagnostics.push("DUPLICATE_EVENT_ID_CONFLICT");
    }
  }

  kept.sort((a, b) => eventSortKey(a).localeCompare(eventSortKey(b)));

  const numericEvents = [];
  const failureQualities = [];
  let transferAmbiguous = false;

  for (const event of kept) {
    for (const item of event.diagnostics || []) diagnostics.push(item);
    const compatibility = eventCompatibilityDiagnostics(event, targetPeriod, targetScope);
    diagnostics.push(...compatibility);

    const truth = event.amount_truth || {};
    const numericQuality = truth.quality === "ACTUAL" || truth.quality === "ESTIMATE";
    const numericValue = typeof truth.value === "number" && Number.isFinite(truth.value) && truth.value > 0;
    const compatible = compatibility.length === 0;

    if (event.direction === "TRANSFER" && event.category === "INTERNAL_TRANSFER") {
      if (!isConsolidatedTarget(targetScope, accountScoped)) {
        transferAmbiguous = true;
        diagnostics.push("TRANSFER_SCOPE_AMBIGUOUS_UNSUPPORTED_V1");
        failureQualities.push("GAP");
        continue;
      }
      if (!numericQuality || !numericValue || !compatible) {
        if (truth.quality === "NOT_CONNECTED") {
          diagnostics.push("TRANSFER_SOURCE_NOT_CONNECTED");
        } else if (!compatible) {
          diagnostics.push("TRANSFER_INPUT_INCOMPATIBLE");
        } else {
          diagnostics.push("TRANSFER_EVENT_NOT_NUMERIC");
        }
        continue;
      }
      numericEvents.push(event);
      continue;
    }

    if (!compatible) {
      failureQualities.push("GAP");
      continue;
    }

    if (!numericQuality || !numericValue) {
      const quality = truth.quality === "NOT_CONNECTED" ? "NOT_CONNECTED" : "GAP";
      failureQualities.push(quality);
      diagnostics.push(
        quality === "NOT_CONNECTED"
          ? "EVENT_SOURCE_NOT_CONNECTED"
          : "EVENT_DEPENDENCY_GAP"
      );
      continue;
    }

    numericEvents.push(event);
  }

  if (diagnostics.includes("DUPLICATE_EVENT_ID_CONFLICT")) {
    failureQualities.push("GAP");
  }

  return {
    events: kept,
    numeric_events: numericEvents,
    failure_qualities: failureQualities,
    transfer_ambiguous: transferAmbiguous,
    diagnostics: [...new Set(diagnostics)].sort()
  };
}

function eventLineage(events) {
  return [...new Set(events.flatMap((event) => event.amount_truth?.lineage || []).filter(Boolean))].sort();
}

function derivedNumericTruth({
  metric,
  period,
  scope,
  value,
  quality,
  asOf,
  lineage,
  evidence = [],
  reason,
  message
}) {
  return normalizeFinancialTruth({
    period,
    scope,
    group: "CASH",
    metric,
    value,
    quality,
    source: DERIVED_SOURCE,
    as_of: asOf,
    reconciliation_status: quality === "ACTUAL" ? "RECONCILED" : "PARTIAL",
    evidence,
    lineage: ["CASH_BRIDGE_V1", ...lineage],
    message,
    reason
  });
}

function knownSum({
  direction,
  events,
  coverage,
  targetPeriod,
  targetScope,
  fallbackAsOf,
  directionFailureQualities
}) {
  const selected = events.filter((event) => event.direction === direction);
  const metric = direction === "INFLOW"
    ? "known_evidenced_cash_inflows"
    : "known_evidenced_cash_outflows";

  if (selected.length > 0) {
    const quality = worstQuality(selected.map((event) => event.amount_truth.quality));
    const value = selected.reduce((sum, event) => sum + event.amount_truth.value, 0);
    return derivedNumericTruth({
      metric,
      period: targetPeriod,
      scope: targetScope,
      value,
      quality,
      asOf: maxAsOf([
        ...selected.map((event) => event.amount_truth.as_of),
        coverage.as_of,
        fallbackAsOf
      ]),
      lineage: [...eventLineage(selected), ...coverage.lineage],
      evidence: [
        "KNOWN_EVIDENCED_CASH_EVENTS",
        `EVENT_COVERAGE:${coverage.status}`
      ],
      reason: coverage.status === "COMPLETE"
        ? "KNOWN_EVIDENCED_SUM_COMPLETE_COVERAGE"
        : "KNOWN_EVIDENCED_SUM_INCOMPLETE_COVERAGE",
      message: "Exact sum of evidenced cash events; period completeness is represented separately by coverage."
    });
  }

  if (
    coverage.status === "COMPLETE" &&
    directionFailureQualities.length === 0
  ) {
    return derivedNumericTruth({
      metric,
      period: targetPeriod,
      scope: targetScope,
      value: 0,
      quality: "ACTUAL",
      asOf: maxAsOf([coverage.as_of, fallbackAsOf]),
      lineage: [...coverage.lineage, "EVENT_COVERAGE:COMPLETE"],
      evidence: ["EVENT_COVERAGE:COMPLETE", "NO_EVIDENCED_EVENTS_FOR_DIRECTION"],
      reason: "COMPLETE_COVERAGE_PROVES_ZERO_KNOWN_MOVEMENT",
      message: "Complete event coverage proves no cash movement for this direction."
    });
  }

  const failureQuality = directionFailureQualities.length
    ? worstQuality(directionFailureQualities)
    : coverage.required_not_connected
      ? "NOT_CONNECTED"
      : "GAP";

  return bridgeFailureTruth({
    metric,
    targetPeriod,
    targetScope,
    quality: failureQuality,
    reason: coverage.status === "COMPLETE"
      ? "NO_VALID_EVIDENCED_EVENTS"
      : "INCOMPLETE_EVENT_COVERAGE"
  });
}

function categorizedKnown(events, direction, targetPeriod, targetScope, coverage) {
  const categories = CASH_EVENT_CATEGORIES[direction];
  const result = [];
  for (const category of categories) {
    const selected = events.filter(
      (event) => event.direction === direction && event.category === category
    );
    if (selected.length === 0) continue;
    const quality = worstQuality(selected.map((event) => event.amount_truth.quality));
    const amount = selected.reduce((sum, event) => sum + event.amount_truth.value, 0);
    const metric = `known_evidenced_${direction.toLowerCase()}_${category.toLowerCase()}`;
    result.push({
      category,
      event_count: selected.length,
      amount_truth: derivedNumericTruth({
        metric,
        period: targetPeriod,
        scope: targetScope,
        value: amount,
        quality,
        asOf: maxAsOf([
          ...selected.map((event) => event.amount_truth.as_of),
          coverage.as_of
        ]),
        lineage: [...eventLineage(selected), ...coverage.lineage],
        evidence: ["KNOWN_EVIDENCED_CASH_EVENTS"],
        reason: "CATEGORY_KNOWN_EVIDENCED_SUM",
        message: "Exact sum of evidenced events in this cash category."
      })
    });
  }
  return result;
}

function transferSummary(
  events,
  targetPeriod,
  targetScope,
  coverage,
  fallbackAsOf,
  accountScoped = false
) {
  const transfers = events.filter(
    (event) =>
      event.direction === "TRANSFER" &&
      event.category === "INTERNAL_TRANSFER"
  );
  const numericTransfers = transfers.filter((event) => {
    const truth = event.amount_truth || {};
    return (
      (truth.quality === "ACTUAL" || truth.quality === "ESTIMATE") &&
      typeof truth.value === "number" &&
      Number.isFinite(truth.value) &&
      truth.value > 0
    );
  });
  const consolidatedNeutral = isConsolidatedTarget(targetScope, accountScoped);

  if (numericTransfers.length === 0) {
    const failedQuality = transfers.some(
      (event) => event.amount_truth?.quality === "NOT_CONNECTED"
    )
      ? "NOT_CONNECTED"
      : transfers.length > 0
        ? "GAP"
        : null;

    return {
      event_count: transfers.length,
      consolidated_neutral: consolidatedNeutral,
      known_evidenced_amount: failedQuality
        ? bridgeFailureTruth({
            metric: "known_evidenced_internal_transfer",
            targetPeriod,
            targetScope,
            quality: failedQuality,
            reason: consolidatedNeutral
              ? "INTERNAL_TRANSFER_AMOUNT_NOT_EVIDENCED"
              : "TRANSFER_SCOPE_AMBIGUOUS_UNSUPPORTED_V1"
          })
        : coverage.status === "COMPLETE"
          ? derivedNumericTruth({
              metric: "known_evidenced_internal_transfer",
              period: targetPeriod,
              scope: targetScope,
              value: 0,
              quality: "ACTUAL",
              asOf: maxAsOf([coverage.as_of, fallbackAsOf]),
              lineage: [...coverage.lineage, "EVENT_COVERAGE:COMPLETE"],
              evidence: ["EVENT_COVERAGE:COMPLETE"],
              reason: "NO_EVIDENCED_INTERNAL_TRANSFER",
              message: "No evidenced internal transfer under complete coverage."
            })
          : bridgeFailureTruth({
              metric: "known_evidenced_internal_transfer",
              targetPeriod,
              targetScope,
              reason: "INCOMPLETE_EVENT_COVERAGE"
            }),
      events: transfers
    };
  }

  const amount = numericTransfers.reduce(
    (sum, event) => sum + event.amount_truth.value,
    0
  );
  const quality = worstQuality(
    numericTransfers.map((event) => event.amount_truth.quality)
  );
  return {
    event_count: transfers.length,
    consolidated_neutral: consolidatedNeutral,
    known_evidenced_amount: derivedNumericTruth({
      metric: "known_evidenced_internal_transfer",
      period: targetPeriod,
      scope: targetScope,
      value: amount,
      quality,
      asOf: maxAsOf([
        ...numericTransfers.map((event) => event.amount_truth.as_of),
        coverage.as_of,
        fallbackAsOf
      ]),
      lineage: [...eventLineage(numericTransfers), ...coverage.lineage],
      evidence: ["KNOWN_EVIDENCED_INTERNAL_TRANSFER"],
      reason: consolidatedNeutral
        ? "INTERNAL_TRANSFER_NEUTRAL_FOR_CONSOLIDATED_BRIDGE"
        : "INTERNAL_TRANSFER_SCOPE_UNSUPPORTED_FOR_ARITHMETIC",
      message: consolidatedNeutral
        ? "Internal transfer amount is reported but excluded from consolidated inflow/outflow totals."
        : "Internal transfer amount is evidenced but V1 does not infer its net effect for scoped arithmetic."
    }),
    events: transfers
  };
}

function componentFailureQuality(truth) {
  return truth?.quality === "NOT_CONNECTED"
    ? "NOT_CONNECTED"
    : truth?.quality === "GAP"
      ? "GAP"
      : null;
}

export function calculateCashBridge({
  targetPeriod: rawTargetPeriod,
  target_period: rawTargetPeriodSnake,
  scope: rawScope,
  openingBalance,
  opening_balance: openingBalanceSnake,
  observedEndingBalance,
  observed_ending_balance: observedEndingBalanceSnake,
  events,
  coverage: rawCoverage
} = {}) {
  const targetPeriodState = normalizeTargetPeriod(rawTargetPeriod ?? rawTargetPeriodSnake ?? {});
  const targetScopeState = normalizeTargetScope(rawScope ?? {});
  const targetPeriod = {

import {
  CASH_BALANCE_TRUTH_SCHEMA_VERSION,
  cashBalanceTruthForBridge,
  normalizeCashBalanceTruth
} from "./cash-balance-truth-v1.mjs";
import {
  CASH_BALANCE_SOURCE_MAPPER_VERSION,
  mapCashBalanceSourceFact
} from "./cash-balance-source-mapper-v1.mjs";
import {
  evaluateCashSourceCoverage,
  cashSourceCoverageForBridge
} from "./cash-source-coverage-v1.mjs";
import { calculateCashBridge } from "./cash-bridge-v1.mjs";
import { normalizeFinancialTruth } from "./financial-truth-v1.mjs";

export const CASH_BRIDGE_SOURCE_INTEGRATION_VERSION =
  "cash-bridge-source-integration.v1";

function text(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
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
  const aggregateProven =
    raw?.aggregate_proven === true || raw?.aggregateProven === true;
  const dimension = (value) => {
    const normalized = text(value);
    if (!normalized) return null;
    if (normalized.toUpperCase() === "ALL") {
      return aggregateProven ? "ALL" : null;
    }
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

function samePeriod(left = {}, right = {}) {
  return (
    left?.start === right?.start &&
    left?.end === right?.end &&
    left?.timezone === right?.timezone
  );
}

function sameScope(left = {}, right = {}) {
  return (
    left?.branch === right?.branch &&
    left?.channel === right?.channel &&
    left?.aggregate_proven === right?.aggregate_proven
  );
}

function isNumericTruth(truth) {
  return Boolean(
    truth &&
    (truth.quality === "ACTUAL" || truth.quality === "ESTIMATE") &&
    typeof truth.value === "number" &&
    Number.isFinite(truth.value)
  );
}

function failureTruth({
  metric,
  date,
  targetPeriod,
  targetScope,
  quality,
  reason,
  asOf = null,
  lineage = []
}) {
  return normalizeFinancialTruth({
    period: {
      start: date,
      end: date,
      timezone: targetPeriod.timezone
    },
    scope: targetScope,
    group: "CASH",
    metric,
    value: null,
    quality,
    source: {
      class: "CASH_BRIDGE_SOURCE_INTEGRATION",
      label: "POINT_COVERAGE_GATE"
    },
    as_of: asOf,
    reconciliation_status: "UNKNOWN",
    evidence: [],
    lineage: [
      "CASH_BRIDGE_SOURCE_INTEGRATION_V1",
      ...lineage
    ],
    message: "Cash point dependency failed closed at source integration.",
    reason
  });
}

function canonicalBalanceFromInput(raw, {
  expectedRole,
  targetDate,
  targetPeriod,
  targetScope
}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      mapped: null,
      balance: null,
      diagnostics: [`MISSING_${expectedRole}_SOURCE`]
    };
  }

  const options = {
    targetPoint: {
      date: targetDate,
      timezone: targetPeriod.timezone
    },
    targetScope
  };

  const looksMappedOrSourceFact = Boolean(
    raw.mapper_version ||
    raw.source_class ||
    raw.sourceClass ||
    raw.classification ||
    raw.fact_kind ||
    raw.factKind ||
    raw.source_status ||
    raw.sourceStatus
  );

  if (looksMappedOrSourceFact) {
    const mapped = mapCashBalanceSourceFact(raw, options);
    return {
      mapped,
      balance: mapped?.balance ?? null,
      diagnostics: Array.isArray(mapped?.diagnostics)
        ? mapped.diagnostics
        : []
    };
  }

  const looksCanonicalBalance = Boolean(
    raw.schema_version === CASH_BALANCE_TRUTH_SCHEMA_VERSION ||
    raw.balance_role ||
    raw.balanceRole ||
    raw.balance_basis ||
    raw.balanceBasis ||
    raw.truth
  );

  if (looksCanonicalBalance) {
    const balance = normalizeCashBalanceTruth(raw, options);
    return {
      mapped: null,
      balance,
      diagnostics: Array.isArray(balance?.diagnostics)
        ? balance.diagnostics
        : []
    };
  }

  const mapped = mapCashBalanceSourceFact(raw, options);
  return {
    mapped,
    balance: mapped?.balance ?? null,
    diagnostics: Array.isArray(mapped?.diagnostics)
      ? mapped.diagnostics
      : []
  };
}

function evaluateCoverage(raw, {
  expectedRole,
  targetPeriod,
  targetScope,
  label
}) {
  const evaluated = evaluateCashSourceCoverage(
    raw && typeof raw === "object" ? raw : {}
  );
  const diagnostics = [...(evaluated.diagnostics || [])];

  const roleCompatible = evaluated.coverage_role === expectedRole;
  const periodCompatible = samePeriod(evaluated.target_period, targetPeriod);
  const scopeCompatible = sameScope(evaluated.scope, targetScope);

  if (!roleCompatible) diagnostics.push(`${label}_COVERAGE_ROLE_MISMATCH`);
  if (!periodCompatible) diagnostics.push(`${label}_COVERAGE_TARGET_PERIOD_MISMATCH`);
  if (!scopeCompatible) diagnostics.push(`${label}_COVERAGE_SCOPE_MISMATCH`);

  return {
    evaluated,
    compatible: roleCompatible && periodCompatible && scopeCompatible,
    diagnostics: [...new Set(diagnostics.filter(Boolean))].sort()
  };
}

function balanceIdentityMatches(left, right) {
  if (!left || !right) return false;
  const leftTruth = left.truth || {};
  const rightTruth = right.truth || {};
  return (
    left.balance_role === right.balance_role &&
    left.balance_basis === right.balance_basis &&
    left.point?.date === right.point?.date &&
    left.point?.timezone === right.point?.timezone &&
    left.point?.timestamp === right.point?.timestamp &&
    left.account?.class === right.account?.class &&
    left.account?.label === right.account?.label &&
    left.account?.aggregate_proven === right.account?.aggregate_proven &&
    sameScope(leftTruth.scope, rightTruth.scope) &&
    leftTruth.group === rightTruth.group &&
    leftTruth.metric === rightTruth.metric &&
    Object.is(leftTruth.value, rightTruth.value) &&
    leftTruth.quality === rightTruth.quality &&
    leftTruth.source?.class === rightTruth.source?.class &&
    leftTruth.source?.label === rightTruth.source?.label &&
    leftTruth.as_of === rightTruth.as_of
  );
}

function mappedBalanceCovered(balance, coverage) {
  if (!balance || !coverage || coverage.status !== "COMPLETE") return false;
  return (coverage.source_coverage || []).some((entry) => (
    entry.status === "COMPLETE" &&
    entry.coverage_proven === true &&
    balanceIdentityMatches(entry.balance, balance)
  ));
}

function aggregateBalanceCompatible(balance, targetScope) {
  const aggregateTarget =
    targetScope.branch === "ALL" || targetScope.channel === "ALL";
  if (!aggregateTarget) return true;
  return Boolean(
    balance?.account?.label === "ALL" &&
    balance?.account?.aggregate_proven === true &&
    balance?.truth?.scope?.aggregate_proven === true
  );
}

function gatePointBalance({
  balance,
  coverageState,
  expectedBalanceRole,
  metric,
  targetDate,
  targetPeriod,
  targetScope,
  label
}) {
  const diagnostics = [...coverageState.diagnostics];
  const coverage = coverageState.evaluated;
  const bridgeTruth = cashBalanceTruthForBridge(balance, expectedBalanceRole);

  if (!bridgeTruth) diagnostics.push(`${label}_BALANCE_INVALID`);
  if (bridgeTruth && !isNumericTruth(bridgeTruth)) {
    diagnostics.push(`${label}_BALANCE_NOT_NUMERIC_TRUTH`);
  }
  if (!aggregateBalanceCompatible(balance, targetScope)) {
    diagnostics.push(`${label}_AGGREGATE_BALANCE_NOT_PROVEN`);
  }
  if (
    coverageState.compatible &&
    coverage.status === "COMPLETE" &&
    !mappedBalanceCovered(balance, coverage)
  ) {
    diagnostics.push(`${label}_BALANCE_NOT_MATCHED_BY_COMPLETE_COVERAGE`);
  }

  const ready = Boolean(
    coverageState.compatible &&
    coverage.status === "COMPLETE" &&
    bridgeTruth &&
    isNumericTruth(bridgeTruth) &&
    aggregateBalanceCompatible(balance, targetScope) &&
    mappedBalanceCovered(balance, coverage)
  );

  if (ready) {
    return {
      ready: true,
      bridge_truth: bridgeTruth,
      diagnostics: [...new Set(diagnostics.filter(Boolean))].sort()
    };
  }

  const quality = coverage.required_not_connected === true
    ? "NOT_CONNECTED"
    : "GAP";

  return {
    ready: false,
    bridge_truth: failureTruth({
      metric,
      date: targetDate,
      targetPeriod,
      targetScope,
      quality,
      reason: coverage.required_not_connected === true
        ? `${label}_REQUIRED_SOURCE_NOT_CONNECTED`
        : `${label}_POINT_COVERAGE_INCOMPLETE`,
      asOf: coverage.as_of,
      lineage: [
        ...(balance?.truth?.lineage || []),
        ...(coverage.lineage || [])
      ]
    }),
    diagnostics: [...new Set(diagnostics.filter(Boolean))].sort()
  };
}

function movementCoverageForBridge(coverageState) {
  if (!coverageState.compatible) {
    return {
      status: "MISSING",
      source_coverage: [],
      as_of: coverageState.evaluated.as_of ?? null,
      lineage: [
        "CASH_BRIDGE_SOURCE_INTEGRATION_V1",
        ...(coverageState.evaluated.lineage || [])
      ]
    };
  }

  return cashSourceCoverageForBridge(coverageState.evaluated) ?? {
    status: "MISSING",
    source_coverage: [],
    as_of: coverageState.evaluated.as_of ?? null,
    lineage: [
      "CASH_BRIDGE_SOURCE_INTEGRATION_V1",
      ...(coverageState.evaluated.lineage || [])
    ]
  };
}

function componentSummary({
  openingGate,
  movementCoverage,
  endingGate
}) {
  return {
    opening_ready: openingGate.ready,
    movement_ready: movementCoverage.status === "COMPLETE",
    ending_ready: endingGate.ready,
    opening_quality: openingGate.bridge_truth?.quality ?? "GAP",
    movement_status: movementCoverage.status,
    ending_quality: endingGate.bridge_truth?.quality ?? "GAP"
  };
}

export function integrateCashBridgeSources({
  targetPeriod: rawTargetPeriod,
  target_period: rawTargetPeriodSnake,
  scope: rawScope,
  openingSource,
  opening_source: openingSourceSnake,
  openingBalance,
  opening_balance: openingBalanceSnake,
  openingCoverage,
  opening_coverage: openingCoverageSnake,
  cashEvents,
  cash_events: cashEventsSnake,
  events,
  movementCoverage,
  movement_coverage: movementCoverageSnake,
  observedEndingSource,
  observed_ending_source: observedEndingSourceSnake,
  observedEndingBalance,
  observed_ending_balance: observedEndingBalanceSnake,
  endingCoverage,
  ending_coverage: endingCoverageSnake
} = {}) {
  const periodState = normalizeTargetPeriod(
    rawTargetPeriod ?? rawTargetPeriodSnake ?? {}
  );
  const scopeState = normalizeTargetScope(rawScope ?? {});
  const targetPeriod = {
    start: periodState.start,
    end: periodState.end,
    timezone: periodState.timezone
  };
  const targetScope = {
    branch: scopeState.branch,
    channel: scopeState.channel,
    aggregate_proven: scopeState.aggregate_proven
  };

  const integrationDiagnostics = [];
  if (!periodState.valid) integrationDiagnostics.push("INVALID_TARGET_PERIOD");
  if (!scopeState.valid) integrationDiagnostics.push("INVALID_TARGET_SCOPE");

  const openingInput =
    openingSource ??
    openingSourceSnake ??
    openingBalance ??
    openingBalanceSnake ??
    null;
  const endingInput =
    observedEndingSource ??
    observedEndingSourceSnake ??
    observedEndingBalance ??
    observedEndingBalanceSnake ??
    null;

  const openingComponent = canonicalBalanceFromInput(openingInput, {
    expectedRole: "OPENING",
    targetDate: targetPeriod.start,
    targetPeriod,
    targetScope
  });
  const endingComponent = canonicalBalanceFromInput(endingInput, {
    expectedRole: "OBSERVED_ENDING",
    targetDate: targetPeriod.end,
    targetPeriod,
    targetScope
  });

  const openingCoverageState = evaluateCoverage(
    openingCoverage ?? openingCoverageSnake ?? {},
    {
      expectedRole: "OPENING_BALANCE",
      targetPeriod,
      targetScope,
      label: "OPENING"
    }
  );
  const movementCoverageState = evaluateCoverage(
    movementCoverage ?? movementCoverageSnake ?? {},
    {
      expectedRole: "MOVEMENT_EVENTS",
      targetPeriod,
      targetScope,
      label: "MOVEMENT"
    }
  );
  const endingCoverageState = evaluateCoverage(
    endingCoverage ?? endingCoverageSnake ?? {},
    {
      expectedRole: "OBSERVED_ENDING_BALANCE",
      targetPeriod,
      targetScope,
      label: "ENDING"
    }
  );

  const openingGate = gatePointBalance({
    balance: openingComponent.balance,
    coverageState: openingCoverageState,
    expectedBalanceRole: "OPENING",
    metric: "cash_opening_balance",
    targetDate: targetPeriod.start,
    targetPeriod,
    targetScope,
    label: "OPENING"
  });
  const endingGate = gatePointBalance({
    balance: endingComponent.balance,
    coverageState: endingCoverageState,
    expectedBalanceRole: "OBSERVED_ENDING",
    metric: "cash_observed_ending_balance",
    targetDate: targetPeriod.end,
    targetPeriod,
    targetScope,
    label: "ENDING"
  });

  const bridgeCoverage = movementCoverageForBridge(movementCoverageState);
  const inputEvents =
    events ??
    cashEvents ??
    cashEventsSnake ??
    [];

  const bridge = calculateCashBridge({
    targetPeriod,
    scope: targetScope,
    openingBalance: openingGate.bridge_truth,
    observedEndingBalance: endingGate.bridge_truth,
    events: Array.isArray(inputEvents) ? inputEvents : [],
    coverage: bridgeCoverage
  });

  const readiness = componentSummary({
    openingGate,
    movementCoverage: bridgeCoverage,
    endingGate
  });

  const diagnostics = [...new Set([
    ...integrationDiagnostics,
    ...openingComponent.diagnostics,
    ...endingComponent.diagnostics,
    ...openingGate.diagnostics,
    ...movementCoverageState.diagnostics,
    ...endingGate.diagnostics,
    ...(bridge.diagnostics || [])
  ].filter(Boolean))].sort();

  const lineage = [...new Set([
    "CASH_BRIDGE_SOURCE_INTEGRATION_V1",
    ...(openingComponent.balance?.truth?.lineage || []),
    ...(openingCoverageState.evaluated.lineage || []),
    ...(movementCoverageState.evaluated.lineage || []),
    ...(endingComponent.balance?.truth?.lineage || []),
    ...(endingCoverageState.evaluated.lineage || []),
    ...(bridge.lineage || [])
  ].filter(Boolean))].sort();

  return {
    integration_version: CASH_BRIDGE_SOURCE_INTEGRATION_VERSION,
    target_period: targetPeriod,
    scope: targetScope,
    mapped_opening_component: openingComponent.mapped,
    canonical_opening_balance: openingComponent.balance,
    opening_coverage: openingCoverageState.evaluated,
    movement_coverage: movementCoverageState.evaluated,
    mapped_ending_component: endingComponent.mapped,
    canonical_ending_balance: endingComponent.balance,
    ending_coverage: endingCoverageState.evaluated,
    prepared_inputs: {
      opening_balance: openingGate.bridge_truth,
      observed_ending_balance: endingGate.bridge_truth,
      movement_coverage: bridgeCoverage,
      event_count: Array.isArray(inputEvents) ? inputEvents.length : 0
    },
    readiness,
    bridge,
    diagnostics,
    lineage
  };
}

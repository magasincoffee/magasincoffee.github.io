import {
  CASH_BALANCE_TRUTH_SCHEMA_VERSION,
  cashBalanceTruthForBridge,
  normalizeCashBalanceTruth
} from "./cash-balance-truth-v1.mjs";
import { mapCashBalanceSourceFact } from "./cash-balance-source-mapper-v1.mjs";
import {
  cashSourceCoverageForBridge,
  evaluateCashSourceCoverage
} from "./cash-source-coverage-v1.mjs";
import { calculateCashBridge } from "./cash-bridge-v1.mjs";
import { normalizeFinancialTruth } from "./financial-truth-v1.mjs";

export const CASH_BRIDGE_SOURCE_INTEGRATION_VERSION = "cash-bridge-source-integration.v1";

const POINT_ROLE = Object.freeze({
  OPENING: "OPENING_BALANCE",
  OBSERVED_ENDING: "OBSERVED_ENDING_BALANCE"
});

const POINT_METRIC = Object.freeze({
  OPENING: "cash_opening_balance",
  OBSERVED_ENDING: "cash_observed_ending_balance"
});

function targetState(targetPeriod = {}, scope = {}) {
  const probe = normalizeFinancialTruth({
    period: targetPeriod,
    scope,
    group: "CASH",
    metric: "cash_bridge_source_integration_target",
    value: null,
    quality: "GAP",
    source: {
      class: "CASH_BRIDGE_SOURCE_INTEGRATION",
      label: "TARGET_VALIDATION"
    },
    as_of: null,
    reconciliation_status: "UNKNOWN",
    evidence: [],
    lineage: ["CASH_BRIDGE_SOURCE_INTEGRATION_V1"]
  });

  const period = probe.period;
  const normalizedScope = probe.scope;
  const validPeriod = Boolean(
    period?.start &&
    period?.end &&
    period?.timezone &&
    period.start <= period.end
  );
  const validScope = Boolean(normalizedScope?.branch && normalizedScope?.channel);

  return {
    period,
    scope: normalizedScope,
    valid: validPeriod && validScope,
    diagnostics: [
      ...(validPeriod ? [] : ["INVALID_TARGET_PERIOD"]),
      ...(validScope ? [] : ["INVALID_TARGET_SCOPE"])
    ]
  };
}

function samePeriod(left = {}, right = {}) {
  return Boolean(
    left?.start === right?.start &&
    left?.end === right?.end &&
    left?.timezone === right?.timezone
  );
}

function sameScope(left = {}, right = {}) {
  return Boolean(
    left?.branch === right?.branch &&
    left?.channel === right?.channel &&
    left?.aggregate_proven === right?.aggregate_proven
  );
}

function canonicalObject(value) {
  if (Array.isArray(value)) return value.map(canonicalObject);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalObject(value[key])])
  );
}

function sameCanonicalBalance(left, right) {
  if (!left || !right) return false;
  return JSON.stringify(canonicalObject(left)) === JSON.stringify(canonicalObject(right));
}

function canonicalBalanceComponent(raw, expectedRole, target) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      source_kind: "MISSING",
      source_class: null,
      classification: null,
      balance: null,
      source_status: "FAIL_CLOSED",
      diagnostics: ["MISSING_BALANCE_SOURCE"],
      lineage: []
    };
  }

  const targetPoint = {
    date: expectedRole === "OPENING" ? target.period.start : target.period.end,
    timezone: target.period.timezone
  };

  if (raw.schema_version === CASH_BALANCE_TRUTH_SCHEMA_VERSION) {
    const balance = normalizeCashBalanceTruth(raw, {
      targetPoint,
      targetScope: target.scope
    });
    const truth = cashBalanceTruthForBridge(balance, expectedRole);
    const sourceStatus = truth?.quality === "NOT_CONNECTED"
      ? "NOT_CONNECTED"
      : truth?.quality === "ACTUAL" || truth?.quality === "ESTIMATE"
        ? "MAPPED"
        : "FAIL_CLOSED";

    return {
      source_kind: "CANONICAL_BALANCE",
      source_class: null,
      classification: balance?.balance_basis ?? null,
      balance,
      source_status: sourceStatus,
      diagnostics: Array.isArray(balance?.diagnostics) ? balance.diagnostics : [],
      lineage: Array.isArray(truth?.lineage) ? truth.lineage : []
    };
  }

  const mapped = mapCashBalanceSourceFact(raw, {
    targetPoint,
    targetScope: target.scope
  });

  return {
    source_kind: "SOURCE_MAPPER",
    ...mapped
  };
}

function coverageCompatibility(coverage, expectedRole, target) {
  const diagnostics = [];
  if (coverage?.coverage_role !== expectedRole) {
    diagnostics.push("COVERAGE_ROLE_MISMATCH");
  }
  if (!samePeriod(coverage?.target_period, target.period)) {
    diagnostics.push("COVERAGE_TARGET_PERIOD_MISMATCH");
  }
  if (!sameScope(coverage?.scope, target.scope)) {
    diagnostics.push("COVERAGE_TARGET_SCOPE_MISMATCH");
  }
  return {
    compatible: diagnostics.length === 0,
    diagnostics
  };
}

function componentCoverageMatch(component, coverage) {
  const balance = component?.balance;
  if (!balance) return { entry: null, represents_universe: false };

  const requiredMembers = (coverage?.account_universe?.accounts || [])
    .filter((member) => member?.required !== false);
  const requiredIds = new Set(
    requiredMembers.map((member) => member?.coverage_id).filter(Boolean)
  );

  const entry = (coverage?.source_coverage || []).find((candidate) => (
    candidate?.status === "COMPLETE" &&
    candidate?.coverage_proven === true &&
    requiredIds.has(candidate.coverage_id) &&
    (!component.source_class || candidate.source_class === component.source_class) &&
    sameCanonicalBalance(candidate.balance, balance)
  )) || null;

  return {
    entry,
    represents_universe: Boolean(entry && requiredMembers.length === 1)
  };
}

function requiredAccountKeys(coverage) {
  return [...new Set(
    (coverage?.account_universe?.accounts || [])
      .filter((member) => member?.required !== false)
      .map((member) => {
        const account = member?.account || {};
        const scope = member?.scope || {};
        if (!account.class || !account.label || !scope.branch || !scope.channel) return null;
        return [
          account.class,
          account.label,
          account.aggregate_proven === true ? "AGG" : "CONCRETE",
          scope.branch,
          scope.channel,
          scope.aggregate_proven === true ? "AGG" : "CONCRETE"
        ].join("|");
      })
      .filter(Boolean)
  )].sort();
}

function balanceAccountKey(component) {
  const account = component?.balance?.account || {};
  const scope = component?.balance?.truth?.scope || {};
  if (!account.class || !account.label || !scope.branch || !scope.channel) return null;
  return [
    account.class,
    account.label,
    account.aggregate_proven === true ? "AGG" : "CONCRETE",
    scope.branch,
    scope.channel,
    scope.aggregate_proven === true ? "AGG" : "CONCRETE"
  ].join("|");
}

function movementUniverseCoversPointComponent(component, movementCoverage) {
  const pointAccount = component?.balance?.account || {};
  if (
    pointAccount.label === "ALL" &&
    pointAccount.aggregate_proven === true
  ) {
    return movementCoverage?.account_universe?.universe_proven === true &&
      movementCoverage?.account_universe?.aggregate_proven === true;
  }

  const pointKey = balanceAccountKey(component);
  const movementKeys = requiredAccountKeys(movementCoverage);
  return Boolean(
    pointKey &&
    movementKeys.length > 0 &&
    movementKeys.every((key) => key === pointKey)
  );
}

function pointFailureQuality(component, coverage, compatibility) {
  const truth = component?.balance?.truth;
  if (truth?.quality === "NOT_CONNECTED") return "NOT_CONNECTED";
  if (
    compatibility.compatible &&
    coverage?.required_not_connected === true
  ) {
    return "NOT_CONNECTED";
  }
  return "GAP";
}

function pointFailureTruth({ role, target, quality, reason, lineage = [] }) {
  const pointDate = role === "OPENING" ? target.period.start : target.period.end;
  return normalizeFinancialTruth({
    period: {
      start: pointDate,
      end: pointDate,
      timezone: target.period.timezone
    },
    scope: target.scope,
    group: "CASH",
    metric: POINT_METRIC[role],
    value: null,
    quality,
    source: {
      class: "CASH_BRIDGE_SOURCE_INTEGRATION",
      label: "POINT_COVERAGE_GATE"
    },
    as_of: null,
    reconciliation_status: "UNKNOWN",
    evidence: [],
    lineage: ["CASH_BRIDGE_SOURCE_INTEGRATION_V1", ...lineage],
    reason,
    message: "Cash Bridge point dependency failed closed before arithmetic."
  }, {
    allowNegative: true
  });
}

function gatePointComponent({ role, component, rawCoverage, target }) {
  const expectedCoverageRole = POINT_ROLE[role];
  const coverage = evaluateCashSourceCoverage(rawCoverage ?? {});
  const compatibility = coverageCompatibility(coverage, expectedCoverageRole, target);
  const truth = cashBalanceTruthForBridge(component?.balance, role);
  const numericTruth = Boolean(
    truth &&
    (truth.quality === "ACTUAL" || truth.quality === "ESTIMATE") &&
    typeof truth.value === "number" &&
    Number.isFinite(truth.value)
  );
  const match = compatibility.compatible && coverage.status === "COMPLETE"
    ? componentCoverageMatch(component, coverage)
    : { entry: null, represents_universe: false };
  const matchedEntry = match.entry;

  const diagnostics = [
    ...compatibility.diagnostics,
    ...(Array.isArray(component?.diagnostics) ? component.diagnostics : []),
    ...(Array.isArray(coverage?.diagnostics) ? coverage.diagnostics : [])
  ];

  if (!numericTruth) diagnostics.push(role + "_BALANCE_TRUTH_INCOMPLETE");
  if (compatibility.compatible && coverage.status !== "COMPLETE") {
    diagnostics.push(role + "_POINT_COVERAGE_INCOMPLETE");
  }
  if (
    compatibility.compatible &&
    coverage.status === "COMPLETE" &&
    !matchedEntry
  ) {
    diagnostics.push(role + "_COMPONENT_NOT_COVERED_BY_REQUIRED_UNIVERSE");
  }
  if (
    compatibility.compatible &&
    coverage.status === "COMPLETE" &&
    matchedEntry &&
    !match.represents_universe
  ) {
    diagnostics.push(role + "_SINGLE_COMPONENT_CANNOT_REPRESENT_MULTI_ACCOUNT_UNIVERSE");
  }

  const ready = Boolean(
    target.valid &&
    compatibility.compatible &&
    coverage.status === "COMPLETE" &&
    numericTruth &&
    matchedEntry &&
    match.represents_universe
  );

  const bridgeTruth = ready
    ? truth
    : pointFailureTruth({
        role,
        target,
        quality: pointFailureQuality(component, coverage, compatibility),
        reason: role + "_POINT_DEPENDENCY_INCOMPLETE",
        lineage: [
          ...(Array.isArray(component?.lineage) ? component.lineage : []),
          ...(Array.isArray(coverage?.lineage) ? coverage.lineage : [])
        ]
      });

  return {
    coverage,
    bridge_truth: bridgeTruth,
    ready,
    matched_coverage_id: matchedEntry?.coverage_id ?? null,
    diagnostics: [...new Set(diagnostics.filter(Boolean))].sort()
  };
}

function movementGate(rawCoverage, target) {
  const coverage = evaluateCashSourceCoverage(rawCoverage ?? {});
  const compatibility = coverageCompatibility(coverage, "MOVEMENT_EVENTS", target);
  const bridgeCoverage = compatibility.compatible
    ? cashSourceCoverageForBridge(coverage)
    : null;

  return {
    coverage,
    bridge_coverage: bridgeCoverage,
    ready: Boolean(
      target.valid &&
      compatibility.compatible &&
      coverage.status === "COMPLETE" &&
      bridgeCoverage?.status === "COMPLETE"
    ),
    diagnostics: [...new Set([
      ...compatibility.diagnostics,
      ...(Array.isArray(coverage?.diagnostics) ? coverage.diagnostics : [])
    ].filter(Boolean))].sort()
  };
}

function readinessState(gate) {
  if (gate?.bridge_truth?.quality === "NOT_CONNECTED") return "NOT_CONNECTED";
  return gate?.ready ? "READY" : "GAP";
}

export function integrateCashBridgeSources({
  targetPeriod,
  scope,
  openingSource,
  openingCoverage,
  cashEvents,
  movementCoverage,
  observedEndingSource,
  endingCoverage
} = {}) {
  const target = targetState(targetPeriod, scope);
  const openingComponent = canonicalBalanceComponent(openingSource, "OPENING", target);
  const endingComponent = canonicalBalanceComponent(observedEndingSource, "OBSERVED_ENDING", target);

  const openingGate = gatePointComponent({
    role: "OPENING",
    component: openingComponent,
    rawCoverage: openingCoverage,
    target
  });
  const movement = movementGate(movementCoverage, target);
  const endingGate = gatePointComponent({
    role: "OBSERVED_ENDING",
    component: endingComponent,
    rawCoverage: endingCoverage,
    target
  });

  const openingMovementAccountCompatible = !movement.ready ||
    movementUniverseCoversPointComponent(openingComponent, movement.coverage);
  const endingMovementAccountCompatible = !movement.ready ||
    movementUniverseCoversPointComponent(endingComponent, movement.coverage);

  const bridgeOpeningTruth = openingGate.ready && !openingMovementAccountCompatible
    ? pointFailureTruth({
        role: "OPENING",
        target,
        quality: "GAP",
        reason: "OPENING_MOVEMENT_ACCOUNT_UNIVERSE_MISMATCH",
        lineage: [
          ...(Array.isArray(openingComponent.lineage) ? openingComponent.lineage : []),
          ...(Array.isArray(movement.coverage?.lineage) ? movement.coverage.lineage : [])
        ]
      })
    : openingGate.bridge_truth;

  const bridgeEndingTruth = endingGate.ready && !endingMovementAccountCompatible
    ? pointFailureTruth({
        role: "OBSERVED_ENDING",
        target,
        quality: "GAP",
        reason: "ENDING_MOVEMENT_ACCOUNT_UNIVERSE_MISMATCH",
        lineage: [
          ...(Array.isArray(endingComponent.lineage) ? endingComponent.lineage : []),
          ...(Array.isArray(movement.coverage?.lineage) ? movement.coverage.lineage : [])
        ]
      })
    : endingGate.bridge_truth;

  const bridge = calculateCashBridge({
    targetPeriod,
    scope,
    openingBalance: bridgeOpeningTruth,
    observedEndingBalance: bridgeEndingTruth,
    events: Array.isArray(cashEvents) ? cashEvents : [],
    coverage: movement.bridge_coverage
  });

  const diagnostics = [...new Set([
    ...target.diagnostics,
    ...openingGate.diagnostics,
    ...movement.diagnostics,
    ...endingGate.diagnostics,
    ...(openingMovementAccountCompatible ? [] : ["OPENING_MOVEMENT_ACCOUNT_UNIVERSE_MISMATCH"]),
    ...(endingMovementAccountCompatible ? [] : ["ENDING_MOVEMENT_ACCOUNT_UNIVERSE_MISMATCH"])
  ])].sort();

  const lineage = [...new Set([
    "CASH_BRIDGE_SOURCE_INTEGRATION_V1",
    ...(Array.isArray(openingComponent.lineage) ? openingComponent.lineage : []),
    ...(Array.isArray(openingGate.coverage?.lineage) ? openingGate.coverage.lineage : []),
    ...(Array.isArray(movement.coverage?.lineage) ? movement.coverage.lineage : []),
    ...(Array.isArray(endingComponent.lineage) ? endingComponent.lineage : []),
    ...(Array.isArray(endingGate.coverage?.lineage) ? endingGate.coverage.lineage : []),
    ...(Array.isArray(bridge?.lineage) ? bridge.lineage : [])
  ])].sort();

  return {
    integration_version: CASH_BRIDGE_SOURCE_INTEGRATION_VERSION,
    target_period: bridge.target_period,
    scope: bridge.scope,
    mapped_opening_component: openingComponent,
    opening_coverage: openingGate.coverage,
    movement_coverage: movement.coverage,
    mapped_ending_component: endingComponent,
    ending_coverage: endingGate.coverage,
    bridge_inputs: {
      opening_balance: bridgeOpeningTruth,
      movement_coverage: movement.bridge_coverage,
      observed_ending_balance: bridgeEndingTruth
    },
    bridge,
    readiness: {
      opening: readinessState(openingGate),
      movement: movement.ready
        ? "READY"
        : movement.bridge_coverage?.source_coverage?.some(
            (entry) => entry.required && entry.status === "NOT_CONNECTED"
          )
          ? "NOT_CONNECTED"
          : "GAP",
      observed_ending: readinessState(endingGate),
      computed_ending: typeof bridge?.computed_ending_balance?.value === "number"
        ? "READY"
        : bridge?.computed_ending_balance?.quality === "NOT_CONNECTED"
          ? "NOT_CONNECTED"
          : "GAP",
      variance: typeof bridge?.cash_variance?.value === "number"
        ? "READY"
        : bridge?.cash_variance?.quality === "NOT_CONNECTED"
          ? "NOT_CONNECTED"
          : "GAP"
    },
    diagnostics,
    lineage
  };
}

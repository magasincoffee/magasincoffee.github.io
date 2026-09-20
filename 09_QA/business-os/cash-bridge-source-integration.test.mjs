import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import {
  integrateCashBridgeSources,
  CASH_BRIDGE_SOURCE_INTEGRATION_VERSION
} from "../../02_CORE/shared/cash-bridge-source-integration-v1.mjs";
import {
  mapCashBalanceSourceFact
} from "../../02_CORE/shared/cash-balance-source-mapper-v1.mjs";

const PERIOD = Object.freeze({
  start: "2026-09-01",
  end: "2026-09-20",
  timezone: "Asia/Ho_Chi_Minh"
});

const SCOPE = Object.freeze({
  branch: "CN1",
  channel: "DIRECT",
  aggregate_proven: false
});

const START = Object.freeze({
  date: PERIOD.start,
  timezone: PERIOD.timezone,
  timestamp: "2026-09-01T00:00:00+07:00",
  boundary_proven: true
});

const END = Object.freeze({
  date: PERIOD.end,
  timezone: PERIOD.timezone,
  timestamp: "2026-09-20T23:59:59+07:00",
  boundary_proven: true
});

function account(className = "PHYSICAL_CASH", label = "CN1_TILL", aggregate = false) {
  return { class: className, label, aggregate_proven: aggregate };
}

function observedFact({
  sourceClass = "PHYSICAL_STORE_TILL_COUNT",
  accountClass = "PHYSICAL_CASH",
  label = "CN1_TILL",
  role = "OPENING",
  point = START,
  scope = SCOPE,
  value = 100,
  quality = "ACTUAL",
  observedProven = true,
  lineage = ["SANITIZED_POINT_BALANCE"],
  evidence = ["SANITIZED_POINT_EVIDENCE"]
} = {}) {
  return {
    source_class: sourceClass,
    balance_role: role,
    value,
    quality,
    point: { ...point },
    account: account(accountClass, label),
    scope: { ...scope },
    source: {
      class: "DIRECT_POINT_BALANCE",
      label: "SANITIZED_POINT_BALANCE"
    },
    as_of: point.timestamp,
    reconciliation_status: "NOT_APPLICABLE",
    evidence,
    lineage,
    observed_proven: observedProven,
    coverage_hint: "COMPLETE"
  };
}

function currentComputedOpeningFact(overrides = {}) {
  return {
    source_class: "INTERNAL_MONTHLY_CASH_WORKBOOK",
    fact_kind: "MONTHLY_CARRY_FORWARD",
    value: 100,
    quality: "ACTUAL",
    point: { ...START },
    account: account("OTHER_EVIDENCED_CASH", "INTERNAL_CASH_POOL"),
    scope: { ...SCOPE },
    source: {
      class: "INTERNAL_MONTHLY_CASH",
      label: "MONTHLY_CASH_WORKBOOK"
    },
    as_of: START.timestamp,
    reconciliation_status: "NOT_APPLICABLE",
    evidence: ["SANITIZED_MONTHLY_CARRY_FORWARD"],
    lineage: ["INTERNAL_MONTHLY_CASH:OPENING"],
    computation_proven: true,
    anchor_observed: false,
    movement_coverage: "PARTIAL",
    dependency_qualities: ["ACTUAL", "GAP"],
    computation_lineage: ["MOVEMENTS_VERIFIED_THROUGH_2026_09_16"],
    coverage_hint: "PARTIAL",
    ...overrides
  };
}

function unavailableEndingFact() {
  return {
    source_class: "PHYSICAL_STORE_TILL_COUNT",
    source_status: "NOT_CONNECTED",
    balance_role: "OBSERVED_ENDING",
    point: { ...END, boundary_proven: false },
    account: account(),
    scope: { ...SCOPE },
    source: {
      class: "DIRECT_POINT_BALANCE",
      label: "SANITIZED_TILL_SOURCE"
    },
    as_of: END.timestamp,
    reconciliation_status: "NOT_APPLICABLE",
    lineage: ["PHYSICAL_TILL_NOT_CONNECTED"]
  };
}

function pointCoverage({
  role,
  balance,
  sourceClass = "PHYSICAL_STORE_TILL_COUNT",
  accountClass = "PHYSICAL_CASH",
  label = "CN1_TILL",
  scope = SCOPE,
  status = "COMPLETE",
  proven = true,
  required = true,
  universeProven = true,
  aggregateProven = false,
  universeAccounts,
  lineage = ["SANITIZED_POINT_COVERAGE"]
}) {
  const member = {
    source_class: sourceClass,
    account: account(accountClass, label, label === "ALL"),
    scope: { ...scope },
    required
  };
  return {
    coverage_role: role,
    target_period: { ...PERIOD },
    scope: { ...scope },
    account_universe: {
      universe_proven: universeProven,
      aggregate_proven: aggregateProven,
      empty_universe_proven: false,
      accounts: universeAccounts ?? [member],
      lineage: ["SANITIZED_POINT_UNIVERSE"]
    },
    source_coverage: [{
      ...member,
      status,
      coverage_proven: proven,
      balance,
      as_of: role === "OPENING_BALANCE" ? START.timestamp : END.timestamp,
      lineage
    }],
    as_of: role === "OPENING_BALANCE" ? START.timestamp : END.timestamp,
    lineage
  };
}

function movementCoverage({
  status = "COMPLETE",
  proven = true,
  intervals = [{
    start: PERIOD.start,
    end: PERIOD.end,
    timezone: PERIOD.timezone
  }],
  required = true,
  universeProven = true,
  sourceClass = "INTERNAL_CASH_MOVEMENT_ROWS",
  sourceEntries,
  universeAccounts,
  scope = SCOPE
} = {}) {
  const member = {
    source_class: sourceClass,
    account: account("OTHER_EVIDENCED_CASH", "INTERNAL_CASH_POOL"),
    scope: { ...scope },
    required
  };
  const entry = {
    ...member,
    status,
    coverage_proven: proven,
    covered_intervals: intervals,
    as_of: status === "PARTIAL"
      ? "2026-09-16T23:59:59+07:00"
      : END.timestamp,
    lineage: ["SANITIZED_MOVEMENT_COVERAGE"]
  };
  return {
    coverage_role: "MOVEMENT_EVENTS",
    target_period: { ...PERIOD },
    scope: { ...scope },
    account_universe: {
      universe_proven: universeProven,
      aggregate_proven: scope.aggregate_proven === true,
      empty_universe_proven: false,
      accounts: universeAccounts ?? [member],
      lineage: ["SANITIZED_MOVEMENT_UNIVERSE"]
    },
    source_coverage: sourceEntries ?? [entry],
    as_of: entry.as_of,
    lineage: ["SANITIZED_MOVEMENT_COVERAGE"]
  };
}

function emptyMovementCoverage() {
  return {
    coverage_role: "MOVEMENT_EVENTS",
    target_period: { ...PERIOD },
    scope: { ...SCOPE },
    account_universe: {
      universe_proven: true,
      aggregate_proven: false,
      empty_universe_proven: true,
      accounts: [],
      lineage: ["SANITIZED_EMPTY_MOVEMENT_UNIVERSE_PROOF"]
    },
    source_coverage: [],
    as_of: END.timestamp,
    lineage: ["SANITIZED_EMPTY_MOVEMENT_COVERAGE"]
  };
}

function cashEvent(direction, category, date, amount, id) {
  return {
    event_id: id,
    direction,
    category,
    event_date: date,
    timezone: PERIOD.timezone,
    scope: { ...SCOPE },
    amount,
    quality: "ACTUAL",
    source: {
      class: "RECORDED_CASH_SOURCE",
      label: "SANITIZED_CASH_EVENT"
    },
    as_of: `${date}T21:00:00+07:00`,
    reconciliation_status: "RECONCILED",
    evidence: ["SANITIZED_CASH_EVENT_EVIDENCE"],
    lineage: [`CASH_EVENT:${id}`],
    cash_movement_proven: true,
    proof_basis: "DIRECT_CASH_EVENT",
    status: "ACTIVE"
  };
}

function completePointCoverage(source, role) {
  const mapped = mapCashBalanceSourceFact(source, {
    targetPoint: {
      date: role === "OPENING_BALANCE" ? PERIOD.start : PERIOD.end,
      timezone: PERIOD.timezone
    },
    targetScope: SCOPE
  });
  return pointCoverage({
    role,
    balance: mapped.balance,
    sourceClass: source.source_class,
    accountClass: source.account.class,
    label: source.account.label
  });
}

function integration(overrides = {}) {
  const openingSource = Object.hasOwn(overrides, "openingSource")
    ? overrides.openingSource
    : observedFact({ value: 100 });
  const endingSource = Object.hasOwn(overrides, "endingSource")
    ? overrides.endingSource
    : observedFact({
        role: "OBSERVED_ENDING",
        point: END,
        value: 125,
        lineage: ["SANITIZED_ENDING_BALANCE"]
      });

  return integrateCashBridgeSources({
    targetPeriod: overrides.targetPeriod ?? PERIOD,
    scope: overrides.scope ?? SCOPE,
    openingSource,
    openingCoverage: Object.hasOwn(overrides, "openingCoverage")
      ? overrides.openingCoverage
      : completePointCoverage(openingSource, "OPENING_BALANCE"),
    events: Object.hasOwn(overrides, "events")
      ? overrides.events
      : [
          cashEvent("INFLOW", "SALES_COLLECTION", "2026-09-10", 50, "IN-1"),
          cashEvent("OUTFLOW", "OTHER_OPEX", "2026-09-11", 20, "OUT-1")
        ],
    movementCoverage: overrides.movementCoverage ?? movementCoverage(),
    observedEndingSource: endingSource,
    endingCoverage: Object.hasOwn(overrides, "endingCoverage")
      ? overrides.endingCoverage
      : completePointCoverage(endingSource, "OBSERVED_ENDING_BALANCE")
  });
}

test("integration exposes one pure V1 orchestration API", () => {
  const result = integration();
  assert.equal(CASH_BRIDGE_SOURCE_INTEGRATION_VERSION, "cash-bridge-source-integration.v1");
  assert.equal(result.integration_version, CASH_BRIDGE_SOURCE_INTEGRATION_VERSION);
  assert.equal(result.bridge.schema_version, "cash-bridge.v1");
});

test("fully proven components delegate exact computed ending and variance to existing Cash Bridge", () => {
  const result = integration();
  assert.equal(result.readiness.opening_ready, true);
  assert.equal(result.readiness.movement_ready, true);
  assert.equal(result.readiness.ending_ready, true);
  assert.equal(result.bridge.total_known_inflows.value, 50);
  assert.equal(result.bridge.total_known_outflows.value, 20);
  assert.equal(result.bridge.computed_ending_balance.value, 130);
  assert.equal(result.bridge.observed_ending_balance.value, 125);
  assert.equal(result.bridge.cash_variance.value, -5);
});

test("opening COMPLETE + movement COMPLETE + ending missing preserves computed ending but gates variance", () => {
  const result = integration({
    endingSource: null,
    endingCoverage: {}
  });
  assert.equal(result.bridge.computed_ending_balance.value, 130);
  assert.equal(result.bridge.observed_ending_balance.value, null);
  assert.equal(result.bridge.cash_variance.value, null);
  assert.equal(result.bridge.cash_variance.quality, "GAP");
});

test("opening missing + movement COMPLETE + ending observed preserves ending while computed and variance stay GAP", () => {
  const result = integration({
    openingSource: null,
    openingCoverage: {}
  });
  assert.equal(result.bridge.opening_balance.value, null);
  assert.equal(result.bridge.observed_ending_balance.value, 125);
  assert.equal(result.bridge.computed_ending_balance.value, null);
  assert.equal(result.bridge.cash_variance.value, null);
});

test("movement PARTIAL preserves known evidenced sums but blocks computed ending", () => {
  const result = integration({
    movementCoverage: movementCoverage({
      status: "PARTIAL",
      intervals: [{
        start: PERIOD.start,
        end: "2026-09-16",
        timezone: PERIOD.timezone
      }]
    })
  });
  assert.equal(result.bridge.total_known_inflows.value, 50);
  assert.equal(result.bridge.total_known_outflows.value, 20);
  assert.equal(result.bridge.computed_ending_balance.value, null);
  assert.equal(result.readiness.movement_ready, false);
});

test("required movement NOT_CONNECTED propagates fail closed", () => {
  const result = integration({
    movementCoverage: movementCoverage({
      status: "NOT_CONNECTED",
      proven: false,
      intervals: []
    })
  });
  assert.equal(result.movement_coverage.required_not_connected, true);
  assert.equal(result.bridge.computed_ending_balance.value, null);
  assert.equal(result.bridge.computed_ending_balance.quality, "NOT_CONNECTED");
});

test("opening PARTIAL coverage blocks numeric mapped opening dependency", () => {
  const opening = observedFact({ value: 100 });
  const coverage = completePointCoverage(opening, "OPENING_BALANCE");
  coverage.source_coverage[0].status = "PARTIAL";
  const result = integration({
    openingSource: opening,
    openingCoverage: coverage
  });
  assert.equal(result.canonical_opening_balance.truth.value, 100);
  assert.equal(result.prepared_inputs.opening_balance.value, null);
  assert.equal(result.prepared_inputs.opening_balance.quality, "GAP");
  assert.equal(result.bridge.computed_ending_balance.value, null);
});

test("ending PARTIAL blocks variance without deleting valid computed ending", () => {
  const ending = observedFact({
    role: "OBSERVED_ENDING",
    point: END,
    value: 125
  });
  const coverage = completePointCoverage(ending, "OBSERVED_ENDING_BALANCE");
  coverage.source_coverage[0].status = "PARTIAL";
  const result = integration({
    endingSource: ending,
    endingCoverage: coverage
  });
  assert.equal(result.bridge.computed_ending_balance.value, 130);
  assert.equal(result.bridge.observed_ending_balance.value, null);
  assert.equal(result.bridge.cash_variance.value, null);
});

test("coverage role mismatch fails closed instead of coercing roles", () => {
  const opening = observedFact();
  const result = integration({
    openingSource: opening,
    openingCoverage: {
      ...movementCoverage(),
      coverage_role: "MOVEMENT_EVENTS"
    }
  });
  assert.equal(result.bridge.opening_balance.value, null);
  assert.ok(result.diagnostics.includes("OPENING_COVERAGE_ROLE_MISMATCH"));
});

test("forged pre-evaluated COMPLETE cannot bypass universe proof", () => {
  const opening = observedFact();
  const mapped = mapCashBalanceSourceFact(opening);
  const forged = {
    schema_version: "cash-source-coverage.v1",
    coverage_role: "OPENING_BALANCE",
    target_period: { ...PERIOD },
    scope: { ...SCOPE },
    account_universe: {
      universe_proven: false,
      aggregate_proven: false,
      empty_universe_proven: false,
      accounts: [{
        source_class: opening.source_class,
        account: opening.account,
        scope: { ...SCOPE },
        required: true
      }],
      lineage: ["SANITIZED_UNPROVEN_UNIVERSE"]
    },
    source_coverage: [{
      source_class: opening.source_class,
      account: opening.account,
      scope: { ...SCOPE },
      required: true,
      status: "COMPLETE",
      coverage_proven: true,
      balance: mapped.balance,
      as_of: START.timestamp,
      lineage: ["SANITIZED_FORGED_COMPLETE"]
    }],
    status: "COMPLETE",
    universe_proven: true,
    as_of: START.timestamp,
    lineage: ["SANITIZED_FORGED_COMPLETE"]
  };
  const result = integration({
    openingSource: opening,
    openingCoverage: forged
  });
  assert.notEqual(result.opening_coverage.status, "COMPLETE");
  assert.equal(result.bridge.opening_balance.value, null);
});

test("premapped balance provenance mismatch is rejected by TASK-062 dispatcher", () => {
  const source = observedFact();
  const mapped = mapCashBalanceSourceFact(source);
  const forged = {
    ...mapped,
    source_class: "INTERNAL_MONTHLY_CASH_WORKBOOK",
    classification: "COMPUTED_BALANCE"
  };
  const result = integration({
    openingSource: forged,
    openingCoverage: completePointCoverage(source, "OPENING_BALANCE")
  });
  assert.equal(result.canonical_opening_balance.truth.value, null);
  assert.ok(
    result.mapped_opening_component.diagnostics.includes(
      "PREMAPPED_BALANCE_PROVENANCE_MISMATCH"
    )
  );
});

test("computed remainder cannot become observed ending", () => {
  const remainder = {
    source_class: "INTERNAL_MONTHLY_CASH_WORKBOOK",
    fact_kind: "CALCULATED_REMAINDER",
    value: 125,
    quality: "ACTUAL",
    balance_role: "OBSERVED_ENDING",
    point: { ...END },
    account: account("OTHER_EVIDENCED_CASH", "INTERNAL_CASH_POOL"),
    scope: { ...SCOPE },
    source: {
      class: "INTERNAL_MONTHLY_CASH",
      label: "MONTHLY_CASH_WORKBOOK"
    },
    as_of: END.timestamp,
    reconciliation_status: "NOT_APPLICABLE",
    evidence: ["SANITIZED_CALCULATED_REMAINDER"],
    lineage: ["SANITIZED_REMAINDER"],
    computation_proven: true,
    anchor_observed: true,
    movement_coverage: "COMPLETE",
    dependency_qualities: ["ACTUAL"],
    computation_lineage: ["SANITIZED_COMPUTATION"]
  };
  const result = integration({
    endingSource: remainder,
    endingCoverage: {}
  });
  assert.equal(result.canonical_ending_balance.truth.value, null);
  assert.equal(result.bridge.observed_ending_balance.value, null);
  assert.equal(result.bridge.cash_variance.value, null);
});

test("current TASK-060→063 sanitized profile remains non-COMPLETE", () => {
  const opening = currentComputedOpeningFact();
  const mappedOpening = mapCashBalanceSourceFact(opening);
  const openingCoverage = pointCoverage({
    role: "OPENING_BALANCE",
    balance: mappedOpening.balance,
    sourceClass: "INTERNAL_MONTHLY_CASH_WORKBOOK",
    accountClass: "OTHER_EVIDENCED_CASH",
    label: "INTERNAL_CASH_POOL",
    status: "PARTIAL",
    proven: true
  });
  const ending = unavailableEndingFact();
  const mappedEnding = mapCashBalanceSourceFact(ending);
  const endingCoverage = pointCoverage({
    role: "OBSERVED_ENDING_BALANCE",
    balance: mappedEnding.balance,
    status: "NOT_CONNECTED",
    proven: false
  });
  const partialMovement = movementCoverage({
    status: "PARTIAL",
    intervals: [{
      start: PERIOD.start,
      end: "2026-09-16",
      timezone: PERIOD.timezone
    }]
  });

  const result = integration({
    openingSource: opening,
    openingCoverage,
    events: [cashEvent("INFLOW", "SALES_COLLECTION", "2026-09-10", 50, "CURRENT-IN")],
    movementCoverage: partialMovement,
    endingSource: ending,
    endingCoverage
  });

  assert.equal(result.opening_coverage.status === "COMPLETE", false);
  assert.equal(result.movement_coverage.status, "PARTIAL");
  assert.equal(result.ending_coverage.required_not_connected, true);
  assert.equal(result.bridge.total_known_inflows.value, 50);
  assert.equal(result.bridge.computed_ending_balance.value, null);
  assert.equal(result.bridge.observed_ending_balance.value, null);
  assert.equal(result.bridge.cash_variance.value, null);
});

test("one branch/account cannot satisfy enterprise ALL", () => {
  const allScope = {
    branch: "ALL",
    channel: "DIRECT",
    aggregate_proven: true
  };
  const opening = observedFact({
    scope: allScope,
    label: "CN1_TILL"
  });
  const mapped = mapCashBalanceSourceFact(opening, {
    targetPoint: { date: PERIOD.start, timezone: PERIOD.timezone },
    targetScope: allScope
  });
  const coverage = pointCoverage({
    role: "OPENING_BALANCE",
    balance: mapped.balance,
    scope: allScope,
    aggregateProven: true,
    universeAccounts: [{
      source_class: opening.source_class,
      account: opening.account,
      scope: { ...allScope },
      required: true
    }]
  });
  const result = integrateCashBridgeSources({
    targetPeriod: PERIOD,
    scope: allScope,
    openingSource: opening,
    openingCoverage: coverage,
    events: [],
    movementCoverage: {
      ...movementCoverage({ scope: allScope }),
      account_universe: {
        universe_proven: true,
        aggregate_proven: true,
        empty_universe_proven: true,
        accounts: [],
        lineage: ["SANITIZED_EMPTY_AGGREGATE_MOVEMENT"]
      },
      source_coverage: []
    },
    observedEndingSource: null,
    endingCoverage: {}
  });
  assert.equal(result.bridge.opening_balance.value, null);
  assert.ok(
    result.diagnostics.includes("OPENING_AGGREGATE_BALANCE_NOT_PROVEN") ||
    result.opening_coverage.status !== "COMPLETE"
  );
});

test("explicit observed zero ending is preserved when fully proven", () => {
  const result = integration({
    openingSource: observedFact({ value: 0 }),
    endingSource: observedFact({
      role: "OBSERVED_ENDING",
      point: END,
      value: 0
    }),
    events: [],
    movementCoverage: emptyMovementCoverage()
  });
  assert.equal(result.bridge.observed_ending_balance.value, 0);
  assert.equal(result.bridge.computed_ending_balance.value, 0);
  assert.equal(result.bridge.cash_variance.value, 0);
});

test("valid observed negative generic bank balance is preserved by existing balance policy", () => {
  const ending = observedFact({
    sourceClass: "BANK_ACCOUNT_BALANCE_STATEMENT",
    accountClass: "BANK",
    label: "BUSINESS_BANK_LOGICAL",
    role: "OBSERVED_ENDING",
    point: END,
    value: -50
  });
  const result = integration({
    openingSource: observedFact({ value: 100 }),
    endingSource: ending,
    events: [],
    movementCoverage: emptyMovementCoverage()
  });
  assert.equal(result.canonical_ending_balance.truth.value, -50);
  assert.equal(result.bridge.observed_ending_balance.value, -50);
  assert.equal(result.bridge.cash_variance.value, -150);
});

test("target period mismatch fails movement gate closed", () => {
  const wrong = movementCoverage();
  wrong.target_period = {
    start: "2026-08-01",
    end: "2026-08-31",
    timezone: PERIOD.timezone
  };
  const result = integration({ movementCoverage: wrong });
  assert.equal(result.prepared_inputs.movement_coverage.status, "MISSING");
  assert.equal(result.bridge.computed_ending_balance.value, null);
  assert.ok(result.diagnostics.includes("MOVEMENT_COVERAGE_TARGET_PERIOD_MISMATCH"));
});

test("target scope mismatch fails point gate closed", () => {
  const opening = observedFact();
  const coverage = completePointCoverage(opening, "OPENING_BALANCE");
  coverage.scope = {
    branch: "CN2",
    channel: "DIRECT",
    aggregate_proven: false
  };
  const result = integration({
    openingSource: opening,
    openingCoverage: coverage
  });
  assert.equal(result.bridge.opening_balance.value, null);
  assert.ok(result.diagnostics.includes("OPENING_COVERAGE_SCOPE_MISMATCH"));
});

test("missing blank and NaN balances never become synthetic zero", () => {
  for (const value of [undefined, "", Number.NaN]) {
    const source = observedFact({ value });
    const result = integration({
      openingSource: source,
      openingCoverage: completePointCoverage(source, "OPENING_BALANCE")
    });
    assert.equal(result.bridge.opening_balance.value, null);
    assert.notEqual(result.bridge.opening_balance.value, 0);
  }
});

test("ending source failure does not erase valid opening or events", () => {
  const result = integration({
    endingSource: unavailableEndingFact(),
    endingCoverage: pointCoverage({
      role: "OBSERVED_ENDING_BALANCE",
      balance: mapCashBalanceSourceFact(unavailableEndingFact()).balance,
      status: "NOT_CONNECTED",
      proven: false
    })
  });
  assert.equal(result.bridge.opening_balance.value, 100);
  assert.equal(result.bridge.total_known_inflows.value, 50);
  assert.equal(result.bridge.total_known_outflows.value, 20);
  assert.equal(result.bridge.computed_ending_balance.value, 130);
  assert.equal(result.bridge.observed_ending_balance.value, null);
});

test("movement failure does not erase valid observed point balances", () => {
  const result = integration({
    movementCoverage: movementCoverage({
      status: "PARTIAL",
      intervals: [{
        start: PERIOD.start,
        end: "2026-09-16",
        timezone: PERIOD.timezone
      }]
    })
  });
  assert.equal(result.bridge.opening_balance.value, 100);
  assert.equal(result.bridge.observed_ending_balance.value, 125);
  assert.equal(result.bridge.computed_ending_balance.value, null);
});

test("integration is deterministic and semantically unordered lists are order independent", () => {
  const a = integration();
  const b = integration();
  assert.deepEqual(a, b);

  const reversed = integration({
    events: [
      cashEvent("OUTFLOW", "OTHER_OPEX", "2026-09-11", 20, "OUT-1"),
      cashEvent("INFLOW", "SALES_COLLECTION", "2026-09-10", 50, "IN-1")
    ]
  });
  assert.equal(reversed.bridge.computed_ending_balance.value, a.bridge.computed_ending_balance.value);
  assert.equal(reversed.bridge.cash_variance.value, a.bridge.cash_variance.value);
  assert.deepEqual(reversed.readiness, a.readiness);
});

test("privacy unsafe source metadata fails closed without echoing locator", () => {
  const opening = observedFact({
    evidence: ["https://drive.google.com/private"],
    lineage: ["SAFE_LINEAGE"]
  });
  const result = integration({
    openingSource: opening,
    openingCoverage: completePointCoverage(opening, "OPENING_BALANCE")
  });
  assert.equal(result.bridge.opening_balance.value, null);
  assert.equal(JSON.stringify(result).includes("drive.google.com"), false);
});

test("helper contains no writes external API calls or duplicate Cash Bridge formula", async () => {
  const source = await fs.readFile(
    new URL("../../02_CORE/shared/cash-bridge-source-integration-v1.mjs", import.meta.url),
    "utf8"
  );
  assert.equal(/\bfetch\s*\(/.test(source), false);
  assert.equal(/child_process|writeFile|appendFile|createWriteStream|https?:\/\//.test(source), false);
  assert.equal(source.includes("FORMULA:OPENING+KNOWN_INFLOW-KNOWN_OUTFLOW"), false);
  assert.equal(source.includes("totalKnownInflows"), false);
  assert.equal((source.match(/calculateCashBridge\s*\(/g) || []).length, 1);
});

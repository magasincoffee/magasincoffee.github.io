import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import {
  CASH_BRIDGE_SOURCE_INTEGRATION_VERSION,
  integrateCashBridgeSources
} from "../../02_CORE/shared/cash-bridge-source-integration-v1.mjs";
import {
  CASH_BALANCE_SOURCE_MAPPER_VERSION,
  mapCashBalanceSourceFact
} from "../../02_CORE/shared/cash-balance-source-mapper-v1.mjs";

const PERIOD = Object.freeze({
  start: "2026-09-01",
  end: "2026-09-03",
  timezone: "Asia/Ho_Chi_Minh"
});
const CURRENT_PERIOD = Object.freeze({
  start: "2026-09-01",
  end: "2026-09-20",
  timezone: "Asia/Ho_Chi_Minh"
});
const CN1 = Object.freeze({
  branch: "CN1",
  channel: "DIRECT",
  aggregate_proven: false
});
const ALL = Object.freeze({
  branch: "ALL",
  channel: "DIRECT",
  aggregate_proven: true
});

function clone(value) {
  return structuredClone(value);
}

function account(className = "PHYSICAL_CASH", label = "CN1_TILL", aggregate = false) {
  return { class: className, label, aggregate_proven: aggregate };
}

function point(date, end = false, timezone = PERIOD.timezone) {
  return {
    date,
    timezone,
    timestamp: date + (end ? "T23:59:59+07:00" : "T00:00:00+07:00"),
    boundary_proven: true
  };
}

function observed({
  role = "OPENING",
  date = role === "OPENING" ? PERIOD.start : PERIOD.end,
  value = role === "OPENING" ? 100 : 125,
  sourceClass = "PHYSICAL_STORE_TILL_COUNT",
  accountClass = "PHYSICAL_CASH",
  label = "CN1_TILL",
  scope = CN1,
  timezone = PERIOD.timezone,
  lineage = ["SANITIZED_POINT_BALANCE"],
  observedProven = true
} = {}) {
  const p = point(date, role === "OBSERVED_ENDING", timezone);
  return {
    source_class: sourceClass,
    balance_role: role,
    value,
    quality: "ACTUAL",
    point: p,
    account: account(accountClass, label, scope.branch === "ALL"),
    scope: clone(scope),
    source: { class: "DIRECT_POINT_BALANCE", label: "SANITIZED_BALANCE" },
    as_of: p.timestamp,
    reconciliation_status: "RECONCILED",
    evidence: ["DIRECT_POINT_BALANCE_EVIDENCE"],
    lineage,
    observed_proven: observedProven,
    coverage_hint: "COMPLETE"
  };
}

function computedOpening({
  value = 100,
  period = PERIOD,
  scope = CN1,
  anchorObserved = true,
  movement = "COMPLETE"
} = {}) {
  const p = point(period.start, false, period.timezone);
  return {
    source_class: "INTERNAL_MONTHLY_CASH_WORKBOOK",
    fact_kind: "MONTHLY_CARRY_FORWARD",
    balance_role: "OPENING",
    value,
    quality: "ACTUAL",
    point: p,
    account: account("OTHER_EVIDENCED_CASH", "INTERNAL_CASH_POOL"),
    scope: clone(scope),
    source: { class: "DERIVED_BALANCE_COMPUTATION", label: "SANITIZED_COMPUTED_OPENING" },
    as_of: p.timestamp,
    reconciliation_status: "RECONCILED",
    evidence: ["OBSERVED_ANCHOR_PLUS_MOVEMENTS"],
    lineage: ["SANITIZED_COMPUTED_OPENING"],
    computation_proven: true,
    anchor_observed: anchorObserved,
    movement_coverage: movement,
    dependency_qualities: ["ACTUAL", movement === "COMPLETE" ? "ACTUAL" : "GAP"],
    computation_lineage: ["SANITIZED_ANCHOR", "SANITIZED_MOVEMENTS"],
    coverage_hint: movement
  };
}

function unavailableEnding(period = PERIOD) {
  const p = point(period.end, true, period.timezone);
  return {
    source_class: "PHYSICAL_STORE_TILL_COUNT",
    source_status: "NOT_CONNECTED",
    connected: false,
    balance_role: "OBSERVED_ENDING",
    point: p,
    account: account(),
    scope: clone(CN1),
    source: { class: "DIRECT_POINT_BALANCE", label: "SANITIZED_UNAVAILABLE" },
    as_of: p.timestamp,
    reconciliation_status: "UNKNOWN",
    evidence: [],
    lineage: ["SANITIZED_NOT_CONNECTED"]
  };
}

function mapped(source, period = PERIOD, scope = CN1) {
  const role = source.balance_role === "OBSERVED_ENDING" ? "OBSERVED_ENDING" : "OPENING";
  return mapCashBalanceSourceFact(source, {
    targetPoint: {
      date: role === "OPENING" ? period.start : period.end,
      timezone: period.timezone
    },
    targetScope: scope
  });
}

function pointCoverage({
  role,
  period = PERIOD,
  scope = CN1,
  sourceClass = "PHYSICAL_STORE_TILL_COUNT",
  accountClass = "PHYSICAL_CASH",
  label = "CN1_TILL",
  mappedBalance,
  status = "COMPLETE",
  proven = true,
  universeProven = true,
  aggregateProven = false,
  members = null
}) {
  const requiredMembers = members || [{
    source_class: sourceClass,
    account: account(accountClass, label, scope.branch === "ALL"),
    scope: clone(scope),
    required: true
  }];
  const end = role === "OBSERVED_ENDING_BALANCE";
  const asOf = point(end ? period.end : period.start, end, period.timezone).timestamp;
  return {
    coverage_role: role,
    target_period: clone(period),
    scope: clone(scope),
    account_universe: {
      universe_proven: universeProven,
      aggregate_proven: aggregateProven,
      empty_universe_proven: false,
      accounts: clone(requiredMembers),
      lineage: ["SANITIZED_REQUIRED_POINT_UNIVERSE"]
    },
    source_coverage: requiredMembers.map((member, index) => ({
      ...clone(member),
      status,
      coverage_proven: proven,
      balance: index === 0 ? mappedBalance : null,
      as_of: asOf,
      lineage: ["SANITIZED_POINT_COVERAGE"]
    })),
    as_of: asOf,
    lineage: ["SANITIZED_POINT_COVERAGE_TOP"]
  };
}

function movementMember({
  sourceClass = "INTERNAL_CASH_MOVEMENT_ROWS",
  accountClass = "PHYSICAL_CASH",
  label = "CN1_TILL",
  scope = CN1,
  required = true
} = {}) {
  return {
    source_class: sourceClass,
    account: account(accountClass, label, scope.branch === "ALL"),
    scope: clone(scope),
    required
  };
}

function movementCoverage({
  period = PERIOD,
  scope = CN1,
  status = "COMPLETE",
  proven = true,
  universeProven = true,
  aggregateProven = false,
  members = [movementMember()],
  intervals = null,
  statuses = null
} = {}) {
  const covered = intervals || [{
    start: period.start,
    end: period.end,
    timezone: period.timezone
  }];
  const asOf = period.end + "T23:59:59+07:00";
  return {
    coverage_role: "MOVEMENT_EVENTS",
    target_period: clone(period),
    scope: clone(scope),
    account_universe: {
      universe_proven: universeProven,
      aggregate_proven: aggregateProven,
      empty_universe_proven: false,
      accounts: clone(members),
      lineage: ["SANITIZED_REQUIRED_MOVEMENT_UNIVERSE"]
    },
    source_coverage: members.map((member, index) => ({
      ...clone(member),
      status: statuses?.[index] || status,
      coverage_proven: proven,
      covered_intervals: clone(covered),
      as_of: asOf,
      lineage: ["SANITIZED_MOVEMENT_COVERAGE_" + String(index + 1)]
    })),
    as_of: asOf,
    lineage: ["SANITIZED_MOVEMENT_COVERAGE_TOP"]
  };
}

function cashEvent(direction, category, date, amount, id) {
  return {
    event_id: id,
    direction,
    category,
    event_date: date,
    timezone: PERIOD.timezone,
    scope: clone(CN1),
    amount,
    quality: "ACTUAL",
    source: { class: "RECORDED_CASH_SOURCE", label: "SANITIZED_CASH_EVENT" },
    as_of: date + "T21:00:00+07:00",
    reconciliation_status: "RECONCILED",
    evidence: ["CASH_EVENT_EVIDENCED"],
    lineage: ["SANITIZED_EVENT_" + id],
    cash_movement_proven: true,
    proof_basis: "DIRECT_CASH_EVENT",
    status: "ACTIVE"
  };
}

function scenario(overrides = {}) {
  const openingSource = Object.hasOwn(overrides, "openingSource")
    ? overrides.openingSource
    : observed({ role: "OPENING", value: 100 });
  const endingSource = Object.hasOwn(overrides, "observedEndingSource")
    ? overrides.observedEndingSource
    : observed({ role: "OBSERVED_ENDING", value: 125 });
  const openingMapped = openingSource ? mapped(openingSource) : null;
  const endingMapped = endingSource ? mapped(endingSource) : null;
  return {
    targetPeriod: clone(overrides.targetPeriod || PERIOD),
    scope: clone(overrides.scope || CN1),
    openingSource: openingSource ? clone(openingSource) : null,
    openingCoverage: clone(overrides.openingCoverage || (openingMapped
      ? pointCoverage({
          role: "OPENING_BALANCE",
          mappedBalance: openingMapped
        })
      : {})),
    cashEvents: clone(overrides.cashEvents || [
      cashEvent("INFLOW", "SALES_COLLECTION", "2026-09-02", 50, "SALE1"),
      cashEvent("OUTFLOW", "OTHER_OPEX", "2026-09-02", 25, "OPEX1")
    ]),
    movementCoverage: clone(overrides.movementCoverage || movementCoverage()),
    observedEndingSource: endingSource ? clone(endingSource) : null,
    endingCoverage: clone(overrides.endingCoverage || (endingMapped
      ? pointCoverage({
          role: "OBSERVED_ENDING_BALANCE",
          mappedBalance: endingMapped
        })
      : {}))
  };
}

test("fully proven inputs use existing Cash Bridge result unchanged", () => {
  const result = integrateCashBridgeSources(scenario());
  assert.equal(result.integration_version, CASH_BRIDGE_SOURCE_INTEGRATION_VERSION);
  assert.equal(result.readiness.opening, "READY");
  assert.equal(result.readiness.movement, "READY");
  assert.equal(result.readiness.observed_ending, "READY");
  assert.equal(result.bridge.opening_balance.value, 100);
  assert.equal(result.bridge.total_known_inflows.value, 50);
  assert.equal(result.bridge.total_known_outflows.value, 25);
  assert.equal(result.bridge.computed_ending_balance.value, 125);
  assert.equal(result.bridge.observed_ending_balance.value, 125);
  assert.equal(result.bridge.cash_variance.value, 0);
});

test("missing ending does not erase a valid computed ending", () => {
  const result = integrateCashBridgeSources(scenario({
    observedEndingSource: null,
    endingCoverage: {}
  }));
  assert.equal(result.bridge.computed_ending_balance.value, 125);
  assert.equal(result.bridge.observed_ending_balance.value, null);
  assert.equal(result.bridge.cash_variance.value, null);
});

test("missing opening preserves valid observed ending but blocks computed and variance", () => {
  const result = integrateCashBridgeSources(scenario({
    openingSource: null,
    openingCoverage: {}
  }));
  assert.equal(result.bridge.opening_balance.value, null);
  assert.equal(result.bridge.observed_ending_balance.value, 125);
  assert.equal(result.bridge.computed_ending_balance.value, null);
  assert.equal(result.bridge.cash_variance.value, null);
});

test("PARTIAL movement keeps known sums but blocks computed ending", () => {
  const partial = movementCoverage({
    status: "PARTIAL",
    intervals: [{
      start: PERIOD.start,
      end: "2026-09-02",
      timezone: PERIOD.timezone
    }]
  });
  const result = integrateCashBridgeSources(scenario({ movementCoverage: partial }));
  assert.equal(result.movement_coverage.status, "PARTIAL");
  assert.equal(result.bridge.total_known_inflows.value, 50);
  assert.equal(result.bridge.total_known_outflows.value, 25);
  assert.equal(result.bridge.computed_ending_balance.value, null);
  assert.equal(result.bridge.observed_ending_balance.value, 125);
});

test("required NOT_CONNECTED movement propagates fail closed without hiding known events", () => {
  const required = [
    movementMember(),
    movementMember({
      sourceClass: "BANK_CASH_MOVEMENTS",
      accountClass: "BANK",
      label: "BUSINESS_BANK_LOGICAL"
    })
  ];
  const result = integrateCashBridgeSources(scenario({
    movementCoverage: movementCoverage({
      members: required,
      statuses: ["COMPLETE", "NOT_CONNECTED"],
      proven: true
    })
  }));
  assert.equal(result.movement_coverage.required_not_connected, true);
  assert.equal(result.bridge.total_known_inflows.value, 50);
  assert.equal(result.bridge.computed_ending_balance.value, null);
  assert.equal(result.bridge.computed_ending_balance.quality, "NOT_CONNECTED");
});

test("opening and ending point coverage gate numeric mapped balances independently", () => {
  const base = scenario();
  base.openingCoverage.source_coverage[0].status = "PARTIAL";
  base.endingCoverage.source_coverage[0].status = "PARTIAL";
  const result = integrateCashBridgeSources(base);
  assert.equal(result.mapped_opening_component.balance.truth.value, 100);
  assert.equal(result.mapped_ending_component.balance.truth.value, 125);
  assert.equal(result.bridge.opening_balance.value, null);
  assert.equal(result.bridge.observed_ending_balance.value, null);
  assert.equal(result.bridge.computed_ending_balance.value, null);
  assert.equal(result.bridge.cash_variance.value, null);
});

test("ending PARTIAL blocks variance while valid computed ending remains", () => {
  const base = scenario();
  base.endingCoverage.source_coverage[0].status = "PARTIAL";
  const result = integrateCashBridgeSources(base);
  assert.equal(result.bridge.computed_ending_balance.value, 125);
  assert.equal(result.bridge.observed_ending_balance.value, null);
  assert.equal(result.bridge.cash_variance.value, null);
});

test("role target period timezone and scope mismatches fail closed", () => {
  const roleMismatch = scenario();
  roleMismatch.openingCoverage.coverage_role = "MOVEMENT_EVENTS";
  assert.equal(integrateCashBridgeSources(roleMismatch).bridge.opening_balance.value, null);

  const periodMismatch = scenario();
  periodMismatch.movementCoverage.target_period.end = "2026-09-02";
  assert.equal(integrateCashBridgeSources(periodMismatch).bridge.computed_ending_balance.value, null);

  const timezoneMismatch = scenario();
  timezoneMismatch.endingCoverage.target_period.timezone = "UTC";
  assert.equal(integrateCashBridgeSources(timezoneMismatch).bridge.observed_ending_balance.value, null);

  const scopeMismatch = scenario();
  scopeMismatch.endingCoverage.scope.branch = "CN2";
  assert.equal(integrateCashBridgeSources(scopeMismatch).bridge.observed_ending_balance.value, null);
});

test("forged pre-evaluated COMPLETE coverage cannot bypass universe proof", () => {
  const base = scenario();
  base.movementCoverage = {
    schema_version: "cash-source-coverage.v1",
    ...base.movementCoverage,
    status: "COMPLETE",
    universe_proven: true
  };
  base.movementCoverage.account_universe.universe_proven = false;
  const result = integrateCashBridgeSources(base);
  assert.notEqual(result.movement_coverage.status, "COMPLETE");
  assert.equal(result.bridge.computed_ending_balance.value, null);
});

test("premapped provenance mismatch is rejected and computed remainder cannot become ending", () => {
  const opening = observed({ role: "OPENING" });
  const forged = mapped(opening);
  forged.mapper_version = CASH_BALANCE_SOURCE_MAPPER_VERSION;
  forged.source_class = "INTERNAL_MONTHLY_CASH_WORKBOOK";
  forged.classification = "COMPUTED_BALANCE";
  const forgedResult = integrateCashBridgeSources(scenario({ openingSource: forged }));
  assert.equal(forgedResult.bridge.opening_balance.value, null);
  assert.ok(
    forgedResult.mapped_opening_component.diagnostics.includes(
      "PREMAPPED_BALANCE_PROVENANCE_MISMATCH"
    )
  );

  const p = point(PERIOD.end, true);
  const remainder = {
    source_class: "INTERNAL_MONTHLY_CASH_WORKBOOK",
    fact_kind: "CALCULATED_REMAINDER",
    balance_role: "OBSERVED_ENDING",
    value: 125,
    quality: "ACTUAL",
    point: p,
    account: account("OTHER_EVIDENCED_CASH", "INTERNAL_CASH_POOL"),
    scope: clone(CN1),
    source: { class: "DERIVED_BALANCE_COMPUTATION", label: "SANITIZED_REMAINDER" },
    as_of: p.timestamp,
    reconciliation_status: "RECONCILED",
    evidence: ["MONTHLY_REMAINDER"],
    lineage: ["SANITIZED_REMAINDER"],
    computation_proven: true,
    anchor_observed: true,
    movement_coverage: "COMPLETE",
    dependency_qualities: ["ACTUAL"],
    computation_lineage: ["SANITIZED_REMAINDER_PROOF"]
  };
  const result = integrateCashBridgeSources(scenario({
    observedEndingSource: remainder,
    endingCoverage: pointCoverage({
      role: "OBSERVED_ENDING_BALANCE",
      sourceClass: "INTERNAL_MONTHLY_CASH_WORKBOOK",
      accountClass: "OTHER_EVIDENCED_CASH",
      label: "INTERNAL_CASH_POOL",
      mappedBalance: mapped(remainder)
    })
  }));
  assert.equal(result.bridge.observed_ending_balance.value, null);
});

test("current TASK-060 through TASK-063 profile remains non-COMPLETE", () => {
  const opening = computedOpening({
    period: CURRENT_PERIOD,
    anchorObserved: false,
    movement: "PARTIAL"
  });
  const openingMapped = mapped(opening, CURRENT_PERIOD, CN1);
  const ending = unavailableEnding(CURRENT_PERIOD);
  const endingMapped = mapped(ending, CURRENT_PERIOD, CN1);
  const currentMovement = movementCoverage({
    period: CURRENT_PERIOD,
    status: "PARTIAL",
    intervals: [{
      start: CURRENT_PERIOD.start,
      end: "2026-09-16",
      timezone: CURRENT_PERIOD.timezone
    }]
  });
  const result = integrateCashBridgeSources({
    targetPeriod: clone(CURRENT_PERIOD),
    scope: clone(CN1),
    openingSource: opening,
    openingCoverage: pointCoverage({
      role: "OPENING_BALANCE",
      period: CURRENT_PERIOD,
      sourceClass: "INTERNAL_MONTHLY_CASH_WORKBOOK",
      accountClass: "OTHER_EVIDENCED_CASH",
      label: "INTERNAL_CASH_POOL",
      mappedBalance: openingMapped,
      status: "PARTIAL"
    }),
    cashEvents: [cashEvent("INFLOW", "SALES_COLLECTION", "2026-09-02", 10, "CURRENT1")],
    movementCoverage: currentMovement,
    observedEndingSource: ending,
    endingCoverage: pointCoverage({
      role: "OBSERVED_ENDING_BALANCE",
      period: CURRENT_PERIOD,
      mappedBalance: endingMapped,
      status: "NOT_CONNECTED",
      proven: false
    })
  });
  assert.equal(result.mapped_opening_component.balance.truth.value, null);
  assert.equal(result.movement_coverage.status, "PARTIAL");
  assert.equal(result.bridge.total_known_inflows.value, 10);
  assert.equal(result.bridge.computed_ending_balance.value, null);
  assert.equal(result.bridge.observed_ending_balance.value, null);
  assert.equal(result.bridge.cash_variance.value, null);
});

test("one account cannot prove enterprise ALL and multi-account point universe is not silently summed", () => {
  const opening = observed({ role: "OPENING", scope: ALL });
  const ending = observed({ role: "OBSERVED_ENDING", scope: ALL });
  const openingMapped = mapped(opening, PERIOD, ALL);
  const endingMapped = mapped(ending, PERIOD, ALL);
  const cn1 = movementMember({ scope: CN1 });
  const enterprise = integrateCashBridgeSources({
    targetPeriod: clone(PERIOD),
    scope: clone(ALL),
    openingSource: opening,
    openingCoverage: pointCoverage({
      role: "OPENING_BALANCE",
      scope: ALL,
      mappedBalance: openingMapped,
      aggregateProven: true
    }),
    cashEvents: [],
    movementCoverage: movementCoverage({
      scope: ALL,
      aggregateProven: true,
      members: [cn1]
    }),
    observedEndingSource: ending,
    endingCoverage: pointCoverage({
      role: "OBSERVED_ENDING_BALANCE",
      scope: ALL,
      mappedBalance: endingMapped,
      aggregateProven: true
    })
  });
  assert.equal(enterprise.bridge.computed_ending_balance.value, null);
  assert.ok(enterprise.movement_coverage.diagnostics.includes("ONE_ACCOUNT_CANNOT_PROVE_ENTERPRISE_ALL"));

  const base = scenario();
  const second = {
    source_class: "BANK_ACCOUNT_BALANCE_STATEMENT",
    account: account("BANK", "BUSINESS_BANK_LOGICAL"),
    scope: clone(CN1),
    required: true
  };
  base.openingCoverage.account_universe.accounts.push(second);
  const result = integrateCashBridgeSources(base);
  assert.equal(result.bridge.opening_balance.value, null);
});

test("explicit observed zero and valid negative generic bank opening are preserved", () => {
  const zeroOpening = observed({ role: "OPENING", value: 0 });
  const zeroEnding = observed({ role: "OBSERVED_ENDING", value: 0 });
  const zeroResult = integrateCashBridgeSources(scenario({
    openingSource: zeroOpening,
    openingCoverage: pointCoverage({
      role: "OPENING_BALANCE",
      mappedBalance: mapped(zeroOpening)
    }),
    cashEvents: [],
    observedEndingSource: zeroEnding,
    endingCoverage: pointCoverage({
      role: "OBSERVED_ENDING_BALANCE",
      mappedBalance: mapped(zeroEnding)
    })
  }));
  assert.equal(zeroResult.bridge.computed_ending_balance.value, 0);
  assert.equal(zeroResult.bridge.observed_ending_balance.value, 0);
  assert.equal(zeroResult.bridge.cash_variance.value, 0);

  const bank = observed({
    role: "OPENING",
    value: -50,
    sourceClass: "BANK_ACCOUNT_BALANCE_STATEMENT",
    accountClass: "BANK",
    label: "BUSINESS_BANK_LOGICAL"
  });
  const bankResult = integrateCashBridgeSources(scenario({
    openingSource: bank,
    openingCoverage: pointCoverage({
      role: "OPENING_BALANCE",
      sourceClass: "BANK_ACCOUNT_BALANCE_STATEMENT",
      accountClass: "BANK",
      label: "BUSINESS_BANK_LOGICAL",
      mappedBalance: mapped(bank)
    }),
    cashEvents: [],
    movementCoverage: movementCoverage({
      members: [movementMember({
        sourceClass: "BANK_CASH_MOVEMENTS",
        accountClass: "BANK",
        label: "BUSINESS_BANK_LOGICAL"
      })]
    }),
    observedEndingSource: null,
    endingCoverage: {}
  }));
  assert.equal(bankResult.bridge.opening_balance.value, -50);
  assert.equal(bankResult.bridge.computed_ending_balance.value, -50);
});

test("missing blank and NaN never become synthetic zero; source failures stay isolated", () => {
  for (const value of [undefined, "", Number.NaN]) {
    const opening = observed({ role: "OPENING", value });
    const result = integrateCashBridgeSources(scenario({
      openingSource: opening,
      openingCoverage: pointCoverage({
        role: "OPENING_BALANCE",
        mappedBalance: mapped(opening)
      })
    }));
    assert.equal(result.bridge.opening_balance.value, null);
    assert.equal(result.bridge.computed_ending_balance.value, null);
  }

  const badEnding = observed({ role: "OBSERVED_ENDING", value: "not-a-number" });
  const isolated = integrateCashBridgeSources(scenario({
    observedEndingSource: badEnding,
    endingCoverage: pointCoverage({
      role: "OBSERVED_ENDING_BALANCE",
      mappedBalance: mapped(badEnding)
    })
  }));
  assert.equal(isolated.bridge.computed_ending_balance.value, 125);
  assert.equal(isolated.bridge.observed_ending_balance.value, null);
});

test("COMPLETE movement for a different account universe cannot compute from point balance", () => {
  const result = integrateCashBridgeSources(scenario({
    movementCoverage: movementCoverage({
      members: [movementMember({
        sourceClass: "BANK_CASH_MOVEMENTS",
        accountClass: "BANK",
        label: "BUSINESS_BANK_LOGICAL"
      })]
    })
  }));
  assert.equal(result.readiness.movement, "READY");
  assert.equal(result.bridge.opening_balance.value, null);
  assert.equal(result.bridge.computed_ending_balance.value, null);
  assert.ok(result.diagnostics.includes("OPENING_MOVEMENT_ACCOUNT_UNIVERSE_MISMATCH"));
});

test("deterministic idempotent and unordered lists produce stable result", () => {
  const a = movementMember();
  const b = movementMember({
    sourceClass: "STORE_OPERATING_SUMMARY",
    required: false
  });
  const base = scenario({
    movementCoverage: movementCoverage({ members: [a, b] })
  });
  const repeat = integrateCashBridgeSources(clone(base));
  assert.deepEqual(repeat, integrateCashBridgeSources(clone(base)));

  const reversed = clone(base);
  reversed.cashEvents.reverse();
  reversed.movementCoverage.account_universe.accounts.reverse();
  reversed.movementCoverage.source_coverage.reverse();
  assert.deepEqual(
    integrateCashBridgeSources(base),
    integrateCashBridgeSources(reversed)
  );
});

test("privacy-unsafe metadata fails closed and is not echoed", () => {
  const opening = observed({
    role: "OPENING",
    lineage: ["https://drive.google.com/private-source"]
  });
  const coverage = pointCoverage({
    role: "OPENING_BALANCE",
    mappedBalance: mapped(opening)
  });
  coverage.lineage = ["https://drive.google.com/private-coverage"];
  const result = integrateCashBridgeSources(scenario({
    openingSource: opening,
    openingCoverage: coverage
  }));
  assert.equal(result.bridge.opening_balance.value, null);
  assert.equal(result.bridge.computed_ending_balance.value, null);
  assert.equal(JSON.stringify(result).includes("drive.google.com"), false);
});

test("helper has no writes external APIs or duplicate Cash Bridge arithmetic", async () => {
  const source = await fs.readFile(
    new URL("../../02_CORE/shared/cash-bridge-source-integration-v1.mjs", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /\baxios\b|XMLHttpRequest|googleapis|drive\.files|supabase/i);
  assert.doesNotMatch(source, /writeFile|appendFile|unlink|rmSync|execSync|spawn\s*\(/);
  assert.doesNotMatch(source, /opening(?:Balance|_balance)?\.value\s*\+/i);
  assert.doesNotMatch(source, /totalKnownInflows\.value\s*-|known_inflows\.value\s*-/i);
  assert.match(source, /calculateCashBridge\s*\(/);
  assert.match(source, /cashSourceCoverageForBridge\s*\(/);
  assert.match(source, /evaluateCashSourceCoverage\s*\(/);
  assert.match(source, /mapCashBalanceSourceFact\s*\(/);
});

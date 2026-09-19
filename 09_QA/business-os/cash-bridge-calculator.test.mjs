import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import {
  CASH_BRIDGE_QUALITY_PRECEDENCE,
  calculateCashBridge,
  normalizeCashEvent
} from "../../02_CORE/shared/cash-bridge-v1.mjs";

const root = new URL("../../", import.meta.url);
const fixture = JSON.parse(
  await fs.readFile(
    new URL("09_QA/business-os/fixtures/cash-bridge-calculator-v1.fixture.json", root),
    "utf8"
  )
);

function clone(value) {
  return structuredClone(value);
}

function calculate(overrides = {}) {
  return calculateCashBridge({
    targetPeriod: clone(overrides.targetPeriod ?? fixture.target_period),
    scope: clone(overrides.scope ?? fixture.scope),
    openingBalance: Object.hasOwn(overrides, "openingBalance")
      ? clone(overrides.openingBalance)
      : clone(fixture.opening_balance),
    observedEndingBalance: Object.hasOwn(overrides, "observedEndingBalance")
      ? clone(overrides.observedEndingBalance)
      : clone(fixture.observed_ending_balance),
    events: Object.hasOwn(overrides, "events")
      ? clone(overrides.events)
      : clone(fixture.events),
    coverage: Object.hasOwn(overrides, "coverage")
      ? clone(overrides.coverage)
      : clone(fixture.coverage)
  });
}

function balance(metric, date, value, overrides = {}) {
  const quality = overrides.quality ?? "ACTUAL";
  return {
    period: {
      start: date,
      end: date,
      timezone: fixture.target_period.timezone,
      ...(overrides.period || {})
    },
    scope: {
      ...fixture.scope,
      ...(overrides.scope || {})
    },
    group: "CASH",
    metric,
    value,
    quality,
    source: {
      class: "RECORDED_CASH_SOURCE",
      label: "SANITIZED_BALANCE",
      ...(overrides.source || {})
    },
    as_of: overrides.as_of ?? `${date}T22:00:00+07:00`,
    reconciliation_status:
      overrides.reconciliation_status ??
      (quality === "ACTUAL" ? "RECONCILED" : "PARTIAL"),
    evidence: overrides.evidence ?? ["BALANCE_EVIDENCED"],
    lineage: overrides.lineage ?? [`${metric}:${date}`],
    ...Object.fromEntries(
      Object.entries(overrides).filter(
        ([key]) => ![
          "period",
          "scope",
          "source",
          "as_of",
          "reconciliation_status",
          "evidence",
          "lineage",
          "quality"
        ].includes(key)
      )
    )
  };
}

function cashEvent(direction, category, date, amount, overrides = {}) {
  const quality = overrides.quality ?? "ACTUAL";
  return {
    event_id: overrides.event_id,
    direction,
    category,
    event_date: date,
    timezone: overrides.timezone ?? fixture.target_period.timezone,
    scope: {
      ...fixture.scope,
      ...(overrides.scope || {})
    },
    amount,
    quality,
    source: {
      class: "RECORDED_CASH_SOURCE",
      label: "SANITIZED_CASH_EVENT",
      ...(overrides.source || {})
    },
    as_of: overrides.as_of ?? `${date}T21:00:00+07:00`,
    reconciliation_status:
      overrides.reconciliation_status ??
      (quality === "ACTUAL" ? "RECONCILED" : "PARTIAL"),
    evidence: overrides.evidence ?? ["CASH_EVENT_EVIDENCED"],
    lineage: overrides.lineage ?? [
      `CASH_EVENT:${direction}:${category}:${date}:${String(amount)}`
    ],
    cash_movement_proven: overrides.cash_movement_proven ?? true,
    proof_basis: overrides.proof_basis ?? "DIRECT_CASH_EVENT",
    status: overrides.status ?? "ACTIVE",
    payment_method: overrides.payment_method,
    cash_location: overrides.cash_location
  };
}

test("quality precedence is deterministic", () => {
  assert.deepEqual(CASH_BRIDGE_QUALITY_PRECEDENCE, [
    "NOT_CONNECTED",
    "GAP",
    "ESTIMATE",
    "ACTUAL"
  ]);
});

test("privacy-safe fixture all ACTUAL + COMPLETE calculates exact ending and variance", () => {
  const result = calculate();

  assert.equal(
    result.total_known_inflows.value,
    fixture.expected.total_known_inflows
  );
  assert.equal(
    result.total_known_outflows.value,
    fixture.expected.total_known_outflows
  );
  assert.equal(
    result.computed_ending_balance.value,
    fixture.expected.computed_ending_balance
  );
  assert.equal(result.cash_variance.value, fixture.expected.cash_variance);
  assert.equal(result.computed_ending_balance.quality, "ACTUAL");
  assert.equal(result.cash_variance.quality, "ACTUAL");
  assert.equal(result.quality, "ACTUAL");
});

test("formula is exactly opening + inflows - outflows", () => {
  const result = calculate({
    openingBalance: balance("cash_opening_balance", "2026-09-01", 500),
    observedEndingBalance: balance(
      "cash_observed_ending_balance",
      "2026-09-03",
      625
    ),
    events: [
      cashEvent("INFLOW", "SALES_COLLECTION", "2026-09-02", 200),
      cashEvent("OUTFLOW", "PAYROLL", "2026-09-02", 75)
    ]
  });

  assert.equal(result.computed_ending_balance.value, 625);
});

test("variance sign is observed ending minus computed ending", () => {
  const result = calculate({
    openingBalance: balance("cash_opening_balance", "2026-09-01", 1000),
    observedEndingBalance: balance(
      "cash_observed_ending_balance",
      "2026-09-03",
      900
    ),
    events: []
  });

  assert.equal(result.computed_ending_balance.value, 1000);
  assert.equal(result.cash_variance.value, -100);
});

test("explicit proven opening and ending zero remain valid", () => {
  const result = calculate({
    openingBalance: balance("cash_opening_balance", "2026-09-01", 0),
    observedEndingBalance: balance(
      "cash_observed_ending_balance",
      "2026-09-03",
      0
    ),
    events: []
  });

  assert.equal(result.total_known_inflows.value, 0);
  assert.equal(result.total_known_outflows.value, 0);
  assert.equal(result.computed_ending_balance.value, 0);
  assert.equal(result.cash_variance.value, 0);
  assert.equal(result.computed_ending_balance.quality, "ACTUAL");
});

test("only inflows use explicit complete coverage to prove zero outflows", () => {
  const result = calculate({
    openingBalance: balance("cash_opening_balance", "2026-09-01", 100),
    observedEndingBalance: balance(
      "cash_observed_ending_balance",
      "2026-09-03",
      125
    ),
    events: [
      cashEvent("INFLOW", "SALES_COLLECTION", "2026-09-02", 25)
    ]
  });

  assert.equal(result.total_known_inflows.value, 25);
  assert.equal(result.total_known_outflows.value, 0);
  assert.equal(result.computed_ending_balance.value, 125);
});

test("only outflows use explicit complete coverage to prove zero inflows", () => {
  const result = calculate({
    openingBalance: balance("cash_opening_balance", "2026-09-01", 100),
    observedEndingBalance: balance(
      "cash_observed_ending_balance",
      "2026-09-03",
      75
    ),
    events: [
      cashEvent("OUTFLOW", "OTHER_OPEX", "2026-09-02", 25)
    ]
  });

  assert.equal(result.total_known_inflows.value, 0);
  assert.equal(result.total_known_outflows.value, 25);
  assert.equal(result.computed_ending_balance.value, 75);
});

test("no events with explicit COMPLETE coverage legitimately proves zero movement", () => {
  const result = calculate({
    openingBalance: balance("cash_opening_balance", "2026-09-01", 100),

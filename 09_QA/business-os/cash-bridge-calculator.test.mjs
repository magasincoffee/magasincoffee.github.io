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
    observedEndingBalance: balance(
      "cash_observed_ending_balance",
      "2026-09-03",
      100
    ),
    events: [],
    coverage: true
  });

  assert.equal(result.coverage.status, "COMPLETE");
  assert.equal(result.total_known_inflows.value, 0);
  assert.equal(result.total_known_outflows.value, 0);
  assert.equal(result.computed_ending_balance.value, 100);
});

test("missing coverage never turns absent events into zero", () => {
  const result = calculate({
    events: [],
    coverage: undefined
  });

  assert.equal(result.coverage.status, "MISSING");
  assert.equal(result.total_known_inflows.value, null);
  assert.equal(result.total_known_outflows.value, null);
  assert.equal(result.computed_ending_balance.value, null);
  assert.equal(result.computed_ending_balance.quality, "GAP");
});

test("missing opening makes computed ending GAP", () => {
  const result = calculate({ openingBalance: undefined });

  assert.equal(result.opening_balance.value, null);
  assert.equal(result.computed_ending_balance.quality, "GAP");
  assert.equal(result.computed_ending_balance.value, null);
  assert.equal(result.cash_variance.value, null);
});

test("NOT_CONNECTED opening balance directly propagates to computed ending", () => {
  const result = calculate({
    openingBalance: balance(
      "cash_opening_balance",
      "2026-09-01",
      1000,
      { quality: "NOT_CONNECTED" }
    )
  });

  assert.equal(result.opening_balance.quality, "NOT_CONNECTED");
  assert.equal(result.opening_balance.value, null);
  assert.equal(result.computed_ending_balance.quality, "NOT_CONNECTED");
  assert.equal(result.computed_ending_balance.value, null);
});

test("NOT_CONNECTED observed ending does not erase computed ending but variance is NOT_CONNECTED", () => {
  const result = calculate({
    observedEndingBalance: balance(
      "cash_observed_ending_balance",
      "2026-09-03",
      1150,
      { quality: "NOT_CONNECTED" }
    )
  });

  assert.equal(result.computed_ending_balance.quality, "ACTUAL");
  assert.equal(result.computed_ending_balance.value, 1150);
  assert.equal(result.cash_variance.quality, "NOT_CONNECTED");
  assert.equal(result.cash_variance.value, null);
});

test("opening balance scope mismatch fails closed", () => {
  const result = calculate({
    openingBalance: balance(
      "cash_opening_balance",
      "2026-09-01",
      1000,
      { scope: { branch: "CN2" } }
    )
  });

  assert.equal(result.opening_balance.quality, "GAP");
  assert.equal(result.opening_balance.value, null);
  assert.equal(result.opening_balance.reason, "BALANCE_SCOPE_MISMATCH");
  assert.equal(result.computed_ending_balance.value, null);
});

test("missing observed ending does not erase a valid computed ending", () => {
  const result = calculate({ observedEndingBalance: undefined });

  assert.equal(result.computed_ending_balance.quality, "ACTUAL");
  assert.equal(result.computed_ending_balance.value, 1150);
  assert.equal(result.cash_variance.quality, "GAP");
  assert.equal(result.cash_variance.value, null);
});

test("PARTIAL coverage keeps known evidenced sums but computed ending stays GAP", () => {
  const result = calculate({
    coverage: {
      status: "PARTIAL",
      as_of: "2026-09-03T23:00:00+07:00",
      lineage: ["PARTIAL_COVERAGE"]
    }
  });

  assert.equal(result.total_known_inflows.value, 300);
  assert.equal(result.total_known_outflows.value, 150);
  assert.equal(result.total_known_inflows.metric, "known_evidenced_cash_inflows");
  assert.equal(result.computed_ending_balance.quality, "GAP");
  assert.equal(result.computed_ending_balance.value, null);
});

test("MISSING coverage can still show valid known event sums but cannot compute period ending", () => {
  const result = calculate({
    coverage: { status: "MISSING" }
  });

  assert.equal(result.total_known_inflows.value, 300);
  assert.equal(result.total_known_outflows.value, 150);
  assert.equal(result.computed_ending_balance.value, null);
  assert.equal(result.computed_ending_balance.quality, "GAP");
});

test("required NOT_CONNECTED event source propagates deterministically", () => {
  const result = calculate({
    coverage: {
      status: "COMPLETE",
      source_coverage: [
        {
          source: "BANK_ACCOUNT_SOURCE",
          status: "NOT_CONNECTED",
          required: true
        }
      ]
    }
  });

  assert.equal(result.coverage.status, "PARTIAL");
  assert.equal(result.coverage.required_not_connected, true);
  assert.equal(result.total_known_inflows.value, 300);
  assert.equal(result.computed_ending_balance.quality, "NOT_CONNECTED");
  assert.equal(result.computed_ending_balance.value, null);
  assert.ok(result.diagnostics.includes("REQUIRED_EVENT_SOURCE_NOT_CONNECTED"));
});

test("ESTIMATE opening downgrades computed ending and variance but never becomes ACTUAL", () => {
  const result = calculate({
    openingBalance: balance(
      "cash_opening_balance",
      "2026-09-01",
      1000,
      { quality: "ESTIMATE" }
    )
  });

  assert.equal(result.computed_ending_balance.quality, "ESTIMATE");
  assert.equal(result.computed_ending_balance.value, 1150);
  assert.equal(result.cash_variance.quality, "ESTIMATE");
});

test("ESTIMATE cash event downgrades computed ending", () => {
  const events = clone(fixture.events);
  events[0].quality = "ESTIMATE";
  events[0].reconciliation_status = "PARTIAL";

  const result = calculate({ events });

  assert.equal(result.total_known_inflows.quality, "ESTIMATE");
  assert.equal(result.computed_ending_balance.quality, "ESTIMATE");
  assert.equal(result.computed_ending_balance.value, 1150);
});

test("GAP event dependency is excluded from known sum and blocks computed ending", () => {
  const events = [
    cashEvent("INFLOW", "SALES_COLLECTION", "2026-09-02", 100),
    cashEvent("OUTFLOW", "OTHER_OPEX", "2026-09-02", undefined)
  ];
  const result = calculate({ events });

  assert.equal(result.total_known_inflows.value, 100);
  assert.equal(result.total_known_outflows.value, null);
  assert.equal(result.computed_ending_balance.quality, "GAP");
  assert.equal(result.computed_ending_balance.value, null);
  assert.ok(result.diagnostics.includes("EVENT_DEPENDENCY_GAP"));
});

test("NOT_CONNECTED event dependency propagates NOT_CONNECTED", () => {
  const events = [
    cashEvent("INFLOW", "SALES_COLLECTION", "2026-09-02", 100),
    cashEvent("OUTFLOW", "OTHER_OPEX", "2026-09-02", null, {
      quality: "NOT_CONNECTED"
    })
  ];
  const result = calculate({ events });

  assert.equal(result.computed_ending_balance.quality, "NOT_CONNECTED");
  assert.equal(result.computed_ending_balance.value, null);
});

test("consolidated INTERNAL_TRANSFER is reported but neutral to formula", () => {
  const scope = {
    branch: "ALL",
    channel: "ALL",
    aggregate_proven: true
  };
  const result = calculate({
    scope,
    openingBalance: balance(
      "cash_opening_balance",
      "2026-09-01",
      1000,
      { scope }
    ),
    observedEndingBalance: balance(
      "cash_observed_ending_balance",
      "2026-09-03",
      1000,
      { scope }
    ),
    events: [
      cashEvent("TRANSFER", "INTERNAL_TRANSFER", "2026-09-02", 500, {
        scope,
        proof_basis: "INTERNAL_TRANSFER"
      })
    ]
  });

  assert.equal(result.transfers.event_count, 1);
  assert.equal(result.transfers.consolidated_neutral, true);
  assert.equal(result.transfers.known_evidenced_amount.value, 500);
  assert.equal(result.total_known_inflows.value, 0);
  assert.equal(result.total_known_outflows.value, 0);
  assert.equal(result.computed_ending_balance.value, 1000);
});

test("branch-scoped INTERNAL_TRANSFER fails closed rather than guessing net effect", () => {
  const result = calculate({
    events: [
      cashEvent("TRANSFER", "INTERNAL_TRANSFER", "2026-09-02", 500, {
        proof_basis: "INTERNAL_TRANSFER"
      })
    ]
  });

  assert.equal(result.transfers.event_count, 1);
  assert.equal(result.transfers.consolidated_neutral, false);
  assert.equal(result.computed_ending_balance.quality, "GAP");
  assert.equal(result.computed_ending_balance.value, null);
  assert.ok(
    result.diagnostics.includes("TRANSFER_SCOPE_AMBIGUOUS_UNSUPPORTED_V1")
  );
});

test("account-qualified consolidated scope with transfer is unsupported in V1", () => {
  const scope = {
    branch: "ALL",
    channel: "ALL",
    aggregate_proven: true,
    account: "BANK_OPERATING"
  };
  const result = calculate({
    scope,
    openingBalance: balance(
      "cash_opening_balance",
      "2026-09-01",
      1000,
      { scope }
    ),
    observedEndingBalance: balance(
      "cash_observed_ending_balance",
      "2026-09-03",
      1000,
      { scope }
    ),
    events: [
      cashEvent("TRANSFER", "INTERNAL_TRANSFER", "2026-09-02", 500, {
        scope,
        proof_basis: "INTERNAL_TRANSFER"
      })
    ]
  });

  assert.equal(result.computed_ending_balance.value, null);
  assert.ok(
    result.diagnostics.includes("TRANSFER_SCOPE_AMBIGUOUS_UNSUPPORTED_V1")
  );
});

test("category breakdown preserves exact known amounts and event counts", () => {
  const result = calculate({
    events: [
      cashEvent("INFLOW", "SALES_COLLECTION", "2026-09-01", 100),
      cashEvent("INFLOW", "SALES_COLLECTION", "2026-09-02", 50),
      cashEvent("INFLOW", "FINANCING_INFLOW", "2026-09-03", 25),
      cashEvent("OUTFLOW", "MARKETING", "2026-09-02", 10)
    ],
    observedEndingBalance: balance(
      "cash_observed_ending_balance",
      "2026-09-03",
      1165
    )
  });

  const sales = result.categorized_known_inflows.find(
    (entry) => entry.category === "SALES_COLLECTION"
  );
  const financing = result.categorized_known_inflows.find(
    (entry) => entry.category === "FINANCING_INFLOW"
  );
  const marketing = result.categorized_known_outflows.find(
    (entry) => entry.category === "MARKETING"
  );

  assert.equal(sales.event_count, 2);
  assert.equal(sales.amount_truth.value, 150);
  assert.equal(financing.amount_truth.value, 25);
  assert.equal(marketing.amount_truth.value, 10);
  assert.equal(result.total_known_inflows.value, 175);
  assert.equal(result.total_known_outflows.value, 10);
});

test("negative outflow is rejected; calculator never flips sign to make it usable", () => {
  const result = calculate({
    events: [
      cashEvent("OUTFLOW", "OTHER_OPEX", "2026-09-02", -100)
    ]
  });

  assert.equal(result.total_known_outflows.value, null);
  assert.equal(result.computed_ending_balance.value, null);
  assert.ok(result.diagnostics.includes("NEGATIVE_VALUE_NOT_ALLOWED"));
});

test("missing NaN and Infinity event amounts fail closed", () => {
  for (const amount of [undefined, Number.NaN, Number.POSITIVE_INFINITY]) {
    const result = calculate({
      events: [
        cashEvent("INFLOW", "SALES_COLLECTION", "2026-09-02", amount)
      ]
    });
    assert.equal(result.computed_ending_balance.value, null);
    assert.equal(result.computed_ending_balance.quality, "GAP");
  }
});

test("VOID event is excluded and blocks a complete-period computation", () => {
  const result = calculate({
    events: [
      cashEvent("OUTFLOW", "OTHER_OPEX", "2026-09-02", 100, {
        status: "VOID"
      })
    ]
  });

  assert.equal(result.total_known_outflows.value, null);
  assert.equal(result.computed_ending_balance.value, null);
  assert.ok(result.diagnostics.includes("VOID_CASH_EVENT_EXCLUDED"));
});

test("event scope mismatch fails closed", () => {
  const result = calculate({
    events: [
      cashEvent("INFLOW", "SALES_COLLECTION", "2026-09-02", 100, {
        scope: { branch: "CN2" }
      })
    ]
  });

  assert.equal(result.computed_ending_balance.value, null);
  assert.ok(result.diagnostics.includes("EVENT_SCOPE_MISMATCH"));
});

test("event timezone mismatch fails closed", () => {
  const result = calculate({
    events: [
      cashEvent("INFLOW", "SALES_COLLECTION", "2026-09-02", 100, {
        timezone: "UTC"
      })
    ]
  });

  assert.equal(result.computed_ending_balance.value, null);
  assert.ok(result.diagnostics.includes("EVENT_TIMEZONE_MISMATCH"));
});

test("event outside target period fails closed", () => {
  const result = calculate({
    events: [
      cashEvent("INFLOW", "SALES_COLLECTION", "2026-09-04", 100)
    ]
  });

  assert.equal(result.computed_ending_balance.value, null);
  assert.ok(result.diagnostics.includes("EVENT_PERIOD_OUTSIDE_TARGET"));
});

test("unproven ALL target scope never becomes consolidated truth", () => {
  const scope = {
    branch: "ALL",
    channel: "ALL",
    aggregate_proven: false
  };
  const result = calculate({
    scope,
    openingBalance: balance(
      "cash_opening_balance",
      "2026-09-01",
      1000,
      { scope }
    ),
    observedEndingBalance: balance(
      "cash_observed_ending_balance",
      "2026-09-03",
      1000,
      { scope }
    ),
    events: []
  });

  assert.equal(result.scope.branch, null);
  assert.equal(result.scope.channel, null);
  assert.equal(result.computed_ending_balance.value, null);
  assert.ok(result.diagnostics.includes("INVALID_TARGET_SCOPE"));
});

test("opening balance period and timezone must match target-start semantics", () => {
  const wrongDate = calculate({
    openingBalance: balance(
      "cash_opening_balance",
      "2026-09-02",
      1000
    )
  });
  assert.equal(wrongDate.computed_ending_balance.value, null);
  assert.equal(wrongDate.opening_balance.reason, "BALANCE_PERIOD_MISMATCH");

  const wrongTimezone = calculate({
    openingBalance: balance(
      "cash_opening_balance",
      "2026-09-01",
      1000,
      { period: { timezone: "UTC" } }
    )
  });
  assert.equal(wrongTimezone.computed_ending_balance.value, null);
  assert.equal(wrongTimezone.opening_balance.reason, "BALANCE_PERIOD_MISMATCH");
});

test("observed ending mismatch affects variance but not a valid computed ending", () => {
  const result = calculate({
    observedEndingBalance: balance(
      "cash_observed_ending_balance",
      "2026-09-02",
      1150
    )
  });

  assert.equal(result.computed_ending_balance.value, 1150);
  assert.equal(result.computed_ending_balance.quality, "ACTUAL");
  assert.equal(result.cash_variance.value, null);
  assert.equal(result.cash_variance.quality, "GAP");
});

test("negative balances remain valid generic Financial Truth inputs", () => {
  const result = calculate({
    openingBalance: balance("cash_opening_balance", "2026-09-01", -100),
    observedEndingBalance: balance(
      "cash_observed_ending_balance",
      "2026-09-03",
      -100
    ),
    events: []
  });

  assert.equal(result.computed_ending_balance.value, -100);
  assert.equal(result.cash_variance.value, 0);
});

test("identical stable event_id is de-duplicated exactly once", () => {
  const event = cashEvent(
    "INFLOW",

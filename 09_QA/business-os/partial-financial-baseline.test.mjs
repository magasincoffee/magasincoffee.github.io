import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import {
  BASELINE_QUALITY_PRECEDENCE,
  PARTIAL_FINANCIAL_BASELINE_SCHEMA_VERSION,
  PARTIAL_FINANCIAL_BASELINE_STATUS,
  composePartialFinancialBaseline
} from "../../02_CORE/shared/partial-financial-baseline-v1.mjs";

const root = new URL("../../", import.meta.url);
const fixture = JSON.parse(
  await fs.readFile(
    new URL("09_QA/business-os/fixtures/partial-financial-baseline-v1.fixture.json", root),
    "utf8"
  )
);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function compose(overrides = {}) {
  return composePartialFinancialBaseline({
    targetPeriod: clone(fixture.target_period),
    scope: clone(fixture.scope),
    asOf: fixture.snapshot_as_of,
    revenue: clone(fixture.revenue),
    cashInputs: clone(fixture.cash_inputs),
    ap: clone(fixture.ap),
    cogs: clone(fixture.cogs),
    operatingCosts: clone(fixture.operating_costs),
    ...overrides
  });
}

function gapTruth(source, reason, group, metric) {
  return {
    period: clone(fixture.target_period),
    scope: clone(fixture.scope),
    group,
    metric,
    value: null,
    quality: "GAP",
    source: { class: "SANITIZED_SOURCE", label: source },
    as_of: fixture.snapshot_as_of,
    reconciliation_status: "NOT_APPLICABLE",
    evidence: [],
    lineage: ["SANITIZED_GAP_LINEAGE"],
    reason
  };
}

test("contract exposes canonical composition and exact management profit formula", async () => {
  const contract = JSON.parse(
    await fs.readFile(
      new URL("02_CORE/contracts/partial-financial-baseline.v1.json", root),
      "utf8"
    )
  );
  assert.equal(contract.schema_version, PARTIAL_FINANCIAL_BASELINE_SCHEMA_VERSION);
  assert.equal(contract.status, "CANONICAL_COMPOSER");
  assert.equal(contract.task, "TASK-058");
  assert.equal(
    contract.profit.formula,
    "revenue - cogs - operating_costs"
  );
  assert.deepEqual(contract.profit.quality_precedence, BASELINE_QUALITY_PRECEDENCE);
  assert.equal(contract.acceptance_examples.length >= 5, true);
});

test("all compatible ACTUAL period truths produce correct management profit", () => {
  const result = compose();
  assert.equal(result.profit.quality, "ACTUAL");
  assert.equal(result.profit.metric, "management_operating_profit_baseline");
  assert.equal(result.profit.value, 350);
  assert.equal(result.revenue.value, 1000);
  assert.equal(result.cogs.value, 400);
  assert.equal(result.operating_costs.value, 250);
});

test("Revenue ACTUAL with missing COGS leaves Revenue intact and Profit GAP/null", () => {
  const result = compose({ cogs: undefined });
  assert.equal(result.revenue.quality, "ACTUAL");
  assert.equal(result.revenue.value, 1000);
  assert.equal(result.cogs.quality, "GAP");
  assert.equal(result.cogs.value, null);
  assert.equal(result.cogs.reason, "COGS_CONSUMPTION_TRUTH_NOT_AVAILABLE");
  assert.equal(result.profit.quality, "GAP");
  assert.equal(result.profit.value, null);
});

test("missing Operating Costs prevents numeric Profit", () => {
  const result = compose({ operatingCosts: undefined });
  assert.equal(result.operating_costs.quality, "GAP");
  assert.equal(result.operating_costs.value, null);
  assert.equal(result.profit.quality, "GAP");
  assert.equal(result.profit.value, null);
});

test("ESTIMATE COGS caps derived Profit at ESTIMATE", () => {
  const cogs = clone(fixture.cogs);
  cogs.quality = "ESTIMATE";
  const result = compose({ cogs });
  assert.equal(result.cogs.quality, "ESTIMATE");
  assert.equal(result.profit.quality, "ESTIMATE");
  assert.equal(result.profit.value, 350);
});

test("ESTIMATE Operating Costs caps derived Profit at ESTIMATE", () => {
  const operatingCosts = clone(fixture.operating_costs);
  operatingCosts.quality = "ESTIMATE";
  const result = compose({ operatingCosts });
  assert.equal(result.profit.quality, "ESTIMATE");
  assert.equal(result.profit.value, 350);
});

test("Revenue NOT_CONNECTED makes Profit NOT_CONNECTED and never numeric", () => {
  const revenue = clone(fixture.revenue);
  revenue.quality = "NOT_CONNECTED";
  revenue.value = null;
  revenue.reason = "REVENUE_SOURCE_NOT_CONNECTED";
  const result = compose({ revenue });
  assert.equal(result.revenue.quality, "NOT_CONNECTED");
  assert.equal(result.revenue.value, null);
  assert.equal(result.profit.quality, "NOT_CONNECTED");
  assert.equal(result.profit.value, null);
});

test("explicit proven Revenue zero remains zero and can yield negative management profit", () => {
  const revenue = clone(fixture.revenue);
  revenue.value = 0;
  const result = compose({ revenue });
  assert.equal(result.revenue.quality, "ACTUAL");
  assert.equal(result.revenue.value, 0);
  assert.equal(result.profit.quality, "ACTUAL");
  assert.equal(result.profit.value, -650);
});

test("missing COGS is never synthetic zero", () => {
  const result = compose({ cogs: undefined });
  assert.notEqual(result.cogs.value, 0);
  assert.equal(result.cogs.value, null);
});

test("blank COGS numeric value is not coerced to zero", () => {
  const cogs = clone(fixture.cogs);
  cogs.value = "";
  const result = compose({ cogs });
  assert.equal(result.cogs.quality, "GAP");
  assert.equal(result.cogs.value, null);
  assert.equal(result.profit.value, null);
});

test("COGS period mismatch fails only COGS/Profit closed", () => {
  const cogs = clone(fixture.cogs);
  cogs.period.start = "2026-08-01";
  const result = compose({ cogs });
  assert.equal(result.cogs.quality, "GAP");
  assert.equal(result.cogs.reason, "COMPONENT_PERIOD_MISMATCH");
  assert.equal(result.profit.quality, "GAP");
  assert.equal(result.revenue.quality, "ACTUAL");
  assert.equal(result.cash_bridge.computed_ending_balance.quality, "ACTUAL");
});

test("Operating Cost scope mismatch fails only that component and Profit", () => {
  const operatingCosts = clone(fixture.operating_costs);
  operatingCosts.scope.branch = "CN2";
  const result = compose({ operatingCosts });
  assert.equal(result.operating_costs.quality, "GAP");
  assert.equal(result.operating_costs.reason, "COMPONENT_SCOPE_MISMATCH");
  assert.equal(result.profit.quality, "GAP");
  assert.equal(result.revenue.quality, "ACTUAL");
});

test("unproven ALL target never becomes proven scope", () => {
  const result = composePartialFinancialBaseline({
    targetPeriod: clone(fixture.target_period),
    scope: { branch: "ALL", channel: "ALL", aggregate_proven: false },
    revenue: clone(fixture.revenue),
    cogs: clone(fixture.cogs),
    operatingCosts: clone(fixture.operating_costs)
  });
  assert.equal(result.scope.branch, null);
  assert.equal(result.scope.channel, null);
  assert.ok(result.diagnostics.includes("INVALID_TARGET_SCOPE"));
  assert.notEqual(result.profit.quality, "ACTUAL");
});

test("Revenue numeric value with PARTIAL coverage is not promoted into baseline", () => {
  const revenue = clone(fixture.revenue);
  revenue.coverage.status = "PARTIAL";
  const result = compose({ revenue });
  assert.equal(result.revenue.quality, "GAP");
  assert.equal(result.revenue.value, null);
  assert.ok(result.revenue.diagnostics.includes("COMPONENT_COVERAGE_INCOMPLETE"));
  assert.equal(result.profit.value, null);
});

test("Cash Bridge PARTIAL preserves known evidenced sums but computed ending stays GAP/null", () => {
  const cashInputs = clone(fixture.cash_inputs);
  cashInputs.coverage.status = "PARTIAL";
  const result = compose({ cashInputs, cashBridge: undefined });
  assert.equal(result.cash_bridge.total_known_inflows.value, 50);
  assert.equal(result.cash_bridge.total_known_outflows.value, 20);
  assert.match(result.cash_bridge.total_known_inflows.metric, /known_evidenced/);
  assert.equal(result.cash_bridge.computed_ending_balance.quality, "GAP");
  assert.equal(result.cash_bridge.computed_ending_balance.value, null);
});

test("computed ending ACTUAL remains when observed ending is missing and variance is GAP", () => {
  const cashInputs = clone(fixture.cash_inputs);
  delete cashInputs.observedEndingBalance;
  const result = compose({ cashInputs, cashBridge: undefined });
  assert.equal(result.cash_bridge.computed_ending_balance.quality, "ACTUAL");
  assert.equal(result.cash_bridge.computed_ending_balance.value, 130);
  assert.equal(result.cash_bridge.cash_variance.quality, "GAP");
  assert.equal(result.cash_bridge.cash_variance.value, null);
});

test("canonical Cash Bridge input is preserved instead of recalculated", () => {
  const first = compose();
  const result = compose({
    cashBridge: first.cash_bridge,
    cashInputs: {
      openingBalance: { value: 999999 },
      events: []
    }
  });
  assert.deepEqual(result.cash_bridge, first.cash_bridge);
});

test("Cash Bridge target mismatch fails cash component without erasing Revenue", () => {
  const first = compose();
  const bridge = clone(first.cash_bridge);
  bridge.target_period.end = "2026-09-04";
  const result = compose({ cashBridge: bridge, cashInputs: undefined });
  assert.equal(result.cash_bridge.quality, "GAP");
  assert.equal(result.cash_bridge.computed_ending_balance.value, null);
  assert.equal(result.revenue.quality, "ACTUAL");
  assert.equal(result.revenue.value, 1000);
});

test("AP ACTUAL current state is preserved and excluded from Profit formula", () => {
  const result = compose();
  assert.equal(result.ap.quality, "ACTUAL");
  assert.equal(result.ap.outstanding.value, 300);
  assert.equal(result.ap.overdue.value, 50);
  assert.equal(result.ap.temporal_relation, "MATCHES_TARGET_END");
  assert.equal(result.profit.value, 350);
});

test("current AP with a different point date is labeled current-state mismatch, not backdated", () => {
  const ap = clone(fixture.ap);
  for (const key of ["outstanding", "overdue"]) {
    ap[key].period.start = "2026-09-04";
    ap[key].period.end = "2026-09-04";
    ap[key].as_of = "2026-09-04T10:00:00+07:00";
  }
  ap.coverage.current_source_date = "2026-09-04";
  const result = compose({ ap });
  assert.equal(result.ap.quality, "ACTUAL");
  assert.equal(result.ap.outstanding.period.end, "2026-09-04");
  assert.equal(result.ap.temporal_relation, "CURRENT_STATE_NOT_TARGET_END");
  assert.ok(result.ap.diagnostics.includes("AP_CURRENT_STATE_NOT_TARGET_PERIOD_END"));
  assert.equal(result.profit.value, 350);
});

test("historical AP unavailable remains GAP and never blocks period Profit", () => {
  const ap = {
    quality: "GAP",
    outstanding: {
      period: clone(fixture.target_period),
      scope: clone(fixture.scope),
      group: "AP",
      metric: "procurement_supplier_ap_outstanding",
      value: null,
      quality: "GAP",
      source: { class: "PROCUREMENT_CURRENT_AP_VIEW", label: "V_PROCUREMENT_SUPPLIER_PAYABLES" },
      as_of: fixture.snapshot_as_of,
      reconciliation_status: "NOT_APPLICABLE",
      evidence: [],
      lineage: ["V_PROCUREMENT_SUPPLIER_PAYABLES_CURRENT_STATE"],
      reason: "HISTORICAL_AP_SNAPSHOT_NOT_AVAILABLE"
    },
    overdue: {
      period: clone(fixture.target_period),
      scope: clone(fixture.scope),
      group: "AP",
      metric: "procurement_supplier_ap_overdue",
      value: null,
      quality: "GAP",
      source: { class: "PROCUREMENT_CURRENT_AP_VIEW", label: "V_PROCUREMENT_SUPPLIER_PAYABLES" },
      as_of: fixture.snapshot_as_of,
      reconciliation_status: "NOT_APPLICABLE",
      evidence: [],
      lineage: ["V_PROCUREMENT_SUPPLIER_PAYABLES_CURRENT_STATE"],
      reason: "HISTORICAL_AP_SNAPSHOT_NOT_AVAILABLE"
    },
    diagnostics: ["HISTORICAL_AP_SNAPSHOT_NOT_AVAILABLE"]
  };
  const result = compose({ ap });
  assert.equal(result.ap.quality, "GAP");
  assert.equal(result.ap.outstanding.value, null);
  assert.equal(result.profit.quality, "ACTUAL");
  assert.equal(result.profit.value, 350);
});

test("AP failure does not erase Revenue or Cash evidence", () => {
  const result = compose({ ap: undefined });
  assert.equal(result.ap.quality, "GAP");
  assert.equal(result.revenue.quality, "ACTUAL");
  assert.equal(result.cash_bridge.computed_ending_balance.quality, "ACTUAL");
});

test("Revenue failure does not erase AP or Cash evidence", () => {
  const revenue = clone(fixture.revenue);
  revenue.quality = "GAP";
  revenue.value = null;
  revenue.reason = "REVENUE_GAP";
  const result = compose({ revenue });
  assert.equal(result.revenue.quality, "GAP");
  assert.equal(result.ap.quality, "ACTUAL");
  assert.equal(result.cash_bridge.computed_ending_balance.quality, "ACTUAL");
  assert.equal(result.profit.value, null);
});

test("Cash failure does not erase period Revenue or AP", () => {
  const result = compose({ cashInputs: undefined, cashBridge: undefined });
  assert.equal(result.cash_bridge.quality, "GAP");
  assert.equal(result.revenue.quality, "ACTUAL");
  assert.equal(result.ap.quality, "ACTUAL");
  assert.equal(result.profit.value, 350);
});

test("no purchase-derived COGS occurs when COGS truth is absent", () => {
  const result = compose({
    cogs: undefined,
    declaredGaps: [{ component: "PROCUREMENT", reason: "PURCHASE_ROWS_AVAILABLE" }]
  });
  assert.equal(result.cogs.value, null);
  assert.equal(result.cogs.reason, "COGS_CONSUMPTION_TRUTH_NOT_AVAILABLE");
  assert.equal(result.profit.value, null);
});

test("Cash evidence cannot substitute for COGS or Operating Costs in Profit", () => {
  const result = compose({ cogs: undefined, operatingCosts: undefined });
  assert.equal(result.cash_bridge.computed_ending_balance.quality, "ACTUAL");
  assert.equal(result.profit.quality, "GAP");
  assert.equal(result.profit.value, null);
});

test("privacy-unsafe canonical component source fails closed", () => {
  const cogs = clone(fixture.cogs);
  cogs.source.label = "https://drive.google.com/private";
  const result = compose({ cogs });
  assert.equal(result.cogs.quality, "GAP");
  assert.equal(result.cogs.value, null);
  assert.equal(result.cogs.reason, "PRIVACY_UNSAFE_COMPONENT_EVIDENCE");
  assert.doesNotMatch(JSON.stringify(result), /drive\.google\.com/i);
});

test("privacy-unsafe diagnostics and declared gaps are removed", () => {
  const revenue = clone(fixture.revenue);
  revenue.diagnostics = ["SAFE_REVENUE_NOTE", "https://docs.google.com/private"];
  const result = compose({
    revenue,
    declaredGaps: [
      "SAFE_DECLARED_GAP",
      "https://drive.google.com/private",
      { component: "BANK", quality: "NOT_CONNECTED", reason: "BANK_BALANCE_NOT_CONNECTED" }
    ]
  });
  assert.ok(result.diagnostics.includes("SAFE_REVENUE_NOTE"));
  assert.doesNotMatch(JSON.stringify(result), /google\.com/i);
  assert.ok(result.missing_sources.some((x) => x.reason === "SAFE_DECLARED_GAP"));
  assert.ok(result.missing_sources.some((x) => x.reason === "BANK_BALANCE_NOT_CONNECTED"));
});

test("missing_sources ordering is deterministic and de-duplicated", () => {
  const result = compose({
    cogs: undefined,
    operatingCosts: undefined,
    declaredGaps: [
      "Z_SOURCE_GAP",
      "A_SOURCE_GAP",
      "Z_SOURCE_GAP"
    ]
  });
  const serialized = result.missing_sources.map((x) =>
    [x.component, x.quality, x.reason].join("|")
  );
  assert.deepEqual(serialized, [...new Set(serialized)].sort());
});

test("declared gap input order does not affect composed result", () => {
  const a = compose({ declaredGaps: ["BANK_NOT_CONNECTED", "MOMO_NOT_CONNECTED"] });
  const b = compose({ declaredGaps: ["MOMO_NOT_CONNECTED", "BANK_NOT_CONNECTED"] });
  assert.deepEqual(b, a);
});

test("composer is deterministic and idempotent for the same canonical inputs", () => {
  const first = compose();
  const second = compose();
  assert.deepEqual(second, first);
});

test("caller snapshot as_of is preserved exactly when valid", () => {
  const result = compose({ asOf: "2026-09-04T00:00:00+07:00" });
  assert.equal(result.as_of, "2026-09-04T00:00:00+07:00");
});

test("without caller as_of composer uses deterministic max upstream as-of", () => {
  const result = composePartialFinancialBaseline({
    targetPeriod: clone(fixture.target_period),
    scope: clone(fixture.scope),
    revenue: clone(fixture.revenue),
    cashInputs: clone(fixture.cash_inputs),
    ap: clone(fixture.ap),
    cogs: clone(fixture.cogs),
    operatingCosts: clone(fixture.operating_costs)
  });
  assert.equal(result.as_of, "2026-09-03T23:00:00+07:00");
});

test("data_quality exposes component states and PARTIAL label is not a new truth quality", () => {
  const result = compose({ cogs: undefined });
  assert.equal(result.data_quality.status, PARTIAL_FINANCIAL_BASELINE_STATUS);
  assert.equal(result.data_quality.components.revenue, "ACTUAL");
  assert.equal(result.data_quality.components.cogs, "GAP");
  assert.equal(result.data_quality.components.profit, "GAP");
  assert.ok(BASELINE_QUALITY_PRECEDENCE.includes(result.data_quality.quality));
  assert.equal(BASELINE_QUALITY_PRECEDENCE.includes(result.data_quality.status), false);
});

test("component-level truth remains visible even when overall quality is GAP", () => {
  const result = compose({ cogs: undefined });
  assert.equal(result.data_quality.quality, "GAP");
  assert.equal(result.revenue.value, 1000);
  assert.equal(result.ap.outstanding.value, 300);
  assert.equal(result.cash_bridge.computed_ending_balance.value, 130);
});

test("composer is read-only and contains no write calls or source-specific queries", async () => {
  const source = await fs.readFile(
    new URL("../../02_CORE/shared/partial-financial-baseline-v1.mjs", import.meta.url),
    "utf8"
  );
  for (const forbidden of [".insert(", ".update(", ".delete(", ".upsert(", ".rpc(", ".from("]) {
    assert.equal(source.includes(forbidden), false);
  }
  assert.doesNotMatch(source, /procurement_supplier_payments/);
  assert.doesNotMatch(source, /v_procurement_supplier_payables/);
});

test("fixture contains no Drive URL or private raw locator", () => {
  assert.doesNotMatch(JSON.stringify(fixture), /drive\.google\.com|docs\.google\.com|https?:\/\//i);
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import {
  loadMonthlyRevenueForControlTower,
  projectMonthlyRevenueBaseline
} from "../../04_OWNER/ControlTower/revenue-adapter-v1.mjs";
import { normalizeControlTowerSnapshot } from "../../04_OWNER/ControlTower/snapshot-v1.mjs";

const targetPeriod = Object.freeze({
  start: "2026-09-01",
  end: "2026-09-02",
  timezone: "Asia/Ho_Chi_Minh"
});

const scope = Object.freeze({
  branch: "CN1",
  channel: "DIRECT",
  aggregate_proven: false
});

const coverage = Object.freeze({
  mode: "DAILY",
  expected_dates: ["2026-09-01", "2026-09-02"]
});

function baseline(overrides = {}) {
  const base = {
    schema_version: "financial-truth.v1",
    baseline_schema_version: "monthly-revenue-baseline.v1",
    period: targetPeriod,
    scope,
    group: "REVENUE",
    metric: "reconciled_revenue",
    value: 300,
    quality: "ACTUAL",
    source: {
      class: "DERIVED_AGGREGATION",
      label: "MONTHLY_REVENUE_BASELINE_V1"
    },
    as_of: "2026-09-02T22:00:00+07:00",
    reconciliation_status: "RECONCILED",
    evidence: ["COVERAGE_COMPLETE", "REVENUE_RECONCILED_ONLY"],
    lineage: ["MONTHLY_REVENUE_BASELINE_V1", "REVENUE_FACT:2026-09-01"],
    message: "Revenue baseline is complete for the requested period and scope.",
    reason: "COMPLETE_RECONCILED_COVERAGE",
    coverage: {
      status: "COMPLETE",
      mode: "DAILY",
      target_start: "2026-09-01",
      target_end: "2026-09-02",
      expected_count: 2,
      covered_count: 2,
      expected_units: ["2026-09-01", "2026-09-02"],
      covered_units: ["2026-09-01", "2026-09-02"],
      missing_units: [],
      reason: null
    },
    diagnostics: []
  };
  return {
    ...base,
    ...overrides,
    period: { ...base.period, ...(overrides.period || {}) },
    scope: { ...base.scope, ...(overrides.scope || {}) },
    source: { ...base.source, ...(overrides.source || {}) },
    coverage: { ...base.coverage, ...(overrides.coverage || {}) }
  };
}

function candidate(date, amount, overrides = {}) {
  return {
    reportingDate: date,
    timezone: targetPeriod.timezone,
    scope,
    amount,
    trusted: true,
    reconciliationStatus: "RECONCILED",
    sourceClass: "RECONCILED_READ_MODEL",
    source: "SANITIZED_REVENUE_SOURCE",
    asOf: `${date}T22:00:00+07:00`,
    lineage: [`REVENUE_CANDIDATE:${date}`],
    evidence: [`DATE:${date}`],
    metric: "reconciled_revenue",
    ...overrides
  };
}

test("complete ACTUAL baseline projects a Control Tower amount and preserves internal semantics", () => {
  const result = projectMonthlyRevenueBaseline(baseline());
  assert.equal(result.quality, "ACTUAL");
  assert.equal(result.amount, 300);
  assert.equal(result.source, "MONTHLY_REVENUE_BASELINE_V1");
  assert.equal(result.asOf, "2026-09-02T22:00:00+07:00");
  assert.equal(result.coverage.status, "COMPLETE");
  assert.deepEqual(result.scope, scope);
  assert.equal(result.reconciliationStatus, "RECONCILED");
  assert.ok(result.lineage.includes("MONTHLY_REVENUE_BASELINE_V1"));
});

test("explicit proven ACTUAL zero stays zero", () => {
  const result = projectMonthlyRevenueBaseline(baseline({ value: 0 }));
  assert.equal(result.quality, "ACTUAL");
  assert.equal(result.amount, 0);
});

test("PARTIAL coverage fails closed to GAP and hides amount", () => {
  const result = projectMonthlyRevenueBaseline(
    baseline({ coverage: { status: "PARTIAL", missing_units: ["2026-09-02"] } })
  );
  assert.equal(result.quality, "GAP");
  assert.equal(result.amount, null);
  assert.equal(result.projectionReason, "INCOMPLETE_REVENUE_COVERAGE");
});

test("MISSING coverage fails closed to GAP and hides amount", () => {
  const result = projectMonthlyRevenueBaseline(
    baseline({ coverage: { status: "MISSING", covered_count: 0 } })
  );
  assert.equal(result.quality, "GAP");
  assert.equal(result.amount, null);
});

test("NOT_CONNECTED never exposes amount", () => {
  const result = projectMonthlyRevenueBaseline(
    baseline({ quality: "NOT_CONNECTED", value: null, as_of: null })
  );
  assert.equal(result.quality, "NOT_CONNECTED");
  assert.equal(result.amount, null);
});

test("ESTIMATE is never upgraded and never exposes Revenue amount", () => {
  const result = projectMonthlyRevenueBaseline(
    baseline({ quality: "ESTIMATE", value: 250, reconciliation_status: "UNRECONCILED" })
  );
  assert.equal(result.quality, "ESTIMATE");
  assert.equal(result.amount, null);
});

test("missing, negative, NaN and infinite amounts cannot be exposed", () => {
  for (const value of [undefined, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const result = projectMonthlyRevenueBaseline(baseline({ value }));
    assert.equal(result.quality, "GAP");
    assert.equal(result.amount, null);
    assert.equal(result.projectionReason, "INVALID_REVENUE_AMOUNT");
  }
});

test("unproven ALL scope cannot become ACTUAL", () => {
  const result = projectMonthlyRevenueBaseline(
    baseline({
      scope: { branch: "ALL", channel: "ALL", aggregate_proven: false }
    })
  );
  assert.equal(result.quality, "GAP");
  assert.equal(result.amount, null);
  assert.equal(result.projectionReason, "UNPROVEN_AGGREGATE_SCOPE");
});

test("canonical Revenue projection never relies on legacy snapshot default branchScope=ALL", () => {
  const result = projectMonthlyRevenueBaseline(
    baseline({ scope: { branch: null, channel: null, aggregate_proven: false } })
  );
  const snapshot = normalizeControlTowerSnapshot({
    context: {},
    revenue: result
  });

  assert.equal(result.scope.branch, null);
  assert.equal(result.scope.channel, null);
  assert.equal(result.quality, "GAP");
  assert.equal(result.amount, null);
  assert.equal(snapshot.context.branchScope, "ALL");
  assert.equal(snapshot.revenue.amount, null);
});

test("privacy-unsafe source metadata fails closed instead of leaking a trusted amount", () => {
  const result = projectMonthlyRevenueBaseline(
    baseline({ source: { label: "https://drive.google.com/private" } })
  );
  assert.equal(result.quality, "GAP");
  assert.equal(result.amount, null);
  assert.equal(result.source, null);
  assert.equal(result.projectionReason, "INVALID_REVENUE_SOURCE_METADATA");
});

test("missing lineage cannot be upgraded to ACTUAL", () => {
  const result = projectMonthlyRevenueBaseline(baseline({ lineage: [] }));
  assert.equal(result.quality, "GAP");
  assert.equal(result.amount, null);
  assert.equal(result.projectionReason, "MISSING_REVENUE_LINEAGE");
});

test("async loader passes only explicit period/scope/coverage/reader semantics and returns ACTUAL", async () => {
  const calls = [];
  const result = await loadMonthlyRevenueForControlTower({
    targetPeriod,
    scope,
    coverage,
    reader: async (args) => {
      calls.push(args);
      return {
        records: [
          candidate("2026-09-01", 100),
          candidate("2026-09-02", 200)
        ]
      };
    }
  });

  assert.deepEqual(calls, [{ targetPeriod, scope, coverage }]);
  assert.equal(result.quality, "ACTUAL");
  assert.equal(result.amount, 300);
  assert.equal(result.coverage.status, "COMPLETE");
  assert.deepEqual(result.scope, scope);
});

test("missing reader is NOT_CONNECTED with no raw or gross fallback", async () => {
  const result = await loadMonthlyRevenueForControlTower({
    targetPeriod,
    scope,
    coverage,
    grossRevenue: 999999
  });
  assert.equal(result.quality, "NOT_CONNECTED");
  assert.equal(result.amount, null);
  assert.match(result.message, /not connected|chưa được kết nối/i);
});

test("reader failure is section-local GAP with no amount", async () => {
  const result = await loadMonthlyRevenueForControlTower({
    targetPeriod,
    scope,
    coverage,
    reader: async () => {
      throw new Error("private source unavailable");
    }
  });
  assert.equal(result.quality, "GAP");
  assert.equal(result.amount, null);
  assert.doesNotMatch(JSON.stringify(result), /private source unavailable/);
});

test("untrusted and unreconciled reader inputs cannot pass through the projection", async () => {
  const result = await loadMonthlyRevenueForControlTower({
    targetPeriod,
    scope,
    coverage,
    reader: async () => ({
      records: [
        candidate("2026-09-01", 100),
        candidate("2026-09-02", 200, {
          trusted: false,
          reconciliationStatus: "PARTIAL"
        })
      ]
    })
  });
  assert.equal(result.quality, "GAP");
  assert.equal(result.amount, null);
});

test("mixed reader scopes and unproven ALL cannot become ACTUAL", async () => {
  const mixed = await loadMonthlyRevenueForControlTower({
    targetPeriod,
    scope,
    coverage,
    reader: async () => ({
      records: [
        candidate("2026-09-01", 100),
        candidate("2026-09-02", 200, {
          scope: { branch: "CN2", channel: "DIRECT", aggregate_proven: false }
        })
      ]
    })
  });
  assert.equal(mixed.quality, "GAP");
  assert.equal(mixed.amount, null);

  const unprovenAll = await loadMonthlyRevenueForControlTower({
    targetPeriod,
    scope: { branch: "ALL", channel: "ALL", aggregate_proven: false },
    coverage,
    reader: async () => ({
      records: [candidate("2026-09-01", 100), candidate("2026-09-02", 200)]
    })
  });
  assert.equal(unprovenAll.quality, "GAP");
  assert.equal(unprovenAll.amount, null);
});

test("gross reader facts are not used as fallback Revenue ACTUAL", async () => {
  const result = await loadMonthlyRevenueForControlTower({
    targetPeriod,
    scope,
    coverage,
    reader: async () => ({
      records: [
        candidate("2026-09-01", 100),
        candidate("2026-09-02", 200, { metric: "gross_foodapp_revenue" })
      ]
    })
  });
  assert.equal(result.quality, "GAP");
  assert.equal(result.amount, null);
  assert.ok(result.diagnostics.includes("GROSS_REVENUE_FORBIDDEN"));
});

test("Revenue adapter remains read-only and production boot does not invent monthly context", async () => {
  const [adapterSource, controlTowerSource] = await Promise.all([
    fs.readFile(
      new URL("../../04_OWNER/ControlTower/revenue-adapter-v1.mjs", import.meta.url),
      "utf8"
    ),
    fs.readFile(
      new URL("../../04_OWNER/ControlTower/control-tower-v1.js", import.meta.url),
      "utf8"
    )
  ]);

  for (const forbidden of [".insert(", ".update(", ".delete(", ".upsert(", ".rpc("]) {
    assert.equal(adapterSource.includes(forbidden), false);
  }

  assert.match(adapterSource, /loadMonthlyRevenueBaseline/);
  assert.doesNotMatch(controlTowerSource, /loadMonthlyRevenueForControlTower/);
  assert.match(
    controlTowerSource,
    /loadReconciledRevenue\(\{\s*reportingDate:\s*rawState\.context\.reportingDate\s*\}\)/s
  );
});

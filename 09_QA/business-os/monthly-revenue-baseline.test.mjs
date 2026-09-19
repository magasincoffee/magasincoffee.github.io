import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import {
  MONTHLY_REVENUE_BASELINE_SCHEMA_VERSION,
  aggregateMonthlyRevenueBaseline,
  loadMonthlyRevenueBaseline
} from "../../02_CORE/shared/monthly-revenue-baseline-v1.mjs";

const root = new URL("../../", import.meta.url);

const targetPeriod = Object.freeze({
  start: "2026-09-01",
  end: "2026-09-03",
  timezone: "Asia/Ho_Chi_Minh"
});

const scope = Object.freeze({
  branch: "CN1",
  channel: "DIRECT",
  aggregate_proven: false
});

const dailyCoverage = Object.freeze({
  mode: "DAILY",
  expected_dates: ["2026-09-01", "2026-09-02", "2026-09-03"]
});

function fact(date, value, overrides = {}) {
  const base = {
    period: { start: date, end: date, timezone: targetPeriod.timezone },
    scope,
    group: "REVENUE",
    metric: "reconciled_revenue",
    value,
    quality: "ACTUAL",
    source: { class: "RECONCILED_READ_MODEL", label: "SANITIZED_REVENUE_SOURCE" },
    as_of: `${date}T22:00:00+07:00`,
    reconciliation_status: "RECONCILED",
    evidence: [`DATE:${date}`],
    lineage: [`REVENUE_FACT:${date}`],
    message: "Reconciled revenue fact.",
    reason: "SOURCE_RECONCILED"
  };
  return {
    ...base,
    ...overrides,
    period: { ...base.period, ...(overrides.period || {}) },
    scope: { ...base.scope, ...(overrides.scope || {}) },
    source: { ...base.source, ...(overrides.source || {}) }
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

function aggregate(records, overrides = {}) {
  return aggregateMonthlyRevenueBaseline({
    targetPeriod,
    scope,
    records,
    coverage: dailyCoverage,
    ...overrides
  });
}

test("acceptance contract explicitly reuses Financial Truth and forbids gross fallback", async () => {
  const raw = await fs.readFile(
    new URL("02_CORE/contracts/monthly-revenue-baseline.v1.json", root),
    "utf8"
  );
  const contract = JSON.parse(raw);
  assert.equal(contract.schema_version, MONTHLY_REVENUE_BASELINE_SCHEMA_VERSION);
  assert.equal(contract.canonical_truth_contract, "financial-truth.v1");
  assert.ok(contract.coverage_states.includes("COMPLETE"));
  assert.ok(contract.coverage_states.includes("PARTIAL"));
  assert.ok(contract.coverage_states.includes("MISSING"));
  assert.ok(contract.non_goals.includes("gross_foodapp_fallback"));
});

test("complete reconciled daily coverage returns ACTUAL total", () => {
  const result = aggregate([
    fact("2026-09-01", 100),
    fact("2026-09-02", 200),
    fact("2026-09-03", 300)
  ]);
  assert.equal(result.quality, "ACTUAL");
  assert.equal(result.value, 600);
  assert.equal(result.coverage.status, "COMPLETE");
  assert.deepEqual(result.diagnostics, []);
});

test("trusted candidate records normalize through Financial Truth before aggregation", () => {
  const result = aggregate([
    candidate("2026-09-01", 100),
    candidate("2026-09-02", 200),
    candidate("2026-09-03", 300)
  ]);
  assert.equal(result.quality, "ACTUAL");
  assert.equal(result.value, 600);
  assert.equal(result.reconciliation_status, "RECONCILED");
});

test("explicit proven zero remains ACTUAL zero", () => {
  const result = aggregate([
    fact("2026-09-01", 0),
    fact("2026-09-02", 0),
    fact("2026-09-03", 0)
  ]);
  assert.equal(result.quality, "ACTUAL");
  assert.equal(result.value, 0);
  assert.equal(result.coverage.status, "COMPLETE");
});

test("missing day or incomplete coverage fails closed to GAP null", () => {
  const result = aggregate([
    fact("2026-09-01", 100),
    fact("2026-09-03", 300)
  ]);
  assert.equal(result.quality, "GAP");
  assert.equal(result.value, null);
  assert.equal(result.coverage.status, "PARTIAL");
  assert.ok(result.coverage.missing_units.includes("2026-09-02"));
});

test("daily ACTUAL requires explicit full expected coverage", () => {
  const result = aggregateMonthlyRevenueBaseline({
    targetPeriod,
    scope,
    records: [
      fact("2026-09-01", 100),
      fact("2026-09-02", 200),
      fact("2026-09-03", 300)
    ],
    coverage: { mode: "DAILY", expected_dates: ["2026-09-01", "2026-09-02"] }
  });
  assert.equal(result.quality, "GAP");
  assert.equal(result.value, null);
  assert.equal(result.coverage.reason, "EXPECTED_COVERAGE_NOT_EXPLICIT_FOR_FULL_TARGET");
});

test("unreconciled Revenue fails closed", () => {
  const result = aggregate([
    fact("2026-09-01", 100),
    fact("2026-09-02", 200, { reconciliation_status: "PARTIAL" }),
    fact("2026-09-03", 300)
  ]);
  assert.equal(result.quality, "GAP");
  assert.equal(result.value, null);
  assert.ok(result.diagnostics.includes("INPUT_NOT_ACTUAL"));
});

test("untrusted candidate Revenue fails closed", () => {
  const result = aggregate([
    candidate("2026-09-01", 100),
    candidate("2026-09-02", 200, { trusted: false }),
    candidate("2026-09-03", 300)
  ]);
  assert.equal(result.quality, "GAP");
  assert.equal(result.value, null);
  assert.ok(result.diagnostics.includes("UNTRUSTED_REVENUE_SOURCE"));
});

test("invalid source metadata cannot produce monthly ACTUAL", () => {
  const result = aggregate([
    fact("2026-09-01", 100),
    fact("2026-09-02", 200, { source: { class: "RECONCILED_READ_MODEL", label: "https://drive.google.com/unsafe" } }),
    fact("2026-09-03", 300)
  ]);
  assert.equal(result.quality, "GAP");
  assert.equal(result.value, null);
});

test("record outside target period is rejected instead of silently ignored", () => {
  const result = aggregate([
    fact("2026-09-01", 100),
    fact("2026-09-02", 200),
    fact("2026-09-04", 400)
  ]);
  assert.equal(result.quality, "GAP");
  assert.equal(result.value, null);
  assert.ok(result.diagnostics.includes("OUTSIDE_TARGET_PERIOD"));
});

test("mixed branch/channel scopes never collapse to ALL", () => {
  const result = aggregate([
    fact("2026-09-01", 100),
    fact("2026-09-02", 200, { scope: { branch: "CN2", channel: "DIRECT", aggregate_proven: false } }),
    fact("2026-09-03", 300)
  ]);
  assert.equal(result.quality, "GAP");
  assert.equal(result.value, null);
  assert.equal(result.scope.branch, "CN1");
  assert.ok(result.diagnostics.includes("SCOPE_MISMATCH"));
});

test("proven ALL aggregate is valid only when target and facts prove ALL", () => {
  const allScope = { branch: "ALL", channel: "ALL", aggregate_proven: true };
  const result = aggregateMonthlyRevenueBaseline({
    targetPeriod,
    scope: allScope,
    coverage: dailyCoverage,
    records: [
      fact("2026-09-01", 100, { scope: allScope }),
      fact("2026-09-02", 200, { scope: allScope }),
      fact("2026-09-03", 300, { scope: allScope })
    ]
  });
  assert.equal(result.quality, "ACTUAL");
  assert.equal(result.value, 600);
  assert.equal(result.scope.branch, "ALL");
  assert.equal(result.scope.aggregate_proven, true);
});

test("unproven ALL target fails closed instead of becoming enterprise-wide", () => {
  const result = aggregateMonthlyRevenueBaseline({
    targetPeriod,
    scope: { branch: "ALL", channel: "ALL", aggregate_proven: false },
    coverage: dailyCoverage,
    records: [fact("2026-09-01", 100)]
  });
  assert.equal(result.quality, "GAP");
  assert.equal(result.value, null);
  assert.equal(result.scope.branch, null);
  assert.equal(result.reason, "INVALID_TARGET_SCOPE");
});

test("identical duplicate fact is de-duplicated only with stable privacy-safe identity", () => {
  const first = fact("2026-09-01", 100, { fact_id: "REV-CN1-20260901" });
  const duplicate = { ...first, fact_id: "REV-CN1-20260901" };
  const result = aggregate([
    first,
    duplicate,
    fact("2026-09-02", 200, { fact_id: "REV-CN1-20260902" }),
    fact("2026-09-03", 300, { fact_id: "REV-CN1-20260903" })
  ]);
  assert.equal(result.quality, "ACTUAL");
  assert.equal(result.value, 600);
});

test("conflicting duplicate stable identity fails closed", () => {
  const result = aggregate([
    fact("2026-09-01", 100, { fact_id: "REV-CN1-20260901" }),
    fact("2026-09-01", 999, { fact_id: "REV-CN1-20260901" }),
    fact("2026-09-02", 200),
    fact("2026-09-03", 300)
  ]);
  assert.equal(result.quality, "GAP");
  assert.equal(result.value, null);
  assert.ok(result.diagnostics.includes("DUPLICATE_FACT_ID_CONFLICT"));
});

test("duplicate daily fact without stable identity fails closed", () => {
  const result = aggregate([
    fact("2026-09-01", 100),
    fact("2026-09-01", 100),
    fact("2026-09-02", 200),
    fact("2026-09-03", 300)
  ]);
  assert.equal(result.quality, "GAP");
  assert.equal(result.value, null);
  assert.equal(result.coverage.reason, "DUPLICATE_OR_OVERLAPPING_DAILY_FACTS");
});

test("overlapping period facts fail closed", () => {
  const result = aggregateMonthlyRevenueBaseline({
    targetPeriod,
    scope,
    coverage: { mode: "PERIODS" },
    records: [
      fact("2026-09-01", 300, { period: { start: "2026-09-01", end: "2026-09-02" } }),
      fact("2026-09-02", 500, { period: { start: "2026-09-02", end: "2026-09-03" } })
    ]
  });
  assert.equal(result.quality, "GAP");
  assert.equal(result.value, null);
  assert.equal(result.coverage.reason, "OVERLAPPING_PERIODS");
});

test("non-overlapping explicit period facts can prove complete target coverage", () => {
  const result = aggregateMonthlyRevenueBaseline({
    targetPeriod,
    scope,
    coverage: { mode: "PERIODS" },
    records: [
      fact("2026-09-01", 300, { period: { start: "2026-09-01", end: "2026-09-02" } }),
      fact("2026-09-03", 300)
    ]
  });
  assert.equal(result.quality, "ACTUAL");
  assert.equal(result.value, 600);
  assert.equal(result.coverage.status, "COMPLETE");
});

test("negative Revenue is rejected", () => {
  const result = aggregate([
    fact("2026-09-01", 100),
    fact("2026-09-02", -1),
    fact("2026-09-03", 300)
  ]);
  assert.equal(result.quality, "GAP");
  assert.equal(result.value, null);
});

test("missing amount never normalizes to zero", () => {
  const result = aggregate([
    fact("2026-09-01", 100),
    fact("2026-09-02", undefined),
    fact("2026-09-03", 300)
  ]);
  assert.equal(result.quality, "GAP");
  assert.equal(result.value, null);
});

test("NaN and Infinity are invalid Revenue values", () => {
  for (const invalid of [Number.NaN, Number.POSITIVE_INFINITY]) {
    const result = aggregate([
      fact("2026-09-01", 100),
      fact("2026-09-02", invalid),
      fact("2026-09-03", 300)
    ]);
    assert.equal(result.quality, "GAP");
    assert.equal(result.value, null);
  }
});

test("gross Revenue metric is never used as fallback ACTUAL", () => {
  const result = aggregate([
    fact("2026-09-01", 100),
    fact("2026-09-02", 200, { metric: "gross_foodapp_revenue" }),
    fact("2026-09-03", 300)
  ]);
  assert.equal(result.quality, "GAP");
  assert.equal(result.value, null);
  assert.ok(result.diagnostics.includes("GROSS_REVENUE_FORBIDDEN"));
});

test("privacy-safe lineage is preserved and derived deterministically", () => {
  const result = aggregate([
    fact("2026-09-01", 100, { lineage: ["SOURCE_A"] }),
    fact("2026-09-02", 200, { lineage: ["SOURCE_B"] }),
    fact("2026-09-03", 300, { lineage: ["SOURCE_C"] })
  ]);
  assert.deepEqual(result.lineage, [
    "MONTHLY_REVENUE_BASELINE_V1",
    "SOURCE_A",
    "SOURCE_B",
    "SOURCE_C"
  ]);
});

test("aggregation is deterministic and duplicate-safe for the same canonical facts", () => {
  const records = [
    fact("2026-09-01", 100, { fact_id: "REV-CN1-20260901" }),
    fact("2026-09-02", 200, { fact_id: "REV-CN1-20260902" }),
    fact("2026-09-03", 300, { fact_id: "REV-CN1-20260903" })
  ];
  const first = aggregate(records);
  const again = aggregate(records);
  const withRepeatedIdenticalFact = aggregate([records[0], records[0], records[1], records[2]]);
  assert.deepEqual(again, first);
  assert.deepEqual(withRepeatedIdenticalFact, first);
});

test("missing reader returns NOT_CONNECTED and ignores any gross fallback argument", async () => {
  const result = await loadMonthlyRevenueBaseline({
    targetPeriod,
    scope,
    coverage: dailyCoverage,
    grossRevenue: 999999
  });
  assert.equal(result.quality, "NOT_CONNECTED");
  assert.equal(result.value, null);
  assert.equal(result.reason, "RECONCILED_REVENUE_READER_NOT_CONNECTED");
});

test("reader failure fails closed and never invents fallback Revenue", async () => {
  const result = await loadMonthlyRevenueBaseline({
    targetPeriod,
    scope,
    coverage: dailyCoverage,
    reader: async () => {
      throw new Error("source unavailable");
    },
    grossRevenue: 999999
  });
  assert.equal(result.quality, "GAP");
  assert.equal(result.value, null);
  assert.equal(result.reason, "RECONCILED_REVENUE_READER_FAILED");
});

test("reader path aggregates only returned reconciled records", async () => {
  const calls = [];
  const result = await loadMonthlyRevenueBaseline({
    targetPeriod,
    scope,
    coverage: dailyCoverage,
    reader: async (args) => {
      calls.push(args);
      return {
        records: [
          fact("2026-09-01", 100),
          fact("2026-09-02", 200),
          fact("2026-09-03", 300)
        ]
      };
    }
  });
  assert.deepEqual(calls, [{ targetPeriod, scope, coverage: dailyCoverage }]);
  assert.equal(result.quality, "ACTUAL");
  assert.equal(result.value, 600);
});

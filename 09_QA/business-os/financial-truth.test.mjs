import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import {
  FINANCIAL_QUALITY_STATES,
  FINANCIAL_TRUTH_SCHEMA_VERSION,
  normalizeFinancialTruth
} from "../../02_CORE/shared/financial-truth-v1.mjs";

const root = new URL("../../", import.meta.url);

const base = Object.freeze({
  period: { start: "2026-09-01", end: "2026-09-19", timezone: "Asia/Ho_Chi_Minh" },
  scope: { branch: "CN1", channel: "DIRECT", aggregate_proven: false },
  group: "REVENUE",
  metric: "net_revenue",
  value: 1234500,
  quality: "ACTUAL",
  source: { class: "OPERATING_RECORD", label: "SANITIZED_RECONCILED_REVENUE" },
  as_of: "2026-09-19T20:30:00+07:00",
  reconciliation_status: "RECONCILED",
  evidence: ["PERIOD_MATCHED", "SOURCE_TRUSTED"],
  lineage: ["OPERATING_RECORD -> RECONCILIATION_GATE"],
  message: "Verified revenue for the stated period and scope.",
  reason: "SOURCE_RECONCILED"
});

function truth(overrides = {}, policy) {
  return normalizeFinancialTruth(
    {
      ...base,
      ...overrides,
      period: { ...base.period, ...(overrides.period || {}) },
      scope: { ...base.scope, ...(overrides.scope || {}) },
      source: { ...base.source, ...(overrides.source || {}) }
    },
    policy
  );
}

test("contract file exposes the same canonical four quality states", async () => {
  const raw = await fs.readFile(new URL("02_CORE/contracts/financial-truth.v1.json", root), "utf8");
  const contract = JSON.parse(raw);
  assert.equal(contract.schema_version, FINANCIAL_TRUTH_SCHEMA_VERSION);
  assert.deepEqual(contract.quality_states, FINANCIAL_QUALITY_STATES);
  assert.equal(contract.record_shape.scope.branch, "specific branch|ALL|null");
  assert.match(contract.rules.join("\n"), /Missing numeric values never normalize to zero/);
});

test("valid ACTUAL preserves finite value and canonical metadata", () => {
  const result = truth();
  assert.equal(result.quality, "ACTUAL");
  assert.equal(result.value, 1234500);
  assert.equal(result.schema_version, "financial-truth.v1");
  assert.equal(result.reconciliation_status, "RECONCILED");
});

test("valid ESTIMATE preserves finite value without becoming ACTUAL", () => {
  const result = truth({ quality: "ESTIMATE", reconciliation_status: "UNRECONCILED", value: 900000 });
  assert.equal(result.quality, "ESTIMATE");
  assert.equal(result.value, 900000);
});

test("GAP always redacts supplied numeric value", () => {
  const result = truth({ quality: "GAP", value: 999999 });
  assert.equal(result.quality, "GAP");
  assert.equal(result.value, null);
});

test("NOT_CONNECTED always redacts supplied numeric value", () => {
  const result = truth({ quality: "NOT_CONNECTED", value: 999999 });
  assert.equal(result.quality, "NOT_CONNECTED");
  assert.equal(result.value, null);
});

test("missing numeric value fails closed and never becomes zero", () => {
  const result = truth({ value: undefined });
  assert.equal(result.quality, "GAP");
  assert.equal(result.value, null);
  assert.equal(result.reason, "INVALID_NUMERIC_VALUE");
});

test("explicit zero ACTUAL remains zero when all proof metadata is valid", () => {
  const result = truth({ value: 0 });
  assert.equal(result.quality, "ACTUAL");
  assert.equal(result.value, 0);
});

test("NaN and infinity fail closed as invalid numeric values", () => {
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    const result = truth({ value });
    assert.equal(result.quality, "GAP");
    assert.equal(result.value, null);
    assert.equal(result.reason, "INVALID_NUMERIC_VALUE");
  }
});

test("negative finite values are generic-valid but metric policy may forbid them", () => {
  const generic = truth({ value: -25000 });
  assert.equal(generic.quality, "ACTUAL");
  assert.equal(generic.value, -25000);

  const restricted = truth({ value: -25000 }, { allowNegative: false });
  assert.equal(restricted.quality, "GAP");
  assert.equal(restricted.value, null);
  assert.equal(restricted.reason, "NEGATIVE_VALUE_NOT_ALLOWED");
});

test("missing and invalid quality fail closed using existing Control Tower semantics", () => {
  const missing = truth({ quality: undefined, value: 1000 });
  assert.equal(missing.quality, "NOT_CONNECTED");
  assert.equal(missing.value, null);
  assert.equal(missing.reason, "MISSING_QUALITY");

  const invalid = truth({ quality: "TRUST_ME", value: 1000 });
  assert.equal(invalid.quality, "GAP");
  assert.equal(invalid.value, null);
  assert.equal(invalid.reason, "INVALID_QUALITY");
});

test("ACTUAL missing source or as_of fails closed", () => {
  const missingSource = truth({ source: { class: null, label: null } });
  assert.equal(missingSource.quality, "GAP");
  assert.equal(missingSource.value, null);
  assert.equal(missingSource.reason, "INVALID_SOURCE");

  const missingAsOf = truth({ as_of: null });
  assert.equal(missingAsOf.quality, "GAP");
  assert.equal(missingAsOf.value, null);
  assert.equal(missingAsOf.reason, "INVALID_AS_OF");
});

test("unknown scope stays null and never silently becomes ALL", () => {
  const unknown = truth({ scope: { branch: null, channel: null, aggregate_proven: false } });
  assert.equal(unknown.scope.branch, null);
  assert.equal(unknown.scope.channel, null);
  assert.equal(unknown.quality, "GAP");

  const unprovenAll = truth({ scope: { branch: "ALL", channel: "ALL", aggregate_proven: false } });
  assert.equal(unprovenAll.scope.branch, null);
  assert.equal(unprovenAll.scope.channel, null);
  assert.equal(unprovenAll.quality, "GAP");

  const provenAll = truth({ scope: { branch: "ALL", channel: "ALL", aggregate_proven: true } });
  assert.equal(provenAll.scope.branch, "ALL");
  assert.equal(provenAll.scope.channel, "ALL");
  assert.equal(provenAll.quality, "ACTUAL");
});

test("lineage is preserved in order and URL-like evidence is excluded", () => {
  const result = truth({
    evidence: ["SOURCE_TRUSTED", "https://drive.google.com/unsafe", "SOURCE_TRUSTED"],
    lineage: ["OPERATING_RECORD", "RECONCILIATION_GATE"]
  });
  assert.deepEqual(result.evidence, ["SOURCE_TRUSTED"]);
  assert.deepEqual(result.lineage, ["OPERATING_RECORD", "RECONCILIATION_GATE"]);
});

test("privacy-unsafe source label fails closed for numeric truth", () => {
  const result = truth({ source: { class: "OPERATING_RECORD", label: "https://docs.google.com/unsafe" } });
  assert.equal(result.quality, "GAP");
  assert.equal(result.value, null);
  assert.equal(result.reason, "INVALID_SOURCE");
});

test("normalization is deterministic and idempotent", () => {
  const first = truth();
  const second = normalizeFinancialTruth(first);
  assert.deepEqual(second, first);
  assert.deepEqual(normalizeFinancialTruth(base), normalizeFinancialTruth(base));
});

test("Revenue can require RECONCILED while Cash/AP can use the same generic shape", () => {
  const revenue = truth({}, { requiredReconciliationStatuses: ["RECONCILED"] });
  assert.equal(revenue.quality, "ACTUAL");

  const unreconciledRevenue = truth(
    { reconciliation_status: "PARTIAL" },
    { requiredReconciliationStatuses: ["RECONCILED"] }
  );
  assert.equal(unreconciledRevenue.quality, "GAP");
  assert.equal(unreconciledRevenue.reason, "RECONCILIATION_POLICY_NOT_MET");

  const cash = truth({
    group: "CASH",
    metric: "recorded_cash_outflow",
    reconciliation_status: "PARTIAL",
    value: 250000
  });
  assert.equal(cash.group, "CASH");
  assert.equal(cash.quality, "ACTUAL");
  assert.equal(cash.value, 250000);

  const ap = truth({
    group: "AP",
    metric: "supplier_balance_due",
    reconciliation_status: "NOT_APPLICABLE",
    value: 500000
  });
  assert.equal(ap.group, "AP");
  assert.equal(ap.quality, "ACTUAL");
  assert.equal(ap.value, 500000);
});

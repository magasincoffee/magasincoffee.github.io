import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import {
  OPERATING_COST_TRUTH_SCHEMA_VERSION,
  OPERATING_COST_FAMILIES,
  OPERATING_COST_CLAIM_TYPES,
  OPERATING_COST_SOURCE_ROLES,
  OPERATING_COST_AMOUNT_SEMANTICS,
  OPERATING_COST_COVERAGE_STATES,
  normalizeOperatingCostTruth,
  operatingCostTruthForBaseline
} from "../../02_CORE/shared/operating-cost-truth-v1.mjs";
import {
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

const period = {
  start: "2026-09-01",
  end: "2026-09-03",
  timezone: "Asia/Ho_Chi_Minh"
};

const scope = {
  branch: "CN1",
  channel: "DIRECT",
  aggregate_proven: false
};

function financialTruth(overrides = {}) {
  return {
    period: clone(period),
    scope: clone(scope),
    group: "OPEX",
    metric: "operating_cost_payroll_labor",
    value: 100,
    quality: "ACTUAL",
    source: { class: "SANITIZED_OPEX_SOURCE", label: "SANITIZED_RECOGNITION" },
    as_of: "2026-09-03T20:00:00+07:00",
    reconciliation_status: "RECONCILED",
    evidence: ["OPEX_RECOGNITION_EVIDENCE"],
    lineage: ["OPEX:SANITIZED"],
    ...overrides
  };
}

function input(overrides = {}) {
  const raw = {
    cost_family: "PAYROLL_LABOR",
    claim_type: "EXACT_ITEM",
    source_role: "RECOGNITION_SOURCE",
    amount_semantics: "RECOGNIZED_COST",
    source_period: clone(period),
    source_scope: clone(scope),
    coverage: { status: "PARTIAL", coverage_proven: false },
    proof: {
      actuality_proven: true,
      recognition_period_proven: true,
      amount_semantics_proven: true,
      scope_proven: true,
      estimate_proven: false
    },
    allocation: {
      is_shared: false,
      applied: false,
      approved: false,
      rule_label: null
    },
    truth: financialTruth()
  };
  return {
    ...raw,
    ...overrides,
    proof: { ...raw.proof, ...(overrides.proof || {}) },
    coverage: { ...raw.coverage, ...(overrides.coverage || {}) },
    allocation: { ...raw.allocation, ...(overrides.allocation || {}) },
    truth: overrides.truth ? overrides.truth : raw.truth
  };
}

function periodAggregate(overrides = {}) {
  return input({
    claim_type: "PERIOD_AGGREGATE",
    coverage: { status: "COMPLETE", coverage_proven: true },
    truth: financialTruth({ metric: "operating_costs", value: 250 }),
    ...overrides
  });
}

test("contract exposes exact source-agnostic TASK-067 enums", async () => {
  const contract = JSON.parse(
    await fs.readFile(
      new URL("02_CORE/contracts/operating-cost-truth.v1.json", root),
      "utf8"
    )
  );
  assert.equal(contract.schema_version, OPERATING_COST_TRUTH_SCHEMA_VERSION);
  assert.equal(contract.task, "TASK-067");
  assert.deepEqual(contract.cost_families, [...OPERATING_COST_FAMILIES]);
  assert.deepEqual(contract.claim_types, [...OPERATING_COST_CLAIM_TYPES]);
  assert.deepEqual(contract.source_roles, [...OPERATING_COST_SOURCE_ROLES]);
  assert.deepEqual(contract.amount_semantics, [...OPERATING_COST_AMOUNT_SEMANTICS]);
  assert.deepEqual(contract.coverage_states, [...OPERATING_COST_COVERAGE_STATES]);
});

test("valid exact recognized ACTUAL is preserved under PARTIAL wider coverage", () => {
  const result = normalizeOperatingCostTruth(input());
  assert.equal(result.truth.quality, "ACTUAL");
  assert.equal(result.truth.value, 100);
  assert.equal(result.coverage.status, "PARTIAL");
  assert.equal(result.cost_family, "PAYROLL_LABOR");
});

test("explicit proven zero ACTUAL remains zero", () => {
  const result = normalizeOperatingCostTruth(input({
    truth: financialTruth({ value: 0 })
  }));
  assert.equal(result.truth.quality, "ACTUAL");
  assert.equal(result.truth.value, 0);
});

test("missing numeric value never becomes zero", () => {
  const truth = financialTruth();
  delete truth.value;
  const result = normalizeOperatingCostTruth(input({ truth }));
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.value, null);
  assert.notEqual(result.truth.value, 0);
});

test("GAP and NOT_CONNECTED Financial Truth remain null", () => {
  const gap = normalizeOperatingCostTruth(input({
    truth: financialTruth({ quality: "GAP", value: 999 })
  }));
  assert.equal(gap.truth.quality, "GAP");
  assert.equal(gap.truth.value, null);

  const notConnected = normalizeOperatingCostTruth(input({
    truth: financialTruth({ quality: "NOT_CONNECTED", value: 999 })
  }));
  assert.equal(notConnected.truth.quality, "NOT_CONNECTED");
  assert.equal(notConnected.truth.value, null);
});

test("explicit NOT_CONNECTED source role forces NOT_CONNECTED/null", () => {
  const result = normalizeOperatingCostTruth(input({
    source_role: "NOT_CONNECTED",
    truth: financialTruth({ value: 123 })
  }));
  assert.equal(result.truth.quality, "NOT_CONNECTED");
  assert.equal(result.truth.value, null);
  assert.equal(result.truth.reason, "OPERATING_COST_SOURCE_NOT_CONNECTED");
});

test("payment-only input cannot become recognized Operating Cost", () => {
  const result = normalizeOperatingCostTruth(input({
    source_role: "PAYMENT_SOURCE",
    amount_semantics: "PAYMENT_AMOUNT"
  }));
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.value, null);
  assert.equal(result.truth.reason, "PAYMENT_SOURCE_NOT_OPERATING_COST_RECOGNITION");
});

test("payroll payment cannot become labor recognition", () => {
  const result = normalizeOperatingCostTruth(input({
    cost_family: "PAYROLL_LABOR",
    source_role: "PAYMENT_SOURCE",
    amount_semantics: "PAYMENT_AMOUNT",
    truth: financialTruth({ metric: "payroll_paid_amount" })
  }));
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.value, null);
});

test("budget context cannot become ACTUAL", () => {
  const result = normalizeOperatingCostTruth(input({
    source_role: "BUDGET_CONTEXT",
    amount_semantics: "RECOGNIZED_COST"
  }));
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.reason, "CONTEXT_SOURCE_CANNOT_BE_ACTUAL_RECOGNITION");
});

test("explicit budget estimate remains ESTIMATE and never ACTUAL", () => {
  const result = normalizeOperatingCostTruth(input({
    source_role: "BUDGET_CONTEXT",
    amount_semantics: "ESTIMATED_COST",
    proof: {
      actuality_proven: false,
      recognition_period_proven: false,
      amount_semantics_proven: false,
      scope_proven: false,
      estimate_proven: true
    },
    truth: financialTruth({
      quality: "ESTIMATE",
      reconciliation_status: "UNRECONCILED"
    })
  }));
  assert.equal(result.truth.quality, "ESTIMATE");
  assert.equal(result.truth.value, 100);
});

test("ESTIMATE requires explicit estimate semantics and proof", () => {
  const result = normalizeOperatingCostTruth(input({
    amount_semantics: "RECOGNIZED_COST",
    truth: financialTruth({
      quality: "ESTIMATE",
      reconciliation_status: "UNRECONCILED"
    })
  }));
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.reason, "ESTIMATE_SEMANTICS_NOT_PROVEN");
});

test("FoodApp gross cannot become platform-fee recognition", () => {
  const result = normalizeOperatingCostTruth(input({
    cost_family: "PLATFORM_FEES_PROMOTIONS",
    source_role: "SETTLEMENT_SOURCE",
    amount_semantics: "SETTLEMENT_GROSS"
  }));
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.reason, "AMOUNT_SEMANTICS_NOT_RECOGNIZED_COST");
});

test("net settlement payout cannot become platform-fee recognition", () => {
  const result = normalizeOperatingCostTruth(input({
    cost_family: "PLATFORM_FEES_PROMOTIONS",
    source_role: "SETTLEMENT_SOURCE",
    amount_semantics: "SETTLEMENT_NET_PAYOUT"
  }));
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.value, null);
});

test("explicit settlement fee field may be exact recognized ACTUAL", () => {
  const result = normalizeOperatingCostTruth(input({
    cost_family: "PLATFORM_FEES_PROMOTIONS",
    source_role: "SETTLEMENT_SOURCE",
    amount_semantics: "RECOGNIZED_COST",
    truth: financialTruth({ metric: "provider_service_fee" })
  }));
  assert.equal(result.truth.quality, "ACTUAL");
  assert.equal(result.truth.value, 100);
});

test("ACTUAL requires actuality period amount and scope proof", () => {
  const result = normalizeOperatingCostTruth(input({
    proof: { actuality_proven: false }
  }));
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.reason, "ACTUAL_RECOGNITION_PROOF_INCOMPLETE");
});

test("source period mismatch fails current-vs-historical ACTUAL closed", () => {
  const result = normalizeOperatingCostTruth(input({
    source_period: {
      start: "2024-09-01",
      end: "2024-09-03",
      timezone: "Asia/Ho_Chi_Minh"
    }
  }));
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.reason, "SOURCE_PERIOD_MISMATCH");
});

test("source scope mismatch fails closed", () => {
  const result = normalizeOperatingCostTruth(input({
    source_scope: {
      branch: "CN2",
      channel: "DIRECT",
      aggregate_proven: false
    }
  }));
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.reason, "SOURCE_SCOPE_MISMATCH");
});

test("unproven ALL Financial Truth never becomes ACTUAL", () => {
  const allScope = {
    branch: "ALL",
    channel: "ALL",
    aggregate_proven: false
  };
  const result = normalizeOperatingCostTruth(input({
    source_scope: allScope,
    truth: financialTruth({ scope: allScope })
  }));
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.value, null);
});

test("proven ALL scope is accepted", () => {
  const allScope = {
    branch: "ALL",
    channel: "ALL",
    aggregate_proven: true
  };
  const result = normalizeOperatingCostTruth(input({
    source_scope: allScope,
    truth: financialTruth({ scope: allScope })
  }));
  assert.equal(result.truth.quality, "ACTUAL");
  assert.equal(result.truth.scope.branch, "ALL");
});

test("shared company OPEX cannot be invented as branch cost", () => {
  const result = normalizeOperatingCostTruth(input({
    cost_family: "SHARED_COMPANY_OPEX",
    allocation: { is_shared: true, applied: false, approved: false }
  }));
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.reason, "SHARED_OPEX_BRANCH_ALLOCATION_NOT_PROVEN");
});

test("approved shared-cost allocation may preserve branch ACTUAL", () => {
  const result = normalizeOperatingCostTruth(input({
    cost_family: "SHARED_COMPANY_OPEX",
    allocation: {
      is_shared: true,
      applied: true,
      approved: true,
      rule_label: "OWNER_APPROVED_ALLOCATION_RULE"
    }
  }));
  assert.equal(result.truth.quality, "ACTUAL");
  assert.equal(result.truth.value, 100);
});

test("any applied but unapproved allocation fails closed", () => {
  const result = normalizeOperatingCostTruth(input({
    cost_family: "RENT",
    allocation: { applied: true, approved: false }
  }));
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.reason, "UNAPPROVED_ALLOCATION");
});

test("ACTUAL period aggregate requires COMPLETE proven coverage", () => {
  const result = normalizeOperatingCostTruth(periodAggregate({
    coverage: { status: "PARTIAL", coverage_proven: false }
  }));
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.reason, "PERIOD_AGGREGATE_COVERAGE_INCOMPLETE");
});

test("ACTUAL period aggregate accepts COMPLETE proven coverage", () => {
  const result = normalizeOperatingCostTruth(periodAggregate());
  assert.equal(result.truth.quality, "ACTUAL");
  assert.equal(result.truth.value, 250);
  assert.equal(result.coverage.status, "COMPLETE");
});

test("negative Operating Cost is rejected in V1", () => {
  const result = normalizeOperatingCostTruth(input({
    truth: financialTruth({ value: -1 })
  }));
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.value, null);
  assert.equal(result.truth.reason, "NEGATIVE_VALUE_NOT_ALLOWED");
});

test("NaN and Infinity fail closed", () => {
  for (const value of [NaN, Infinity, -Infinity]) {
    const result = normalizeOperatingCostTruth(input({
      truth: financialTruth({ value })
    }));
    assert.equal(result.truth.quality, "GAP");
    assert.equal(result.truth.value, null);
  }
});

test("privacy-unsafe evidence fails closed without retaining locator", () => {
  const result = normalizeOperatingCostTruth(input({
    truth: financialTruth({
      evidence: ["https://drive.google.com/private-source"]
    })
  }));
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.reason, "PRIVACY_UNSAFE_OPERATING_COST_EVIDENCE");
  assert.equal(JSON.stringify(result).includes("drive.google.com"), false);
});

test("normalization is deterministic and idempotent", () => {
  const raw = input();
  const first = normalizeOperatingCostTruth(raw);
  const second = normalizeOperatingCostTruth(first);
  assert.deepEqual(first, second);
  assert.deepEqual(normalizeOperatingCostTruth(raw), normalizeOperatingCostTruth(raw));
});

test("exact item cannot be passed to baseline as full Operating Cost total", () => {
  const result = operatingCostTruthForBaseline(input());
  assert.equal(result.quality, "GAP");
  assert.equal(result.value, null);
  assert.equal(result.reason, "BASELINE_REQUIRES_PERIOD_AGGREGATE");
});

test("existing Partial Financial Baseline accepts canonical period aggregate without formula change", () => {
  const operatingCosts = operatingCostTruthForBaseline(periodAggregate());
  const result = composePartialFinancialBaseline({
    targetPeriod: clone(fixture.target_period),
    scope: clone(fixture.scope),
    asOf: fixture.snapshot_as_of,
    revenue: clone(fixture.revenue),
    cashInputs: clone(fixture.cash_inputs),
    ap: clone(fixture.ap),
    cogs: clone(fixture.cogs),
    operatingCosts
  });
  assert.equal(result.operating_costs.quality, "ACTUAL");
  assert.equal(result.operating_costs.value, 250);
  assert.equal(result.profit.quality, "ACTUAL");
  assert.equal(result.profit.value, 350);
  assert.equal(result.revenue.value, 1000);
  assert.equal(result.ap.outstanding.value, 300);
  assert.equal(result.cash_bridge.computed_ending_balance.value, 130);
});

test("helper is pure and contains no source reader write RPC or duplicate Profit formula", async () => {
  const source = await fs.readFile(
    new URL("02_CORE/shared/operating-cost-truth-v1.mjs", root),
    "utf8"
  );
  for (const forbidden of [
    ".insert(",
    ".update(",
    ".delete(",
    ".upsert(",
    ".rpc(",
    "fetch(",
    "drive.google.com",
    "docs.google.com",
    "revenue - cogs",
    "calculateCashBridge("
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});

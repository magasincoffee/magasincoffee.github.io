import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import {
  CASH_BALANCE_ACCOUNT_CLASSES,
  CASH_BALANCE_BASES,
  CASH_BALANCE_METRICS,
  CASH_BALANCE_ROLES,
  CASH_BALANCE_TRUTH_SCHEMA_VERSION,
  cashBalanceTruthForBridge,
  normalizeCashBalanceTruth
} from "../../02_CORE/shared/cash-balance-truth-v1.mjs";
import { calculateCashBridge } from "../../02_CORE/shared/cash-bridge-v1.mjs";

const POINT_START = Object.freeze({
  date: "2026-09-01",
  timezone: "Asia/Ho_Chi_Minh",
  timestamp: "2026-09-01T00:00:00+07:00",
  boundary_proven: true
});

const POINT_END = Object.freeze({
  date: "2026-09-30",
  timezone: "Asia/Ho_Chi_Minh",
  timestamp: "2026-09-30T23:59:59+07:00",
  boundary_proven: true
});

const SCOPE = Object.freeze({
  branch: "CN1",
  channel: "DIRECT",
  aggregate_proven: false
});

function observed({
  role = "OPENING",
  point = POINT_START,
  value = 100,
  quality = "ACTUAL",
  scope = SCOPE,
  account = {
    class: "PHYSICAL_CASH",
    label: "CN1_TILL",
    aggregate_proven: false
  },
  source = { class: "DIRECT_BALANCE_COUNT", label: "CN1_TILL_COUNT" },
  lineage = ["CASH_BALANCE:CN1:TILL"],
  metric,
  reconciliation_status = "NOT_APPLICABLE",
  proof = { observed_proven: true },
  ...extra
} = {}) {
  return {
    balance_role: role,
    balance_basis: "OBSERVED_BALANCE",
    point: { ...point },
    account: { ...account },
    truth: {
      period: {
        start: point.date,
        end: point.date,
        timezone: point.timezone
      },
      scope: { ...scope },
      group: "CASH",
      metric: metric ?? CASH_BALANCE_METRICS[role],
      value,
      quality,
      source,
      as_of: point.timestamp,
      reconciliation_status,
      evidence: ["DIRECT_POINT_BALANCE_EVIDENCE"],
      lineage,
      message: "Sanitized direct point balance."
    },
    proof: { ...proof },
    ...extra
  };
}

function computed({
  point = POINT_START,
  value = 100,
  quality = "ACTUAL",
  scope = SCOPE,
  account = {
    class: "OTHER_EVIDENCED_CASH",
    label: "INTERNAL_CASH_POOL",
    aggregate_proven: false
  },
  proof = {
    computation_proven: true,
    anchor_observed: true,
    movement_coverage: "COMPLETE",
    dependency_qualities: ["ACTUAL", "ACTUAL"],
    computation_lineage: ["OBSERVED_ANCHOR", "COMPLETE_MOVEMENTS"]
  },
  ...extra
} = {}) {
  return {
    balance_role: "OPENING",
    balance_basis: "COMPUTED_BALANCE",
    point: { ...point },
    account: { ...account },
    truth: {
      period: {
        start: point.date,
        end: point.date,
        timezone: point.timezone
      },
      scope: { ...scope },
      group: "CASH",
      metric: "cash_opening_balance",
      value,
      quality,
      source: {
        class: "DERIVED_BALANCE_COMPUTATION",
        label: "INTERNAL_MONTHLY_CASH"
      },
      as_of: point.timestamp,
      reconciliation_status: "NOT_APPLICABLE",
      evidence: ["OBSERVED_ANCHOR_PLUS_COMPLETE_MOVEMENTS"],
      lineage: ["INTERNAL_CASH_COMPUTATION"]
    },
    proof: { ...proof },
    ...extra
  };
}

function normalize(raw, options = {}) {
  return normalizeCashBalanceTruth(raw, options);
}

test("contract enums are exact and minimal", async () => {
  const raw = await fs.readFile(
    new URL("../../02_CORE/contracts/cash-balance-truth.v1.json", import.meta.url),
    "utf8"
  );
  const contract = JSON.parse(raw);
  assert.equal(contract.schema_version, CASH_BALANCE_TRUTH_SCHEMA_VERSION);
  assert.deepEqual(contract.balance_roles, CASH_BALANCE_ROLES);
  assert.deepEqual(contract.balance_bases, CASH_BALANCE_BASES);
  assert.deepEqual(contract.account_classes, CASH_BALANCE_ACCOUNT_CLASSES);
  assert.deepEqual(contract.metric_mapping, CASH_BALANCE_METRICS);
});

test("observed opening ACTUAL passes as canonical CASH opening truth", () => {
  const result = normalize(observed(), {
    targetPoint: POINT_START,
    targetScope: SCOPE
  });
  assert.equal(result.balance_role, "OPENING");
  assert.equal(result.balance_basis, "OBSERVED_BALANCE");
  assert.equal(result.truth.group, "CASH");
  assert.equal(result.truth.metric, "cash_opening_balance");
  assert.equal(result.truth.quality, "ACTUAL");
  assert.equal(result.truth.value, 100);
  assert.deepEqual(result.diagnostics, []);
});

test("observed ending ACTUAL passes as canonical CASH observed ending truth", () => {
  const result = normalize(
    observed({ role: "OBSERVED_ENDING", point: POINT_END, value: 140 }),
    { targetPoint: POINT_END, targetScope: SCOPE }
  );
  assert.equal(result.truth.metric, "cash_observed_ending_balance");
  assert.equal(result.truth.quality, "ACTUAL");
  assert.equal(result.truth.value, 140);
});

test("explicit observed zero remains valid zero", () => {
  const result = normalize(observed({ value: 0 }), {
    targetPoint: POINT_START,
    targetScope: SCOPE
  });
  assert.equal(result.truth.quality, "ACTUAL");
  assert.equal(result.truth.value, 0);
});

test("NOT_CONNECTED balance source remains null and NOT_CONNECTED", () => {
  const raw = observed({ value: null, quality: "NOT_CONNECTED" });
  raw.balance_basis = "NOT_CONNECTED";
  raw.proof = {};
  delete raw.truth.source;
  const result = normalize(raw, {
    targetPoint: POINT_START,
    targetScope: SCOPE
  });
  assert.equal(result.truth.quality, "NOT_CONNECTED");
  assert.equal(result.truth.value, null);
  assert.ok(result.diagnostics.includes("BALANCE_SOURCE_NOT_CONNECTED"));
});

test("MOVEMENT_ONLY cannot normalize into a numeric balance", () => {
  const raw = observed({ value: 999 });
  raw.balance_basis = "MOVEMENT_ONLY";
  const result = normalize(raw);
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.value, null);
  assert.equal(result.truth.reason, "MOVEMENT_ONLY_IS_NOT_BALANCE");
});

test("CONTEXT_ONLY cannot normalize into a numeric balance", () => {
  const raw = observed({ value: 999 });
  raw.balance_basis = "CONTEXT_ONLY";
  const result = normalize(raw);
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.value, null);
  assert.equal(result.truth.reason, "CONTEXT_ONLY_IS_NOT_BALANCE");
});

test("payment-method-like evidence cannot become balance truth", () => {
  const raw = observed({ value: 999 });
  raw.payment_method = "BANK";
  const result = normalize(raw);
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.value, null);
  assert.equal(result.truth.reason, "NON_BALANCE_EVIDENCE_FORBIDDEN");
});

test("computed opening with complete provenance passes", () => {
  const result = normalize(computed(), {
    targetPoint: POINT_START,
    targetScope: SCOPE
  });
  assert.equal(result.balance_basis, "COMPUTED_BALANCE");
  assert.equal(result.truth.metric, "cash_opening_balance");
  assert.equal(result.truth.quality, "ACTUAL");
  assert.equal(result.truth.value, 100);
});

test("computed opening missing observed anchor fails closed", () => {
  const raw = computed();
  raw.proof.anchor_observed = false;
  const result = normalize(raw);
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.value, null);
  assert.equal(result.truth.reason, "COMPUTED_BALANCE_REQUIRES_OBSERVED_ANCHOR");
});

test("computed opening PARTIAL movement coverage fails closed", () => {
  const raw = computed();
  raw.proof.movement_coverage = "PARTIAL";
  const result = normalize(raw);
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.value, null);
  assert.equal(result.truth.reason, "COMPUTATION_MOVEMENT_COVERAGE_INCOMPLETE");
});

test("computed opening MISSING movement coverage fails closed", () => {
  const raw = computed();
  raw.proof.movement_coverage = "MISSING";
  const result = normalize(raw);
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.value, null);
});

test("computed opening NOT_CONNECTED movement dependency stays NOT_CONNECTED", () => {
  const raw = computed();
  raw.proof.movement_coverage = "NOT_CONNECTED";
  const result = normalize(raw);
  assert.equal(result.truth.quality, "NOT_CONNECTED");
  assert.equal(result.truth.value, null);
});

test("computed dependency ESTIMATE caps numeric result at ESTIMATE", () => {
  const raw = computed();
  raw.proof.dependency_qualities = ["ACTUAL", "ESTIMATE"];
  const result = normalize(raw);
  assert.equal(result.truth.quality, "ESTIMATE");
  assert.equal(result.truth.value, 100);
});

test("computed dependency GAP blocks numeric result", () => {
  const raw = computed();
  raw.proof.dependency_qualities = ["ACTUAL", "GAP"];
  const result = normalize(raw);
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.value, null);
});

test("COMPUTED_BALANCE can never become OBSERVED_ENDING", () => {
  const raw = computed();
  raw.balance_role = "OBSERVED_ENDING";
  raw.truth.metric = "cash_observed_ending_balance";
  raw.point = { ...POINT_END };
  raw.truth.period = {
    start: POINT_END.date,
    end: POINT_END.date,
    timezone: POINT_END.timezone
  };
  raw.truth.as_of = POINT_END.timestamp;
  const result = normalize(raw);
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.value, null);
  assert.equal(result.truth.reason, "OBSERVED_ENDING_REQUIRES_OBSERVED_BALANCE");
});

test("role/metric mismatch fails closed", () => {
  const result = normalize(observed({ metric: "cash_observed_ending_balance" }));
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.reason, "BALANCE_ROLE_METRIC_MISMATCH");
});

test("point date mismatch with supplied truth period fails closed", () => {
  const raw = observed();
  raw.truth.period.start = "2026-08-31";
  raw.truth.period.end = "2026-08-31";
  const result = normalize(raw);
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.reason, "BALANCE_POINT_DATE_MISMATCH");
});

test("target point date mismatch prevents current balance backdating", () => {
  const result = normalize(observed(), {
    targetPoint: {
      date: "2026-08-31",
      timezone: "Asia/Ho_Chi_Minh"
    },
    targetScope: SCOPE
  });
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.value, null);
  assert.equal(result.truth.reason, "BALANCE_POINT_DATE_MISMATCH");
});

test("timezone mismatch fails closed", () => {
  const result = normalize(observed(), {
    targetPoint: {
      date: POINT_START.date,
      timezone: "UTC"
    },
    targetScope: SCOPE
  });
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.reason, "BALANCE_POINT_TIMEZONE_MISMATCH");
});

test("scope mismatch fails closed without re-scoping", () => {
  const result = normalize(observed(), {
    targetPoint: POINT_START,
    targetScope: {
      branch: "CN2",
      channel: "DIRECT",
      aggregate_proven: false
    }
  });
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.value, null);
  assert.equal(result.truth.reason, "BALANCE_SCOPE_MISMATCH");
});

test("unknown branch/channel cannot become numeric balance", () => {
  const result = normalize(observed({ scope: {} }));
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.value, null);
  assert.equal(result.truth.reason, "INVALID_SCOPE");
});

test("unproven Financial Truth ALL fails closed", () => {
  const result = normalize(observed({
    scope: { branch: "ALL", channel: "ALL", aggregate_proven: false }
  }));
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.value, null);
  assert.equal(result.truth.reason, "INVALID_SCOPE");
});

test("unproven account ALL fails closed", () => {
  const result = normalize(observed({
    account: {
      class: "PHYSICAL_CASH",
      label: "ALL",
      aggregate_proven: false
    }
  }));
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.value, null);
  assert.equal(result.truth.reason, "INVALID_BALANCE_ACCOUNT");
});

test("account ALL passes only with aggregate proof and compatible Financial Truth ALL", () => {
  const allScope = { branch: "ALL", channel: "ALL", aggregate_proven: true };
  const result = normalize(observed({
    account: {
      class: "OTHER_EVIDENCED_CASH",
      label: "ALL",
      aggregate_proven: true
    },
    scope: allScope
  }), {
    targetPoint: POINT_START,
    targetScope: allScope
  });
  assert.equal(result.truth.quality, "ACTUAL");
  assert.equal(result.truth.value, 100);
  assert.equal(result.account.aggregate_proven, true);
});

test("missing boundary proof blocks numeric balance", () => {
  const raw = observed();
  raw.point.boundary_proven = false;
  const result = normalize(raw);
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.reason, "BALANCE_BOUNDARY_NOT_PROVEN");
});

test("missing observed proof blocks numeric observed balance", () => {
  const result = normalize(observed({ proof: {} }));
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.reason, "OBSERVED_BALANCE_NOT_PROVEN");
});

test("missing NaN and Infinity never become zero", () => {
  const missing = observed();
  delete missing.truth.value;

  for (const raw of [
    missing,
    observed({ value: Number.NaN }),
    observed({ value: Number.POSITIVE_INFINITY })
  ]) {
    const result = normalize(raw);
    assert.equal(result.truth.quality, "GAP");
    assert.equal(result.truth.value, null);
    assert.notEqual(result.truth.value, 0);
  }
});

test("finite negative generic balance is allowed", () => {
  const result = normalize(observed({
    account: {
      class: "BANK",
      label: "BUSINESS_BANK_LOGICAL",
      aggregate_proven: false
    },
    value: -50
  }));
  assert.equal(result.truth.quality, "ACTUAL");
  assert.equal(result.truth.value, -50);
});

test("-0 normalizes to 0", () => {
  const result = normalize(observed({ value: -0 }));
  assert.equal(Object.is(result.truth.value, -0), false);
  assert.equal(result.truth.value, 0);
});

test("privacy-unsafe source fails closed", () => {
  const result = normalize(observed({
    source: {
      class: "DIRECT_BALANCE_COUNT",
      label: "https://drive.google.com/private"
    }
  }));
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.value, null);
  assert.equal(result.truth.reason, "PRIVACY_UNSAFE_BALANCE_EVIDENCE");
  assert.doesNotMatch(JSON.stringify(result), /drive\.google\.com/i);
});

test("privacy-unsafe lineage fails closed", () => {
  const result = normalize(observed({
    lineage: ["https://docs.google.com/private"]
  }));
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.value, null);
  assert.equal(result.truth.reason, "PRIVACY_UNSAFE_BALANCE_EVIDENCE");
});

test("account number-like label is rejected", () => {
  const result = normalize(observed({
    account: {
      class: "BANK",
      label: "1234567890123456",
      aggregate_proven: false
    }
  }));
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.account.label, null);
  assert.equal(result.truth.reason, "INVALID_BALANCE_ACCOUNT");
});

test("reconciliation PARTIAL may carry numeric observed truth when evidence gates pass", () => {
  const result = normalize(observed({ reconciliation_status: "PARTIAL" }));
  assert.equal(result.truth.quality, "ACTUAL");
  assert.equal(result.truth.value, 100);
  assert.equal(result.truth.reconciliation_status, "PARTIAL");
});

test("reconciliation UNKNOWN cannot carry numeric truth", () => {
  const result = normalize(observed({ reconciliation_status: "UNKNOWN" }));
  assert.equal(result.truth.quality, "GAP");
  assert.equal(result.truth.value, null);
  assert.equal(result.truth.reason, "INVALID_RECONCILIATION_STATUS");
});

test("normalization is deterministic and idempotent for canonical wrapper input", () => {
  const raw = observed();
  const first = normalize(raw, { targetPoint: POINT_START, targetScope: SCOPE });
  const second = normalize(raw, { targetPoint: POINT_START, targetScope: SCOPE });
  assert.deepEqual(second, first);
});

test("valid wrappers expose inner Financial Truth directly to existing Cash Bridge", () => {
  const opening = normalize(observed({ value: 100 }), {
    targetPoint: POINT_START,
    targetScope: SCOPE
  });
  const ending = normalize(observed({
    role: "OBSERVED_ENDING",
    point: POINT_END,
    value: 100
  }), {
    targetPoint: POINT_END,
    targetScope: SCOPE
  });

  const openingTruth = cashBalanceTruthForBridge(opening, "OPENING");
  const endingTruth = cashBalanceTruthForBridge(ending, "OBSERVED_ENDING");
  assert.deepEqual(openingTruth, opening.truth);
  assert.deepEqual(endingTruth, ending.truth);

  const bridge = calculateCashBridge({
    targetPeriod: {
      start: POINT_START.date,
      end: POINT_END.date,
      timezone: POINT_START.timezone
    },
    scope: SCOPE,
    openingBalance: openingTruth,
    observedEndingBalance: endingTruth,
    events: [],
    coverage: {
      status: "COMPLETE",
      as_of: POINT_END.timestamp,
      lineage: ["SANITIZED_COMPLETE_COVERAGE"],
      source_coverage: [{
        source: "SANITIZED_BALANCE_AND_EVENT_SOURCE",
        status: "COMPLETE",
        required: true,
        as_of: POINT_END.timestamp,
        lineage: ["SANITIZED_COMPLETE_COVERAGE"]
      }]
    }
  });

  assert.equal(bridge.opening_balance.value, 100);
  assert.equal(bridge.computed_ending_balance.value, 100);
  assert.equal(bridge.observed_ending_balance.value, 100);
  assert.equal(bridge.cash_variance.value, 0);
});

test("Cash Bridge compatibility helper rejects role confusion", () => {
  const opening = normalize(observed());
  assert.equal(cashBalanceTruthForBridge(opening, "OBSERVED_ENDING"), null);
});

test("helper has no source-specific reader or financial write calls", async () => {
  const source = await fs.readFile(
    new URL("../../02_CORE/shared/cash-balance-truth-v1.mjs", import.meta.url),
    "utf8"
  );
  for (const forbidden of [
    ".insert(",
    ".update(",
    ".delete(",
    ".upsert(",
    ".rpc(",
    ".from(",
    "googleapis",
    "supabase"
  ]) {
    assert.equal(source.includes(forbidden), false);
  }
});

test("helper does not contain source-family balance inference", async () => {
  const source = await fs.readFile(
    new URL("../../02_CORE/shared/cash-balance-truth-v1.mjs", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(source, /procurement_supplier_payments|foodapp.*settlement|sapo/i);
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import {
  CASH_BALANCE_SOURCE_CLASSES,
  CASH_BALANCE_SOURCE_MAPPER_VERSION,
  SOURCE_CLASSIFICATIONS,
  SOURCE_COVERAGE_HINTS,
  isCurrentlyUnconnectedBalanceSource,
  mapCashBalanceSourceFact,
  mapInternalMonthlyCashOpening,
  mapInternalMonthlyCashRemainder,
  mapNonBalanceSourceFact,
  mapObservedCashPoint,
  mapUnavailableCashBalanceSource
} from "../../02_CORE/shared/cash-balance-source-mapper-v1.mjs";
import {
  cashBalanceTruthForBridge
} from "../../02_CORE/shared/cash-balance-truth-v1.mjs";
import {
  calculateCashBridge
} from "../../02_CORE/shared/cash-bridge-v1.mjs";

const START = Object.freeze({
  date: "2026-09-01",
  timezone: "Asia/Ho_Chi_Minh",
  timestamp: "2026-09-01T00:00:00+07:00",
  boundary_proven: true
});

const END = Object.freeze({
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

const INTERNAL_ACCOUNT = Object.freeze({
  class: "OTHER_EVIDENCED_CASH",
  label: "INTERNAL_CASH_POOL",
  aggregate_proven: false
});

function internalOpening(overrides = {}) {
  return {
    source_class: "INTERNAL_MONTHLY_CASH_WORKBOOK",
    fact_kind: "MONTHLY_CARRY_FORWARD",
    value: 100,
    quality: "ACTUAL",
    point: { ...START },
    account: { ...INTERNAL_ACCOUNT },
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
    anchor_observed: true,
    movement_coverage: "COMPLETE",
    dependency_qualities: ["ACTUAL", "ACTUAL"],
    computation_lineage: ["PRIOR_OBSERVED_ANCHOR", "COMPLETE_MOVEMENT_SEGMENT"],
    coverage_hint: "COMPLETE",
    ...overrides
  };
}

function currentRealStyleInternal(overrides = {}) {
  return internalOpening({
    anchor_observed: false,
    movement_coverage: "PARTIAL",
    coverage_hint: "PARTIAL",
    dependency_qualities: ["ACTUAL", "GAP"],
    computation_lineage: ["MONTHLY_MOVEMENTS_VERIFIED_THROUGH_2026_09_16"],
    ...overrides
  });
}

function observed(sourceClass, accountClass, overrides = {}) {
  return {
    source_class: sourceClass,
    balance_role: "OPENING",
    value: 120,
    quality: "ACTUAL",
    point: { ...START },
    account: {
      class: accountClass,
      label: `${accountClass}_LOGICAL`,
      aggregate_proven: false
    },
    scope: { ...SCOPE },
    source: {
      class: "DIRECT_POINT_BALANCE",
      label: `${sourceClass}_EVIDENCE`
    },
    as_of: START.timestamp,
    reconciliation_status: "NOT_APPLICABLE",
    evidence: ["SANITIZED_DIRECT_POINT_EVIDENCE"],
    lineage: [`${sourceClass}:POINT`],
    observed_proven: true,
    coverage_hint: "PARTIAL",
    ...overrides
  };
}

function unavailable(sourceClass, accountClass, overrides = {}) {
  return {
    source_class: sourceClass,
    source_status: "NOT_CONNECTED",
    balance_role: "OPENING",
    point: { ...START, boundary_proven: false },
    account: {
      class: accountClass,
      label: `${accountClass}_LOGICAL`,
      aggregate_proven: false
    },
    scope: { ...SCOPE },
    lineage: [`${sourceClass}:EXPECTED_SOURCE`],
    ...overrides
  };
}

function nonBalance(sourceClass, overrides = {}) {
  return {
    source_class: sourceClass,
    balance_role: "OPENING",
    point: { ...START },
    account: { ...INTERNAL_ACCOUNT },
    scope: { ...SCOPE },
    source: {
      class: "NON_BALANCE_FACT",
      label: sourceClass
    },
    as_of: START.timestamp,
    reconciliation_status: "NOT_APPLICABLE",
    lineage: [`${sourceClass}:FACT`],
    value: 999,
    ...overrides
  };
}

test("mapper enums expose only bounded TASK-062 source semantics", () => {
  assert.equal(CASH_BALANCE_SOURCE_MAPPER_VERSION, "cash-balance-source-mapper.v1");
  assert.deepEqual(SOURCE_CLASSIFICATIONS, [
    "OBSERVED_BALANCE",
    "COMPUTED_BALANCE",
    "MOVEMENT_ONLY",
    "CONTEXT_ONLY",
    "NOT_CONNECTED"
  ]);
  assert.deepEqual(SOURCE_COVERAGE_HINTS, [
    "COMPLETE",
    "PARTIAL",
    "MISSING",
    "NOT_CONNECTED"
  ]);
  assert.ok(CASH_BALANCE_SOURCE_CLASSES.includes("INTERNAL_MONTHLY_CASH_WORKBOOK"));
});

test("internal monthly carry-forward maps only as COMPUTED_BALANCE OPENING", () => {
  const result = mapInternalMonthlyCashOpening(internalOpening(), {
    targetPoint: START,
    targetScope: SCOPE
  });
  assert.equal(result.source_class, "INTERNAL_MONTHLY_CASH_WORKBOOK");
  assert.equal(result.classification, "COMPUTED_BALANCE");
  assert.equal(result.balance.balance_role, "OPENING");
  assert.equal(result.balance.balance_basis, "COMPUTED_BALANCE");
  assert.equal(result.balance.truth.metric, "cash_opening_balance");
  assert.equal(result.balance.truth.quality, "ACTUAL");
  assert.equal(result.balance.truth.value, 100);
  assert.equal("value" in result, false);
});

test("current TASK-060 internal source truth without observed anchor fails closed", () => {
  const result = mapInternalMonthlyCashOpening(currentRealStyleInternal(), {
    targetPoint: START,
    targetScope: SCOPE
  });
  assert.equal(result.classification, "COMPUTED_BALANCE");
  assert.equal(result.source_status, "FAIL_CLOSED");
  assert.equal(result.balance.truth.quality, "GAP");
  assert.equal(result.balance.truth.value, null);
  assert.equal(
    result.balance.truth.reason,
    "COMPUTED_BALANCE_REQUIRES_OBSERVED_ANCHOR"
  );
});

test("PARTIAL Sep movement coverage cannot support computed opening", () => {
  const raw = internalOpening({
    anchor_observed: true,
    movement_coverage: "PARTIAL",
    coverage_hint: "PARTIAL"
  });
  const result = mapInternalMonthlyCashOpening(raw);
  assert.equal(result.coverage_hint, "PARTIAL");
  assert.equal(result.balance.truth.quality, "GAP");
  assert.equal(result.balance.truth.value, null);
  assert.equal(
    result.balance.truth.reason,
    "COMPUTATION_MOVEMENT_COVERAGE_INCOMPLETE"
  );
});

test("row/source presence or coverage_hint COMPLETE does not infer computation coverage COMPLETE", () => {
  const raw = internalOpening({
    movement_coverage: undefined,
    coverage_hint: "COMPLETE"
  });
  const result = mapInternalMonthlyCashOpening(raw);
  assert.equal(result.coverage_hint, "COMPLETE");
  assert.equal(result.balance.truth.quality, "GAP");
  assert.equal(result.balance.truth.value, null);
});

test("hypothetical fully proven computed opening preserves ACTUAL", () => {
  const result = mapInternalMonthlyCashOpening(internalOpening());
  assert.equal(result.balance.truth.quality, "ACTUAL");
  assert.equal(result.balance.truth.value, 100);
});

test("computed opening dependency ESTIMATE caps output at ESTIMATE", () => {
  const result = mapInternalMonthlyCashOpening(internalOpening({
    dependency_qualities: ["ACTUAL", "ESTIMATE"]
  }));
  assert.equal(result.balance.truth.quality, "ESTIMATE");
  assert.equal(result.balance.truth.value, 100);
});

test("monthly calculated remainder cannot become OBSERVED_ENDING", () => {
  const raw = internalOpening({
    fact_kind: "CALCULATED_REMAINDER",
    point: { ...END },
    as_of: END.timestamp,
    value: 155
  });
  const result = mapInternalMonthlyCashRemainder(raw, {
    targetPoint: END,
    targetScope: SCOPE
  });
  assert.equal(result.classification, "COMPUTED_BALANCE");
  assert.equal(result.balance.balance_role, "OBSERVED_ENDING");
  assert.equal(result.balance.truth.quality, "GAP");
  assert.equal(result.balance.truth.value, null);
  assert.equal(
    result.balance.truth.reason,
    "OBSERVED_ENDING_REQUIRES_OBSERVED_BALANCE"
  );
  assert.ok(result.diagnostics.includes("COMPUTED_REMAINDER_NOT_OBSERVED_ENDING"));
});

test("current computed remainder cannot be backdated to historical target", () => {
  const raw = internalOpening({
    fact_kind: "CALCULATED_REMAINDER",
    point: { ...END },
    as_of: END.timestamp
  });
  const result = mapInternalMonthlyCashRemainder(raw, {
    targetPoint: {
      date: "2026-08-31",
      timezone: END.timezone
    },
    targetScope: SCOPE
  });
  assert.equal(result.balance.truth.quality, "GAP");
  assert.equal(result.balance.truth.value, null);
  assert.equal(result.balance.truth.reason, "BALANCE_POINT_DATE_MISMATCH");
});

test("one branch internal workbook fact cannot be promoted to enterprise ALL", () => {
  const result = mapInternalMonthlyCashOpening(internalOpening(), {
    targetPoint: START,
    targetScope: {
      branch: "ALL",
      channel: "ALL",
      aggregate_proven: true
    }
  });
  assert.equal(result.balance.truth.quality, "GAP");
  assert.equal(result.balance.truth.value, null);
  assert.equal(result.balance.truth.reason, "BALANCE_SCOPE_MISMATCH");
});

test("physical till direct observed fact maps as OBSERVED_BALANCE", () => {
  const result = mapObservedCashPoint(
    observed("PHYSICAL_STORE_TILL_COUNT", "PHYSICAL_CASH"),
    { targetPoint: START, targetScope: SCOPE }
  );
  assert.equal(result.classification, "OBSERVED_BALANCE");
  assert.equal(result.source_status, "MAPPED");
  assert.equal(result.balance.balance_basis, "OBSERVED_BALANCE");
  assert.equal(result.balance.truth.quality, "ACTUAL");
  assert.equal(result.balance.truth.value, 120);
});

test("Bank direct observed fact maps without inventing cleared-account semantics", () => {
  const result = mapObservedCashPoint(
    observed("BANK_ACCOUNT_BALANCE_STATEMENT", "BANK")
  );
  assert.equal(result.balance.truth.quality, "ACTUAL");
  assert.equal(result.balance.truth.value, 120);
  assert.equal(result.balance.account.class, "BANK");
});

test("MoMo, COD, Owner-held and provider future observed facts use the same canonical gate", () => {
  for (const [sourceClass, accountClass] of [
    ["MOMO_WALLET_BALANCE", "MOMO_WALLET"],
    ["COD_DELIVERY_HELD_CASH", "COD_HELD_CASH"],
    ["OWNER_HELD_COMPANY_CASH", "OWNER_HELD_COMPANY_CASH"],
    ["PROVIDER_ACCOUNT_BALANCE", "PROVIDER_ACCOUNT"]
  ]) {
    const result = mapObservedCashPoint(observed(sourceClass, accountClass));
    assert.equal(result.source_class, sourceClass);
    assert.equal(result.classification, "OBSERVED_BALANCE");
    assert.equal(result.balance.truth.quality, "ACTUAL");
    assert.equal(result.balance.truth.value, 120);
  }
});

test("explicit observed zero is preserved", () => {
  const result = mapObservedCashPoint(
    observed("PHYSICAL_STORE_TILL_COUNT", "PHYSICAL_CASH", { value: 0 })
  );
  assert.equal(result.balance.truth.quality, "ACTUAL");
  assert.equal(result.balance.truth.value, 0);
});

test("generic finite negative observed balance remains allowed", () => {
  const result = mapObservedCashPoint(
    observed("BANK_ACCOUNT_BALANCE_STATEMENT", "BANK", { value: -25 })
  );
  assert.equal(result.balance.truth.quality, "ACTUAL");
  assert.equal(result.balance.truth.value, -25);
});

test("currently unconnected source families are explicitly recognized", () => {
  for (const sourceClass of [
    "PHYSICAL_STORE_TILL_COUNT",
    "BANK_ACCOUNT_BALANCE_STATEMENT",
    "MOMO_WALLET_BALANCE",
    "COD_DELIVERY_HELD_CASH",
    "OWNER_HELD_COMPANY_CASH",
    "PROVIDER_ACCOUNT_BALANCE"
  ]) {
    assert.equal(isCurrentlyUnconnectedBalanceSource(sourceClass), true);
  }
});

test("each unconnected source maps to NOT_CONNECTED/null, never zero", () => {
  for (const [sourceClass, accountClass] of [
    ["PHYSICAL_STORE_TILL_COUNT", "PHYSICAL_CASH"],
    ["BANK_ACCOUNT_BALANCE_STATEMENT", "BANK"],
    ["MOMO_WALLET_BALANCE", "MOMO_WALLET"],
    ["COD_DELIVERY_HELD_CASH", "COD_HELD_CASH"],
    ["OWNER_HELD_COMPANY_CASH", "OWNER_HELD_COMPANY_CASH"],
    ["PROVIDER_ACCOUNT_BALANCE", "PROVIDER_ACCOUNT"]
  ]) {
    const result = mapUnavailableCashBalanceSource(
      unavailable(sourceClass, accountClass),
      { targetPoint: START, targetScope: SCOPE }
    );
    assert.equal(result.classification, "NOT_CONNECTED");
    assert.equal(result.source_status, "NOT_CONNECTED");
    assert.equal(result.balance.balance_basis, "NOT_CONNECTED");
    assert.equal(result.balance.truth.quality, "NOT_CONNECTED");
    assert.equal(result.balance.truth.value, null);
    assert.notEqual(result.balance.truth.value, 0);
  }
});

test("internal cash movement rows are MOVEMENT_ONLY and cannot become balance", () => {
  const result = mapNonBalanceSourceFact(nonBalance("INTERNAL_CASH_MOVEMENT_ROWS"));
  assert.equal(result.classification, "MOVEMENT_ONLY");
  assert.equal(result.balance.truth.quality, "GAP");
  assert.equal(result.balance.truth.value, null);
  assert.equal(result.balance.truth.reason, "MOVEMENT_ONLY_IS_NOT_BALANCE");
});

test("branch Thu/Chi operating summary is MOVEMENT_ONLY", () => {
  const result = mapCashBalanceSourceFact(nonBalance("STORE_OPERATING_SUMMARY"));
  assert.equal(result.classification, "MOVEMENT_ONLY");
  assert.equal(result.balance.truth.value, null);
});

test("FoodApp settlement export is MOVEMENT_ONLY, not account balance", () => {
  const result = mapCashBalanceSourceFact(
    nonBalance("FOODAPP_PROVIDER_SETTLEMENT_EXPORT")
  );
  assert.equal(result.classification, "MOVEMENT_ONLY");
  assert.equal(result.balance.truth.quality, "GAP");
  assert.equal(result.balance.truth.value, null);
});

test("Procurement supplier payment is MOVEMENT_ONLY, not point balance", () => {
  const result = mapCashBalanceSourceFact(
    nonBalance("PROCUREMENT_SUPPLIER_PAYMENT")
  );
  assert.equal(result.classification, "MOVEMENT_ONLY");
  assert.equal(result.balance.truth.value, null);
});

test("POS/inventory facts are CONTEXT_ONLY for balance mapping", () => {
  const result = mapCashBalanceSourceFact(nonBalance("POS_INVENTORY_FACT"));
  assert.equal(result.classification, "CONTEXT_ONLY");
  assert.equal(result.balance.truth.quality, "GAP");
  assert.equal(result.balance.truth.value, null);
  assert.equal(result.balance.truth.reason, "CONTEXT_ONLY_IS_NOT_BALANCE");
});

test("P&L/budget facts are CONTEXT_ONLY for balance mapping", () => {
  const result = mapCashBalanceSourceFact(
    nonBalance("FINANCE_PNL_BUDGET_CONTEXT")
  );
  assert.equal(result.classification, "CONTEXT_ONLY");
  assert.equal(result.balance.truth.value, null);
});

test("first transaction or movement amount can never become opening balance", () => {
  const result = mapCashBalanceSourceFact(
    nonBalance("INTERNAL_CASH_MOVEMENT_ROWS", {
      value: 777,
      fact_kind: "FIRST_TRANSACTION"
    })
  );
  assert.equal(result.classification, "MOVEMENT_ONLY");
  assert.equal(result.balance.truth.value, null);
});

test("payment-method metadata cannot prove observed account balance", () => {
  const result = mapObservedCashPoint(
    observed("BANK_ACCOUNT_BALANCE_STATEMENT", "BANK", {
      payment_method: "BANK"
    })
  );
  assert.equal(result.balance.truth.quality, "GAP");
  assert.equal(result.balance.truth.value, null);
  assert.equal(result.balance.truth.reason, "NON_BALANCE_EVIDENCE_FORBIDDEN");
});

test("strict numeric parser accepts proven plain decimal strings", () => {
  const result = mapObservedCashPoint(
    observed("BANK_ACCOUNT_BALANCE_STATEMENT", "BANK", {
      value: "120.50"
    })
  );
  assert.equal(result.balance.truth.quality, "ACTUAL");
  assert.equal(result.balance.truth.value, 120.5);
});

test("blank/null/undefined numeric values never become zero", () => {
  for (const value of ["", "   ", null, undefined]) {
    const raw = observed("PHYSICAL_STORE_TILL_COUNT", "PHYSICAL_CASH", {
      value
    });
    if (value === undefined) delete raw.value;
    const result = mapObservedCashPoint(raw);
    assert.equal(result.balance.truth.quality, "GAP");
    assert.equal(result.balance.truth.value, null);
    assert.notEqual(result.balance.truth.value, 0);
    assert.ok(
      result.diagnostics.includes("MISSING_SOURCE_NUMERIC_VALUE")
    );
  }
});

test("malformed locale/grouped numeric strings fail closed", () => {
  for (const value of ["1,000", "1.000.000", "12 000", "12abc"]) {
    const result = mapObservedCashPoint(
      observed("BANK_ACCOUNT_BALANCE_STATEMENT", "BANK", { value })
    );
    assert.equal(result.balance.truth.quality, "GAP");
    assert.equal(result.balance.truth.value, null);
    assert.ok(result.diagnostics.includes("MALFORMED_SOURCE_NUMERIC_VALUE"));
  }
});

test("NaN and Infinity fail closed", () => {
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY]) {
    const result = mapObservedCashPoint(
      observed("BANK_ACCOUNT_BALANCE_STATEMENT", "BANK", { value })
    );
    assert.equal(result.balance.truth.quality, "GAP");
    assert.equal(result.balance.truth.value, null);
  }
});

test("target scope mismatch fails closed", () => {
  const result = mapObservedCashPoint(
    observed("PHYSICAL_STORE_TILL_COUNT", "PHYSICAL_CASH"),
    {
      targetPoint: START,
      targetScope: {
        branch: "CN2",
        channel: "DIRECT",
        aggregate_proven: false
      }
    }
  );
  assert.equal(result.balance.truth.quality, "GAP");
  assert.equal(result.balance.truth.reason, "BALANCE_SCOPE_MISMATCH");
});

test("target point mismatch blocks backdating", () => {
  const result = mapObservedCashPoint(
    observed("BANK_ACCOUNT_BALANCE_STATEMENT", "BANK"),
    {
      targetPoint: {
        date: "2026-08-31",
        timezone: START.timezone
      },
      targetScope: SCOPE
    }
  );
  assert.equal(result.balance.truth.quality, "GAP");
  assert.equal(result.balance.truth.value, null);
  assert.equal(result.balance.truth.reason, "BALANCE_POINT_DATE_MISMATCH");
});

test("unknown branch/channel cannot become numeric balance", () => {
  const result = mapObservedCashPoint(
    observed("PHYSICAL_STORE_TILL_COUNT", "PHYSICAL_CASH", { scope: {} })
  );
  assert.equal(result.balance.truth.quality, "GAP");
  assert.equal(result.balance.truth.value, null);
  assert.equal(result.balance.truth.reason, "INVALID_SCOPE");
});

test("unproven Financial Truth ALL fails closed", () => {
  const result = mapObservedCashPoint(
    observed("BANK_ACCOUNT_BALANCE_STATEMENT", "BANK", {
      scope: {
        branch: "ALL",
        channel: "ALL",
        aggregate_proven: false
      }
    })
  );
  assert.equal(result.balance.truth.quality, "GAP");
  assert.equal(result.balance.truth.value, null);
});

test("unproven account ALL fails closed independently of Financial Truth scope", () => {
  const allScope = {
    branch: "ALL",
    channel: "ALL",
    aggregate_proven: true
  };
  const result = mapObservedCashPoint(
    observed("BANK_ACCOUNT_BALANCE_STATEMENT", "BANK", {
      scope: allScope,
      account: {
        class: "BANK",
        label: "ALL",
        aggregate_proven: false
      }
    }),
    { targetScope: allScope }
  );
  assert.equal(result.balance.truth.quality, "GAP");
  assert.equal(result.balance.truth.reason, "INVALID_BALANCE_ACCOUNT");
});

test("privacy-unsafe source metadata fails closed and is not retained", () => {
  const result = mapObservedCashPoint(
    observed("BANK_ACCOUNT_BALANCE_STATEMENT", "BANK", {
      source: {
        class: "DIRECT_POINT_BALANCE",
        label: "https://drive.google.com/private"
      }
    })
  );
  assert.equal(result.balance.truth.quality, "GAP");
  assert.equal(result.balance.truth.value, null);
  assert.doesNotMatch(JSON.stringify(result), /drive\.google\.com/i);
});

test("account-number-like labels fail closed", () => {
  const result = mapObservedCashPoint(
    observed("BANK_ACCOUNT_BALANCE_STATEMENT", "BANK", {
      account: {
        class: "BANK",
        label: "1234567890123456",
        aggregate_proven: false
      }
    })
  );
  assert.equal(result.balance.truth.quality, "GAP");
  assert.equal(result.balance.account.label, null);
});

test("coverage_hint is carried only as metadata and cannot upgrade balance quality", () => {
  const result = mapInternalMonthlyCashOpening(currentRealStyleInternal({
    coverage_hint: "COMPLETE"
  }));
  assert.equal(result.coverage_hint, "COMPLETE");
  assert.equal(result.balance.truth.quality, "GAP");
  assert.equal(result.balance.truth.value, null);
});

test("dispatcher maps TASK-060 current internal fact to fail-closed computed opening", () => {
  const result = mapCashBalanceSourceFact(currentRealStyleInternal());
  assert.equal(result.classification, "COMPUTED_BALANCE");
  assert.equal(result.balance.balance_role, "OPENING");
  assert.equal(result.balance.truth.quality, "GAP");
});

test("dispatcher maps explicit unavailable balance source to NOT_CONNECTED", () => {
  const result = mapCashBalanceSourceFact(
    unavailable("BANK_ACCOUNT_BALANCE_STATEMENT", "BANK")
  );
  assert.equal(result.classification, "NOT_CONNECTED");
  assert.equal(result.balance.truth.quality, "NOT_CONNECTED");
  assert.equal(result.balance.truth.value, null);
});

test("mapping is deterministic", () => {
  const raw = observed("PHYSICAL_STORE_TILL_COUNT", "PHYSICAL_CASH");
  assert.deepEqual(
    mapCashBalanceSourceFact(raw),
    mapCashBalanceSourceFact(raw)
  );
});

test("mapping is idempotent for canonical mapper output", () => {
  const first = mapCashBalanceSourceFact(
    observed("PHYSICAL_STORE_TILL_COUNT", "PHYSICAL_CASH")
  );
  const second = mapCashBalanceSourceFact(first);
  assert.deepEqual(second, first);
});

test("pre-mapped envelope cannot bypass source/classification provenance gates", () => {
  const first = mapCashBalanceSourceFact(
    observed("PHYSICAL_STORE_TILL_COUNT", "PHYSICAL_CASH")
  );
  const forged = {
    ...first,
    source_class: "INTERNAL_MONTHLY_CASH_WORKBOOK",
    classification: "COMPUTED_BALANCE"
  };

  const result = mapCashBalanceSourceFact(forged);
  assert.equal(result.classification, "CONTEXT_ONLY");
  assert.equal(result.balance.truth.quality, "GAP");
  assert.equal(result.balance.truth.value, null);
  assert.ok(
    result.diagnostics.includes("PREMAPPED_BALANCE_PROVENANCE_MISMATCH")
  );
});

test("pre-mapped NOT_CONNECTED envelope cannot be relabeled as observed numeric truth", () => {
  const unavailableResult = mapUnavailableCashBalanceSource(
    unavailable("BANK_ACCOUNT_BALANCE_STATEMENT", "BANK")
  );
  const forged = {
    ...unavailableResult,
    classification: "OBSERVED_BALANCE"
  };

  const result = mapCashBalanceSourceFact(forged);
  assert.equal(result.classification, "CONTEXT_ONLY");
  assert.equal(result.balance.truth.value, null);
  assert.notEqual(result.source_status, "MAPPED");
  assert.ok(
    result.diagnostics.includes("PREMAPPED_BALANCE_PROVENANCE_MISMATCH")
  );
});

test("future observed wrappers remain directly compatible with existing Cash Bridge", () => {
  const opening = mapObservedCashPoint(
    observed("PHYSICAL_STORE_TILL_COUNT", "PHYSICAL_CASH", {
      value: 100
    }),
    { targetPoint: START, targetScope: SCOPE }
  );
  const ending = mapObservedCashPoint(
    observed("PHYSICAL_STORE_TILL_COUNT", "PHYSICAL_CASH", {
      balance_role: "OBSERVED_ENDING",
      value: 100,
      point: { ...END },
      as_of: END.timestamp,
      lineage: ["PHYSICAL_STORE_TILL_COUNT:ENDING"]
    }),
    { targetPoint: END, targetScope: SCOPE }
  );

  const openingTruth = cashBalanceTruthForBridge(opening.balance, "OPENING");
  const endingTruth = cashBalanceTruthForBridge(
    ending.balance,
    "OBSERVED_ENDING"
  );

  const bridge = calculateCashBridge({
    targetPeriod: {
      start: START.date,
      end: END.date,
      timezone: START.timezone
    },
    scope: SCOPE,
    openingBalance: openingTruth,
    observedEndingBalance: endingTruth,
    events: [],
    coverage: {
      status: "COMPLETE",
      as_of: END.timestamp,
      lineage: ["SANITIZED_COMPLETE_EVENT_COVERAGE"],
      source_coverage: [{
        source: "SANITIZED_EVENT_SOURCE",
        status: "COMPLETE",
        required: true,
        as_of: END.timestamp,
        lineage: ["SANITIZED_COMPLETE_EVENT_COVERAGE"]
      }]
    }
  });

  assert.equal(bridge.opening_balance.value, 100);
  assert.equal(bridge.computed_ending_balance.value, 100);
  assert.equal(bridge.observed_ending_balance.value, 100);
  assert.equal(bridge.cash_variance.value, 0);
});

test("current internal workbook mapping cannot make Cash Bridge computed ending ACTUAL", () => {
  const mapped = mapInternalMonthlyCashOpening(currentRealStyleInternal(), {
    targetPoint: START,
    targetScope: SCOPE
  });
  const openingTruth = cashBalanceTruthForBridge(mapped.balance, "OPENING");

  const bridge = calculateCashBridge({
    targetPeriod: {
      start: START.date,
      end: END.date,
      timezone: START.timezone
    },
    scope: SCOPE,
    openingBalance: openingTruth,
    observedEndingBalance: null,
    events: [],
    coverage: {
      status: "PARTIAL",
      as_of: END.timestamp,
      lineage: ["PARTIAL_CURRENT_SOURCE_COVERAGE"],
      source_coverage: [{
        source: "INTERNAL_MONTHLY_CASH_MOVEMENTS",
        status: "PARTIAL",
        required: true,
        as_of: "2026-09-16T23:59:59+07:00",
        lineage: ["VERIFIED_THROUGH_2026_09_16"]
      }]
    }
  });

  assert.equal(bridge.opening_balance.value, null);
  assert.equal(bridge.computed_ending_balance.value, null);
  assert.equal(bridge.computed_ending_balance.quality, "GAP");
});

test("pure mapper has no financial write path or external source API calls", async () => {
  const source = await fs.readFile(
    new URL("../../02_CORE/shared/cash-balance-source-mapper-v1.mjs", import.meta.url),
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
    "Google_Drive",
    "supabase",
    "fetch("
  ]) {
    assert.equal(source.includes(forbidden), false);
  }
});

test("mapper does not embed Drive locators or source-specific account identities", async () => {
  const source = await fs.readFile(
    new URL("../../02_CORE/shared/cash-balance-source-mapper-v1.mjs", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(source, /drive\.google\.com|docs\.google\.com/i);
  assert.doesNotMatch(source, /\b\d{10,}\b/);
});

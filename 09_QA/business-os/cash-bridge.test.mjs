import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import {
  CASH_BRIDGE_SCHEMA_VERSION,
  CASH_EVENT_CATEGORIES,
  CASH_EVENT_DIRECTIONS,
  CASH_PAYMENT_METHODS,
  isConsolidatedNeutralTransfer,
  normalizeCashEvent
} from "../../02_CORE/shared/cash-bridge-v1.mjs";

const root = new URL("../../", import.meta.url);

const base = Object.freeze({
  direction: "INFLOW",
  category: "SALES_COLLECTION",
  event_date: "2026-09-18",
  timezone: "Asia/Ho_Chi_Minh",
  scope: {
    branch: "CN1",
    channel: "DIRECT",
    aggregate_proven: false
  },
  amount: 100,
  quality: "ACTUAL",
  source: {
    class: "RECORDED_CASH_SOURCE",
    label: "SANITIZED_CASH_EVENT"
  },
  as_of: "2026-09-18T22:00:00+07:00",
  reconciliation_status: "RECONCILED",
  evidence: ["CASH_EVENT_EVIDENCED"],
  lineage: ["CASH_EVENT:2026-09-18"],
  cash_movement_proven: true,
  proof_basis: "DIRECT_CASH_EVENT",
  status: "ACTIVE"
});

function event(overrides = {}) {
  return {
    ...base,
    ...overrides,
    scope: { ...base.scope, ...(overrides.scope || {}) },
    source: { ...base.source, ...(overrides.source || {}) }
  };
}

test("acceptance contract exposes exact minimal taxonomy and reserves arithmetic for TASK-056", async () => {
  const raw = await fs.readFile(
    new URL("02_CORE/contracts/cash-bridge.v1.json", root),
    "utf8"
  );
  const contract = JSON.parse(raw);

  assert.equal(contract.schema_version, CASH_BRIDGE_SCHEMA_VERSION);
  assert.deepEqual(contract.directions, CASH_EVENT_DIRECTIONS);
  assert.deepEqual(contract.categories.INFLOW, CASH_EVENT_CATEGORIES.INFLOW);
  assert.deepEqual(contract.categories.OUTFLOW, CASH_EVENT_CATEGORIES.OUTFLOW);
  assert.deepEqual(contract.categories.TRANSFER, CASH_EVENT_CATEGORIES.TRANSFER);
  assert.equal(
    contract.bridge_shape.computed_ending_balance.includes("TASK-056"),
    true
  );
  assert.equal(contract.bridge_shape.cash_variance.includes("TASK-056"), true);
});

test("accepted taxonomy constants are exact", () => {
  assert.deepEqual(CASH_EVENT_DIRECTIONS, ["INFLOW", "OUTFLOW", "TRANSFER"]);
  assert.deepEqual(CASH_EVENT_CATEGORIES.INFLOW, [
    "SALES_COLLECTION",
    "OTHER_OPERATING_INFLOW",
    "OWNER_CONTRIBUTION",
    "FINANCING_INFLOW",
    "OTHER_EVIDENCED_INFLOW"
  ]);
  assert.deepEqual(CASH_EVENT_CATEGORIES.OUTFLOW, [
    "SUPPLIER_PAYMENT",
    "PAYROLL",
    "RENT_UTILITIES",
    "PLATFORM_DELIVERY",
    "MARKETING",
    "OTHER_OPEX",
    "DEBT_REPAYMENT",
    "CAPEX_INVESTMENT",
    "OWNER_WITHDRAWAL",
    "OTHER_EVIDENCED_OUTFLOW"
  ]);
  assert.deepEqual(CASH_EVENT_CATEGORIES.TRANSFER, ["INTERNAL_TRANSFER"]);
  assert.deepEqual(CASH_PAYMENT_METHODS, ["CASH", "BANK", "MOMO", "OTHER"]);
});

test("proven positive cash movement normalizes through Financial Truth", () => {
  const result = normalizeCashEvent(event());
  assert.equal(result.amount_truth.quality, "ACTUAL");
  assert.equal(result.amount_truth.value, 100);
  assert.equal(result.direction, "INFLOW");
  assert.equal(result.category, "SALES_COLLECTION");
  assert.equal(result.consolidated_role, "INFLOW");
});

test("invalid direction fails closed", () => {
  const result = normalizeCashEvent(event({ direction: "SIDEWAYS" }));
  assert.equal(result.amount_truth.quality, "GAP");
  assert.equal(result.amount_truth.value, null);
  assert.deepEqual(result.diagnostics, ["INVALID_CASH_DIRECTION"]);
});

test("category must be compatible with direction", () => {
  const result = normalizeCashEvent(
    event({ direction: "INFLOW", category: "SUPPLIER_PAYMENT" })
  );
  assert.equal(result.amount_truth.quality, "GAP");
  assert.equal(result.amount_truth.value, null);
  assert.deepEqual(result.diagnostics, ["INVALID_CASH_CATEGORY"]);
});

test("ACTIVE supplier payment may become candidate cash outflow", () => {
  const result = normalizeCashEvent(
    event({
      direction: "OUTFLOW",
      category: "SUPPLIER_PAYMENT",
      proof_basis: "SUPPLIER_PAYMENT",
      status: "ACTIVE",
      payment_method: "BANK"
    })
  );
  assert.equal(result.amount_truth.quality, "ACTUAL");
  assert.equal(result.amount_truth.value, 100);
  assert.equal(result.payment_method, "BANK");
  assert.equal(result.consolidated_role, "OUTFLOW");
});

test("VOID supplier payment is excluded", () => {
  const result = normalizeCashEvent(
    event({
      direction: "OUTFLOW",
      category: "SUPPLIER_PAYMENT",
      proof_basis: "SUPPLIER_PAYMENT",
      status: "VOID"
    })
  );
  assert.equal(result.amount_truth.quality, "GAP");
  assert.equal(result.amount_truth.value, null);
  assert.deepEqual(result.diagnostics, ["VOID_CASH_EVENT_EXCLUDED"]);
});

test("BANK and MOMO payment methods remain metadata and do not create account balance truth", () => {
  for (const payment_method of ["BANK", "MOMO"]) {
    const result = normalizeCashEvent(event({ payment_method }));
    assert.equal(result.payment_method, payment_method);
    assert.deepEqual(result.cash_location, { class: null, label: null });
    assert.equal(Object.hasOwn(result, "account_balance"), false);
    assert.equal(Object.hasOwn(result, "opening_balance"), false);
    assert.equal(Object.hasOwn(result, "ending_balance"), false);
  }
});

test("purchase fact cannot normalize into supplier cash payment", () => {
  const result = normalizeCashEvent(
    event({
      direction: "OUTFLOW",
      category: "SUPPLIER_PAYMENT",
      proof_basis: "PURCHASE",
      status: "ACTIVE"
    })
  );
  assert.equal(result.amount_truth.quality, "GAP");
  assert.equal(result.amount_truth.value, null);
  assert.deepEqual(result.diagnostics, ["NON_CASH_RECOGNITION_IS_NOT_MOVEMENT"]);
});

test("AP balance cannot normalize into cash movement", () => {
  const result = normalizeCashEvent(
    event({
      direction: "OUTFLOW",
      category: "SUPPLIER_PAYMENT",
      proof_basis: "AP_BALANCE",
      status: "ACTIVE"
    })
  );
  assert.equal(result.amount_truth.quality, "GAP");
  assert.equal(result.amount_truth.value, null);
});

test("Revenue recognition does not become SALES_COLLECTION", () => {
  const result = normalizeCashEvent(
    event({ proof_basis: "REVENUE_RECOGNITION" })
  );
  assert.equal(result.amount_truth.quality, "GAP");
  assert.equal(result.amount_truth.value, null);
});

test("FoodApp gross does not become settlement cash", () => {
  const result = normalizeCashEvent(event({ proof_basis: "FOODAPP_GROSS" }));
  assert.equal(result.amount_truth.quality, "GAP");
  assert.equal(result.amount_truth.value, null);
});

test("provider settlement can support SALES_COLLECTION only when movement itself is proven", () => {
  const actual = normalizeCashEvent(
    event({ proof_basis: "PROVIDER_SETTLEMENT", cash_movement_proven: true })
  );
  const unproven = normalizeCashEvent(
    event({ proof_basis: "PROVIDER_SETTLEMENT", cash_movement_proven: false })
  );

  assert.equal(actual.amount_truth.quality, "ACTUAL");
  assert.equal(unproven.amount_truth.quality, "GAP");
  assert.equal(unproven.amount_truth.value, null);
});

test("expense recognition is not payment timing", () => {
  const result = normalizeCashEvent(
    event({
      direction: "OUTFLOW",
      category: "OTHER_OPEX",
      proof_basis: "EXPENSE_RECOGNITION"
    })
  );
  assert.equal(result.amount_truth.quality, "GAP");
  assert.equal(result.amount_truth.value, null);
});

test("debt schedule estimate is not an ACTUAL financing movement", () => {
  const result = normalizeCashEvent(
    event({
      direction: "INFLOW",
      category: "FINANCING_INFLOW",
      proof_basis: "DEBT_SCHEDULE_ESTIMATE"
    })
  );
  assert.equal(result.amount_truth.quality, "GAP");
  assert.equal(result.amount_truth.value, null);
});

test("structured financing movement stays separate from Revenue/OPEX", () => {
  const draw = normalizeCashEvent(
    event({
      direction: "INFLOW",
      category: "FINANCING_INFLOW",
      proof_basis: "FINANCING_MOVEMENT"
    })
  );
  const repay = normalizeCashEvent(
    event({
      direction: "OUTFLOW",
      category: "DEBT_REPAYMENT",
      proof_basis: "FINANCING_MOVEMENT"
    })
  );
  assert.equal(draw.amount_truth.quality, "ACTUAL");
  assert.equal(repay.amount_truth.quality, "ACTUAL");
  assert.equal(draw.amount_truth.group, "CASH");
  assert.equal(repay.amount_truth.group, "CASH");
});

test("Owner free-text-only evidence cannot become ACTUAL movement", () => {
  for (const [direction, category] of [
    ["INFLOW", "OWNER_CONTRIBUTION"],
    ["OUTFLOW", "OWNER_WITHDRAWAL"]
  ]) {
    const result = normalizeCashEvent(
      event({
        direction,
        category,
        proof_basis: "OWNER_FREE_TEXT_NOTE"
      })
    );
    assert.equal(result.amount_truth.quality, "GAP");
    assert.equal(result.amount_truth.value, null);
  }
});

test("structured evidenced Owner movement can be ACTUAL", () => {
  const result = normalizeCashEvent(
    event({
      direction: "INFLOW",
      category: "OWNER_CONTRIBUTION",
      proof_basis: "OWNER_MOVEMENT"
    })
  );
  assert.equal(result.amount_truth.quality, "ACTUAL");
  assert.equal(result.amount_truth.value, 100);
});

test("INTERNAL_TRANSFER is neutral for consolidated liquidity", () => {
  const result = normalizeCashEvent(
    event({
      direction: "TRANSFER",
      category: "INTERNAL_TRANSFER",
      proof_basis: "INTERNAL_TRANSFER"
    })
  );
  assert.equal(result.amount_truth.quality, "ACTUAL");
  assert.equal(result.consolidated_role, "NEUTRAL_TRANSFER");
  assert.equal(isConsolidatedNeutralTransfer(result), true);
});

test("missing amount never becomes zero", () => {
  const result = normalizeCashEvent(event({ amount: undefined }));
  assert.equal(result.amount_truth.quality, "GAP");
  assert.equal(result.amount_truth.value, null);
});

test("zero cash movement is rejected instead of creating a no-op event", () => {
  const result = normalizeCashEvent(event({ amount: 0 }));
  assert.equal(result.amount_truth.quality, "GAP");
  assert.equal(result.amount_truth.value, null);
  assert.deepEqual(result.diagnostics, ["ZERO_CASH_MOVEMENT_NOT_EVENT"]);
});

test("negative NaN and Infinity amounts reject", () => {
  for (const amount of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const result = normalizeCashEvent(event({ amount }));
    assert.equal(result.amount_truth.quality, "GAP");
    assert.equal(result.amount_truth.value, null);
  }
});

test("privacy-unsafe source and lineage fail closed through Financial Truth", () => {
  const unsafeSource = normalizeCashEvent(
    event({ source: { label: "https://drive.google.com/private" } })
  );
  assert.equal(unsafeSource.amount_truth.quality, "GAP");
  assert.equal(unsafeSource.amount_truth.value, null);

  const unsafeLineage = normalizeCashEvent(
    event({ lineage: ["https://drive.google.com/private"] })
  );
  assert.equal(unsafeLineage.amount_truth.quality, "GAP");
  assert.equal(unsafeLineage.amount_truth.value, null);
});

test("unknown scope never becomes ALL and unproven ALL fails closed", () => {
  const unknown = normalizeCashEvent(
    event({ scope: { branch: null, channel: null, aggregate_proven: false } })
  );
  assert.equal(unknown.amount_truth.quality, "GAP");
  assert.equal(unknown.amount_truth.scope.branch, null);
  assert.equal(unknown.amount_truth.scope.channel, null);

  const all = normalizeCashEvent(
    event({ scope: { branch: "ALL", channel: "ALL", aggregate_proven: false } })
  );
  assert.equal(all.amount_truth.quality, "GAP");
  assert.equal(all.amount_truth.scope.branch, null);
  assert.equal(all.amount_truth.scope.channel, null);
});

test("proven consolidated ALL scope is accepted only when aggregate_proven=true", () => {
  const result = normalizeCashEvent(
    event({ scope: { branch: "ALL", channel: "ALL", aggregate_proven: true } })
  );
  assert.equal(result.amount_truth.quality, "ACTUAL");
  assert.equal(result.amount_truth.scope.branch, "ALL");
  assert.equal(result.amount_truth.scope.channel, "ALL");
  assert.equal(result.amount_truth.scope.aggregate_proven, true);
});

test("OTHER_EVIDENCED categories still require proven movement", () => {
  const inflow = normalizeCashEvent(
    event({
      category: "OTHER_EVIDENCED_INFLOW",
      cash_movement_proven: false
    })
  );
  const outflow = normalizeCashEvent(
    event({
      direction: "OUTFLOW",
      category: "OTHER_EVIDENCED_OUTFLOW",
      cash_movement_proven: false
    })
  );
  assert.equal(inflow.amount_truth.quality, "GAP");
  assert.equal(outflow.amount_truth.quality, "GAP");
});

test("GAP and NOT_CONNECTED preserve null values", () => {
  for (const quality of ["GAP", "NOT_CONNECTED"]) {
    const result = normalizeCashEvent(event({ quality, amount: 999 }));
    assert.equal(result.amount_truth.quality, quality);
    assert.equal(result.amount_truth.value, null);
  }
});

test("normalization is deterministic and idempotent for the same event input", () => {
  const input = event({
    event_id: "CASH-EVENT-001",
    payment_method: "CASH",
    cash_location: { class: "TILL", label: "CN1_MAIN_TILL" }
  });
  const first = normalizeCashEvent(input);
  const second = normalizeCashEvent(input);
  assert.deepEqual(second, first);
});

test("event identity and location labels are privacy-safe metadata only", () => {
  const result = normalizeCashEvent(
    event({
      event_id: "https://drive.google.com/private-id",
      cash_location: {
        class: "BANK_ACCOUNT",
        label: "https://docs.google.com/private"
      }
    })
  );
  assert.equal(result.event_id, null);
  assert.deepEqual(result.cash_location, {
    class: "BANK_ACCOUNT",
    label: null
  });
  assert.equal(result.amount_truth.quality, "ACTUAL");
});

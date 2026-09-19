import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import {
  PROCUREMENT_FINANCIAL_SOURCES,
  loadProcurementFinancialTruth,
  mapProcurementApRows,
  mapProcurementSupplierPayment,
  mapProcurementSupplierPayments
} from "../../02_CORE/shared/procurement-financial-truth-v1.mjs";

const targetPeriod = Object.freeze({
  start: "2026-09-01",
  end: "2026-09-19",
  timezone: "Asia/Ho_Chi_Minh"
});

const scope = Object.freeze({
  branch: "ALL",
  channel: "ALL",
  aggregate_proven: true
});

const asOf = "2026-09-19T17:00:00+07:00";

function payment(overrides = {}) {
  return {
    id: "PAYMENT-001",
    payment_date: "2026-09-18",
    amount: "125000",
    method: "BANK",
    status: "ACTIVE",
    ...overrides
  };
}

function paymentOptions(overrides = {}) {
  return {
    targetPeriod,
    scope,
    asOf,
    ...overrides
  };
}

function apOptions(overrides = {}) {
  return {
    pointDate: "2026-09-19",
    currentSourceDate: "2026-09-19",
    timezone: "Asia/Ho_Chi_Minh",
    scope,
    asOf,
    readComplete: true,
    ...overrides
  };
}

test("ACTIVE supplier payment maps exactly once to canonical cash OUTFLOW/SUPPLIER_PAYMENT", () => {
  const { event, reason } = mapProcurementSupplierPayment(payment(), paymentOptions());

  assert.equal(reason, null);
  assert.equal(event.direction, "OUTFLOW");
  assert.equal(event.category, "SUPPLIER_PAYMENT");
  assert.equal(event.proof_basis, "SUPPLIER_PAYMENT");
  assert.equal(event.cash_movement_proven, true);
  assert.equal(event.amount_truth.quality, "ACTUAL");
  assert.equal(event.amount_truth.value, 125000);
  assert.equal(event.amount_truth.group, "CASH");
  assert.equal(event.payment_method, "BANK");
  assert.deepEqual(event.cash_location, { class: null, label: null });
  assert.equal(event.amount_truth.source.class, "RECORDED_PROCUREMENT_PAYMENT");
  assert.equal(event.amount_truth.source.label, "PROCUREMENT_SUPPLIER_PAYMENTS");
});

test("VOID supplier payment is excluded", () => {
  const result = mapProcurementSupplierPayment(
    payment({ status: "VOID" }),
    paymentOptions()
  );
  assert.equal(result.event, null);
  assert.equal(result.reason, "VOID_PAYMENT_EXCLUDED");
});

test("BANK and MOMO payment methods are metadata and never create account balance truth", () => {
  for (const method of ["BANK", "MOMO"]) {
    const { event } = mapProcurementSupplierPayment(
      payment({ method }),
      paymentOptions()
    );
    assert.equal(event.payment_method, method);
    assert.equal(Object.hasOwn(event, "account_balance"), false);
    assert.equal(Object.hasOwn(event, "opening_balance"), false);
    assert.equal(Object.hasOwn(event, "ending_balance"), false);
  }
});

test("payment allocation context is ignored so one payment remains one cash event", () => {
  const rows = [
    payment({
      allocations: [
        { purchase_order_id: "PO-A", amount: 50000 },
        { purchase_order_id: "PO-B", amount: 75000 }
      ]
    })
  ];
  const result = mapProcurementSupplierPayments(rows, paymentOptions());
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].amount_truth.value, 125000);
});

test("identical duplicate payment identity is deterministically deduplicated", () => {
  const result = mapProcurementSupplierPayments(
    [payment(), payment()],
    paymentOptions()
  );
  assert.equal(result.events.length, 1);
  assert.equal(result.quality, "ACTUAL");
  assert.ok(result.diagnostics.includes("DUPLICATE_PAYMENT_ID_DEDUPED"));
});

test("conflicting duplicate payment identity fails source coverage closed", () => {
  const result = mapProcurementSupplierPayments(
    [payment(), payment({ amount: 99999 })],
    paymentOptions()
  );
  assert.equal(result.events.length, 1);
  assert.equal(result.quality, "GAP");
  assert.equal(result.coverage.status, "PARTIAL");
  assert.ok(result.diagnostics.includes("DUPLICATE_PAYMENT_ID_CONFLICT"));
});

test("purchase/order/AP-shaped row cannot become cash payment event", () => {
  const result = mapProcurementSupplierPayment(
    {
      id: "ORDER-001",
      order_date: "2026-09-18",
      total_amount: 500000,
      balance_due: 200000,
      status: "POSTED"
    },
    paymentOptions()
  );
  assert.equal(result.event, null);
  assert.notEqual(result.reason, null);
});

test("payment amount missing zero negative NaN Infinity fail closed", () => {
  for (const amount of [null, "", 0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const result = mapProcurementSupplierPayment(
      payment({ amount }),
      paymentOptions()
    );
    assert.equal(result.event, null);
    assert.equal(result.reason, "INVALID_PAYMENT_AMOUNT");
  }
});

test("strict finite numeric DB string is accepted", () => {
  const { event } = mapProcurementSupplierPayment(
    payment({ amount: " 125000.50 " }),
    paymentOptions()
  );
  assert.equal(event.amount_truth.value, 125000.5);
});

test("non-numeric payment strings do not coerce", () => {
  for (const amount of ["125k", "Infinity", " ", "1,000"]) {
    const result = mapProcurementSupplierPayment(
      payment({ amount }),
      paymentOptions()
    );
    assert.equal(result.event, null);
    assert.equal(result.reason, "INVALID_PAYMENT_AMOUNT");
  }
});

test("out-of-period payment is excluded", () => {
  const result = mapProcurementSupplierPayment(
    payment({ payment_date: "2026-08-31" }),
    paymentOptions()
  );
  assert.equal(result.event, null);
  assert.equal(result.reason, "PAYMENT_OUTSIDE_TARGET_PERIOD");
});

test("invalid payment date fails closed", () => {
  const result = mapProcurementSupplierPayment(
    payment({ payment_date: "19/09/2026" }),
    paymentOptions()
  );
  assert.equal(result.event, null);
  assert.equal(result.reason, "INVALID_PAYMENT_DATE");
});

test("explicit scope is required and unknown never becomes ALL", () => {
  const missing = mapProcurementSupplierPayment(
    payment(),
    paymentOptions({ scope: {} })
  );
  assert.equal(missing.event, null);
  assert.equal(missing.reason, "INVALID_SCOPE");

  const unprovenAll = mapProcurementSupplierPayment(
    payment(),
    paymentOptions({
      scope: { branch: "ALL", channel: "ALL", aggregate_proven: false }
    })
  );
  assert.equal(unprovenAll.event, null);
  assert.equal(unprovenAll.reason, "INVALID_SCOPE");
});

test("payment source and lineage remain privacy-safe even when runtime identity is unsafe", () => {
  const { event } = mapProcurementSupplierPayment(
    payment({ id: "https://drive.google.com/private-payment" }),
    paymentOptions()
  );
  assert.equal(event.event_id, null);
  assert.equal(event.amount_truth.source.label, "PROCUREMENT_SUPPLIER_PAYMENTS");
  assert.deepEqual(event.amount_truth.lineage, ["PROCUREMENT_SUPPLIER_PAYMENTS"]);
  assert.doesNotMatch(JSON.stringify(event), /drive\.google\.com/i);
});

test("payment mapping is deterministic independent of input order", () => {
  const rows = [
    payment({ id: "P2", payment_date: "2026-09-19", amount: 200 }),
    payment({ id: "P1", payment_date: "2026-09-18", amount: 100 })
  ];
  const first = mapProcurementSupplierPayments(rows, paymentOptions());
  const second = mapProcurementSupplierPayments([...rows].reverse(), paymentOptions());
  assert.deepEqual(second, first);
});

test("payment source coverage never claims whole Cash Bridge COMPLETE", () => {
  const result = mapProcurementSupplierPayments([payment()], paymentOptions());
  assert.equal(result.coverage.status, "COMPLETE");
  assert.equal(result.coverage.source, "PROCUREMENT_SUPPLIER_PAYMENTS");
  assert.equal(result.coverage.whole_cash_bridge_complete, false);
});

test("AP finite rows aggregate outstanding and overdue exactly", () => {
  const result = mapProcurementApRows(
    [
      { balance_due: 100000, overdue_balance: 25000 },
      { balance_due: "50000.50", overdue_balance: "5000.25" }
    ],
    apOptions()
  );
  assert.equal(result.quality, "ACTUAL");
  assert.equal(result.outstanding.value, 150000.5);
  assert.equal(result.overdue.value, 30000.25);
  assert.equal(result.outstanding.metric, "procurement_supplier_ap_outstanding");
  assert.equal(result.overdue.metric, "procurement_supplier_ap_overdue");
  assert.equal(result.outstanding.group, "AP");
  assert.equal(result.outstanding.reconciliation_status, "NOT_APPLICABLE");
});

test("successful empty complete AP view is explicit ACTUAL zero", () => {
  const result = mapProcurementApRows([], apOptions());
  assert.equal(result.quality, "ACTUAL");
  assert.equal(result.outstanding.quality, "ACTUAL");
  assert.equal(result.outstanding.value, 0);
  assert.equal(result.overdue.value, 0);
});

test("canonical AP mapper does not inherit legacy missing-to-zero finiteNumber behavior", () => {
  for (const row of [
    { balance_due: null, overdue_balance: 0 },
    { balance_due: "", overdue_balance: 0 },
    { balance_due: 100, overdue_balance: null },
    { balance_due: 100, overdue_balance: "" }
  ]) {
    const result = mapProcurementApRows([row], apOptions());
    assert.equal(result.quality, "GAP");
    assert.equal(result.outstanding.value, null);
    assert.equal(result.overdue.value, null);
    assert.ok(result.diagnostics.includes("INVALID_AP_NUMERIC_ROW"));
  }
});

test("invalid AP NaN Infinity and nonnumeric strings fail closed", () => {
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, "oops"]) {
    const result = mapProcurementApRows(
      [{ balance_due: value, overdue_balance: 0 }],
      apOptions()
    );
    assert.equal(result.quality, "GAP");
    assert.equal(result.outstanding.value, null);
  }
});

test("negative AP values reject", () => {
  for (const row of [
    { balance_due: -1, overdue_balance: 0 },
    { balance_due: 100, overdue_balance: -1 }
  ]) {
    const result = mapProcurementApRows([row], apOptions());
    assert.equal(result.quality, "GAP");
    assert.equal(result.outstanding.value, null);
    assert.equal(result.overdue.value, null);
  }
});

test("overdue cannot exceed outstanding", () => {
  const result = mapProcurementApRows(
    [{ balance_due: 100, overdue_balance: 101 }],
    apOptions()
  );
  assert.equal(result.quality, "GAP");
  assert.equal(result.outstanding.value, null);
  assert.equal(result.overdue.value, null);
  assert.ok(result.diagnostics.includes("AP_OVERDUE_EXCEEDS_OUTSTANDING"));
});

test("current AP is point-in-time truth at source date", () => {
  const result = mapProcurementApRows(
    [{ balance_due: 100, overdue_balance: 25 }],
    apOptions()
  );
  assert.deepEqual(result.outstanding.period, {
    start: "2026-09-19",
    end: "2026-09-19",
    timezone: "Asia/Ho_Chi_Minh"
  });
  assert.equal(result.coverage.point_in_time, true);
  assert.equal(result.coverage.current_source_date, "2026-09-19");
});

test("historical AP date without snapshot evidence fails closed", () => {
  const result = mapProcurementApRows(
    [{ balance_due: 100, overdue_balance: 25 }],
    apOptions({ pointDate: "2026-08-31" })
  );
  assert.equal(result.quality, "GAP");
  assert.equal(result.outstanding.value, null);
  assert.equal(result.overdue.value, null);
  assert.equal(result.outstanding.reason, "HISTORICAL_AP_SNAPSHOT_NOT_AVAILABLE");
  assert.deepEqual(result.diagnostics, ["HISTORICAL_AP_SNAPSHOT_NOT_AVAILABLE"]);
});

test("AP explicit scope required and unproven ALL fails closed", () => {
  for (const badScope of [
    {},
    { branch: "ALL", channel: "ALL", aggregate_proven: false }
  ]) {
    const result = mapProcurementApRows(
      [{ balance_due: 100, overdue_balance: 0 }],
      apOptions({ scope: badScope })
    );
    assert.equal(result.quality, "GAP");
    assert.equal(result.outstanding.value, null);
  }
});

test("load boundary asks payment reader for exact target period and ACTIVE status", async () => {
  const calls = [];
  await loadProcurementFinancialTruth({
    targetPeriod,
    scope,
    paymentReader: async (args) => {
      calls.push(args);
      return { rows: [payment()] };
    },
    apReader: async () => ({ rows: [] }),
    now: () => new Date("2026-09-19T10:00:00Z")
  });
  assert.deepEqual(calls, [{
    start: "2026-09-01",
    end: "2026-09-19",
    status: "ACTIVE"
  }]);
});

test("missing readers preserve per-source NOT_CONNECTED without synthetic values", async () => {
  const result = await loadProcurementFinancialTruth({
    targetPeriod,
    scope,
    now: () => new Date("2026-09-19T10:00:00Z")
  });
  assert.equal(result.payments.quality, "NOT_CONNECTED");
  assert.deepEqual(result.payments.events, []);
  assert.equal(result.ap.quality, "NOT_CONNECTED");
  assert.equal(result.ap.outstanding.value, null);
  assert.equal(result.ap.overdue.value, null);
  assert.equal(result.coverage.whole_cash_bridge_complete, false);
});

test("payment read failure does not erase successful AP truth", async () => {
  const result = await loadProcurementFinancialTruth({
    targetPeriod,
    scope,
    paymentReader: async () => {
      throw new Error("payment source down");
    },
    apReader: async () => ({
      rows: [{ balance_due: 300, overdue_balance: 50 }]
    }),
    now: () => new Date("2026-09-19T10:00:00Z")
  });
  assert.equal(result.payments.quality, "GAP");
  assert.equal(result.ap.quality, "ACTUAL");
  assert.equal(result.ap.outstanding.value, 300);
  assert.equal(result.ap.overdue.value, 50);
});

test("AP read failure does not erase successful supplier-payment cash events", async () => {
  const result = await loadProcurementFinancialTruth({
    targetPeriod,
    scope,
    paymentReader: async () => ({ rows: [payment()] }),
    apReader: async () => {
      throw new Error("ap source down");
    },
    now: () => new Date("2026-09-19T10:00:00Z")
  });
  assert.equal(result.payments.quality, "ACTUAL");
  assert.equal(result.payments.events.length, 1);
  assert.equal(result.ap.quality, "GAP");
  assert.equal(result.ap.outstanding.value, null);
});

test("current read boundary rejects historical AP point request while preserving payments", async () => {
  const result = await loadProcurementFinancialTruth({
    targetPeriod,
    scope,
    apPointDate: "2026-08-31",
    paymentReader: async () => ({ rows: [payment()] }),
    apReader: async () => ({ rows: [{ balance_due: 300, overdue_balance: 50 }] }),
    now: () => new Date("2026-09-19T10:00:00Z")
  });
  assert.equal(result.payments.quality, "ACTUAL");
  assert.equal(result.ap.quality, "GAP");
  assert.equal(result.ap.outstanding.reason, "HISTORICAL_AP_SNAPSHOT_NOT_AVAILABLE");
});

test("read boundary output remains deterministic and source-isolated", async () => {
  const args = {
    targetPeriod,
    scope,
    paymentReader: async () => ({ rows: [payment()] }),
    apReader: async () => ({ rows: [{ balance_due: 300, overdue_balance: 50 }] }),
    now: () => new Date("2026-09-19T10:00:00Z")
  };
  assert.deepEqual(
    await loadProcurementFinancialTruth(args),
    await loadProcurementFinancialTruth(args)
  );
});

test("canonical mapper never outputs purchase cost as cash or profit-recognition metric", async () => {
  const result = await loadProcurementFinancialTruth({
    targetPeriod,
    scope,
    paymentReader: async () => ({ rows: [payment()] }),
    apReader: async () => ({ rows: [{ balance_due: 300, overdue_balance: 50 }] }),
    now: () => new Date("2026-09-19T10:00:00Z")
  });
  const serialized = JSON.stringify(result).toLowerCase();
  assert.doesNotMatch(serialized, /cogs/);
  assert.doesNotMatch(serialized, /total_purchases/);
  assert.doesNotMatch(serialized, /purchase_total/);
});

test("Core Procurement financial mapper is read-only and contains no write action", async () => {
  const source = await fs.readFile(
    new URL("../../02_CORE/shared/procurement-financial-truth-v1.mjs", import.meta.url),
    "utf8"
  );
  for (const forbidden of [".insert(", ".update(", ".delete(", ".upsert(", ".rpc("]) {
    assert.equal(source.includes(forbidden), false);
  }
  assert.doesNotMatch(source, /COGS/);
});

test("canonical source constants identify recorded payments and current AP view only", () => {
  assert.deepEqual(PROCUREMENT_FINANCIAL_SOURCES, {
    PAYMENTS: "PROCUREMENT_SUPPLIER_PAYMENTS",
    AP: "V_PROCUREMENT_SUPPLIER_PAYABLES"
  });
});

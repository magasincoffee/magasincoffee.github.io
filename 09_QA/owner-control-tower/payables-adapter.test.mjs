import test from "node:test";
import assert from "node:assert/strict";

import {
  loadProcurementPayables,
  summarizePayablesRows
} from "../../04_OWNER/ControlTower/payables-adapter-v1.mjs";
import { normalizeControlTowerSnapshot } from "../../04_OWNER/ControlTower/snapshot-v1.mjs";

function fakeClient(resultsByView) {
  return {
    from(view) {
      return {
        select() {
          return Promise.resolve(resultsByView[view] ?? { data: [], error: null });
        }
      };
    }
  };
}

test("summarizePayablesRows derives trusted payable attention metrics", () => {
  const result = summarizePayablesRows(
    [
      { balance_due: 100000, overdue_balance: 25000 },
      { balance_due: "50000", overdue_balance: "0" }
    ],
    [
      { balance_due: 100000, status: "POSTED", is_overdue: true },
      { balance_due: 50000, status: "DRAFT", is_overdue: false },
      { balance_due: 999999, status: "CANCELLED", is_overdue: true },
      { balance_due: 0, status: "POSTED", is_overdue: true }
    ]
  );

  assert.deepEqual(result, {
    totalDue: 150000,
    overdueAmount: 25000,
    openOrders: 2,
    overdueOrders: 1
  });
});

test("adapter reads only trusted procurement views and marks result ACTUAL", async () => {
  const calls = [];
  const client = {
    from(view) {
      calls.push(view);
      return {
        select(columns) {
          calls.push(`${view}:${columns}`);
          if (view === "v_procurement_supplier_payables") {
            return Promise.resolve({
              data: [{ balance_due: 200000, overdue_balance: 10000 }],
              error: null
            });
          }
          return Promise.resolve({
            data: [
              { balance_due: 200000, status: "POSTED", is_overdue: true }
            ],
            error: null
          });
        }
      };
    }
  };

  const section = await loadProcurementPayables(client, {
    now: () => new Date("2026-09-18T05:30:00Z")
  });

  assert.equal(section.quality, "ACTUAL");
  assert.equal(section.totalDue, 200000);
  assert.equal(section.overdueAmount, 10000);
  assert.equal(section.openOrders, 1);
  assert.equal(section.overdueOrders, 1);
  assert.equal(section.asOf, "2026-09-18T05:30:00.000Z");
  assert.deepEqual(calls.slice(0, 2), [
    "v_procurement_supplier_payables",
    "v_procurement_supplier_payables:balance_due,overdue_balance"
  ]);
  assert.ok(calls.includes("v_procurement_order_summary"));
});

test("adapter failure is section-local GAP with no trusted numbers", async () => {
  const section = await loadProcurementPayables(
    fakeClient({
      v_procurement_supplier_payables: {
        data: null,
        error: new Error("fixture source unavailable")
      }
    }),
    { now: () => new Date("2026-09-18T05:31:00Z") }
  );

  const snapshot = normalizeControlTowerSnapshot({ payables: section });

  assert.equal(snapshot.payables.quality, "GAP");
  assert.equal(snapshot.payables.totalDue, null);
  assert.equal(snapshot.payables.overdueAmount, null);
  assert.equal(snapshot.payables.openOrders, null);
  assert.equal(snapshot.payables.overdueOrders, null);
  assert.match(snapshot.payables.message, /tạm thời không khả dụng/);
});

test("empty trusted views produce actual zeroes, not unavailable placeholders", async () => {
  const section = await loadProcurementPayables(
    fakeClient({
      v_procurement_supplier_payables: { data: [], error: null },
      v_procurement_order_summary: { data: [], error: null }
    })
  );

  assert.equal(section.quality, "ACTUAL");
  assert.equal(section.totalDue, 0);
  assert.equal(section.overdueAmount, 0);
  assert.equal(section.openOrders, 0);
  assert.equal(section.overdueOrders, 0);
});

import test from "node:test";
import assert from "node:assert/strict";

import { loadControlTowerSection } from "../../04_OWNER/ControlTower/source-isolation-v1.mjs";
import { normalizeControlTowerSnapshot } from "../../04_OWNER/ControlTower/snapshot-v1.mjs";

const fixedNow = () => new Date("2026-09-18T06:50:00Z");

test("unexpected source exception becomes section-local GAP", async () => {
  const section = await loadControlTowerSection(
    async () => {
      throw new Error("fixture private failure detail");
    },
    {
      source: "SANITIZED_TEST_SOURCE",
      errorMessage: "Nguồn thử nghiệm tạm thời không khả dụng.",
      now: fixedNow
    }
  );

  assert.deepEqual(section, {
    quality: "GAP",
    source: "SANITIZED_TEST_SOURCE",
    asOf: "2026-09-18T06:50:00.000Z",
    message: "Nguồn thử nghiệm tạm thời không khả dụng."
  });
  assert.doesNotMatch(JSON.stringify(section), /private failure detail/);
});

test("invalid loader result fails closed instead of entering raw state", async () => {
  const section = await loadControlTowerSection(
    async () => null,
    {
      source: "SANITIZED_TEST_SOURCE",
      errorMessage: "Nguồn trả dữ liệu không hợp lệ.",
      now: fixedNow
    }
  );

  assert.equal(section.quality, "GAP");
  assert.equal(section.source, "SANITIZED_TEST_SOURCE");
});

test("valid adapter section passes through unchanged", async () => {
  const expected = {
    quality: "ESTIMATE",
    source: "SANITIZED_PARTIAL_SOURCE",
    asOf: "2026-09-18T06:45:00Z",
    unresolvedCount: 3,
    message: "Một phần nguồn chưa khả dụng."
  };

  const section = await loadControlTowerSection(async () => expected, {
    now: fixedNow
  });

  assert.equal(section, expected);
});

test("one failed source does not erase healthy sibling sections", async () => {
  const [revenue, payables, workforce] = await Promise.all([
    loadControlTowerSection(
      async () => ({
        quality: "NOT_CONNECTED",
        source: "SANITIZED_REVENUE",
        asOf: "2026-09-18T06:40:00Z",
        message: "Chưa kết nối."
      }),
      { now: fixedNow }
    ),
    loadControlTowerSection(
      async () => {
        throw new Error("payables fixture failure");
      },
      {
        source: "SANITIZED_PAYABLES",
        errorMessage: "Payables unavailable.",
        now: fixedNow
      }
    ),
    loadControlTowerSection(
      async () => ({
        quality: "ACTUAL",
        source: "SANITIZED_WORKFORCE",
        asOf: "2026-09-18T06:42:00Z",
        staffingGapCount: null,
        unresolvedCount: 2
      }),
      { now: fixedNow }
    )
  ]);

  const snapshot = normalizeControlTowerSnapshot({
    revenue,
    payables,
    workforce
  });

  assert.equal(snapshot.revenue.quality, "NOT_CONNECTED");
  assert.equal(snapshot.payables.quality, "GAP");
  assert.equal(snapshot.payables.totalDue, null);
  assert.equal(snapshot.workforce.quality, "ACTUAL");
  assert.equal(snapshot.workforce.unresolvedCount, 2);
});

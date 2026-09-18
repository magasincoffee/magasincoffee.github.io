import test from "node:test";
import assert from "node:assert/strict";

import { loadSectionSafely } from "../../04_OWNER/ControlTower/source-isolation-v1.mjs";

const fixedNow = () => new Date("2026-09-18T06:50:00Z");

test("healthy section passes through unchanged", async () => {
  const expected = {
    quality: "ACTUAL",
    source: "SANITIZED_HEALTHY",
    asOf: "2026-09-18T06:49:00Z",
    totalDue: 1200
  };

  const result = await loadSectionSafely(async () => expected, {
    source: "fallback",
    now: fixedNow
  });

  assert.equal(result, expected);
});

test("thrown source becomes section-local GAP without leaking exception text", async () => {
  const result = await loadSectionSafely(
    async () => {
      throw new Error("private backend detail");
    },
    {
      source: "SANITIZED_PAYABLES",
      message: "Nguồn công nợ tạm thời không khả dụng.",
      now: fixedNow
    }
  );

  assert.deepEqual(result, {
    quality: "GAP",
    source: "SANITIZED_PAYABLES",
    asOf: "2026-09-18T06:50:00.000Z",
    message: "Nguồn công nợ tạm thời không khả dụng."
  });
  assert.doesNotMatch(JSON.stringify(result), /private backend detail/);
});

test("malformed source result fails closed to GAP", async () => {
  for (const value of [null, undefined, "bad", []]) {
    const result = await loadSectionSafely(async () => value, {
      source: "SANITIZED_SOURCE",
      now: fixedNow
    });
    assert.equal(result.quality, "GAP");
  }
});

test("one failed source does not erase healthy sibling sections", async () => {
  const [revenue, payables, workforce] = await Promise.all([
    loadSectionSafely(
      async () => {
        throw new Error("revenue failed");
      },
      { source: "REVENUE", now: fixedNow }
    ),
    loadSectionSafely(
      async () => ({ quality: "ACTUAL", source: "PAYABLES", totalDue: 42 }),
      { source: "PAYABLES", now: fixedNow }
    ),
    loadSectionSafely(
      async () => ({ quality: "ESTIMATE", source: "WORKFORCE", unresolvedCount: 2 }),
      { source: "WORKFORCE", now: fixedNow }
    )
  ]);

  assert.equal(revenue.quality, "GAP");
  assert.equal(payables.quality, "ACTUAL");
  assert.equal(payables.totalDue, 42);
  assert.equal(workforce.quality, "ESTIMATE");
  assert.equal(workforce.unresolvedCount, 2);
});

import test from "node:test";
import assert from "node:assert/strict";

import {
  loadWorkforceAttention,
  summarizeWorkforceAttention
} from "../../04_OWNER/ControlTower/workforce-adapter-v1.mjs";
import { normalizeControlTowerSnapshot } from "../../04_OWNER/ControlTower/snapshot-v1.mjs";

function coreFixture({
  stores = [{ id: "s1" }, { id: "s2" }],
  transfers = [],
  generations = {},
  failures = new Set()
} = {}) {
  return {
    date: {
      monday() { return "2026-09-14"; }
    },
    stores: {
      async accessible() {
        if (failures.has("stores")) throw new Error("stores failed");
        return stores;
      }
    },
    supabase: {
      async rpc(name, args) {
        const key =
          name === "list_schedule_generations"
            ? `${name}:${args.p_store_id}`
            : name;
        if (failures.has(key) || failures.has(name)) {
          return { data: null, error: new Error(`${key} failed`) };
        }
        if (name === "get_manager_transfer_requests") {
          return { data: transfers, error: null };
        }
        if (name === "list_schedule_generations") {
          return { data: generations[args.p_store_id] || [], error: null };
        }
        throw new Error(`unexpected rpc ${name}`);
      }
    }
  };
}

test("summary counts only pending transfers and unpublished generations", () => {
  const result = summarizeWorkforceAttention({
    transferRows: [
      { status: "PENDING" },
      { status: "APPROVED" },
      { status: "pending" }
    ],
    generationsByStore: [
      [
        { status: "DRAFT" },
        { status: "PUBLISHED" }
      ],
      [
        { status: "REVIEWED" },
        { status: "CANCELLED" }
      ]
    ]
  });

  assert.deepEqual(result, {
    staffingGapCount: null,
    unresolvedCount: 4,
    pendingTransfers: 2,
    unpublishedGenerations: 2
  });
});

test("complete read-only sources return ACTUAL unresolved attention", async () => {
  const section = await loadWorkforceAttention(
    coreFixture({
      transfers: [
        { status: "PENDING" },
        { status: "APPROVED" }
      ],
      generations: {
        s1: [{ status: "DRAFT" }],
        s2: [{ status: "PUBLISHED" }]
      }
    }),
    { now: () => new Date("2026-09-18T05:40:00Z") }
  );

  assert.equal(section.quality, "ACTUAL");
  assert.equal(section.staffingGapCount, null);
  assert.equal(section.unresolvedCount, 2);
  assert.equal(section.asOf, "2026-09-18T05:40:00.000Z");
  assert.match(section.message, /Staffing gap chưa có read model kiểm chứng/);
});

test("partial source failure returns ESTIMATE and preserves only verified lower bound", async () => {
  const section = await loadWorkforceAttention(
    coreFixture({
      transfers: [{ status: "PENDING" }],
      generations: {
        s1: [{ status: "DRAFT" }]
      },
      failures: new Set(["list_schedule_generations:s2"])
    })
  );

  assert.equal(section.quality, "ESTIMATE");
  assert.equal(section.unresolvedCount, 2);
  assert.equal(section.staffingGapCount, null);
  assert.match(section.message, /tối thiểu/);
});

test("complete source failure becomes GAP and snapshot redacts metrics", async () => {
  const section = await loadWorkforceAttention(
    coreFixture({
      failures: new Set([
        "get_manager_transfer_requests",
        "list_schedule_generations"
      ])
    })
  );
  const snapshot = normalizeControlTowerSnapshot({ workforce: section });

  assert.equal(snapshot.workforce.quality, "GAP");
  assert.equal(snapshot.workforce.staffingGapCount, null);
  assert.equal(snapshot.workforce.unresolvedCount, null);
});

test("adapter never invokes schedule generation or publish write RPCs", async () => {
  const calls = [];
  const core = coreFixture();
  const original = core.supabase.rpc;
  core.supabase.rpc = async (name, args) => {
    calls.push(name);
    return original(name, args);
  };

  await loadWorkforceAttention(core);

  assert.deepEqual(
    [...new Set(calls)].sort(),
    ["get_manager_transfer_requests", "list_schedule_generations"].sort()
  );
  for (const forbidden of [
    "auto_generate_schedule_generation",
    "review_schedule_generation",
    "publish_schedule_generation",
    "review_store_transfer_request"
  ]) {
    assert.equal(calls.includes(forbidden), false);
  }
});

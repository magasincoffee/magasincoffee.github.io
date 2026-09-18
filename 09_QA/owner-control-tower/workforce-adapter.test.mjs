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
  requirements = {},
  assignments = {},
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
          name === "list_schedule_generations" ||
          name === "get_workforce_staffing_requirements"
            ? `${name}:${args.p_store_id}`
            : name === "get_schedule_generation_assignments"
              ? `${name}:${args.p_generation_id}`
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
        if (name === "get_workforce_staffing_requirements") {
          return { data: requirements[args.p_store_id] || [], error: null };
        }
        if (name === "get_schedule_generation_assignments") {
          return { data: assignments[args.p_generation_id] || [], error: null };
        }
        throw new Error(`unexpected rpc ${name}`);
      }
    }
  };
}

test("summary combines verified staffing gaps with existing unresolved attention", () => {
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
    ],
    staffingGapByStore: [
      { quality: "ACTUAL", staffingGapCount: 1 },
      { quality: "ACTUAL", staffingGapCount: 2 }
    ]
  });

  assert.deepEqual(result, {
    staffingGapCount: 3,
    staffingGapComplete: true,
    unresolvedCount: 4,
    pendingTransfers: 2,
    unpublishedGenerations: 2
  });
});

test("complete read-only sources return ACTUAL staffing gap and unresolved attention", async () => {
  const section = await loadWorkforceAttention(
    coreFixture({
      transfers: [
        { status: "PENDING" },
        { status: "APPROVED" }
      ],
      generations: {
        s1: [{ id: "g1", status: "DRAFT" }],
        s2: [{ id: "g2", status: "PUBLISHED" }]
      },
      requirements: {
        s1: [{
          id: "r1",
          status: "ACTIVE",
          work_date: "2026-09-14",
          start_time: "06:00",
          end_time: "12:00",
          minimum_headcount: 2
        }],
        s2: [{
          id: "r2",
          status: "ACTIVE",
          work_date: "2026-09-14",
          start_time: "12:00",
          end_time: "17:00",
          minimum_headcount: 1
        }]
      },
      assignments: {
        g1: [{
          work_date: "2026-09-14",
          start_time: "06:00",
          end_time: "12:00"
        }],
        g2: [{
          work_date: "2026-09-14",
          start_time: "12:00",
          end_time: "17:00"
        }]
      }
    }),
    { now: () => new Date("2026-09-18T05:40:00Z") }
  );

  assert.equal(section.quality, "ACTUAL");
  assert.equal(section.staffingGapCount, 1);
  assert.equal(section.unresolvedCount, 2);
  assert.equal(section.asOf, "2026-09-18T05:40:00.000Z");
  assert.match(section.message, /minimum_headcount/);
});

test("partial generation source failure returns ESTIMATE and redacts incomplete staffing gap", async () => {
  const section = await loadWorkforceAttention(
    coreFixture({
      transfers: [{ status: "PENDING" }],
      generations: {
        s1: [{ id: "g1", status: "DRAFT" }]
      },
      requirements: {
        s1: [{
          id: "r1",
          work_date: "2026-09-14",
          start_time: "06:00",
          end_time: "12:00",
          minimum_headcount: 1
        }]
      },
      assignments: { g1: [] },
      failures: new Set(["list_schedule_generations:s2"])
    })
  );

  assert.equal(section.quality, "ESTIMATE");
  assert.equal(section.unresolvedCount, 2);
  assert.equal(section.staffingGapCount, null);
  assert.match(section.message, /toàn bộ cửa hàng/);
});

test("store with no schedule generation never becomes a synthetic zero gap", async () => {
  const section = await loadWorkforceAttention(
    coreFixture({
      stores: [{ id: "s1" }],
      generations: { s1: [] }
    })
  );

  assert.equal(section.quality, "ESTIMATE");
  assert.equal(section.staffingGapCount, null);
  assert.equal(section.unresolvedCount, 0);
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

test("adapter reuses generation reads and never invokes workflow write RPCs", async () => {
  const calls = [];
  const core = coreFixture({
    stores: [{ id: "s1" }],
    generations: {
      s1: [{ id: "g1", status: "DRAFT" }]
    },
    requirements: {
      s1: [{
        id: "r1",
        work_date: "2026-09-14",
        start_time: "06:00",
        end_time: "12:00",
        minimum_headcount: 1
      }]
    },
    assignments: { g1: [] }
  });
  const original = core.supabase.rpc;
  core.supabase.rpc = async (name, args) => {
    calls.push(name);
    return original(name, args);
  };

  await loadWorkforceAttention(core);

  assert.deepEqual(
    [...new Set(calls)].sort(),
    [
      "get_manager_transfer_requests",
      "get_schedule_generation_assignments",
      "get_workforce_staffing_requirements",
      "list_schedule_generations"
    ].sort()
  );
  assert.equal(
    calls.filter((name) => name === "list_schedule_generations").length,
    1
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

import test from "node:test";
import assert from "node:assert/strict";

import {
  loadWorkforceAttention,
  summarizeStaffingGapSections,
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
        const scope =
          name === "list_schedule_generations" ||
          name === "get_workforce_staffing_requirements"
            ? args.p_store_id
            : name === "get_schedule_generation_assignments"
              ? args.p_generation_id
              : "";
        const key = scope ? `${name}:${scope}` : name;
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

const requirement = (id, minimum = 1) => ({
  id,
  status: "ACTIVE",
  work_date: "2026-09-14",
  start_time: "06:00",
  end_time: "12:00",
  minimum_headcount: minimum,
  skill_code: null,
  min_skill_level: 0
});

const assignment = () => ({
  work_date: "2026-09-14",
  start_time: "06:00",
  end_time: "12:00"
});

test("attention summary counts only pending transfers and unpublished generations", () => {
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
    unresolvedCount: 4,
    pendingTransfers: 2,
    unpublishedGenerations: 2
  });
});

test("staffing-gap aggregation requires verified ACTUAL source for every store", () => {
  assert.deepEqual(
    summarizeStaffingGapSections(
      [
        { quality: "ACTUAL", staffingGapCount: 1 },
        { quality: "ACTUAL", staffingGapCount: 2 }
      ],
      2
    ),
    { complete: true, staffingGapCount: 3 }
  );

  assert.deepEqual(
    summarizeStaffingGapSections(
      [
        { quality: "ACTUAL", staffingGapCount: 1 },
        { quality: "GAP", staffingGapCount: null }
      ],
      2
    ),
    { complete: false, staffingGapCount: null }
  );
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
        s1: [requirement("r1", 2)],
        s2: [requirement("r2", 1)]
      },
      assignments: {
        g1: [assignment()],
        g2: [assignment()]
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

test("partial generation source failure fails staffing gap closed and keeps attention lower bound", async () => {
  const section = await loadWorkforceAttention(
    coreFixture({
      transfers: [{ status: "PENDING" }],
      generations: {
        s1: [{ id: "g1", status: "DRAFT" }]
      },
      requirements: {
        s1: [requirement("r1", 2)]
      },
      assignments: {
        g1: [assignment()]
      },
      failures: new Set(["list_schedule_generations:s2"])
    })
  );

  assert.equal(section.quality, "ESTIMATE");
  assert.equal(section.unresolvedCount, 2);
  assert.equal(section.staffingGapCount, null);
  assert.match(section.message, /chỉ hiển thị khi đủ nguồn/);
});

test("staffing-gap source failure is section-local and does not erase verified attention", async () => {
  const section = await loadWorkforceAttention(
    coreFixture({
      transfers: [{ status: "PENDING" }],
      generations: {
        s1: [{ id: "g1", status: "DRAFT" }],
        s2: [{ id: "g2", status: "PUBLISHED" }]
      },
      requirements: {
        s1: [requirement("r1", 1)],
        s2: [requirement("r2", 1)]
      },
      assignments: {
        g1: [assignment()],
        g2: [assignment()]
      },
      failures: new Set(["get_workforce_staffing_requirements:s2"])
    })
  );

  assert.equal(section.quality, "ESTIMATE");
  assert.equal(section.unresolvedCount, 2);
  assert.equal(section.staffingGapCount, null);
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

test("integrated adapter invokes read RPCs only and reuses generation rows", async () => {
  const calls = [];
  const core = coreFixture({
    stores: [{ id: "s1" }],
    generations: {
      s1: [{ id: "g1", status: "REVIEWED" }]
    },
    requirements: {
      s1: [requirement("r1", 1)]
    },
    assignments: {
      g1: []
    }
  });
  const original = core.supabase.rpc;
  core.supabase.rpc = async (name, args) => {
    calls.push(name);
    return original(name, args);
  };

  const section = await loadWorkforceAttention(core);
  assert.equal(section.staffingGapCount, 1);

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
    1,
    "preloaded generation rows must prevent a duplicate generation RPC"
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

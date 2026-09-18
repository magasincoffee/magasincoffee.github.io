import test from "node:test";
import assert from "node:assert/strict";

import {
  loadStoreStaffingGap,
  selectScheduleGeneration,
  summarizeStaffingGaps
} from "../../04_OWNER/ControlTower/staffing-gap-adapter-v1.mjs";

function coreFixture({
  generations = [],
  requirements = [],
  assignments = [],
  failures = new Set()
} = {}) {
  const calls = [];

  return {
    calls,
    core: {
      date: {
        monday() {
          return "2026-09-14";
        }
      },
      supabase: {
        async rpc(name, args) {
          calls.push({ name, args });
          if (failures.has(name)) {
            return { data: null, error: new Error(`${name} failed`) };
          }
          if (name === "list_schedule_generations") {
            return { data: generations, error: null };
          }
          if (name === "get_workforce_staffing_requirements") {
            return { data: requirements, error: null };
          }
          if (name === "get_schedule_generation_assignments") {
            return { data: assignments, error: null };
          }
          throw new Error(`unexpected rpc ${name}`);
        }
      }
    }
  };
}

test("generation selection mirrors current Publish engine preference", () => {
  const published = { id: "g-old", status: "PUBLISHED" };
  const reviewed = { id: "g-review", status: "REVIEWED" };
  const draft = { id: "g-draft", status: "DRAFT" };

  assert.equal(
    selectScheduleGeneration([published, reviewed, draft]),
    reviewed
  );
  assert.equal(
    selectScheduleGeneration([published]),
    published
  );
  assert.equal(selectScheduleGeneration([]), null);
});

test("summary mirrors minimum-headcount shortage semantics", () => {
  const summary = summarizeStaffingGaps({
    requirements: [
      {
        id: "r1",
        status: "ACTIVE",
        work_date: "2026-09-14",
        start_time: "06:00:00",
        end_time: "12:00:00",
        minimum_headcount: 2,
        skill_code: null,
        min_skill_level: 0
      },
      {
        id: "r2",
        status: "ACTIVE",
        work_date: "2026-09-14",
        start_time: "17:00:00",
        end_time: "22:00:00",
        minimum_headcount: 2,
        skill_code: null,
        min_skill_level: 0
      }
    ],
    assignments: [
      {
        work_date: "2026-09-14",
        start_time: "06:00:00",
        end_time: "12:00:00"
      },
      {
        work_date: "2026-09-14",
        start_time: "05:30:00",
        end_time: "12:30:00"
      },
      {
        work_date: "2026-09-14",
        start_time: "17:00:00",
        end_time: "22:00:00"
      }
    ]
  });

  assert.equal(summary.requirementCount, 2);
  assert.equal(summary.staffingGapCount, 1);
  assert.deepEqual(
    summary.gaps.map((gap) => ({
      id: gap.requirementId,
      minimum: gap.minimum,
      assigned: gap.assigned
    })),
    [{ id: "r2", minimum: 2, assigned: 1 }]
  );
});

test("skill-bound requirement counts only qualifying assignment evidence", () => {
  const summary = summarizeStaffingGaps({
    requirements: [
      {
        id: "bar",
        work_date: "2026-09-15",
        start_time: "06:00",
        end_time: "12:00",
        minimum_headcount: 2,
        skill_code: "BAR",
        min_skill_level: 2
      }
    ],
    assignments: [
      {
        work_date: "2026-09-15",
        start_time: "06:00",
        end_time: "12:00",
        skill_code: "BAR",
        skill_level: 2
      },
      {
        work_date: "2026-09-15",
        start_time: "06:00",
        end_time: "12:00",
        skill_code: "BAR",
        skill_level: 1
      },
      {
        work_date: "2026-09-15",
        start_time: "06:00",
        end_time: "12:00",
        skill_code: "CASHIER",
        skill_level: 5
      }
    ]
  });

  assert.equal(summary.staffingGapCount, 1);
  assert.equal(summary.gaps[0].assigned, 1);
});

test("existing generation with zero active requirements is a verified zero gap", async () => {
  const { core } = coreFixture({
    generations: [{ id: "g1", status: "DRAFT" }],
    requirements: [],
    assignments: []
  });

  const section = await loadStoreStaffingGap(core, {
    storeId: "s1",
    now: () => new Date("2026-09-18T07:10:00Z")
  });

  assert.equal(section.quality, "ACTUAL");
  assert.equal(section.staffingGapCount, 0);
  assert.equal(section.requirementCount, 0);
  assert.equal(section.generationId, "g1");
});

test("preloaded generation rows avoid a duplicate generation RPC", async () => {
  const { core, calls } = coreFixture({
    requirements: [],
    assignments: []
  });

  const section = await loadStoreStaffingGap(core, {
    storeId: "s1",
    generationRows: [{ id: "g-preloaded", status: "DRAFT" }]
  });

  assert.equal(section.quality, "ACTUAL");
  assert.equal(section.staffingGapCount, 0);
  assert.equal(
    calls.some((call) => call.name === "list_schedule_generations"),
    false
  );
});

test("missing generation fails closed instead of fabricating zero", async () => {
  const { core, calls } = coreFixture({
    generations: []
  });

  const section = await loadStoreStaffingGap(core, {
    storeId: "s1"
  });

  assert.equal(section.quality, "GAP");
  assert.equal(section.staffingGapCount, null);
  assert.deepEqual(
    calls.map((call) => call.name),
    ["list_schedule_generations"]
  );
});

test("source error or malformed requirement fails closed", async () => {
  const failed = coreFixture({
    generations: [{ id: "g1", status: "DRAFT" }],
    failures: new Set(["get_workforce_staffing_requirements"])
  });

  const failedSection = await loadStoreStaffingGap(failed.core, {
    storeId: "s1"
  });
  assert.equal(failedSection.quality, "GAP");
  assert.equal(failedSection.staffingGapCount, null);

  const malformed = coreFixture({
    generations: [{ id: "g1", status: "DRAFT" }],
    requirements: [
      {
        id: "bad",
        work_date: "2026-09-14",
        start_time: "06:00",
        end_time: "12:00",
        minimum_headcount: null
      }
    ],
    assignments: []
  });

  const malformedSection = await loadStoreStaffingGap(malformed.core, {
    storeId: "s1"
  });
  assert.equal(malformedSection.quality, "GAP");
  assert.equal(malformedSection.staffingGapCount, null);
});

test("adapter invokes read RPCs only and never schedule write RPCs", async () => {
  const { core, calls } = coreFixture({
    generations: [{ id: "g1", status: "REVIEWED" }],
    requirements: [
      {
        id: "r1",
        work_date: "2026-09-14",
        start_time: "06:00",
        end_time: "12:00",
        minimum_headcount: 1
      }
    ],
    assignments: []
  });

  const section = await loadStoreStaffingGap(core, {
    storeId: "s1"
  });

  assert.equal(section.quality, "ACTUAL");
  assert.equal(section.staffingGapCount, 1);

  const names = calls.map((call) => call.name);
  assert.deepEqual(
    [...new Set(names)].sort(),
    [
      "get_schedule_generation_assignments",
      "get_workforce_staffing_requirements",
      "list_schedule_generations"
    ].sort()
  );

  for (const forbidden of [
    "auto_generate_schedule_generation",
    "review_schedule_generation",
    "publish_schedule_generation",
    "review_store_transfer_request"
  ]) {
    assert.equal(names.includes(forbidden), false);
  }
});

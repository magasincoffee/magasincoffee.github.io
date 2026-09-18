import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import {
  NightRunContractError,
  NightRunLeaseBusyError,
  acquireCursorLease,
  checkpointCursor,
  nightRunWindowState,
  reconcileStaleCursorLease,
  releaseCursorLease,
  shouldHardStop,
  validateNightRunContract
} from "../src/runtime/night-run.mjs";

const repoRoot = new URL("../../../", import.meta.url);
const readJson = async (relative) =>
  JSON.parse(await fs.readFile(new URL(relative, repoRoot), "utf8"));

async function canonical() {
  const [contract, registry, cursor] = await Promise.all([
    readJson("02_CORE/contracts/night-run-2026-09-18.v2.json"),
    readJson("02_CORE/contracts/business-os-project-registry.v1.json"),
    readJson("02_CORE/contracts/business-os-execution-cursor.v1.json")
  ]);
  return { contract, registry, cursor };
}

test("canonical night-run contract is bounded to the two approved projects", async () => {
  const { contract, registry, cursor } = await canonical();
  const result = validateNightRunContract({ contract, registry, cursor });

  assert.equal(result.id, "NIGHT_RUN_2026-09-18");
  assert.deepEqual(result.allowedProjectIds, [
    "magasin-business-os",
    "magasin-media-robot"
  ]);
  assert.equal(contract.hard_stop, true);
  assert.equal(registry.discovery_policy, "DENY_UNREGISTERED");
});

test("night-run deadline is deterministic and hard-stops at the boundary", async () => {
  const { contract } = await canonical();
  assert.equal(
    nightRunWindowState(contract, "2026-09-18T23:14:59+07:00"),
    "BEFORE"
  );
  assert.equal(
    nightRunWindowState(contract, "2026-09-18T23:15:00+07:00"),
    "ACTIVE"
  );
  assert.equal(
    shouldHardStop(contract, "2026-09-19T09:14:59+07:00"),
    false
  );
  assert.equal(
    shouldHardStop(contract, "2026-09-19T09:15:00+07:00"),
    true
  );
});

test("cursor lease prevents duplicate concurrent workers", async () => {
  const { cursor } = await canonical();
  const leased = acquireCursorLease(cursor, {
    holder: "worker-a",
    now: "2026-09-18T23:40:00+07:00",
    ttlMs: 60_000
  });

  assert.equal(leased.lease.holder, "worker-a");
  assert.throws(
    () =>
      acquireCursorLease(leased, {
        holder: "worker-b",
        now: "2026-09-18T23:40:30+07:00",
        ttlMs: 60_000
      }),
    NightRunLeaseBusyError
  );
});

test("checkpoint requires active lease ownership and release is explicit", async () => {
  const { cursor } = await canonical();
  const leased = acquireCursorLease(cursor, {
    holder: "worker-a",
    now: "2026-09-18T23:40:00+07:00"
  });

  assert.throws(
    () =>
      checkpointCursor(leased, {
        holder: "worker-b",
        projectId: "magasin-business-os",
        task: "TASK-038",
        microTask: "lease_test",
        checkpoint: "TESTED",
        lastCommit: "abc123",
        now: "2026-09-18T23:41:00+07:00"
      }),
    NightRunLeaseBusyError
  );

  const checkpointed = checkpointCursor(leased, {
    holder: "worker-a",
    projectId: "magasin-business-os",
    task: "TASK-038",
    microTask: "lease_test",
    checkpoint: "TESTED",
    lastCommit: "abc123",
    now: "2026-09-18T23:41:00+07:00"
  });
  assert.equal(checkpointed.checkpoint, "TESTED");

  const released = releaseCursorLease(checkpointed, {
    holder: "worker-a",
    now: "2026-09-18T23:42:00+07:00"
  });
  assert.equal(released.lease, null);
});

test("expired lease remains fail-closed until HEAD and CI are reconciled", async () => {
  const { cursor } = await canonical();
  const leased = acquireCursorLease(cursor, {
    holder: "worker-a",
    now: "2026-09-18T23:40:00+07:00",
    ttlMs: 60_000
  });

  const waiting = reconcileStaleCursorLease(leased, {
    now: "2026-09-18T23:42:00+07:00",
    headVerified: true,
    ciVerified: false
  });
  assert.equal(waiting.action, "WAIT_RECONCILE_HEAD_CI");
  assert.equal(waiting.cursor.lease.holder, "worker-a");

  const recovered = reconcileStaleCursorLease(leased, {
    now: "2026-09-18T23:42:00+07:00",
    headVerified: true,
    ciVerified: true
  });
  assert.equal(recovered.action, "STALE_LEASE_RELEASED");
  assert.equal(recovered.cursor.lease, null);
});

test("unregistered projects and missing safety rules are rejected", async () => {
  const { contract, registry, cursor } = await canonical();
  const badContract = structuredClone(contract);
  badContract.allowed_projects.push({
    id: "third-project",
    repository: "example/third"
  });
  assert.throws(
    () => validateNightRunContract({ contract: badContract, registry, cursor }),
    NightRunContractError
  );

  const unsafeContract = structuredClone(contract);
  unsafeContract.forbidden = unsafeContract.forbidden.filter(
    (item) => item !== "THIRD_PROJECT_EXECUTION"
  );
  assert.throws(
    () => validateNightRunContract({ contract: unsafeContract, registry, cursor }),
    NightRunContractError
  );
});


test("hard-stop workflow is GitHub-hosted and independent of the PC", async () => {
  const workflow = await fs.readFile(
    new URL(".github/workflows/night-run-hard-stop.yml", repoRoot),
    "utf8"
  );

  assert.match(workflow, /cron:\s*"15 2 19 9 \*"/);
  assert.match(workflow, /runs-on:\s*ubuntu-latest/);
  assert.match(workflow, /NIGHT_WINDOW_COMPLETE/);
  assert.match(workflow, /state\["status"\]\s*=\s*"WAIT_USER"/);
  assert.match(workflow, /state\["autonomy"\]\s*=\s*"MANUAL"/);
  assert.doesNotMatch(workflow, /runs-on:\s*self-hosted/);
});

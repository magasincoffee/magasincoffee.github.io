import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import {
  HANDOFF_ACTIONS,
  ProjectHandoffError,
  planProjectHandoff,
  snapshotProjectCheckpoint
} from "../src/portfolio/handoff.mjs";
import { PORTFOLIO_ACTIONS } from "../src/portfolio/scheduler.mjs";

const repoRoot = new URL("../../../", import.meta.url);
const registry = JSON.parse(
  await fs.readFile(
    new URL("02_CORE/contracts/business-os-project-registry.v1.json", repoRoot),
    "utf8"
  )
);

const business = {
  id: "magasin-business-os",
  status: "READY",
  runnable_hint: true,
  requires_user: false,
  blocked: false,
  current_task: "TASK-043",
  constraints: []
};

const media = {
  id: "magasin-media-robot",
  status: "READY",
  runnable_hint: true,
  requires_user: false,
  blocked: false,
  current_task: "SAYDIVOICE_PROVIDER_ADAPTER",
  constraints: [
    "NO_LIVE_GENERATE_WITHOUT_SEPARATE_AUTHORIZATION",
    "NO_LIVE_DOWNLOAD_WITHOUT_SEPARATE_AUTHORIZATION"
  ]
};

function select(id) {
  return {
    action: PORTFOLIO_ACTIONS.SELECT_PROJECT,
    project_id: id,
    reason: "TEST"
  };
}

test("Business OS to Media Robot uses Media checkpoint and constraints only", () => {
  const decision = planProjectHandoff({
    registry,
    schedulerDecision: select("magasin-media-robot"),
    currentProjectId: "magasin-business-os",
    normalizedStates: [business, media],
    checkpoints: {
      "magasin-business-os": {
        task: "TASK-043",
        checkpoint: "BUSINESS_BEFORE_MEDIA"
      },
      "magasin-media-robot": {
        task: "SAYDIVOICE_PROVIDER_ADAPTER",
        checkpoint: "MEDIA_OFFLINE_GATE_VERIFIED"
      }
    }
  });

  assert.equal(decision.action, HANDOFF_ACTIONS.SWITCH_PROJECT);
  assert.equal(decision.source.task, "TASK-043");
  assert.equal(decision.target.task, "SAYDIVOICE_PROVIDER_ADAPTER");
  assert.equal(decision.target.checkpoint, "MEDIA_OFFLINE_GATE_VERIFIED");
  assert.ok(
    decision.target_constraints.includes(
      "NO_LIVE_GENERATE_WITHOUT_SEPARATE_AUTHORIZATION"
    )
  );
  assert.notEqual(decision.target.checkpoint, "BUSINESS_BEFORE_MEDIA");
});

test("Media Robot to Business OS resumes the Business checkpoint, not Media checkpoint", () => {
  const decision = planProjectHandoff({
    registry,
    schedulerDecision: select("magasin-business-os"),
    currentProjectId: "magasin-media-robot",
    normalizedStates: [business, media],
    checkpoints: {
      "magasin-business-os": {
        task: "TASK-043",
        checkpoint: "BUSINESS_AFTER_MEDIA"
      },
      "magasin-media-robot": {
        task: "SAYDIVOICE_PROVIDER_ADAPTER",
        checkpoint: "MEDIA_DONE"
      }
    }
  });

  assert.equal(decision.action, HANDOFF_ACTIONS.SWITCH_PROJECT);
  assert.equal(decision.source.task, "SAYDIVOICE_PROVIDER_ADAPTER");
  assert.equal(decision.target.task, "TASK-043");
  assert.equal(decision.target.checkpoint, "BUSINESS_AFTER_MEDIA");
  assert.equal(decision.target_constraints.length, 0);
});

test("project checkpoint snapshot keeps Owner boundary flags project-local", () => {
  const mediaWait = {
    ...media,
    status: "WAIT_USER",
    runnable_hint: false,
    requires_user: true
  };
  const snapshot = snapshotProjectCheckpoint({
    normalizedState: mediaWait,
    task: "MEDIA-X",
    checkpoint: "WAITING",
    updatedAt: "2026-09-18T16:00:00Z"
  });
  assert.equal(snapshot.project_id, "magasin-media-robot");
  assert.equal(snapshot.requires_user, true);
  assert.equal(snapshot.task, "MEDIA-X");
});

test("handoff rejects a target that became WAIT_USER after scheduler selection", () => {
  const waitingMedia = {
    ...media,
    status: "WAIT_USER",
    runnable_hint: false,
    requires_user: true
  };

  assert.throws(
    () =>
      planProjectHandoff({
        registry,
        schedulerDecision: select("magasin-media-robot"),
        currentProjectId: "magasin-business-os",
        normalizedStates: [business, waitingMedia]
      }),
    ProjectHandoffError
  );
});

test("handoff rejects unregistered target even if scheduler-like input names it", () => {
  assert.throws(
    () =>
      planProjectHandoff({
        registry,
        schedulerDecision: select("third-project"),
        currentProjectId: "magasin-business-os",
        normalizedStates: [
          business,
          {
            id: "third-project",
            status: "READY",
            runnable_hint: true,
            blocked: false,
            requires_user: false
          }
        ]
      }),
    ProjectHandoffError
  );
});

test("completed handoff operation key suppresses duplicate project transition", () => {
  const first = planProjectHandoff({
    registry,
    schedulerDecision: select("magasin-media-robot"),
    currentProjectId: "magasin-business-os",
    normalizedStates: [business, media],
    checkpoints: {
      "magasin-media-robot": {
        task: "SAYDIVOICE_PROVIDER_ADAPTER",
        checkpoint: "MEDIA_OFFLINE_GATE_VERIFIED"
      }
    }
  });
  assert.equal(first.action, HANDOFF_ACTIONS.SWITCH_PROJECT);

  const duplicate = planProjectHandoff({
    registry,
    schedulerDecision: select("magasin-media-robot"),
    currentProjectId: "magasin-business-os",
    normalizedStates: [business, media],
    checkpoints: {
      "magasin-media-robot": {
        task: "SAYDIVOICE_PROVIDER_ADAPTER",
        checkpoint: "MEDIA_OFFLINE_GATE_VERIFIED"
      }
    },
    completedOperations: [first.operation_key]
  });
  assert.equal(duplicate.action, HANDOFF_ACTIONS.NOOP_DUPLICATE);
  assert.equal(duplicate.operation_key, first.operation_key);
});

test("staying on current runnable project does not create a handoff operation", () => {
  const decision = planProjectHandoff({
    registry,
    schedulerDecision: select("magasin-business-os"),
    currentProjectId: "magasin-business-os",
    normalizedStates: [business, media]
  });
  assert.equal(decision.action, HANDOFF_ACTIONS.STAY_CURRENT);
  assert.equal(decision.operation_key, null);
});

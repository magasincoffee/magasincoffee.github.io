import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import {
  getRegisteredProject,
  normalizeProjectState
} from "../src/portfolio/project-registry.mjs";
import {
  PORTFOLIO_ACTIONS,
  selectPortfolioProject
} from "../src/portfolio/scheduler.mjs";
import {
  PORTFOLIO_RECOVERY_ACTIONS,
  reconcilePortfolioCursor
} from "../src/portfolio/recovery-engine.mjs";

const repoRoot = new URL("../../../", import.meta.url);
const registry = JSON.parse(
  await fs.readFile(
    new URL("02_CORE/contracts/business-os-project-registry.v1.json", repoRoot),
    "utf8"
  )
);

const mediaCurrent = `
# Current Status

## Overall state
No additional live generation is required for ordinary implementation work.

## Current active objective
Implement the production SaydiVoice provider adapter using the field-verified authenticated Chrome contracts.
`;

const mediaNext = `
# Next Step

## Immediate next step — freeze preset controls and build the production SaydiVoice provider adapter

Before another live Generate is requested, complete all offline/unit verification.
`;

const mediaRules = `
# Development Rules

## Mandatory session protocol
Read repository source of truth first.

## Secrets and privacy
Never commit credentials or browser profiles.
`;

function business(overrides = {}) {
  const project = getRegisteredProject(registry, "magasin-business-os");
  return normalizeProjectState(project, {
    state: {
      project: "MAGASIN Business OS",
      repository: "magasincoffee/magasincoffee.github.io",
      current_task: "TASK-043",
      current_task_title: "Cross-project handoff integration",
      status: "READY",
      autonomy: "AUTO_CONTINUE",
      blocked: false,
      requires_user: false,
      next_task: "TASK-044",
      ...overrides
    }
  });
}

function media() {
  const project = getRegisteredProject(registry, "magasin-media-robot");
  return normalizeProjectState(project, {
    current_status: mediaCurrent,
    next_step: mediaNext,
    rules: mediaRules
  });
}

function cursor(overrides = {}) {
  return {
    schema_version: "business-os-execution-cursor.v1",
    night_run_id: "NIGHT_RUN_2026-09-18",
    project_id: "magasin-business-os",
    task: "TASK-043",
    micro_task: "cross_project_handoff_integration",
    status: "IN_PROGRESS",
    checkpoint: "TASK_042_MEDIA_OFFLINE_VERIFIED",
    resume_policy: "SAFE_RECONCILE_HEAD_STATE_CI",
    lease: null,
    last_commit: "media-docs-verified",
    updated_at: "2026-09-18T23:49:00.000Z",
    completed_operations: [],
    ...overrides
  };
}

test("Business OS WAIT_USER hands off only to the approved Media Robot project", () => {
  const bosWait = business({
    status: "WAIT_USER",
    autonomy: "MANUAL",
    requires_user: true
  });
  const mediaReady = media();

  const decision = selectPortfolioProject({
    registry,
    currentProjectId: "magasin-business-os",
    projectStates: [bosWait, mediaReady]
  });

  assert.equal(decision.action, PORTFOLIO_ACTIONS.SELECT_PROJECT);
  assert.equal(decision.project_id, "magasin-media-robot");
  assert.equal(
    decision.skipped.find((item) => item.id === "magasin-business-os")
      .classification,
    "WAIT_USER"
  );
  assert.deepEqual(
    mediaReady.constraints,
    [
      "NO_LIVE_GENERATE_WITHOUT_SEPARATE_AUTHORIZATION",
      "NO_LIVE_DOWNLOAD_WITHOUT_SEPARATE_AUTHORIZATION",
      "LOCAL_BROWSER_PROFILE_ONLY",
      "NO_SECRETS_OR_RUNTIME_MEDIA_IN_GIT"
    ]
  );
});

test("Media Robot WAIT_USER hands back to Business OS without leaking Media constraints", () => {
  const bosReady = business();
  const mediaReady = media();
  const mediaWait = {
    ...mediaReady,
    status: "WAIT_USER",
    requires_user: true,
    runnable_hint: false
  };

  const decision = selectPortfolioProject({
    registry,
    currentProjectId: "magasin-media-robot",
    projectStates: [bosReady, mediaWait]
  });

  assert.equal(decision.action, PORTFOLIO_ACTIONS.SELECT_PROJECT);
  assert.equal(decision.project_id, "magasin-business-os");
  assert.equal(bosReady.current_task, "TASK-043");
  assert.deepEqual(bosReady.constraints, []);
  assert.ok(
    mediaWait.constraints.includes(
      "NO_LIVE_GENERATE_WITHOUT_SEPARATE_AUTHORIZATION"
    )
  );
});

test("recovery resumes only the cursor project checkpoint after handoff", () => {
  const bosReady = business();
  const result = reconcilePortfolioCursor({
    cursor: cursor(),
    canonicalProjectId: "magasin-business-os",
    canonicalTask: "TASK-043",
    canonicalProjectState: bosReady,
    now: "2026-09-18T23:50:00.000Z",
    headVerified: true,
    ciVerified: true
  });

  assert.equal(
    result.action,
    PORTFOLIO_RECOVERY_ACTIONS.RESUME_CHECKPOINT
  );
  assert.equal(result.cursor.project_id, "magasin-business-os");
  assert.equal(result.cursor.task, "TASK-043");
  assert.equal(result.cursor.checkpoint, "TASK_042_MEDIA_OFFLINE_VERIFIED");
});

test("canonical Business OS advancement discards stale cross-project cursor replay", () => {
  const bosAdvanced = business({
    current_task: "TASK-044",
    current_task_title: "Portfolio-aware diagnostics",
    next_task: "TASK-045"
  });
  const result = reconcilePortfolioCursor({
    cursor: cursor({
      project_id: "magasin-media-robot",
      task: "TASK-042",
      micro_task: "saydivoice_provider_adapter_offline"
    }),
    canonicalProjectId: "magasin-business-os",
    canonicalTask: "TASK-044",
    canonicalProjectState: bosAdvanced,
    now: "2026-09-18T23:50:00.000Z",
    headVerified: true,
    ciVerified: true
  });

  assert.equal(
    result.action,
    PORTFOLIO_RECOVERY_ACTIONS.ADOPT_CANONICAL_CURSOR
  );
  assert.equal(result.cursor.project_id, "magasin-business-os");
  assert.equal(result.cursor.task, "TASK-044");
  assert.equal(result.cursor.checkpoint, "CANONICAL_STATE_ADOPTED");
});

test("unregistered project never becomes a cross-project handoff target", () => {
  const bosWait = business({
    status: "WAIT_USER",
    autonomy: "MANUAL",
    requires_user: true
  });
  const mediaWait = {
    ...media(),
    status: "WAIT_USER",
    requires_user: true,
    runnable_hint: false
  };

  const decision = selectPortfolioProject({
    registry,
    currentProjectId: "magasin-business-os",
    projectStates: [
      bosWait,
      mediaWait,
      {
        id: "third-project",
        status: "READY",
        runnable_hint: true
      }
    ]
  });

  assert.equal(
    decision.action,
    PORTFOLIO_ACTIONS.WAIT_NO_RUNNABLE_PROJECT
  );
  assert.equal(decision.project_id, null);
  assert.equal(
    decision.skipped.some((item) => item.id === "third-project"),
    false
  );
});

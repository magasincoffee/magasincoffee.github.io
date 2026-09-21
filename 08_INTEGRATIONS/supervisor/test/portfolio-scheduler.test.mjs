import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import {
  PORTFOLIO_ACTIONS,
  selectPortfolioProject
} from "../src/portfolio/scheduler.mjs";

const repoRoot = new URL("../../../", import.meta.url);
const registry = JSON.parse(
  await fs.readFile(
    new URL("02_CORE/contracts/business-os-project-registry.v1.json", repoRoot),
    "utf8"
  )
);

const ready = (id) => ({
  id,
  status: "READY",
  blocked: false,
  requires_user: false,
  runnable_hint: true
});

const waitUser = (id) => ({
  id,
  status: "WAIT_USER",
  blocked: false,
  requires_user: true,
  runnable_hint: false
});

const blocked = (id) => ({
  id,
  status: "BLOCKED",
  blocked: true,
  requires_user: true,
  runnable_hint: false
});

test("keeps current project when it remains safely runnable", () => {
  const decision = selectPortfolioProject({
    registry,
    currentProjectId: "magasin-media-robot",
    projectStates: [
      ready("magasin-business-os"),
      ready("magasin-media-robot")
    ]
  });

  assert.equal(decision.action, PORTFOLIO_ACTIONS.SELECT_PROJECT);
  assert.equal(decision.project_id, "magasin-media-robot");
  assert.equal(decision.reason, "CURRENT_PROJECT_STILL_RUNNABLE");
});

test("WAIT_USER on Business OS does not stop Media Robot", () => {
  const decision = selectPortfolioProject({
    registry,
    currentProjectId: "magasin-business-os",
    projectStates: [
      waitUser("magasin-business-os"),
      ready("magasin-media-robot")
    ]
  });

  assert.equal(decision.action, PORTFOLIO_ACTIONS.SELECT_PROJECT);
  assert.equal(decision.project_id, "magasin-media-robot");
  assert.equal(
    decision.skipped.find((item) => item.id === "magasin-business-os")
      .classification,
    "WAIT_USER"
  );
});

test("BLOCKED on Media Robot does not stop runnable Business OS", () => {
  const decision = selectPortfolioProject({
    registry,
    currentProjectId: "magasin-media-robot",
    projectStates: [
      ready("magasin-business-os"),
      blocked("magasin-media-robot")
    ]
  });

  assert.equal(decision.action, PORTFOLIO_ACTIONS.SELECT_PROJECT);
  assert.equal(decision.project_id, "magasin-business-os");
});

test("highest-priority runnable project wins when no current project is pinned", () => {
  const decision = selectPortfolioProject({
    registry,
    projectStates: [
      ready("magasin-media-robot"),
      ready("magasin-business-os")
    ]
  });

  assert.equal(decision.project_id, "magasin-business-os");
  assert.equal(decision.reason, "SELECT_HIGHEST_PRIORITY_RUNNABLE");
});

test("unknown or missing project state fails closed rather than inventing work", () => {
  const decision = selectPortfolioProject({
    registry,
    projectStates: [
      {
        id: "magasin-business-os",
        status: "UNKNOWN",
        runnable_hint: false
      },
      waitUser("magasin-media-robot")
    ]
  });

  assert.equal(
    decision.action,
    PORTFOLIO_ACTIONS.WAIT_NO_RUNNABLE_PROJECT
  );
  assert.equal(decision.project_id, null);
  assert.ok(
    decision.skipped.some(
      (item) =>
        item.id === "magasin-business-os" &&
        item.classification === "FAIL_CLOSED"
    )
  );
});

test("unregistered third-project state is ignored and never selected", () => {
  const decision = selectPortfolioProject({
    registry,
    projectStates: [
      waitUser("magasin-business-os"),
      waitUser("magasin-media-robot"),
      ready("third-project")
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

test("all DONE projects terminate portfolio work cleanly", () => {
  const decision = selectPortfolioProject({
    registry,
    projectStates: [
      { id: "magasin-business-os", status: "DONE", runnable_hint: false },
      { id: "magasin-media-robot", status: "DONE", runnable_hint: false }
    ]
  });

  assert.equal(decision.action, PORTFOLIO_ACTIONS.STOP_ALL_DONE);
  assert.equal(decision.project_id, null);
});

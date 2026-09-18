import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import {
  ProjectRegistryError,
  getRegisteredProject,
  normalizeProjectState,
  validateProjectRegistry
} from "../src/portfolio/project-registry.mjs";

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

test("registry is deny-by-default and contains exactly the two Owner-approved projects", () => {
  const result = validateProjectRegistry(registry);
  assert.deepEqual(result.projectIds, [
    "magasin-business-os",
    "magasin-media-robot"
  ]);
  assert.equal(registry.discovery_policy, "DENY_UNREGISTERED");
});

test("registry rejects an enabled third project", () => {
  const mutated = structuredClone(registry);
  mutated.projects.push({
    id: "third-project",
    repository: "example/third",
    enabled: true,
    priority: 3,
    state_strategy: "PROJECT_STATE_JSON",
    state_ref: "state.json",
    task_queue_ref: "queue.md"
  });
  assert.throws(() => validateProjectRegistry(mutated), ProjectRegistryError);
});

test("unregistered project lookup fails closed", () => {
  assert.throws(
    () => getRegisteredProject(registry, "unknown-project"),
    ProjectRegistryError
  );
});

test("PROJECT_STATE_JSON adapter preserves READY/AUTO_CONTINUE boundaries", () => {
  const project = getRegisteredProject(registry, "magasin-business-os");
  const normalized = normalizeProjectState(project, {
    state: {
      project: "MAGASIN Business OS",
      repository: "magasincoffee/magasincoffee.github.io",
      current_task: "TASK-039",
      current_task_title: "Business OS Robot V2 project registry",
      status: "READY",
      autonomy: "AUTO_CONTINUE",
      blocked: false,
      requires_user: false,
      next_task: "TASK-040"
    }
  });

  assert.equal(normalized.status, "READY");
  assert.equal(normalized.runnable_hint, true);
  assert.equal(normalized.requires_user, false);
  assert.equal(normalized.current_task, "TASK-039");
});

test("PROJECT_STATE_JSON adapter never treats WAIT_USER as runnable", () => {
  const project = getRegisteredProject(registry, "magasin-business-os");
  const normalized = normalizeProjectState(project, {
    state: {
      project: "MAGASIN Business OS",
      repository: "magasincoffee/magasincoffee.github.io",
      current_task: "TASK-X",
      status: "WAIT_USER",
      autonomy: "MANUAL",
      blocked: false,
      requires_user: true
    }
  });

  assert.equal(normalized.status, "WAIT_USER");
  assert.equal(normalized.runnable_hint, false);
  assert.equal(normalized.requires_user, true);
});

test("DOC_PAIR adapter recognizes the Media Robot offline implementation gate", () => {
  const project = getRegisteredProject(registry, "magasin-media-robot");
  const normalized = normalizeProjectState(project, {
    current_status: mediaCurrent,
    next_step: mediaNext,
    rules: mediaRules
  });

  assert.equal(normalized.status, "READY");
  assert.equal(normalized.runnable_hint, true);
  assert.equal(normalized.autonomy, "SAFE_OFFLINE_IMPLEMENTATION");
  assert.match(normalized.next_task, /Immediate next step/i);
  assert.ok(
    normalized.constraints.includes(
      "NO_LIVE_GENERATE_WITHOUT_SEPARATE_AUTHORIZATION"
    )
  );
});

test("DOC_PAIR adapter fails closed when explicit offline evidence is missing", () => {
  const project = getRegisteredProject(registry, "magasin-media-robot");
  const normalized = normalizeProjectState(project, {
    current_status: "# Current Status\n## Current active objective\nProvider adapter.",
    next_step: "# Next Step\n## Immediate next step — implement adapter",
    rules: mediaRules
  });

  assert.equal(normalized.status, "UNKNOWN");
  assert.equal(normalized.runnable_hint, false);
});

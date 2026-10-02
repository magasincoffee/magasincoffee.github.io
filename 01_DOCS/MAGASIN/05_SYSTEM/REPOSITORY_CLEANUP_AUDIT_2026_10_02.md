# MAGASIN WEBAPP — Repository Cleanup Audit 2026-10-02

**Repository:** `magasincoffee/magasincoffee.github.io`  
**Audit baseline:** `main @ 89520f9d4784d90da2500d53d31c1ed0e8047bff`  
**Purpose:** remove proven obsolete/quarantined source from the active tree without deleting current authority, migrations, QA evidence or active production routes.

## Baseline

Repository tree at audit start:

- total blobs: 618;
- `01_DOCS`: 159;
- `02_CORE`: 50;
- `03_PLATFORM`: 11;
- `04_OWNER`: 28;
- `05_MANAGER`: 63;
- `06_EMPLOYEE`: 13;
- `07_DATABASE`: 40;
- `09_QA`: 200;
- `99_LEGACY`: 35.

## Authority that must be preserved

### Active temporary authorities

Keep:

- `01_DOCS/MAGASIN/05_SYSTEM/EMPLOYEE_REGISTRATION_PRODUCTION_HARDENING_TEMP_SOURCE_OF_TRUTH.md`
  - status at audit: `ACTIVE / TEMPORARY EXECUTION AUTHORITY`;
- `01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_CROSS_STORE_SCHEDULING_TEMP_SOURCE_OF_TRUTH.md`
  - status at audit: `XSTORE-011 BLOCKED / OWNER INPUT REQUIRED`.

Do not delete these until their own lifecycle rules close.

### Closed/canonical evidence

Keep canonical/closed SOTs, acceptance evidence, migrations and active QA unless a separate proof shows they are redundant and removable.

Examples retained intentionally:

- AUTH-PROD canonical closure/SOT/evidence;
- UI/UX V2 canonical SOT/closure evidence;
- Workforce Scheduling Production Readiness SOT;
- Workforce UI/UX permanent acceptance;
- WUI-001→008 intermediate evidence;
- database migrations;
- active `.github/workflows` and `09_QA` suites.

## Wave 1 — proven obsolete source

### A. Remove `99_LEGACY`

`99_LEGACY/README.md` explicitly states that:

- the folder is historical/quarantine only;
- nothing under it should be loaded by canonical production runtime;
- obsolete migrated code may be moved there or deleted.

Git history already preserves the removed source. Keeping an additional legacy tree in active `main` increases ambiguity and duplicate-file noise.

Wave 1 therefore removes all 35 files under `99_LEGACY`.

Notable exact duplicates removed from the legacy copy only:

- `99_LEGACY/docs/WORKFORCE_COLOR_CONVENTION.md`
  duplicated the retained canonical `01_DOCS/WORKFORCE_COLOR_CONVENTION.md`;
- `99_LEGACY/owner/owner-workforce-demand-engine-v1.js`
  duplicated retained `04_OWNER/Workforce/01-demand/engine-v1.js`.

### B. Remove unused Manager compatibility layers

Current Manager runtime was inspected from:

- `05_MANAGER/index.html`;
- `05_MANAGER/runtime/manager-runtime-v1.html`;
- `05_MANAGER/runtime/manager-shell-v1.html`;
- `05_MANAGER/Workforce/engine-v1.js`;
- `05_MANAGER/Workforce/ui-consolidation-v1.js`;
- `05_MANAGER/Workforce/manager-scheduling-ui2-v1.js`.

The current Manager runtime still loads exactly these compatibility files:

- `05_MANAGER/runtime/compat/router/manager-route-bridge-v1.js`;
- `05_MANAGER/runtime/compat/router/manager-route-state-v2.js`;
- `05_MANAGER/runtime/compat/ui/manager-ui-shell-v2.js`.

Wave 1 preserves those three files.

The other 32 compatibility files are not loaded by the current runtime chain and represent superseded UI/router/workforce patches. They are removed from `main`.

## Explicitly not removed in Wave 1

- `03_PLATFORM/01_AUTH/auth-runtime-v2.js` — active Auth entrypoint;
- `03_PLATFORM/01_AUTH/auth-runtime-v1.js` — not removed in Wave 1 because a broader QA/history reference audit is still required before deletion;
- Manager/Employee/Owner active route files;
- migrations, even when old or superseded — migration history is immutable operational history;
- active TEMP SOTs;
- permanent acceptance evidence;
- QA fixtures/tests;
- placeholder routes such as Manager Academy/KPI/Settings even when byte-identical — route deletion requires a separate route/IA decision.

## Post-change gate

Wave 1 is accepted only if the cleanup PR receives green relevant repository gates and exact-main remains deployable.

If a test/runtime still depends on any removed compatibility path, restore or reconcile that dependency instead of weakening the gate.

## Follow-up cleanup waves

After Wave 1, continue with:

1. stale open PR inventory and closure;
2. stale branch inventory (delete only where tooling/permissions permit and after PR/history verification);
3. remaining active-tree version chains such as Auth runtime versions;
4. documentation consolidation where permanent acceptance already supersedes temporary planning;
5. orphan route/assets audit;
6. final repository tree + CI/deploy verification.

This audit is a cleanup record, not a new project authority. Existing project SOTs retain their own scope and precedence.


## Wave 2 — dead runtime/routes/workflow cleanup

Wave 2 was audited after Wave 1 merged to `main @ db3a03b9c8425404b42c2784969a9a758d93bd78`.

### A. Auth runtime version cleanup

The active Auth entrypoint `03_PLATFORM/01_AUTH/index.html` loads only:

`03_PLATFORM/01_AUTH/auth-runtime-v2.js`

AUTH-PROD QA also reads `auth-runtime-v2.js`; no current Auth SOT/closure evidence requires `auth-runtime-v1.js` as an active source file.

Wave 2 removes:

- `03_PLATFORM/01_AUTH/auth-runtime-v1.js`.

The Procurement QA path trigger is corrected from the removed v1 file to the active `auth-runtime-v2.js`.

### B. Remove legacy Manager demand source

Canonical Manager Workforce `engine-v1.js` does not load `demand-v1.js`.

The existing Manager canonical QA explicitly classified it as legacy and asserted that the canonical engine does not load it. Wave 2 converts that QA from “keep a legacy file around and inspect it” to “prove the legacy file is absent while canonical modules remain loaded”.

Wave 2 removes:

- `05_MANAGER/Workforce/demand-v1.js`.

This does not alter the active recurring staffing authority or XSTORE SOT.

### C. Remove dead Manager route stubs

A complete audit of current Manager HTML entrypoints found exactly three stale route stubs:

- `05_MANAGER/Academy/index.html`;
- `05_MANAGER/KPI/index.html`;
- `05_MANAGER/Cai-dat/index.html`.

All three were byte-identical and still attempted to load `/manager-v13-runtime.html`, which is no longer part of the production tree. The current canonical Manager route allowlist does not expose those legacy direct routes.

Wave 2 removes those three dead route stubs rather than preserving broken entrypoints.

### D. Remove expired one-time Night Run workflow

`.github/workflows/night-run-hard-stop.yml` was a dated hard-stop workflow for the 2026-09-19 night-run window. Its guard is tied to that historical window and it still declares `contents: write`.

The historical evidence remains in documentation/Git history. The expired executable workflow is removed from the active workflow set.

### E. Deployment validator cleanup

After Wave 1 removed `99_LEGACY`, the Pages validation workflow no longer needs `--exclude-dir=99_LEGACY`; that stale exclusion is removed.

### Wave 2 safety boundary

Retained intentionally:

- active Auth `auth-runtime-v2.js`;
- active Manager routes and current runtime chain;
- the three Manager compat files still loaded by production;
- current XSTORE recurring staffing implementation;
- active EMPREG/XSTORE TEMP SOTs;
- all migrations and canonical QA/evidence.


## Wave 3 — repository reading/index and GitHub metadata cleanup

Wave 2 merged to `main @ 726120f9a306dcf170a604904df8ea0d2445301e`.

### A. Stale pull requests

Before cleanup, GitHub still showed 12 open PRs created between 2026-09-01 and 2026-09-22. They belonged to historical Attendance, Robot, Supervisor, migration and superseded task branches and were all heavily diverged from current `main`.

The active EMPREG and XSTORE SOTs do not depend on those PRs.

The following stale PRs were closed without merging and without deleting their commits/branches:

- #260 — TASK-099 canonical closure;
- #225 — new-PC migration bootstrap;
- #224 — Supervisor post-release architecture;
- #221 — Supervisor RBT-009 flood baseline;
- #215 — Supervisor release soak;
- #150 — TASK-049 safe-send reconcile;
- #119 — Robot V2 portfolio orchestration;
- #117 — TASK-035 runner diagnostic;
- #108 — TASK-035 migration history reconcile;
- #66 — Supervisor recovery hardening;
- #59 — Supervisor chat-storm fix;
- #9 — Attendance duplicate sync workflow.

After closure, the only open PR was the active cleanup PR; no historical PR remained open.

Closing is metadata cleanup only: no stale PR was merged into current production.

### B. System documentation authority index

`01_DOCS/MAGASIN/05_SYSTEM/README.md` is upgraded from a generic folder description to a bounded authority index.

It now makes explicit that only these TEMP execution authorities are active:

- EMPREG hardening;
- XSTORE cross-store scheduling.

It also distinguishes closed/canonical SOTs and evidence files from active task queues. This reduces the risk that a future chat/robot reopens a completed track by choosing a historical file by name alone.

### C. Post-cleanup tree

Baseline before cleanup:

- 618 blobs;
- `05_MANAGER`: 63 files;
- `99_LEGACY`: 35 files.

After Wave 1 + Wave 2:

- 546 blobs;
- `05_MANAGER`: 27 files;
- `99_LEGACY`: 0 files;
- active GitHub workflows: 9;
- active Auth source contains only the v2 runtime path plus current templates/pages;
- current Manager runtime keeps only the three compatibility files that it actually loads.

Net active-tree reduction before this documentation-only wave: **72 files**.

### D. Branch inventory limitation

GitHub branch inventory contains **410 branches** at audit time.

The connected GitHub capability available in this session supports reading/searching branches and moving refs, but does **not** expose branch deletion. Therefore stale branches were not falsely reported as deleted.

PR clutter was cleaned safely; branch history remains the main GitHub-metadata cleanup item outside the executable capability available here.

Do not force-move old branch refs merely to simulate deletion; that would destroy useful branch lineage without actually cleaning GitHub metadata.

## Cleanup conclusion

The active WebApp tree is now materially cleaner:

- legacy quarantine removed;
- unused Manager compatibility patches removed;
- superseded Auth v1 removed;
- legacy Manager demand source removed;
- dead Manager route stubs removed;
- expired one-time Night Run workflow removed;
- stale deployment/workflow references reconciled;
- stale open PRs closed;
- active authority index added.

Intentionally retained:

- active EMPREG and XSTORE TEMP SOTs;
- canonical/closed SOTs and acceptance evidence;
- database migrations;
- active QA suites and fixtures;
- active role runtimes/routes;
- Git history and existing branches.

This is the intended definition of a clean repository: no parallel executable legacy path in `main`, while preserving authoritative history and current project boundaries.

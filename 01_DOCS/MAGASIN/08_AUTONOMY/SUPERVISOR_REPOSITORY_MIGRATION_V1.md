# MAGASIN Supervisor — Independent Repository Migration V1

Date: 2026-09-21  
Status: OWNER APPROVED / EXECUTION RELEASED  
Migration ID: MAGASIN_SUPERVISOR_INDEPENDENT_REPOSITORY_V1

## 1. Objective

Extract MAGASIN Supervisor from `magasincoffee/magasincoffee.github.io` into an independent platform repository:

`magasincoffee/magasin-supervisor`

The Supervisor becomes a project-agnostic orchestration platform. MAGASIN Business OS remains a consumer/project and keeps its own business PROJECT_STATE, TASK_QUEUE and domain architecture.

## 2. Frozen migration baseline

Source repository: `magasincoffee/magasincoffee.github.io`  
Baseline main SHA: `4f76b929c5fedc44b451abd823f0f1f7fb3e50fe`

Migration must preserve current Three-Lane semantics and local production state. The old embedded Supervisor copy remains a rollback source during the compatibility window.

## 3. Move / retain boundary

Move to the independent repository:
- `08_INTEGRATIONS/supervisor/src/**` -> `src/**`
- `08_INTEGRATIONS/supervisor/test/**` -> `test/**`
- `08_INTEGRATIONS/supervisor/windows/**` -> `windows/**`
- `08_INTEGRATIONS/supervisor/docs/**` -> `docs/**`
- `08_INTEGRATIONS/supervisor/package.json` -> repository root
- Supervisor-only `.github/workflows/supervisor-*.yml`
- Supervisor-only `.github/scripts/supervisor-*`
- canonical Three-Lane / lifecycle / scheduler / directive protocol documentation.

Remain in Business OS:
- `01_DOCS/MAGASIN/00_PROJECT_STATE.json`
- `01_DOCS/MAGASIN/00_TASK_QUEUE.md`
- PFC / Workforce / financial truth / business-domain source-of-truth.

Local runtime state is never committed:
- `lanes.json`
- `lane-registry.json`
- `lane-status.json`
- Brain/Work URLs
- message bodies/screenshots/cookies/tokens/browser profiles.

## 4. Required architecture separation

Brain/project decides WHAT to execute.

Supervisor decides HOW to transport/observe/recover safely.

Work executes bounded directives.

The independent Supervisor repository must not depend on Business OS task IDs, Profitability & Cash semantics, Workforce semantics or the Business OS PROJECT_STATE for platform build/test/release correctness.

## 5. Migration sequence

MIG-001 — Freeze Baseline + Migration Bootstrap  
MIG-002 — Extract platform files to target repository  
MIG-003 — Decouple Business OS-specific paths/state  
MIG-004 — CI/lifecycle parity on new repository  
MIG-005 — Single-authority production cutover  
MIG-006 — RBT-009 final exact-SHA 8h soak  
MIG-007 — Deprecate embedded old copy after rollback window

MIG-001 canonical artifacts:
- evidence: `01_DOCS/MAGASIN/08_AUTONOMY/MIG_001_SUPERVISOR_MIGRATION_BOOTSTRAP_EVIDENCE.md`
- machine file map: `01_DOCS/MAGASIN/08_AUTONOMY/SUPERVISOR_MIGRATION_V1_FILE_MAP.json`
- frozen inventory: 137 migration-managed files = 123 embedded Supervisor files + 8 Supervisor workflows + 6 Supervisor scripts
- classification: 90 MOVE / 47 REWRITE / 5 Business OS canonical RETAIN refs / 0 DEPRECATE
- MIG-001 production mutation: NONE
- next task: MIG-002 READY / NOT STARTED

MIG-002 canonical artifacts:
- target repository: `magasincoffee/magasin-supervisor`
- target evidence: `docs/MIG_002_EXTRACTION_EVIDENCE.md`
- parity manifest: `docs/MIG_002_PARITY_PROVENANCE.json`
- bootstrap main: `815fc10bbc1814ed46f73b63391b9e67e29aa446`
- extraction PR #1 merge: `e67ae8101c391fc0a77b41ae6190bb615356be99`
- extraction-safe CI PR #2 merge: `07160cfab6943d647661f732590a0ce45e2f92a5`
- docs-only closure PR #3 merge: `64371bedc7b9c976047224152dba820c12a0674c`
- parity: 137/137 represented; 90/90 MOVE byte-equivalent; 47/47 REWRITE provenance; missing=0; duplicate=0
- exact-main hosted gates: Supervisor Tests run `35627596398` SUCCESS; Supervisor Integrity run `35627596241` static SUCCESS / runtime SKIPPED fail-closed
- production cutover: NONE
- production authority: UNCHANGED_EXISTING_SUPERVISOR
- RBT-009: IMPLEMENTATION CANDIDATE / FINAL 8H SOAK PENDING
- next task: MIG-003 READY / NOT STARTED

MIG-003 canonical artifacts:
- target implementation base: `64371bedc7b9c976047224152dba820c12a0674c`
- project adapter contract: `src/project-adapter.mjs` / `docs/PROJECT_ADAPTER_V1.md`
- state-root contract: `src/state-root.mjs` + `windows/state-root.ps1` / `docs/STATE_ROOT_V1.md`
- coupling manifest: `docs/MIG_003_COUPLING_CLOSURE.json`
- target evidence: `docs/MIG_003_DECOUPLING_EVIDENCE.md`
- canonical implementation PR #5 head: `f7fe79e22660c8a9fc0c1e3feecfcf90d282298a`
- implementation merge: `aec7db9a715ceb41066af6636a4c91d34553eed5`
- docs-only target closure PR #6 merge: `7691bafd1571039be363d3edf760270756b5c7c6`
- PR-head gates: Supervisor Tests `35645284638` SUCCESS; Supervisor Integrity `35645284699` static SUCCESS / runtime SKIPPED
- exact implementation-main gates: Supervisor Tests `35645394216` SUCCESS; Supervisor Integrity `35645394250` static SUCCESS / runtime SKIPPED
- final target closure gates: Supervisor Tests `35671405631` SUCCESS; Supervisor Integrity `35671405652` static SUCCESS / runtime SKIPPED
- decoupling tests: 50/50 PASS; platform core/safety: 184/184 PASS; integrity/static: 82/82 PASS; StrictMode A→O PASS
- MIG-002 mapped paths preserved: 137/137; missing=0; 34 mapped coupling surfaces intentionally rewritten without re-freeze
- production cutover: NONE
- production authority: UNCHANGED_EXISTING_SUPERVISOR
- RBT-009: IMPLEMENTATION CANDIDATE / FINAL 8H SOAK PENDING
- next task: MIG-004 READY / NOT STARTED

## 6. Production guardrails

During MIG-001 through MIG-004:
- no production cutover;
- no deletion of the embedded Supervisor;
- no replacement Brain creation;
- no Brain/Work target reset;
- no blind latch reset;
- no dual production mutation authority;
- Owner STOP remains authoritative;
- auth/MFA/CAPTCHA/destructive/admin boundaries remain fail-closed.

With two physical devices, both may develop/test, but exactly one Supervisor instance may hold production mutation authority for a given lane set.

## 7. RBT-009 continuity

Carry forward exactly:

`RBT-001 -> RBT-008 = ACCEPTED`  
`RBT-009 = IMPLEMENTATION CANDIDATE / FINAL 8H SOAK PENDING`

Repository migration does not grant release certification.

Final RBT-009 release evidence must be generated against the exact independent-repository candidate SHA after migration parity and lifecycle gates pass.


### Historical old-repository soak

Before repository migration, RBT-009 run `35569077688` on source SHA `18e6d5025429cb1aaee986a8033d8b47169a54c3` proved:

- Tier A = PASS;
- normal release-gates preflight = PASS;
- Tier B started at `2026-09-21T06:41:50Z`;
- workflow ended at `2026-09-21T09:20:22Z`;
- observed duration = **2h38m32s**, therefore non-qualifying;
- downstream event validation, privacy scan, artifact upload and final markers were not reached;
- exact interruption root cause is not proven by retained evidence.

This is historical diagnostic evidence only. The 8-hour requirement is continuous and cannot be accumulated across partial attempts.

### Qualification after repository migration

Do **not** spend another final-certification 8-hour soak on the embedded source-repository candidate merely to close the old release surface while the platform repository is being extracted.

The qualifying sequence is:

`MIG-001 -> MIG-002 -> MIG-003 -> MIG-004 -> MIG-005 -> MIG-006`

At MIG-006, run RBT-009 Tier B from zero for 480 uninterrupted minutes against the exact `magasincoffee/magasin-supervisor` candidate SHA, after new-repository CI/lifecycle parity and single production mutation authority are proven.

## 8C. MIG-004 Definition of Done

Status: **MIG-004 DONE / MIG-005 READY / OWNER-SAFE-GATE**

MIG-004 is complete because:
1. full root-native Supervisor regression is green in the independent repository;
2. independent-repo Integrity is green without Business OS PROJECT_STATE/TASK_QUEUE runtime dependency;
3. lifecycle A-L parity is green against isolated temporary state root and production lifecycle remains disabled;
4. autostart/install parity is green in contract-only isolated mode without production HKCU mutation;
5. Control Panel/state-maintenance safety contracts are green and fail closed;
6. exact-main Tests, Integrity, Lifecycle, Autostart and RBT Tier A correlate to one exact target SHA;
7. RBT-009 is structurally qualified only through synthetic Tier A; Tier B 480 minutes was not run;
8. MIG-002 provenance remains 137/137 represented;
9. project-adapter.v1 and state-root.v1 remain authoritative;
10. no production/local-state/Brain/Work/latch/Owner STOP mutation occurred.

Canonical evidence: `01_DOCS/MAGASIN/08_AUTONOMY/MIG_004_SUPERVISOR_CI_LIFECYCLE_PARITY_EVIDENCE.md`.

MIG-005 is READY / OWNER-SAFE-GATE only. It is not started by MIG-004 closure.

## 8B. MIG-003 Definition of Done

Status: **MIG-003 DONE / MIG-004 READY / NOT STARTED**

MIG-003 is complete because:
1. generic platform runtime no longer embeds a Business OS PROJECT_STATE/TASK_QUEUE/CURRENT_STATE source/default;
2. one explicit `supervisor-project-adapter.v1` boundary validates bounded project orchestration input and fails closed when absent/invalid;
3. old Business OS repository identity is removed from generic defaults and project repository is explicit adapter/config input;
4. one `supervisor-state-root.v1` contract provides explicit override plus legacy-preserve compatibility without moving/resetting production state;
5. target workflows/scripts are root-native and no executable target path depends on `08_INTEGRATIONS/supervisor/**`;
6. generic tests are decoupled from Business OS global task IDs and `02_CORE/**`/night-run monorepo fixtures;
7. MAGASIN_LANE_DIRECTIVE_V1 serialization and exact-once/Owner STOP/lane isolation/scheduler/watchdog/privacy invariants are preserved;
8. hosted MIG-003 tests/integrity are green on PR head and exact target main;
9. self-hosted install/lifecycle/control-panel/state-maintenance/RBT jobs remain hard-disabled/inert;
10. MIG-002 provenance remains authoritative and all 137 mapped target paths remain represented;
11. no production/local-state/Brain/Work/latch/Owner STOP mutation occurred;
12. RBT-009 remains pending and no MIG-004 parity certification is claimed.

MIG-004 is READY / NOT STARTED. It may perform full new-repository CI/lifecycle parity validation only after a separate Work directive/release.

## 8A. MIG-002 Definition of Done

Status: **MIG-002 DONE / MIG-003 READY / NOT STARTED**

MIG-002 is complete because:
1. target repository exists and is root-native;
2. all 137 frozen map records are represented exactly once;
3. 90/90 MOVE records are byte-equivalent;
4. all 47 REWRITE records retain source-blob provenance;
5. extraction-only rewrites are bounded to bootstrap/root-path/workflow fail-closed needs;
6. platform architecture/protocol mirrors exist in the target while Business OS originals remain intact;
7. self-hosted production workflows in the target are inert/fail-closed;
8. exact-main hosted extraction-safe tests/static integrity are green;
9. no production/local-state/Brain/Work/Owner STOP mutation occurred;
10. RBT-009 remains pending and embedded source remains rollback material.

MIG-003 is the first task allowed to perform deep Business OS decoupling. It is READY / NOT STARTED and must not be auto-run by MIG-002.

## 8. MIG-001 Definition of Done

Status: **MIG-001 DONE / MIG-002 READY / NOT STARTED**

MIG-001 is complete only when Work returns evidence that:
1. baseline SHA and complete Supervisor file inventory are recorded;
2. every Supervisor-only workflow/script is classified MOVE / REWRITE / RETAIN / DEPRECATE;
3. all Business OS couplings are enumerated, especially hard-coded `08_INTEGRATIONS/supervisor/**` paths and reads of Business OS PROJECT_STATE;
4. target repository bootstrap tree and cutover/rollback contract are written;
5. no production lifecycle/install/start/stop mutation occurred;
6. no existing lane target/latch/local state was changed;
7. next task MIG-002 is dependency-correct and self-contained.

## 9. Five-Step gate

QUESTION -> DELETE -> SIMPLIFY -> ACCELERATE -> AUTOMATE

Migration itself must not add a second orchestration truth source, duplicate business logic or permanent compatibility complexity.

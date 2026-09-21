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

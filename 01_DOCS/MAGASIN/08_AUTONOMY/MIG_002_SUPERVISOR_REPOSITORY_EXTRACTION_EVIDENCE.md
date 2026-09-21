# MIG-002 — Supervisor Independent Repository Extraction Closure

Status: **DONE CANDIDATE / SOURCE PR-GATED**
Date: 2026-09-21
Task: `MIG-002 — Extract Supervisor Platform to Independent Repository`

## Frozen authority

- source repository: `magasincoffee/magasincoffee.github.io`
- source reopen merge: `10e004254f56078b7e517157f552cfaf5b49c80b`
- frozen baseline SHA: `4f76b929c5fedc44b451abd823f0f1f7fb3e50fe`
- frozen tree SHA: `b0947bac1847dd34cae2f14fdc46a3c70ee6de57`
- canonical map: `01_DOCS/MAGASIN/08_AUTONOMY/SUPERVISOR_MIGRATION_V1_FILE_MAP.json`
- frozen map count: **137 = 90 MOVE + 47 REWRITE**

The extraction baseline was not re-frozen and moving Business OS main was not substituted for the frozen authority.

## Target repository

- repository: `magasincoffee/magasin-supervisor`
- visibility: **PUBLIC**
- bootstrap main SHA: `815fc10bbc1814ed46f73b63391b9e67e29aa446`
- extraction PR #1 merge: `e67ae8101c391fc0a77b41ae6190bb615356be99`
- extraction-safe CI PR #2 merge: `07160cfab6943d647661f732590a0ce45e2f92a5`
- docs-only closure PR #3 merge: `64371bedc7b9c976047224152dba820c12a0674c`

Target evidence:
- `docs/MIG_002_EXTRACTION_EVIDENCE.md`
- `docs/MIG_002_PARITY_PROVENANCE.json`
- `docs/THREE_LANE_V1_ARCHITECTURE.md`
- `docs/MAGASIN_LANE_DIRECTIVE_V1_PROTOCOL.md`

Business OS originals remain unchanged and retained during the compatibility window.

## Parity / provenance

Final target-main readback at `64371bedc7b9c976047224152dba820c12a0674c` proves:

- represented: **137 / 137**
- missing: **0**
- duplicate target mappings: **0**
- MOVE: **90**
- MOVE byte-equivalent: **90 / 90**
- REWRITE: **47**
- REWRITE provenance retained: **47 / 47**
- extraction-only rewritten mapped files: **8**

Extraction-only mapped rewrites are:
1. `README.md`
2. `.github/workflows/supervisor-tests.yml`
3. `.github/workflows/supervisor-integrity.yml`
4. `.github/workflows/supervisor-autostart-install.yml`
5. `.github/workflows/supervisor-lifecycle-acceptance.yml`
6. `.github/workflows/supervisor-open-control-panel.yml`
7. `.github/workflows/supervisor-rbt009-soak.yml`
8. `.github/workflows/supervisor-state-maintenance.yml`

The changes are limited to root-native bootstrap, extraction-safe hosted CI and fail-closed self-hosted guards. Deep Business OS semantic decoupling is not part of MIG-002.

## Exact-main target checks

Target closure main: `64371bedc7b9c976047224152dba820c12a0674c`

- Supervisor Tests run `35627596398`, job `106425672907`: **SUCCESS**
- Supervisor Integrity run `35627596241`, static job `106425671953`: **SUCCESS**
- Supervisor Integrity runtime job `106425712109`: **SKIPPED / MIG-002 FAIL-CLOSED**

The prior implementation main `07160cfab6943d647661f732590a0ce45e2f92a5` also passed:
- Supervisor Tests run `35626662536`: **SUCCESS**, extraction-safe platform tests 184/184
- Supervisor Integrity run `35626662417`: **SUCCESS**, extraction-safe core 71/71
- lifecycle and RBT-009 production jobs: **SKIPPED**

The first target-main failures after PR #1 were retained as migration evidence because they exposed legacy monorepo/Business OS coupling. MIG-002 did not modify runtime/test semantics to force the full legacy suite green.

## Workflow safety

At target closure main:
- every `runs-on: self-hosted` production job has a hard `if: ${{ false }}` MIG-002 guard;
- target Supervisor Tests has no self-hosted job;
- target Integrity runtime-audit remains skipped;
- Autostart / Lifecycle / Control Panel / State Maintenance / RBT-009 production execution remains inert.

No target self-hosted production mutation authority was created.

## RBT continuity

Preserved:
- `RBT-001 -> RBT-008 = ACCEPTED`
- `RBT-009 = IMPLEMENTATION CANDIDATE / FINAL 8H SOAK PENDING`

MIG-002 creates no release credit for RBT-009.

## Safety conclusion

- production_cutover: **false**
- production_authority: **UNCHANGED_EXISTING_SUPERVISOR**
- embedded Supervisor source copy: **PRESERVED**
- Brain URL mutation: **NONE**
- Work URL mutation: **NONE**
- `lanes.json` mutation: **NONE**
- `lane-registry.json` mutation: **NONE**
- `lane-status.json` mutation: **NONE**
- latch reset: **NONE**
- Owner STOP clear: **NONE**
- local production state mutation: **NONE**
- second production authority: **NONE**

`ZERO_PRODUCTION_MUTATION=true`

## Exact MIG-003 scope

MIG-003 is **READY / NOT STARTED**. It must address the known decoupling boundary without cutover:

1. replace hard-coded Business OS `00_PROJECT_STATE.json` runtime dependencies with an explicit project adapter/input contract;
2. isolate/remove platform-core assumptions about Business OS `CURRENT_STATE / PROJECT_STATE / TASK_QUEUE`;
3. remove old source-repository identity defaults from platform defaults;
4. abstract the compatibility-sensitive local state root `%LOCALAPPDATA%\MAGASIN\BusinessOS\supervisor` without moving or mutating live state;
5. root-normalize remaining embedded `08_INTEGRATIONS/supervisor/**` assumptions retained in disabled production workflows;
6. separate generic platform tests from Business OS global task IDs / monorepo-only fixtures while preserving historical RBT evidence;
7. replace legacy monorepo-root assumptions such as Business OS `02_CORE/**`/night-run fixtures with explicit adapters or compatibility test boundaries;
8. prepare self-contained root-native CI/lifecycle semantics for MIG-004;
9. keep all production/self-hosted mutation workflows inert until later authorization;
10. preserve production authority, Owner STOP, targets, latches and local state.

MIG-003 must not perform production cutover; production cutover remains MIG-005.

## Handoff

After this source PR merges:
- MIG-002 = **DONE**
- MIG-003 = **READY / NOT STARTED**
- Work must **STOP** and return to Brain.

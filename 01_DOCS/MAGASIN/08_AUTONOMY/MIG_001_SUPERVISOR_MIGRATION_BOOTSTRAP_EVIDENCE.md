# MIG-001 — Supervisor Migration Bootstrap Evidence

Status: **DONE CANDIDATE / PR-GATED**  
Migration: `MAGASIN_SUPERVISOR_INDEPENDENT_REPOSITORY_V1`  
Task: `MIG-001 — Freeze Baseline + Migration Bootstrap`  
Date: 2026-09-21

## 1. Frozen source baseline

- Source repository: `magasincoffee/magasincoffee.github.io`
- Frozen migration baseline SHA: `4f76b929c5fedc44b451abd823f0f1f7fb3e50fe`
- Frozen baseline tree SHA: `b0947bac1847dd34cae2f14fdc46a3c70ee6de57`
- Migration release/bootstrap main that introduced the plan: `897a23c6d379d893e231b3b931b75d20e552117d`
- Target repository: `magasincoffee/magasin-supervisor`
- Production cutover during MIG-001: **NO**
- Installed runtime semantic changes during MIG-001: **NO**

The frozen baseline, not a later moving main, is the file-inventory authority for MIG-002 extraction. Later source changes require an explicit migration delta rather than silently changing the baseline.

## 2. Complete Supervisor inventory

Machine-readable authority:

`01_DOCS/MAGASIN/08_AUTONOMY/SUPERVISOR_MIGRATION_V1_FILE_MAP.json`

Frozen-baseline inventory:

| Group | Files | MIG-001 disposition |
|---|---:|---|
| `08_INTEGRATIONS/supervisor/src/**` | 44 | MOVE or REWRITE |
| `08_INTEGRATIONS/supervisor/test/**` | 61 | MOVE or REWRITE |
| `08_INTEGRATIONS/supervisor/windows/**` | 13 | MOVE or REWRITE |
| `08_INTEGRATIONS/supervisor/docs/**` | 3 | MOVE or REWRITE |
| embedded Supervisor root files | 2 | README REWRITE; package.json MOVE |
| `.github/workflows/supervisor-*.yml` | 8 | MOVE or REWRITE |
| `.github/scripts/supervisor-*` | 6 | MOVE or REWRITE |
| **Total migration-managed files** | **137** | **90 MOVE / 47 REWRITE** |

Business OS-owned canonical refs classified RETAIN: 5. MIG-001 classifies zero files DEPRECATE because deletion is not permitted before parity/cutover/rollback gates.

Every migration-managed record includes source path, baseline blob SHA, byte size, classification and target path. A file listed REWRITE is still frozen by its source blob SHA; MIG-001 does not perform its rewrite.

## 3. Target repository tree

Target bootstrap tree for `magasincoffee/magasin-supervisor`:

```text
magasin-supervisor/
├─ README.md
├─ package.json
├─ src/
│  ├─ decision.mjs
│  ├─ retry.mjs
│  ├─ state.mjs
│  ├─ runtime/**
│  └─ ui/**
├─ test/**
├─ windows/**
├─ docs/
│  ├─ ROBOT_BROWSER_SCHEDULER_OBSERVABILITY_ARCHITECTURE.md
│  ├─ ROBOT_LIFECYCLE_TRUTH_ARCHITECTURE.md
│  ├─ THREE_LANE_V1_RELEASE_EVIDENCE.md
│  ├─ THREE_LANE_V1_ARCHITECTURE.md
│  └─ MAGASIN_LANE_DIRECTIVE_V1_PROTOCOL.md
└─ .github/
   ├─ workflows/
   │  └─ supervisor-*.yml
   └─ scripts/
      └─ supervisor-*
```

Mapping rule:

- `08_INTEGRATIONS/supervisor/src/** -> src/**`
- `08_INTEGRATIONS/supervisor/test/** -> test/**`
- `08_INTEGRATIONS/supervisor/windows/** -> windows/**`
- `08_INTEGRATIONS/supervisor/docs/** -> docs/**`
- `08_INTEGRATIONS/supervisor/package.json -> package.json`
- `08_INTEGRATIONS/supervisor/README.md -> README.md`
- Supervisor workflows/scripts preserve their `.github/**` relative names.
- Business OS `00_SUPERVISOR_THREE_LANE_ARCHITECTURE.md` and `00_MAGASIN_LANE_DIRECTIVE_V1_PROTOCOL.md` remain project-owned and receive platform-oriented target mirrors during MIG-002/MIG-003; they are not deleted from Business OS.

## 4. Coupling inventory

### 4.1 Embedded source-root coupling

CI/release files hard-code `08_INTEGRATIONS/supervisor/**` and must be root-normalized in the independent repository.

Primary files:
- `.github/workflows/supervisor-autostart-install.yml`
- `.github/workflows/supervisor-integrity.yml`
- `.github/workflows/supervisor-lifecycle-acceptance.yml`
- `.github/workflows/supervisor-rbt009-soak.yml`
- `.github/workflows/supervisor-state-maintenance.yml`
- `.github/workflows/supervisor-tests.yml`
- `08_INTEGRATIONS/supervisor/README.md`
- scheduler/observability architecture docs.

### 4.2 Business OS PROJECT_STATE coupling

Direct runtime/source dependency surfaces:
- `src/runtime/brain-worker-cli.mjs` — hard-coded raw GitHub URL for Business OS `00_PROJECT_STATE.json`.
- `src/runtime/supervisor-loop-cli.mjs` — same remote PROJECT_STATE dependency.
- `src/runtime/dry-run-cli.mjs`
- `src/runtime/one-shot-cli.mjs`
- `src/runtime/retry-only-cli.mjs`
- `src/state.mjs`
- `windows/repair-supervisor.ps1`
- `windows/run-supervisor.ps1`
- `.github/workflows/supervisor-autostart-install.yml`
- `.github/workflows/supervisor-tests.yml`.

These are REWRITE surfaces. Independent platform correctness must not require Business OS PROJECT_STATE.

### 4.3 Business OS TASK_QUEUE / planning-prompt coupling

- `src/decision.mjs`
- `src/runtime/orchestration.mjs`
- `test/night-run.test.mjs`

Legacy prompt/test text assumes Business OS `CURRENT_STATE / PROJECT_STATE / TASK_QUEUE`. MIG-003 must replace this with an explicit project-adapter/input contract or isolate the legacy compatibility path.

### 4.4 Old repository identity coupling

Known references to `magasincoffee/magasincoffee.github.io`:
- `src/runtime/brain-worker-cli.mjs`
- `src/runtime/supervisor-loop-cli.mjs`
- `src/runtime/status.mjs`
- `windows/control-panel.ps1`
- `windows/repair-supervisor.ps1`
- `windows/run-supervisor.ps1`
- tests for legacy status/repository behavior.

These cannot remain platform defaults after MIG-003.

### 4.5 Local state root / branding coupling

The current production state root is intentionally embedded in many files:

`%LOCALAPPDATA%\MAGASIN\BusinessOS\supervisor`

Affected categories include:
- Three-Lane runtime/status and UI profile paths;
- install/start/stop/repair/lifecycle/control-panel scripts;
- autostart name `MAGASINBusinessOSAutostart`;
- soak/integrity/lifecycle workflows.

This is a **compatibility-sensitive coupling**, not permission to move local state during MIG-001/MIG-002. MIG-003 must make platform paths/configuration project-neutral while MIG-005 cutover must preserve the existing production state or migrate it atomically with checksum/fingerprint evidence. No blind local-state relocation is allowed.

### 4.6 Business OS historical task IDs / fixtures

Legacy tests/docs contain Business OS task IDs such as `TASK-002`, `TASK-029`, `TASK-035`, `TASK-048`, `TASK-049`, `TASK-060`.

Primary REWRITE test/docs surfaces include:
- `test/decision.test.mjs`
- `test/diagnostics.test.mjs`
- `test/loop.test.mjs`
- `test/message-capture-continuity.test.mjs`
- `test/night-run.test.mjs`
- `test/orchestration.test.mjs`
- `test/relay-clean-sweep-v44.test.mjs`
- `test/state.test.mjs`
- `test/status.test.mjs`
- `test/step.test.mjs`
- `test/three-lane.test.mjs`
- `test/vietnamese-timeout.test.mjs`
- lifecycle/scheduler architecture history.

Historical RBT task labels may remain release-history evidence, but generic platform tests must not require Business OS global task IDs for correctness.

## 5. MOVE / REWRITE / RETAIN / DEPRECATE policy

**MOVE** — safe to copy to mapped target path byte-equivalently in MIG-002.

**REWRITE** — copy provenance is frozen, but the target file must be adapted for independent-repository or project-neutral operation before parity/cutover. MIG-001 deliberately performs none of these implementation rewrites.

**RETAIN** — Business OS-owned truth remains in `magasincoffee.github.io`. It is not deleted during extraction.

**DEPRECATE** — zero files in MIG-001. Compatibility removal is deferred. Direct Business OS platform dependencies are candidates for semantic deprecation in MIG-003, while the embedded source copy itself remains rollback material until MIG-007.

## 6. Cutover contract — design only, not executed

MIG-005 is the first task allowed to change production authority.

Mandatory preconditions:
1. MIG-002 extraction complete with file-map parity evidence.
2. MIG-003 Business OS coupling removal/adapter contract complete.
3. MIG-004 target-repository CI, integrity and lifecycle parity green on an exact target SHA.
4. One physical device is explicitly designated `PRODUCTION_AUTHORITY`; all others are `DEV_TEST_ONLY`.
5. Existing Brain URLs, Work URLs/revisions, lane enabled states, registry task/latches, Owner STOP and target-health state are fingerprinted before cutover.
6. Rollback source SHA and installer source are pinned.

Cutover sequence:
1. Freeze new production mutations.
2. Stop the existing production mutation authority through its canonical lifecycle path; do not clear Owner STOP.
3. Prove old wrapper/Three-Lane mutation authority is not alive.
4. Install the exact independent-repository candidate without deleting local state.
5. Re-read and compare target/registry/latch fingerprints.
6. Start exactly one new production authority only through the explicit authorized lifecycle path.
7. Prove one wrapper/one Three-Lane authority, healthy Chrome/CDP, exact lane targets and no duplicate dispatch/relay.
8. Keep embedded source repository intact through the rollback window.

Any ambiguity fails closed to STOP/WAIT_OWNER. No two authorities may overlap.

## 7. Rollback contract — design only, not executed

Rollback is allowed only from a failed/aborted MIG-005+ cutover.

1. Stop the independent-repository production authority.
2. Verify it no longer holds mutation authority.
3. Reinstall the pinned embedded/previous-known-good runtime source.
4. Preserve current local `lanes.json`, `lane-registry.json`, `lane-status.json`, pending targets, quarantine/watchdog state and Owner STOP.
5. Do **not** restore an older JSON snapshot merely because rollback occurs; stale-state restoration requires separate corruption evidence and Owner authorization.
6. Verify target/latch fingerprints and exact-once markers before resuming.
7. Resume at most one authority.
8. Record rollback SHA/reason/metadata only; never commit private URLs, message bodies, screenshots, cookies, tokens or browser-profile data.

## 8. Two-device single-production-authority rule

Both physical devices may clone, build and run isolated synthetic/tests.

For the same production lane set:
- exactly one device may have production mutation authority;
- the second device must remain `DEV_TEST_ONLY`;
- it must not run production autostart/start/install actions against the live lane set;
- it must not send, reload, rollover, relay or mutate production Brain/Work conversations;
- promotion of the second device requires the first authority to be proven stopped first.

This rule prevents split-brain even when both repositories and both devices are technically healthy.

## 9. RBT-009 continuity

Migration carries forward without reinterpretation:

- `RBT-001 -> RBT-008 = ACCEPTED`
- `RBT-009 = IMPLEMENTATION CANDIDATE / FINAL 8H SOAK PENDING`

MIG-001 does not certify RBT-009. Final uninterrupted 8h evidence remains required on the exact independent-repository candidate after MIG-004 and cutover readiness.

## 10. Five-Step result

**QUESTION** — separate project/business truth from transport/orchestration truth without changing production behavior.

**DELETE** — no duplicate runtime, no duplicate business truth, no second production authority, no blind state copy/reset.

**SIMPLIFY** — one frozen manifest, one target tree, explicit REWRITE set, Business OS RETAIN boundary.

**ACCELERATE** — blob SHAs and deterministic mapping make MIG-002 mechanical and reviewable.

**AUTOMATE** — machine file map enables parity checks in later tasks; MIG-001 itself does not automate production cutover.

## 11. MIG-001 checks

Required PR checks:
- machine file map parses as JSON;
- frozen baseline/tree SHAs match Git history;
- managed inventory count = 137;
- group counts = 44 src / 61 test / 13 windows / 3 docs / 2 root / 8 workflows / 6 scripts;
- classification total remains complete;
- PR changes contain no `08_INTEGRATIONS/supervisor/src/**`, `test/**`, `windows/**` or production workflow/runtime implementation changes;
- existing Supervisor regression workflow remains green because `00_PROJECT_STATE.json` is updated through the PR;
- no production lifecycle/install/start/stop action is invoked by MIG-001.

## 12. MIG-002 exact next scope

MIG-002 is **READY but NOT STARTED** after this PR merges.

MIG-002 must do exactly this:
1. bootstrap `magasincoffee/magasin-supervisor` from the MIG-001 target tree;
2. import all 137 mapped files from frozen baseline `4f76b929...`, preserving provenance/blob-SHA mapping;
3. copy MOVE files byte-equivalently where target layout allows;
4. place REWRITE files at their target paths but change only extraction/bootstrap necessities; deep Business OS decoupling belongs to MIG-003;
5. create target mirrors for Three-Lane architecture and directive protocol while leaving Business OS originals intact;
6. keep every self-hosted/production mutation workflow inert for production during extraction; no install/start/stop/cutover;
7. add target-repository provenance/parity evidence proving every source-map record is represented exactly once;
8. do not delete or deprecate the embedded source copy;
9. do not alter production local state, Brain/Work URLs, registry/latches, Owner STOP or production authority;
10. stop after MIG-002 evidence. Do not self-start MIG-003.

## 13. Safety conclusion

`ZERO_PRODUCTION_MUTATION=true`

MIG-001 is documentation/inventory/source-of-truth preparation only. No production browser action, lifecycle mutation, install, start, stop, repair, target edit, registry edit or local-state reset is authorized or performed by this task.

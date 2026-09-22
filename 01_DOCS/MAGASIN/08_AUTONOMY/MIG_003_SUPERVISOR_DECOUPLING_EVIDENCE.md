# MIG-003 — Supervisor Business OS Decoupling Closure

Status: **DONE / CANONICAL**
Date: 2026-09-22
Task: `MIG-003 — Decouple Business OS-specific paths/state`

## 1. Exact implementation authority

- source Business OS repository: `magasincoffee/magasincoffee.github.io`
- target repository: `magasincoffee/magasin-supervisor`
- exact implementation base: `64371bedc7b9c976047224152dba820c12a0674c`
- canonical implementation PR: **#5**
- canonical implementation PR head: `f7fe79e22660c8a9fc0c1e3feecfcf90d282298a`
- implementation merge / exact target main: `aec7db9a715ceb41066af6636a4c91d34553eed5`
- docs-only target closure PR: **#6**
- target closure main: `7691bafd1571039be363d3edf760270756b5c7c6`
- superseded alternate PR #4: **CLOSED / NOT MERGED**

MIG-003 was implemented from the exact MIG-002 closure base required by the Owner directive.

## 2. Five-Step result

**QUESTION** — Business/project truth is not platform truth. Supervisor only needs bounded orchestration inputs and compatibility-safe platform state.

**DELETE** — removed direct Business OS PROJECT_STATE/TASK_QUEUE/CURRENT_STATE defaults, old repository defaults, embedded monorepo path assumptions and Business OS-only generic fixtures from executable platform defaults.

**SIMPLIFY** — one explicit project adapter boundary and one state-root contract.

**ACCELERATE** — root-native reusable helpers/tests and hosted decoupling checks.

**AUTOMATE** — only hosted/non-production-safe checks. Self-hosted production mutation jobs remain inert.

## 3. Project adapter contract

Canonical target files:
- `src/project-adapter.mjs`
- `docs/PROJECT_ADAPTER_V1.md`
- `test/project-adapter.test.mjs`

Schema:

`supervisor-project-adapter.v1`

Explicit source only:
- `SUPERVISOR_PROJECT_ADAPTER_PATH` / `--project-adapter`
- `SUPERVISOR_PROJECT_ADAPTER_URL` / `--project-adapter-url`
- legacy `--state-url` remains only as an explicit URL compatibility alias.

There is no embedded Business OS PROJECT_STATE URL/path default.

If no adapter source is configured, the runtime fails closed. Project/business policy remains project-owned and may enter Supervisor only as bounded validated adapter fields/instructions.

## 4. State-root contract

Canonical target files:
- `src/state-root.mjs`
- `windows/state-root.ps1`
- `docs/STATE_ROOT_V1.md`
- `test/state-root.test.mjs`

Schema:

`supervisor-state-root.v1`

Resolution:
1. explicit `SUPERVISOR_STATE_ROOT`;
2. `legacy-preserve` compatibility;
3. `platform-default` only when explicitly selected.

MIG-003 did not move, rename, copy, reset or initialize production state.

The legacy production path remains preservable through the explicit compatibility strategy for later MIG-005 cutover planning.

## 5. Coupling before → after matrix

| Coupling | Before | After | Status |
|---|---|---|---|
| Project-state runtime | hard-coded Business OS PROJECT_STATE URL/path | explicit `supervisor-project-adapter.v1` PATH/URL input; missing/invalid input fails closed | CLOSED |
| Project-policy prompts | platform assumed CURRENT_STATE / PROJECT_STATE / TASK_QUEUE | bounded adapter-owned instructions + project-neutral fallback | CLOSED |
| Repository identity | `magasincoffee/magasincoffee.github.io` generic default | explicit adapter/config repository identity; no generic fallback | CLOSED |
| Local state root | repeated Business OS path literals | shared state-root contract + legacy-preserve compatibility | CLOSED_WITH_COMPATIBILITY |
| Embedded repo root | `08_INTEGRATIONS/supervisor/**` target paths | root-native target repository paths | CLOSED |
| Business task fixtures | TASK-029/035/048/049/060 executable generic fixtures | synthetic `WORK-*` generic fixtures; historical docs remain historical only | CLOSED |
| Monorepo night-run | `02_CORE/**`, Business OS registry/cursor/workflow fixtures | synthetic project-neutral registry/cursor fixtures and compatibility aliases | CLOSED |
| Hosted CI | MIG-002 extraction subset | MIG-003 adapter/state-root/project-neutral hosted contract/static gates | READY_FOR_MIG_004_FULL_PARITY |

Machine-readable target closure:

`docs/MIG_003_COUPLING_CLOSURE.json`

Target evidence:

`docs/MIG_003_DECOUPLING_EVIDENCE.md`

## 6. Semantic change statement

MIG-003 intentionally changes configuration plumbing only:

- project-state source becomes an explicit validated adapter;
- state-root resolution becomes configurable with legacy-preserve compatibility.

MIG-003 does not intentionally change:

- MAGASIN_LANE_DIRECTIVE_V1 serialization;
- exact-once dispatch/relay;
- Owner STOP authority;
- lane isolation;
- browser scheduler/page budget;
- watchdog/recovery semantics;
- privacy metadata-only rules.

## 7. MIG-002 provenance preservation

Frozen MIG-002 provenance remains authoritative.

At MIG-003:
- managed mapped records: **137**
- represented mapped paths: **137 / 137**
- missing mapped paths: **0**
- mapped coupling surfaces intentionally rewritten: **34**
- frozen MIG-002 source/blob provenance: **PRESERVED / NOT RE-FROZEN**

## 8. Hosted test evidence

### PR-head

- Supervisor Tests run `35645284638`, job `106484118473`: **SUCCESS**
- Supervisor Integrity run `35645284699`, static job `106484151783`: **SUCCESS**
- Supervisor Integrity runtime job `106484202256`: **SKIPPED / FAIL-CLOSED**

### Exact implementation main `aec7db9a715ceb41066af6636a4c91d34553eed5`

Supervisor Tests:
- run `35645394216`
- job `106484492607`
- result: **SUCCESS**
- MIG-003 contract tests: **50 / 50 PASS**
- platform safety/core regressions: **184 / 184 PASS**
- StrictMode A→O: **PASS**
- `MIG_003_PROJECT_ADAPTER_TESTS=True`
- `MIG_003_STATE_ROOT_COMPATIBILITY_TESTS=True`
- `MIG_003_PLATFORM_CORE_REGRESSION=True`
- `SELF_HOSTED_PRODUCTION_WORKFLOWS_INERT=True`
- `ZERO_PRODUCTION_MUTATION=True`

Supervisor Integrity:
- run `35645394250`
- static job `106484492995`: **SUCCESS**
- static/decoupling tests: **82 / 82 PASS**
- runtime job `106484547597`: **SKIPPED / FAIL-CLOSED**
- `MIG_003_PROJECT_ADAPTER_BOUNDARY=True`
- `MIG_003_STATE_ROOT_COMPATIBILITY=True`
- `MIG_003_ROOT_NATIVE_STATIC=True`
- `MIG_003_SELF_HOSTED_FAIL_CLOSED=True`
- `ZERO_PRODUCTION_MUTATION=True`

### Final target docs closure main `7691bafd1571039be363d3edf760270756b5c7c6`

- Supervisor Tests run `35671405631`, job `106568460171`: **SUCCESS**
- Supervisor Integrity run `35671405652`, static job `106568459169`: **SUCCESS**
- Supervisor Integrity runtime job `106568557765`: **SKIPPED / FAIL-CLOSED**

## 9. Production/self-hosted fail-closed evidence

Exact implementation main:
- Lifecycle run `35645394192`, job `106484493476`: **SKIPPED**
- Autostart Install run `35645394217`, jobs `106484493870` / `106484494405`: **SKIPPED**
- Open Control Panel run `35645394277`, job `106484493015`: **SKIPPED**
- RBT-009 run `35645394259`, Tier A / preflight / Tier B jobs `106484513033` / `106484519081` / `106484521238`: **SKIPPED**
- Integrity runtime audit: **SKIPPED**
- State Maintenance remains manual-only and hard-disabled for MIG-003 production mutation.

No target self-hosted production mutation authority was enabled.

## 10. Negative coupling verification

Exact target main search found no generic-platform matches for:
- `magasincoffee/magasincoffee.github.io`
- `00_PROJECT_STATE.json`
- `TASK_QUEUE`
- `CURRENT_STATE`
- `08_INTEGRATIONS/supervisor`
- `02_CORE/`
- executable generic fixtures `TASK-029`, `TASK-035`, `TASK-048`, `TASK-049`, `TASK-060`

The Business OS state-root literal is retained only inside the explicit `legacy-preserve` compatibility resolver/documentation boundary.

## 11. RBT continuity

Preserved exactly:
- `RBT-001 -> RBT-008 = ACCEPTED`
- `RBT-009 = IMPLEMENTATION CANDIDATE / FINAL 8H SOAK PENDING`

MIG-003 does not grant RBT-009 release credit.

## 12. Safety conclusion

- production_cutover: **false**
- production_authority: **UNCHANGED_EXISTING_SUPERVISOR**
- embedded Business OS Supervisor remains sole production authority / rollback source
- production install/start/stop/repair/cutover: **NOT PERFORMED**
- Brain URL mutation: **NONE**
- Work URL mutation: **NONE**
- `lanes.json` mutation: **NONE**
- `lane-registry.json` mutation: **NONE**
- `lane-status.json` mutation: **NONE**
- `lane-events` mutation: **NONE**
- latch reset: **NONE**
- Owner STOP clear: **NONE**
- local-state move/reset: **NONE**
- second production mutation authority: **NONE**
- private operational data committed: **NONE**

`ZERO_PRODUCTION_MUTATION=true`

## 13. Remaining MIG-004 scope

MIG-004 is **READY / NOT STARTED** only after this Business OS closure PR merges.

Deferred intentionally:
1. full new-repository CI parity across the complete legacy acceptance surface;
2. full lifecycle/release workflow validation under a separate MIG-004 directive;
3. deciding which self-hosted release workflows may transition from hard-disabled to validated parity gates;
4. full exact-candidate integrity/lifecycle parity;
5. no production cutover — remains MIG-005;
6. no final RBT-009 8h qualification — remains MIG-006.

MIG-003 does not claim MIG-004 PASS.

## 14. Handoff

After the source closure PR merges:
- MIG-003 = **DONE**
- MIG-004 = **READY / NOT STARTED**

Work must **STOP**. MIG-004 must not self-start.


## 15. Business OS source closure provenance

- source closure PR: #242
- source closure PR head: `011c448ee48c908658459fe9d5ae2d1a67e90c3a`
- source closure merge SHA: `1e653fac91eaa6b948a96a0b3195bdaa72ac332b`
- PR-head Supervisor Tests run: `35671588010`, job `106569037360`: **SUCCESS**
- post-merge Supervisor Tests run: `35671671797`, job `106569295148`: **SUCCESS**
- post-merge full Supervisor suite: **551 / 551 PASS, 0 FAIL**
- state-maintenance version/read-only/optional-latch/fail-closed/target-preservation/privacy gates: **PASS**

Canonical Business OS source-of-truth now records:
- `MIG-003 = DONE`
- `MIG-004 = READY / NOT STARTED`

No MIG-004 implementation was started by MIG-003 closure.

# MAGASIN Supervisor Three-Lane V1 — TASK-RBT-009 Release Evidence

Status: **PENDING FINAL CONTINUOUS 8H PRODUCTION SOAK**

This document is the canonical closure record for TASK-RBT-009. It must not state `RELEASED` until the exact implementation runtime SHA completes the final uninterrupted eight-hour read-only production soak and the docs-only closure PR is merged.

## Baseline

- Pre-RBT-009 main SHA: `29d38fd1622c63caae900b33b8f2a5aad1447ccc`.
- Installed runtime contract: `v2026-09-20.60`.
- Runtime version is intentionally unchanged by the RBT-009 implementation framework because the implementation adds release tests, workflow orchestration, privacy-safe validation and soak monitoring without changing installed Supervisor runtime behavior.
- TASK-RBT-001/001A/002/002A/002B/002C/003/004/005/005A/006/006A/006B/007/008 are the accepted canonical baseline.
- TASK-RBT-009 is the final roadmap task. No TASK-RBT-010 is created.

## Release model

RBT-009 uses two evidence tiers.

### Tier A — deterministic synthetic integration

The workflow reuses the released RBT-003→008 fixtures and adds a cross-cutting integration matrix plus an offline lane-event validator. It runs without Owner production Brain/Work URLs and covers:

- one, two and three enabled lanes;
- bounded round-robin fairness and no starvation;
- page budget `<=3` and mutation singleton;
- active >30m no false reload;
- inactive >30m STALL_CHECK plus maximum one reload per recovery epoch and restart dedupe;
- Owner Work hot-save and safe-boundary application;
- relay retry exhaustion and Owner-authorized rearm;
- multi-signal Work-full rollover, crash-stage recovery and exact-once dispatch;
- stale/missing target quarantine including 100 subsequent turns with zero reopen;
- legacy and v60 Brain planning ACCEPT/REJECT paths;
- Control Panel privacy/observability regression;
- rollback/install source guard preserving local lane/registry/Owner-stop state files;
- offline exact-once and event-order validation without message bodies.

### Tier B — installed production read-only soak

`Supervisor Release Soak` runs on the self-hosted Windows host only after same-SHA normal release gates are green. The production monitor:

- runs continuously for `28800` seconds with a bounded 120-second sampling cadence;
- never sends a composer message, reloads/navigates a ChatGPT page, changes a lane target, rearms a relay or triggers rollover;
- never clears `STOP` or `AUTOSTART_DISABLED`;
- fails closed if Owner STOP is active or becomes active;
- reads only local process/status/config/event truth;
- hashes target identities instead of exporting URLs;
- verifies wrapper/Three-Lane/Robot-Chrome singleton process truth, CDP health, scheduler page budget and mutation lease bounds;
- validates exact-once dispatch/relay correlations and event transition order offline;
- detects repeated ERROR/RECOVERY flood;
- fails if production Brain/Work target fingerprint changes during the soak and never reverts Owner changes;
- uploads only sanitized metadata from runner temporary storage, never raw lane-events, screenshots, URLs, message text, tokens or local profile paths.

An interrupted self-hosted job does not count as a partial pass. The eight-hour window must restart from zero.

## Implementation evidence — to be filled after implementation PR merge

- Implementation PR: `PENDING`.
- Implementation head SHA: `PENDING`.
- Implementation merge/runtime SHA: `PENDING`.
- Runtime before/after: `v2026-09-20.60 → v2026-09-20.60` unless a correction changes runtime behavior.
- Supervisor Tests run/job: `PENDING`.
- Supervisor Integrity static/runtime run/jobs: `PENDING`.
- Supervisor Autostart Install + verify-survival run/jobs: `PENDING`.
- Supervisor Lifecycle Acceptance A→L run/job: `PENDING`.
- Tier A synthetic integration run/job: `PENDING`.

## Final 8h production soak — mandatory closure fields

These fields remain `PENDING` until one uninterrupted successful production soak finishes:

- Soak workflow run ID: `PENDING`.
- Production soak job ID: `PENDING`.
- Soak start UTC: `PENDING`.
- Soak end UTC: `PENDING`.
- Continuous duration seconds: `PENDING`.
- Exact soaked runtime SHA/version: `PENDING`.
- Maximum resident ChatGPT pages: `PENDING`.
- Maximum active mutation lease count: `PENDING`.
- Chrome/CDP bounded recovery count: `PENDING`.
- Confirmed dispatch count / duplicate count: `PENDING`.
- Confirmed relay count / duplicate count: `PENDING`.
- Event-order validation: `PENDING`.
- Timeline/artifact privacy scan: `PENDING`.
- Production target fingerprint unchanged: `PENDING`.
- Monitor browser mutation count: must equal `0`.

Required final markers include the semantics of:

`SOAK_CONTINUOUS_DURATION_8H=True`, `SOAK_1_LANE=True`, `SOAK_2_LANE=True`, `SOAK_3_LANE=True`, `SOAK_PAGE_BUDGET_MAX_3=True`, `SOAK_MUTATION_SINGLETON=True`, `SOAK_NO_STARVATION=True`, `SOAK_ACTIVE_30M_NO_FALSE_RELOAD=True`, `SOAK_INACTIVE_30M_ONE_RELOAD_PER_EPOCH=True`, `SOAK_NO_DUPLICATE_DISPATCH=True`, `SOAK_NO_DUPLICATE_RELAY=True`, `SOAK_FULL_ROLLOVER=True`, `SOAK_HOT_SWAP_PRESERVED=True`, `SOAK_STALE_TARGET_ZERO_REOPEN=True`, `SOAK_BRAIN_PLANNING=True`, `SOAK_LIFECYCLE_A_TO_L=True`, `SOAK_OWNER_STOP_AUTHORITATIVE=True`, `SOAK_CHROME_CDP_HEALTH=True`, `SOAK_TIMELINE_PRIVACY_SAFE=True`, `SOAK_ARTIFACT_PRIVACY_SAFE=True`, `SOAK_PRODUCTION_TARGETS_UNCHANGED=True`, and `SOAK_MONITOR_ZERO_BROWSER_MUTATION=True`.

## Cleanup decision

Initial audit classifies the released RBT-003→008 acceptance fixtures, v59 handshake compatibility, pre-v60 active-dispatch migration logic, quarantine state, exact-once latches, lifecycle acceptance and Control Panel observability fixtures as **permanent regression assets**, not temporary instrumentation. They must not be deleted merely because RBT-009 is the cleanup task.

No production instrumentation is deleted in the implementation phase unless a specific artifact is proven redundant and a regression test demonstrates no semantic loss. Prefer no cleanup over unsafe cleanup.

## Closure rule

Only a docs/evidence closure PR may change this status to **RELEASED** after the final eight-hour production soak is green. If runtime or workflow behavior changes after the successful soak, the eight-hour soak must restart from zero against the new exact SHA.

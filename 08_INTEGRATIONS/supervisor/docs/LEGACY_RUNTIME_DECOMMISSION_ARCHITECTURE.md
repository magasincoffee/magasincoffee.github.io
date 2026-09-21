# MAGASIN Supervisor — Legacy Runtime Decommission Architecture

Status: **LOCKED DESIGN / POST-RBT-009 RELEASE CLOSURE GATE**

Owner decision: after Three-Lane V1 completes the final RBT-009 production soak, MAGASIN will audit and progressively decommission legacy runtime paths so production has one unambiguous orchestration path.

This document is architecture only. It must not change the active RBT-009 soaked candidate, installed runtime semantics, Owner Brain/Work targets, lane registry truth, or Owner STOP state.

## 1. Current truth

The active production architecture is **Three-Lane V1**.

Canonical production path:

```text
Control Panel
  -> start-supervisor.ps1
  -> run-supervisor.ps1
  -> THREE_LANE_V1
  -> src/runtime/three-lane-cli.mjs
  -> Browser Scheduler
  -> Brain / Work execution
```

Current source still contains compatibility runtime paths, including at least:

- `src/runtime/brain-worker-cli.mjs`
- `src/runtime/supervisor-loop-cli.mjs`
- compatibility/runtime modules used by older orchestration generations.

`run-supervisor.ps1` can still select legacy modes from previously persisted authoritative state. These paths are **not the current Three-Lane production path**, but they remain present for compatibility/recovery until proven safe to remove.

## 2. Locked end-state

The desired final production architecture is exactly one orchestration path:

```text
Control Panel
  -> explicit lifecycle scripts
  -> run-supervisor.ps1
  -> Three-Lane V1 only
  -> scheduler / lane runtime / Brain / Work
```

No legacy orchestration entry point may be selected accidentally after decommission is complete.

The following invariants remain mandatory:

- PROCESS TRUTH > LANE TRUTH > PERSISTED RECOVERY STATE.
- Owner STOP / AUTOSTART_DISABLED remain authoritative.
- Brain target is Owner-selected and never auto-discovered or auto-created.
- Work target follows existing OWNER/AUTO authority and exact-once contracts.
- Browser page budget, mutation singleton, watchdog, stale-target quarantine, relay recovery, Work-full rollover, planning verdicts, and timeline observability remain unchanged unless separately approved.
- No decommission step may clear task, dispatch, relay, pending Work, target-health/quarantine, or Owner target revision state merely to simplify migration.

## 3. Mandatory classification before deletion

Every legacy runtime file/path must be classified into exactly one category:

### ACTIVE

Used by the current Three-Lane production path or by a currently required release/lifecycle function.

Action: **KEEP**.

### REQUIRED_COMPATIBILITY

Not part of normal Three-Lane execution, but still required to safely read, migrate, recover, validate, or preserve an installed/persisted state from an older runtime generation.

Action: **KEEP until a proven migration boundary exists**.

### SAFE_TO_DELETE

Not reachable by the current runtime, not referenced by installer/lifecycle/repair/acceptance code, not required to interpret persisted local state, and not needed by supported rollback or migration contracts.

Action: **DELETE only after regression evidence**.

No file may be deleted based only on age, naming, version number, or apparent duplication.

## 4. Legacy Runtime Decommission Audit

After RBT-009 soak and release closure, perform one dedicated audit before any deletion.

Audit scope must include:

- `run-supervisor.ps1` mode selection;
- `brain-worker-cli.mjs`;
- `supervisor-loop-cli.mjs`;
- older runtime helpers such as loop/night-run/step/session/orchestration modules where applicable;
- installer, repair, autostart, lifecycle, integrity, State Maintenance, and Control Panel references;
- persisted local files that may still encode an older orchestration mode;
- rollback/recovery contracts;
- tests and acceptance fixtures that intentionally exercise legacy migration.

Required output is a machine-readable inventory with at least:

```text
path
classification = ACTIVE | REQUIRED_COMPATIBILITY | SAFE_TO_DELETE
reachable_from_production = true | false
persisted_state_dependency = true | false
installer_or_repair_dependency = true | false
rollback_dependency = true | false
evidence
proposed_action
```

## 5. Decommission gate

A legacy path is removable only when all of the following are true:

1. Three-Lane V1 is RELEASED after successful RBT-009 Tier B soak and docs closure.
2. No supported installed state requires the legacy path for recovery.
3. No installer/repair/autostart/lifecycle/integrity workflow references it.
4. No Control Panel action can select or invoke it.
5. No production project-state mode can legitimately request it.
6. Migration from any still-supported persisted legacy mode is explicit and tested.
7. Rollback does not require the path.
8. Full Supervisor regression is green after removal.
9. Lifecycle A-L, Integrity, Autostart + survival, and installed acceptance remain green.
10. Owner Brain/Work target fingerprints and lane task/latch/quarantine truth remain unchanged by the removal.

If any condition is unproven, classify the path as REQUIRED_COMPATIBILITY rather than SAFE_TO_DELETE.

## 6. run-supervisor.ps1 target state

Current mode switching must remain untouched until the audit proves legacy decommission safety.

Target after verified decommission:

```text
authoritative project/local mode -> THREE_LANE_V1 only
unknown/unsupported legacy mode -> fail closed with explicit migration/Owner guidance
never silently fall back to supervisor-loop-cli.mjs
never silently select brain-worker-cli.mjs
```

The final implementation should remove accidental legacy selection, not replace it with guessing.

## 7. Migration before deletion

If real installed state is found with an older supported mode:

1. snapshot safe local recovery metadata;
2. identify exact Brain/Work targets without exporting URLs to logs;
3. preserve Owner STOP;
4. migrate only the orchestration-mode metadata needed for Three-Lane V1;
5. preserve task/latch/result/pending/quarantine truth when semantically compatible;
6. fail closed when compatibility cannot be proven;
7. require Owner intervention instead of destructive reset for ambiguous active state.

Migration is preferred over keeping an old executable path forever, but only after deterministic tests.

## 8. Required tests for decommission work

Before deleting the first legacy path, add tests proving:

- Three-Lane V1 is the sole normal production entry point.
- Unknown/legacy unsupported mode fails closed.
- No hidden fallback invokes legacy entry points.
- Existing supported legacy persisted state either migrates deterministically or stops with explicit guidance.
- Owner STOP is preserved.
- Brain/Work targets are unchanged.
- No duplicate wrapper, Three-Lane, or Chrome process appears.
- Exact-once dispatch and relay remain intact.
- Work hot-swap, watchdog, relay rearm, Work-full rollover, stale-target quarantine, planning verdicts, timeline, and scheduler regressions remain green.
- Full release gates pass after cleanup.

## 9. Cleanup sequencing

Use the Elon Musk 5-step method continuously:

1. **QUESTION** — prove why each legacy path exists.
2. **DELETE** — remove only paths classified SAFE_TO_DELETE.
3. **SIMPLIFY** — reduce mode selection to one Three-Lane production path.
4. **ACCELERATE** — reduce recovery ambiguity and startup branching.
5. **AUTOMATE** — add CI/static guards preventing reintroduction of hidden legacy runtime fallbacks.

Recommended sequence:

```text
RBT-009 soak PASS
-> docs-only release closure
-> Legacy Runtime Decommission Audit
-> classify every legacy path
-> migrate supported persisted legacy state if required
-> delete SAFE_TO_DELETE paths
-> simplify run-supervisor mode selection
-> full release acceptance
-> mark legacy decommission complete
```

## 10. Release interaction

This architecture is intentionally documented while RBT-009 Tier B is still running.

Therefore:

- do not merge runtime-affecting cleanup into the active soak candidate;
- do not change the soaked candidate SHA during the 8-hour acceptance window;
- this document may live in an unmerged docs branch/PR until RBT-009 release closure;
- any runtime cleanup after the soak is a separate post-release decommission change and must receive its own acceptance evidence.

## 11. Definition of Done

Legacy Runtime Decommission is complete only when:

- production has one intentional Three-Lane V1 runtime path;
- no compatibility entry point can be selected accidentally;
- every removed module was proven SAFE_TO_DELETE;
- remaining compatibility code is explicitly documented and justified;
- no Owner targets or task/latch/quarantine truth were lost;
- release gates are green after cleanup;
- architecture and README describe the actual runtime without stale legacy fallback ambiguity.

Until then, the correct statement is:

**Three-Lane V1 is the sole active production architecture, while selected legacy modules remain as explicit compatibility assets pending audited decommission.**

# MAGASIN — Current State

Last updated: 2026-09-18

## Current program

**MAGASIN Business OS V1 — Five-Step / Schedule-first execution**

The Enterprise Source-of-Truth discipline remains mandatory. The delivery order is no longer module-first/top-down. Work now follows the highest-value operating loop and must pass the Five-Step gate before implementation.

## Current phase

**P1 — Schedule-first Core Flow**

The active critical path is weekly workforce scheduling: employee availability → manager review/allocation → robot proposal → publish → employee execution/attendance/swap/notification. Discovery is limited to evidence needed to complete that loop safely.

## Current task

**TASK-045 — Restart/resume simulation — IN_PROGRESS / AUTO_CONTINUE**

Canonical task/state files:

- `00_BUSINESS_OS_BLUEPRINT.md`
- `00_PROJECT_STATE.json`
- `00_TASK_QUEUE.md`
- `00_SUPERVISOR_ROBOT.md`
- `00_SUPERVISOR_HANDOFF_ARCHITECTURE.md`
- `00_ARCHITECTURE_5_STEP_RESET.md`
- `05_SYSTEM/SCHEDULE_FIRST_CANONICAL_FLOW_V1.md`
- `05_SYSTEM/EMPLOYEE_AVAILABILITY_CANONICAL_SLICE_V1.md`
- `05_SYSTEM/MANAGER_SCHEDULE_CANONICAL_SLICE_V1.md`
- `05_SYSTEM/PUBLISHED_SCHEDULE_FEEDBACK_LOOP_V1.md`
- `05_SYSTEM/GIVE_SHIFT_PRODUCTION_V1.md`
- `05_SYSTEM/NOTIFICATION_OUTBOX_PRODUCTION_V1.md`
- `05_SYSTEM/MAGASIN_EMAIL_ADAPTER_CONFIG_V1.md`
- `05_SYSTEM/SCHEDULE_FIRST_CLOSURE_REGRESSION_V1.md`

## Current target

Prove one operational weekly schedule end to end before expanding non-critical modules:

1. employee availability;
2. manager review/edit/allocation;
3. robot schedule proposal within approved rules;
4. manager publish;
5. employee sees and executes the published schedule;
6. attendance / give-shift / swap / affected-person notification close the loop.

## Active scope

**Primary:** People / Shift weekly scheduling critical path.

**Supporting only when required by that path:** shared data/contracts, auth, notifications, audit/recovery, Supervisor Robot.

**Deferred:** SOP/Task write automation (TASK-026 decision pack preserved), broad dashboard expansion, payroll/KPI/recruitment expansion, speculative production schema cleanup, cosmetic architecture refactors.

## Working method

Every requirement:

```text
QUESTION → DELETE → SIMPLIFY → ACCELERATE → AUTOMATE
```

Every implementation micro-task:

```text
Estimate → Implement → Unit → Fix → Regression → Integration → E2E → Docs/State → Commit → Next
```

Normal implementation task target: <= ~20 minutes active work. Split larger tasks.

## Safety

This repository is PUBLIC.

Never commit secrets, credentials, cookies, tokens, browser profiles, private employee/customer/financial records, production exports or private generated media.

Production/private data remains outside Git with appropriate access controls.

## Supervisor status

Supervisor Robot V1 is implemented and verified:

- real installed Chrome with local authenticated profile;
- privacy-safe UI observation;
- bounded Continue / safe Retry executor;
- reconnect/retry policy;
- anti-duplicate continuation loop;
- unified `MAGASIN BUSINESS OS CONTROL` desktop panel with START ROBOT / STOP;
- privacy-safe runtime status for current task, next task, ChatGPT UI state/action, update time and errors;
- background START mode so normal use does not require a separate PowerShell window;
- persistent local runtime;
- conversation-aware handoff: observe the active supervised chat before first continuation;
- shared Owner/Robot ChatGPT browser profile opened by the Control Panel;
- local-only target/profile/logs;
- fail-closed gates for BLOCKED/auth/MFA/CAPTCHA/destructive/admin/ambiguous states;
- WAIT_USER owner-boundary observer: may only reconcile an explicit live Owner decision back into repository state, never invent or bypass the decision.

Owner does not need to sit at the computer and repeatedly ask ChatGPT to continue. Normal operation is: open `MAGASIN BUSINESS OS CONTROL` → START ROBOT → return only when the panel/state reaches `WAIT_USER` or another real Owner boundary. The Supervisor may continue only while `AUTO_CONTINUE` is allowed.

## Next action

**AUTO_CONTINUE — TASK-045:** TASK-044 portfolio-aware diagnostics is verified on draft PR #119.

Verified TASK-044 evidence:

- diagnostics implementation commit `a4a1dc1293b29c793f0cb88bb44fc67aa0b53cb8`;
- privacy regression test commit `0aa727303482ee6552f143e0abec722d65e6103c`;
- bounded handoff regression fix `b0758f72b9592e229e0c4c5969fa683048cdfd91`;
- Supervisor Tests run `35371446531`: PASS;
- diagnostics persist project/task/checkpoint context without conversation/request content;
- raw error messages are not persisted; only safe error metadata remains;
- existing incident classification and no-browser/live-side-effect guard remain green.

TASK-045 must simulate restart/resume without requiring an actual destructive reboot:

1. active lease prevents a second worker from taking over;
2. expired lease stays fail-closed until HEAD and CI are reconciled;
3. verified stale lease is cleared before resume;
4. completed operation keys prevent duplicate side effects after restart;
5. canonical task advancement discards stale cursor work;
6. project handoff checkpoint remains project-local across restart;
7. Owner STOP / WAIT_USER / BLOCKED boundaries remain fail-closed;
8. simulation performs no browser mutation, live provider action, or production write.

Reuse existing recovery/lease/handoff primitives; do not create another recovery subsystem.

## Session handoff

New chat must read:

1. `00_CURRENT_STATE.md`
2. `00_PROJECT_STATE.json`
3. `00_TASK_QUEUE.md`
4. `00_MASTER_PLAN.md`
5. `00_BUSINESS_OS_BLUEPRINT.md`
6. `06_DECISION_LOG.md`
7. `07_CHANGE_LOG.md`
8. current domain/task docs
9. repository/PR/CI state

Repository evidence overrides stale chat memory.


## Approved night run

Owner approved `NIGHT_RUN_2026-09-18` for the window `2026-09-18 23:15 +07 → 2026-09-19 09:15 +07`.

Execution scope is restricted to:

- `magasincoffee/magasincoffee.github.io`;
- `magasincoffee/magasin-media-robot`.

Windows reboot/logon recovery is installed and verified on the self-hosted machine:

- HKCU logon autostart registered;
- canonical GitHub Runner verified online;
- Supervisor verified online;
- Owner STOP latch is clear;
- Windows login/PIN is never bypassed.

The GitHub-hosted hard-stop guard will set the project to `WAIT_USER / NIGHT_WINDOW_COMPLETE` at 09:15 +07 even if the PC is offline.

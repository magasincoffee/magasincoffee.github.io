# MAGASIN — Current State

Last updated: 2026-09-18

## Current program

**MAGASIN Business OS V1 — Five-Step / Schedule-first execution**

The Enterprise Source-of-Truth discipline remains mandatory. The delivery order is no longer module-first/top-down. Work now follows the highest-value operating loop and must pass the Five-Step gate before implementation.

## Current phase

**P1 — Schedule-first Core Flow**

The active critical path is weekly workforce scheduling: employee availability → manager review/allocation → robot proposal → publish → employee execution/attendance/swap/notification. Discovery is limited to evidence needed to complete that loop safely.

## Current task

**TASK-032 — Published schedule → attendance/swap/notification integration gate — WAIT_USER**

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
- stop gates for WAIT_USER/BLOCKED/auth/MFA/CAPTCHA/destructive/admin/ambiguous states.

Owner does not need to sit at the computer and repeatedly ask ChatGPT to continue. Normal operation is: open `MAGASIN BUSINESS OS CONTROL` → START ROBOT → return only when the panel/state reaches `WAIT_USER` or another real Owner boundary. The Supervisor may continue only while `AUTO_CONTINUE` is allowed.

## Next action

**WAIT_USER:** safe core của TASK-032 đã verified.

Đã hoàn tất và regression xanh:

- Employee xem lịch APPROVED;
- attendance gắn schedule bằng clock-in/clock-out RPC;
- unsafe auto-attendance bị loại khỏi active UI;
- Swap reason/backend contract đồng bộ;
- Employee Swap submit;
- Manager approve/reject Swap;
- official schedule refresh sau Swap;
- fake Give-as-Swap bị loại và fail-closed;
- notification/email/calendar gap đã được inventory;
- production mutation: none.

Owner cần chốt:

1. `SFB-001 — Give lifecycle` trong `05_SYSTEM/PUBLISHED_SCHEDULE_FEEDBACK_LOOP_V1.md`;
2. `SFB-002 — Notification production activation`: cho phép event-outbox production apply và xác định/ủy quyền email/calendar provider + secret-store credentials.

Không draft/apply write-capable Give hoặc notification provider production trước hai boundary trên.

TASK-026 vẫn được defer độc lập; không triển khai SOP/Task write automation cho tới khi DST-001..DST-006 được phê duyệt.

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

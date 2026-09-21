# MAGASIN — Workforce Operations V1 E2E Acceptance Contract

**Date:** 2026-09-21  
**Status:** CANONICAL ACCEPTANCE CONTRACT / REQUIRED FOR FINAL STABILITY  
**Applies to:** WORKFORCE_OPERATIONS_V1 / TASK-106 → TASK-108

## Purpose

Individual feature tests are insufficient. This contract proves that Employee + Manager + canonical data flow work together from next-week registration through payroll self-check, including recovery and permissions.

## E2E scenarios

### E2E-01 — Next-week availability
Employee opens next-week registration, submits availability, reloads, and sees exactly the same saved availability.

### E2E-02 — Sunday Manager scheduling
Manager opens the same target week, sees Employee availability and creates assignments without requiring staffing-gap semantics.

### E2E-03 — Schedule validation
Reject/flag overlap, inactive employee, invalid store/scope, availability violation when enforced, and >2 shifts/day.

### E2E-04 — Publish → Monday visibility
Manager publishes target week. Employee navigates to that week and sees only the approved/published assignments.

### E2E-05 — Publish idempotency
Retry/double-click/reload must not duplicate assignments or create competing published versions.

### E2E-06 — Swap full lifecycle
A requests swap with B → B accepts → Manager approval when required → server revalidates → assignments atomically swap → both Employee views refresh.

### E2E-07 — Give full lifecycle
A gives assignment → eligible B accepts/claims → Manager approves → server revalidates → ownership transfers → views refresh.

### E2E-08 — Swap/Give ownership to attendance
After APPLIED, old owner cannot submit attendance for transferred assignment; new owner can.

### E2E-09 — Manual-time attendance normal path
Employee selects actual_start/actual_end for own published assignment and submits. No realtime clock-in/out is required.

### E2E-10 — Attendance exception path
Abnormal submitted time becomes NEEDS_REVIEW; Manager can approve/adjust/reject; confirmed work time reflects final reviewed result.

### E2E-11 — Attendance idempotency
Retry/double-submit/reload cannot create duplicate active attendance for the same assignment/date.

### E2E-12 — Payroll draft source
Payroll draft uses confirmed work time + valid pay rule only; raw submitted/rejected attendance cannot contribute.

### E2E-13 — Payroll state / employee self-check
Employee sees own ESTIMATED/REVIEWED/FINALIZED/PAID state correctly; ESTIMATED is never rendered as FINALIZED.

### E2E-14 — Profile/payroll authorization
Employee A cannot access Employee B profile/payroll. Manager sees only allowed scope. Owner scope is separate.

### E2E-15 — Week/timezone boundary
Asia/Ho_Chi_Minh Sunday→Monday boundary remains correct across reload and week navigation. Next-week registration and current-week schedule cannot cross-wire.

### E2E-16 — Failure / recovery
Inject bounded read/write failures, reload browser, and retry. UI fails closed, preserves already-confirmed canonical state, avoids duplicate mutations, and recovers without manual database repair.

## Browser acceptance requirements

For the full pack:
- sanitized fixtures/mocks for deterministic mutation scenarios;
- no private production records;
- no unexpected console errors;
- no page errors;
- no unexpected request failures;
- no HTTP 5xx in deterministic test path;
- no uncontrolled external network;
- all relevant UI surfaces render after reload;
- all state transitions verified against canonical backend/mock contract, not DOM-only text.

## Production smoke boundary

Production verification, if used, is read-only unless Owner separately approves safe test data/actions.

Never create fake employee/payroll production records merely to satisfy E2E.

## Regression dependencies

Final gate must include relevant existing regressions:
- Employee availability;
- Employee schedule;
- Manager Workforce schedule/review/publish;
- Swap;
- Give;
- Attendance;
- notification/outbox;
- Schedule-first canonical flow;
- published schedule feedback loop;
- People/Shift browser E2E;
- Manager/Employee route/auth regressions;
- payroll tests introduced by WORKFORCE_OPERATIONS_V1.

## Two-stage final E2E recheck

### Gate A — PR head
Full E2E pack green on final implementation head.

### Gate B — exact post-merge main
After merge, rerun the same E2E pack on the exact main SHA.

### Gate C — cold/reload recheck
On exact post-merge executable state:
- fresh browser/session;
- direct route load;
- reload mid-flow at least once;
- repeat core E2E-01→E2E-13;
- verify idempotency and no stale state.

TASK-108 cannot be DONE unless A + B + C are green.

## Failure policy

Any reproducible failure:
`DONE → FIXING` for the affected task/wave.

Do not weaken guardrails or mark flaky failure as accepted without root cause.

## Final acceptance

WORKFORCE_OPERATIONS_V1 is STABLE only when:
- architecture invariants hold;
- all mandatory E2E scenarios pass;
- post-merge and cold/reload rechecks pass;
- existing relevant regressions stay green;
- no unresolved P0/P1 operational defect remains;
- source-of-truth docs/state are updated.

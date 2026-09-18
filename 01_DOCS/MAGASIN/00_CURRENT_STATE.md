# MAGASIN — Current State

Last updated: 2026-09-18

## Current program

**MAGASIN Business OS V1 — 21-day accelerated execution**

Enterprise Source-of-Truth discipline remains mandatory. Acceleration is achieved by smaller vertical-slice Discovery and micro-task execution, not by guessing business rules.

## Current phase

**P1 — Accelerated Enterprise Discovery + Foundation**

P0 baseline gate has passed. Owner decision `DEC-003` reprioritizes the current implementation slice to **People / Shift / Schedule / Attendance**.

## Current task

**TASK-029 — Robot draft + Manager assignment editor — READY**

Canonical task/state files:

- `00_BUSINESS_OS_BLUEPRINT.md`
- `00_PROJECT_STATE.json`
- `00_TASK_QUEUE.md`
- `00_SUPERVISOR_ROBOT.md`
- `05_SYSTEM/SCHEDULE_V1_COMPLETION_PLAN.md`

## Owner priority — DEC-003

Owner decided on 2026-09-18:

- temporarily defer write-capable SOP / Công việc / Task implementation;
- do not guess DST-001..DST-006;
- complete the weekly scheduling operating loop first, using `Lịch Đk Tuần`, `Lịch làm hàng tuần`, repository Workforce engines and verified live RPC contracts;
- Manager must be able to review/edit registrations, allocate people, use robot draft scheduling and publish;
- Employee must be able to register availability, see saved registration and official schedule, clock in/out, give/swap shifts;
- schedule changes must propagate to the affected people and support notification/calendar/email integration.

`TASK-026` is **DEFERRED_BY_OWNER**, not approved and not deleted. Its six SOP/Task decisions remain unresolved.

## Schedule target workflow

```text
Availability
→ Manager review
→ Staffing demand
→ Robot draft
→ Manager assignment edit
→ Validate
→ Review
→ Publish
→ Employee official schedule
→ Attendance
→ Give / Swap
→ Schedule refresh
→ Notifications
```

Robot does not auto-publish.

## Safety

This repository is PUBLIC.

Never commit secrets, credentials, cookies, tokens, browser profiles, private employee/customer/financial records, production exports or private generated media.

The two scheduling workbooks are evidence sources. Private employee rows remain outside Git.

Production schema/backfill/permission changes and activation of external email/calendar credentials remain Owner-gated YELLOW actions.

## Supervisor status

Supervisor Robot V1 remains active. Project state is returned to `AUTO_CONTINUE` because the prior Owner boundary has been explicitly superseded by DEC-003 through deferral of the SOP/Task slice.

## Next action

**AUTO_CONTINUE:** execute TASK-029. Connect robot draft generation to the Manager workflow and add a DRAFT-only assignment editor using `get_schedule_generation_assignments` + `replace_schedule_generation_assignments`, followed by server validation. Do not auto-publish.

## Session handoff

New chat must read:

1. `00_CURRENT_STATE.md`
2. `00_PROJECT_STATE.json`
3. `00_TASK_QUEUE.md`
4. `00_MASTER_PLAN.md`
5. `00_BUSINESS_OS_BLUEPRINT.md`
6. `06_DECISION_LOG.md`
7. `07_CHANGE_LOG.md`
8. `05_SYSTEM/SCHEDULE_V1_COMPLETION_PLAN.md`
9. current domain/task docs
10. repository/PR/CI state

Repository evidence overrides stale chat memory.

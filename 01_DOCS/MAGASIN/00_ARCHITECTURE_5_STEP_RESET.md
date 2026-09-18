# MAGASIN Business OS — Five-Step Architecture Reset

**Date:** 2026-09-18  
**Status:** APPROVED DIRECTION / ACTIVE EXECUTION RULE  
**Decision:** stop module-first/top-down expansion and execute the highest-value operating loop first.

## 1. Why this reset exists

The repository already says:

```text
QUESTION → DELETE → SIMPLIFY → ACCELERATE → AUTOMATE
```

but the task sequence drifted into completing broad modules/milestones before proving the most important day-to-day operating loop end to end.

From this point forward, the Five-Step Algorithm is not a slogan. It is a mandatory architecture gate before implementation.

## 2. Five-Step gate

### Step 1 — QUESTION every requirement

For every requested screen, table, workflow, field, automation or dashboard ask:

1. Who uses it?
2. What operating decision does it change?
3. What failure happens if it does not exist?
4. Is the requirement verified from Owner/current operation/repository evidence?
5. Is it required for the current critical flow?

A requirement without a verified user, decision or critical-flow effect does not enter implementation.

### Step 2 — DELETE before adding

Delete or defer:

- duplicate role-specific implementations of the same business capability;
- dashboards/summary layers before the underlying operating flow is reliable;
- placeholder/demo surfaces that look operational without a verified source;
- speculative data models and business rules;
- refactors that do not shorten the current critical path;
- SOP/Task write automation while its Owner rule boundary is still unresolved.

Deletion is successful when fewer components are required to complete the operating loop.

### Step 3 — SIMPLIFY / OPTIMIZE only what remains

Use one canonical business capability with role-specific views, not separate systems by role.

Preferred dependency direction:

```text
Verified business rule
  → canonical data contract
  → shared domain capability
  → Employee / Manager / Owner views
  → exception/attention layer
```

Do not optimize a component that should have been deleted.

### Step 4 — ACCELERATE cycle time

Work as thin vertical slices that can be proven in one operating loop.

Each slice must have:

- one explicit user outcome;
- one source-of-truth/data boundary;
- deterministic tests;
- browser E2E where UI is involved;
- no unrelated module expansion.

### Step 5 — AUTOMATE last

Robot scheduling, notifications, alerts and automatic state transitions are added only after the manual/canonical flow is correct and observable.

Automation must fail closed and must never hide an unresolved business-rule decision.

## 3. New critical path: Schedule-first

The highest-priority operating loop is weekly workforce scheduling.

Canonical flow:

```text
Employee availability
  → Manager review/edit
  → staffing demand / constraints
  → Robot schedule proposal
  → Manager allocation/adjustment
  → publish weekly schedule
  → Employee schedule visibility
  → attendance / give-shift / swap
  → notifications to affected people
```

### Role boundary

- **Employee:** register availability, see published schedule, attendance, give/swap shift.
- **Manager:** see availability, edit/allocate staff, review robot proposal, publish/adjust schedule.
- **Owner:** policy/exception/approval/attention view; Owner is not the primary daily scheduler.
- **Robot:** proposes/updates within approved rules; it does not invent missing business rules.

## 4. Reuse before rebuild

Existing verified assets are inputs, not reasons to create another layer:

- Employee availability engine;
- Employee schedule engine;
- Owner Workforce demand/review/publish engines;
- Manager Workforce compatibility/runtime surfaces;
- existing schedule-generation and staffing requirement RPC semantics;
- existing People/Shift browser regression.

TASK-029 must determine which of these is canonical and which is compatibility/legacy before new code is added.

## 5. Deferred until the schedule critical path is stable

- SOP/Task write-capable workflow after TASK-026 Owner decisions;
- broad dashboard expansion unrelated to the schedule loop;
- payroll/KPI/recruitment expansion;
- speculative production schema rewrite;
- cosmetic architecture cleanup with no critical-path effect.

TASK-026 remains preserved as an Owner decision pack but no longer blocks the whole project.

## 6. Architecture rules from now on

1. Value-stream order beats module order.
2. Business flow beats dashboard completeness.
3. One capability has one canonical owner/module.
4. Shared contracts sit below role-specific UI.
5. UI cannot claim operational truth without a verified source.
6. Automation comes after a proven manual/canonical path.
7. Every new task must state its QUESTION / DELETE / SIMPLIFY / ACCELERATE / AUTOMATE result.
8. If DELETE removes the need for the task, do not implement it.
9. If a task does not move the current critical path, defer it.
10. Owner boundaries remain fail-closed.

## 7. Immediate execution queue

- **TASK-027 — Control Panel local GitHub Runner lifecycle + reboot recovery:** integrate the local runner into the unified control surface. DONE.
- **TASK-028 — Five-Step architecture reset + delete/defer map:** this document plus source-of-truth reprioritization. DONE.
- **TASK-029 — Schedule-first canonical flow contract:** canonical tables/RPC boundaries and role ownership locked; duplicate ownership classified transitional. DONE.
- **TASK-030 — Employee weekly availability canonical slice:** single Employee availability owner, save/multi-window/delete regression verified. DONE.
- **TASK-031 — Manager allocation + robot proposal + publish slice:** canonical Manager Workforce module owns review/allocation/explicit publish; Robot remains DRAFT-only. DONE.
- **TASK-032 — Published schedule → attendance/swap/notification integration gate:** verified core + SFB-001/SFB-002 decisions complete. DONE.
- **TASK-033 — Give Shift production primitive:** recipient consent → Manager approval → server revalidation/transfer; production migration + browser E2E verified. DONE.
- **TASK-034 — Notification event-outbox production:** durable RLS-protected schedule/attendance/Swap/Give outbox + Employee in-app reader + rollback integration smoke verified. DONE.
- **TASK-035 — MAGASIN email adapter/config:** provider-neutral worker/config contract verified; no existing provider/account evidence found; activation requires concrete provider + exact MAGASIN sender email. WAIT_USER.

## 8. Definition of success

The reset is successful when the repository can trace one weekly schedule from employee availability through manager publication to employee execution without relying on duplicate systems or unverified business rules.


## 9. Conversation-aware execution handoff

The Five-Step method also governs **how automation takes over work**, not only which business module is built.

Canonical runtime handoff is defined in `00_SUPERVISOR_HANDOFF_ARCHITECTURE.md`:

```text
Owner works in ChatGPT Robot browser
  → Supervisor observes current chat first
  → WAIT if assistant is running or Owner message is pending
  → reconcile live Owner instruction + repository once
  → continue exact current work
  → AUTO_CONTINUE from canonical state
```

This deletes the old behavior of blindly sending the same generic continuation prompt at startup. The Supervisor must preserve work already in progress and must not treat a stale repository task as more recent than an explicit live Owner redirect without first reconciling that redirect back into source-of-truth.

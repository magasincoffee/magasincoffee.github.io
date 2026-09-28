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

## 3. Current critical path: Profitability & Cash first

Owner reprioritized the enterprise architecture on 2026-09-19.

The highest-priority management loop is now:

```text
Revenue truth
  → Cash truth
  → Cost / AP / debt truth
  → COGS reliability
  → Unit economics
  → Profit ↔ Cash reconciliation
  → Branch / channel economics
  → Break-even
  → Pricing diagnosis
```

The core design principle is a **Financial Truth Spine** shared across domains:

```text
Sales / Procurement / Inventory / Workforce / Expenses / Cash Events
                         ↓
                 Canonical ledgers
                         ↓
Revenue → COGS/Cost → Cash → Contribution → Profitability → Break-even
                         ↓
            Owner / Manager decisions
```

### External execution boundary

The original architecture-reset pause/release gate is historical and has been satisfied. Current execution authority comes from WEBAPP project truth in `00_PROJECT_STATE.json` and `00_TASK_QUEUE.md`.

Automation/orchestration infrastructure is external to this repository. Canonical ownership is defined in `05_SYSTEM/EXTERNAL_PROJECT_BOUNDARY_V1.md`; Supervisor platform runtime belongs to `magasincoffee/magasin-supervisor` and may consume WEBAPP project truth only through the explicit adapter/integration boundary.

Canonical business architecture: `00_ENTERPRISE_ARCHITECTURE_5_STEP_PROFIT_CASH.md`.

### Schedule-first status

Schedule-first is now a **proven vertical-slice reference**, not the enterprise priority.

TASK-029 → TASK-036 proved:

- one canonical capability instead of role-duplicated truth;
- server/RPC boundaries;
- role-specific projections;
- explicit Manager review/publish;
- deterministic tests and browser E2E;
- automation after manual/canonical flow.

Reuse that delivery pattern for Profitability & Cash. Do not keep expanding Workforce merely to complete a module.

## 4. Reuse before rebuild

Existing verified assets are inputs, not reasons to create another layer:

- Employee availability engine;
- Employee schedule engine;
- Owner Workforce demand/review/publish engines;
- Manager Workforce compatibility/runtime surfaces;
- existing schedule-generation and staffing requirement RPC semantics;
- existing People/Shift browser regression.

TASK-029 must determine which of these is canonical and which is compatibility/legacy before new code is added.

## 5. Deferred during Profitability & Cash architecture lock

- external orchestration-platform features; they belong to `magasincoffee/magasin-supervisor`, not WEBAPP architecture;
- SOP/Task write-capable workflow after TASK-026 Owner decisions;
- broad dashboard expansion before financial truth exists;
- payroll/KPI/recruitment expansion;
- AI forecasting/recommendations before actual data is reliable;
- speculative production schema rewrite;
- cosmetic architecture cleanup with no critical-path effect.

TASK-026 remains preserved. TASK-049 is historical and superseded by the completed independent Supervisor migration. TASK-050 is complete; Profitability & Cash execution is governed by the current project state/queue.

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
- **TASK-035 — MAGASIN email adapter/config:** Gmail adapter/config prepared; production OAuth activation explicitly deferred by Owner and remains fail-closed/non-blocking. DEFERRED.
- **TASK-036 — Schedule-first closure regression + recovery gate:** canonical schedule regression/recovery gate completed; external email remains fail-closed. DONE.
- **TASK-037 → TASK-049 — historical automation/orchestration generation:** retained in `00_TASK_QUEUE.md` and migration/night-run evidence only. These tasks no longer define WEBAPP runtime ownership or current architecture.
- **TASK-050 — Enterprise architecture lock — Profitability & Cash first:** DONE / architecture locked; the active PFC queue now carries implementation authority.

## 8. Definition of success

The reset is successful when MAGASIN can trace operating events into a trustworthy financial truth spine and use it to explain Revenue, COGS/Cost, Cash, Contribution, Profitability and Break-even without competing sources of truth. Schedule-first remains a proven example of the required vertical-slice discipline.


## 9. External automation integration boundary

The Five-Step method still governs when automation is appropriate, but orchestration runtime implementation is not part of WEBAPP architecture.

WEBAPP owns business/project truth. External automation may:

1. read the explicit project adapter/integration contract;
2. act only when WEBAPP project state authorizes execution;
3. reconcile results back into WEBAPP source-of-truth;
4. fail closed on Owner/security/destructive boundaries.

Supervisor runtime, browser control, autostart, recovery and release certification are owned by `magasincoffee/magasin-supervisor`. Historical pre-migration handoff/Brain/Worker documents are preserved only as provenance and must not be treated as current platform authority.

See `05_SYSTEM/EXTERNAL_PROJECT_BOUNDARY_V1.md` and the retained project-side `00_SUPERVISOR_THREE_LANE_ARCHITECTURE.md` integration contract.

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

### Owner handoff gate

Architecture discussion is a hard Owner boundary:

- `00_PROJECT_STATE.json = WAIT_USER / PAUSED`;
- Supervisor/Brain/Work must not execute new implementation tasks;
- existing task history is not permission to continue;
- Owner must explicitly lock architecture and release Robot;
- only then may source-of-truth return to `READY / AUTO_CONTINUE`.

Canonical discussion document: `00_ENTERPRISE_ARCHITECTURE_5_STEP_PROFIT_CASH.md`.

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

- new Supervisor/Robot autonomy features not required for the Owner handoff gate;
- SOP/Task write-capable workflow after TASK-026 Owner decisions;
- broad dashboard expansion before financial truth exists;
- payroll/KPI/recruitment expansion;
- AI forecasting/recommendations before actual data is reliable;
- speculative production schema rewrite;
- cosmetic architecture cleanup with no critical-path effect.

TASK-026 remains preserved. TASK-049 is infrastructure work and is paused from further expansion. TASK-050 owns the current architecture discussion.

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
- **TASK-037 — Windows auto-reboot/logon recovery:** canonical runner + Supervisor + dedicated Business OS Chrome/CDP recovery verified on self-hosted Windows. DONE.
- **TASK-038 — Night-run persistence:** deadline + cursor + lease + checkpoint + GitHub-hosted hard-stop contract verified. DONE.
- **TASK-039 — Business OS Robot V2 project registry:** exactly two Owner-approved project state strategies with deny-unregistered policy. DONE.
- **TASK-040 — Business OS Robot V2 portfolio scheduler:** project isolation + WAIT_USER skip policy verified. DONE.
- **TASK-041 — Business OS Robot V2 recovery engine:** lease/checkpoint/stale-cursor recovery + project boundary regression verified. DONE.
- **TASK-042 — SaydiVoiceProvider production adapter offline:** Media Robot offline gate verified with 23 tests; no live provider action or merge. DONE.
- **TASK-043 — Cross-project handoff integration:** Business OS → Media Robot → Business OS state/checkpoint/constraint isolation verified. DONE.
- **TASK-044 — Portfolio-aware diagnostics:** project/task/checkpoint/error context with privacy-safe persistence verified. DONE.
- **TASK-045 — Restart/resume simulation:** kill/restart/reconcile/resume regression over existing Robot V2 primitives verified. DONE.
- **TASK-046 — Night full QA:** both-project regression evidence verified; no bounded fix remains. DONE.
- **TASK-047 — Night docs / evidence / PR prep:** changelog, canonical evidence report and reviewable PR descriptions reconciled. DONE.
- **TASK-048 — Night final checkpoint:** approved 09:15 +07 hard stop completed. A later Owner-reprioritized active task was preserved. DONE.
- **TASK-049 — Supervisor Three-Lane owner-bound Brain/Work orchestration:** one Brain coordinates a bounded Worker pool; dynamic directives, full-result relay, strict `conversationFull` rollover, local-only registry and automatic runtime upgrade. IN_PROGRESS.
- **TASK-050 — Enterprise architecture lock — Profitability & Cash first:** Owner/ChatGPT discussion only; implementation queue locked; source-of-truth WAIT_USER/PAUSED until explicit Owner release. ACTIVE DISCUSSION.

## 8. Definition of success

The reset is successful when MAGASIN can trace operating events into a trustworthy financial truth spine and use it to explain Revenue, COGS/Cost, Cash, Contribution, Profitability and Break-even without competing sources of truth. Schedule-first remains a proven example of the required vertical-slice discipline.


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

### TASK-049 Three-Lane Five-Step reset

- QUESTION: Brain identity must not be inferred by automation.
- DELETE: active Brain auto-discovery/rebind candidate scanning.
- SIMPLIFY: three fixed lanes; Owner supplies Brain URL, Robot owns Work URL.
- ACCELERATE: reuse Work conversation until positive full evidence.
- AUTOMATE: create/roll Work chat and relay screenshot + full text back to same-lane Brain.

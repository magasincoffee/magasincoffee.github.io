# MAGASIN — Architecture 5-Step Reset

**Canonical architecture gate**  
**Date:** 2026-09-18  
**Owner direction:** continue current work, do not restart mechanically.  
**Algorithm:** QUESTION → DELETE → SIMPLIFY → ACCELERATE → AUTOMATE

## 1. Why this reset exists

The Business OS must not progress top-to-bottom by menu order or visual completeness. Work must follow the current business critical path.

Current Owner priority is **Schedule / People / Shift / Attendance**. SOP/Task is deferred by DEC-003 and remains unresolved. A task that does not advance the current critical path must not preempt the active Schedule queue unless it is a blocking defect, security defect, data-integrity defect, or explicit Owner request.

## 2. QUESTION — what must work end-to-end?

The current critical business question is:

> Can MAGASIN reliably turn employee weekly availability into a reviewed/published store schedule, let employees see and act on that schedule, record attendance, handle give/swap changes, and notify every affected person?

Canonical chain:

```text
Employee weekly availability
→ Manager scoped review/edit
→ Staffing demand
→ Robot DRAFT generation
→ Manager assignment review/edit
→ Server validation
→ Manager review
→ Publish official schedule
→ Employee schedule visibility
→ Attendance
→ Give / Swap
→ Atomic schedule refresh
→ Notification / Calendar / Email events
```

The chain is incomplete until the final E2E gate passes.

## 3. DELETE — remove work that does not advance the chain

Until Schedule V1 closes:

- do not restart completed TASK-027/028/029;
- do not resume SOP/Task implementation or invent DST-001..DST-006;
- do not build a second Workforce/schedule system beside the existing one;
- do not rebuild working Owner/Employee engines just because their UI is old;
- do not prioritize KPI, Academy, dashboard cosmetics, task widgets, inventory UI, or generic settings;
- do not duplicate data already owned by Supabase Workforce tables/RPCs;
- do not auto-publish Robot output;
- do not commit workbook employee rows or other private operational data to the public repository.

Delete means remove unnecessary scope first, not delete production data.

## 4. SIMPLIFY — one canonical ownership model

Use the existing system as the backbone:

| Concern | Canonical owner |
|---|---|
| Employee availability | existing availability RPCs |
| Manager registration review | manager scoped read/edit RPCs |
| Demand | staffing requirement RPCs |
| Robot scheduling | existing schedule-generation RPCs |
| Draft assignments | generation assignments + replacement RPC |
| Validation | server validation RPC |
| Official schedule | publish workflow + work_schedules |
| Employee schedule | approved schedule reader |
| Attendance | schedule-linked attendance RPCs |
| Give / Swap | shift-swap RPC workflow |
| Notifications | event/outbox/connector layer, not business-state duplication |

UI is a projection of this chain. It must not become a second source of truth.

## 5. ACCELERATE — micro-task order

Only work the first incomplete link:

1. TASK-030 — Employee weekly registration V2.
2. TASK-031 — Manager official schedule workspace.
3. TASK-032 — Give/Swap V2.
4. TASK-033 — Attendance + shift reminders.
5. TASK-034 — Notification / Calendar / Email connector.
6. TASK-035 — Full Schedule E2E gate.

A newly discovered defect may interrupt this order only when it blocks the current link or violates security/data integrity. Fix it, regress, then return to the same critical path.

Every micro-task follows:

```text
Inspect current source
→ smallest verified change
→ unit/static
→ browser regression
→ existing regressions
→ E2E where applicable
→ docs/state
→ next link
```

## 6. AUTOMATE — only after the simplified flow is trusted

Automation order:

1. deterministic Robot DRAFT generation;
2. automated regression/E2E;
3. schedule event generation;
4. notification delivery adapters;
5. reminder scheduling.

Automation must not bypass Manager review/publish or server validation.

External email/calendar provider activation, credentials, production permission changes, production DDL/backfill, and destructive/admin actions remain Owner-gated.

## 7. Architecture invariants

1. **One scheduling truth:** no parallel schedule database/app logic.
2. **Draft before official:** Robot output is never official by itself.
3. **Server authorization:** browser writes use verified RPC boundaries when available.
4. **Scope-aware Manager:** Manager sees/edits only authorized stores.
5. **Employee immediacy:** saved availability and published schedule must be visible on Employee UI without hidden spreadsheet steps.
6. **Change propagation:** give/swap/publish updates must refresh impacted schedule state.
7. **Notification is downstream:** failure to send a message must not corrupt a committed schedule mutation.
8. **Private data stays private:** public repo stores contracts/sanitized fixtures only.
9. **No invented policy:** workbook ambiguity such as exact “Cả Ngày” semantics is not guessed.
10. **Critical-path priority:** non-blocking cosmetic or unrelated modules wait.

## 8. Reconciliation rule

At the start of any continuation:

1. read the latest Owner instruction in the current conversation;
2. read `00_CURRENT_STATE.md`, `00_PROJECT_STATE.json`, `00_TASK_QUEUE.md`, and this file;
3. if Owner intent differs from repository state, reconcile source-of-truth first;
4. do not repeat a task already verified DONE;
5. continue automatically while `AUTO_CONTINUE` is permitted;
6. stop only at a real Owner/security/production boundary.

## 9. Current checkpoint

At creation of this reset:

- DEC-003 is the active Owner priority.
- TASK-026 is `DEFERRED_BY_OWNER`.
- TASK-027, TASK-028 and TASK-029 are DONE and CI/browser verified.
- TASK-030 is the first incomplete critical-path link.

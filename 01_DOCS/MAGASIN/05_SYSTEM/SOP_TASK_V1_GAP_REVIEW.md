# TASK-023 — SOP / Task Current-System Gap Review + Acceptance Contract

**Status:** ACCEPTANCE DEFINED  
**Date:** 2026-09-18  
**Milestone:** Day 11–13 SOP / Task.

## 1. Question

What is the smallest verified delta required to move the approved Day 11–13 slice toward an executable SOP/task workflow without presenting demo data as operational fact, inventing business rules, or applying a speculative production schema?

The canonical target remains:

```text
SOP template
→ execution
→ responsible person
→ exception
→ corrective task
→ verify
→ close
```

## 2. Evidence boundary

This review uses repository source-of-truth first, plus a read-only live-schema inventory to distinguish “not source-controlled” from “does not currently exist in the live database.”

Verified evidence:

- `00_BUSINESS_OS_BLUEPRINT.md` explicitly approves Day 11–13 scope: SOP templates, checklist, corrective task, overdue/exception.
- `00_MASTER_PLAN.md` still places the enterprise program in P1 Discovery; P2 Business Rules and P3 SOP are not globally completed. It explicitly forbids promoting assumptions into rules.
- `03_SOP/README.md` is only an SOP library/index skeleton. No approved operational SOP entry or versioned execution template is currently present there.
- `05_MANAGER/runtime/manager-shell-v1.html` contains a visible “Công việc” surface, but its open/completed task rows and assignee/deadline examples are hard-coded shell/demo content. No task engine is attached to that surface.
- `06_EMPLOYEE/app/employee-v40.html` contains “Công việc hôm nay” loading/empty placeholders.
- The canonical Employee runtime loads schedule, attendance, availability, swap and dashboard engines; the dashboard engine only renders today’s shift and does not populate `taskBadge` / `taskList`.
- Repository migration/history inspection found no verified SOP/task/checklist/corrective-task persistence contract.
- A read-only inventory of the active MAGASIN Supabase schema found no public table, view or routine whose contract identifies SOP, task, checklist, exception or corrective-task functionality. No write or schema operation was performed.

The live-schema check is diagnostic evidence only. It does not define business rules.

## 3. Five-step scope reduction

### Question

Day 11–13 must make SOP/task execution trustworthy before automating assignment, exception handling or closure.

### Delete

Do not:

- rebuild Workforce, attendance, inventory or other existing domains;
- copy hard-coded demo task rows into a new backend;
- invent an exception taxonomy, severity model or escalation policy;
- invent verification/closure authority;
- auto-create corrective tasks before the triggering rules are approved;
- apply a production migration during this discovery task.

### Simplify

Treat current Manager/Employee task panels as presentation shells. First make their data-quality state truthful and fail-closed. Separate UI integrity from later business-rule/data-model work.

### Accelerate

1. remove fabricated/infinite-loading task states;
2. prepare the smallest explicit decision/data contract;
3. only then implement persistence/write workflow after the required rules are approved.

### Automate

Automate only after the workflow semantics are verified. Missing task/SOP source must render as unavailable, never as zero completed work or as fabricated assignments.

## 4. Verified gaps

### GAP-ST-01 — No approved executable SOP template/version source

The canonical SOP workspace is an index skeleton. There is no verified SOP template/version artifact that can safely drive checklist execution.

Required handling:

- keep SOP content as source-of-truth documentation until approved;
- require explicit version identity before historical executions can reference an SOP;
- do not synthesize SOP steps from current UI text.

### GAP-ST-02 — Current task UI is not connected to a verified source

Manager shows hard-coded open/completed examples. Employee shows an indefinite “Đang tải” placeholder but no task engine populates it.

Required handling:

- fail closed when no task source is verified;
- remove fabricated operational rows from the canonical Manager shell;
- make Employee task source state explicit instead of indefinite loading;
- do not add write controls that imply an implemented task workflow.

### GAP-ST-03 — No verified SOP/task persistence or API contract

Neither source-controlled migrations nor read-only live-schema inventory provide a verified SOP/task/checklist/corrective-task model.

Required handling:

- production schema remains unchanged;
- any proposed data model/migration is a later plan artifact, not an applied migration;
- data model must trace to approved rules/SOP rather than current UI placeholders.

### GAP-ST-04 — Exception/corrective/verification rules are unresolved

The approved Blueprint names exception → corrective task → verify → close, but the repository does not define:

- which checklist result is an exception;
- when an exception must create a corrective task;
- who becomes responsible;
- who may verify and close;
- escalation/notification behavior;
- whether completion needs evidence and what evidence is valid.

These are business-rule decisions, not safe implementation guesses.

### GAP-ST-05 — No Day-13 SOP/Task browser gate

There is no deterministic E2E proving truthful Manager/Employee task state, SOP version traceability, exception/corrective flow, or overdue behavior.

A full flow cannot be specified until GAP-ST-04 is resolved. The immediate browser gate may only verify fail-closed UI integrity.

## 5. Acceptance contract for TASK-023

TASK-023 is accepted when:

1. existing task surfaces are classified as shells/placeholders, not trusted task records;
2. no hard-coded task example may be treated as operational FACT;
3. absence of a verified task source must fail closed explicitly;
4. no task write workflow is introduced from UI assumptions;
5. no production SOP/task migration is applied;
6. no exception/corrective/verification rule is invented;
7. live-schema inspection remains read-only and records only structural evidence;
8. the next micro-task fixes UI data-integrity first;
9. a separate decision/data-contract task captures the Owner/business-rule boundary before persistence/workflow implementation;
10. implementation beyond that boundary waits for verified decisions.

## 6. Minimal implementation queue

- **TASK-024 — SOP/Task fail-closed UI integrity gate**
  - Remove hard-coded Manager task rows from trusted presentation.
  - Replace Employee indefinite task loading with explicit unavailable/not-connected state when no source exists.
  - No task write RPC, no schema change.
  - Gate: static/unit assertions + deterministic browser smoke/regression.

- **TASK-025 — SOP/Task rule decision pack + data/migration plan**
  - Convert GAP-ST-04 into a concise decision pack.
  - Propose the minimum versioned data contract only where supported by approved decisions.
  - May prepare migration design/code after rules are clear, but must not apply production migration without the required approval boundary.
  - Gate: traceability/contract tests + explicit Owner boundary if unresolved decisions remain.

No TASK-026 implementation queue is opened until TASK-025 resolves the business-rule boundary.

## 7. Deferred / explicitly out of scope

- production schema apply/backfill;
- automatic corrective-task creation;
- automatic escalation/notifications;
- KPI scoring from task completion;
- payroll consequences;
- evidence/photo requirements not yet approved;
- full SOP authoring for operational domains not yet converted from Business Rules;
- redesign of unrelated Manager/Employee modules.

## 8. TASK-023 gate result

**PASS — verified gaps and the safe next queue are defined.**

No Owner action is required for TASK-024 because it is a fail-closed data-integrity fix with no production writes or new business rules.

Owner/business-rule input is expected at TASK-025 before any write-capable SOP/task workflow is treated as production-ready.

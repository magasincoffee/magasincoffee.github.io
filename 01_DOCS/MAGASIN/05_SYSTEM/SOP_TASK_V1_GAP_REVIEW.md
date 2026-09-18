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

This review uses repository source-of-truth first and a **read-only** live-schema inventory only to distinguish “not source-controlled” from “not identifiable in the current live public schema.”

Verified evidence:

- `00_BUSINESS_OS_BLUEPRINT.md` approves Day 11–13 scope: SOP templates, checklist, corrective task, overdue/exception.
- `00_MASTER_PLAN.md` keeps the program in P1 Discovery; assumptions must not be promoted into Business Rules.
- `03_SOP/README.md` is an SOP registry/index skeleton only. No approved executable/versioned SOP template is present there.
- `05_MANAGER/runtime/manager-shell-v1.html` exposes “Công việc”, but its open/completed rows are hard-coded prototype content; its generic modal explicitly says backend will be connected per module.
- `05_MANAGER/Cong-viec/index.html` is a stale deep-link wrapper: it targets `/manager-v13-runtime.html`, while the canonical Manager entry uses `/05_MANAGER/runtime/manager-runtime-v1.html`. The stale target is not present in the current repository.
- `06_EMPLOYEE/app/employee-v40.html` contains “Công việc hôm nay” with `taskBadge` / `taskList` loading placeholders.
- `06_EMPLOYEE/runtime/employee-runtime-v1.html` loads schedule, attendance, availability, swap and dashboard engines, but no Task/SOP engine.
- `04_OWNER/ControlTower/index.html` exposes Task/SOP attention slots, while `control-tower-v1.js` loads Revenue, Payables and Workforce sources only; no Task/SOP source adapter is connected.
- Repository migration/history inspection contains no verified SOP/task/checklist/corrective-task persistence/API contract.
- A read-only inventory of the active MAGASIN Supabase `public` schema found no table/view/routine whose object name identifies task, SOP, checklist, exception or corrective-task functionality. No row data, write, DDL, migration or backfill was used for this check.

The live-schema check is structural evidence only. Absence of a matching object name is **not** permission to invent the missing business model.

## 3. Five-step scope reduction

### Question

Day 11–13 must make SOP/task execution trustworthy before automating assignment, exception handling or closure.

### Delete

Do not:

- rebuild Workforce, attendance, inventory or other existing domains;
- copy hard-coded demo task rows into a new backend;
- invent an exception taxonomy, severity model or escalation policy;
- invent verification/closure authority;
- auto-create corrective tasks before triggering rules are approved;
- apply a production migration during this discovery task.

### Simplify

Treat current Manager/Employee Task panels as presentation shells. First repair the stale canonical deep link and make missing-source states truthful/fail-closed. Separate UI integrity from later business-rule/data-model work.

### Accelerate

1. repair the reproducible Manager Task route drift;
2. remove fabricated/infinite-loading Task states;
3. prepare the smallest explicit rule/data decision pack;
4. implement persistence/write workflow only after required rules are approved.

### Automate

Automate only after workflow semantics are verified. Missing Task/SOP source must render as unavailable, never as zero work or fabricated assignments.

## 4. Verified gaps

### GAP-ST-01 — No approved executable SOP template/version source

The canonical SOP workspace is an index skeleton. There is no verified SOP template/version artifact that can safely drive checklist execution.

Required handling:

- keep SOP content as source-of-truth documentation until approved;
- require explicit version identity before historical executions can reference an SOP;
- do not synthesize SOP steps from current UI text.

### GAP-ST-02 — Current Task UI is not connected to a verified source

Manager shows hard-coded open/completed examples. Employee shows an indefinite Task loading placeholder but no Task engine populates it.

Required handling:

- fail closed when no Task source is verified;
- remove fabricated operational rows from the canonical Manager shell;
- make Employee Task source state explicit instead of indefinite loading;
- do not add write controls that imply an implemented Task workflow.

### GAP-ST-03 — No verified SOP/Task persistence or API contract

Neither source-controlled migrations nor the read-only structural inventory provides a verified SOP/task/checklist/corrective-task contract.

Required handling:

- production schema remains unchanged;
- any proposed data model/migration is a later plan artifact, not an applied migration;
- data model must trace to approved rules/SOP rather than current UI placeholders.

### GAP-ST-04 — Exception/corrective/verification rules are unresolved

The approved Blueprint names exception → corrective task → verify → close, but the repository does not define:

- which checklist result is an exception;
- when an exception must create a corrective task;
- how the responsible person is chosen;
- who may verify and close;
- overdue/escalation behavior;
- whether completion needs evidence and what evidence is valid.

These are Business Rule decisions, not safe implementation guesses.

### GAP-ST-05 — No Day-13 SOP/Task browser gate

There is no deterministic E2E proving truthful Manager/Employee Task state, SOP version traceability, exception/corrective flow or overdue behavior.

A full write-flow E2E cannot be specified until GAP-ST-04 is resolved. Before that boundary, browser QA may verify route integrity and fail-closed UI only.

### GAP-ST-06 — Manager Task deep link is stale

`/05_MANAGER/Cong-viec/` still targets the removed legacy runtime `/manager-v13-runtime.html` instead of the canonical Manager runtime.

Required handling:

- point the deep link at the current canonical Manager runtime/auth conventions;
- preserve role routing;
- add a route smoke/regression test;
- do not change Task business semantics as part of the route repair.

## 5. Acceptance contract for TASK-023

TASK-023 is accepted when:

1. existing Task surfaces are classified as shells/placeholders, not trusted Task records;
2. no hard-coded Task example may be treated as operational FACT;
3. absence of a verified Task source must fail closed explicitly;
4. the stale Manager Task deep link is recorded as a technical defect, separate from business semantics;
5. no Task write workflow is introduced from UI assumptions;
6. no production SOP/Task migration is applied;
7. no exception/corrective/overdue/verification rule is invented;
8. live-schema inspection remains read-only and structural only;
9. route integrity is repaired before building a new Task backend;
10. fail-closed UI integrity is verified before persistence/write workflow;
11. a separate decision/data-contract task captures the Owner/business-rule boundary;
12. implementation beyond that boundary waits for verified decisions.

## 6. Minimal implementation queue

- **TASK-024 — Manager Task route canonicalization + smoke regression**
  - Repair `/05_MANAGER/Cong-viec/` to the current Manager runtime/auth conventions.
  - Preserve existing role routing.
  - No Task write RPC, schema change or new business rule.
  - Gate: route/static regression + browser smoke where applicable.

- **TASK-025 — SOP/Task fail-closed UI integrity gate**
  - Remove hard-coded Manager Task rows from trusted presentation.
  - Replace Employee indefinite Task loading with explicit unavailable/not-connected state while no source exists.
  - Keep Control Tower Task/SOP fail-closed unless a verified reader exists.
  - No Task write RPC or schema change.
  - Gate: static/unit assertions + deterministic browser regression.

- **TASK-026 — SOP/Task rule decision pack + data/migration plan**
  - Convert GAP-ST-04 into a concise Owner/business-rule decision pack.
  - Propose a minimum versioned data contract only where supported by approved decisions.
  - May prepare offline migration design after rules are clear, but production apply remains a separate approval boundary.
  - Gate: traceability/contract tests; enter `WAIT_USER` if unresolved business decisions remain.

No write-capable SOP/Task implementation task is opened before TASK-026 resolves the Business Rule boundary.

## 7. Deferred / explicitly out of scope

- production schema apply/backfill;
- automatic corrective-task creation;
- automatic escalation/notifications;
- KPI scoring from Task completion;
- payroll consequences;
- completion/photo evidence requirements not yet approved;
- full SOP authoring for domains not yet converted from Business Rules;
- redesign of unrelated Manager/Employee modules.

## 8. TASK-023 gate result

**PASS — verified gaps and the safe next queue are defined.**

No Owner action is required for TASK-024 or TASK-025 because both are fail-closed integrity repairs with no production writes and no new Business Rules.

Owner/business-rule input is expected at TASK-026 before any write-capable SOP/Task workflow is treated as production-ready.

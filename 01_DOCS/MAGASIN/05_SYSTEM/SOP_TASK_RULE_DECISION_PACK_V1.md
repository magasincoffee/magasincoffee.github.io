# TASK-026 — SOP / Task Rule Decision Pack + Data / Migration Plan V1

**Status:** OWNER DECISION REQUIRED  
**Date:** 2026-09-18  
**Scope:** Day 11–13 SOP / Checklist / Task.

## 1. Evidence result

Repository source-of-truth and the read-only live-schema review establish:

- the canonical workflow is approved as `SOP template → execution → responsible person → exception → corrective task → verify → close`;
- the Business Rules registry currently contains no APPROVED SOP/Task rules;
- the SOP registry is a skeleton and contains no approved executable SOP version;
- TASK-025 has made Manager/Employee/Owner Task surfaces fail closed while no source exists;
- live `public` schema contains no identified Task/SOP/Checklist/Exception/Corrective persistence object;
- therefore write semantics cannot be derived safely from current UI or schema.

TASK-026 must not choose business policy on behalf of Owner.

## 2. Owner decision pack

All six decisions below are blocking for a production write workflow. Options are intentionally unordered and no default is selected.

### DST-001 — Exception trigger

**Question:** What makes a checklist execution become an exception?

Options:
- `MANUAL_ONLY` — a user/manager explicitly flags an exception.
- `FAILED_REQUIRED_STEP` — a failed required step creates an exception.
- `TEMPLATE_DECLARED` — each approved SOP step declares whether/when its result creates an exception.
- `OTHER` — Owner defines another rule.

Owner must also decide whether “not applicable / skipped” is permitted and whether it can create an exception.

### DST-002 — Corrective-task creation

**Question:** When an exception exists, when is a corrective task created?

Options:
- `MANUAL_CONVERSION` — Manager explicitly creates/converts a corrective task.
- `AUTO_ALL_EXCEPTIONS` — every exception creates a corrective task.
- `TEMPLATE_DECLARED_AUTO` — only exception types/steps declared in the approved SOP auto-create a task.
- `OTHER`.

No automatic task creation is allowed before this decision is approved.

### DST-003 — Responsible-person assignment

**Question:** How is the responsible person determined for an execution/corrective task?

Options:
- `MANAGER_ASSIGN` — Manager selects a person.
- `EXECUTION_ASSIGNEE` — corrective responsibility follows the person assigned to the execution.
- `SOP_ROLE_DEFAULT` — approved SOP defines a role/default, with an explicit override path.
- `OTHER`.

The data model may store an assignee, but must not auto-select one before this rule is approved.

### DST-004 — Verify / close authority

**Question:** Who may verify completion and who may close a corrective task/exception?

Options:
- `MANAGER_ONLY`.
- `SEPARATION_OF_DUTIES` — verifier/closer must be different from the assignee.
- `ROLE_MATRIX` — authority depends on task/exception class.
- `OTHER`.

Owner must decide whether “complete”, “verified” and “closed” are distinct required states or whether some may collapse.

### DST-005 — Due / overdue / escalation

**Question:** How is a due time determined, and what happens after it is overdue?

Due-time options:
- set manually when assigned;
- default from approved SOP/template;
- template default with manager override;
- other.

Escalation options:
- no automatic escalation;
- notify Manager at due time;
- notify Manager then Owner after an Owner-defined grace period;
- other.

No overdue notification/escalation automation is allowed before this decision is approved.

### DST-006 — Completion evidence

**Question:** What evidence is required before a task can be completed/verified?

Options:
- `NONE`.
- `NOTE`.
- `PHOTO_OR_FILE`.
- `TEMPLATE_DECLARED` — approved SOP/task type specifies allowed/required evidence.
- `OTHER`.

If media/file evidence is required, Owner must also approve the retention/access rule before production use.

## 3. Minimum versioned data contract — decision-independent core

The following structural entities are safe to design offline because they preserve identity/history without deciding the six policies above.

### 3.1 SOP template

Minimum fields:

- immutable UUID identity;
- stable `code`;
- `name`;
- `domain`;
- registry lifecycle compatible with the canonical SOP registry: `DRAFT | APPROVED | RETIRED`;
- audit timestamps/actors.

### 3.2 SOP template version

Minimum fields:

- `sop_template_id`;
- positive version number;
- Business Rule references;
- approved timestamp/actor when approved;
- content/step snapshot identity.

Historical executions must keep the exact SOP version they executed. Approved historical versions are not mutated in place; changes create a new version.

### 3.3 SOP step

Minimum fields:

- `sop_version_id`;
- deterministic sequence;
- instruction/title;
- template-defined requiredness and optional metadata.

Any exception trigger, due default, role default or evidence requirement is inactive until its corresponding Owner decision/Business Rule is approved.

### 3.4 Execution + step execution

Minimum fields:

- exact `sop_version_id`;
- `store_id` / operating location;
- scheduled/started/completed timestamps where applicable;
- explicit responsible-person reference when assigned;
- per-step completion actor/time/note;
- optional exception linkage.

The system may store an explicit assignee but may not infer one automatically until DST-003 is approved.

### 3.5 Exception

Minimum fields:

- execution and optional step reference;
- reported actor/time;
- description;
- closure timestamps/actors.

Severity taxonomy and automatic trigger logic are deliberately omitted until Owner approves them.

### 3.6 Corrective task

Minimum fields:

- optional source exception reference;
- title/description;
- explicit assignee reference;
- due timestamp when explicitly supplied by an approved rule/user;
- completion actor/time;
- verification actor/time;
- closure actor/time.

The schema supports traceability but does not decide who may perform each transition.

### 3.7 Audit event

Append-only event identity for material SOP/Task transitions:

- entity type/id;
- action/event name;
- actor;
- timestamp;
- sanitized metadata.

## 4. Decision-dependent data intentionally deferred

Do not finalize or enforce until the matching decision is approved:

- checklist outcome enum / skip semantics → DST-001;
- automatic exception trigger → DST-001;
- automatic corrective-task creation → DST-002;
- assignee-selection algorithm → DST-003;
- transition authorization / separation of duties → DST-004;
- due defaults, overdue timers, escalation recipients → DST-005;
- evidence table/storage/retention/requiredness → DST-006.

## 5. Offline migration plan

### M0 — Decision gate

- Owner answers DST-001..DST-006.
- Convert approved answers into traceable Business Rules.
- If an answer changes SOP content semantics, create/update an APPROVED SOP artifact before implementation.

Side effect: documentation only.

### M1 — Additive schema draft

After M0 only, prepare additive SQL for:

- SOP template + immutable versions + steps;
- execution + step execution;
- exception;
- corrective task;
- append-only audit event.

No legacy object is dropped.

### M2 — Sandbox security / access model

- RLS required on every table exposed through Supabase Data API.
- Define read/write policies and RPCs from approved actor rules.
- Do not use public SECURITY DEFINER functions as a shortcut around RLS.
- No production apply.

### M3 — Read adapters

Connect Manager/Employee/Owner read surfaces. Missing/unauthorized sources remain fail closed.

### M4 — Explicit write workflow

Only implement transitions supported by approved Business Rules:

- execute/check step;
- report exception;
- create/assign task;
- complete;
- verify;
- close.

Automation is still disabled unless explicitly approved.

### M5 — Policy automation

Only where the approved decisions require it:

- automatic exception creation;
- automatic corrective task creation;
- automatic assignee resolution;
- overdue/escalation notifications;
- evidence enforcement.

### M6 — Day-13 write-flow E2E

Use sanitized fixtures to prove:

- exact SOP version traceability;
- approved assignment/authority rules;
- exception → corrective task → verify → close;
- overdue behavior;
- evidence rule where applicable;
- forbidden actor/write regressions;
- audit trail.

### M7 — Production apply

Separate Owner approval is required for production DDL/backfill/cutover. TASK-026 does not perform it.

## 6. Non-negotiable guardrails

- no production migration/backfill in TASK-026;
- no write-capable Task UI before rules are approved;
- no automatic exception/corrective/escalation behavior before approval;
- no fabricated task metrics;
- no mutation of approved historical SOP versions;
- no private employee/media data committed to this public repository;
- RLS/security review required before any exposed production table;
- production apply remains an Owner approval boundary.

## 7. TASK-026 gate

The offline decision/data/migration package is complete when:

- all six Owner decisions are explicit and machine-readable;
- no option is silently selected;
- decision-independent entities are separated from policy-dependent automation;
- contract tests enforce the boundary;
- project state enters `WAIT_USER` until Owner answers DST-001..DST-006.

No write-capable SOP/Task implementation task is opened before the six decisions are approved.

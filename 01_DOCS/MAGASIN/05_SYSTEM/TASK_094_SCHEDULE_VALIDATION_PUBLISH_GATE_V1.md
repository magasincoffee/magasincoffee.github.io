# TASK-094 — Schedule Validation + Publish Gate V1

**Track:** WORKFORCE_OPERATIONS_V1  
**Execution mode:** OWNER_DIRECT_TO_WORK / MANUAL_WORK  
**Date:** 2026-09-22  
**Status:** PENDING_FINAL_GATE / IMPLEMENTATION_MERGED / POST_MERGE_FIX_GATE_ACTIVE  
**Production migration:** `20260921171458_task_094_schedule_validation_publish_gate_v1` — APPLIED  
**Production employee/generation/assignment/work_schedule test mutation:** NONE  
**Private employee data committed:** NONE  
**PFC cursor mutation:** NONE  
**Workforce Robot:** DISABLED  
**Next task:** TASK-095 remains STAGED until TASK-094 final closure

## 1. Five-Step decisions

### QUESTION

TASK-094 asked whether the existing Manager-direct scheduling primitives could be made authoritative for canonical Workforce V1 without reintroducing staffing-demand/Robot allocation semantics and without inventing destructive production cleanup.

Live inventory showed the correct reuse boundary already existed:

- `schedule_generation_runs`;
- `schedule_generation_assignments`;
- `work_schedules`;
- `create_schedule_generation`;
- `replace_schedule_generation_assignments`;
- `validate_schedule_generation_v1`;
- `review_schedule_generation`;
- `publish_schedule_generation`.

The task therefore hardens those primitives rather than creating a parallel scheduler or validator.

### DELETE

Deleted from canonical validation/publish semantics:

- `staffing_requirements` minimum/target/maximum coverage as a blocking publish rule;
- staffing-shortage warnings as a prerequisite for Manager scheduling;
- Robot/auto-generation dependency for validation or publication;
- client-only idempotency as an authority boundary;
- silent “choose newest DRAFT” behavior when multiple active generation versions exist.

No legacy production DRAFT was deleted.

### SIMPLIFY

Canonical server path:

```text
Manager create/resume
→ server locks store/week
→ exactly one active generation or fail closed
→ DRAFT mutation only
→ canonical validation
→ explicit REVIEWED transition with revalidation
→ Publish revalidation
→ lineage-backed official assignments
→ repeated publish returns stable already_published result
```

### ACCELERATE

Reused existing schema and RPC names. The only additive schema is audit/lineage metadata required to make publication traceable and idempotent.

### AUTOMATE

Server automation is limited to deterministic safety:

- transaction advisory lock for generation create/resume;
- canonical validation after DRAFT replacement;
- revalidation at review;
- revalidation at publish;
- deterministic source-generation lineage;
- idempotent same-generation republish response.

No automatic Employee allocation, review decision, publication, production cleanup or supersede/version workflow was invented.

---

## 2. Resume baseline and branch relationship

Resume branch:

`task-094-schedule-validation-publish-gate-v1`

Latest canonical main checked before continuation:

`d2f9c8332f759cacf042f9051625f37cba15712d`

Branch comparison at resume:

- ahead main: **13 commits**
- behind main: **0**
- reconciliation/rebase required: **NO**
- unrelated canonical track overwrite: **NONE**

Pre-evidence executable head:

`7f902df95ab05dd19fe66d0a458999782ca29bb8`

Executable tree at that head:

`f94f13c2d410dfdbd91910b321b8405e9a3ab66f`

PFC remains:

`TASK-068 → TASK-069`

Workforce Robot remains disabled.

---

## 3. Live production inventory before final source-control closure

Read-only observation:

**2026-09-22 00:49:30 ICT**  
(**2026-09-21 17:49:30 UTC**)

Observed production state:

- DRAFT generation runs: **3**
- distinct DRAFT store/week pairs: **2**
- duplicate DRAFT groups: **1**
- maximum DRAFTs in one store/week: **2**
- `schedule_generation_assignments`: **0**
- `work_schedules`: **0**

This state was inspected read-only. No cleanup, backfill, assignment creation or official schedule creation was performed.

---

## 4. Why TASK-094 does not add a one-active-DRAFT unique index

Production already contains one legacy store/week with two DRAFT rows.

Creating a partial unique index on active DRAFT rows would therefore require one of:

- destructive cleanup;
- arbitrary winner selection;
- cancellation/backfill;
- business version/supersede semantics that Owner has not defined.

TASK-094 rejects those options.

Instead, `create_schedule_generation` now:

1. requires authenticated ACTIVE OWNER/STORE_MANAGER;
2. validates active store and store scope;
3. acquires `pg_advisory_xact_lock` by store/week;
4. counts active `DRAFT/REVIEWED/PUBLISHED` generations;
5. returns the same DRAFT when exactly one exists;
6. raises `GENERATION_VERSION_CONFLICT` when more than one active generation exists;
7. rejects competing create after REVIEWED/PUBLISHED.

This is concurrency-safe and fail-closed without rewriting legacy production truth.

---

## 5. Production migration and exact live drift verification

Applied production migration:

`20260921171458_task_094_schedule_validation_publish_gate_v1`

Git source:

`07_DATABASE/migrations/20260921171458_task_094_schedule_validation_publish_gate_v1.sql`

Migration history confirms version:

`20260921171458`

### Additive columns

`schedule_generation_runs`:

- `reviewed_by uuid`
- `reviewed_at timestamptz`
- `published_by uuid`

`work_schedules`:

- `source_generation_id uuid`
- `source_generation_assignment_id uuid`

### Lineage indexes

- `idx_work_schedules_source_generation`
- `uq_work_schedules_source_generation_assignment`

The second index is unique for non-null `source_generation_assignment_id`, preventing duplicate official publication of the same generation assignment.

### Exact RPC body comparison

Live `pg_proc.prosrc` was compared against the exact `$function$` bodies stored in the branch migration.

All five are **exact matches**, with the only representation difference being the expected PostgreSQL leading/trailing newline wrapper in `prosrc`:

- `create_schedule_generation`: MATCH
- `replace_schedule_generation_assignments`: MATCH
- `validate_schedule_generation_v1`: MATCH
- `review_schedule_generation`: MATCH
- `publish_schedule_generation`: MATCH

All five are:

- language: `plpgsql`
- `SECURITY DEFINER`
- `search_path=public`

No live/source functional drift was found.

---

## 6. Canonical validation matrix

`validate_schedule_generation_v1` enforces the canonical TASK-094 blocking invariants.

| Invariant | Server result |
|---|---|
| authenticated ACTIVE Manager/Owner actor | enforced |
| Manager store scope | enforced |
| active generation store | enforced |
| Monday→Sunday generation week | enforced |
| competing active generation/version | fail closed |
| existing official schedule in same store/week | fail closed |
| Employee exists | enforced |
| Employee status ACTIVE | enforced |
| Employee role STAFF | enforced |
| assignment store matches generation | enforced |
| assignment within generation week | enforced |
| valid start/end interval | enforced |
| assignment remains DRAFT before review/publish | enforced |
| availability AVAILABLE/PREFERRED covers complete assignment | enforced |
| same-generation employee overlap | rejected |
| overlap with official PENDING/APPROVED schedule | rejected |
| max two assignments per employee/day | enforced across draft + official rows |

The canonical validator does **not** reference:

- `staffing_requirements`;
- minimum headcount;
- target headcount;
- maximum headcount;
- shortage/gap state;
- Robot allocation.

Availability preference remains capability/context. `preferred_store_id` is not promoted to an invented hard eligibility rule.

---

## 7. DRAFT-only mutation

`replace_schedule_generation_assignments`:

- locks the generation row;
- rejects non-DRAFT generation;
- validates Manager scope and active store;
- validates payload shape and required fields;
- rejects invalid interval/week/store/status;
- rejects missing Employee;
- writes only `schedule_generation_assignments`;
- calls the same canonical validator before transaction success;
- rolls back the replacement if validation fails.

It does not write official `work_schedules`.

---

## 8. Review revalidation

`review_schedule_generation`:

- locks the generation;
- obtains the same store/week advisory lock;
- revalidates canonical invariants immediately before DRAFT→REVIEWED;
- records `reviewed_by` and `reviewed_at`;
- repeated APPROVED review on an already REVIEWED generation returns `already_reviewed=true`;
- creates no official assignment.

This closes stale-client validation between DRAFT editing and Manager review.

---

## 9. Publish TOCTOU revalidation + lineage

`publish_schedule_generation`:

1. locks the generation;
2. obtains the store/week advisory lock;
3. returns idempotently if already PUBLISHED;
4. requires REVIEWED for first publication;
5. calls the canonical validator again immediately before official insert;
6. if revalidation fails, returns the generation to DRAFT and creates no official rows;
7. on success writes approved `work_schedules`;
8. stores:
   - `source_generation_id`;
   - `source_generation_assignment_id`;
9. records `published_by` and `published_at`;
10. transitions generation to PUBLISHED.

Same-generation retry after successful publication returns:

- `published=true`
- `already_published=true`
- `inserted_schedule_count=0`

and does not append duplicate official assignments.

---

## 10. E2E-03 — Schedule validation

Result:

**E2E-03 STRONG within deterministic/browser TASK-094 scope**

Manager canonical browser verifies:

- valid schedule passes without staffing demand;
- overlapping assignments reject server-side;
- failed replacement preserves prior DRAFT state;
- >2 assignments/day rejects;
- inactive Employee rejects;
- non-STAFF actor as assignment target rejects;
- out-of-week assignment rejects;
- assignment store mismatch rejects;
- inaccessible store create rejects;
- availability mismatch rejects;
- malformed payload rejects;
- Manager sees actionable canonical validation diagnostics;
- all failure paths leave official schedule count unchanged.

---

## 11. E2E-05 — Publish idempotency

Result:

**E2E-05 STRONG within deterministic/browser TASK-094 scope**

Browser proof covers:

- repeated create resumes the same DRAFT;
- legacy duplicate active DRAFT group fails with `GENERATION_VERSION_CONFLICT`;
- review retry produces one effective state transition;
- publish revalidates after REVIEWED;
- TOCTOU case: Employee changed to INACTIVE after review → publish fails, official rows remain 0, generation returns DRAFT;
- after restoring valid state and re-reviewing, first publish inserts the expected official rows;
- second publish inserts 0 additional rows;
- official row count is stable after retry;
- competing generation create after publication fails `GENERATION_ALREADY_PUBLISHED`.

---

## 12. Branch gate before evidence commit

Push People Shift run:

- run: **35632221769**
- job: **106440911232**
- head: `7f902df95ab05dd19fe66d0a458999782ca29bb8`
- runtime: **Node v20.20.2**
- TASK-091 canonical contract: **61/61 PASS**
- Schedule-first + published feedback: **9/9 PASS**
- People Shift deterministic: **38/38 PASS**
- Control Tower deterministic: **74/74 PASS**
- deterministic total: **182/182 PASS**
- browser suites: **8/8 PASS**
- failures: **0**

Browser PASS markers:

- Employee Swap
- Employee Give lifecycle
- Employee notification
- Employee availability canonical
- Employee attendance schedule-linked
- Manager Workforce canonical
- People Shift Day-10
- Control Tower

The Manager Workforce browser includes the new E2E-03/E2E-05 assertions described above.

Post-run branch verification proves every commit after tested executable head `7f902df95ab05dd19fe66d0a458999782ca29bb8` changes only this evidence Markdown file. No code, migration, workflow, fixture or test executable changed after run `35632221769`. Therefore the executable diff remains byte-identical to the green tested head; the required fresh PR-head event gate remains mandatory.

---

## 13. Source-control privacy/safety review

Pre-PR diff was scanned for newly added:

- UUID-shaped private identifiers;
- email addresses;
- JWTs;
- service-role markers/secrets;
- private-key markers;
- password/secret assignments.

Result:

**ZERO sensitive added-line hits**

Changed implementation/test files before this evidence document:

1. `.github/workflows/people-shift-tests.yml`
2. `05_MANAGER/Workforce/draft-publish-v1.js`
3. `07_DATABASE/migrations/20260921171458_task_094_schedule_validation_publish_gate_v1.sql`
4. `09_QA/people-shift/manager-workforce-canonical-browser.mjs`
5. `09_QA/people-shift/manager-workforce-canonical-fixture.html`
6. `09_QA/people-shift/manager-workforce-canonical.test.mjs`
7. `09_QA/people-shift/schedule-validation-publish-gate-v1.test.mjs`

No generated QA artifact is committed.

---

## 14. Production mutation statement

TASK-094 verification uses:

- source-controlled migrations/code/tests;
- synthetic local/browser fixture data;
- read-only live Supabase introspection after the already-applied migration.

Confirmed for final closure work:

- no fake production Employee created;
- no production generation created for testing;
- no production assignment created for testing;
- no production official `work_schedule` created for testing;
- no duplicate production DRAFT cleanup;
- no legacy generation cancellation/backfill;
- no official schedule rewrite;
- no permissions widening;
- no unrelated Supabase advisor remediation;
- no private Employee/HR data committed;
- no service-role key/credential committed.

The production migration itself had already been applied in the preceding TASK-094 work session. This PR synchronizes source control with that already-live migration and hardened RPC state; it does not conceal or reverse that ordering.

---

## 15. Known remaining semantic gap

TASK-094 deliberately does not invent the missing explicit schedule supersede/version workflow.

Current canonical behavior therefore fails closed when:

- more than one active generation exists for a store/week; or
- an official schedule already exists for the store/week and a new competing generation attempts canonical validation/publication.

Future supersede/version behavior requires explicit Owner-defined audit/version semantics.

This is a known configuration/product-policy gap, not an E2E-03/E2E-05 failure.

---

## 16. Implementation PR #239 and first exact post-merge attempt

Implementation PR:

**#239 — TASK-094: Schedule validation and publish gate V1**

Final implementation PR head:

`423a5712e71b93ce26cd1d27e66b06cc801d9dac`

PR-head People Shift:

- run: **35634925664**
- job: **106449889441**
- runtime: **Node v20.20.2**
- TASK-091: **61/61 PASS**
- Schedule-first + published feedback: **9/9 PASS**
- People Shift deterministic: **38/38 PASS**
- Control Tower deterministic: **74/74 PASS**
- deterministic total: **182/182 PASS**
- browser suites: **8/8 PASS**
- E2E-03: **STRONG / PASS**
- E2E-05: **STRONG / PASS**
- failures: **0**

Implementation merge SHA:

`083606b268c0da4026c3637c150481ac422e6581`

Collateral exact-merge workflows:

- GitHub Pages source validation run **35635140452** — SUCCESS
- Pages build/deployment run **35635138654** — SUCCESS

### First exact post-merge People Shift attempt

Exact merge-SHA People Shift run:

- run: **35635140238**
- job: **106450602564**
- exact head: `083606b268c0da4026c3637c150481ac422e6581`
- result: **FAILURE**
- failing step: `Run Employee attendance schedule-linked browser regression`

All attendance business checks passed, but browser diagnostics caught:

`TypeError: Cannot read properties of null (reading 'dataset')`

at:

`06_EMPLOYEE/attendance/engine-v1.js → bind()`

Root cause was a pre-existing iframe lifecycle race: `contentDocument` can exist transiently while `document.body` is still null. The old bind guard dereferenced `x.body.dataset` without first checking `x.body`.

This was a real final-gate defect, not ignored and not blind-rerun.

### Minimal final-gate repair on the same TASK-094 branch

The same branch was fast-forwarded to the implementation merge SHA; no new branch was created.

Minimal fix:

```text
if (!x || !x.body || x.body.dataset.employeeAttendanceEngine === '1') return;
```

A static regression assertion was added in:

`09_QA/people-shift/employee-attendance-schedule-linked.test.mjs`

No attendance business rule, RPC, schedule rule, permission or TASK-094 server semantic changed.

Fix executable head:

`cf3fb696458b2d0784ae5cb8e3333f99461b8cd3`

Fresh branch People Shift gate:

- run: **35635408693**
- job: **106451498684**
- runtime: **Node v20.20.2**
- deterministic total: **182/182 PASS**
- browser suites: **8/8 PASS**
- Employee attendance schedule-linked browser: **PASS**
- browser diagnostics: **0 page/console errors**
- failures: **0**

TASK-094 remains open until the repair PR, repair merge, fresh exact-main People Shift green, post-merge live reconciliation and canonical state closure complete.

---

## 17. Final-gate placeholders

The following values are intentionally not invented before the required remote gates complete:

- implementation PR: **#239**
- implementation final head: `423a5712e71b93ce26cd1d27e66b06cc801d9dac`
- implementation PR-head People Shift: **35634925664 / 106449889441 / GREEN**
- implementation merge SHA: `083606b268c0da4026c3637c150481ac422e6581`
- first exact post-merge People Shift: **35635140238 / 106450602564 / FAILURE — ROOT CAUSE FIXED**
- repair branch gate: **35635408693 / 106451498684 / GREEN**
- repair PR number: **PENDING_FINAL_GATE**
- repair final head: **PENDING_FINAL_GATE**
- repair PR-head People Shift run/job: **PENDING_FINAL_GATE**
- repair merge SHA: **PENDING_FINAL_GATE**
- final exact post-merge People Shift run/job: **PENDING_FINAL_GATE**
- exact post-merge collateral workflows: **PENDING_FINAL_GATE**
- post-merge live reconciliation timestamp: **PENDING_FINAL_GATE**
- final source-of-truth handoff: **PENDING_FINAL_GATE**

TASK-094 must not be marked DONE until all required PR-head, merge, exact post-merge and source-of-truth closure gates are green.

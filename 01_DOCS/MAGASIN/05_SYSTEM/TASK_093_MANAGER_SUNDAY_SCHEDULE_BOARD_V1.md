# TASK-093 — Manager Sunday Schedule Board V1

**Track:** WORKFORCE_OPERATIONS_V1  
**Execution mode:** OWNER_DIRECT_TO_WORK / MANUAL_WORK  
**Date:** 2026-09-21  
**Status:** DONE / E2E-02 STRONG / POST-MERGE GREEN  
**Production employee/schedule test data mutation:** NONE  
**Production schema migration:** NONE  
**Private employee data committed:** NONE  
**PFC cursor mutation:** NONE  
**Next task:** TASK-094 READY / MANUAL_WORK — DO NOT AUTO-RUN

## 1. Five-Step decisions

### QUESTION

TASK-093 asked whether Manager scheduling really needed the old prerequisite chain:

```text
staffing demand
→ Robot auto_generate
→ generation DRAFT
→ Manager edit
```

Read-only live inventory proved that it did not.

The existing production RPC `create_schedule_generation(store_id, week_start, algorithm_version)` already provides a permissioned Manager/Owner DRAFT container without reading staffing requirements and without executing an allocation algorithm.

### DELETE

Removed from the **active canonical Manager path**:

- Demand tab as a prerequisite;
- `get_workforce_staffing_requirements` from canonical scheduling startup;
- `auto_generate_schedule_generation` from canonical draft creation;
- `magasin:schedule-robot-request` as the only way to open a draft;
- “Robot xếp lịch” as the canonical scheduling owner;
- shortage/minimum-headcount language from the direct schedule board;
- Manager editing Employee availability as a scheduling prerequisite;
- `demand-v1.js` from the active Workforce module loader.

The legacy demand file remains in the repository for backward compatibility. It is not loaded by the canonical Workforce module.

### SIMPLIFY

Canonical Manager flow is now:

```text
Manager opens Xếp lịch
→ target next week
→ selected accessible store
→ get_manager_weekly_availability
→ list existing DRAFT
→ resume newest DRAFT OR create_schedule_generation(..., MANAGER_DIRECT_V1)
→ add/edit/remove assignments
→ replace_schedule_generation_assignments
→ DRAFT remains DRAFT
```

Review and Publish remain explicit downstream actions.

### ACCELERATE

Reused existing production primitives and existing generation tables. No scheduler-v2 and no schema migration were created.

### AUTOMATE

Only deterministic UX assistance remains automatic:

- next-week default;
- accessible-store projection;
- load availability;
- list/resume existing DRAFT;
- prevent same-page duplicate create with a busy lock;
- reload the same DRAFT.

No automatic allocation, review or publish was added.

---

## 2. Current flow before TASK-093

The active Manager Workforce module previously loaded:

- `demand-v1.js`;
- `review-v1.js`;
- `draft-publish-v1.js`;
- `official-v1.js`;
- `swap-approval-v1.js`.

The Review surface displayed Employee availability but also allowed `manager_update_employee_availability`.

The only active path into the draft editor was:

`magasin:schedule-robot-request → auto_generate_schedule_generation`.

The auto-generation function consumed staffing requirements and could clear/rebuild an existing DRAFT.

The draft editor itself already had useful reusable pieces:

- get generation assignments;
- replace assignments;
- availability-aware employee candidates;
- add/remove/edit;
- explicit validate/review/publish.

TASK-093 therefore refactored the entry path rather than rebuilding the editor.

---

## 3. Direct DRAFT primitive decision

### Decision

**REUSE existing `create_schedule_generation`. No new RPC/migration required.**

Exact live signature inspected read-only:

`create_schedule_generation(p_store_id uuid, p_week_start date, p_algorithm_version text) returns uuid`.

Verified semantics:

- auth required;
- role must be OWNER or STORE_MANAGER;
- store and week required;
- week_start must be Monday;
- STORE_MANAGER store scope is checked by `can_access_store`;
- inserts `schedule_generation_runs`;
- week_end = week_start + 6;
- status = DRAFT;
- created_by = auth.uid();
- does not read staffing requirements;
- does not allocate employees;
- does not publish official work_schedules.

TASK-093 calls it with:

`algorithm_version = MANAGER_DIRECT_V1`.

That value is provenance/origin metadata only; it does not invoke an algorithm.

---

## 4. Live schema / RPC inventory

Read-only Supabase inventory was performed against MAGASIN-NOIBO project `menvbzlsncmpuvnaifxa`.

Exact definitions were inspected for:

- `create_schedule_generation`;
- `list_schedule_generations`;
- `get_schedule_generation_assignments`;
- `replace_schedule_generation_assignments`;
- `validate_schedule_generation_v1`;
- `review_schedule_generation`;
- `publish_schedule_generation`;
- `auto_generate_schedule_generation`;
- `get_manager_accessible_stores`;
- `get_manager_weekly_availability`.

### schedule_generation_runs

Verified fields include:

- id;
- store_id;
- week_start;
- week_end;
- algorithm_version;
- status;
- total_hours;
- estimated_cost;
- coverage_score;
- skill_coverage_score;
- created_by;
- created_at;
- published_at;
- updated_at.

Status CHECK:

- DRAFT
- REVIEWED
- PUBLISHED
- CANCELLED

Week CHECK:

`week_end = week_start + 6`.

### schedule_generation_assignments

Verified fields include:

- id;
- generation_id;
- user_id;
- store_id;
- work_date;
- start_time;
- end_time;
- skill_code;
- skill_level;
- score;
- warning;
- status;
- note.

Existing server boundary `replace_schedule_generation_assignments` already requires:

- authenticated OWNER/STORE_MANAGER;
- generation exists and is DRAFT;
- Manager store scope;
- required assignment fields;
- end > start;
- assignment inside generation week;
- assignment store matches generation store;
- employee ACTIVE;
- valid skill level/status;
- no same-generation employee overlap.

TASK-094 still owns the full canonical validation/publish hardening. TASK-093 does not claim these existing checks are sufficient for TASK-094.

Both generation tables have RLS enabled.

---

## 5. Duplicate-DRAFT / resume finding

`schedule_generation_runs` has a normal index on:

`(store_id, week_start)`

but **no unique constraint** proving one active DRAFT per store/week.

Therefore TASK-093 does not claim server-level create idempotency.

Safest reuse path implemented:

1. call `list_schedule_generations(store, week)`;
2. filter DRAFT;
3. resume the newest DRAFT when present;
4. only call `create_schedule_generation` when none exists;
5. acquire same-page busy lock before create;
6. show a warning if multiple DRAFTs are detected.

This closes obvious UI retry/double-click duplication, but cross-tab/concurrent actor duplicate-DRAFT prevention remains an explicit TASK-094 server/idempotency gap.

No destructive cleanup of existing duplicate DRAFTs is performed.

---

## 6. Availability → DRAFT mapping

Availability remains Employee-owned input.

Manager availability surface now:

- calls `get_manager_accessible_stores`;
- calls `get_manager_weekly_availability`;
- defaults to canonical next week;
- is read-only;
- does not call `manager_update_employee_availability`;
- does not call staffing-demand or Robot generation;
- hands selected store/week to the direct schedule board.

Manager explicitly adds an availability interval into the local DRAFT.

Minimum assignment payload sent through the existing server RPC:

- user_id;
- store_id;
- work_date;
- start_time;
- end_time;
- skill_code = existing value or null;
- skill_level = existing value or 0;
- score = existing value or 0;
- warning = existing value or null;
- status = DRAFT;
- note = MANAGER_DIRECT_FROM_AVAILABILITY or existing note.

No shortage/headcount synthetic field is created.

---

## 7. Manager role/store boundary

The direct flow does not direct-write generation tables from the browser.

Role/store boundary remains in existing RPCs:

- `get_manager_accessible_stores`;
- `create_schedule_generation`;
- `list_schedule_generations`;
- `get_schedule_generation_assignments`;
- `replace_schedule_generation_assignments`.

The browser contains no direct protected-table mutation.

Employee cannot create the Manager DRAFT through this Manager surface.

Owner remains policy/exception authority; the canonical daily scheduling UI labels Manager as the scheduling actor.

---

## 8. Sunday / next-week behavior

Canonical scheduling target remains Asia/Ho_Chi_Minh Monday→Sunday.

Browser E2E fixture fixes local operating date to:

**Sunday 2026-09-27**

Expected/default target:

**Monday 2026-09-28 → Sunday 2026-10-04**

Opening the board itself performs no generation write.

Manager may navigate weeks for recovery/edit purposes; Sunday is the canonical operating day, not a hard technical lockout on every other day.

No exact Sunday cutoff clock time was invented.

---

## 9. UI simplification

Canonical Workforce presentation now prioritizes:

1. **Đăng ký / Availability**
2. **Xếp lịch**

The legacy Demand tab is hidden and `demand-v1.js` is no longer loaded by the active canonical Workforce module.

The scheduling board shows:

### Source
- Employee name;
- work date;
- available start/end;
- preferred store;
- availability type.

### Monday→Sunday board
- draft assignment;
- employee;
- start/end time;
- remove action.

### Actions
- select store;
- select week;
- create/resume DRAFT;
- add from availability;
- edit employee/time;
- remove;
- save;
- reload.

Review/Publish remain in a collapsed downstream compatibility section and are never invoked automatically by DRAFT save.

---

## 10. Demand / Robot decoupling proof

Canonical direct source files contain no prerequisite call to:

- `get_workforce_staffing_requirements`;
- `auto_generate_schedule_generation`;
- `magasin:schedule-robot-request`.

The active Workforce module loader no longer loads `demand-v1.js`.

The E2E fixture deliberately has no successful handler for staffing-demand or auto-generate. Any such call would fail the browser flow.

Final E2E observed direct RPC path:

```text
get_manager_accessible_stores
→ get_manager_weekly_availability
→ list_schedule_generations
→ create_schedule_generation
→ get_schedule_generation_assignments
→ replace_schedule_generation_assignments
```

The direct path recorded **0 demand/Robot prerequisite calls**.

---

## 11. No-auto-review / no-auto-publish proof

The `save()` implementation contains:

`replace_schedule_generation_assignments`

and does **not** contain:

- `validate_schedule_generation_v1`;
- `review_schedule_generation`;
- `publish_schedule_generation`.

Final browser proof after save:

- generation status = DRAFT;
- official work_schedules fixture count = 0;
- no review RPC called;
- no publish RPC called;
- no auto-generate RPC called;
- no staffing-demand RPC called.

Existing validate/review/publish calls remain explicit downstream controls for compatibility and later tasks.

---

## 12. E2E-02 result

E2E-02 is upgraded to:

**STRONG / CLOSED WITHIN TASK-093 DETERMINISTIC SCOPE**

Manager canonical browser passed the following direct-flow assertions:

1. Sunday defaults to exact next week without creating a DRAFT;
2. zero staffing-demand/Robot prerequisite calls;
3. Manager sees next-week availability;
4. double-click direct create is bounded to one create;
5. direct primitive uses `MANAGER_DIRECT_V1`;
6. Manager adds two assignments;
7. Manager edits one assignment time;
8. Manager removes and adds an assignment again;
9. save persists DRAFT only;
10. no auto-review/publish/official schedule;
11. reload resumes the same generation without duplicate create;
12. Availability tab handoff reopens the same direct DRAFT;
13. direct path remains free of demand/Robot calls after reload/handoff.

Collateral explicit downstream review/publish, official schedule, Swap and Give were also rechecked and remained green.

---

## 13. QA / PR-head

PR: **#235**

Final PR head:

`9e3b67d9db9d3409eedc9fbe4f36504537135538`

### Branch-push pre-PR gate

People Shift run:

- run: **35625832880**
- job: **106419845796**
- runtime: **Node v20.20.2**
- deterministic: **172/172 PASS**
- browser suites: **8 PASS**
- failures: **0**

### Final PR-head gate

People Shift Day-10 Tests:

- run: **35626025245**
- job: **106420484917**
- runtime: **Node v20.20.2**
- TASK-091 canonical contract: **61/61 PASS**
- Schedule-first compatibility: **7/7 PASS**
- People Shift deterministic: **30/30 PASS**
- Control Tower deterministic: **74/74 PASS**
- deterministic total: **172/172 PASS**
- Employee Swap browser: PASS
- Employee Give browser: PASS
- Employee notification browser: PASS
- Employee availability browser: PASS
- Employee attendance browser: PASS
- Manager Workforce browser: PASS
- People Shift Day-10 browser: PASS
- Control Tower browser: PASS
- failures: **0**

Collateral SOP Task PR run:

- run: **35626025284**
- conclusion: **SUCCESS**

---

## 14. Merge / exact post-merge

Merge SHA:

`01c910026ef29ce09935f5c6973800f9b6d0b58a`

Exact post-merge People Shift:

- run: **35626208876**
- job: **106421087895**
- exact head: `01c910026ef29ce09935f5c6973800f9b6d0b58a`
- runtime: **Node v20.20.2**
- deterministic: **172/172 PASS**
- all 8 browser suites: **PASS**
- Manager Workforce E2E: **PASS**
- failures: **0**

Exact post-merge SOP Task:

- run: **35626208892**
- conclusion: **SUCCESS**

GitHub Pages source validation:

- run: **35626208843**
- conclusion: **SUCCESS**

---

## 15. Files changed in implementation PR #235

1. `05_MANAGER/Workforce/draft-publish-v1.js`
2. `05_MANAGER/Workforce/engine-v1.js`
3. `05_MANAGER/Workforce/review-v1.js`
4. `05_MANAGER/runtime/manager-shell-v1.html`
5. `09_QA/people-shift/manager-workforce-canonical-browser.mjs`
6. `09_QA/people-shift/manager-workforce-canonical-fixture.html`
7. `09_QA/people-shift/manager-workforce-canonical.test.mjs`

No redundant workflow was added; existing People Shift and SOP path filters triggered automatically.

---

## 16. Remaining TASK-094 gaps

TASK-093 deliberately does **not** claim TASK-094 complete.

Remaining canonical server/publish gaps include:

- one-active-DRAFT uniqueness/idempotent create at server boundary;
- explicit max two assignments per employee/day;
- canonical no-overlap across complete official/draft context;
- final ACTIVE employee enforcement review;
- final Manager/store scope review;
- availability compatibility policy consolidation;
- remove staffing-demand coverage semantics from canonical validation where required;
- published mutation/version/audit policy;
- publish retry/idempotency;
- duplicate official assignment prevention.

Important compatibility debt:

`validate_schedule_generation_v1` still evaluates legacy `staffing_requirements` minimum/target/maximum coverage. TASK-093 therefore does not auto-run validation during direct DRAFT save. TASK-094 must reconcile canonical validation rather than silently treating legacy staffing demand as a required V1 rule.

---

## 17. Production mutation statement

TASK-093 used:

- source-controlled code changes;
- synthetic local browser fixtures;
- read-only live Supabase schema/function introspection.

Confirmed:

- no fake production employee created;
- no production schedule-generation row created for E2E;
- no production assignment created for E2E;
- no production official work_schedule created for E2E;
- no production schema migration applied;
- no table/RPC definition modified in production;
- no private Employee data committed;
- no real Employee UUID committed;
- no salary/private HR data committed;
- no service-role key/credential committed;
- no destructive write;
- no PFC cursor change;
- Workforce Robot remains disabled.

## TASK-093 result

**DONE / E2E-02 STRONG / POST-MERGE GREEN**

Handoff:

- TASK-093 = DONE
- TASK-094 = READY / MANUAL_WORK
- Workforce Robot = DISABLED
- PFC cursor remains TASK-068 → TASK-069
- TASK-094 must NOT auto-run.

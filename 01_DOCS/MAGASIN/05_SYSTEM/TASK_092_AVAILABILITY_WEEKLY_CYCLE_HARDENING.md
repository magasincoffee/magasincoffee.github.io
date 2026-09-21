# TASK-092 — Availability Weekly Cycle Hardening

**Track:** WORKFORCE_OPERATIONS_V1  
**Execution mode:** OWNER_DIRECT_TO_WORK / MANUAL_WORK  
**Date:** 2026-09-21  
**Status:** DONE / E2E-01 STRONG / POST-MERGE GREEN  
**Production availability data mutation:** NONE  
**Production schema migration:** NONE  
**Private employee data committed:** NONE  
**PFC cursor mutation:** NONE  
**Next task:** TASK-093 READY / MANUAL_WORK — DO NOT AUTO-RUN

## 1. Five-Step

### QUESTION

TASK-090 classified Availability as REUSE_AS_IS. TASK-092 therefore did not rebuild the capability. It verified the existing Employee engine, live RPC definitions, Manager reader and browser behavior, then closed only the weekly-lifecycle gaps required by Workforce V1.

### DELETE

TASK-092 did not add:

- a second availability engine;
- Manager scheduling;
- staffing-demand / “thiếu ca - đủ ca” semantics;
- schedule generation or publish;
- Swap / Give;
- attendance or payroll;
- approval workflow for availability;
- AI/preference scoring;
- synthetic “all day” semantics;
- max-hours/minimum-shift/required-days rules;
- rename-only state migration;
- production test employee or availability rows.

### SIMPLIFY

The active path remains:

```text
06_EMPLOYEE/runtime
→ 06_EMPLOYEE/availability/engine-v1.js
→ get_my_availability / save_my_availability / delete_my_availability
→ canonical next-week availability
```

No `availability-v2.js` or duplicate business logic was introduced.

### ACCELERATE

Only five runtime concerns were hardened:

1. canonical target-week calculation;
2. Monday→Saturday OPEN / Sunday CLOSED projection;
3. fail-closed write validation;
4. in-flight save/delete duplicate suppression;
5. reload/rollover regression.

### AUTOMATE

Only deterministic derivation and guard behavior were automated:

- derive next Monday;
- derive OPEN/CLOSED;
- reject invalid write before RPC;
- refresh from canonical RPC after mutation;
- deterministic browser regression.

No reminder automation was added.

---

## 2. Current behavior before TASK-092

The existing Employee engine already supported:

- next-week date selector;
- multiple windows on the same day;
- preferred store;
- save;
- delete;
- immediate reload/render;
- canonical RPC-only writes.

Before hardening, the engine initialized its target with:

`C.date.addDays(C.date.monday(), 7)`

but did not expose an explicit registration lifecycle and did not block Sunday writes.

The active save path also had no browser-side exact target-week validation and no in-flight save lock before asynchronous store resolution.

---

## 3. Exact runtime delta

Changed canonical owner:

- `06_EMPLOYEE/availability/engine-v1.js`

New behavior:

- derives `today` from `C.date.dateKey()`, which production Shared Core resolves in `Asia/Ho_Chi_Minh`;
- derives current Monday with `C.date.monday(today)`;
- derives target week as current Monday + 7 days;
- Sunday projects `REGISTRATION_CLOSED`;
- Monday→Saturday projects `REGISTRATION_OPEN`;
- closed registration remains readable but disables Employee save/delete controls;
- invalid/out-of-target-week date rejects before `save_my_availability`;
- malformed time rejects;
- `end <= start` rejects;
- only an active resolved store object with real id+code may be submitted;
- removed the previous fake store-code fallback;
- one save mutation owns an in-flight lock before any await;
- delete has per-id in-flight lock;
- page/frame reload performs read refresh only and does not re-submit prior mutation;
- target-week rollover rewrites date options and clears cross-wired prior-week projection.

Availability still means “Employee can work this time.” It does not create or publish an assignment.

---

## 4. Week / OPEN / CLOSED semantics

Canonical timezone remains:

**Asia/Ho_Chi_Minh**

Canonical week:

**MONDAY → SUNDAY**

Verified deterministic cases:

| Local date | Registration | Target week start |
|---|---|---|
| 2026-09-21 Monday | OPEN | 2026-09-28 |
| 2026-09-26 Saturday | OPEN | 2026-09-28 |
| 2026-09-27 Sunday | CLOSED | 2026-09-28 |
| 2026-09-28 Monday | OPEN | 2026-10-05 |

UTC boundary is covered through the TASK-091 canonical helper: `2026-09-27T17:30:00Z` resolves to Monday `2026-09-28` in Vietnam and therefore targets `2026-10-05`.

No exact Sunday clock-time cutoff was invented.

---

## 5. Employee write authorization

The active Employee UI now permits only:

- own canonical next-week read;
- create an interval inside the target next-week Monday→Sunday range while registration is OPEN;
- create multiple valid windows;
- delete a currently loaded next-week interval while registration is OPEN.

The active UI fails closed for:

- Sunday write;
- current-week write;
- arbitrary historical/future week write;
- malformed target date;
- blank/malformed time;
- end <= start;
- unresolved/malformed active store;
- repeated in-flight save;
- repeated in-flight delete.

The engine never writes `work_schedules`, schedule generation or publish state.

---

## 6. Manager read compatibility

The existing source-controlled Manager reader remains:

`get_manager_weekly_availability(p_store_id, p_week_start)`.

Its current source-controlled/live semantics were verified to require:

- Monday `p_week_start`;
- `Asia/Ho_Chi_Minh` default week calculation;
- exact `v_week_start ... v_week_start + 6` date range;
- ACTIVE employee;
- accessible store;
- store filter compatibility.

Employee target week and Manager reader therefore share the same Monday week identity.

TASK-092 did not change Manager scheduling UI.

---

## 7. Live RPC reproducibility finding

TASK-092 performed **read-only** Supabase introspection against project `menvbzlsncmpuvnaifxa`.

Exact live definitions were readable for:

- `get_my_availability(p_week_start date)`;
- `save_my_availability(p_availability_id uuid, p_work_date date, p_start_time time, p_end_time time, p_availability_type text, p_preferred_store_id uuid, p_note text)`;
- `delete_my_availability(p_availability_id uuid)`;
- `get_manager_weekly_availability(p_store_id uuid, p_week_start date)`.

Therefore these three Employee RPCs are **KNOWN_LIVE_DEPENDENCY**, not UNKNOWN.

Important finding:

- `get_my_availability` scopes rows to `auth.uid()` and requested seven-day range;
- `save_my_availability` enforces auth, required time, `end > start`, valid type and store access;
- `delete_my_availability` enforces self/Owner ownership;
- **save/delete do not currently enforce NEXT_WEEK or Sunday CLOSED at the server boundary**.

The live table `employee_availability` has RLS enabled, FK-backed `user_id` and `preferred_store_id`, `end_time > start_time` CHECK and availability-type CHECK.

TASK-092 deliberately did not create/apply a production RPC migration. The active UI now fails closed before unsafe writes, but direct authenticated RPC invocation can still bypass the weekly lifecycle policy.

This remaining server-enforcement risk is explicit and must not be represented as closed.

---

## 8. Interval / store semantics

Retained:

- multiple valid windows on the same day;
- `end > start`;
- preferred store as preference/context only.

Hardened:

- ISO target date must be one of the exact seven target-week dates;
- time must be valid `HH:MM`;
- resolved store must contain a real id+code and be active when status is present;
- fake fallback codes were removed.

Not invented:

- overlap merge/rejection policy;
- max availability hours/day;
- minimum interval length;
- required number of days;
- required number of intervals.

Live server currently allows overlapping availability rows. Because Owner has not locked a destructive merge/overlap policy for Availability, TASK-092 leaves that behavior unchanged and documents it rather than inventing a rule.

---

## 9. Reload / idempotency behavior

A real browser race was found during PR QA:

Initial implementation set `savePending` only after awaiting store resolution. Two rapid clicks could both pass the guard and issue duplicate saves.

Root cause was fixed by acquiring the save lock **before any asynchronous work**.

Final deterministic browser proof:

- one double-click burst → exactly **1** `save_my_availability` RPC;
- two valid windows on same day persist;
- iframe reload preserves both rows and the same target week;
- reload does not issue another save;
- one delete → exactly **1** delete RPC;
- deleted row remains absent after reload;
- Sunday summary remains readable while save/delete are disabled;
- next Monday rolls target week and old target-week rows do not cross-wire;
- injected current-week option is rejected before save RPC.

Server-side mutation idempotency beyond the UI lock is not claimed.

---

## 10. E2E-01 result

E2E-01 is upgraded from PARTIAL to:

**STRONG / CLOSED WITHIN DETERMINISTIC TASK-092 SCOPE**

Final Employee availability browser checks: **11/11 PASS**.

Covered:

1. single canonical engine;
2. exact next-week Monday→Sunday dates;
3. double-click bounded to one save mutation;
4. multiple windows preserved;
5. frame reload persistence;
6. delete + reload persistence;
7. Sunday CLOSED/readable;
8. Monday rollover/no cross-wire;
9. out-of-target-week write rejection;
10. canonical RPC-only path;
11. zero unexpected page/console/request/HTTP-5xx diagnostics.

Full production cross-role acceptance remains TASK-106/TASK-108 scope.

---

## 11. QA / regression

### PR head

PR: **#230**

Final PR head:

`bb6b757becd721d45ef7a33fba0494e4be901084`

People Shift Day-10 Tests:

- run: **35622155972**
- job: **106407578465**
- runtime: **Node v20.20.2**
- TASK-091 Workforce canonical contract: **61/61 PASS**
- Schedule-first compatibility: **7/7 PASS**
- People Shift deterministic: **23/23 PASS**
- Control Tower deterministic: **74/74 PASS**
- deterministic total: **165/165 PASS**
- Employee availability browser: **11/11 PASS**
- Employee Swap browser: PASS
- Employee Give browser: PASS
- Employee notification browser: PASS
- Employee attendance browser: PASS
- Manager Workforce browser: PASS
- People Shift Day-10 browser E2E: PASS
- Control Tower browser E2E: PASS
- failures: **0**

A same-head branch-push run `35622144863` also completed successfully.

### Merge

Merge SHA:

`d7519be95e334060d25dd3265a13b6eafc849606`

### Exact post-merge

People Shift Day-10 Tests:

- run: **35622556059**
- job: **106408928654**
- exact head: `d7519be95e334060d25dd3265a13b6eafc849606`
- runtime: **Node v20.20.2**
- deterministic total: **165/165 PASS**
- all 8 browser suites: **PASS**
- Employee availability browser: **11/11 PASS**
- failures: **0**

GitHub Pages source validation:

- run: **35622556056**
- conclusion: **SUCCESS**

---

## 12. Collateral regression repair

A pre-existing TASK-036 regression was red because a later `00_CURRENT_STATE.md` rewrite had removed the sentence proving Schedule-first remains a “proven vertical-slice pattern”.

TASK-092 restored that canonical continuity statement.

The test was not weakened.

PFC priority/cursor was not changed.

---

## 13. Files changed in PR #230

1. `.github/workflows/people-shift-tests.yml`
2. `01_DOCS/MAGASIN/00_CURRENT_STATE.md`
3. `06_EMPLOYEE/availability/engine-v1.js`
4. `09_QA/people-shift/employee-availability-canonical-browser.mjs`
5. `09_QA/people-shift/employee-availability-canonical-fixture.html`
6. `09_QA/people-shift/employee-availability-canonical.test.mjs`

The workflow change only adds existing canonical Workforce + Schedule-first regressions to the existing People Shift workflow. No redundant workflow was created.

---

## 14. Remaining risks / gaps passed forward

### R1 — Employee availability server lifecycle enforcement — OPEN

Live `save_my_availability` and `delete_my_availability` do not enforce target-next-week/Sunday closure server-side.

TASK-092 closes the active UI path only.

Before claiming hostile/direct-RPC resistance, a later authorized server-boundary hardening task must replace/guard these exact known signatures and regression-test compatibility. Do not invent a migration from memory.

### R2 — Availability overlap semantic — CONFIGURATION GAP

Live storage permits overlapping availability windows.

No Owner-approved Availability overlap merge/reject rule exists. Multiple non-overlapping windows remain supported. No destructive normalization was invented.

### R3 — Manager scheduling semantics — TASK-093

Manager Sunday scheduling must consume this same target-week identity without staffing-demand/Robot being a prerequisite.

### R4 — Publish validation — TASK-094

Availability hardening does not implement schedule overlap/max-two/scope/publish idempotency. Those remain TASK-094.

---

## 15. No-production-write confirmation

TASK-092 used sanitized local browser fixtures and read-only live metadata/function-definition queries.

Confirmed:

- no production availability row created/updated/deleted;
- no fake production employee created;
- no production DB migration applied;
- no production schema changed;
- no private employee data committed;
- no live user ID committed;
- no auth token/secret committed;
- no destructive migration;
- no Drive data accessed;
- no scheduling/publish/Swap/Give/attendance/payroll production mutation;
- no PFC cursor change.

## TASK-092 result

**DONE / E2E-01 STRONG / POST-MERGE GREEN**

Handoff:

- TASK-092 = DONE
- TASK-093 = READY / MANUAL_WORK
- Workforce Robot = DISABLED
- PFC cursor remains TASK-068 → TASK-069
- TASK-093 must NOT auto-run.

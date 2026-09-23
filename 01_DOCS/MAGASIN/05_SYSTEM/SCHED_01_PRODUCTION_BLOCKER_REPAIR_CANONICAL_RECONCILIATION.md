# SCHED-01 — Production Blocker Repair + Scheduling Canonical Reconciliation

**Task:** SCHED-01  
**Baseline:** `906dd7688dd45b8b46733b920ec8d264a3d2bcdc`  
**Priority gate:** `WORKFORCE_SCHEDULING_PRODUCTION_READINESS_V1`  
**Implementation status:** DONE / PRODUCTION REPAIRED / POST-MERGE GREEN  
**Scope guard:** no SCHED-02 role redesign; no TASK-108; Workforce Robot DISABLED; PFC unchanged.

## 1. Production root cause

Owner `/04_OWNER/Workforce/` → Xếp lịch boots the Owner Publish engine in this order:

1. `get_manager_accessible_stores()`
2. `list_schedule_generations(p_store_id,p_week_start)`
3. when a generation exists: `get_schedule_generation_assignments(p_generation_id)`
4. `get_manager_weekly_schedule(p_store_id,p_week_start)`

The exact production failure was reproduced inside a rollback-only / read-only probe:

```text
SQLSTATE 42702
column reference "store_id" is ambiguous
PL/pgSQL function get_schedule_generation_assignments(uuid)
select store_id into v_store from public.schedule_generation_runs where id=p_generation_id
```

The function uses `RETURNS TABLE(... store_id ...)`, therefore `store_id` is also a PL/pgSQL output variable. The unqualified column reference collided with that output variable.

The same ambiguity family existed in `get_schedule_generation(uuid)`: its `RETURNS TABLE` exposes both `id` and `store_id`, while a legacy existence check used unqualified `id` / `store_id`. Production reproduction returned SQLSTATE 42702 for `id`.

## 2. SCHED-01 DB repair

Production migration:

`20260923160755_sched_01_production_blocker_repair_v1`

Delta only:

- `get_schedule_generation(uuid)`: qualify generation columns through explicit aliases.
- `get_schedule_generation_assignments(uuid)`: qualify generation columns through explicit aliases.
- preserve `STABLE SECURITY DEFINER SET search_path=public`.
- preserve authenticated-only execution; anon/public EXECUTE revoked.
- no frontend bypass and no authority broadening.
- add `uq_schedule_generation_active_store_week_v1` partial unique guard for exactly one active `DRAFT|REVIEWED|PUBLISHED` generation per store/week.

## 3. Production data reconciliation

Pre-change read-only audit:

- active stores: 4
- active profiles: 4
- availability rows: 7
- schedule generation runs: 4
- generation assignments: 0
- official `work_schedules`: 0
- generation statuses: 4 DRAFT
- duplicate active generation groups: 1
- orphan generation assignments: 0
- orphan official schedules: 0
- duplicate source-assignment links: 0

The duplicate group was historical CN1 / week 2026-08-24 with two `RULE_V1` DRAFT rows created milliseconds apart. Both had zero assignments and no published schedule provenance.

Reconciliation policy is intentionally narrow:

- only a competing group where **all** active rows are DRAFT;
- every row has zero generation assignments;
- every row has zero linked published `work_schedules`;
- keep the newest row active;
- set older empty duplicate row to `CANCELLED`;
- never delete history.

Post-change live audit:

- schedule generation runs: 4
- statuses: 3 DRAFT + 1 CANCELLED
- duplicate active generation groups: 0
- generation assignments: 0
- official schedules: 0
- availability rows: 7
- orphan generation assignments: 0
- orphan official schedules: 0
- uniqueness guard present: YES
- generation reader anon EXECUTE: NO
- generation reader authenticated EXECUTE: YES
- deterministic repeated `list_schedule_generations` read: PASS
- live Owner-identity `get_schedule_generation` and `get_schedule_generation_assignments`: PASS

No fake Employee, Availability, Schedule, Give/Swap, Attendance or notification row was created.

## 4. ONE canonical scheduling truth

### Published assignment truth

`public.work_schedules` with current/published assignment state remains the **single official schedule truth**.

### Pre-publish working state

`schedule_generation_runs` + `schedule_generation_assignments` are the one canonical **working/draft version** before publish. They are not a second official truth.

### Availability input

`employee_availability` is scheduling input, not schedule truth.

### Canonical state flow

```text
employee_availability
  → schedule_generation_runs / schedule_generation_assignments
  → validate_schedule_generation_v1
  → review_schedule_generation
  → publish_schedule_generation
  → work_schedules (APPROVED official/current assignment truth)
  → Employee list_my_approved_schedules_v2
  → Give / Swap ownership transfer on same work_schedules identity
  → Attendance
```

## 5. OLD vs NEW path inventory

| Surface / path | Prior status | SCHED-01 classification | Canonical next use |
|---|---|---|---|
| `05_MANAGER/Workforce/draft-publish-v1.js` | Manager Direct implementation | **KEEP — canonical writer UI** | Availability → DRAFT → validate → REVIEWED → PUBLISH |
| `05_MANAGER/Workforce/official-v1.js` | Manager published schedule projection | **KEEP — canonical reader** | Reads `get_manager_weekly_schedule`; no direct schedule DML |
| `04_OWNER/Workforce/runtime/owner-workforce-runtime.html` | Owner wrapper on Manager shell | **WRAP / KEEP** | Owner projection over same scheduling truth |
| `04_OWNER/Workforce/03-publish/engine-v1.js` | Owner auto-generate/review/publish UI | **MIGRATE LATER / compatibility in SCHED-01** | Same generation + work_schedules truth; SCHED-05 decides Owner production UI |
| `auto_generate_schedule_generation` / staffing-demand path | Older auto-generation entry | **DEPRECATE AS PRIMARY OPERATOR PATH; DELETE-LATER only after proof** | May remain compatibility writer to same draft tables; no second truth |
| `list_schedule_generations` | Generation list reader | **KEEP** | Store/week scoped generation list |
| `get_schedule_generation` | Legacy generation detail reader; ambiguous | **KEEP + REPAIR** | Alias-qualified reader |
| `get_schedule_generation_assignments` | Active Owner/Manager draft reader; ambiguous | **KEEP + REPAIR** | Alias-qualified reader |
| `create_schedule_generation` | Server DRAFT creation/resume | **KEEP** | Exactly one active store/week generation |
| `replace_schedule_generation_assignments` | Server DRAFT replace | **KEEP** | Canonical draft writer |
| `validate_schedule_generation_v1` | Server validation | **KEEP** | Canonical validation gate |
| `review_schedule_generation` | Review transition | **KEEP** | DRAFT → REVIEWED |
| `publish_schedule_generation` | Publish transition | **KEEP** | REVIEWED → PUBLISHED + `work_schedules` |
| `get_manager_weekly_availability` | Manager scoped Availability read | **KEEP** | Input projection |
| `get_manager_weekly_schedule` | Manager/Owner official schedule read | **KEEP** | Reads APPROVED `work_schedules` |
| `06_EMPLOYEE/availability/engine-v1.js` | Employee availability UI | **KEEP** | Own availability RPCs only |
| `list_my_approved_schedules_v2` + Employee schedule engine | Employee published schedule | **KEEP — canonical Employee reader** | Self-only APPROVED week read |
| legacy `get_my_schedule()` | Older Employee reader | **DEPRECATE / DELETE-LATER** | Must not replace V2 canonical reader |
| `05_MANAGER/Lich-lam/` friendly route | Alternate URL surface | **REDIRECT/WRAP** | Must resolve to canonical Manager scheduling shell, no data authority |
| browser direct DML to `work_schedules` | Legacy-risk pattern | **DEPRECATED / FORBIDDEN** | Publish/ownership only through canonical RPCs |

No permanent dual-write is introduced by SCHED-01.

## 6. Authority preserved

- Employee: own Availability + own published schedule only.
- Manager: store scope through existing server authorization.
- Owner: enterprise oversight through the same schedule engine/truth.
- No SCHED-02 role redesign is performed here.

Current production account inventory has no ACTIVE `STORE_MANAGER` account. Therefore SCHED-01 does **not** create or mutate a fake Manager account. Manager scope is covered by executable fixture/security regression; live production Manager-account acceptance remains naturally unavailable until a real active Manager exists.

## 7. QA plan

SCHED-01 adds:

- `sched-01-production-blocker-repair.test.mjs`
  - exact ambiguity regression;
  - security grants;
  - safe duplicate reconciliation;
  - unique active-version guard;
  - one canonical path assertions.
- `sched-01-owner-workforce-publish-fixture.html`
  - Owner load + store switching over real Owner engine.
- `sched-01-three-role-browser-smoke.mjs`
  - Owner Publish load/store switch;
  - Manager canonical scheduling surface;
  - Employee published schedule reader;
  - Employee availability reader.

The existing People Shift workflow remains the full relevant Workforce regression pack.

## 8. Final closure evidence

### Exact implementation lineage

- baseline main: `906dd7688dd45b8b46733b920ec8d264a3d2bcdc`
- production migration: `20260923160755_sched_01_production_blocker_repair_v1`
- implementation PR: **#281**
- final PR head: `a5ee2ed673aaad68c6827f33b4752c6e8d394824`
- implementation merge: `d0f0069ec4060dacf2de4ca6f695b969066b517f`

### PR-head gates

Final People Shift:
- run **35887265500**
- job **107270491986**
- conclusion **SUCCESS**
- SCHED-01 Owner / Manager / Employee browser smoke: **PASS**
- full current People Shift / Workforce / Control Tower browser regression: **PASS**

An earlier PR-head run **35887065456** failed only in the new Owner QA fixture because its mock assignment reader defaulted to Store A after a Store B switch. The fixture was corrected to derive scope from `p_generation_id`; no production runtime or migration semantics were weakened.

### Exact-main gates

People Shift:
- run **35887441525**
- job **107271085777**
- conclusion **SUCCESS**
- `MANAGER_WORKFORCE_CANONICAL_BROWSER=PASS`
- `PEOPLE_SHIFT_DAY10_BROWSER_E2E=PASS`
- `TASK_107_WORKFORCE_FAILURE_RECOVERY_SECURITY=PASS`
- SCHED-01 three-role scheduling browser smoke: **PASS**
- browser diagnostics: no unexplained page / console / request / HTTP 5xx failures.

Pages source validation:
- run **35887441512**
- job **107271088697**
- conclusion **SUCCESS**

Pages build/deployment:
- run **35887440313**
- build job **107271089095** — SUCCESS
- deploy job **107271156826** — SUCCESS
- report job **107271156756** — SUCCESS

### Live final production reconciliation

Read-only production audit after the implementation merge:

- real ACTIVE Owner identity exercised the scheduling read path for all **4 ACTIVE stores**;
- repeated `list_schedule_generations(store,week)` results were deterministic;
- every returned generation could be read through repaired `get_schedule_generation` and `get_schedule_generation_assignments`;
- `get_manager_weekly_schedule(store,week)` returned no cross-store rows;
- `get_manager_weekly_availability(store,week)` loaded without SQL/RPC ambiguity;
- real ACTIVE Staff identity successfully read `list_my_approved_schedules_v2` and `get_my_availability`;
- production has **no ACTIVE STORE_MANAGER identity**, so no fake Manager was created merely for acceptance; Manager store-scope is covered by executable canonical browser/security regression and remains a SCHED-02 authority concern.

Final production counts:
- active stores: 4
- availability rows: 7
- generation runs: 4
- generation assignments: 0
- official schedules: 0
- duplicate active generation groups: **0**
- SCHED-01 migration present: YES
- active-generation uniqueness guard present: YES
- persistent fake production scheduling data created: **NO**

Security Advisor remained at the pre-change database baseline:
- RLS enabled/no policy: 11
- mutable search_path: 1
- anon SECURITY DEFINER executable: 18
- authenticated SECURITY DEFINER executable: 76

The repaired generation readers remain anon-denied and authenticated-enabled with fixed `search_path=public`.

## 9. Closure / handoff

`SCHED-01 = DONE`.

The production blocker is repaired, one canonical scheduling path is documented, active-generation split-brain is reconciled and guarded, and relevant exact-main gates are green.

Next:
- `SCHED-02 = READY / MANUAL_WORK`
- `SCHED-03 = BLOCKED_BEHIND_SCHED_02`
- `TASK-108 = PAUSED_BEHIND_SCHED_GATE`
- Workforce Robot = DISABLED
- PFC = UNCHANGED

# SCHED-02 — Three-Role Scheduling Authority Lock

**Task:** SCHED-02  
**Baseline:** `d94123915ccda9233bd2e0d97713cfcffee6863c`  
**Priority gate:** `WORKFORCE_SCHEDULING_PRODUCTION_READINESS_V1`  
**Execution mode:** MANUAL_WORK  
**Implementation status:** DONE / AUTHORITY LOCKED / POST-MERGE GREEN  
**Scope guard:** no SCHED-03 Employee UI redesign; no SCHED-04 Manager UX; no SCHED-05 Owner UX; TASK-108 PAUSED; Workforce Robot DISABLED; PFC unchanged.

## 1. Canonical truth unchanged

```text
Employee Availability
  → schedule_generation_runs / schedule_generation_assignments
  → validate_schedule_generation_v1
  → review_schedule_generation
  → publish_schedule_generation
  → work_schedules
```

`work_schedules` remains the single official/current assignment truth. Generation tables remain pre-publish working/DRAFT state.

## 2. Pre-change authority findings

Live audit found authority paths that violated or weakened the SCHED-02 contract:

1. `save_my_availability` allowed an OWNER to update another Employee's Availability by ID.
2. `delete_my_availability` allowed OWNER deletion of another Employee's Availability.
3. `manager_update_employee_availability` allowed Manager/Owner direct mutation of Employee Availability.
4. Store-transfer legacy approval mutated Employee Availability from Manager/Owner.
5. `auto_generate_schedule_generation` remained an authenticated legacy writer alongside Manager Direct.
6. `cancel_schedule_generation` remained an alternate generation state writer instead of canonical review rejection.
7. Owner staffing-demand mutators remained browser-executable; one was anon-executable.
8. `get_manager_weekly_availability` and `get_manager_accessible_stores` were anon-executable.
9. Legacy `get_my_schedule()` was anon/authenticated executable despite V2 being canonical.
10. `can_access_store` used substring matching for store codes and did not itself require an ACTIVE actor.
11. Generation detail readers retained a legacy `created_by=auth.uid()` fallback for non-Owner/non-Manager actors.
12. RLS policies still described direct official schedule INSERT/UPDATE paths even though browser table grants were absent.

## 3. Canonical authority matrix

| Capability | Employee | Manager | Owner | System |
|---|---|---|---|---|
| READ Availability | **SELF ONLY** via `get_my_availability` | exact authorized store via `get_manager_weekly_availability(store,...)` | enterprise or selected store through same scoped reader | validation may read canonical input internally |
| WRITE Availability | **SELF ONLY** via `save_my_availability/delete_my_availability` | **NO** | **NO** | **NO business-value invention** |
| CREATE DRAFT | NO | YES, exact authorized store | YES, same canonical RPC/state machine for exception authority | NO autonomous browser authority |
| REPLACE DRAFT | NO | YES, generation store must be authorized | YES through same RPC | deterministic validation only |
| VALIDATE | NO | YES, scoped generation | YES, same RPC | deterministic rules only |
| REVIEW | NO | YES, scoped generation | YES, same transition | no invented approval |
| PUBLISH | NO | YES, scoped + revalidated | YES, same transition | no independent publish path |
| VIEW PUBLISHED | **SELF APPROVED ONLY** via V2 | exact authorized store | enterprise/selected store | read/validation only |
| Direct protected-table DML | **FORBIDDEN** | **FORBIDDEN** | **FORBIDDEN** | privileged internal DB code only where canonical contract requires |

Owner authority is enterprise exception authority over the **same** state machine, not a second daily scheduling truth.

## 4. Migration

Production migration:

`20260923163337_sched_02_three_role_scheduling_authority_lock_v1`

Core changes:

- `can_access_store`: active actor required; Manager uses exact tokenized store-code scope; no substring authority.
- Manager readers require explicit `p_store_id`; cross-store remains server-denied.
- Generation detail/assignment readers are Owner/Manager only; the legacy creator fallback is removed.
- Employee Availability and published schedule RPCs require an ACTIVE Employee/Staff actor and remain self-only.
- Employee Availability RLS becomes self-only defense in depth.
- protected scheduling tables expose no browser table privileges.
- official `work_schedules` INSERT/UPDATE policies are removed; official writes stay behind canonical RPC lifecycle.
- legacy/duplicate authenticated authority revoked from:
  - `manager_update_employee_availability`
  - `create_store_transfer_request`
  - `review_store_transfer_request`
  - `get_manager_transfer_requests`
  - `auto_generate_schedule_generation`
  - `cancel_schedule_generation`
  - `upsert_workforce_staffing_requirement`
  - `delete_workforce_staffing_requirement`
  - `get_my_schedule`
  - `list_my_approved_schedules_v1`

No business rows are deleted or rewritten by SCHED-02.

## 5. OLD / NEW inventory

| Path | SCHED-02 classification | Authority after SCHED-02 |
|---|---|---|
| `create_schedule_generation` | **KEEP** | canonical Owner/Manager draft create |
| `replace_schedule_generation_assignments` | **KEEP** | canonical Owner/Manager draft replace |
| `validate_schedule_generation_v1` | **KEEP** | canonical validation |
| `review_schedule_generation` | **KEEP** | canonical DRAFT→REVIEWED / reject transition |
| `publish_schedule_generation` | **KEEP** | canonical REVIEWED→PUBLISHED + `work_schedules` |
| Manager Direct `draft-publish-v1.js` | **KEEP** | primary daily operator UI |
| `list_my_approved_schedules_v2` | **KEEP** | Employee self-only canonical published reader |
| Employee Availability RPCs | **KEEP + HARDEN** | active Employee self-write/self-read only |
| `get_manager_weekly_availability/schedule` | **KEEP + HARDEN** | explicit Manager store scope; Owner enterprise/selected scope |
| `list/get generation` readers | **KEEP + HARDEN** | active Owner/Manager only |
| Owner runtime wrapper | **WRAP / KEEP** | read/exception projection over same canonical truth |
| Owner legacy edit/transfer controls | **DEPRECATE ACTIVE AUTHORITY / UI CLEANUP SCHED-05** | server execution revoked |
| Owner `auto_generate_schedule_generation` button/path | **DEPRECATE ACTIVE WRITER / UI CLEANUP SCHED-05** | server execution revoked |
| staffing requirement reader | **KEEP COMPATIBILITY READ** | scoped support/Control Tower read only |
| staffing requirement mutators | **DEPRECATE / DELETE-LATER** | no browser execution |
| `cancel_schedule_generation` | **DEPRECATE / DELETE-LATER** | canonical rejection is review RPC |
| `get_my_schedule`, V1 reader | **DEPRECATE / DELETE-LATER** | no browser execution |
| historical DB functions/assets | **KEEP HISTORY, DELETE-LATER AFTER PROOF** | no parallel mutation authority |

SCHED-02 intentionally does not perform the Owner UX cleanup reserved for SCHED-05; the deprecated UI calls are server-denied and therefore no longer authority paths.

## 6. Production reconciliation

Pre-change:
- ACTIVE roles: Owner 1; Staff 1; Accountant 2; Store Manager 0
- active stores: 4
- Availability: 7
- generation runs: 4
- generation assignments: 0
- official schedules: 0
- transfer requests: 0
- staffing requirements: 110
- duplicate active generation groups: 0
- orphan generation assignments: 0
- orphan official schedules: 0

Rollback-only migration validation: **PASS**.

Post-change read-only audit:
- all counts above remain unchanged;
- Owner live scheduling reads pass across all 4 active stores;
- Owner repeated Availability reads are deterministic;
- no cross-store rows returned in store-selected published schedule read;
- real ACTIVE Employee own Availability and own published schedule reads pass;
- Employee generation/draft read is denied;
- deprecated authenticated writer/read authority: all checked paths = **FALSE**;
- canonical create/replace/validate/review/publish auth surface = **TRUE**;
- protected scheduling table browser INSERT/UPDATE authority = **FALSE**;
- duplicate active generation groups = 0;
- no persistent fake production data created.

Production has no ACTIVE `STORE_MANAGER`; SCHED-02 did not create one. Manager scope is proven by executable fixture/browser/security tests and live server contract inspection.

Security Advisor database delta:
- RLS enabled / no policy: 11 → 11
- mutable search_path: 1 → 1
- anon SECURITY DEFINER executable: **18 → 13**
- authenticated SECURITY DEFINER executable: **76 → 66**
- leaked-password protection warning: 1 → 1

No new advisor category was introduced; exposed privileged RPC surface was reduced.

## 7. QA / closure

Targeted tests:
- exact-token store scope;
- active actor gates;
- Employee self-only Availability and V2 published schedule;
- Owner/Manager-only draft readers;
- legacy writer revocation;
- direct-table DML revocation;
- one canonical Manager writer;
- Owner compatibility paths server-deactivated.

Browser smoke:
- Manager canonical store scoped create + cross-store deny;
- stale publish server revalidation;
- Employee forged publish request rejected at RPC boundary;
- Employee V2 own schedule projection;
- Owner store switching without stale cross-store projection.

### Final implementation lineage

- baseline main: `d94123915ccda9233bd2e0d97713cfcffee6863c`
- production migration: `20260923163337_sched_02_three_role_scheduling_authority_lock_v1`
- implementation PR: **#283**
- final PR head: `0c0cda8e011755ef9e580742e1ec92d908440012`
- implementation merge: `a01d8bdb940c443fb2b3abc42275a0827db2b71a`

PR-head People Shift:
- run **35890338421**
- job **107280905324**
- conclusion **SUCCESS**
- deterministic checks: **300/300** = 77 Workforce + 9 schedule-first + 140 People Shift + 74 Control Tower
- `SCHED_02_THREE_ROLE_SCHEDULING_AUTHORITY_LOCK=PASS`
- `SCHED_02_THREE_ROLE_AUTHORITY_BROWSER=PASS`
- full existing browser regression pack: PASS

The earlier PR-head run `35890269533` failed only because the new static test asserted the profile status expression before normalization, while the implementation correctly used `v_status<>'ACTIVE'`. The assertion was corrected; no production migration/runtime authority semantics changed.

Exact-main People Shift:
- run **35890519746**
- job **107281516643**
- conclusion **SUCCESS**
- deterministic checks: **300/300**
- SCHED-02 targeted authority marker: PASS
- SCHED-02 three-role browser authority marker: PASS
- `TASK_107_WORKFORCE_FAILURE_RECOVERY_SECURITY=PASS`
- `MANAGER_WORKFORCE_CANONICAL_BROWSER=PASS`
- `PEOPLE_SHIFT_DAY10_BROWSER_E2E=PASS`
- `CONTROL_TOWER_BROWSER_E2E=PASS`

Exact-main Pages:
- source validation `35890519568 / 107281515853` — SUCCESS
- build `35890518178 / 107281517379` — SUCCESS
- deploy `35890518178 / 107281586624` — SUCCESS
- report `35890518178 / 107281586517` — SUCCESS

### Final live read-only production audit

After implementation merge:
- ACTIVE Manager identity exists: **NO**
- active stores: 4
- Availability rows: 7
- generation runs: 4
- generation assignments: 0
- official schedules: 0
- transfer requests: 0
- duplicate active generation groups: 0
- deprecated authority checked: **ALL DENIED**
- protected scheduling browser DML: **ZERO**
- Owner live read path over all four active stores: PASS and deterministic on reload
- Employee real ACTIVE self Availability + published schedule reads: PASS
- Employee generation/draft read: DENIED

Security Advisor final database profile remains:
- RLS enabled/no policy: 11
- mutable search_path: 1
- anon SECURITY DEFINER executable: 13
- authenticated SECURITY DEFINER executable: 66
- leaked-password protection warning: 1 (unrelated auth configuration)

No fake Manager, Employee, Availability, generation, assignment or schedule row was created.

## 8. Closure / handoff

`SCHED-02 = DONE`.

Canonical authority is now:
- Employee = active self-only Availability writer + self-only APPROVED schedule reader;
- Manager = active exact-store scoped canonical scheduling operator;
- Owner = active enterprise exception/oversight actor using the same state machine;
- System = deterministic validation/lifecycle only;
- browser direct protected scheduling DML = forbidden;
- deprecated duplicate writers = server-deactivated.

Next:
- `SCHED-03 = READY / MANUAL_WORK`
- `SCHED-04 = BLOCKED_BEHIND_SCHED_03`
- `TASK-108 = PAUSED_BEHIND_SCHED_GATE`
- Workforce Robot = DISABLED
- PFC = UNCHANGED

The canonical closure SHA is recorded on the merged SCHED-02 state-only closure PR metadata after merge.

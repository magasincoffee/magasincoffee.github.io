# MAGASIN — Workforce Scheduling Production Readiness V1 — Source of Truth

**SoT ID:** WORKFORCE_SCHEDULING_PRODUCTION_READINESS_V1  
**Owner decision date:** 2026-09-23  
**Status:** OWNER APPROVED / HARD GATE ACTIVE  
**Priority:** P0  
**Execution mode:** MANUAL_WORK  
**Workforce Robot:** DISABLED  
**Timezone:** Asia/Ho_Chi_Minh

## 1. Owner decision / hard gate

Scheduling for the three roles — **Employee, Manager, Owner** — is the current production-readiness gate.

This gate **MUST be completed and canonically CLOSED before any unrelated new Workforce work may start or resume**.

- TASK-108 and later unrelated Workforce work are paused behind this gate.
- Only one SCHED task may be active at a time.
- SCHED-01 → SCHED-09 execute in order unless a proven production blocker requires a bounded hotfix inside the active SCHED task.
- No AUTO_CONTINUE by Robot. Workforce Robot remains DISABLED.
- PFC remains unchanged unless the Owner explicitly reprioritizes it.
- The already-merged Auth Password Reset hotfix is treated as completed prerequisite context; no new unrelated auth/product work may preempt this scheduling gate.

The scheduling gate is not DONE because CI is green. It closes only after live three-role acceptance, clean data reconciliation, professional UI/UX, and canonical closure evidence.

## 2. Product objective

One scheduling truth must drive all three role experiences:

```text
Employee Availability
        ↓
Manager / authorized Owner Scheduling
        ↓
DRAFT → REVIEWED → PUBLISHED
        ↓
work_schedules / canonical published assignment truth
        ↓
Employee schedule visibility
        ↓
Give / Swap
        ↓
current schedule owner
        ↓
Attendance
        ↓
Confirmed work time
        ↓
Payroll source
```

There must not be separate Employee, Manager, and Owner schedule truths.

Role projections differ; canonical schedule truth does not.

## 3. Role operating model

### Employee

Employee may:
- register own next-week Availability;
- read own published schedule;
- navigate current/next week according to canonical week semantics;
- request Give/Swap through the canonical lifecycle;
- use Attendance only for schedules currently owned by that Employee.

Employee may not:
- directly create/publish official schedules;
- edit another employee's schedule;
- use stale ownership after Give/Swap;
- mutate protected scheduling tables directly from the browser.

### Manager

Manager is the normal daily scheduling operator for authorized stores.

Manager may:
- read scoped Employee Availability;
- build a store schedule;
- save DRAFT;
- review;
- publish through server-authorized canonical flow;
- handle scoped Give/Swap approvals.

Manager must be fail-closed outside canonical store scope.

### Owner

Owner has enterprise oversight and exception authority.

Owner may:
- select stores;
- inspect scheduling readiness/status across stores;
- inspect Availability and published schedules;
- use the same canonical scheduling engine when intervention is required.

Owner must not create a parallel scheduling truth or bypass canonical validation/state transitions.

## 4. Data cleanliness — mandatory invariants

Production data must remain clean and non-overlapping.

Required invariants:
1. **ONE_CANONICAL_SCHEDULE_TRUTH** — no competing active schedule tables or write paths.
2. Published/current schedule ownership is derived from canonical schedule/assignment truth only.
3. No duplicate active assignment identity for the same logical schedule.
4. No orphan schedule assignment, invalid Employee reference, or unresolved store ownership may be silently accepted.
5. Store scope must be explicit and unambiguous in SQL/RPC code; ambiguous column references such as unqualified `store_id` are forbidden.
6. Browser direct DML into protected canonical schedule tables is forbidden unless an existing canonical contract explicitly permits it.
7. Give/Swap must mutate ownership through existing server-validated primitives; they must not create duplicate schedules as a side effect.
8. Production QA may not leave persistent fake Employee, Availability, Schedule, Give/Swap, Attendance, or notification data.
9. Every SCHED task must record pre-change and post-change read-only production reconciliation.
10. Any cleanup migration must be deterministic, reviewable, rollback-validated where applicable, and must not silently delete valid production history.

## 5. Old/new version policy

The project must preserve clear version lineage.

### Current vs next

- **Current/live version:** the deployed Workforce scheduling implementation inherited from TASK-092→107.
- **Next/canonical production-ready version:** `WORKFORCE_SCHEDULING_PRODUCTION_READINESS_V1`.

### Rules

- Do not overwrite historical behavior without documenting the replacement.
- Old active routes/RPCs/components must be classified as one of: `REUSE`, `WRAP`, `REDIRECT`, `DEPRECATE`, `DELETE_AFTER_PROOF`.
- A legacy path may remain temporarily for compatibility, but it must not retain parallel mutation authority.
- No permanent dual-write.
- If a temporary compatibility bridge is unavoidable, it must have:
  - one canonical writer;
  - explicit read/write direction;
  - start and removal condition;
  - deterministic reconciliation;
  - tests proving no split-brain data.
- Historical code moved to `99_LEGACY` or marked deprecated must not remain an active authority path.
- Schema/data changes use versioned migrations. No rename-only or destructive migration solely for cosmetic alignment.
- Each SCHED closure must identify:
  - old path/version;
  - new path/version;
  - migration/reconciliation behavior;
  - deprecated path removal status.

## 6. Professional UI/UX gate

Scheduling is not production-ready until the UI is professional and operationally usable.

Mandatory quality:
- unified MAGASIN visual language across Employee / Manager / Owner;
- responsive mobile + desktop behavior;
- clear typography, spacing, hierarchy and consistent components;
- no raw SQL/RPC/auth error strings shown to normal users;
- explicit loading, empty, success, validation, stale-data and error states;
- double-submit prevention;
- clear current week / next week / store context;
- role-appropriate navigation and actions;
- touch-friendly controls for mobile use;
- accessible labels and keyboard-safe basic interaction;
- no horizontal overflow at canonical mobile viewport;
- no duplicate or dead navigation;
- Owner/Manager scheduling must be understandable without repository knowledge.

A technically functional but visibly unfinished UI does **not** satisfy this gate.

## 7. Execution tasks and realistic estimate

| Task | Scope | Definition of Done | Estimate |
|---|---|---|---:|
| **SCHED-01** | Production blocker audit + repair | Fix live Workforce Publish failure including ambiguous `store_id`; identify canonical scheduling RPC/schema/routes; Manager/Owner scheduling data loads successfully | **2–4h** |
| **SCHED-02** | Role + authority lock | Employee=self, Manager=store-scoped, Owner=enterprise; server-side authorization; no cross-store/cross-user bypass | **2–3h** |
| **SCHED-03** | Employee Schedule UI V1 | Availability + own schedule + week navigation + Give/Swap entry integrated into one professional Employee scheduling surface | **4–6h** |
| **SCHED-04** | Manager Scheduling V1 | Availability → assign Employee → validation → DRAFT → REVIEWED → PUBLISH works end-to-end for scoped store | **8–12h** |
| **SCHED-05** | Owner Scheduling V1 | Enterprise/store selector, scheduling status, canonical schedule inspection/intervention without parallel truth | **4–6h** |
| **SCHED-06** | Three-role synchronization | Publish/Give/Swap ownership changes reconcile consistently across Employee, Manager, Owner using the same schedule identity | **3–5h** |
| **SCHED-07** | Professional UI/UX + responsive pass | MAGASIN design system consistency, polished states, responsive/mobile, no raw technical UX | **4–6h** |
| **SCHED-08** | Live three-role E2E acceptance | Real acceptance flow proves role routing, data scope, schedule publish, Employee visibility, Give/Swap sync, reload/recovery/security | **4–6h** |
| **SCHED-09** | Production reconciliation + canonical closure | CI + browser + security + read-only live audit + version/deprecation evidence + exact-main closure | **2–3h** |

**Estimated total:** 33–51 working hours.  
**Typical focused elapsed execution:** 4–6 working days.  
**Contingency:** up to 7 working days if legacy SQL/RPC/runtime defects are discovered.

Estimates are planning ranges, not permission to weaken acceptance criteria.

## 8. Task sequencing / release gate

```text
SCHED-01
  ↓
SCHED-02
  ↓
SCHED-03
  ↓
SCHED-04
  ↓
SCHED-05
  ↓
SCHED-06
  ↓
SCHED-07
  ↓
SCHED-08
  ↓
SCHED-09
  ↓
SCHEDULING_PRODUCTION_READINESS_V1 = CLOSED
  ↓
Only then may unrelated Workforce work resume
```

A task may not be marked DONE on documentation alone. Executable evidence is required where applicable.

## 9. Three-role acceptance scenario — mandatory

At minimum, final live-safe E2E must prove:

1. Employee A logs in and registers Availability for the target week.
2. Manager for Store X sees A's canonical Availability.
3. Manager assigns A to a shift and publishes through canonical flow.
4. Employee A reloads and sees exactly the published shift.
5. Owner selects Store X and sees the same schedule identity/owner/status.
6. A initiates a valid Give to Employee B.
7. B accepts and Manager approves through canonical Give lifecycle.
8. The same schedule identity now belongs to B.
9. Employee A no longer has attendance authority for that shift.
10. Employee B sees the shift and has authority according to canonical policy.
11. Manager and Owner both see B as current owner.
12. Reload/retry does not create duplicate schedules or restore stale ownership.
13. Cross-store/cross-user unauthorized attempts fail closed.
14. Browser console/request diagnostics contain no unexplained production errors.

No E2E close may depend solely on fixture HTML when a live production path can be validated safely.

## 10. SCHED-01 known production evidence

Owner live test found:

```text
Không tải được Workforce Publish:
column reference "store_id" is ambiguous
```

This is a P0 scheduling blocker.

SCHED-01 must identify the exact SQL/RPC ambiguity, qualify column references/parameters explicitly, preserve store authorization, and add regression coverage for the live execution path.

## 11. QA and closure requirements

Every SCHED task:
1. QUESTION current live/repository truth first.
2. DELETE duplicate authority/path before adding new layers.
3. SIMPLIFY around existing canonical primitives.
4. ACCELERATE through shared engine/components/tests.
5. AUTOMATE only after deterministic rules are proven.

Required evidence as applicable:
- implementation head;
- PR head;
- merge SHA;
- deterministic tests;
- browser tests;
- exact-main post-merge gates;
- Pages validation/deployment for public assets;
- security boundary checks;
- production read-only reconciliation;
- migration version + rollback-only validation for DB changes;
- no persistent production fixture residue.

## 12. Gate closure criteria

`WORKFORCE_SCHEDULING_PRODUCTION_READINESS_V1` may be marked **CLOSED** only when all are true:

- SCHED-01→09 = DONE;
- live scheduling blocker = resolved;
- Employee/Manager/Owner all have usable scheduling UI;
- one canonical schedule truth drives all roles;
- Manager scoped scheduling/publish works;
- Owner enterprise view works;
- Employee published schedule works;
- Give/Swap ownership synchronizes across all three roles;
- Attendance authority follows current schedule owner;
- old/new version and deprecation mapping is documented;
- no duplicate active mutation paths;
- production data reconciliation is clean;
- relevant CI/browser/security gates are green;
- UI is professionally finished, responsive, and free of raw technical errors;
- live-safe three-role acceptance scenario passes;
- canonical closure SHA is recorded.

Until then:

**DO NOT MOVE TO UNRELATED WORK.**

## 13. Current cursor

On activation of this SoT:

```text
priority_gate = WORKFORCE_SCHEDULING_PRODUCTION_READINESS_V1
current_sched_task = SCHED-04
next_sched_task = SCHED-05
SCHED-01 = DONE
SCHED-02 = DONE
SCHED-03 = DONE
SCHED-04 = READY / MANUAL_WORK
unrelated_workforce_progression = BLOCKED_UNTIL_SCHED_GATE_CLOSED
TASK-108 = PAUSED_BEHIND_SCHED_GATE
Workforce Robot = DISABLED
PFC = UNCHANGED
```

## 13A. SCHED-01 closure checkpoint

SCHED-01 closed after the production blocker was reproduced and repaired at the server/RPC layer.

Canonical evidence:
- evidence: `05_SYSTEM/SCHED_01_PRODUCTION_BLOCKER_REPAIR_CANONICAL_RECONCILIATION.md`;
- migration: `20260923160755_sched_01_production_blocker_repair_v1`;
- implementation PR #281;
- final PR head `a5ee2ed673aaad68c6827f33b4752c6e8d394824`;
- implementation merge `d0f0069ec4060dacf2de4ca6f695b969066b517f`;
- PR-head People Shift `35887265500 / 107270491986` — SUCCESS;
- exact-main People Shift `35887441525 / 107271085777` — SUCCESS;
- exact-main Pages validation `35887441512 / 107271088697` — SUCCESS;
- exact-main Pages deployment `35887440313 / 107271156826` — SUCCESS;
- live final audit: all 4 active Owner store reads deterministic; Employee schedule/availability reads pass; duplicate active generation groups = 0; no fake scheduling data.

SCHED-02 now owns the next sequential gate: role + authority lock. The overall Scheduling Production Readiness gate remains **ACTIVE**.

## 13B. SCHED-02 closure checkpoint

SCHED-02 closed after three-role scheduling authority was locked server-side without changing the canonical scheduling truth.

Canonical evidence:
- evidence: `05_SYSTEM/SCHED_02_THREE_ROLE_SCHEDULING_AUTHORITY_LOCK.md`;
- migration: `20260923163337_sched_02_three_role_scheduling_authority_lock_v1`;
- implementation PR #283;
- final PR head `0c0cda8e011755ef9e580742e1ec92d908440012`;
- implementation merge `a01d8bdb940c443fb2b3abc42275a0827db2b71a`;
- PR-head People Shift `35890338421 / 107280905324` — SUCCESS;
- exact-main People Shift `35890519746 / 107281516643` — SUCCESS;
- exact-main Pages validation `35890519568 / 107281515853` — SUCCESS;
- exact-main Pages deployment `35890518178 / 107281586624` — SUCCESS;
- final live audit: Owner 4-store reads PASS; Employee self reads PASS; Employee draft read denied; deprecated authority denied; protected browser DML zero; duplicate active generation groups zero;
- production has no ACTIVE STORE_MANAGER and no fake Manager was created.

SCHED-03 now owns the next sequential gate: Employee Schedule UI V1. The overall Scheduling Production Readiness gate remains **ACTIVE**.

## 13C. SCHED-03 closure checkpoint

SCHED-03 closed after the Employee Schedule UI was consolidated onto the canonical V2 published-schedule reader without adding scheduling authority or database state.

Canonical evidence:
- evidence: `05_SYSTEM/SCHED_03_EMPLOYEE_SCHEDULE_UI_V1.md`;
- baseline: `78653a591d86784c8a16cdcbcb24ac82ce8a9447`;
- implementation PR #285;
- final PR head `336319b5fb3cd68e4f5a38cb157d4c834fc429cb`;
- implementation merge `e96098f8484685f224a13ea5a5bbee5887b9dbb4`;
- PR-head People Shift `35894008824 / 107293276082` — SUCCESS;
- exact-main People Shift `35894187738 / 107293880804` — SUCCESS with 308/308 deterministic checks;
- exact-main Pages validation `35894187653 / 107293880794` — SUCCESS;
- exact-main Pages deployment `35894185846 / 107293956273` — SUCCESS;
- production V2 real-Employee read path: PASS / empty current and next week because production has no official shifts;
- legacy Employee schedule readers remain denied;
- direct browser `work_schedules` SELECT/INSERT/UPDATE remain denied;
- no SCHED-03 migration or fake production scheduling data;
- Security Advisor database counts remain 11/1/13/66.

SCHED-04 now owns the next sequential gate: Manager Scheduling V1. The overall Scheduling Production Readiness gate remains **ACTIVE**.

## 14. Canonical precedence

For production scheduling readiness, this document is the active Owner release instruction.

Where an older planning document says Workforce may proceed directly to TASK-108 or another unrelated task, this hard gate takes precedence until SCHED-09 closes.

Existing canonical semantic contracts remain valid unless a SCHED task explicitly and safely reconciles a contradiction with evidence.

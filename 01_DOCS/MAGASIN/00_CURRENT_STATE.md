# MAGASIN — Current State

Last updated: 2026-09-28

## Current program

**MAGASIN Business OS V1 — Five-Step / Profitability & Cash first**

Canonical architecture:

- `00_ENTERPRISE_ARCHITECTURE_5_STEP_PROFIT_CASH.md` — READ FIRST;
- `02_PROFITABILITY_CASH/FINANCIAL_BASELINE.md`;
- `02_PROFITABILITY_CASH/PFC_8H_V2_EXECUTION_PLAN.md`;
- `02_PROFITABILITY_CASH/TASK_060_ACTUAL_CASH_BALANCE_SOURCE_TRUTH_V1_EVIDENCE.md`;
- `02_PROFITABILITY_CASH/TASK_061_CASH_BALANCE_FINANCIAL_TRUTH_CONTRACT_V1_EVIDENCE.md`;
- `02_PROFITABILITY_CASH/TASK_062_CASH_BALANCE_SOURCE_MAPPER_V1_EVIDENCE.md`;
- `02_PROFITABILITY_CASH/TASK_063_CASH_SOURCE_COVERAGE_V1_EVIDENCE.md`;
- `02_PROFITABILITY_CASH/TASK_064_CASH_BRIDGE_SOURCE_INTEGRATION_V1_EVIDENCE.md`;
- `02_PROFITABILITY_CASH/TASK_065_CASH_TRUTH_REGRESSION_AND_EVIDENCE.md`;
- `02_PROFITABILITY_CASH/TASK_066_OPEX_SOURCE_INVENTORY_V1_EVIDENCE.md`;
- `02_PROFITABILITY_CASH/TASK_067_OPERATING_COST_TRUTH_CONTRACT_V1_EVIDENCE.md`.

## Auth production readiness — AUTH-PROD CLOSED

**Search key:** `AUTH-PROD`  
**Track:** `MAGASIN_AUTH_PRODUCTION_READINESS_V1`  
**State:** `CLOSED / PRODUCTION_READY=YES / AUTH_AND_ONBOARDING_SCOPE`

UI/UX V2 remains presentation-closed. The separate AUTH-PROD production-readiness track opened on 2026-09-27 to correct real Auth/onboarding lifecycle defects and is now canonically CLOSED. The exact-main production cutover proved registration, confirmation, PENDING escape/switch-account, Owner activation, ACTIVE username/email login, role routing, logout, recovery, cold/reload/back behavior, bounded invalid-credential retry and duplicate-username handling. This closure applies to Auth/onboarding scope only and does not mark independent PFC or Workforce tracks complete.

Canonical AUTH-PROD records:

1. `05_SYSTEM/MAGASIN_AUTH_PRODUCTION_READINESS_SOURCE_OF_TRUTH.md`
2. `05_SYSTEM/MAGASIN_AUTH_PRODUCTION_READINESS_EXECUTION_PLAN.md`
3. `05_SYSTEM/MAGASIN_AUTH_PRODUCTION_READINESS_CLOSURE_EVIDENCE.md`
4. `05_SYSTEM/MAGASIN_AUTH_PROD_007_EXACT_MAIN_CUTOVER_EVIDENCE.md`

Current AUTH-PROD cursor: **CLOSED**. AUTH-PROD-001→008 are DONE. Exact executable cutover was proven on `8c2080614837d1638f8c983796817aa143f5c7c2`; subsequent pre-closure drift through `c76ad69ea23f33cd364c34e16021ff329e70f0c4` is documentation/evidence-only. Any later Auth incident must open a new generation.

## Schedule-first continuity

Schedule-first remains a **proven vertical-slice pattern** for canonical capability ownership, server/RPC boundaries, role projection, explicit Manager approval and deterministic E2E. Workforce Operations V1 reuses that proven pattern without changing Profitability & Cash as the enterprise priority.

## PFC execution handoff

Execution generation:

`PFC_8H_V2_RUN_01`

Owner released PFC_8H_V2 on 2026-09-20.

Current state:

```text
PFC_3H_V1_RESTART_01 = COMPLETE
TASK-051 → TASK-067   = DONE
WAVE A — CASH TRUTH   = CLOSED
WAVE B — OPEX TRUTH   = ACTIVE

current_task          = TASK-068
TASK-068              = READY / AUTO_CONTINUE
next_task             = TASK-069
status                = READY
autonomy              = AUTO_CONTINUE
requires_user         = false
blocked               = false

Robot may execute     = true
```

TASK-060 source discovery is complete. It found no verified direct `OBSERVED_BALANCE` source in the bounded Drive evidence.

Current verified balance landscape:

- internal monthly cash reporting = `COMPUTED_BALANCE + MOVEMENT_ONLY`;
- physical till/safe = `NOT_CONNECTED`;
- business Bank balance/statement = `NOT_CONNECTED`;
- MoMo/wallet balance = `NOT_CONNECTED`;
- COD-held cash = `NOT_CONNECTED`;
- Owner-held company cash = `NOT_CONNECTED`;
- provider payout/account balance = `NOT_CONNECTED`.

Missing balance sources remain gaps; they do not pause PFC_8H_V2.

TASK-067 Operating Cost Truth Contract V1 is complete. Wave B now has a source-agnostic contract that reuses Financial Truth, keeps recognized cost separate from payment/settlement/context, requires COMPLETE proven coverage for ACTUAL period aggregates, and blocks unapproved shared-cost branch allocation. Source mapping/full-period OPEX remains incomplete. TASK-068 is now the active canonical task.

## Financial baseline state

**PARTIAL FINANCIAL BASELINE V1 IMPLEMENTED / DISCOVERY CONTINUES**

Implemented:

1. Financial Truth V1;
2. fail-closed Monthly Revenue Baseline V1;
3. Revenue Control Tower projection;
4. Cash event taxonomy;
5. deterministic Cash Bridge calculator;
6. Procurement supplier-payment → Cash mapping;
7. current Procurement AP point-in-time truth;
8. Partial Financial Baseline V1 composer;
9. Cash Truth Stack V1: point-balance contract + source mapper + source/account/period coverage + point-gated Cash Bridge source integration;
10. OPEX Source Inventory V1: recognition/payment/settlement/allocation/budget/not-connected source map;
11. Operating Cost Truth Contract V1: source-agnostic recognized-cost wrapper reusing Financial Truth.

The system does **not** claim:
- full P&L;
- complete month-end close;
- complete company Profit;
- full Bank/MoMo/COD truth;
- complete COGS/OPEX truth.

Missing evidence remains GAP / NOT_CONNECTED / ESTIMATE as appropriate and never defaults to zero.

## Final regression checkpoint

Wave-A Cash Truth closure (TASK-065):

- executable-drift compare from TASK-064 merge `f00279e99ed3d1bdc4e4b0ed9c7f26a3e6f3f177` to pre-closure current main: **NO EXECUTABLE DRIFT** in `02_CORE/**`, `09_QA/business-os/**` or Business OS workflow;
- fresh Business OS run `35480761123`, attempt 2, job `106005068731`:
  - Node v20.20.2;
  - Cash/Financial targeted regressions **237/237 PASS**;
  - full Business OS **354 logical checks / 0 fail**;
  - conclusion `success`;
- static scan of six Cash/PFC helpers: **0 operational DB write / RPC / external API / Drive call matches**;
- current real Cash profile remains fail-closed: known movements may remain visible, but current computed ending / observed ending / variance stay null where opening, full movement coverage or observed-ending evidence is incomplete.

Earlier TASK-059 no-code-churn checkpoint remains historical evidence; TASK-065 is the current Wave-A regression authority.

## Core invariants

These remain mandatory:

- missing != 0;
- ACTUAL / ESTIMATE / GAP / NOT_CONNECTED stay distinct;
- purchase != COGS;
- purchase/AP != cash movement;
- Revenue recognition != cash collection;
- FoodApp gross != settlement cash;
- payment method != account balance;
- current AP != historical AP;
- Cash != Profit;
- Profit requires compatible Revenue + COGS + Operating Costs;
- component failure stays isolated;
- unknown scope != ALL;
- ALL requires explicit aggregate proof.

## Current PFC V2 priority

### TASK-068 — Payroll Cost Mapper

Status:

`READY / AUTO_CONTINUE`

Goal:

Map bounded payroll/attendance evidence into the canonical TASK-067 Operating Cost Truth V1 without treating payroll calculation or payment as worked labor recognition.

TASK-067 is complete:

- contract: `02_CORE/contracts/operating-cost-truth.v1.json`;
- helper: `02_CORE/shared/operating-cost-truth-v1.mjs`;
- targeted tests: 31/31 PASS;
- PR #204 merge: `6233fc587921ba44a0b61a662b6b316ade8292c2`;
- exact post-merge Business OS run `35515946855`: Node v20.20.2, full 385/385 / 0 fail;
- exact-item ACTUAL remains possible with proven item semantics even if wider period coverage is PARTIAL;
- ACTUAL PERIOD_AGGREGATE requires COMPLETE proven coverage;
- PAYMENT_SOURCE / gross settlement / payout / budget / allocation context cannot become ACTUAL recognition by implication;
- shared-company branch allocation requires explicit approved rule;
- evidence: `02_PROFITABILITY_CASH/TASK_067_OPERATING_COST_TRUTH_CONTRACT_V1_EVIDENCE.md`.

Next queued task after TASK-068:

`TASK-069 — Rent / Utilities / Other OPEX Mapper`

## Remaining major gaps

Priority gaps after the completed run:

1. opening cash + observed ending cash source truth;
2. Bank / MoMo / COD account truth;
3. complete current FoodApp settlement;
4. complete payroll / rent / utilities / other OPEX recognition;
5. company-wide consumption-based COGS;
6. structured Owner contributions / withdrawals;
7. historical AP snapshots;
8. live reconciled Revenue reader where still not connected;
9. Profit ↔ Cash reconciliation;
10. Break-even / branch economics;
11. Pricing diagnosis.

## Working method

Every future requirement/change continues to use:

```text
QUESTION → DELETE → SIMPLIFY → ACCELERATE → AUTOMATE
```

For implementation tasks after explicit Owner release:

```text
Estimate → Implement → Unit → Fix → Regression → Integration → E2E → Docs/State → Commit → Next
```

## Safety

This repository is PUBLIC.

Never commit secrets, credentials, cookies, tokens, browser profiles, private employee/customer/financial records, production exports, Drive locators or other private operating evidence.

Google Drive evidence remains READ-ONLY unless the Owner explicitly changes that policy.

## Session handoff

Mandatory new-chat bootstrap:

1. **`00_ENTERPRISE_ARCHITECTURE_5_STEP_PROFIT_CASH.md` — READ FIRST / CANONICAL.**
2. `00_CURRENT_STATE.md`.
3. `05_SYSTEM/EXTERNAL_PROJECT_BOUNDARY_V1.md`.
4. `00_PROJECT_STATE.json`.
5. `00_TASK_QUEUE.md`.
6. `02_PROFITABILITY_CASH/FINANCIAL_BASELINE.md`.
7. `02_PROFITABILITY_CASH/TASK_066_OPEX_SOURCE_INVENTORY_V1_EVIDENCE.md`.
8. `02_PROFITABILITY_CASH/TASK_065_CASH_TRUTH_REGRESSION_AND_EVIDENCE.md`.
9. `02_PROFITABILITY_CASH/TASK_059_PFC_3H_FINAL_HANDOFF_EVIDENCE.md`.
10. `00_MASTER_PLAN.md`.
11. `06_DECISION_LOG.md`.
12. `00_CHATGPT_CONTEXT.md`.
13. repository/PR/CI state.

Repository evidence overrides stale chat memory.


## External project boundary

Canonical boundary: `05_SYSTEM/EXTERNAL_PROJECT_BOUNDARY_V1.md`.

- WEBAPP/business truth remains owned by `magasincoffee/magasincoffee.github.io`.
- Supervisor runtime/platform authority is external at `magasincoffee/magasin-supervisor`; MIG-001→MIG-007 are complete and the embedded executable Supervisor surface has been removed.
- `magasincoffee/magasin-media-robot` is not part of current WEBAPP execution scope; remaining mentions belong only to historical night-run/cross-project evidence.
- Pre-migration Brain/Worker, handoff and Robot documents are historical compatibility records, not current runtime authority.
- The project-owned Three-Lane integration contract and MAGASIN lane directive remain valid WEBAPP-side integration boundaries.

Historical migration/night-run evidence is preserved for provenance but must not be interpreted as current WEBAPP state.

## PFC 8-hour V2 — ACTIVE

Owner explicitly released `PFC_8H_V2` on 2026-09-20.

- generation: `PFC_8H_V2_RUN_01`
- current task: `TASK-068 — Payroll Cost Mapper`
- state: `READY / AUTO_CONTINUE`
- Wave A Cash Truth: `CLOSED / CASH TRUTH STACK V1 IMPLEMENTED / LIVE BALANCE EVIDENCE INCOMPLETE`
- Robot may execute: `true`
- Google Drive: `AUTHORIZED_READ_ONLY`
- primary queue: `TASK-060 → TASK-083`
- overflow if time remains: `TASK-084 → TASK-089`
- method: `QUESTION → DELETE → SIMPLIFY → ACCELERATE → AUTOMATE`
- emphasis: `SIMPLIFY → ACCELERATE → AUTOMATE`


## Workforce Operations V1 — architecture locked / MANUAL_WORK released

Owner approved and locked a parallel operational-relief architecture on 2026-09-21.

Canonical files:

- `05_SYSTEM/WORKFORCE_OPERATIONS_V1_ARCHITECTURE.md`
- `05_SYSTEM/WORKFORCE_OPERATIONS_V1_EXECUTION_PLAN.md`
- `05_SYSTEM/WORKFORCE_OPERATIONS_V1_E2E_ACCEPTANCE_CONTRACT.md`

Canonical scope:

```text
Employee next-week availability
→ Manager Sunday scheduling + publish
→ Monday active schedule
→ Swap / Give
→ Employee-selected actual attendance time
→ Manager exception review
→ Confirmed work time
→ Payroll
→ Employee self-check
```

Locked decisions:

- no staffing-gap / “thiếu ca - đủ ca” as Workforce V1 core;
- no realtime check-in/check-out;
- Employee chooses actual start/end time on app;
- Manager owns final schedule decision;
- Swap and Give remain in V1;
- payroll consumes confirmed work time, not raw attendance;
- Employee can self-check own payroll;
- final stability requires full E2E, exact post-merge E2E recheck and cold/reload E2E recheck.

Owner released this track for **DIRECT MANUAL WORK only**; Workforce Robot remains disabled. TASK-090→TASK-107 are **DONE**. TASK-108 is **IN_PROGRESS / MANUAL_WORK / GATE_A** after Brain accepted merged SCHED-09 final closure `a4eee395a670c949db26de13551f45c75faef68b` and explicitly released Gate A. The Owner-approved `WORKFORCE_SCHEDULING_PRODUCTION_READINESS_V1` scheduling readiness track is now canonically closed with this completed sequence: **SCHED-01 DONE → SCHED-02 DONE → SCHED-03 DONE → SCHED-04 DONE → SCHED-05 DONE → SCHED-06 DONE → SCHED-07 DONE → SCHED-08 DONE → SCHED-09 DONE / CANONICAL_CLOSED**. SCHED-06 proved three-role synchronization without adding a new writer or database truth: `work_schedules` remains the sole official/current assignment source; Employee reads through `list_my_approved_schedules_v2`; Manager and Owner read through `get_manager_weekly_schedule`; Give updates the current owner on the same schedule identity; Swap exchanges ownership on the same two canonical schedule identities; Attendance revalidates current `work_schedules.user_id` so stale owners fail closed after transfer. Primary implementation PR #292 final head `b5e34647c3df689d19e0812a5a6a356561a56c0e` merged as `c1fde945dfc706d728718d1c6fa68a5752f38786`; final Swap synchronization evidence hardening PR #295 final head `7a341acb0c393330297c15525c1bbaaa91ea5efd` merged as `37caf63f6c8aeb9e72ef1ba2aaba3f915b8a3884`. Final exact-main People Shift `35949595271 / 107475057325` is SUCCESS with 326/326 deterministic checks, including targeted SCHED-06 Give+Swap synchronization, Attendance current-owner authority, failure/recovery/security, Manager, Day-10 and Control Tower browser gates. Final Pages validation `35949595316 / 107475057514` and build/deploy/report `35949593630 / 107475056790 / 107475143290 / 107475143223` are SUCCESS. Production read-only reconciliation remains clean: 4 generations (3 DRAFT + 1 CANCELLED), 0 generation assignments, 0 official schedules, 0 active Give, 0 active Swap, 0 Attendance, and zero duplicate active generation/schedule-source identity groups. Latest scheduling migration is now `20260925033927_sched_08_live_validator_alias_fix_v1`, which fixes the live PostgreSQL 42702 ambiguity in `validate_schedule_generation_v1` without changing table/RLS/authority semantics. SCHED-07 remains canonically closed after PR #297 merged as `7977a5b80dea853e0ee2997656aa6157035fb633`. SCHED-08 is now canonically closed after live production RPC acceptance and PR #299 merged as `2e03cb2226813073f1e1449e03347a9210922534`: PR-head People Shift `36091391453 / 107934392499`, exact-main People Shift `36091508147 / 107934735123`, Pages validation `36091508122 / 107934735211`, and Pages build/deploy/report `36091507559 / 107934736273 / 107934768302 / 107934768275` are SUCCESS with 331/331 deterministic checks. Final live marker `SCHED08_FINAL_ROLLBACK_PASS` proved Availability → Manager publish → Employee/Owner same identity → Give A→B → current-owner Attendance authority → idempotent retry/scope fail-closed on production RPCs. Separate rollback audit proved zero temporary Availability/assignment/schedule/Give/Attendance residue and restored all temporary profile state. SCHED-09 is **DONE / CANONICAL_CLOSED** in the final-close target state. Fresh read-only production reconciliation at `2026-09-25T07:54:23.968Z` UTC is CLEAN: 4 ACTIVE stores, 7 Availability, 4 generations (3 DRAFT + 1 CANCELLED), 0 assignments, 0 official schedules, 0 Give, 0 Swap, 0 Attendance, zero duplicate/orphan/invalid-reference findings, required SCHED-01/SCHED-02/SCHED-08 migrations present, deprecated mutation authority denied, protected-table browser privileges denied, and advisor counts unchanged. Qualified canonical closure basis / exact-main qualification SHA is `3d736b47bbeec669e628eb3c6a832077931737a3`; `EXACT_MAIN_QUALIFICATION=PASS` because the compare from last fully-green executable main `2e03cb2226813073f1e1449e03347a9210922534` contains docs/state only and 207 relevant executable/workflow/test/database blobs have 0 mismatches, including identical People Shift workflow blob `b24b24923857f0fb3fcc9aa8dae20be67e92da07`. Prior full People Shift `36091508147 / 107934735123` is SUCCESS; exact-main Pages validation `36118165507 / 108017056130` and Pages build/deploy/report `36118164405 / 108017057281 / 108017103429 / 108017103572` are SUCCESS. Evidence: `05_SYSTEM/SCHED_09_PRODUCTION_RECONCILIATION_CANONICAL_CLOSURE.md`. `WORKFORCE_SCHEDULING_PRODUCTION_READINESS_V1` target state is **CLOSED**. TASK-108 Gate A is IN_PROGRESS / MANUAL_WORK with evidence at `05_SYSTEM/TASK_108_FINAL_REGRESSION_POST_MERGE_E2E_RECHECK.md`; Workforce Robot remains disabled, Gate B/Gate C are NOT_STARTED, and PFC remains independently unchanged at TASK-068 → TASK-069.

TASK-104 implementation PR #270 final head is `0ebccd1ef6857d3ec3d230c2349ff137b11e122c`, merged as `7fe4ed6be08c32cebc4772eccb7c45a6178bed33`. Production migration `20260923110608_task_104_employee_payroll_self_check_v1` is live. Final PR-head Business OS `35852662444` / job `107153751813` and People Shift `35852662604` / job `107153752386`, plus exact post-merge Business OS `35863208963` / job `107188248870` and People Shift `35863209080` / job `107188249831`, are GREEN on Node v20.20.2 with 265/265 deterministic checks and the full browser pack including `TASK_104_EMPLOYEE_PAYROLL_SELF_CHECK=PASS`. Pages validation `35863208908` and deployment `35863207656` are GREEN. Employee payroll read is parameterless/auth.uid self-only; Manager payroll read is read-only/store-scoped; PAYROLL_REVIEW remains explicit-permission-gated; no PAYROLL_AUTHORIZED live mapping, monetary formula or rate semantics were invented. Final production read-only reconciliation at 2026-09-23 12:54:53 UTC found 0 payroll entries, 0 employee constraints, no anon/authenticated direct payroll DML, fixed-search-path reader RPCs and the expected Security Advisor delta authenticated SECURITY DEFINER 74→76 for exactly two authenticated read RPCs; no fake production row was created.
TASK-105 implementation PR #272 final head is `df969a3dfadfbe7ed304375169db26de9108d252`, merged as `a07e2c5ac61855e2cc24e208e4800bdd1e3a2d48`. PR-head People Shift `35866302477` and SOP `35866302481`, exact post-merge People Shift `35866459893` and SOP `35866459899`, Pages validation `35866459728` and Pages deployment `35866458141` are GREEN. Exact-main deterministic regression is 272/272 and the Manager browser confirms legacy demand DOM is absent with canonical Xếp lịch / Đổi-cho-ca labels. TASK-105 introduced no migration or production data mutation; final read-only production truth remains 7 profiles / 4 ACTIVE, 0 employee constraints, 0 payroll entries and 0 attendance. Target reader grants remain anon-denied/authenticated-enabled; targeted database Security Advisor counts remain 11 RLS-no-policy / 1 mutable-search-path / 18 anon SECURITY DEFINER / 76 authenticated SECURITY DEFINER. An unrelated leaked-password-protection auth configuration warning is present and was not touched by TASK-105.
TASK-106 implementation PR #274 final head is `4a802119851ad27a3fc3070bfd3c4885a490b264`, merged as `6b49a9f4fa1e23aede7dae11801db30072a498ed`. PR-head People Shift `35870574516` / job `107213262792` was GREEN with 279/279 deterministic checks. First exact-main run `35870752068` caught a pre-existing availability iframe body-null race in diagnostics; repair PR #275 head `d8a7a7480fdb5ea32cd607c2d75764740981e7e4` merged as `52ea11a1f61a05806661b9082f6ffa4e18bf1bef`. Final exact-main People Shift `35871619679` / job `107216860337`, Pages validation `35871619719` and deployment `35871619799` are GREEN; deterministic regression is 280/280. TASK-106 cross-flow uses actual TASK-099/100/104 UI engines plus canonical TASK-102 helpers/contract and proves confirmed/revised-only payroll source, validated opaque pay rule, idempotent build retry, exact state rendering through Employee self-check, zero browser builder authority/table DML and no monetary semantics. Production remains read-only with 0 attendance/payroll rows; targeted Security Advisor counts remain 11/1/18/76. E2E-12 and E2E-13 are CLOSED. E2E-14 remains for TASK-107; live PAYROLL_AUTHORIZED mapping remains unresolved and not invented.

The currently active PFC cursor is unchanged and remains independently authoritative.

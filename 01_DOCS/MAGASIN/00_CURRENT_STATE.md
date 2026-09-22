# MAGASIN — Current State

Last updated: 2026-09-21

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
3. `00_PROJECT_STATE.json`.
4. `00_TASK_QUEUE.md`.
5. `02_PROFITABILITY_CASH/FINANCIAL_BASELINE.md`.
6. `02_PROFITABILITY_CASH/TASK_066_OPEX_SOURCE_INVENTORY_V1_EVIDENCE.md`.
7. `02_PROFITABILITY_CASH/TASK_065_CASH_TRUTH_REGRESSION_AND_EVIDENCE.md`.
8. `02_PROFITABILITY_CASH/TASK_059_PFC_3H_FINAL_HANDOFF_EVIDENCE.md`.
8. `00_MASTER_PLAN.md`.
9. `06_DECISION_LOG.md`.
10. `00_CHATGPT_CONTEXT.md`.
11. repository/PR/CI state.

Repository evidence overrides stale chat memory.


## Approved night run

Owner approved `NIGHT_RUN_2026-09-18` for the window `2026-09-18 23:15 +07 → 2026-09-19 09:15 +07`.

Execution scope is restricted to:

- `magasincoffee/magasincoffee.github.io`;
- `magasincoffee/magasin-media-robot`.

Windows reboot/logon recovery is installed and verified on the self-hosted machine:

- HKCU logon autostart registered;
- canonical GitHub Runner verified online;
- Supervisor verified online;
- Owner STOP latch is clear;
- Windows login/PIN is never bypassed.

The GitHub-hosted hard-stop guard will close the old night window at 09:15 +07 even if the PC is offline; an Owner-reprioritized task remains authoritative.


## Superseded Brain/Worker architecture

Canonical contract: `00_SUPERVISOR_BRAIN_WORKER_ARCHITECTURE.md`.

- exactly one Brain conversation coordinates work;
- up to 3 concurrent Workers initially;
- Worker prompts are dynamic Brain `DISPATCH` instructions, never a repeated canned Continue prompt;
- each completed Worker assistant turn is captured in full once and relayed to Brain;
- message bodies are transient and are not persisted in Git/log/status/registry;
- target missing, conversation missing, stalled and unavailable states fail closed after bounded recovery;
- only explicit ChatGPT `conversationFull` evidence authorizes rollover of an existing logical conversation;
- a new Worker slot requires a validated Brain directive plus free capacity;
- runtime auto-upgrade from `main` is part of TASK-049 acceptance.

## Three-Lane V1 active architecture

Canonical contract: `00_SUPERVISOR_THREE_LANE_ARCHITECTURE.md`.

- exactly three isolated project lanes;
- Brain identity is Owner-bound by explicit URL only; no active Brain auto-discovery;
- each lane has its own project name, Owner Brain URL, optional Owner Work URL / Robot-managed Work URL, status, message, START and STOP;
- Owner may paste/replace Work URL while a lane is stopped; if blank, Robot auto-creates it; automatic Work rollover still requires positive `conversationFull` evidence;
- each completed Work result is relayed exactly once to the same lane Brain with both screenshot and full captured text;
- Brain chat is never auto-rolled; if Brain is full/missing, that lane waits for Owner to replace its Brain URL;
- transient fetch/CDP/network failures auto-retry in `RECOVERING` and do not ask Owner unless the condition is non-transient/security-related;
- local lane config/status/evidence remain outside Git.

## TASK-049 acceptance checkpoint — E2/F

**Partial acceptance only — TASK-049 remains IN_PROGRESS.**

- **TASK-049/E2 — Owner-visible Robot UI/live status: ACCEPTED.** PR #141 merged at `f076779c4d1e3afd709385f0558a7185caeabf51`. The Owner-facing Control Panel is Vietnamese; `ĐANG LÀM VIỆC` is derived from live `runtime-status.json.worker_running` IDs reconciled to the local `orchestration.json` worker registry and displays Worker/task identity; visible time conversion uses Windows `SE Asia Standard Time` with no `ToLocalTime()`; recovery actions remain mutually exclusive.
- **TASK-049/F — runtime survival / technical-recovery acceptance: ACCEPTED.** Supervisor Autostart Install run `35414750942` completed with Supervisor Tests **212/212 PASS**, install success and `verify-survival` success. Install evidence: `WORKER_RETRY_REQUIRED=False`, `TECHNICAL_RECOVERY_STUCK=False`, `SUPERVISOR_ONLINE=True`, `BRAIN_WORKER_RUNTIME=True`, `BUSINESS_CHROME_ONLINE=True`, `BUSINESS_CHROME_CDP_HEALTHY=True`. Post-job survival evidence: `POST_JOB_SUPERVISOR_ALIVE=True`, `POST_JOB_BRAIN_WORKER_ALIVE=True`, `POST_JOB_ROBOT_CHROME_ALIVE=True`.
- This checkpoint does **not** assert the remaining TASK-049 acceptance items in `00_SUPERVISOR_BRAIN_WORKER_ARCHITECTURE.md`; those must be independently reconciled before TASK-049 can become DONE.



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

Owner released this track for **DIRECT MANUAL WORK only**; Robot remains disabled. TASK-090→TASK-099 are **DONE**. TASK-099 Employee Attendance Entry UI V1 is **DONE / E2E-09 PARTIAL — EMPLOYEE SIDE CLOSED / POST-MERGE GREEN** with evidence at `05_SYSTEM/TASK_099_EMPLOYEE_ATTENDANCE_ENTRY_UI_V1.md`. Workforce cursor is now TASK-100 **READY / MANUAL_WORK** → TASK-101; TASK-100 has not started, must not auto-run, and TASK-101→108 remain staged behind the sequential gate.

TASK-099 implementation PR #259 final head is `6cf5a186e06e5a73c84169ca84461ffad69a85b3`, merged as `57ea0f6b84fe3a70a6c7fd395adbb508cd597061`. PR-head People Shift `35743617316` / job `106799408008` and exact post-merge People Shift `35743790428` / job `106800003976` are GREEN on Node v20.20.2 with 217/217 deterministic checks, all 12 browser suites and 0 failures. Exact-main Business OS, Pages source validation and Pages deployment are also GREEN. The active Employee UI now reads current APPROVED schedule truth via `list_my_approved_schedules_v2`, reads persisted attendance via `get_my_attendance_v2`, and mutates only via `submit_manual_time_attendance_v1`; stale ownership fails closed and refreshes server truth, double-submit is bounded/idempotent, and raw SUBMITTED / NEEDS_REVIEW remains distinct from confirmed work time. Production read-only reconciliation at 2026-09-22 15:12:19 UTC found 0 attendance rows, 0 work schedules, 0 active Give/Swap and 0 duplicate active-attendance schedule groups. E2E-09 remains PARTIAL overall because Manager exception review and confirmed work time remain TASK-100+; the Employee side is CLOSED.

The currently active PFC cursor is unchanged and remains independently authoritative.

# MAGASIN — Current State

Last updated: 2026-09-19

## Current program

**MAGASIN Business OS V1 — Five-Step / Profitability & Cash first**

Canonical architecture:

- `00_ENTERPRISE_ARCHITECTURE_5_STEP_PROFIT_CASH.md` — READ FIRST;
- `02_PROFITABILITY_CASH/FINANCIAL_BASELINE.md`;
- `02_PROFITABILITY_CASH/TASK_059_PFC_3H_FINAL_HANDOFF_EVIDENCE.md`.

## PFC execution handoff

Execution generation:

`PFC_3H_V1_RESTART_01`

Final state:

```text
TASK-051 → TASK-059 = DONE
PFC_3H_V1          = COMPLETE

current_task       = TASK-060
TASK-060           = PLANNED / WAIT_OWNER_RELEASE
status             = WAIT_USER
autonomy           = PAUSED
requires_user      = true
blocked            = false
next_task          = null

Robot may execute  = false
```

The 3-hour Owner-released implementation scope is complete. This is an execution-scope boundary, not a business-rule blocker.

**Do not dispatch or implement TASK-060 without a new explicit Owner release. Silence is not approval.**

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
8. Partial Financial Baseline V1 composer.

The system does **not** claim:
- full P&L;
- complete month-end close;
- complete company Profit;
- full Bank/MoMo/COD truth;
- complete COGS/OPEX truth.

Missing evidence remains GAP / NOT_CONNECTED / ESTIMATE as appropriate and never defaults to zero.

## Final regression checkpoint

Fresh no-code-churn regression after TASK-058:

- Business OS run `35453257400`, attempt 2, job `105926272352`:
  - Node v20.20.2;
  - **214 logical checks / 0 fail**;
  - conclusion `success`.
- Owner Control Tower run `35448195046`, attempt 2, job `105926275823`:
  - Node v20.20.2;
  - **74/74 PASS / 0 fail**;
  - `CONTROL_TOWER_BROWSER_E2E=PASS`;
  - conclusion `success`.
- Static scan of the five PFC Core helpers: **0 financial write primitive matches**.
- Procurement production QA: `NOT_APPLICABLE` because TASK-059 changes no Procurement production/migration path.

Current executable main is equivalent to those tested executable trees; subsequent TASK-059 changes are documentation/state only.

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

## Next planned priority

### TASK-060 — Actual Cash Opening/Ending Source Truth V1

Status:

`PLANNED / WAIT_OWNER_RELEASE`

Goal:

Normalize evidenced opening cash, observed ending cash and explicit source/account coverage so Cash Bridge can progress toward COMPLETE.

Do not infer balance from CASH/BANK/MOMO payment-method rows.

TASK-060 is not released by completion of TASK-059.

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
6. `02_PROFITABILITY_CASH/TASK_059_PFC_3H_FINAL_HANDOFF_EVIDENCE.md`.
7. `00_MASTER_PLAN.md`.
8. `06_DECISION_LOG.md`.
9. `00_CHATGPT_CONTEXT.md`.
10. repository/PR/CI state.

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
- current task: `TASK-060 — Actual Cash Opening/Ending Source Truth V1`
- state: `READY / AUTO_CONTINUE`
- Robot may execute: `true`
- Google Drive: `AUTHORIZED_READ_ONLY`
- primary queue: `TASK-060 → TASK-083`
- overflow if time remains: `TASK-084 → TASK-089`
- method: `QUESTION → DELETE → SIMPLIFY → ACCELERATE → AUTOMATE`
- emphasis: `SIMPLIFY → ACCELERATE → AUTOMATE`

# MAGASIN — PFC 8-Hour Execution Plan V2

**Plan ID:** PFC_8H_V2  
**Architecture:** `00_ENTERPRISE_ARCHITECTURE_5_STEP_PROFIT_CASH.md`  
**Status:** OWNER APPROVED / STAGED / WAIT_OWNER_RELEASE  
**Budget:** up to ~8 hours active autonomous execution  
**Owner dependency during run:** NONE unless true Owner/security boundary

## Operating rule

Every task must execute:

```text
QUESTION → DELETE → SIMPLIFY → ACCELERATE → AUTOMATE
```

Special emphasis for this run:

```text
SIMPLIFY → ACCELERATE → AUTOMATE
```

Automation is allowed only after truth, scope, evidence and failure semantics are simplified and testable.

## Safety

Google Drive is authorized as READ-ONLY evidence.

Allowed:
- search/read/reconcile current real operating data;
- use privacy-safe aggregate evidence;
- use repository + Drive evidence to classify ACTUAL / ESTIMATE / GAP / NOT_CONNECTED.

Forbidden:
- edit/delete/share Drive data;
- commit raw private rows, Drive IDs/URLs, credentials or secrets;
- destructive production actions;
- synthetic financial actuals;
- pricing decisions before downstream readiness gates.

## WAVE A — CASH TRUTH

| Task | Title | Goal |
|---|---|---|
| TASK-060 | Actual Cash Opening/Ending Source Truth V1 | evidenced opening/observed ending balances + source/account coverage |
| TASK-061 | Cash Balance Financial Truth Contract | canonical point-balance truth by account/scope/time |
| TASK-062 | Cash Balance Source Mapper | read-only evidence → canonical balance truth |
| TASK-063 | Cash Source Coverage V1 | COMPLETE/PARTIAL/NOT_CONNECTED by source/account/period |
| TASK-064 | Cash Bridge Source Integration | feed proven balances + coverage into Cash Bridge |
| TASK-065 | Cash Truth Regression & Evidence | regression + fail-closed proof |

## WAVE B — OPERATING COST TRUTH

| Task | Title | Goal |
|---|---|---|
| TASK-066 | OPEX Source Inventory V1 | payroll/rent/utilities/platform/marketing/other OPEX source map |
| TASK-067 | Operating Cost Truth Contract | recognized cost != cash paid |
| TASK-068 | Payroll Cost Mapper | period labor-cost truth behind actuality gate |
| TASK-069 | Rent / Utilities / Other OPEX Mapper | fixed/shared OPEX truth without invented allocation |
| TASK-070 | FoodApp Settlement & Fee Truth | gross vs fee/promo/settlement separation |
| TASK-071 | Operating Cost Baseline V1 | canonical period operating-cost truth |

## WAVE C — COGS TRUTH

| Task | Title | Goal |
|---|---|---|
| TASK-072 | Consumption/COGS Source Coverage Map | inventory/recipe/purchase/waste evidence map |
| TASK-073 | Canonical COGS Input Contract | quantity/unit conversion/unit cost/packaging/topping truth |
| TASK-074 | Inventory Consumption Mapper | opening + inbound - ending within proven scope |
| TASK-075 | Recipe / Standard Cost Mapper | standard cost stays standard, never promoted to ACTUAL COGS |
| TASK-076 | Consumption-based COGS Calculator V1 | ACTUAL only with proven quantity/cost/coverage |
| TASK-077 | COGS Baseline Integration | inject canonical COGS into Partial Financial Baseline |

## WAVE D — PROFIT ↔ CASH

| Task | Title | Goal |
|---|---|---|
| TASK-078 | Owner Movement Truth V1 | structured contribution/withdrawal truth |
| TASK-079 | Debt / Capex / Working-Capital Classification | financing/capex/WC separated from operating Profit |
| TASK-080 | Profit ↔ Cash Reconciliation Contract | canonical bridge semantics |
| TASK-081 | Profit ↔ Cash Reconciliation Calculator | explain change in Cash from Profit + non-P&L movements |
| TASK-082 | Monthly Financial Baseline V2 | Revenue + COGS + OPEX + Profit + Cash + AP + reconciliation |
| TASK-083 | 8-hour Final Regression & Handoff | full QA + source-of-truth handoff |

## Overflow queue — execute only if time remains

| Task | Title | Goal |
|---|---|---|
| TASK-084 | Live Reconciled Revenue Reader Readiness | connect/read only if evidence boundary already exists |
| TASK-085 | Financial Data Freshness & Coverage Contract | stale/missing/current truth |
| TASK-086 | Owner Daily Financial Brief V1 | READ → SUMMARIZE → ALERT only |
| TASK-087 | Cash Leakage / Exception Rules V1 | detection/alert only |
| TASK-088 | Profitability Readiness by Branch/Channel | readiness, not synthetic contribution |
| TASK-089 | Extended Regression + Next-Priority Handoff | close overflow run safely |

## Autonomous continuation policy

Once Owner explicitly releases PFC_8H_V2:

- TASK-060 → TASK-083 may AUTO_CONTINUE.
- If TASK-083 completes before the 8-hour window, TASK-084 → TASK-089 may AUTO_CONTINUE.
- Missing sources become GAP / NOT_CONNECTED and do not wake Owner.
- CI/stale-test/implementation defects are repaired autonomously.
- Stop only for auth/MFA/captcha, secret requirement, destructive action, unresolved business rule, or contradictory canonical evidence.
- Do not start Pricing.
- At queue completion or end of approved run scope, Robot returns to PAUSED.

## End-state target

```text
Revenue Truth
→ COGS Truth
→ Operating Cost Truth
→ Management Profit
→ Profit ↔ Cash Reconciliation
→ Opening / Ending Cash Truth
→ Explainable liquidity movement
```

Success means stronger Financial Truth, not a prettier dashboard.

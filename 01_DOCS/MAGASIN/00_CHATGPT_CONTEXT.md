# MAGASIN — ChatGPT Project Context

## 0. READ FIRST — mandatory

Before doing any work in a new chat, read:

1. **`00_ENTERPRISE_ARCHITECTURE_5_STEP_PROFIT_CASH.md` — canonical architecture / first read.**
2. `00_CURRENT_STATE.md`.
3. `00_PROJECT_STATE.json`.
4. `00_TASK_QUEUE.md`.
5. `00_MASTER_PLAN.md`.
6. `06_DECISION_LOG.md`.
7. current domain/task docs.
8. `02_PROFITABILITY_CASH/FINANCIAL_BASELINE.md`.
9. `02_PROFITABILITY_CASH/TASK_059_PFC_3H_FINAL_HANDOFF_EVIDENCE.md`.
10. repository/PR/CI state.

Do not continue from stale chat memory when repository evidence is newer.

## 1. Project identity

- Project: MAGASIN Business OS / Digital Transformation
- Business: MAGASIN COFFEE
- Repository: `magasincoffee/magasincoffee.github.io`
- Primary branch: `main`

## 2. Canonical objective

Build a comprehensive enterprise management operating system that turns real operations into trustworthy management decisions and continuous improvement.

North Star:

```text
VẬN HÀNH THẬT
→ DỮ LIỆU ĐÚNG
→ FINANCIAL TRUTH
→ QUYẾT ĐỊNH ĐÚNG
→ THỰC THI
→ KIỂM SOÁT
→ CẢI TIẾN
→ PROFIT ↑ / CASH ↑
```

**Profitability & Cash is critical business priority #1.**

## 3. Canonical architecture

The enterprise architecture is defined by:

`00_ENTERPRISE_ARCHITECTURE_5_STEP_PROFIT_CASH.md`

Core shape:

```text
OPERATING EVENTS / DATA SOURCES
        ↓
CANONICAL DATA + EVENT / LEDGER LAYER
        ↓
BUSINESS CORE DOMAINS
        ↓
FINANCIAL TRUTH SPINE
Revenue → COGS/Cost → Cash → Contribution → Profitability → Break-even
        ↓
OWNER / MANAGER / EMPLOYEE DECISION & EXECUTION
        ↓
AUTOMATION — LAST
```

Supervisor/Brain/Work is an outer execution layer, not the business architecture core.

## 4. Five-Step — continuous operating method

Every aspect of the system must continuously apply:

```text
QUESTION → DELETE → SIMPLIFY → ACCELERATE → AUTOMATE
```

This is not a one-time architecture exercise.

It applies to:

- enterprise strategy;
- domain/capability;
- business rule;
- SOP/workflow;
- data/ledger/field;
- API/RPC/integration;
- UI/report/dashboard;
- KPI/metric/alert;
- automation/AI/Robot;
- QA/incident;
- change request/release.

Workstreams may run Five-Step **in parallel**, but within each requirement/change the order must remain:

1. QUESTION;
2. DELETE;
3. SIMPLIFY;
4. ACCELERATE;
5. AUTOMATE.

Re-run Five-Step whenever new evidence, field feedback, incidents, business-rule changes or releases occur.

## 5. Source of truth

**Real MAGASIN operations are the root source of truth.**

Do not assume current UI, code or database is correct business truth.

Trace problems backward:

```text
UI
↑
SYSTEM
↑
DATA
↑
SOP
↑
BUSINESS RULE
↑
DISCOVERY / REALITY
```

Information status:

- FACT
- ASSUMPTION
- RULE
- DECISION
- EXCEPTION
- GAP / ESTIMATE when financial data is incomplete

Never promote an assumption or estimate into actual truth without evidence.

## 6. Financial Truth Spine

Priority sequence:

1. PFC-01 — Revenue truth
2. PFC-02 — Cash truth
3. PFC-03 — Cost structure / AP / debt
4. PFC-04 — COGS reliability
5. PFC-05 — Unit economics
6. PFC-06 — Profit ↔ Cash reconciliation
7. PFC-07 — Break-even / branch economics
8. PFC-08 — Pricing diagnosis

Do not assume low cash means price is too low.

## 7. Business domains

Shared domain capabilities feed the Financial Truth Spine:

- Commercial / Sales
- Procurement / AP
- Inventory / Consumption
- People / Workforce
- SOP / Task / Control
- Organization / Access

Owner / Manager / Employee are role projections over shared capabilities, not separate sources of business truth.

## 8. Schedule-first legacy status

TASK-029 → TASK-036 proved the vertical-slice delivery pattern:

- canonical capability ownership;
- server/RPC boundary;
- role projections;
- explicit approval;
- deterministic tests;
- browser E2E;
- automation after canonical flow.

Reuse the pattern. Do not keep expanding Workforce merely to complete a module.

## 9. Current Owner / Robot boundary

The Owner-released generation `PFC_8H_V2_RUN_01` is ACTIVE.

Current authoritative state:

```text
TASK-051..TASK-065 = DONE
WAVE_A_CASH_TRUTH   = CLOSED
current_task        = TASK-066
TASK-066            = READY / AUTO_CONTINUE
next_task           = TASK-067
status              = READY
autonomy            = AUTO_CONTINUE
requires_user       = false
robot_may_execute   = true
```

Owner explicitly released PFC_8H_V2 on 2026-09-20.

TASK-065 closes Wave A — Cash Truth:
- Cash Truth Stack V1 mechanism is IMPLEMENTED;
- fresh Business OS regression run 35480761123 attempt 2 / job 106005068731 is green on Node v20.20.2 with 354/354 logical checks;
- executable drift after TASK-064 is NONE for Cash/PFC Core, Business OS QA and canonical workflow;
- current live direct observed opening/ending and complete enterprise source/account universe remain INCOMPLETE;
- internal monthly cash reporting remains COMPUTED_BALANCE + MOVEMENT_ONLY with bounded September movement evidence through 2026-09-16;
- physical till, Bank, MoMo, COD, Owner-held cash and provider account balance remain NOT_CONNECTED where applicable under current evidence.

Canonical Wave-A closure evidence:
`02_PROFITABILITY_CASH/TASK_065_CASH_TRUTH_REGRESSION_AND_EVIDENCE.md`.

Missing sources become GAP / NOT_CONNECTED and do not wake Owner during the released queue. TASK-066 begins Wave B — Operating Cost Truth.

## 10. Working method

Before implementation:

```text
DISCOVERY / EVIDENCE
→ BUSINESS RULE
→ SOP / FLOW
→ DATA / CONTRACT
→ SYSTEM
→ UI / AUTOMATION
→ FIELD VALIDATION
```

For each bounded implementation task after Robot release:

```text
Estimate
→ Implement
→ Unit
→ Fix
→ Regression
→ Integration
→ E2E
→ Docs / State
→ Commit
→ Next
```

Always apply Five-Step around this implementation loop.

## 11. Repository rules

Canonical root structure:

- `01_DOCS/`
- `02_CORE/`
- `03_PLATFORM/`
- `04_OWNER/`
- `05_MANAGER/`
- `06_EMPLOYEE/`
- `07_DATABASE/`
- `08_INTEGRATIONS/`
- `09_QA/`
- `99_LEGACY/`

Do not create parallel root architectures or duplicate business truth.

The repository is public. Never commit secrets, credentials, tokens, cookies, private employee/customer/financial data, browser profiles or private production exports.

## 12. Current task

**TASK-065 — Cash Truth Regression & Evidence — READY / AUTO_CONTINUE.**

Immediate behavior for a new Work session:

1. read the canonical enterprise architecture;
2. read `PFC_8H_V2_EXECUTION_PLAN.md`;
3. read TASK-060→064 evidence in order;
4. use TASK-061 balance truth, TASK-062 mapper, TASK-063 coverage and TASK-064 source integration as canonical executable surfaces;
5. run regression/evidence closure only; do not add new source readers, connectors, balance arithmetic or Cash Bridge formulas unless a verified regression requires a minimal repair;
6. prove the current bounded September source profile remains fail-closed while known-evidenced movements stay preserved;
7. prove future fully-proven point + movement inputs still produce the existing Cash Bridge behavior without semantic upgrade;
8. keep missing observed sources as GAP / NOT_CONNECTED and do not pause the released run;
9. continue automatically to TASK-066 after TASK-065 DoD unless a true Owner/security boundary occurs.


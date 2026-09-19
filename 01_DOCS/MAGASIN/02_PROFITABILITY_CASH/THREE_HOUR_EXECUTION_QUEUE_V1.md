# MAGASIN — Profitability & Cash 3-Hour Execution Queue V1

**Date:** 2026-09-19  
**Architecture:** `00_ENTERPRISE_ARCHITECTURE_5_STEP_PROFIT_CASH.md`  
**Status:** READY_ON_OWNER_RELEASE  
**Budget:** ~180 minutes active Work time  
**Owner dependency during run:** NONE  
**Robot execution:** NOT YET RELEASED — project state remains PAUSED until explicit Owner release.

## 1. Mission

Use the first ~3 hours after Robot release to build the smallest trustworthy Financial Truth foundation.

Target management questions:

1. What is actual/reconciled revenue for the reporting period?
2. What cash movements can already be proven from trusted system sources?
3. Which cash categories are still GAP / NOT_CONNECTED?
4. What supplier payable/cash-payment facts already exist?
5. Can the system produce a partial financial baseline without inventing numbers?

Do **not** build a broad finance dashboard, Pricing Engine, KPI Engine, forecasts or autonomous financial actions.

## 2. Continuous Five-Step rules

Every task must record:

```text
QUESTION → DELETE → SIMPLIFY → ACCELERATE → AUTOMATE
```

Parallel workstreams are allowed, but each task must preserve this order internally.

Global Five-Step for this 3-hour run:

### QUESTION
What minimum financial truth is required to explain Revenue and Cash without Owner input?

### DELETE
Do not implement:
- pricing;
- KPI;
- AI forecasts;
- full accounting ERP;
- write-capable financial workflows;
- synthetic financial numbers;
- speculative bank/MoMo/FoodApp integrations;
- cosmetic dashboard work;
- new Supervisor features.

### SIMPLIFY
Use:
- existing reconciled Revenue adapter;
- existing Procurement/AP trusted read models;
- one shared financial quality/lineage contract;
- pure read/calculation functions before database/schema expansion;
- GAP / ESTIMATE / NOT_CONNECTED explicitly.

### ACCELERATE
Deliver thin vertical slices with deterministic fixtures/tests, then integrate into one baseline snapshot.

### AUTOMATE
Automation in this run means only deterministic read/aggregation/test automation. No autonomous financial action.

## 3. Execution queue

| Order | Task | Est. | Deliverable | Owner required? |
|---:|---|---:|---|---|
| 1 | TASK-051 — PFC source inventory + delete/defer map | 20m | Verified map of existing Revenue/AP/Procurement sources, missing Cash sources, and explicit non-goals | NO |
| 2 | TASK-052 — Financial Truth contract v1 | 20m | Canonical contract for period/scope/quality/source/as-of/actual-estimate-gap lineage | NO |
| 3 | TASK-053 — Monthly Revenue baseline contract + aggregator | 20m | Pure monthly aggregation over trusted reconciled revenue inputs; no gross fallback | NO |
| 4 | TASK-054 — Revenue baseline adapter tests/integration | 20m | Fail-closed adapter/integration tests for ACTUAL/GAP/NOT_CONNECTED and mixed source failures | NO |
| 5 | TASK-055 — Cash event taxonomy + Cash Bridge contract v1 | 20m | Canonical inflow/outflow categories and opening/inflow/outflow/ending/variance structure; unknowns remain GAP | NO |
| 6 | TASK-056 — Cash Bridge pure calculator + fixtures/tests | 20m | Deterministic calculation layer with evidence/quality propagation; no production bank/MoMo assumptions | NO |
| 7 | TASK-057 — Procurement payment/AP → financial truth read mapping | 20m | Read-only mapping of trusted supplier payments/payables into cash/AP sections; void/cancelled excluded | NO |
| 8 | TASK-058 — Partial Financial Baseline snapshot v1 | 20m | Combines Revenue + known Cash/AP evidence + explicit missing sources into one normalized baseline | NO |
| 9 | TASK-059 — Full regression + architecture/state handoff | 20m | Tests, docs, evidence, task-state reconciliation; next task selected without requiring Owner unless a real business rule blocks | NO |

**Total target:** 180 minutes.

## 4. Task details and gates

### TASK-051 — PFC source inventory + delete/defer map

Inspect current repository and classify each potential financial source:

- Revenue;
- Procurement purchases;
- Supplier payments;
- AP;
- Cash;
- Bank;
- MoMo;
- COD/delivery settlement;
- FoodApp settlement/fees;
- payroll;
- rent/utilities/OPEX;
- debt/capex;
- Owner contribution/withdrawal.

Output per source:

`SOURCE | EXISTS? | TRUST LEVEL | PERIOD | DIMENSIONS | ACTUAL/ESTIMATE/GAP | CAN USE NOW? | NEXT GAP`

Acceptance:
- no production/private data committed;
- no assumption promoted to actual;
- explicit DELETE/defer map.

### TASK-052 — Financial Truth contract v1

Create a canonical contract under `02_CORE/contracts/`.

Minimum semantics:

- reporting period;
- branch scope;
- channel scope where known;
- metric/value;
- quality: ACTUAL / ESTIMATE / GAP / NOT_CONNECTED;
- source;
- as-of;
- reconciliation status;
- evidence/lineage reference;
- message/reason;
- no synthetic default zero for missing financial truth.

Acceptance:
- reusable by Revenue/Cash/AP;
- tests validate schema/normalization semantics;
- does not create a second competing business truth.

### TASK-053 — Monthly Revenue baseline contract + aggregator

Reuse `04_OWNER/ControlTower/revenue-adapter-v1.mjs` rules.

Requirements:
- trusted + RECONCILED only may become ACTUAL;
- aggregate only compatible reporting dates/period;
- branch/channel dimensions preserved when source provides them;
- one missing/untrusted source must not silently become zero;
- output lineage.

### TASK-054 — Revenue baseline tests/integration

Cover:
- all reconciled;
- partially missing dates;
- untrusted source;
- mismatch date/period;
- invalid negative/non-numeric values;
- reader unavailable;
- partial-source quality propagation.

No UI work unless a regression requires a minimal fix.

### TASK-055 — Cash event taxonomy + Cash Bridge contract v1

Define the minimum categories from already approved architecture:

Inflows:
- sales/collections;
- other operating inflow;
- Owner contribution;
- financing/debt inflow;
- other evidenced inflow.

Outflows:
- supplier payment;
- payroll;
- rent/utilities;
- platform/delivery;
- marketing;
- other OPEX;
- debt repayment;
- capex/investment;
- Owner withdrawal;
- other evidenced outflow.

Formula:

```text
Opening Cash
+ Proven Inflows
- Proven Outflows
= Computed Ending Cash

Observed Ending Cash
- Computed Ending Cash
= Cash Variance
```

Unknown opening/ending/source categories remain GAP.

### TASK-056 — Cash Bridge calculator

Pure deterministic function only.

Must:
- never invent an opening/ending balance;
- distinguish missing from zero;
- exclude void/cancelled events;
- preserve source lineage;
- output variance only when both computed and observed ending are available;
- propagate quality.

### TASK-057 — Procurement/AP financial mapping

Reuse existing:
- `v_procurement_supplier_payables`;
- `v_procurement_order_summary`;
- active supplier payment records.

Map:
- supplier payment → cash outflow evidence;
- outstanding balance → AP;
- overdue balance → AP attention;
- purchase value is **not automatically COGS**.

Acceptance:
- cancelled/void items excluded;
- purchase-based cost never mislabeled actual COGS;
- existing Procurement behavior/regression remains healthy.

### TASK-058 — Partial Financial Baseline snapshot v1

Output shape:

```text
PERIOD / SCOPE
├── Revenue
├── Cash Bridge
│   ├── Opening
│   ├── Known inflows
│   ├── Known outflows
│   ├── Computed ending
│   ├── Observed ending
│   └── Variance
├── AP
├── COGS = GAP unless reliable consumption exists
├── Profit = GAP unless required inputs are valid
└── Data-quality / missing-source list
```

This is a management truth object, not yet a full dashboard.

### TASK-059 — QA + handoff

Run affected test suites and repository-level regression feasible within budget.

Update:
- Financial Baseline docs;
- Task Queue;
- Project State;
- Change Log;
- evidence/test log.

If remaining issue is missing external/private data, mark explicit GAP and continue to the next non-blocked architecture task. Do not ask Owner merely because a source is absent.

Stop only for:
- a real unresolved business rule;
- security/auth/MFA;
- destructive production action;
- secret/private-data requirement;
- contradictory canonical sources.

## 5. Definition of success after 3 hours

The repository should be able to produce a deterministic **Partial Financial Baseline V1** from trusted inputs and explicitly show what is missing.

Success is **not** “all financial numbers available”.

Success is:

```text
KNOWN ACTUALS stay ACTUAL
ESTIMATES stay ESTIMATE
MISSING stays GAP
UNCONNECTED stays NOT_CONNECTED
NO SYNTHETIC FINANCIAL TRUTH
```

Owner should return to a project that is materially closer to answering:

> Revenue thực là bao nhiêu, tiền đã đi đâu trong phần hệ thống đã chứng minh được, và còn thiếu nguồn nào để khép kín Profit ↔ Cash?

## 6. Post-run priority

Unless evidence discovered during TASK-051 changes the order, next priority after this run is:

1. connect/establish actual Cash opening/ending sources;
2. establish operating-expense truth;
3. improve COGS from purchase-estimate toward consumption truth;
4. then Unit Economics;
5. then Profit ↔ Cash reconciliation;
6. then Break-even;
7. Pricing last.

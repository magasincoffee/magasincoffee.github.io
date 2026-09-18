# TASK-011 — Owner Control Tower V1 Vertical-Slice Plan

**Status:** DAY-7 USABILITY GATE PASSED  
**Date:** 2026-09-18  
**Milestone:** Owner Control Tower usable by approximately Day 7.

## 1. Question

What is the smallest Owner-facing vertical slice that creates immediate management value without presenting incomplete financial or KPI data as truth?

## 2. Evidence boundary

This plan uses repository evidence only:

- final daily revenue is the reconciled number after management review;
- revenue can be analyzed by branch/channel, but current sources are distributed;
- procurement/payables already has a working Owner module and source-controlled read models;
- workforce has an Owner module and store-scoped staffing/schedule foundations;
- Inventory, Profitability/Cash and formal KPI definitions are not yet reliable enough to present as final truth;
- formal KPI rules remain a later Discovery/Business Rules deliverable;
- profitability outputs must be labeled GAP/ESTIMATE whenever source quality is insufficient.

## 3. Five-Step scope reduction

### Question

The Control Tower should answer: **What needs the Owner's attention now?**

It is not a full ERP dashboard.

### Delete

V1 Control Tower does not include:

- formal employee KPI scoring;
- final branch profitability;
- final product contribution ranking;
- predictive forecasting;
- full CRM/marketing analytics;
- detailed accounting statements;
- write actions that bypass an existing module;
- new approval semantics not yet discovered.

### Simplify

The first usable slice has five blocks:

1. **Today / reporting context**
2. **Revenue status**
3. **Cash / payable attention**
4. **Workforce / operations exceptions**
5. **Data quality / source confidence**

Each block links to the owning module instead of duplicating its workflow.

### Accelerate

Build the shell and adapter contract first with deterministic fixtures, then connect verified read models one at a time.

### Automate

Only read-only aggregation and alert surfacing are automated in this slice.

## 4. V1 screen contract

Proposed canonical route:

`/04_OWNER/ControlTower/`

The existing `/04_OWNER/` page becomes the Owner navigation entry and should link to Control Tower without removing Workforce, Procurement or Access.

### Header

Must show:

- MAGASIN Owner Control Tower;
- selected reporting date;
- optional branch scope when supported;
- last refresh time;
- global data-confidence state.

### Block A — Revenue status

Minimum values:

- reconciled revenue for selected day;
- source/status indicator;
- branch breakdown when data adapter supports it;
- channel breakdown only when source mapping is verified.

Must **not** show gross marketplace numbers as official revenue when reconciliation is pending.

### Block B — Cash / payable attention

First implementation may reuse trusted procurement read models:

- total supplier payable;
- overdue supplier payable;
- count of open/overdue purchase orders.

Do not label this as total company cash position.

### Block C — Workforce / operations attention

Read-only exception summary:

- staffing requirement gaps when available;
- unpublished/unresolved workforce items when available;
- links to Owner Workforce.

Do not invent a staffing KPI score.

### Block D — Inventory / task placeholders with explicit confidence

Until verified read models exist, these sections must show one of:

- `READY`
- `GAP`
- `NOT_CONNECTED`

They must not display fabricated numbers.

### Block E — Data quality

For every metric group, expose:

- status: `ACTUAL | ESTIMATE | GAP | NOT_CONNECTED`;
- source label;
- as-of timestamp;
- optional warning count.

This is mandatory because current finance/inventory truth is incomplete.

## 5. Navigation model

Control Tower is an attention layer, not a workflow replacement.

Drill-down targets:

- Workforce → `/04_OWNER/Workforce/`
- Procurement/Payables → current Procurement route
- Access → `/04_OWNER/Access/`
- future Sales/Inventory modules → only after those routes exist

No write button is added to the Control Tower unless the owning workflow already has an approved action contract.

## 6. Read-model contract

The UI should consume one normalized object, independent of source tables:

```text
control_tower_snapshot
├── context
├── revenue
├── payables
├── workforce
├── inventory
├── tasks
└── data_quality[]
```

Every section must be independently allowed to be unavailable.

The page must remain usable when one source fails.

## 7. Error / empty / partial behavior

Acceptance requires distinct states:

- authenticated + all sources healthy;
- authenticated + one source unavailable;
- authenticated + no data for selected date;
- permission denied;
- network error;
- stale source;
- partial data / GAP.

A source failure must not blank the entire Control Tower.

## 8. Security and access

V1:

- Owner access only;
- reuse platform authentication conventions;
- read-only aggregation;
- no secrets in frontend;
- no unrestricted direct table access introduced solely for dashboard convenience;
- future Manager view must be a separate permission decision.

## 9. Performance budget

Target for the first usable slice:

- initial shell visible immediately;
- source cards load independently;
- no single failed source blocks all cards;
- avoid repeated full-table scans from the browser;
- prefer existing views/RPCs or dedicated read models.

No hard performance number is declared until the real data volume is measured.

## 10. Acceptance criteria

TASK-011 planning is accepted when the implementation queue can be derived without further Owner decisions.

First Control Tower implementation is considered usable when:

1. Owner can open `/04_OWNER/ControlTower/` from the Owner home.
2. Auth/denied/loading/error states are explicit.
3. Revenue card never claims unreconciled/gross source data is official.
4. Payables card can use existing trusted procurement read models.
5. Workforce card links to existing Owner Workforce and accepts partial data.
6. Unsupported Inventory/Task/Profit areas display explicit `GAP/NOT_CONNECTED`, never synthetic values.
7. Every metric group has data-quality metadata.
8. A failure in one data source does not blank the rest of the page.
9. Desktop and narrow-width layout are both usable.
10. Automated fixture tests cover healthy/partial/error/empty states.
11. E2E navigation test verifies Owner home → Control Tower → existing module link.
12. No production write or business-rule change is required for the initial shell.

## 11. Implementation micro-tasks derived from this plan

- **TASK-012** — Control Tower shell + normalized fixture contract.
- **TASK-013** — Owner home navigation + route/auth integration.
- **TASK-014** — Procurement/payables read adapter.
- **TASK-015** — Workforce attention read adapter.
- **TASK-016** — Revenue read-adapter contract with explicit reconciliation/data-quality gate.
- **TASK-017** — Partial-source/error-state integration tests.
- **TASK-018** — Control Tower browser E2E and Day-7 usability gate.

Inventory, tasks, profitability and Daily Brief become later slices once their source contracts are trustworthy.

## 12. TASK-011 gate result

**PASS — acceptance and next implementation queue are defined.**

No Owner decision is required before TASK-012.

## 13. TASK-018 Day-7 usability gate result

**PASS — Owner Control Tower V1 is usable under the acceptance contract.**

Evidence:

- GitHub Actions workflow: `Owner Control Tower Tests`;
- browser E2E run: `35316155903`;
- installed Chrome + actual repository route/modules/CSS;
- synthetic browser-local Owner/read-source mocks only;
- production external requests: 0;
- non-GET browser requests: 0;
- production writes: none;
- desktop and 390px narrow-width layouts passed;
- Owner home → Control Tower → Workforce drill-down navigation passed;
- role-denied and partial-source states passed.

Known data gaps remain explicit by design and are **not** converted into facts:

- reconciled Revenue source: `NOT_CONNECTED`;
- Inventory attention: `NOT_CONNECTED`;
- Task attention: `NOT_CONNECTED`;
- staffing-gap count remains unavailable until a verified read model exists.

These gaps do not invalidate the Day-7 gate because the V1 contract explicitly requires fail-closed quality labels rather than synthetic values.

Next accelerated slice follows the canonical Blueprint: **Day 8–10 People / Shift**.

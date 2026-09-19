# TASK-058 — Partial Financial Baseline V1 Evidence

Date: 2026-09-19  
Generation: PFC_3H_V1_RESTART_01  
Status: DONE / DoD MET / REMOTE_CI_GREEN

This evidence is privacy-safe for the public repository. No Drive IDs/URLs, raw business rows, customer/employee data, private account values, credentials or secrets are stored here.

## Five-Step

### QUESTION

Compose the smallest management truth object that answers, for one explicit period/scope:

- what Revenue is proven;
- what Cash evidence is proven;
- what current AP is proven;
- what COGS / Operating Cost truth is still missing;
- whether a management baseline Profit can be derived without inventing accounting facts.

### DELETE

TASK-058 does not add:
- dashboard/UI;
- DB/migration/RPC/write path;
- live source connector;
- pricing/KPI/forecast;
- accounting ERP;
- synthetic month-end close;
- synthetic numbers;
- purchase -> COGS;
- AP -> cash;
- Revenue -> cash;
- FoodApp gross -> settlement;
- cash movement -> expense recognition;
- current AP -> historical AP;
- a second Revenue/Cash/AP calculator;
- a new Financial Truth quality vocabulary.

### SIMPLIFY

Created exactly one composition contract and one pure composer:

- `02_CORE/contracts/partial-financial-baseline.v1.json`
- `02_CORE/shared/partial-financial-baseline-v1.mjs`

The composer reuses canonical outputs from:
- Financial Truth V1;
- Monthly Revenue Baseline V1;
- Cash Bridge V1;
- Procurement Financial Truth V1.

No external reader is connected in TASK-058.

### ACCELERATE

The composer emits one deterministic object for TASK-059 / management review:

```text
schema_version
target_period
scope
as_of
revenue
cash_bridge
ap
cogs
operating_costs
profit
data_quality
missing_sources
diagnostics
lineage
```

### AUTOMATE

Only deterministic composition, validation, tests and CI were automated.

## Canonical shape and isolation

### Revenue

Revenue preserves canonical Monthly Revenue fields and coverage.

Numeric Revenue is preserved only when canonical period/scope is compatible and coverage is COMPLETE.

PARTIAL/MISSING coverage cannot retain a trusted period Revenue number.

No gross/raw fallback exists.

### Cash Bridge

If a canonical bridge is supplied, it is preserved and is not recalculated.

If raw cash inputs are supplied instead, `calculateCashBridge()` is called once.

The baseline preserves separately:
- opening balance;
- known evidenced inflows;
- known evidenced outflows;
- category breakdowns;
- transfers;
- computed ending balance;
- observed ending balance;
- cash variance;
- coverage;
- quality;
- diagnostics.

Known-evidenced sums may remain numeric under PARTIAL coverage, but are not labeled as complete-period cash totals.

Missing observed ending does not erase an independently valid computed ending.

### AP

AP is preserved as point-in-time current-state truth.

AP does not participate in period Profit arithmetic.

If AP point date equals target period end:

`temporal_relation = MATCHES_TARGET_END`

If current AP is a different date:

`temporal_relation = CURRENT_STATE_NOT_TARGET_END`

with diagnostic:

`AP_CURRENT_STATE_NOT_TARGET_PERIOD_END`

The composer does not rewrite that AP date to the target period end.

Upstream `HISTORICAL_AP_SNAPSHOT_NOT_AVAILABLE` remains GAP/null.

### COGS

Default when no canonical COGS truth is provided:

```text
quality = GAP
value = null
reason = COGS_CONSUMPTION_TRUTH_NOT_AVAILABLE
```

No purchase, Procurement, recipe, inventory count, AP or cash evidence is used to synthesize COGS.

### Operating Costs

Default when no canonical operating-cost truth is provided:

```text
quality = GAP
value = null
reason = OPERATING_COST_TRUTH_NOT_AVAILABLE
```

Incomplete payroll/rent/OPEX evidence is not silently promoted to complete period operating costs.

## Profit gating

Metric:

`management_operating_profit_baseline`

Exact formula:

```text
Profit = Revenue - COGS - Operating Costs
```

Required dependencies:
- Revenue;
- COGS;
- Operating Costs.

Cash Bridge and AP are not Profit dependencies.

Dependency quality precedence:

```text
NOT_CONNECTED > GAP > ESTIMATE > ACTUAL
```

Rules:
- any required NOT_CONNECTED dependency -> Profit NOT_CONNECTED/null;
- otherwise any GAP dependency -> Profit GAP/null;
- otherwise any ESTIMATE dependency -> Profit ESTIMATE;
- all ACTUAL compatible numeric dependencies -> Profit ACTUAL;
- negative derived Profit is allowed;
- Profit is not called statutory/net Profit.

All three dependencies must match exact target period/timezone/scope.

Period or scope mismatch fails that component closed and therefore blocks numeric Profit.

Unknown scope is never converted to ALL. ALL requires `aggregate_proven=true`.

## Data quality

`PARTIAL_FINANCIAL_BASELINE` is a completeness/status label only.

It is not a Financial Truth quality.

`data_quality.components` preserves:
- Revenue quality;
- Cash Bridge quality;
- AP quality;
- COGS quality;
- Operating Costs quality;
- Profit quality.

An optional summary quality is deterministic worst-state, but component-level states remain visible.

One component failure never erases valid other components.

Examples proven in tests:
- Revenue ACTUAL + AP ACTUAL + Cash evidence + COGS GAP -> Revenue/AP/Cash remain visible, Profit GAP;
- AP GAP does not erase Revenue/Cash;
- Revenue GAP does not erase AP/Cash;
- Cash GAP does not erase Revenue/AP/period Profit dependencies.

## Missing sources

`missing_sources[]` is deterministic and de-duplicated.

Items are derived from explicit component gaps/diagnostics and caller-declared gaps.

Unsafe URL/Drive text is dropped.

The composer does not hard-code Bank/MoMo/COD/FoodApp/payroll/etc. as permanent universal gaps. A caller may declare those gaps when they are current; newer evidence can remove them.

## As-of and lineage

If caller supplies a valid snapshot `as_of`, it is preserved exactly.

Otherwise baseline `as_of` is the deterministic maximum valid upstream as-of.

Output lineage is deterministic, de-duplicated and privacy-safe.

The composer never calls runtime `new Date()`.

## Sanitized fixture

Created:

`09_QA/business-os/fixtures/partial-financial-baseline-v1.fixture.json`

It contains synthetic/sanitized values only and no Drive/private locator.

## Files changed

Created:
- `02_CORE/contracts/partial-financial-baseline.v1.json`
- `02_CORE/shared/partial-financial-baseline-v1.mjs`
- `09_QA/business-os/fixtures/partial-financial-baseline-v1.fixture.json`
- `09_QA/business-os/partial-financial-baseline.test.mjs`

Updated:
- `.github/workflows/business-os-contract-tests.yml`

No Owner UI, Procurement production, database or connector path was changed.

## Tests

TASK-058 targeted:

**37 / 37 PASS / 0 FAIL**

Coverage includes:
- exact contract formula/status;
- all ACTUAL Profit;
- missing COGS;
- missing OPEX;
- ESTIMATE COGS/OPEX;
- Revenue NOT_CONNECTED;
- explicit Revenue zero;
- missing/blank COGS != zero;
- period mismatch;
- scope mismatch;
- unproven ALL;
- Revenue PARTIAL coverage;
- Cash PARTIAL known sums;
- computed ending ACTUAL with variance GAP;
- preserve canonical bridge;
- Cash target mismatch isolation;
- AP ACTUAL;
- current AP temporal mismatch;
- historical AP GAP;
- AP/Revenue/Cash source isolation;
- no purchase-derived COGS;
- no cash-derived Profit;
- privacy unsafe source/diagnostics;
- deterministic missing-source ordering;
- declared-gap input order independence;
- deterministic composer;
- caller / derived as-of;
- component-level data quality;
- read-only/no query/write calls;
- sanitized fixture.

Full Business OS suite after TASK-058:

**214 logical checks / 0 FAIL**

Composition:
- Cash taxonomy: 29;
- Cash Bridge calculator: 46;
- Procurement Financial Truth: 34;
- Partial Financial Baseline: 37;
- Financial Truth: 16;
- Five-Step/PFC: 4;
- Monthly Revenue: 27;
- notification-email: 10;
- published schedule: 2;
- schedule-first flow: 3;
- six standalone contract assertions: 6.

## CI chronology

### Initial TASK-058 run — failed targeted privacy diagnostic

Run:
`35453165838`

Job:
`105923740077`

Node:
`v20.20.2`

Result:
- upstream syntax/tests: PASS;
- Partial Financial Baseline targeted: 36/37 PASS;
- failure: privacy-unsafe COGS source failed closed as `INVALID_SOURCE` before composer could emit the more explicit contract reason `PRIVACY_UNSAFE_COMPONENT_EVIDENCE`.

This was a validation-order issue, not a numeric/profit/source-isolation defect.

Fix:
`64aef496d83b82e1f5d481de0af1c8e48dfcda0f`

Privacy evidence is now rejected before Financial Truth normalization, retaining a deterministic privacy-specific reason while remaining fail-closed.

### Required final PR-head CI

PR:
`#182`

Final head:
`64aef496d83b82e1f5d481de0af1c8e48dfcda0f`

Business OS Contract Tests:
- run: `35453217344`
- job: `105923874743`
- Node: `v20.20.2`
- TASK-058 targeted: 37/37 PASS;
- full suite: 214 logical checks / 0 FAIL;
- conclusion: `success`.

### Merge

Merge commit:

`bbd13f859bd0f4a567af23a7e73561f97d9a0a8a`

### Exact post-merge CI

Business OS Contract Tests:
- run: `35453257400`
- job: `105923982205`
- Node: `v20.20.2`
- TASK-058 targeted: 37/37 PASS;
- full Business OS suite: 214 logical checks / 0 FAIL;
- conclusion: `success`.

## Commits

- contract: `a118820a22fdeed85718c918932ef93f2e3d21cb`
- composer: `df91347ed344ae96c22fea23cca2bd2ddaacdb59`
- sanitized fixture: `491afdc5473b6938c4d3b27b7fc992d451b32b03`
- targeted tests: `f67aaac04744fb59476e3755b0edacf49b761f8a`
- CI targeted gate: `5650337eb84f55a7eadf53f7615eae7dc245bd6c`
- PR path trigger: `5b7364e58b81a082222a36fde3368b1c39c55eff`
- privacy validation-order fix/final head: `64aef496d83b82e1f5d481de0af1c8e48dfcda0f`
- PR: `#182`
- merge: `bbd13f859bd0f4a567af23a7e73561f97d9a0a8a`

## Read-only verification

Composer contains none of:
- `.insert(`
- `.update(`
- `.delete(`
- `.upsert(`
- `.rpc(`
- `.from(`

It contains no live source-specific table/view query.

## Carried-forward gaps

TASK-058 truthfully represents rather than fills these gaps when declared/upstream:
- company-wide COGS consumption truth not yet proven;
- complete payroll/rent/other OPEX recognition may be incomplete;
- Bank/MoMo/COD liquidity sources may remain NOT_CONNECTED;
- FoodApp settlement may remain PARTIAL;
- Owner movements may remain GAP;
- historical Procurement AP snapshots are unavailable;
- Cash Bridge may remain PARTIAL where source coverage is incomplete.

TASK-058 does not claim financial close, statutory Profit or complete company Profit.

## DoD

PASS after:
- final PR-head Business OS CI green;
- PR #182 merged;
- exact merge-commit Business OS CI green.

Next task:
TASK-059 — PFC 3-hour regression + docs/state handoff.

Autonomy:
AUTO_CONTINUE.

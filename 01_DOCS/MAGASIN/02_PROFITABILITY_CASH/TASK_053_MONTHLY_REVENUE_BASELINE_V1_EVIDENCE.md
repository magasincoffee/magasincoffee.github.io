# TASK-053 — Monthly Revenue Baseline V1 Evidence

Date: 2026-09-19  
Generation: PFC_3H_V1_RESTART_01  
Status: DONE / DoD MET / REMOTE_CI_GREEN

This evidence is privacy-safe for the public repository. No Drive ID/URL, raw financial/customer/employee record, credential, token, or secret is stored here.

## Five-Step decisions

### QUESTION

Create the smallest reusable primitive that can answer:

> What Revenue for an explicit reporting period is actually proven?

without promoting raw operating rows, gross marketplace sales, partial coverage, untrusted inputs or missing dates into ACTUAL Revenue.

### DELETE

TASK-053 does not add:
- dashboard/UI;
- database, migration, RPC or write path;
- live Revenue integration;
- pricing/KPI/forecast logic;
- new quality vocabulary;
- synthetic zero;
- implicit enterprise scope;
- gross FoodApp fallback;
- duplicate Revenue truth model.

### SIMPLIFY

Reuse:
- canonical `financial-truth.v1`;
- `normalizeFinancialTruth()`;
- the existing Revenue rule that ACTUAL Revenue requires a trusted/reconciled source.

TASK-053 adds only an aggregation/coverage acceptance contract and a pure deterministic helper.

### ACCELERATE

Put all coverage, scope, duplicate and period rules in one shared primitive so TASK-054 can integrate a future reader without reimplementing Revenue truth semantics.

### AUTOMATE

Only deterministic read/aggregation/test automation was added. No live source connection or financial action was automated.

## Files

Canonical aggregation acceptance contract:

`02_CORE/contracts/monthly-revenue-baseline.v1.json`

Pure shared helper:

`02_CORE/shared/monthly-revenue-baseline-v1.mjs`

Executable tests:

`09_QA/business-os/monthly-revenue-baseline.test.mjs`

Existing Business OS contract workflow was extended only so changes to the new helper trigger the existing suite:

`.github/workflows/business-os-contract-tests.yml`

## Output model

The helper returns the canonical Financial Truth V1 fields plus period-aggregation metadata:

```text
Financial Truth V1
├── period
├── scope
├── group = REVENUE
├── metric
├── value
├── quality
├── source
├── as_of
├── reconciliation_status
├── evidence[]
├── lineage[]
├── message
└── reason

TASK-053 metadata
├── baseline_schema_version = monthly-revenue-baseline.v1
├── coverage
│   ├── status = COMPLETE | PARTIAL | MISSING
│   ├── mode = DAILY | PERIODS
│   ├── expected_units[]
│   ├── covered_units[]
│   ├── missing_units[]
│   └── reason
└── diagnostics[]
```

This does not create a competing truth model. Financial Truth V1 remains canonical; coverage metadata only proves whether a period may be promoted to Revenue ACTUAL.

## Exact aggregation / coverage rules

### Revenue eligibility

A contributing fact can support ACTUAL only when it normalizes through Financial Truth with:

- `group=REVENUE`;
- `quality=ACTUAL`;
- finite numeric value;
- value >= 0;
- `reconciliation_status=RECONCILED`;
- valid period + timezone;
- explicit compatible scope;
- valid privacy-safe source metadata;
- valid `as_of`;
- non-empty privacy-safe lineage.

Candidate-style Revenue records are accepted only when `trusted=true` and `reconciliationStatus=RECONCILED`, and when enough metadata exists to normalize them through Financial Truth.

Raw/untrusted candidates do not become ACTUAL.

Gross Revenue metrics are explicitly rejected.

### Target period

Target `start/end/timezone` is mandatory and explicit.

A fact outside the target period is rejected. It is never silently ignored.

Input timezone must match the target timezone.

### DAILY coverage

`coverage.mode=DAILY` requires `expected_dates[]`.

The expected dates must explicitly equal the full target date range.

ACTUAL is allowed only when every required date is covered exactly once after valid stable-ID de-duplication.

A missing date returns:
- `quality=GAP`;
- `value=null`;
- `coverage.status=PARTIAL/MISSING`.

### PERIODS coverage

`coverage.mode=PERIODS` derives coverage only from explicit input periods.

Periods must:
- remain inside the target;
- not overlap;
- be contiguous;
- cover the target from exact start through exact end.

Any overlap or gap fails closed.

### Scope

Target branch/channel must be explicit.

All contributing facts must match the target scope exactly.

Mixed branch/channel facts do not collapse to `ALL`.

`ALL` is valid only when:
- target branch/channel explicitly use `ALL`;
- target `aggregate_proven=true`;
- every contributing fact also carries the same proven aggregate scope.

Unknown or unproven scope never becomes enterprise-wide.

### Duplicate protection

A repeated fact may be deterministically de-duplicated only when:
- a privacy-safe stable fact identity is supplied;
- the repeated normalized Financial Truth payload is identical.

Same identity + conflicting content fails closed.

Duplicate/overlapping daily facts without stable identity fail closed.

Overlapping period facts fail closed.

### Missing / zero / invalid

Missing amount is never coerced with `Number(undefined)`, blank defaults or synthetic zero.

Explicit zero remains ACTUAL only when complete trusted reconciled coverage proves zero.

Negative, NaN or infinite Revenue cannot support ACTUAL.

### Output lineage

Successful output uses a privacy-safe derived source label and preserves/combines the privacy-safe input evidence and lineage deterministically.

No Drive locator/private record is added.

### Reader path

`loadMonthlyRevenueBaseline()` is an adapter boundary only; TASK-053 does not connect a live reader.

- missing reader → `NOT_CONNECTED`, `value=null`;
- reader throws → `GAP`, `value=null`;
- no raw/gross fallback parameter is consumed.

The current live reconciled Revenue source therefore remains NOT_CONNECTED until a later integration task connects one.

## Tests

### Local syntax gate

```text
node --check 02_CORE/shared/monthly-revenue-baseline-v1.mjs
PASS
```

### Local targeted TASK-053 tests

```text
node --test 09_QA/business-os/monthly-revenue-baseline.test.mjs
27 tests / 27 PASS / 0 FAIL
```

Covered:
- complete reconciled period → ACTUAL total;
- trusted candidate normalization;
- explicit zero;
- missing day/coverage;
- explicit full expected coverage;
- unreconciled;
- untrusted;
- invalid source;
- outside period;
- mixed scopes;
- proven/unproven ALL;
- stable duplicate de-dup;
- duplicate conflict;
- duplicate without identity;
- period overlap/gap protection;
- negative;
- missing amount;
- NaN/Infinity;
- gross fallback prohibition;
- lineage;
- deterministic duplicate-safe output;
- reader NOT_CONNECTED;
- reader failure;
- reader aggregation path.

The execution sandbox could not clone the public GitHub repository because DNS access to github.com was unavailable. Therefore the exact full repository loop was not inferred from a partial local copy; it was run by the repository's actual GitHub Actions workflow before merge.

### Remote full Business OS contract suite

Preflight PR: `#176`  
Implementation head: `918d02aa57ee093e46f16fb3777e2268cf8ce993`

GitHub Actions:
- workflow: Business OS Contract Tests
- run: `35447380002`
- job: `105908554870`
- Node: `v20.20.2`
- status: `completed`
- conclusion: `success`

The workflow executed every sorted `09_QA/business-os/*.test.mjs` file.

Remote results:
- Financial Truth: 16/16 PASS;
- Five-Step/PFC regression: 4/4 PASS;
- Monthly Revenue baseline: 27/27 PASS;
- notification-email: 10/10 PASS;
- published-schedule feedback: 2/2 PASS;
- schedule-first flow: 3/3 PASS;
- six standalone assertion-contract files: PASS.

Effective logical checks: **68 PASS / 0 FAIL**.

This remote Node 20 success is the DoD gate.

## Commits / PR

- contract: `d6b2cd61f4e0d4c1eb30a1c5f40b94520cbbec1d`
- helper: `5fc4df09142dcf559f451923e093408d5ad6847c`
- tests: `0cfb30fe0a287485c09fb0dc145dc93c58c4d8a6`
- CI helper-path coverage: `918d02aa57ee093e46f16fb3777e2268cf8ce993`
- PR: `#176`
- merge commit: `0de51f369e2e13fbcef504b0ea6ed262d0649488`

## Gaps carried forward

- No live reconciled Revenue reader is connected.
- Raw operating Revenue remains reconciliation input only.
- Current-period FoodApp settlement coverage remains incomplete from TASK-051 evidence.
- TASK-053 does not decide how TASK-054 will connect/compose the actual reader.
- No Bank/MoMo/COD gaps were changed.
- No Revenue number from private operating data is committed here.

These are data/integration gaps, not Owner boundaries.

## DoD

PASS only after remote CI green.

TASK-053 is complete because:
- one canonical Financial Truth-based Revenue period aggregator exists;
- coverage is explicit;
- missing/partial/gross/untrusted inputs cannot become ACTUAL;
- zero/missing semantics are correct;
- scope/duplicate/overlap rules fail closed;
- no live integration or financial write path was added;
- Business OS Contract Tests run `35447380002` succeeded on Node `v20.20.2`.

Next task: TASK-054 — Revenue baseline adapter tests/integration.  
Autonomy: AUTO_CONTINUE.

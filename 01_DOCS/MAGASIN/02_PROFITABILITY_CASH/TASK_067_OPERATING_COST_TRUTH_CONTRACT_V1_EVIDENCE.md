# TASK-067 — Operating Cost Truth Contract V1 Evidence

Status: DONE / DoD MET / REMOTE_CI_GREEN  
Date: 2026-09-20  
Execution generation: PFC_8H_V2_RUN_01  
Wave: B — OPERATING COST TRUTH

TASK-067 creates one source-agnostic Operating Cost Truth V1 contract/helper that reuses Financial Truth V1. It does not read sources, map payroll/rent/platform data, aggregate total OPEX, calculate Profit, alter Cash/AP/Revenue semantics, add connectors, or create DB/RPC/UI/write paths.

Google Drive was not re-scanned. TASK-066 source inventory remained canonical and no contradiction required another Drive read.

## Five-Step

### QUESTION

Create the minimum canonical Operating Cost truth shape needed by TASK-068/069/070 so exact recognized cost, period aggregate cost and source roles remain explicit while Financial Truth continues to own ACTUAL / ESTIMATE / GAP / NOT_CONNECTED.

### DELETE

TASK-067 deliberately does not add:

- source-specific payroll/rent/utility/FoodApp mapping;
- OPEX baseline/aggregator;
- Profit or Cash formula;
- connector/Drive reader;
- database/migration/RPC/write/UI/dashboard;
- synthetic zero;
- implicit purchase/payment-to-OPEX conversion;
- automatic shared-cost branch allocation.

### SIMPLIFY

Added one contract, one pure helper and one targeted suite:

- `02_CORE/contracts/operating-cost-truth.v1.json`
- `02_CORE/shared/operating-cost-truth-v1.mjs`
- `09_QA/business-os/operating-cost-truth.test.mjs`

Financial quality and numeric truth remain delegated to `normalizeFinancialTruth()`.

### ACCELERATE

TASK-068/069/070 can emit the same wrapper without creating separate quality systems. Existing Partial Financial Baseline accepts canonical PERIOD_AGGREGATE OPEX Financial Truth via `operatingCostTruthForBaseline()` without changing its Profit formula.

### AUTOMATE

The existing Business OS Contract Tests workflow was extended only to:

- watch the new helper;
- syntax-check it;
- run TASK-067 targeted tests.

No new workflow was created.

## Canonical contract semantics

### Cost families

- PAYROLL_LABOR
- RENT
- UTILITIES
- PLATFORM_FEES_PROMOTIONS
- DELIVERY_COST
- MARKETING_ADVERTISING
- OTHER_BRANCH_OPEX
- SHARED_COMPANY_OPEX
- BANK_PAYMENT_FEES

These are semantic families for downstream mapping; the helper contains no source-specific reader logic.

### Claim types

`EXACT_ITEM`

An exact recognized item/line can be ACTUAL even when wider period coverage is PARTIAL, provided the exact item's actuality, recognition period, amount semantics, scope and source metadata are proven.

`PERIOD_AGGREGATE`

A full-period aggregate claim can be ACTUAL only when:

```text
coverage.status = COMPLETE
coverage.coverage_proven = true
```

TASK-067 does not calculate the aggregate. TASK-071 owns Operating Cost Baseline aggregation.

### Source roles

- RECOGNITION_SOURCE
- PAYMENT_SOURCE
- SETTLEMENT_SOURCE
- ALLOCATION_CONTEXT
- BUDGET_CONTEXT
- NOT_CONNECTED

A source can serve multiple real-world purposes, but each Operating Cost claim carries one explicit semantic role. PAYMENT_SOURCE never becomes recognized cost merely because money was paid.

### Amount semantics

- RECOGNIZED_COST
- ESTIMATED_COST
- PAYMENT_AMOUNT
- SETTLEMENT_GROSS
- SETTLEMENT_NET_PAYOUT
- BUDGET_AMOUNT
- ALLOCATION_WEIGHT
- UNKNOWN

ACTUAL recognized Operating Cost requires `RECOGNIZED_COST`.

SETTLEMENT_GROSS and SETTLEMENT_NET_PAYOUT cannot become fee recognition.

## Recognition gates

ACTUAL numeric truth requires all of:

```text
Financial Truth quality = ACTUAL
source role is recognition-capable
amount_semantics = RECOGNIZED_COST
actuality_proven = true
recognition_period_proven = true
amount_semantics_proven = true
scope_proven = true
source_period exactly matches Financial Truth period
source_scope exactly matches Financial Truth scope
```

If any required proof is missing, truth fails closed to GAP/null.

ESTIMATE requires:

```text
Financial Truth quality = ESTIMATE
amount_semantics = ESTIMATED_COST
estimate_proven = true
```

Budget/allocation context can therefore remain explicit ESTIMATE context but cannot become ACTUAL.

## Semantic invariants

Regression proves:

- missing != 0;
- explicit proven zero remains zero;
- GAP / NOT_CONNECTED always value=null;
- ACTUAL / ESTIMATE / GAP / NOT_CONNECTED remain Financial Truth semantics;
- payment-only source != Operating Cost recognition;
- supplier/payment semantics cannot create OPEX by implication;
- payroll payment != labor recognition;
- FoodApp gross != platform fee;
- net settlement/payout != fee recognition;
- explicit settlement fee field can support exact recognized cost;
- budget/context != ACTUAL;
- historical source period != current-period ACTUAL;
- source scope mismatch fails closed;
- unknown/unproven ALL does not become ACTUAL;
- ALL is accepted only when aggregate_proven=true;
- shared company OPEX is not invented as branch cost;
- applied branch allocation requires approved=true;
- exact item ACTUAL can coexist with PARTIAL wider coverage;
- ACTUAL period aggregate requires COMPLETE proven coverage;
- negative Operating Cost is rejected in V1;
- NaN/Infinity fail closed;
- privacy-unsafe evidence fails closed;
- normalization is deterministic/idempotent;
- exact item cannot be passed to Partial Financial Baseline as full OPEX aggregate.

## Negative amount policy

Operating Cost V1 is non-negative.

A negative number is rejected with GAP/null. Credits, rebates or contra-expense semantics are not implicitly represented by sign inversion in TASK-067; a future mapper must define explicit canonical semantics before such values can enter Operating Cost truth.

## Shared/company allocation rule

SHARED_COMPANY_OPEX may remain enterprise/shared truth.

A branch-specific shared-cost ACTUAL is valid only when:

```text
allocation.applied = true
allocation.approved = true
```

ALLOCATION_CONTEXT alone cannot create ACTUAL recognition.

## Partial Financial Baseline compatibility

`operatingCostTruthForBaseline()` accepts only a PERIOD_AGGREGATE wrapper.

An EXACT_ITEM passed directly to the baseline fails closed with:

`BASELINE_REQUIRES_PERIOD_AGGREGATE`

A sanitized complete period aggregate is accepted unchanged by the existing Partial Financial Baseline. Regression confirms:

```text
Revenue = 1000
COGS = 400
Operating Costs = 250
existing management Profit = 350
```

The existing formula remains:

```text
Revenue - COGS - Operating Costs
```

TASK-067 does not duplicate or modify that formula.

Cash Bridge, AP and Revenue component semantics remain unchanged in the same regression.

## Files changed in executable PR

1. `.github/workflows/business-os-contract-tests.yml`
2. `02_CORE/contracts/operating-cost-truth.v1.json`
3. `02_CORE/shared/operating-cost-truth-v1.mjs`
4. `09_QA/business-os/operating-cost-truth.test.mjs`

No source mapper, database, migration, RPC, UI, Drive integration or Profit calculator changed.

## Tests

TASK-067 targeted:

```text
Operating Cost Truth = 31 / 31 PASS
```

Full Business OS:

```text
385 logical checks
385 pass
0 fail
```

Full suite file counts on final tested merge:

```text
47, 40, 46, 24, 29, 35, 16, 4, 27, 10, 31, 37, 34, 2, 3
total = 385
```

## CI / PR chronology

Initial branch gate:

```text
run_id = 35515858114
job_id = 106091556863
runtime = Node v20.20.2
TASK-067 = 31/31
full Business OS = 385/385
conclusion = success
```

Review PR:

```text
PR #204 — TASK-067 — Operating Cost Truth Contract V1
final head = 4c9bbc2b99dd272a6f707ce2ebd422988cef9223
PR-head run = 35515915305
PR-head job = 106091708566
conclusion = success
```

Merge:

```text
merge commit = 6233fc587921ba44a0b61a662b6b316ade8292c2
```

Exact post-merge Business OS gate:

```text
run_id = 35515946855
job_id = 106091793584
runtime = Node v20.20.2
TASK-067 = 31/31
full Business OS = 385/385
failures = 0
conclusion = success
```

## Implementation commits

- `3400b89bc231603d265d9f0a9adc67006e988418` — helper
- `293da484c5502211ff5f80ffb9bb8465b0e319d7` — contract
- `5b19554fb46cc6d5a65785204707df2d71c0fbd9` — tests
- `4c9bbc2b99dd272a6f707ce2ebd422988cef9223` — CI gate / final PR head
- PR #204
- merge `6233fc587921ba44a0b61a662b6b316ade8292c2`

## Remaining gaps

TASK-067 creates semantics, not source truth.

Current TASK-066 evidence gaps remain:

- PAYROLL_LABOR full current-period completeness not proven;
- current RENT recognition source GAP/NOT_CONNECTED;
- current UTILITIES recognition GAP/NOT_CONNECTED;
- current September PLATFORM_FEES_PROMOTIONS coverage incomplete;
- DELIVERY_COST recognition linkage/coverage incomplete;
- current MARKETING_ADVERTISING actual source GAP/NOT_CONNECTED;
- OTHER_BRANCH_OPEX complete category universe not proven;
- SHARED_COMPANY_OPEX complete current recognition and approved branch allocation remain incomplete;
- BANK_PAYMENT_FEES NOT_CONNECTED.

TASK-068/069/070 must map these source families into this contract without weakening the gates above.

## Privacy / Drive

```text
Google Drive re-scan = NOT_REQUIRED
Drive writes/deletes/shares = NONE
Drive IDs/URLs committed = NONE
raw payroll/salary rows committed = NONE
private financial values committed = NONE
credentials/tokens/cookies/secrets committed = NONE
```

## DoD

PASS.

- source-agnostic contract exists;
- Financial Truth V1 remains the only financial-quality spine;
- exact recognition is distinct from payment/settlement/context;
- full-period ACTUAL requires COMPLETE proven coverage;
- shared branch allocation cannot be invented;
- historical evidence cannot drift into current ACTUAL;
- Partial Financial Baseline compatibility is proven without formula change;
- targeted and full remote Node 20 regressions are green on PR head and exact merge;
- no private-source data was added.

Canonical transition after this closure:

```text
TASK-067 = DONE
TASK-068 = READY / AUTO_CONTINUE
current_task = TASK-068
current_task_title = Payroll Cost Mapper
next_task = TASK-069
status = READY
autonomy = AUTO_CONTINUE
blocked = false
requires_user = false
```

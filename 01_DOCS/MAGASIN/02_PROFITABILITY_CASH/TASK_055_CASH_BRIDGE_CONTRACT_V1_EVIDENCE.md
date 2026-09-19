# TASK-055 — Cash Bridge Contract V1 Evidence

Date: 2026-09-19  
Generation: PFC_3H_V1_RESTART_01  
Status: DONE / DoD MET / REMOTE_CI_GREEN

This evidence is privacy-safe for the public repository. No Drive ID/URL, raw financial/customer/employee record, credential, token, secret, private account number, or raw cash transaction is stored here.

## Five-Step decisions

### QUESTION

Define the smallest canonical structure that can later answer:

> Opening cash + proven cash inflows - proven cash outflows = computed ending cash; how far is observed ending cash from computed ending cash?

without mixing liquidity movement with Revenue recognition, purchase/COGS recognition, AP balance, expense recognition, debt schedules, or payment-method metadata.

### DELETE

TASK-055 does not add:
- bridge arithmetic/calculated totals;
- database, migration, RPC or write path;
- dashboard/UI;
- live Bank/MoMo/COD connector;
- synthetic opening/ending balances;
- payment-method-derived account balances;
- purchase-to-cash inference;
- supplier-payment-to-COGS inference;
- Revenue-to-cash-collection inference;
- FoodApp gross fallback;
- debt-schedule estimate promoted to ACTUAL cash;
- free-text Owner-note parsing into ACTUAL Owner movement;
- new ERP-style category expansion.

### SIMPLIFY

Reuse canonical `financial-truth.v1` for every numeric truth.

TASK-055 adds only:
- one acceptance contract: `02_CORE/contracts/cash-bridge.v1.json`;
- one pure event taxonomy/normalizer: `02_CORE/shared/cash-bridge-v1.mjs`.

The helper normalizes individual cash events only. It does not calculate inflow totals, outflow totals, computed ending cash or variance.

### ACCELERATE

Cash movement classification and proof gates are centralized so TASK-056 can perform deterministic arithmetic without re-deciding whether purchase, Revenue, AP, gross FoodApp or Owner notes constitute cash.

### AUTOMATE

Only deterministic normalization and tests are automated. No financial source write/action or live connector is automated.

## Exact taxonomy

### Direction

```text
INFLOW
OUTFLOW
TRANSFER
```

### INFLOW categories

```text
SALES_COLLECTION
OTHER_OPERATING_INFLOW
OWNER_CONTRIBUTION
FINANCING_INFLOW
OTHER_EVIDENCED_INFLOW
```

### OUTFLOW categories

```text
SUPPLIER_PAYMENT
PAYROLL
RENT_UTILITIES
PLATFORM_DELIVERY
MARKETING
OTHER_OPEX
DEBT_REPAYMENT
CAPEX_INVESTMENT
OWNER_WITHDRAWAL
OTHER_EVIDENCED_OUTFLOW
```

### TRANSFER categories

```text
INTERNAL_TRANSFER
```

No additional accounting/ERP categories were introduced.

## Canonical Cash Event semantics

Normalized event fields:

```text
schema_version = cash-bridge.v1
event_id                 optional privacy-safe stable identity
direction                INFLOW | OUTFLOW | TRANSFER
category                 exact compatible taxonomy category
event_date / period      explicit date / Financial Truth period
scope                    Financial Truth explicit scope
payment_method           CASH | BANK | MOMO | OTHER | null
cash_location            optional privacy-safe class/label
status                   ACTIVE | VOID | null
cash_movement_proven     boolean proof gate
proof_basis              privacy-safe semantic evidence label
amount_truth             financial-truth.v1, group=CASH, metric=cash_movement_amount
consolidated_role        INFLOW | OUTFLOW | NEUTRAL_TRANSFER
diagnostics[]            privacy-safe fail-closed reason(s)
```

### Numeric movement rule

A cash movement ACTUAL event requires:
- compatible direction/category;
- `cash_movement_proven=true`;
- Financial Truth ACTUAL metadata valid;
- finite numeric amount;
- amount > 0;
- explicit valid period;
- explicit valid scope;
- privacy-safe source;
- valid as-of;
- valid reconciliation status;
- privacy-safe non-empty lineage.

Missing amount is never converted to zero.

Zero-value movement fails closed as `ZERO_CASH_MOVEMENT_NOT_EVENT`. This is intentionally stricter than balance metrics: a separately evidenced opening or observed ending balance may later legitimately be ACTUAL zero.

Negative / NaN / Infinity fail closed.

GAP and NOT_CONNECTED preserve `value=null`.

### Recognition vs cash movement

The normalizer explicitly rejects proof semantics that are not cash movement:

- `PURCHASE`;
- `AP_BALANCE`;
- `REVENUE_RECOGNITION`;
- `EXPENSE_RECOGNITION`;
- `FOODAPP_GROSS`;
- `DEBT_SCHEDULE_ESTIMATE`;
- `OWNER_FREE_TEXT_NOTE`.

These cannot become ACTUAL cash events merely by carrying a number.

### Supplier payments

`SUPPLIER_PAYMENT` ACTUAL requires:
- direction OUTFLOW;
- category SUPPLIER_PAYMENT;
- proof basis SUPPLIER_PAYMENT;
- status ACTIVE;
- proven movement + Financial Truth metadata.

VOID supplier payment fails closed and is excluded.

Purchase/AP values cannot substitute for a supplier payment event.

Supplier payment remains liquidity evidence; it is not COGS.

### Revenue / provider settlement

Revenue recognition is not SALES_COLLECTION.

FoodApp gross is not settlement cash.

An evidenced provider settlement may support SALES_COLLECTION only when the cash movement itself is proven for the exact supplied period/scope. TASK-055 does not create or infer settlement coverage.

### Expense timing

Expense recognition alone is not a cash outflow event. Cash Bridge concerns payment/liquidity timing, not P&L recognition timing.

### Financing

Debt draw uses FINANCING_INFLOW. Debt repayment uses DEBT_REPAYMENT.

They remain Cash group movements and are not promoted to operating Revenue/OPEX.

A management debt schedule estimate is not ACTUAL cash movement.

### Owner movements

OWNER_CONTRIBUTION / OWNER_WITHDRAWAL require structured proof basis `OWNER_MOVEMENT`.

Free-text Owner note is insufficient for ACTUAL.

### Capex

CAPEX_INVESTMENT is an OUTFLOW cash category. The contract does not classify the movement as operating expense.

### Payment method and cash location

Payment method:
- CASH;
- BANK;
- MOMO;
- OTHER;

is metadata only.

A BANK/MOMO-tagged event does not create:
- account balance;
- opening balance;
- observed ending balance;
- Bank/MoMo account truth.

Optional cash-location/account-class labels are also metadata only.

### Scope

Unknown branch/channel remains null and ACTUAL normalization fails closed under Financial Truth.

`ALL` is accepted only when `aggregate_proven=true`.

No unknown scope is converted to enterprise/consolidated scope.

### Internal transfer

`INTERNAL_TRANSFER` normalizes with:

```text
consolidated_role = NEUTRAL_TRANSFER
```

It is therefore explicitly neutral for consolidated liquidity. TASK-056 may later model evidenced account-level legs, but must not double-count those legs as enterprise inflow/outflow.

## Cash Bridge acceptance shape

The contract defines:

```text
TARGET PERIOD / SCOPE
├── opening_balance
├── events[]
│   ├── categorized inflows
│   ├── categorized outflows
│   └── transfers
├── computed_ending_balance
├── observed_ending_balance
├── cash_variance
├── quality
├── coverage
└── diagnostics[]
```

All numeric truth records use Financial Truth V1.

Opening balance and observed ending balance are independent Financial Truth metrics. They are never derived from supplier-payment methods, BANK/MOMO tags, Revenue rows or payment rows.

TASK-055 intentionally does not compute:

```text
Opening
+ Inflows
- Outflows
= Computed Ending

Observed Ending
- Computed Ending
= Variance
```

That arithmetic belongs to TASK-056.

Until TASK-056 has all required evidenced inputs:
- computed ending remains non-numeric/GAP;
- cash variance remains non-numeric/GAP;
- missing opening is not synthetic zero;
- missing observed ending is not synthetic zero.

## TASK-051 data-status alignment

No Drive re-scan was needed because TASK-051 already established the required semantics.

Carried source status:
- recorded operating cash: usable only for its verified scoped/date coverage;
- Bank account truth: NOT_CONNECTED;
- MoMo account truth: NOT_CONNECTED;
- COD/delivery settlement: NOT_CONNECTED;
- FoodApp settlement: PARTIAL;
- debt schedule: ESTIMATE/context only;
- structured Owner movements: GAP.

## Files

Created:

- `02_CORE/contracts/cash-bridge.v1.json`
- `02_CORE/shared/cash-bridge-v1.mjs`
- `09_QA/business-os/cash-bridge.test.mjs`

Updated:

- `.github/workflows/business-os-contract-tests.yml`
  - helper path triggers added;
  - explicit `node --check` gate;
  - explicit Cash Bridge targeted test gate;
  - full Business OS suite remains final gate.

Regression alignment:

- `09_QA/business-os/five-step-schedule-first.test.mjs`
  - historical PFC cursor assertions made future-safe;
  - completed TASK-052/053/054 must remain DONE;
  - current READY task is verified dynamically against queue `READY / AUTO_CONTINUE`.

## Tests

### Targeted Cash Bridge

```text
29 tests / 29 PASS / 0 FAIL
```

Coverage includes:
- exact direction/category constants;
- acceptance bridge shape;
- valid proven event;
- invalid direction/category;
- ACTIVE supplier payment;
- VOID exclusion;
- BANK/MOMO metadata only;
- purchase != payment;
- AP balance != payment;
- Revenue != collection;
- FoodApp gross != settlement;
- evidenced provider settlement semantics;
- expense recognition != cash timing;
- debt estimate != cash;
- financing movement classification;
- Owner free-text rejection;
- evidenced Owner movement;
- consolidated-neutral transfer;
- missing != zero;
- zero no-op rejection;
- negative/NaN/Infinity;
- privacy-unsafe source/lineage;
- unknown/unproven ALL scope;
- proven ALL scope;
- OTHER_EVIDENCED proof gate;
- GAP/NOT_CONNECTED null preservation;
- deterministic/idempotent normalization;
- privacy-safe optional event/location metadata.

## Remote CI chronology

### Run 35448986896 — full suite failed, Cash Bridge itself passed

PR head: `891772024ee0279dd89c1f9433852d2317d9e008`

- syntax check: PASS;
- targeted Cash Bridge: PASS;
- full suite: FAIL.

Root cause:
`five-step-schedule-first.test.mjs` still expected TASK-053 to be QUEUED/READY, although canonical source-of-truth correctly had TASK-053 and TASK-054 DONE.

This was stale regression state, not Cash Bridge business semantics.

### Run 35449032498 — repair attempt exposed malformed regression patch

Head: `56c945ae0e4430dc5d7556db3775b20a13188767`

- syntax check for Cash Bridge: PASS;
- targeted Cash Bridge: PASS;
- full suite: FAIL.

Root cause:
the first future-safe regression patch contained malformed escaped JS in the test file.

No Core Cash Bridge semantics were changed in response.

### Run 35449121493 — final PR-head gate

Final implementation head:

`f9a36860063ad871d7c17787bc61a814d17beb1f`

Workflow:
- Business OS Contract Tests
- run: `35449121493`
- job: `105913087381`
- Node: `v20.20.2`
- conclusion: `success`

Execution order:

1. `node --check 02_CORE/shared/cash-bridge-v1.mjs` — PASS
2. targeted Cash Bridge tests — **29/29 PASS**
3. full Business OS suite — **97 logical checks / 0 FAIL**

Full suite composition:
- Cash Bridge: 29;
- Financial Truth: 16;
- Five-Step/PFC: 4;
- Monthly Revenue: 27;
- notification-email: 10;
- published-schedule feedback: 2;
- schedule-first flow: 3;
- six standalone contract assertions: 6.

### Post-merge push verification

PR: `#178`

Merge commit:

`3155461caa2a28473924c24006ebd6b27768cc4a`

Push Business OS Contract Tests:
- run: `35449153835`
- job: `105913175686`
- Node: `v20.20.2`
- targeted: 29/29 PASS;
- full suite: 97 logical checks / 0 FAIL;
- conclusion: `success`.

## Commits / PR

- Cash Bridge contract: `3378b927c12bbbf7fea7c66698b6a92d93101faa`
- Cash event normalizer: `cfb8927d484de7da473a6221133002bf8009e2db`
- targeted tests: `48dc4705b8bf5566ad292b2a3aa56d28952b67c7`
- CI path/syntax gate: `f4c6511bbad78a18421ececcaf4a98c0bcd8191d`
- targeted CI gate: `891772024ee0279dd89c1f9433852d2317d9e008`
- final regression syntax cleanup: `f9a36860063ad871d7c17787bc61a814d17beb1f`
- PR: `#178`
- merge: `3155461caa2a28473924c24006ebd6b27768cc4a`

## Read-only / non-goal verification

Cash Bridge helper contains none of:
- `.insert(`
- `.update(`
- `.delete(`
- `.upsert(`
- `.rpc(`

No Procurement DB/migration or production behavior was modified.

No balance number, cash transaction, Drive locator or private account data was committed.

## Gaps carried forward

- Bank balance truth remains NOT_CONNECTED.
- MoMo balance truth remains NOT_CONNECTED.
- COD/delivery settlement remains NOT_CONNECTED.
- FoodApp settlement coverage remains PARTIAL.
- Debt schedule remains estimate/context until reconciled movement evidence exists.
- Structured Owner contribution/withdrawal source remains GAP.
- Opening and observed ending balances remain source-dependent Financial Truth.
- No Cash Bridge totals/ending/variance calculator exists yet by design.

These gaps do not require Owner input to proceed with TASK-056; they remain explicit GAP/NOT_CONNECTED where applicable.

## DoD

PASS only after final remote Business OS CI green.

TASK-055 is complete because:
- one exact canonical cash taxonomy exists;
- numeric events reuse Financial Truth V1;
- non-cash recognition cannot be promoted to cash;
- transfer neutrality is explicit;
- missing/zero/scope/privacy semantics fail closed;
- no bridge arithmetic or write/live integration was added;
- PR-head and merge-commit Business OS CI are green on Node v20.20.2.

Next task: TASK-056 — Cash Bridge pure calculator + fixtures/tests.  
Autonomy: AUTO_CONTINUE.

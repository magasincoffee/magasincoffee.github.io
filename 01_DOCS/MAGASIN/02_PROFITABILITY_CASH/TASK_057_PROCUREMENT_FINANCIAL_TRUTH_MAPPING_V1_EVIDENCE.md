# TASK-057 — Procurement Financial Truth Mapping V1 Evidence

Date: 2026-09-19  
Generation: PFC_3H_V1_RESTART_01  
Status: DONE / DoD MET / REMOTE_CI_GREEN

This evidence is privacy-safe for the public repository. No Drive ID/URL, raw supplier payment record, real payment UUID, private account number, credential, token, secret, customer/employee record, or source-private financial row is stored here.

## Five-Step decisions

### QUESTION

Use the existing Procurement sources to produce:

1. recorded supplier-payment evidence as canonical Cash outflow events; and
2. current supplier payable evidence as canonical AP Financial Truth,

without mixing Purchase, AP, Cash, expense recognition or COGS semantics.

### DELETE

TASK-057 does not add:
- a second Procurement ledger;
- database migration/schema change;
- RPC/write path;
- UI/dashboard;
- Bank/MoMo connector;
- purchase -> cash inference;
- purchase -> COGS inference;
- AP -> cash inference;
- supplier payment -> expense/COGS inference;
- payment-method -> account-balance inference;
- allocation-row double counting;
- synthetic zero for malformed data;
- historical AP backdating from a current-state view;
- Drive parsing or Drive modification.

No Procurement production or migration file was modified.

### SIMPLIFY

One Core helper was added:

`02_CORE/shared/procurement-financial-truth-v1.mjs`

It reuses:
- `normalizeFinancialTruth()`;
- `normalizeCashEvent()`;
- existing Procurement table/view semantics.

No Control Tower adapter change was required.

### ACCELERATE

The helper exposes pure mappers plus an isolated read boundary:

- `mapProcurementSupplierPayment()`;
- `mapProcurementSupplierPayments()`;
- `mapProcurementApRows()`;
- `loadProcurementFinancialTruth()`.

TASK-058 can consume the returned canonical cash events, AP truths, per-source coverage and diagnostics without reinterpreting Procurement tables.

### AUTOMATE

Automation is deterministic mapping/tests/CI only. No financial action is performed.

## Canonical sources

### Supplier-payment cash evidence

Canonical source:

`procurement_supplier_payments`

Source label:

`PROCUREMENT_SUPPLIER_PAYMENTS`

Financial/cash source class:

`RECORDED_PROCUREMENT_PAYMENT`

Payment allocation rows are not a second cash source.

### AP evidence

Canonical source:

`v_procurement_supplier_payables`

Source label:

`V_PROCUREMENT_SUPPLIER_PAYABLES`

Financial source class:

`PROCUREMENT_CURRENT_AP_VIEW`

The view is CURRENT STATE, not a historical AP snapshot.

`v_procurement_order_summary` is not used for TASK-057 numeric cash/AP truth. Existing production views may use it internally, but TASK-057 does not map purchase totals to cash or cost recognition.

## Exact supplier payment -> Cash mapping

An eligible payment maps once to:

```text
direction            = OUTFLOW
category             = SUPPLIER_PAYMENT
proof_basis          = SUPPLIER_PAYMENT
cash_movement_proven = true
quality              = ACTUAL
group                = CASH
metric               = cash_movement_amount
source.class          = RECORDED_PROCUREMENT_PAYMENT
source.label          = PROCUREMENT_SUPPLIER_PAYMENTS
reconciliation       = NOT_APPLICABLE
status               = ACTIVE
```

Payment-method mapping:

```text
CASH | BANK | MOMO | OTHER
```

is metadata only.

It does not create:
- Bank balance;
- MoMo balance;
- cash-location balance;
- opening balance;
- observed ending balance.

### Payment eligibility

Required:
- status exactly ACTIVE;
- finite numeric amount > 0;
- strict finite numeric DB strings are accepted;
- valid ISO payment date;
- payment date inside explicit target period;
- explicit valid caller scope;
- valid source as-of;
- valid payment method.

Rejected/excluded:
- VOID;
- missing amount;
- zero;
- negative;
- NaN/Infinity;
- malformed numeric string;
- invalid date;
- out-of-period date;
- missing scope;
- unproven ALL scope;
- invalid payment method.

No raw amount sign is changed.

### One payment = one event

The mapper reads payment-table semantics only.

Allocation context attached to a payment is ignored for cash aggregation because one payment may be allocated across several purchase orders.

Therefore:

```text
one procurement_supplier_payments row
= at most one canonical supplier-payment cash event
```

Stable runtime payment identity can support deterministic de-duplication.

- identical same identity -> one event;
- conflicting same identity -> source fails closed/PARTIAL;
- allocation rows never add a second event.

No real runtime payment ID is committed in tests/evidence.

### Payment source coverage

Successful, structurally valid payment-source read can produce:

```text
source = PROCUREMENT_SUPPLIER_PAYMENTS
status = COMPLETE
```

for that exact payment source / requested period.

It always carries:

`whole_cash_bridge_complete = false`

because payment-source success does not prove Bank/MoMo/COD/FoodApp/payroll/OPEX or total enterprise liquidity coverage.

A malformed ACTIVE payment row makes the payment source GAP/PARTIAL rather than silently discarding the problem as zero.

## Exact AP -> Financial Truth mapping

TASK-057 produces two point-in-time metrics:

```text
group  = AP
metric = procurement_supplier_ap_outstanding
metric = procurement_supplier_ap_overdue
```

Source:

`V_PROCUREMENT_SUPPLIER_PAYABLES / PROCUREMENT_CURRENT_AP_VIEW`

Reconciliation status:

`NOT_APPLICABLE`

because this is a direct read from the canonical current Procurement payable view, not a separately reconciled bank balance.

### Strict numeric semantics

Rows accept:
- finite JavaScript numbers;
- strict finite numeric DB strings.

They reject:
- null;
- blank string;
- malformed strings;
- NaN;
- Infinity;
- negative outstanding;
- negative overdue.

This intentionally does **not** reuse the legacy Control Tower `finiteNumber(value) => 0` behavior.

A malformed or missing numeric AP row produces GAP/null.

### Empty trusted AP view

A successful, complete current-view read with zero rows is allowed to prove:

```text
outstanding = ACTUAL 0
overdue     = ACTUAL 0
```

This is an explicit complete-source zero, not a missing-data default.

### AP integrity

For each row:

`overdue_balance <= balance_due`

and aggregate overdue cannot exceed aggregate outstanding.

Violation:

`AP_OVERDUE_EXCEEDS_OUTSTANDING`

-> AP metrics GAP/null.

### Point-in-time limitation

The current canonical payable view does not contain historical snapshot semantics.

Current AP is represented as a one-day Financial Truth period:

```text
period.start = current source date
period.end   = current source date
```

If caller requests an AP point date different from the current source date, TASK-057 returns:

`HISTORICAL_AP_SNAPSHOT_NOT_AVAILABLE`

with GAP/null.

It does not attach today's AP to an older month-end.

This limitation is source semantics, not a missing implementation.

## Scope semantics

Both payment mapping and AP truth require explicit caller scope.

Unknown branch/channel remains unknown and fails closed.

`ALL` requires:

`aggregate_proven=true`

No mapper converts null/unknown into ALL.

## Read boundary and source isolation

`loadProcurementFinancialTruth()` uses two independent readers.

### Payment reader contract

Called with:

```text
{
  start: targetPeriod.start,
  end: targetPeriod.end,
  status: "ACTIVE"
}
```

The mapper also deterministically re-checks status/date/amount.

Missing payment reader:
- payment source = NOT_CONNECTED;
- events = [];
- AP source may still succeed.

Payment reader runtime error:
- payment source = GAP/MISSING;
- AP source remains independent.

### AP reader contract

Reads the canonical current AP view.

Missing AP reader:
- AP metrics = NOT_CONNECTED/null;
- payment events may still succeed.

AP runtime error:
- AP metrics = GAP/null;
- payment events remain available.

A failure in one source never deletes successful evidence from the other source.

## Recognition boundary

TASK-057 produces no COGS metric.

It does not map:
- order total;
- purchase total;
- AP balance;
- allocation amount;
- Revenue recognition;
- expense recognition

into supplier-payment cash events.

Supplier payment remains liquidity movement only.

AP remains liability/current payable truth only.

## Files changed

Created:

- `02_CORE/shared/procurement-financial-truth-v1.mjs`
- `09_QA/business-os/procurement-financial-truth.test.mjs`

Updated:

- `.github/workflows/business-os-contract-tests.yml`

The workflow now:
1. checks Procurement mapper syntax;
2. runs TASK-057 targeted tests;
3. runs the full Business OS suite.

No files under:
- `04_OWNER/ControlTower/**`;
- `04_OWNER/Procurement/**`;
- `07_DATABASE/migrations/**`

were changed.

Therefore:
- Owner Control Tower Tests = NOT_APPLICABLE for TASK-057;
- Procurement QA = NOT_APPLICABLE for TASK-057.

## Tests

### TASK-057 targeted

```text
34 tests / 34 PASS / 0 FAIL
```

Coverage includes:
- ACTIVE supplier payment canonical mapping;
- VOID exclusion;
- BANK/MOMO metadata-only behavior;
- allocation context no double-count;
- identical stable-ID de-dup;
- conflicting stable-ID fail closed;
- purchase/order/AP-shaped row cannot become payment cash;
- missing/zero/negative/NaN/Infinity payment;
- strict numeric DB strings;
- malformed numeric strings;
- out-of-period payment;
- invalid date;
- missing scope;
- unproven ALL;
- privacy-safe source/lineage/runtime identity;
- deterministic payment mapping;
- payment-source coverage not whole-Cash coverage;
- AP finite aggregation;
- overdue aggregation;
- successful empty view ACTUAL zero;
- legacy missing->0 regression protection;
- NaN/Infinity/malformed AP;
- negative AP;
- overdue > outstanding;
- current point-in-time semantics;
- historical AP rejection;
- AP scope gate;
- exact payment reader period/ACTIVE filter;
- missing readers NOT_CONNECTED;
- payment failure/AP success isolation;
- AP failure/payment success isolation;
- historical AP request isolation;
- deterministic read result;
- no cost-recognition output;
- static read-only guard;
- canonical source constants.

### Full Business OS suite

Final suite:

**177 logical checks / 0 FAIL**

Composition includes:
- Cash event taxonomy: 29;
- Cash Bridge calculator: 46;
- TASK-057 Procurement mapping: 34;
- Financial Truth: 16;
- Five-Step/PFC: 4;
- Monthly Revenue: 27;
- notification-email: 10;
- published-schedule feedback: 2;
- schedule-first flow: 3;
- six standalone contract assertions: 6.

## Remote CI

### Required final PR-head gate

PR: `#181`

Final head:

`3b40855f3fc51681e3bc2da04edd7990ca2d9637`

Business OS Contract Tests:
- run: `35451826117`
- job: `105920208166`
- Node: `v20.20.2`
- conclusion: `success`

Required stages:
- Cash Bridge helper syntax: PASS;
- Cash taxonomy: 29/29 PASS;
- Cash calculator: 46/46 PASS;
- Procurement Financial Truth helper syntax: PASS;
- TASK-057 targeted: 34/34 PASS;
- full Business OS: 177 logical checks / 0 FAIL.

### Merge

PR #181 merge commit:

`26679a126a327aef25397462cf78ea4fb8130d77`

### Exact post-merge verification

Business OS Contract Tests:
- run: `35451862102`
- job: `105920297244`
- Node: `v20.20.2`
- conclusion: `success`
- TASK-057 targeted: 34/34 PASS;
- full Business OS: 177 logical checks / 0 FAIL.

## Commits / PR

- Core mapper: `e1c9ef176de5b7486cc010999820dc9445e6c1a9`
- targeted tests: `8481b7a1613693f064e08c05f37ff433c836c71c`
- CI gate: `0e5132abc35b9378ba354883e452e47774b7618d`
- PR trigger correction/final head: `3b40855f3fc51681e3bc2da04edd7990ca2d9637`
- PR: `#181`
- merge: `26679a126a327aef25397462cf78ea4fb8130d77`

## Read-only verification

The Core mapper contains none of:

- `.insert(`
- `.update(`
- `.delete(`
- `.upsert(`
- `.rpc(`

No production Procurement write primitive was added or changed.

## Carried-forward gaps

TASK-057 supplies only two Procurement source classes.

Still not proven/connected by this task:
- Bank balance truth;
- MoMo balance truth;
- COD/delivery settlement;
- FoodApp settlement outside its evidenced coverage;
- payroll cash timing;
- rent/utilities and other OPEX payment coverage;
- structured Owner movements where not evidenced;
- historical AP snapshots;
- enterprise Cash Bridge COMPLETE coverage.

Payment source coverage must not be promoted to whole-Cash coverage.

Current AP must not be backdated.

These gaps remain explicit for TASK-058.

## DoD

PASS only after required PR-head Business OS CI became green and the merge completed.

Post-merge Business OS verification is also green.

TASK-057 is complete because:
- recorded ACTIVE Procurement payments map to canonical supplier-payment Cash events exactly once;
- allocations cannot double-count;
- AP is strict current point-in-time Financial Truth;
- malformed/missing values do not become zero;
- historical AP fails closed;
- source isolation preserves successful evidence;
- no Purchase/AP/cost-recognition semantic crossing was introduced;
- no production Procurement/Control Tower/database code was modified;
- required Node 20 Business OS gates are green.

Next task: TASK-058 — Partial Financial Baseline snapshot v1.  
Autonomy: AUTO_CONTINUE.

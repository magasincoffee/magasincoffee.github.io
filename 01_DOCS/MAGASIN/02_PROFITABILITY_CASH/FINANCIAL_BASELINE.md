# MAGASIN — Financial Baseline

Last updated: 2026-09-19

## Status

`PARTIAL FINANCIAL BASELINE V1 IMPLEMENTED / DISCOVERY CONTINUES`

This is **not** a full P&L, statutory financial close, complete month-end close or complete Profit statement.

The current architecture can represent proven facts and gaps without synthesizing missing numbers.

## What is implemented

### Financial Truth V1

Canonical numeric truth uses:

- `ACTUAL`;
- `ESTIMATE`;
- `GAP`;
- `NOT_CONNECTED`.

Every trusted numeric truth requires compatible period/scope/source/as-of/lineage and appropriate reconciliation semantics.

Rules that remain mandatory:

- missing != zero;
- unknown scope != ALL;
- ALL requires explicit aggregate proof;
- estimates never become ACTUAL without evidence.

### Revenue

Monthly Revenue Baseline V1 is implemented.

Revenue may become ACTUAL only with compatible reconciled evidence and COMPLETE coverage.

Raw/gross marketplace values are not used as fallback.

The Owner Control Tower Revenue projection preserves upstream quality and does not expose an amount when evidence is incomplete.

### Cash

Cash Event Taxonomy and Cash Bridge V1 are implemented.

Canonical formulas:

```text
Computed Ending Cash
= Opening Cash
+ Proven Inflows
- Proven Outflows

Cash Variance
= Observed Ending Cash
- Computed Ending Cash
```

Known-evidenced cash movements may remain numeric under PARTIAL source coverage, but they do not prove complete-period Cash.

Payment method is metadata and does not prove account balance.

### Procurement supplier payments

ACTIVE recorded supplier payments can map to canonical `OUTFLOW / SUPPLIER_PAYMENT` Cash events.

Allocations do not add a second cash event.

Purchase/AP values do not become Cash.

Supplier payments do not become COGS.

### AP

Current Procurement supplier AP outstanding/overdue can be represented as point-in-time Financial Truth.

The canonical Procurement payable view is current state only.

Current AP is never backdated to a historical period end.

### Partial Financial Baseline V1

The pure composer can combine:

```text
Revenue
Cash Bridge
Current AP
COGS truth if supplied
Operating Costs truth if supplied
Gated Management Profit
Data Quality
Missing Sources
Diagnostics
Lineage
```

Component failure remains isolated.

A valid Revenue or Cash component remains visible even when another component is GAP.

## Profit rule

The only derived Profit metric currently implemented is:

`management_operating_profit_baseline`

Formula:

```text
Profit = Revenue - COGS - Operating Costs
```

It is numeric only when all three required dependencies are numeric, compatible and sufficiently evidenced.

Quality propagation:

```text
NOT_CONNECTED > GAP > ESTIMATE > ACTUAL
```

Therefore:

- Revenue ACTUAL + COGS GAP -> Profit GAP/null;
- Revenue ACTUAL + COGS ACTUAL + OPEX GAP -> Profit GAP/null;
- one ESTIMATE dependency with no missing dependency -> Profit ESTIMATE;
- all compatible ACTUAL dependencies -> Profit ACTUAL.

Cash and AP are not substitutes for expense recognition and are not Profit dependencies.

This is a management baseline metric, not statutory/net Profit.

## Evidence status

The PFC 3-hour execution generation `PFC_3H_V1_RESTART_01` completed TASK-051 through TASK-059.

Final handoff:

`TASK_059_PFC_3H_FINAL_HANDOFF_EVIDENCE.md`

Final fresh executable regression:

- Business OS: **214 logical checks / 0 fail**, Node v20.20.2, run `35453257400` attempt 2;
- Owner Control Tower: **74/74 PASS / 0 fail + browser E2E PASS**, Node v20.20.2, run `35448195046` attempt 2.

No final regression proved a new production semantic defect.

## What is still missing

The baseline remains PARTIAL because some evidence is still incomplete or not connected.

### Priority gaps

1. **Opening cash + observed ending cash source truth**
   - source/account coverage is not complete enough for a reliable COMPLETE Cash Bridge in all target scopes.

2. **Bank / MoMo / COD balance truth**
   - remains NOT_CONNECTED or not canonically evidenced where no actual reader/source proof exists.

3. **FoodApp settlement**
   - current settlement coverage can remain PARTIAL; gross sales are not settlement cash.

4. **Complete Operating Costs**
   - payroll, rent, utilities and other OPEX recognition must be complete for the target period before complete Profit is claimed.

5. **Company-wide consumption-based COGS**
   - purchases, recipes or inventory counts alone do not prove complete period COGS.

6. **Structured Owner movements**
   - contribution/withdrawal remains GAP wherever a structured evidenced movement does not exist.

7. **Historical AP snapshots**
   - current Procurement AP cannot reconstruct historical month-end AP.

8. **Live reconciled Revenue reader**
   - live source may still be NOT_CONNECTED outside supplied canonical evidence.

9. **Profit ↔ Cash reconciliation**
   - not yet implemented.

10. **Break-even / branch economics**
    - not yet implemented.

11. **Pricing diagnosis**
    - deliberately downstream of reliable unit economics and break-even.

No missing source above is treated as zero.

## Sanitized semantic example

```text
Revenue:
  ACTUAL only if reconciled coverage is COMPLETE

Cash:
  known evidenced inflows/outflows may be numeric
  bridge coverage may remain PARTIAL
  computed ending = GAP when opening/required coverage is missing
  observed ending = GAP/NOT_CONNECTED when source truth is absent

Current AP:
  may be ACTUAL for the current point-in-time view
  is not historical AP

COGS:
  GAP/null until consumption truth is sufficient

Operating Costs:
  GAP/null until period recognition is sufficient

Profit:
  GAP/null while COGS or Operating Costs are missing
```

This is the expected safe Partial Financial Baseline state.

## Next planned architecture task

### TASK-060 — Actual Cash Opening/Ending Source Truth V1

Status:

`PLANNED / WAIT_OWNER_RELEASE`

Objective:

Identify and normalize evidenced opening cash, observed ending cash and explicit source/account coverage so Cash Bridge can progress toward COMPLETE.

TASK-060 must not infer balances from payment method or existing payment rows.

No TASK-060 work is released by completion of TASK-059.

## Rule of evidence

Never fill an unknown financial fact with a synthetic number.

Unknown facts remain:

- `GAP`;
- `NOT_CONNECTED`;
- or `ESTIMATE` only where there is an explicit estimated source.

The repository is public. Raw private financial rows and source locators remain outside Git.

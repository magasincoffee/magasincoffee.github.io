# TASK-056 — Cash Bridge Calculator V1 Evidence

Date: 2026-09-19  
Generation: PFC_3H_V1_RESTART_01  
Status: DONE / DoD MET / REMOTE_CI_GREEN

This evidence is privacy-safe for the public repository. No Drive ID/URL, raw cash transaction, private account number, credential, token, secret, employee/customer record, or source-specific private financial row is stored here.

## Five-Step decisions

### QUESTION

Create the smallest pure deterministic calculator that can answer with evidence:

```text
Opening Cash
+ Proven Inflows
- Proven Outflows
= Computed Ending Cash

Observed Ending Cash
- Computed Ending Cash
= Cash Variance
```

while keeping liquidity truth separate from Revenue recognition, purchase/AP, expense recognition, FoodApp gross, debt estimates and Owner free-text notes.

### DELETE

TASK-056 does not add:
- database, migration, RPC or write path;
- UI/dashboard;
- Drive parsing;
- live Bank/MoMo/COD connector;
- Procurement/Payroll/FoodApp source-specific mapper;
- recognition-to-cash inference;
- forecast or Profit/P&L calculation;
- account-level transfer arithmetic engine;
- synthetic opening/ending/event-source zero;
- a second calculator/truth model.

### SIMPLIFY

Extend the existing canonical helper only:

`02_CORE/shared/cash-bridge-v1.mjs`

with:

`calculateCashBridge(...)`

Reuse:
- `normalizeCashEvent()`;
- `normalizeFinancialTruth()`;
- `cash-bridge.v1`.

No competing helper/model was created.

### ACCELERATE

Return one canonical bridge object suitable for TASK-057/TASK-058:

```text
target_period
scope
opening_balance
events[]
categorized_known_inflows[]
categorized_known_outflows[]
transfers
total_known_inflows
total_known_outflows
computed_ending_balance
observed_ending_balance
cash_variance
coverage
quality
diagnostics[]
lineage[]
```

### AUTOMATE

Automation is deterministic calculation/tests/CI only. No financial action is performed.

## Exact formulas

```text
computed_ending_balance
  = opening_balance
  + total_known_inflows
  - total_known_outflows

cash_variance
  = observed_ending_balance
  - computed_ending_balance
```

Outflow event amounts remain positive magnitudes. The calculator subtracts OUTFLOW totals by formula; it never flips a negative raw amount to repair direction.

## Dependency graph

### Computed ending

`cash_computed_ending_balance` depends on:

1. valid explicit target period;
2. valid explicit target scope;
3. numeric valid opening balance;
4. eligible normalized cash events;
5. explicit event-source coverage with `status=COMPLETE`;
6. no unresolved GAP/NOT_CONNECTED event dependency;
7. no ambiguous scoped transfer.

Observed ending is **not** a dependency of computed ending.

Therefore missing/invalid observed ending does not erase a separately proven computed ending.

### Cash variance

`cash_variance` depends on:

1. valid numeric computed ending;
2. valid numeric observed ending.

If observed ending is missing, computed ending may remain ACTUAL/ESTIMATE while variance is GAP/NOT_CONNECTED.

## Deterministic quality precedence

The calculator documents and tests:

```text
NOT_CONNECTED > GAP > ESTIMATE > ACTUAL
```

Meaning:
- a directly missing required connection produces NOT_CONNECTED/null;
- a non-connection evidence gap produces GAP/null;
- an ESTIMATE numeric dependency caps the corresponding derived truth at ESTIMATE;
- ACTUAL is emitted only when all dependencies for that component are ACTUAL.

Quality is component-local.

For example:
- computed ending may remain ACTUAL;
- variance may be GAP because observed ending is missing;
- overall bridge quality may therefore be GAP;
- the ACTUAL computed ending is not deleted or downgraded merely because variance is unavailable.

## Coverage semantics

Cash events are irregular. The calculator never derives COMPLETE from:
- record count;
- sparse dates;
- date enumeration;
- an empty event list;
- source metadata alone.

Caller must explicitly provide coverage proof.

Supported bridge coverage states:

```text
COMPLETE
PARTIAL
MISSING
```

Source coverage entries may additionally preserve:

`NOT_CONNECTED`.

If coverage is absent, bridge coverage is MISSING.

If caller declares COMPLETE but a required source entry is PARTIAL/MISSING/NOT_CONNECTED, coverage is downgraded to PARTIAL and diagnostic metadata is preserved.

A required NOT_CONNECTED source directly prevents computed ending from becoming numeric and propagates NOT_CONNECTED.

### Known evidenced sums

The calculator distinguishes:

- `known_evidenced_cash_inflows`;
- `known_evidenced_cash_outflows`.

Under PARTIAL/MISSING coverage, these may still be numeric exact sums of valid evidenced ACTUAL/ESTIMATE events.

They are not represented as complete-period totals.

Computed ending cannot use those known sums as proof of full-period movement unless event coverage is explicitly COMPLETE.

### Explicit zero movement

An empty event list can produce:

```text
known evidenced inflows = 0
known evidenced outflows = 0
```

only when explicit COMPLETE coverage proves there were no events for those directions.

Missing coverage never creates zero.

## Opening / observed ending balance rules

Balances normalize through Financial Truth V1.

Required metrics:
- `cash_opening_balance`;
- `cash_observed_ending_balance`.

Opening balance must be a point truth at target start.

Observed ending balance must be a point truth at target end.

Both must match:
- target timezone;
- target Financial Truth scope.

Unknown scope never becomes ALL.

ALL requires `aggregate_proven=true`.

Explicit proven zero balance is valid.

Missing, NaN or Infinity fail closed through Financial Truth.

Negative balances remain allowed because the generic Financial Truth contract permits negative finite values and TASK-056 does not invent an overdraft prohibition.

Payment method metadata never creates an opening or ending balance.

## Event aggregation rules

Calculator input may contain:
- raw cash events, which pass through `normalizeCashEvent()`;
- canonical normalized cash events, which are re-normalized against their Financial Truth semantics.

Only numeric ACTUAL/ESTIMATE eligible events can enter known sums.

GAP / NOT_CONNECTED / VOID / invalid / incompatible events are excluded from numeric sums and preserved through diagnostics/fail-closed dependencies.

### INFLOW

Positive event amount is added to known inflows.

### OUTFLOW

Positive event amount is added to known outflows and subtracted once by the bridge formula.

### TRANSFER

`INTERNAL_TRANSFER` is neutral only for a proven consolidated target:

```text
branch=ALL
channel=ALL
aggregate_proven=true
no account qualifier
```

Its evidenced amount may be reported in the transfer section but is excluded from inflow/outflow arithmetic.

For branch/account-qualified scope, V1 does not guess the net effect. It fails closed with:

`TRANSFER_SCOPE_AMBIGUOUS_UNSUPPORTED_V1`.

No account-level transfer engine was introduced.

## Duplicate protection

Stable privacy-safe `event_id`:

- same ID + identical canonical event → deterministic de-duplicate once;
- same ID + conflicting payload → fail closed with `DUPLICATE_EVENT_ID_CONFLICT`;
- no-ID events are never de-duplicated merely because date/category/amount look identical.

Two no-ID matching rows may be two real transactions.

## Recognition boundary

Calculator does not convert recognition/source facts into movement.

Raw events still go through the TASK-055 normalizer, so:
- PURCHASE != supplier cash payment;
- AP balance != cash outflow;
- Revenue recognition != SALES_COLLECTION;
- expense recognition != payment;
- FoodApp gross != settlement cash;
- debt schedule estimate != financing movement;
- Owner free-text note != Owner movement.

TASK-057 owns Procurement payment/AP read mapping.

## Determinism / lineage

Event ordering is canonicalized before output.

Diagnostics and lineage are deterministic/sorted.

Derived lineage combines privacy-safe:
- opening lineage;
- accepted event lineage;
- observed ending lineage;
- explicit coverage lineage;
- `CASH_BRIDGE_V1`.

Unsafe URL/Drive lineage is removed by Financial Truth/Cash Bridge privacy gates.

## Files changed

### Core

Updated:

- `02_CORE/shared/cash-bridge-v1.mjs`
  - adds `CASH_BRIDGE_COVERAGE_STATES`;
  - adds `CASH_BRIDGE_QUALITY_PRECEDENCE`;
  - adds coverage normalizer;
  - adds balance validation;
  - adds stable-ID event de-duplication;
  - adds known/category/transfer summaries;
  - adds `calculateCashBridge()`;
  - rejects zero movement for ACTUAL and ESTIMATE events.

Updated:

- `02_CORE/contracts/cash-bridge.v1.json`
  - status `CANONICAL_EXECUTABLE`;
  - calculator task traceability;
  - formulas;
  - dependency graph;
  - quality precedence;
  - known-sum / coverage / transfer rules.

### QA

Created:

- `09_QA/business-os/fixtures/cash-bridge-calculator-v1.fixture.json`
- `09_QA/business-os/cash-bridge-calculator.test.mjs`

Fixture is sanitized and contains no Drive/private operating data.

Updated:

- `.github/workflows/business-os-contract-tests.yml`
  - existing helper syntax gate retained;
  - 29 taxonomy targeted tests retained;
  - new 46 calculator targeted gate added;
  - full Business OS suite remains final gate.

## Tests

### Calculator targeted

```text
46 tests / 46 PASS / 0 FAIL
```

Coverage includes:
- exact quality precedence;
- all ACTUAL + COMPLETE;
- computed ending formula;
- variance sign;
- explicit zero balances;
- inflow-only;
- outflow-only;
- empty events + explicit COMPLETE;
- missing coverage != zero;
- missing opening;
- NOT_CONNECTED opening;
- missing / NOT_CONNECTED observed ending while preserving computed ending;
- PARTIAL/MISSING known sums;
- required NOT_CONNECTED source;
- ESTIMATE opening;
- ESTIMATE event;
- GAP/NOT_CONNECTED events;
- consolidated neutral transfer;
- branch/account transfer ambiguity;
- category breakdown/counts;
- negative amount no sign trick;
- missing/NaN/Infinity;
- VOID;
- event scope/timezone/period mismatch;
- unproven ALL;
- opening/ending point mismatch;
- negative balances;
- stable-ID de-dup/conflict;
- no-ID duplicate-looking events retained;
- canonical normalized event input;
- deterministic input-order-independent result;
- privacy-safe lineage;
- payment method != balance;
- recognition/gross raw facts rejected;
- component-local quality;
- coverage source metadata not inferring COMPLETE.

### Existing Cash taxonomy

```text
29 tests / 29 PASS / 0 FAIL
```

## Remote CI

### Required final PR-head gate

PR: `#179`

Final implementation head:

`f7253352b95dcef43d507349cf5ef147b3cb6a5a`

Business OS Contract Tests:
- run: `35450713132`
- job: `105917253032`
- Node: `v20.20.2`
- conclusion: `success`

Execution:
1. `node --check 02_CORE/shared/cash-bridge-v1.mjs` — PASS
2. Cash taxonomy targeted — 29/29 PASS
3. Cash calculator targeted — 46/46 PASS
4. full Business OS suite — **143 logical checks / 0 FAIL**

Full suite composition:
- Cash Bridge calculator: 46;
- Cash event taxonomy: 29;
- Financial Truth: 16;
- Five-Step/PFC: 4;
- Monthly Revenue: 27;
- notification-email: 10;
- published-schedule feedback: 2;
- schedule-first flow: 3;
- six standalone contract assertions: 6.

### Post-merge verification

Merge commit:

`8a7db9fa2e9ba10e0b51ea899e7ca5acb387bf98`

Push Business OS Contract Tests:
- run: `35450750950`
- job: `105917355763`
- Node: `v20.20.2`
- taxonomy: 29/29 PASS;
- calculator: 46/46 PASS;
- full suite: 143 logical checks / 0 FAIL;
- conclusion: `success`.

## Commits / PR

Core calculator was assembled in bounded commits:
- start calculator core: `9e9d13f1702ed1dca43ffce5dc8eb82072987816`
- event aggregation core: `a95aa88ef47d739286320814c8551e890eb0df53`
- known sums / calculator entry: `7f262a69847dbed8fea48208c4de8d746ef9c3d6`
- dependency calculation: `bad41852248a0d5580d691269fa512d94a94de4c`
- ending/variance completion: `b02a0bf57d17bcf98745f4d812e57e1fd5adcb7d`
- contract calculator semantics: `c9b69a1c413ae9116f0a9402e53c4f00847fe473`
- privacy-safe fixture: `e93f690adea32f48752a3b51fcc55775197f42d2`
- calculator tests completed through `bc79ae707dcffc5ca75983736d1618258136f114`
- source-transfer utility repair: `cb75e4f34df8a163c5731c6e77b4583636312a2c`
- calculator CI gate: `4cd6ab301f2d0fae69b8107d5cb56dea45838a4a`
- final contract traceability: `f7253352b95dcef43d507349cf5ef147b3cb6a5a`
- PR: `#179`
- merge: `8a7db9fa2e9ba10e0b51ea899e7ca5acb387bf98`

## Gaps carried forward

TASK-056 is source-agnostic. Therefore existing source gaps remain explicit:
- Bank balance truth: NOT_CONNECTED;
- MoMo balance truth: NOT_CONNECTED;
- COD/delivery settlement: NOT_CONNECTED;
- FoodApp settlement coverage: PARTIAL;
- debt schedule: ESTIMATE/context unless linked to movement evidence;
- structured Owner movements: GAP where not evidenced;
- opening / observed ending balances are only available where a real Financial Truth source proves them.

The calculator does not remove these gaps. It propagates them.

TASK-057 can now map trusted Procurement supplier-payment/AP read evidence into the canonical Cash/AP truth without changing this calculator.

## Read-only / non-goal verification

Core Cash Bridge helper contains none of:
- `.insert(`
- `.update(`
- `.delete(`
- `.upsert(`
- `.rpc(`

No Drive modification occurred.

No Procurement production mapping, database or migration was changed.

## DoD

PASS only after required final PR-head Business OS CI became green.

TASK-056 is complete because:
- formulas are executable and deterministic;
- coverage must be explicit;
- known partial evidence remains distinguishable from complete-period truth;
- computed ending and variance have separate dependency graphs;
- quality propagation is deterministic;
- transfers cannot be guessed at scoped/account level;
- duplicates cannot double-count silently;
- privacy-safe lineage is preserved;
- no source-specific or write-capable integration was added;
- PR-head and merge-commit Node 20 Business OS CI are green.

Next task: TASK-057 — Procurement payment/AP → financial truth read mapping.  
Autonomy: AUTO_CONTINUE.

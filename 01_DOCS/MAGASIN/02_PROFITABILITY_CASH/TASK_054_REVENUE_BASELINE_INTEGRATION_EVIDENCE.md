# TASK-054 — Revenue Baseline Integration Evidence

Date: 2026-09-19  
Generation: PFC_3H_V1_RESTART_01  
Status: DONE / DoD MET / REQUIRED_REMOTE_CI_GREEN

This evidence is privacy-safe for the public repository. No Drive ID/URL, raw financial/customer/employee record, credential, token, or secret is stored here.

## Five-Step decisions

### QUESTION

Prove that canonical Monthly Revenue Baseline V1 can cross the Owner/Control Tower boundary without losing Financial Truth quality, scope or coverage semantics and without exposing an amount when the upstream baseline is incomplete or untrusted.

### DELETE

TASK-054 does not add:
- a second Revenue truth model;
- a new dashboard/UI;
- database, migration, RPC or write path;
- a live Revenue connector;
- raw/gross fallback;
- synthetic zero;
- implicit ALL scope;
- a duplicate monthly aggregator;
- production monthly wiring without explicit period/scope/coverage/reader context.

Google Drive was not re-scanned because TASK-051/053 already established the required source/coverage semantics.

### SIMPLIFY

The existing Control Tower Revenue adapter remains the only Owner Revenue adapter:

`04_OWNER/ControlTower/revenue-adapter-v1.mjs`

It now contains:
- the existing daily `assessRevenueCandidate()` / `loadReconciledRevenue()` compatibility path unchanged in behavior;
- `projectMonthlyRevenueBaseline()` — pure projection from canonical Monthly Revenue Financial Truth into the Control Tower Revenue section;
- `loadMonthlyRevenueForControlTower()` — thin async boundary that calls Core `loadMonthlyRevenueBaseline()` only with explicit `targetPeriod/scope/coverage/reader`.

Canonical truth remains in Core. Control Tower is only a projection.

### ACCELERATE

Preserve monthly `scope`, `coverage`, `diagnostics`, `lineage` and reconciliation metadata inside the adapter result while keeping the existing Control Tower display contract:

```text
{ quality, amount, source, asOf, message }
```

This allows future consumers to inspect why a number is hidden without reimplementing Financial Truth.

### AUTOMATE

Automation added only as deterministic adapter/integration regression coverage and existing CI execution. No live source or financial action was automated.

## Exact projection rules

### ACTUAL amount exposure

Control Tower `amount` is numeric only when all are true:

- upstream baseline `quality=ACTUAL`;
- upstream `group=REVENUE`;
- `coverage.status=COMPLETE`;
- `reconciliation_status=RECONCILED`;
- upstream `value` is a JavaScript number;
- value is finite and >= 0;
- branch and channel scope are explicit;
- any branch/channel `ALL` requires `aggregate_proven=true`;
- canonical source class + label are privacy-safe and present;
- `as_of` is a valid ISO timestamp with timezone;
- privacy-safe lineage is non-empty.

Explicit proven `0` remains `ACTUAL / amount=0`.

### Fail-closed quality

- upstream `NOT_CONNECTED` stays `NOT_CONNECTED`, amount null;
- upstream `GAP` stays `GAP`, amount null;
- upstream `ESTIMATE` stays `ESTIMATE`, amount null;
- ACTUAL with PARTIAL/MISSING/invalid coverage degrades to GAP;
- ACTUAL with invalid/missing amount degrades to GAP;
- ACTUAL with missing/unproven scope degrades to GAP;
- ACTUAL with invalid source/as-of/lineage degrades to GAP;
- projection never upgrades a weaker upstream quality to ACTUAL.

Missing amount is never coerced to zero.

### Scope and legacy snapshot debt

TASK-054 intentionally did not change `snapshot-v1.mjs`.

Legacy snapshot context still defaults absent `branchScope` to `ALL`, but the canonical monthly Revenue adapter does not consume that default and does not use it as Revenue proof.

Regression coverage proves:
- monthly projection with null branch/channel remains null internally;
- quality is GAP;
- amount remains null even if the legacy snapshot context displays `branchScope=ALL`.

Therefore the existing snapshot default cannot promote unknown Revenue scope into ACTUAL.

### Reader boundary

`loadMonthlyRevenueForControlTower()` calls:

`loadMonthlyRevenueBaseline({ targetPeriod, scope, coverage, reader })`

No invented reporting date, branch, channel, coverage or reader is supplied.

- missing reader → Core NOT_CONNECTED → Control Tower NOT_CONNECTED/null;
- reader throw → Core GAP → Control Tower GAP/null;
- untrusted/unreconciled records → GAP/null;
- mixed scope/unproven ALL → GAP/null;
- gross Revenue facts → GAP/null;
- no gross/raw fallback argument is consumed.

Production `control-tower-v1.js` remains on the existing daily reader path because the current UI/runtime has only `reportingDate` and no verified monthly reader/period/scope/coverage context.

## Files changed

### TASK-054 implementation

- `04_OWNER/ControlTower/revenue-adapter-v1.mjs`
  - commit `0173eb9a180524964d252ab82687283c16526338`
- `09_QA/owner-control-tower/revenue-baseline-integration.test.mjs`
  - commit `c8669da03c4791fd97b9983bf82e35beb351e71d`

### CI regression repairs discovered by the triggered People Shift workflow

The People Shift workflow is configured to trigger on Control Tower paths, so its failures were reconciled before merge.

1. Historical TASK-036 test assumed the project's current task must still equal TASK-036.
   - root cause: stale historical assertion after canonical cursor advanced to PFC tasks;
   - fix: assert TASK-036 remains DONE/preserved rather than forcing it to remain current;
   - file: `09_QA/people-shift/task-036-schedule-closure.test.mjs`;
   - commit: `d234d8b1b072408ea076a29c1197d8be39d0b43a`;
   - no People/Shift business rule changed.

2. Day-10 fixture loaded Employee availability/schedule engines before the iframe body was guaranteed ready.
   - symptom: `TypeError: Cannot read properties of null (reading 'dataset')`;
   - fix: fixture injects Employee engines only after the fixture iframe has a ready body;
   - file: `09_QA/people-shift/day10-fixture.html`;
   - commit: `5ec82375f66fdffedd80f26872a92020a72c317f`;
   - production Employee engines were not changed.

PR: `#177`  
Merge commit: `d28b0064b82ababc13071264aa34be506e0ce868`

## Read-only guarantee

Static regression verifies Revenue adapter source contains none of:

- `.insert(`
- `.update(`
- `.delete(`
- `.upsert(`
- `.rpc(`

TASK-054 added no database/write primitive.

## Tests

### Local syntax gate

Execution sandbox Node: `v22.16.0`

```text
node --check 04_OWNER/ControlTower/revenue-adapter-v1.mjs
PASS
```

### Local compatibility smoke

Because the sandbox cannot resolve `github.com`, it could not clone the full repository. A local isolated compatibility smoke used the exact changed adapter with a loader stub only to exercise legacy daily behavior and pure projection behavior:

```text
9 tests / 9 PASS / 0 FAIL
```

This local smoke is not used as the DoD gate.

### Revenue-targeted coverage in repository suite

Revenue-targeted Owner tests on the final branch comprise:

- existing `revenue-adapter.test.mjs`: 9 cases;
- new `revenue-baseline-integration.test.mjs`: 18 cases;
- existing `revenue-integration.test.mjs`: 3 cases.

Total Revenue-targeted cases: **30**.

The repository's exact full Owner suite is the authoritative execution gate below.

## Required remote CI

### Owner Control Tower Tests — REQUIRED

Final implementation head:

`5ec82375f66fdffedd80f26872a92020a72c317f`

Workflow:
- name: Owner Control Tower Tests
- run: `35448195046`
- job: `105910687616`
- Node: `v20.20.2`
- conclusion: `success`

Unit/fixture result:

```text
74 tests / 74 PASS / 0 FAIL
```

Browser result:

```text
CONTROL_TOWER_BROWSER_E2E=PASS
```

Existing daily Revenue tests, snapshot tests, partial-source/source-isolation tests and all sibling Control Tower sections passed.

### People Shift Day-10 Tests — collateral path gate, resolved

This workflow triggers on `04_OWNER/ControlTower/**` and `09_QA/owner-control-tower/**`, so it was also required to be reconciled before merge.

Initial failures:
- run `35448045651`: stale TASK-036 current-task assertion;
- run `35448100221`: fixture iframe readiness page errors.

Final run:
- run: `35448195053`
- job: `105910687699`
- Node: `v20.20.2`
- conclusion: `success`

Key final results:
- People Shift regression: 17/17 PASS;
- Control Tower regression inside workflow: 74/74 PASS;
- `PEOPLE_SHIFT_DAY10_BROWSER_E2E=PASS`;
- `CONTROL_TOWER_BROWSER_E2E=PASS`;
- all Employee/Manager browser regressions in the workflow passed.

### Business OS Contract Tests — remote NOT_APPLICABLE

TASK-054 final PR did not modify:
- `02_CORE/contracts/**`;
- `02_CORE/shared/financial-truth-v1.mjs`;
- `02_CORE/shared/monthly-revenue-baseline-v1.mjs`;
- `09_QA/business-os/**`;
- the Business OS contract workflow.

Therefore `Business OS Contract Tests` did not trigger for the TASK-054 final head. Remote status is **NOT_APPLICABLE**, not green.

The canonical Core files used by the adapter are unchanged from TASK-053, whose Business OS Contract Tests run `35447380002` was green on Node v20.20.2. That prior run is historical supporting evidence only and is not represented as a TASK-054 remote run.

## Post-merge push verification

Merge commit:

`d28b0064b82ababc13071264aa34be506e0ce868`

GitHub push workflows also completed successfully on the exact merge commit:

- Owner Control Tower Tests run `35448260939` — `success`;
- People Shift Day-10 Tests run `35448260952` — `success`;
- Validate MAGASIN GitHub Pages source run `35448260934` — `success`.

These post-merge confirmations are additional evidence; the cursor had already been authorized by the green final PR head required gates.

## Gaps carried forward

- Production monthly Control Tower wiring remains intentionally absent.
- Live reconciled Revenue reader remains NOT_CONNECTED until an explicit reader is connected with real period/scope/coverage semantics.
- Legacy snapshot context default `branchScope=ALL` remains projection debt, but cannot promote canonical monthly Revenue into ACTUAL through this adapter.
- No current Revenue number is committed to Git.
- Bank/MoMo/COD and other PFC source gaps are unchanged.

No Owner/security boundary was encountered.

## DoD

PASS after final-head required CI became green.

TASK-054 may close because:
- canonical Core truth remains authoritative;
- Owner projection cannot upgrade incomplete/untrusted Revenue;
- existing daily adapter remains compatible;
- no synthetic zero, implicit ALL, gross fallback or write path was introduced;
- Owner Control Tower full tests + browser E2E are green;
- the collateral People Shift workflow was also repaired and green;
- Business OS remote workflow is correctly classified NOT_APPLICABLE for this diff.

Next task: TASK-055 — Cash event taxonomy + Cash Bridge contract v1.  
Autonomy: AUTO_CONTINUE.

# TASK-064 — Cash Bridge Source Integration V1 Evidence

Date: 2026-09-20  
Execution generation: `PFC_8H_V2_RUN_01`  
Status: **DONE / DoD MET / REMOTE_CI_GREEN**

Google Drive remained **READ-ONLY** and was not re-scanned. TASK-064 adds orchestration only: no source reader, connector, DB/migration/RPC/write path, UI/dashboard, synthetic zero, source-specific financial arithmetic, or replacement Cash Bridge formula.

## Five-Step

**QUESTION** — Integrate canonical source mapping, point/event coverage, and the existing Cash Bridge calculator so arithmetic is allowed only when source truth dependencies are actually proven.

**DELETE** — No Drive reader, Bank/MoMo/COD integration, duplicate balance/coverage contracts, duplicate bridge arithmetic, first-transaction opening, computed-remainder-to-observed-ending promotion, coverage-hint-to-COMPLETE promotion, or current-point backdating.

**SIMPLIFY** — Added one pure integration helper and one targeted test suite. Existing TASK-061/062/063 helpers and TASK-056 calculator remain authoritative.

**ACCELERATE** — Reuse existing validators and adapters rather than recreating source, balance, coverage, or bridge logic.

**AUTOMATE** — Business OS workflow now syntax-checks and executes TASK-064 targeted tests before the existing TASK-063→Financial Truth/Cash Bridge regression chain and full Business OS suite.

## Canonical API

Helper:

`02_CORE/shared/cash-bridge-source-integration-v1.mjs`

Export:

`integrateCashBridgeSources({...})`

Version:

`cash-bridge-source-integration.v1`

Input surface supports the canonical integration dependencies:
- target period;
- target scope;
- opening source or canonical mapped balance;
- opening coverage;
- cash events;
- movement coverage;
- observed-ending source or canonical mapped balance;
- ending coverage.

Output contains:
- canonical mapped opening component;
- canonical opening coverage;
- canonical movement coverage;
- canonical mapped ending component;
- canonical ending coverage;
- prepared bridge inputs;
- readiness/component diagnostics;
- the canonical result returned by existing `calculateCashBridge()`;
- privacy-safe lineage.

No numeric financial side-channel is introduced.

## Dataflow

```text
opening source / premapped envelope
  → TASK-062 mapCashBalanceSourceFact()
  → TASK-061 canonical Cash Balance Truth
  → TASK-063 OPENING_BALANCE coverage evaluation
  → point gate
  → bridge opening Financial Truth or GAP/NOT_CONNECTED

cash events
  + raw/canonical movement coverage
  → TASK-063 evaluateCashSourceCoverage()
  → cashSourceCoverageForBridge()
  → existing Cash Bridge event inputs

ending source / premapped envelope
  → TASK-062 mapCashBalanceSourceFact()
  → TASK-061 canonical Cash Balance Truth
  → TASK-063 OBSERVED_ENDING_BALANCE coverage evaluation
  → point gate
  → bridge observed-ending Financial Truth or GAP/NOT_CONNECTED

all prepared inputs
  → TASK-056 calculateCashBridge()
```

The integration helper calls `calculateCashBridge()` exactly once and contains no duplicate `Opening + Inflows - Outflows` or variance arithmetic.

## Component gates

### Opening

A numeric opening dependency reaches Cash Bridge only when all of these hold:
- canonical balance is valid for role `OPENING`;
- target date/timezone/scope are compatible;
- TASK-063 coverage role is `OPENING_BALANCE`;
- evaluated aggregate coverage is `COMPLETE`;
- the same canonical balance is represented by a source entry that is `COMPLETE` and `coverage_proven=true`;
- aggregate target/account proof is explicit when target is `ALL`.

Otherwise the bridge-facing opening dependency is null Financial Truth:
- `NOT_CONNECTED` when a required source is not connected;
- otherwise `GAP`.

The original mapped component remains separately available and is never upgraded or relabeled. A valid computed opening remains `COMPUTED_BALANCE`.

### Movement events

Movement coverage must:
- evaluate under TASK-063 as `MOVEMENT_EVENTS`;
- match target period/timezone/scope;
- convert only through `cashSourceCoverageForBridge()`.

`PARTIAL` or `MISSING` coverage can preserve exact known-evidenced movement sums already accepted by Cash Bridge, but cannot authorize computed ending. Required `NOT_CONNECTED` propagates fail-closed.

Event quality/provenance is not upgraded by coverage.

### Observed ending

A numeric observed-ending dependency reaches Cash Bridge only when:
- canonical balance role is `OBSERVED_ENDING`;
- basis is `OBSERVED_BALANCE`;
- target point/timezone/scope/account semantics match;
- TASK-063 ending coverage evaluates `COMPLETE`;
- the same canonical balance is matched by a `COMPLETE + coverage_proven` source entry.

Incomplete ending coverage gates variance but does not erase an independently valid computed ending.

Calculated remainder/current computed balance cannot satisfy observed ending.

## Security and aggregation

- Pre-mapped envelopes are revalidated through TASK-062; mapper version alone is never trusted.
- Raw or pre-evaluated coverage is re-evaluated by TASK-063; a forged `status=COMPLETE` cannot bypass `universe_proven` or required-member proof.
- Coverage of one balance cannot be used to authorize a different balance identity.
- One branch/account cannot satisfy enterprise `ALL`.
- Enterprise point truth requires explicit balance account aggregate proof plus TASK-063 aggregate universe proof.
- Privacy-unsafe metadata fails closed and is not echoed as output lineage/diagnostics.
- Missing, blank and NaN inputs never become zero.

## Component isolation acceptance

Verified:
1. opening COMPLETE + movement COMPLETE + ending missing → computed ending may remain numeric; variance is GAP/null;
2. opening missing + movement COMPLETE + observed ending valid → observed ending is preserved; computed ending and variance remain GAP/null;
3. opening COMPLETE + movement PARTIAL → known-evidenced sums remain visible; computed ending is GAP/null;
4. ending source failure does not erase valid opening/events;
5. movement coverage failure does not erase valid observed point balances.

## Current TASK-060→063 profile

The sanitized acceptance profile reproduces the current canonical source semantics:

- internal monthly carry-forward opening remains incomplete/GAP because observed anchor + complete movement provenance are not available;
- internal movement coverage through **2026-09-16** is `PARTIAL` for a later September target;
- direct observed ending remains unavailable / required source `NOT_CONNECTED` where declared relevant;
- known-evidenced movement sums can remain numeric;
- `cash_computed_ending_balance = null`;
- `cash_observed_ending_balance = null`;
- `cash_variance = null`.

TASK-064 therefore does **not** turn the current real source profile into COMPLETE Cash truth.

## Fully proven sanitized scenario

A fabricated QA-only scenario with:
- valid proven opening;
- COMPLETE movement coverage;
- evidenced inflows/outflows;
- valid observed ending with COMPLETE point coverage

produced the existing Cash Bridge results without formula duplication:
- sanitized opening: 100;
- sanitized inflow: 50;
- sanitized outflow: 20;
- computed ending: 130;
- sanitized observed ending: 125;
- variance: -5.

These are test-only fabricated values, not operating data.

Explicit observed zero is preserved when fully proven. A finite negative generic Bank balance is also preserved where the existing balance contract allows it.

## Files

Added:
- `02_CORE/shared/cash-bridge-source-integration-v1.mjs`
- `09_QA/business-os/cash-bridge-source-integration.test.mjs`

Updated:
- `.github/workflows/business-os-contract-tests.yml`

Unchanged:
- `02_CORE/shared/cash-bridge-v1.mjs`
- TASK-061 Cash Balance Truth contract/helper;
- TASK-062 source mapper semantics;
- TASK-063 coverage contract/helper.

No new contract was necessary.

## Tests

TASK-064 targeted integration:
- **24 tests**
- **24 pass**
- **0 fail**

Regression chain on final PR head and post-merge:
- TASK-063 Cash Source Coverage: 35/35;
- TASK-062 Cash Balance Source Mapper: 47/47;
- TASK-061 Cash Balance Truth: 40/40;
- Financial Truth: 16/16;
- Cash Bridge taxonomy: 29/29;
- Cash Bridge calculator: 46/46;
- Procurement Financial Truth: 34/34;
- Partial Financial Baseline: 37/37;
- full Business OS: **354 logical checks / 0 fail**.

The first PR run `35480707289` found one QA fixture construction defect: passing JavaScript `undefined` activated the fixture's default value. The fixture was corrected by explicitly removing the value field. No production gate or provenance/coverage rule was weakened.

## Remote CI / merge

Pull request:
- **PR #189 — TASK-064 — Cash Bridge Source Integration V1**

Final PR head:
- `28e78455ade9f0c5f1ac367d631ad43a89b9f1e7`

Required final PR-head Business OS Contract Tests:
- run: `35480729934`
- job: `105997926173`
- runtime: **Node v20.20.2**
- TASK-064 targeted: **24/24 PASS**
- full Business OS: **354 logical checks / 0 fail**
- conclusion: **success**

Merge commit:
- `f00279e99ed3d1bdc4e4b0ed9c7f26a3e6f3f177`

Exact post-merge Business OS Contract Tests on `main`:
- workflow run #292
- run: `35480761123`
- job: `105998010615`
- runtime: **Node v20.20.2**
- TASK-064 targeted: **24/24 PASS**
- full Business OS: **354 logical checks / 0 fail**
- conclusion: **success**

## Remaining source gaps

TASK-064 intentionally does not resolve the evidence gaps discovered in TASK-060:
- verified direct opening/ending balance sources are still incomplete;
- physical till/safe, Bank, MoMo, COD, Owner-held company cash and provider account balance remain GAP/NOT_CONNECTED where applicable;
- current internal movement evidence remains bounded rather than complete for the later September target;
- enterprise account/source universe must still be proven by evidence, never inferred.

These gaps do not pause `PFC_8H_V2_RUN_01`.

## DoD

PASS:
- mapper + three coverage roles + existing calculator integrated without semantic upgrade;
- point coverage really gates bridge arithmetic;
- forged coverage/premapped provenance bypasses fail closed;
- current source profile remains non-COMPLETE;
- fully proven future inputs produce the existing Cash Bridge behavior unchanged;
- no duplicate bridge arithmetic;
- no source read/write or external API path in integration helper;
- final PR-head CI green;
- exact post-merge CI green.

Canonical handoff after this evidence:

```text
TASK-064 = DONE
TASK-065 = READY / AUTO_CONTINUE
current_task = TASK-065
current_task_title = Cash Truth Regression & Evidence
next_task = TASK-066
status = READY
autonomy = AUTO_CONTINUE
blocked = false
requires_user = false
```

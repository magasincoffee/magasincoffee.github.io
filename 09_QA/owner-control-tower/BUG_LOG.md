# Owner Control Tower Bug Log

## BUG-CT-001 — GAP/invalid quality can retain numeric values

- Date: 2026-09-18
- Component: `04_OWNER/ControlTower/snapshot-v1.mjs`
- Reproduction: normalize a metric section with an invalid quality value and a numeric field.
- Observed: quality fails closed to `GAP`, but the numeric metric remains visible.
- Impact: a failed/untrusted source could still expose a number while labeled GAP, violating the Control Tower no-synthetic/no-untrusted-number invariant.
- Root cause: metric normalization validated quality and numeric values independently.
- Fix: numeric metrics are retained only for `ACTUAL` or `ESTIMATE`; `GAP` and `NOT_CONNECTED` always redact metrics to `null`. Missing quality defaults to `NOT_CONNECTED`; invalid explicit values fail to `GAP`.
- Status: VERIFIED — regression suite `35310598259` PASS


## BUG-CT-002 — Route/auth integration test hard-codes obsolete render expression

- Date: 2026-09-18
- Component: `09_QA/owner-control-tower/access-route.test.mjs`
- Reproduction: TASK-014 replaces the initial immutable `state` with mutable raw snapshot state so adapters can update sections independently.
- Observed: integration test searches for literal `render(state)` and fails even though Owner authorization still occurs before every render.
- Impact: false-negative CI blocks the payables adapter task.
- Root cause: test asserted an implementation string instead of the actual invariant.
- Fix: locate the first `render(` call inside `boot()` and assert it occurs after `await requireOwnerAccess`.
- Status: VERIFIED — run `35310936375` PASS


## BUG-CT-003 — Revenue ESTIMATE can retain an unreconciled numeric value

- Date: 2026-09-18
- Component: `04_OWNER/ControlTower/snapshot-v1.mjs`
- Reproduction: normalize Revenue with `quality: ESTIMATE` and a numeric amount.
- Observed: the generic metric normalizer keeps the amount because ESTIMATE is trusted for other attention metrics.
- Impact: a caller could display unreconciled/gross revenue while merely relabeling it ESTIMATE, bypassing TASK-016's fail-closed revenue rule.
- Root cause: Revenue shared the same numeric-trust rule as Payables/Workforce even though Revenue requires reconciliation before any official amount is exposed.
- Fix: Revenue now has a stricter normalization path: only `ACTUAL` may retain `amount`; all non-ACTUAL revenue states redact it to `null`.
- Status: VERIFIED — run `35315205100` PASS


## BUG-CT-004 — Blank reconciled amount coerces to ACTUAL zero

- Date: 2026-09-18
- Component: `04_OWNER/ControlTower/revenue-adapter-v1.mjs`
- Reproduction: pass a trusted, RECONCILED record for the selected date with `amount: null`, an empty string, or whitespace.
- Observed: JavaScript numeric coercion converts blank/null values to `0`, allowing an incomplete record to appear as ACTUAL zero revenue.
- Impact: missing revenue could be silently presented as a valid reconciled zero.
- Root cause: amount validation called `Number(candidate.amount)` before rejecting blank/null source values.
- Fix: reject null/undefined/blank string amounts before numeric conversion; keep genuine numeric zero valid.
- Status: VERIFIED — run `35315530551` PASS

## BUG-CT-005 — Source exception can be misclassified as Owner auth failure

- Date: 2026-09-18
- Component: `04_OWNER/ControlTower/control-tower-v1.js`
- Reproduction: after successful Owner authorization, make a source dependency such as `core.supabase.get()` or a read adapter throw unexpectedly.
- Observed: the outer `try/catch` catches the source exception, hides the Control Tower app and opens the permission-denied screen.
- Impact: one source outage can blank otherwise healthy cards and falsely tell an authenticated Owner that access is denied.
- Root cause: authentication and all post-auth source loading shared one exception boundary.
- Fix: authentication now returns through its own denial boundary; every post-auth source loader is wrapped by `loadSectionSafely`, which converts unexpected failures to section-local `GAP` without leaking backend error details.
- Regression evidence: pre-fix run `35315562834` failed; fixed HEAD run `35315590063` passed.
- Status: VERIFIED

## BUG-CT-006 — Global data-confidence field can remain blank after sources load

- Date: 2026-09-18
- Component: `04_OWNER/ControlTower/index.html` + `control-tower-v1.js`
- Reproduction: open the Day-7 Control Tower after the global confidence context card is present and let source cards finish loading.
- Observed: the card remains `—` because no renderer populates `#globalConfidence`.
- Impact: the screen contract promises a global data-confidence state, but Owner cannot see an aggregate source-quality summary.
- Root cause: UI markup was added without binding it to normalized `dataQuality`.
- Fix: add a deterministic quality-count summary and render it on every snapshot update; unknown quality fails into GAP.
- Regression: unit + browser E2E assert final Owner and partial-source confidence summaries.
- Status: PENDING CI VERIFICATION

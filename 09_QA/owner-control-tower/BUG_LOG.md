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

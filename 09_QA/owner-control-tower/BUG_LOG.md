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

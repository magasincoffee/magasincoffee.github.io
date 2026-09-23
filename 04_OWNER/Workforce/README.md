# MAGASIN Owner Workforce

SCHED-05 makes Owner Scheduling an enterprise oversight/exception projection over the same canonical scheduling engine used by Manager.

## Canonical active path

```text
04_OWNER/Workforce/
  → runtime/owner-workforce-runtime.html
  → 05_MANAGER/Workforce/draft-publish-v1.js
  → create / replace / validate / review / publish RPCs
  → work_schedules
```

Owner selects an authorized store and week. There is **no Owner-only scheduling writer** and no browser direct DML.

## OLD / NEW inventory

| Owner asset | SCHED-05 classification | Active authority |
|---|---|---|
| `runtime/owner-workforce-runtime.html` | **REPLACE/WIRE** to canonical writer | active Owner scheduling surface |
| `03-publish/engine-v1.js` | **WRAP / DEPRECATE** | compatibility loader only; no mutation RPC implementation |
| `02-review/engine-v1.js` | **DEPRECATE ACTIVE UI** | not loaded by Owner runtime; SCHED-02 server mutations already revoked |
| `01-demand/engine-v1.js` | **DEPRECATE ACTIVE UI** | not loaded by Owner runtime; staffing mutators already server-revoked |
| `05_MANAGER/Workforce/draft-publish-v1.js` | **REUSE** | sole Owner/Manager browser scheduling writer |
| `work_schedules` | **KEEP** | single official/current assignment truth |

Historical legacy files remain for lineage only and must not be reintroduced as active mutation paths.

# MAGASIN Supervisor

Production local autonomy runtime for MAGASIN Business OS.

## Current architecture

The active production orchestration mode is **Three-Lane V1**. Each lane has isolated persisted state:

- one Owner-selected **Brain** conversation;
- one Owner-selected or Robot-created **Work** conversation;
- one lane registry entry containing task, dispatch, relay and generation state.

The Robot never auto-discovers or auto-replaces an Owner-selected Brain. Brain and Work conversation URLs remain local and are not written to repository logs.

The Windows wrapper still retains the legacy `BRAIN_WORKER_V1` entry point as a compatibility fallback because `run-supervisor.ps1` can select that mode from previously persisted authoritative state. It is not the current Three-Lane production path.

## Three-Lane delivery contracts

### Brain -> Work

Work delivery uses the machine envelope:

```text
MAGASIN_WORK_DISPATCH_V1
task_id=<task>
dispatch_id=<deterministic id>
```

`dispatch_id` is deterministic from lane + Brain directive. Reconciliation is marker-authoritative on the exact Work conversation:

- marker present: confirmed;
- stable Work with marker absent: not confirmed and safe to retry;
- busy/unstable Work: pending;
- one reconciliation reload is bounded for Work dispatch recovery.

The Brain directive digest is persisted when dispatch is confirmed so the same directive cannot be redispatched after restart.

### Work -> Brain

Result relay carries a deterministic `relay_id=<id>` marker and the full Work result plus one screenshot.

Relay reconciliation in v2026-09-19.49 is marker-authoritative on the exact persisted Brain:

- relay marker present: confirmed exact-once;
- Brain stable and marker absent: not confirmed, clear the latch and retry safely;
- Brain busy/unstable: pending;
- unrelated Brain activity does not create a terminal blocked latch;
- legacy v43 `reconcile_blocked` relay latches self-heal without Owner intervention.

No relay reconciliation path performs an unbounded reload loop.

## Temporary evidence lifecycle

Relay screenshots live under the local-only `lane-evidence` directory.

A screenshot remains only while referenced by an active `relay_inflight` latch. It is deleted on:

- marker-confirmed relay;
- relay dedupe;
- stable marker-absent retry;
- Brain rebind;
- Work rebind/reset;
- invalid screenshot capture.

Runtime startup and periodic bounded GC remove only orphan PNG evidence that is not referenced by any active relay latch in any lane. Cleanup is capped per pass.

## Attachment send safety

Attachment relay retries begin from a clean composer draft and remove stale attachment chips before re-upload. Composer readiness, fill, file upload and attachment readiness waits are bounded. This prevents an uncertain prior attempt from stacking duplicate draft text or attachments.

## Cross-lane isolation

Every loop iteration resolves state as `registry.lanes[lane.lane_id]`. A lane's task, Work page, dispatch latch, relay latch and evidence reference are never shared with another lane. Disabled lanes remain stopped and do not affect enabled lane state.

## Windows production entry points

- `windows/run-supervisor.ps1` — persistent wrapper and mode selection.
- `windows/start-supervisor.ps1` / `stop-supervisor.ps1` — bounded start/stop.
- `windows/repair-supervisor.ps1` — verified repair/install path.
- `windows/control-panel.ps1` — Owner control panel.
- `windows/open-supervisor-chat.ps1` — opens the configured target through the dedicated Robot browser boundary.

Local runtime root:

```text
%LOCALAPPDATA%\MAGASIN\BusinessOS\supervisor
```

Desktop control:

```text
MAGASIN BUSINESS OS CONTROL.lnk
```

Sensitive runtime/profile state, authenticated browser data, target conversation identifiers, tokens and message bodies remain local and must never be committed.

## Production workflows

- `supervisor-tests.yml` — unit/regression test suite.
- `supervisor-autostart-install.yml` — install/deploy and survival verification on the self-hosted machine.
- `supervisor-integrity.yml` — task-independent static audit plus self-hosted runtime integrity audit.
- `supervisor-open-control-panel.yml` — generic production Robot/control-panel opener.
- `supervisor-state-maintenance.yml` — Owner-authorized state audit/reset by revision; preserves Brain and Work target URLs.

Historical TASK-049 diagnostic/live-monitor workflows are not part of production.

## Safety stops

Supervisor must not continue through:

- login/credential entry;
- MFA/OTP;
- CAPTCHA;
- destructive production actions;
- admin/security escalation;
- ambiguous business decisions;
- authoritative project state `WAIT_USER` or `BLOCKED`.

## Development test

```powershell
cd 08_INTEGRATIONS\supervisor
npm test
```

Production/private data, authenticated browser profiles, target conversation identifiers and local logs remain outside Git.

# MAGASIN Supervisor

Production local autonomy runtime for MAGASIN Business OS.

## Current architecture

The active production orchestration mode is **Three-Lane V1**. Each lane has isolated persisted state:

- one Owner-selected **Brain** conversation;
- one Owner-selected or Robot-created **Work** conversation;
- one lane registry entry containing task, dispatch, relay and generation state.

The Robot never auto-discovers or auto-replaces an Owner-selected Brain. Brain and Work conversation URLs remain local and are not written to repository logs.

The Windows wrapper still retains the legacy `BRAIN_WORKER_V1` entry point as a compatibility fallback because `run-supervisor.ps1` can select that mode from previously persisted authoritative state. It is not the current Three-Lane production path.

### Current production baseline

Runtime lifecycle in production is v2026-09-19.51.

TASK-RBT-001 adds a **docs-only target architecture** for browser scheduling, long-running Work recovery, Work hot-swap and operational observability. Those target features are not considered released by TASK-RBT-001 itself.

Canonical target design:

`docs/ROBOT_BROWSER_SCHEDULER_OBSERVABILITY_ARCHITECTURE.md`

Implementation roadmap:

- TASK-RBT-002 — Event & Timing Foundation — IMPLEMENTED in v2026-09-19.51
- TASK-RBT-003 — Work URL Hot-Swap + LƯU WORK
- TASK-RBT-004 — Browser Scheduler + Tab Budget
- TASK-RBT-005 — Long-Running Work + 30m Watchdog
- TASK-RBT-006 — Multi-Signal Work Full Detection + Rollover
- TASK-RBT-007 — Control Panel Timeline & Resource UX
- TASK-RBT-008 — Brain Planning Contract Runtime Hooks
- TASK-RBT-009 — Integration / Overnight Soak / Cleanup

v2026-09-19.51 production truth includes TASK-RBT-002 event/timing foundation only. TASK-RBT-003 through TASK-RBT-009 remain unreleased until their own implementation and acceptance tasks pass.

## Lifecycle truth

Runtime lifecycle in v2026-09-19.51 follows one mandatory truth order:

PROCESS TRUTH > LANE TRUTH > PERSISTED RECOVERY STATE

`lanes.json`, `lane-registry.json` and `lane-status.json` are recovery memory. They never prove that the Robot is alive.

The Control Panel derives PROCESS TRUTH from the live Supervisor wrapper, Three-Lane node process, dedicated Robot Chrome process and its healthy CDP endpoint. An enabled lane cannot render stale `WORKING` or `RELAYING_RESULT` while those process requirements are absent; it renders `STARTING` or `RECOVERING` until live health returns.

When the panel opens:

- all lanes disabled: no automatic Robot startup;
- one or more lanes enabled + no Owner STOP: bounded automatic recovery;
- healthy runtime: no redundant restart;
- `STOP` or `AUTOSTART_DISABLED`: fail closed until explicit Owner START.

The per-lane **BẮT ĐẦU LUỒNG** button changes only lane intent from disabled to enabled. It does not clear Owner STOP. Explicit process restart after Owner STOP is a separate Owner action.

Install, autostart and repair preserve Owner STOP. Only `start-supervisor.ps1` without `-Recovery` is the explicit Owner START path allowed to clear STOP/AUTOSTART_DISABLED.

The TASK-RBT scheduler/observability target is subordinate to the same lifecycle hierarchy. Page count, scheduler state and timeline events are diagnostics/orchestration metadata, not replacement process truth.

## Three-Lane delivery contracts

### Brain -> Work

Work delivery uses the machine envelope:

~~~text
MAGASIN_WORK_DISPATCH_V1
task_id=<task>
dispatch_id=<deterministic id>
~~~

`dispatch_id` is deterministic from lane + Brain directive. Reconciliation is marker-authoritative on the exact Work conversation:

- marker present: confirmed;
- stable Work with marker absent: not confirmed and safe to retry;
- busy/unstable Work: pending;
- one reconciliation reload is bounded for Work dispatch recovery.

The Brain directive digest is persisted when dispatch is confirmed so the same directive cannot be redispatched after restart.

A confirmed dispatch and Work completion are separate. Under the TASK-RBT target, a Work task may run for 30–60+ minutes after confirmation without any resend.

### Work -> Brain

Result relay carries a deterministic `relay_id=<id>` marker and the full Work result plus one screenshot.

Relay reconciliation in v2026-09-19.50 is marker-authoritative on the exact persisted Brain:

- relay marker present: confirmed exact-once;
- Brain stable and marker absent: not confirmed, clear the latch and retry safely;
- Brain busy/unstable: pending;
- unrelated Brain activity does not create a terminal blocked latch;
- legacy v43 `reconcile_blocked` relay latches self-heal without Owner intervention.

No relay reconciliation path performs an unbounded reload loop.

## Current v50 browser/Work limitations addressed by TASK-RBT

The docs-only TASK-RBT-001 architecture records these known gaps for later implementation:

- no explicit global ChatGPT page budget;
- Brain/Work pages can accumulate and remain open;
- no round-robin page scheduler with a formal fairness contract;
- no distinct `WORKING_LONG` / `POSSIBLY_STALLED` task states;
- no canonical 30-minute inactivity watchdog;
- current Work URL revision apply can reset task/latch state;
- no LƯU WORK action that safely hot-applies while Robot is running;
- automatic Work rollover relies on the current `conversationFull` signal rather than a multi-signal capacity detector;
- no append-only task timeline with assigned/start/activity/complete durations;
- Control Panel does not show browser page budget, task elapsed/last activity, or recent event history.

The target design deliberately does **not** solve page pressure by opening a second Chrome profile first. It keeps one dedicated MAGASIN Chrome profile and targets a default global budget of three active ChatGPT pages.

## Target browser scheduler contract

After TASK-RBT-004 implementation:

- browser tabs are transient execution resources;
- registry/local state remains task/target/latch truth;
- default ChatGPT page budget = 3 globally;
- enabled lanes are scheduled round-robin;
- a long-running Work does not own the browser indefinitely;
- max concurrent destructive UI mutations = 1;
- pages may be parked/closed/reopened only after durable state is safe;
- reopening an exact target always reconciles markers/state before mutation.

One lane enabled continues to work normally. Two or three enabled lanes share the same Chrome/CDP fairly without sharing task/latch state.

## Target long-running / watchdog contract

After TASK-RBT-005 implementation:

- <25m: normal WORKING;
- 25–30m: WORKING_LONG observation;
- >=30m with current response/progress/recent activity: continue WORKING_LONG;
- >=30m plus >=5m inactivity and no response/progress: STALL_CHECK;
- one exact-target recovery reload per no-progress recovery epoch;
- marker/latch reconciliation after reload;
- no resend of confirmed dispatch;
- no reload loop;
- if no progress after recovery: POSSIBLY_STALLED + Owner warning while preserving exact-once state.

The 30-minute threshold is an inactivity watchdog, not a task timeout.

## Target Work URL save/hot-swap

After TASK-RBT-003 implementation, each lane exposes:

- MỞ WORK
- LƯU WORK
- TỰ TẠO WORK

Owner Work save:

- validates URL;
- atomically persists URL;
- increments `work_url_revision`;
- records saved timestamp;
- gives visible revision/timestamp feedback;
- applies without Robot stop/start.

Safe apply:

- idle lane: apply immediately;
- active `awaiting_work`, dispatch latch or relay latch: save as pending-next-target;
- current task remains on old Work;
- apply pending target only after a safe boundary.

`TỰ TẠO WORK` is explicit Owner reset to Robot-managed Work mode. It never creates/finds Brain.

## Target Work-full rollover

After TASK-RBT-006 implementation, Work-full must be confirmed from multiple verified signals, not one regex.

Possible evidence families include:

- explicit structured conversation-full/limit UI;
- composer disabled with canonical capacity reason;
- verified send rejection/capacity evidence;
- current `conversationFull` classification as supporting evidence.

If an active assistant response is incomplete, Robot stays with current Work.

When safe full is confirmed for the next dispatch:

preserve state → create blank Work → get canonical URL → increment generation → persist target → persist exact dispatch latch → send once → confirm marker

Brain target is never auto-created/replaced.

## Brain Planning Contract

Target Brain workflow:

**PLAN → DISPATCH → VERIFY → ACCEPT/REJECT → NEXT PLAN**

Every task should have:

- one primary outcome;
- satisfied dependency;
- bounded scope;
- explicit DoD;
- explicit evidence;
- no Work self-expansion into the next task.

Planning target remains roughly <=20 minutes active implementation work when a task is decomposable. If a task is expected to exceed 30 minutes and can be split safely, Brain should split it. Inherently long-running operations may remain long and are handled by activity-based watchdog semantics.

## Operational timeline target

TASK-RBT-002 introduces a privacy-safe append-only local event file:

`%LOCALAPPDATA%\MAGASIN\BusinessOS\supervisor\lane-events.ndjson`

Minimum event families include:

- Brain assigned/accepted/rejected/next directive;
- Work dispatch confirmed/started/observed/long-running/completed;
- watchdog stall check/reload/recovery;
- result relay confirmed;
- Work target save/pending/apply;
- Work full/rollover;
- recovery/error reason codes.

No message body, full URL, token, cookie or private conversation content is allowed in the timeline.

Target task timing includes:

- assigned_at
- started_at
- last_activity_at
- completed_at
- queue_time
- execution_time
- total elapsed

Control Panel reads only a bounded recent tail, not the full event history on every refresh.

## Temporary evidence lifecycle

Relay screenshots live under the local-only `lane-evidence` directory.

A screenshot remains only while referenced by an active `relay_inflight` latch. Bounded retries reuse the same evidence instead of recapturing it. It is deleted on:

- marker-confirmed relay;
- relay dedupe;
- confirmed/deduped completion;
- Brain rebind;
- safe Work reset/rebind after active task preservation rules are satisfied;
- invalid screenshot capture.

Runtime startup and periodic bounded GC remove only orphan PNG evidence that is not referenced by any active relay latch in any lane. Cleanup is capped per pass.

## Attachment send safety

Attachment relay retries begin from a clean composer draft and remove stale attachment chips before re-upload. Composer readiness, fill, file upload and attachment readiness waits are bounded. This prevents an uncertain prior attempt from stacking duplicate draft text or attachments.

## Cross-lane isolation

Every loop iteration resolves state as `registry.lanes[lane.lane_id]`. A lane's task, Work target, dispatch latch, relay latch and evidence reference are never shared with another lane. Disabled lanes remain stopped and do not affect enabled lane state.

The future scheduler shares only browser resources and a global mutation lease. It must not share lane task state.

## Windows production entry points

- `windows/lifecycle-truth.ps1` — shared PROCESS TRUTH / Owner STOP / enabled-lane recovery helpers.
- `windows/run-supervisor.ps1` — persistent wrapper and mode selection.
- `windows/start-supervisor.ps1` / `stop-supervisor.ps1` — bounded start/stop.
- `windows/repair-supervisor.ps1` — verified repair/install path.
- `windows/control-panel.ps1` — Owner control panel.
- `windows/open-supervisor-chat.ps1` — opens the configured target through the dedicated Robot browser boundary.

Local runtime root:

~~~text
%LOCALAPPDATA%\MAGASIN\BusinessOS\supervisor
~~~

Desktop control:

~~~text
MAGASIN BUSINESS OS CONTROL.lnk
~~~

Sensitive runtime/profile state, authenticated browser data, target conversation identifiers, tokens and message bodies remain local and must never be committed.

## Production workflows

- `supervisor-tests.yml` — unit/regression test suite.
- `supervisor-autostart-install.yml` — install/deploy and survival verification on the self-hosted machine.
- `supervisor-integrity.yml` — task-independent static audit plus self-hosted runtime integrity audit.
- `supervisor-open-control-panel.yml` — generic production Robot/control-panel opener.
- `supervisor-state-maintenance.yml` — Owner-authorized state audit/reset by revision; preserves Brain and Work target URLs.
- `supervisor-lifecycle-acceptance.yml` — self-hosted production acceptance A→L for process/lane lifecycle truth.

Historical TASK-049 diagnostic/live-monitor workflows are not part of production.

TASK-RBT-009 is responsible for the later integration/overnight scheduler soak and cleanup workflow(s). TASK-RBT-001 does not add or deploy those workflows.

## Safety stops

Supervisor must not continue through:

- login/credential entry;
- MFA/OTP;
- CAPTCHA;
- destructive production actions;
- admin/security escalation;
- ambiguous business decisions;
- authoritative project state `WAIT_USER` or `BLOCKED`;
- Owner STOP/AUTOSTART_DISABLED.

## Development test

~~~powershell
cd 08_INTEGRATIONS\supervisor
npm test
~~~

Relevant docs-only PRs under `08_INTEGRATIONS/supervisor/**` still trigger Supervisor Tests and Supervisor Integrity static-audit. Runtime/self-hosted mutation acceptance remains reserved for implementation releases.

Production/private data, authenticated browser profiles, target conversation identifiers and local logs remain outside Git.

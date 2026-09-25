# MAGASIN Supervisor — Crash-Safe Auto Resume Architecture

Status: **LOCKED DESIGN / POST-RBT-009 IMPLEMENTATION**

Owner decision: after Windows crash/restart or a normal reboot, MAGASIN Supervisor should automatically determine whether any lane is still authorized to run. If at least one lane is enabled, it should recover the Supervisor and resume from persisted exact-once state. If no lane is enabled, it should remain off. If all lanes are later disabled while the Robot is running, it should shut down the dedicated Robot runtime and Chrome cleanly.

This document is architecture-only. It must not modify the active RBT-009 candidate or installed runtime semantics until the release/correction cycle is complete.

## 1. Core lifecycle rule

The authoritative startup decision is:

```text
Windows user logon
        ↓
Owner STOP / AUTOSTART_DISABLED?
  YES -> remain OFF
  NO
        ↓
Scan lane enable intent
        ↓
0 enabled lanes?
  YES -> remain OFF
  NO
        ↓
Crash/boot stabilization
        ↓
Resource preflight
        ↓
Start exactly one Supervisor wrapper
        ↓
Start exactly one dedicated Robot Chrome/CDP
        ↓
Reconcile persisted lane state
        ↓
Resume exact work safely
```

The Robot does not bypass Windows login. The current autostart model remains user-session based.

## 2. Existing foundation

The current runtime already provides most of the required primitives:

- `autostart-bootstrap.ps1` runs from the Windows user-logon autostart registration;
- recovery startup respects Owner STOP / AUTOSTART_DISABLED;
- recovery startup skips when all lanes are disabled;
- `start-supervisor.ps1 -Recovery` is not allowed to clear Owner STOP;
- one Supervisor wrapper is protected by singleton lifecycle truth;
- lane registry persists task/dispatch/relay/generation/target state;
- exact-once reconciliation exists for Brain -> Work and Work -> Brain;
- stale/missing targets can be quarantined;
- `run-supervisor.ps1` already understands exit code 76 as an intentional autonomy pause and will close the dedicated Robot Chrome.

The main post-release gap is to connect zero-enabled-lane runtime state to the intentional pause/exit path and add controlled crash-recovery startup stabilization.

## 3. Startup authority

Automatic recovery may start the Robot only when all are true:

1. Windows user session exists;
2. Owner STOP is not active;
3. AUTOSTART_DISABLED is not active;
4. at least one lane has `enabled=true`;
5. installed runtime/lifecycle truth is valid;
6. no already-running canonical Supervisor wrapper exists.

If any condition is false, fail closed.

A stale PID file is not proof that the Robot is running.

## 4. Crash recovery mode

After an unclean Windows shutdown, BSOD, process crash, or unexpected host restart, the Supervisor enters a bounded `CRASH_RECOVERY` startup profile.

Recommended initial behavior:

```text
0-60/120 seconds after login:
  no Robot Chrome start yet
  allow Windows/services/storage/Defender/runner to settle

initial recovery window:
  effective page budget = 1
  no speculative navigation
  no parallel heavy page creation
  exact state reconciliation only

after health/resource stabilization:
  effective page budget may return to normal post-release target = 2
```

Exact timing should be made configurable and validated on the Owner machine.

## 5. Clean restart versus crash restart

The implementation should distinguish, where practical:

- clean shutdown/reboot;
- unclean OS shutdown;
- Supervisor process crash;
- dedicated Chrome crash;
- GitHub runner interruption.

The distinction is diagnostic. It must not weaken exact-once recovery.

When the shutdown cause cannot be determined reliably, default to the safer crash-recovery profile.

## 6. Resume semantics

After startup, persisted state is not reinterpreted as a fresh task.

For every enabled lane:

```text
read canonical lane config
-> read registry
-> read task/latch state
-> reopen only the exact persisted target when required
-> reconcile marker/state
-> resume from durable boundary
```

Never resend a task merely because Windows restarted.

### Dispatch recovery

If a dispatch is already confirmed:

- keep the same task_id;
- keep the same dispatch_id;
- do not send again;
- observe/reconcile the exact Work conversation.

If the dispatch latch exists but confirmation is unresolved:

- follow existing bounded reconciliation logic;
- do not invent a new dispatch_id.

### Relay recovery

If a result relay is already confirmed:

- do not resend.

If a relay latch exists but confirmation is unresolved:

- reopen the exact persisted Brain only through existing bounded recovery;
- preserve the same relay_id.

## 7. Lane state after reboot

A persisted status such as `WORKING` is not enough to declare the Robot alive.

Use the existing hierarchy:

```text
PROCESS TRUTH
> LANE TRUTH
> PERSISTED RECOVERY STATE
```

Examples:

### Enabled lane + active transaction

```text
enabled=true
awaiting_work/dispatch/relay state exists
-> recover exact transaction
```

### Enabled lane + no active transaction

```text
enabled=true
no active transaction
-> resume normal Brain planning cycle
```

### Disabled lane

```text
enabled=false
-> do not open Brain
-> do not open Work
-> consume no scheduler turn
```

## 8. Automatic shutdown when no lane remains enabled

When the Supervisor is already running and all lanes become disabled:

```text
detect 0 enabled lanes
-> confirm across a short stable window
-> persist final status
-> release browser/scheduler resources safely
-> exit Three-Lane with intentional pause code 76
-> run-supervisor closes dedicated Robot Chrome
-> wrapper exits
```

The stability window prevents a transient config read from shutting down the Robot accidentally.

Suggested initial rule:

- require 2 consecutive canonical config reads with 0 enabled lanes;
- reads separated by the normal bounded poll interval.

## 9. IDLE is not OFF

A Brain `IDLE` directive must not automatically disable a lane.

Semantics:

```text
Brain IDLE
= no new task right now

lane.enabled=false
= Owner says this lane is not running
```

Only Owner-controlled lane enable intent authorizes automatic full-lane shutdown.

This prevents a temporarily idle project from being confused with an intentionally stopped project.

## 10. Resource Guard integration

Crash recovery should integrate with the locked Lightweight Resource Guard architecture.

Normal post-release target:

```text
1 dedicated Robot Chrome
default physical page budget = 2
mutation concurrency = 1
```

Crash-recovery target:

```text
initial effective page budget = 1
no speculative/preload navigation
bounded observation
resume exact state first
```

Only after RAM/CPU/process/CDP health is acceptable may the effective page budget return to 2.

Memory pressure must never clear task, dispatch, relay, pending Work, or quarantine state.

## 11. Windows/BSOD safety

A Windows BSOD or sudden restart must be treated as an external host failure, not as evidence that the current task failed.

The Supervisor must not:

- reset a task because the host rebooted;
- create a new Work chat automatically just because the old page handle disappeared;
- clear latches;
- rotate Brain;
- clear Owner STOP;
- assume Chrome was the root cause of the BSOD.

Host diagnostics such as storage, RAM, thermals, driver and Windows Event Log investigation remain separate from orchestration recovery.

## 12. Autostart behavior

Current intended autostart policy remains:

```text
Windows user logon
-> bootstrap runs
-> Owner STOP check
-> enabled-lane count
-> start runner if required
-> start Supervisor Recovery if required
```

No automatic startup is required when:

- all lanes are disabled;
- Owner STOP is active;
- AUTOSTART_DISABLED is active.

Autostart registration must preserve Owner STOP.

## 13. Runner behavior

The GitHub self-hosted runner may be required by release/maintenance workflows, but it is not itself proof that the Supervisor should run.

Do not couple:

```text
runner online = Robot must be online
```

The Robot startup authority remains lane enable intent + lifecycle safety.

If future architecture separates the runner from Robot lifecycle completely, preserve this rule.

## 14. Control Panel UX

Add explicit lifecycle summary after implementation:

```text
AUTO RECOVERY: ON
LAST BOOT: CLEAN | CRASH_RECOVERY | UNKNOWN
ENABLED LANES: 0..3
ROBOT: OFF | STARTING | RECOVERING | RUNNING | WAIT_RESOURCE
AUTO SHUTDOWN: ARMED when enabled lanes = 0
```

When all lanes are disabled, show:

```text
ROBOT NỀN: KHÔNG CẦN CHẠY — TẤT CẢ LUỒNG ĐANG TẮT
```

When recovering after crash:

```text
ROBOT NỀN: ĐANG KHÔI PHỤC SAU KHỞI ĐỘNG LẠI
```

Timeline history must remain visually distinct from current process truth.

## 15. Privacy-safe lifecycle events

Recommended events:

- `BOOT_RECOVERY_STARTED`
- `BOOT_RECOVERY_STABILIZING`
- `BOOT_RECOVERY_RESUME_READY`
- `AUTO_START_SKIPPED_ALL_LANES_DISABLED`
- `AUTO_START_BLOCKED_OWNER_STOP`
- `AUTO_SHUTDOWN_ZERO_ENABLED_LANES`
- `AUTO_RESUME_TRANSACTION_RECONCILED`

Allowlisted metadata only:

- timestamp;
- lane_id when relevant;
- task_id when safe;
- process/lifecycle state enum;
- enabled lane count;
- work_generation;
- revision/correlation identifiers already allowed by current event schema;
- crash-recovery reason enum.

No Brain/Work URLs, message bodies, cookies, tokens or screenshot content.

## 16. Failure semantics

Crash recovery must fail closed on:

- auth/login/MFA/CAPTCHA/security state;
- corrupted canonical registry where exact target cannot be proven;
- ambiguous active transaction identity;
- unsupported state schema;
- conflicting process truth;
- repeated CDP recovery failure beyond the existing bounded budget.

Do not use a destructive reset to make startup appear successful.

## 17. Required tests

Minimum deterministic tests:

1. all lanes disabled at login -> Supervisor does not start;
2. one enabled lane at login -> one wrapper starts;
3. three enabled lanes -> still one wrapper and one dedicated Chrome;
4. Owner STOP + enabled lane -> no auto start;
5. stale PID -> ignored safely without killing unrelated process;
6. active confirmed dispatch across reboot -> no resend;
7. unresolved dispatch latch -> same dispatch_id bounded reconcile;
8. confirmed relay across reboot -> no resend;
9. unresolved relay latch -> same relay_id bounded reconcile;
10. enabled idle lane -> normal Brain cycle resumes;
11. disabled lane -> no Brain/Work open;
12. runtime transition from >=1 enabled to 0 enabled -> intentional exit 76;
13. zero-enabled detection requires stable confirmation;
14. Brain IDLE alone does not shut down lane;
15. crash-recovery starts with effective page budget 1;
16. post-stabilization may return to page budget 2;
17. memory pressure may keep effective budget 1;
18. Owner Chrome is never terminated;
19. exact-once regression remains green;
20. Work hot-swap/pending target survives reboot;
21. target quarantine survives reboot;
22. watchdog/recovery epoch survives reboot;
23. Control Panel process truth overrides stale persisted WORKING;
24. lifecycle events remain privacy-safe.

## 18. Acceptance

Accept the feature only when a self-hosted Windows test proves:

- reboot/logon with enabled lanes resumes automatically;
- reboot/logon with no enabled lanes keeps Robot off;
- all lanes disabled during runtime shuts Robot down cleanly;
- one wrapper only;
- one dedicated Robot Chrome only;
- no duplicate dispatch;
- no duplicate relay;
- no target drift;
- no Owner STOP bypass;
- no navigation storm;
- no arbitrary application termination;
- recovery from host restart does not require destructive reset.

## 19. Locked architecture statement

The agreed lifecycle architecture is:

**Windows user logon -> lifecycle authority check -> scan enabled lanes -> bounded crash stabilization -> resource preflight -> one Robot Chrome -> exact-state reconciliation -> resume; and when all lanes are disabled -> intentional exit 76 -> close Robot Chrome -> Supervisor off.**

The Robot should automatically recover authorized work after host restart, but should consume essentially no browser/runtime resources when the Owner has no enabled project.

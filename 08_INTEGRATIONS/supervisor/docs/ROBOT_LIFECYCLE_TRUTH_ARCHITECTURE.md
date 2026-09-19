# MAGASIN Robot Lifecycle Truth Architecture

Task: TASK-060/ROBOT-LIFECYCLE-TRUTH-ARCHITECTURE-01  
Status: production architecture lock before implementation

## 1. Truth hierarchy

Mandatory order:

1. PROCESS TRUTH
2. LANE TRUTH
3. PERSISTED RECOVERY STATE

Persisted JSON is recovery memory only. It is never proof that Supervisor, Three-Lane, Robot Chrome, or CDP is alive.

A Control Panel lane may only be rendered as an active business state such as WORKING or RELAYING_RESULT when required process truth is healthy. If runtime health is absent while a lane has enabled/pending work, UI must show STARTING or RECOVERING until health is restored.

## 2. Process truth

Process truth is derived from live OS/runtime evidence:

- Supervisor wrapper process exists and is the dedicated MAGASIN wrapper.
- Three-Lane node runtime exists.
- dedicated Robot Chrome uses the MAGASIN browser profile.
- the dedicated Chrome remote-debugging port responds with a websocket debugger URL.
- runtime version and mode are compatible with installed source.

Process banner and lane business state are separate concepts. The UI may say the runtime is RECOVERING while preserving a pending lane task, but it must never say ROBOT BACKGROUND OFF and WORKING as if both were simultaneously authoritative.

## 3. Lane truth

Lane truth comes from current config + current runtime status:

- enabled/disabled is Owner configuration truth.
- Brain URL and Work URL are Owner/Robot authoritative targets and must not be autodiscovered or silently replaced.
- task_id, awaiting_work, dispatch_inflight, relay_inflight and result history are orchestration truth only after process health is known.
- lane-1 must operate independently when lane-2 and lane-3 are disabled.
- one lane failure must not corrupt another lane.

## 4. Persisted recovery state

Files such as lanes.json, lane-registry.json, lane-status.json and related runtime JSON exist so a restarted runtime can reconcile exact targets and exact-once latches.

They may preserve:

- Brain URL / revisions.
- Work URL / revisions.
- task_id and instruction digest.
- dispatch_inflight.
- relay_inflight.
- awaiting_work.
- last confirmed relay/dispatch markers.

They may not prove liveness.

After restart, the runtime must reconcile existing Brain/Work/latches before any resend. Exact marker evidence wins; no duplicate dispatch or relay is permitted.

## 5. Owner STOP authority

Owner STOP is fail-closed and always wins.

If either STOP or AUTOSTART_DISABLED is present:

- opening Control Panel must not auto-start Supervisor.
- install/autostart/recovery must not bypass Owner STOP.
- enabled lane config is retained for later recovery, but runtime remains stopped.
- UI must distinguish "Owner stopped runtime" from normal recoverable runtime loss.

Only an explicit Owner START operation may clear STOP/AUTOSTART_DISABLED.

The per-lane "BẮT ĐẦU LUỒNG" action only changes disabled → enabled. It must not redefine process truth or silently override Owner STOP.

## 6. Automatic recovery rule

When Control Panel opens:

- if all lanes are disabled: do not auto-start anything.
- if one or more lanes are enabled and Owner STOP/AUTOSTART_DISABLED is absent: verify process truth.
- if Supervisor/Three-Lane/Robot Chrome/CDP are unhealthy: enter STARTING/RECOVERING and invoke bounded recovery.
- if already healthy: do not restart healthy processes.
- after recovery: re-read process truth, then lane truth, then persisted recovery state.

The same lifecycle model must be used by start/run/install/autostart/repair paths.

## 7. Chrome/CDP recovery

Dedicated Robot Chrome is process truth only when:

- it uses the MAGASIN dedicated profile,
- its configured CDP listener belongs to that Chrome,
- /json/version responds with a websocket debugger URL.

A dead Chrome/CDP must be recovered without touching Owner's normal Chrome profile.

## 8. Crash/reopen behavior

Reopening Control Panel after a crash must be sufficient to recover an enabled runtime, unless Owner STOP is active.

No Owner click on "BẮT ĐẦU LUỒNG" is required merely to recover a dead runtime for an already-enabled lane.

## 9. Five-Step method

### QUESTION
What truth is authoritative at each layer? Persisted state is not liveness.

### DELETE
Delete UI/runtime assumptions that infer liveness from JSON alone or mix process banner with lane business state.

### SIMPLIFY
Use one lifecycle rule: PROCESS TRUTH > LANE TRUTH > PERSISTED RECOVERY STATE.

### ACCELERATE
Centralize bounded health probes/recovery so Control Panel, start, autostart and repair converge on the same result.

### AUTOMATE
When >=1 lane is enabled and Owner STOP is absent, Control Panel automatically restores Supervisor + Three-Lane + Robot Chrome/CDP and the runtime reconciles exact targets/latches.

## 10. BEFORE inventory

Known production components before TASK-060:

- windows/control-panel.ps1 — owns UI, lane enable/disable, shows process banner and lane states.
- windows/start-supervisor.ps1 — starts wrapper and currently clears STOP/AUTOSTART_DISABLED as part of explicit START.
- windows/run-supervisor.ps1 — owns dedicated Chrome/CDP and launches runtime loop.
- windows/stop-supervisor.ps1 — sets STOP + AUTOSTART_DISABLED and stops dedicated runtime.
- windows/install-supervisor.ps1 — installs current runtime.
- windows/repair-supervisor.ps1 — reinstall/repair path with runtime fingerprint checks.
- src/runtime/three-lane-cli.mjs — Three-Lane orchestration and exact-once dispatch/relay.
- .github/workflows/supervisor-autostart-install.yml — install + survival checks.
- .github/workflows/supervisor-integrity.yml — static + self-hosted integrity audit.
- test/brain-worker-windows.test.mjs, test/windows-repair.test.mjs, test/three-lane-runtime.test.mjs — lifecycle-adjacent regression coverage.

Observed design defect before TASK-060:

- Control Panel can read persisted lane-status.json and render WORKING even when required live processes are absent.
- Process banner and lane business status are not composed under one mandatory truth hierarchy.
- opening Control Panel does not yet have one explicit rule that automatically restores an enabled runtime while respecting STOP/AUTOSTART_DISABLED.
- restart recovery semantics exist in multiple places but are not yet expressed as a single lifecycle contract.

## 11. Acceptance A-L

A. all lanes disabled → opening panel does not auto-start runtime.  
B. lane-1 enabled + runtime OFF → opening panel auto-starts runtime when Owner STOP is absent.  
C. persisted WORKING + runtime OFF → UI shows STARTING/RECOVERING before process health, never stale WORKING.  
D. pending task/latches survive restart and exact-once reconciliation prevents duplicate dispatch/relay.  
E. healthy runtime → opening panel does not restart it.  
F. Owner STOP/AUTOSTART_DISABLED always wins.  
G. dead Three-Lane runtime is recovered.  
H. dead dedicated Chrome/CDP is recovered.  
I. lane-1-only runs fully with lane-2/3 disabled.  
J. three lanes remain isolated and do not cross-corrupt state.  
K. process banner and lane status are consistent and cannot contradict each other.  
L. reopen panel after crash automatically recovers enabled runtime without requiring another BẮT ĐẦU LUỒNG click.

## 12. Implementation constraints

- no Brain autodiscovery.
- no Brain autocreation.
- no automatic change to Owner-selected Brain URL.
- no automatic change to Owner-selected Work URL except existing Robot-managed new-Work semantics already authorized by architecture.
- retain exact-once dispatch_id / relay_id behavior.
- use bounded recovery only.
- merge only after full Supervisor tests and CI are green.
- production PASS requires self-hosted install + survival + E2E after merge.

## 13. AFTER inventory

To be completed in this document after implementation and production verification.

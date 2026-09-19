# MAGASIN — Current State

Last updated: 2026-09-19

## Current program

**MAGASIN Business OS V1 — Five-Step / Profitability & Cash first**

The project is in **Owner architecture discussion mode**. The purpose is to lock a comprehensive enterprise management architecture before implementation is handed back to Supervisor/Brain/Work.

Canonical architecture discussion:

- `00_ENTERPRISE_ARCHITECTURE_5_STEP_PROFIT_CASH.md`
- `02_PROFITABILITY_CASH/README.md`
- `02_PROFITABILITY_CASH/PROFITABILITY_ARCHITECTURE.md`
- `02_PROFITABILITY_CASH/FINANCIAL_BASELINE.md`

## Current phase

**P1 — Architecture Review / Profitability & Cash**

Current architecture priority is the financial truth spine:

```text
Revenue
→ COGS / Variable Cost
→ Operating / Fixed Cost
→ Cash Inflow / Outflow
→ AP / Debt / Owner Movement
→ Contribution
→ Profitability
→ Break-even
```

Existing Schedule-first work remains a proven vertical-slice pattern, but it is no longer the enterprise critical priority.

## Current task

**TASK-050 — Enterprise architecture lock — Profitability & Cash first — WAIT_USER / DISCUSSION_ACTIVE**

Robot handoff is explicitly locked.

```text
Owner + ChatGPT discuss architecture
→ Owner locks architecture
→ task queue is rebuilt
→ Owner explicitly releases Robot
→ PROJECT_STATE = READY / AUTO_CONTINUE
→ Supervisor / Brain / Work may execute
```

Until then, `00_PROJECT_STATE.json` is authoritative as `WAIT_USER / PAUSED`.

## Current target

Before any new implementation, lock:

1. enterprise capability map;
2. financial truth spine;
3. source-of-truth / ledger strategy;
4. role boundaries Owner / Manager / Employee;
5. integration boundary with Sapo / Sheets / FoodApp / bank / manual inputs;
6. Profitability & Cash sequence PFC-01 → PFC-08;
7. DELETE / defer map;
8. V1 acceptance metrics;
9. production/security boundaries;
10. explicit Robot handoff rule.

## Active scope

**Primary:** Profitability & Cash / enterprise management architecture.

**Supporting domains:** Sales, Procurement/AP, Inventory/Consumption, Workforce, SOP/Task, Organization/Access — only insofar as they feed operating truth and financial truth.

**Automation:** held. Supervisor/Brain/Work is an outer execution layer, not the enterprise architecture core.

**Deferred during architecture discussion:** new Robot features, broad dashboard expansion, speculative schemas, AI forecasting, KPI automation, payroll/recruitment expansion, cosmetic refactors, and non-critical module completion.

## Working method

Every requirement:

```text
QUESTION → DELETE → SIMPLIFY → ACCELERATE → AUTOMATE
```

Every implementation micro-task:

```text
Estimate → Implement → Unit → Fix → Regression → Integration → E2E → Docs/State → Commit → Next
```

Normal implementation task target: <= ~20 minutes active work. Split larger tasks.

## Safety

This repository is PUBLIC.

Never commit secrets, credentials, cookies, tokens, browser profiles, private employee/customer/financial records, production exports or private generated media.

Production/private data remains outside Git with appropriate access controls.

## Supervisor status

Supervisor Robot V1 is implemented and verified:

- real installed Chrome with local authenticated profile;
- privacy-safe UI observation;
- bounded Continue / safe Retry executor;
- reconnect/retry policy;
- anti-duplicate continuation loop;
- unified `MAGASIN BUSINESS OS CONTROL` desktop panel with START ROBOT / STOP;
- privacy-safe runtime status for current task, next task, ChatGPT UI state/action, update time and errors;
- background START mode so normal use does not require a separate PowerShell window;
- persistent local runtime;
- conversation-aware handoff: observe the active supervised chat before first continuation;
- shared Owner/Robot ChatGPT browser profile opened by the Control Panel;
- local-only target/profile/logs;
- fail-closed gates for BLOCKED/auth/MFA/CAPTCHA/destructive/admin/ambiguous states;
- WAIT_USER owner-boundary observer: may only reconcile an explicit live Owner decision back into repository state, never invent or bypass the decision.

Owner does not need to sit at the computer and repeatedly ask ChatGPT to continue. Normal operation is: open `MAGASIN BUSINESS OS CONTROL` → START ROBOT → return only when the panel/state reaches `WAIT_USER` or another real Owner boundary. The Supervisor may continue only while `AUTO_CONTINUE` is allowed.

## Next action

**ACTIVE — TASK-050:** Owner is locking the enterprise architecture using Five-Step, with Profitability & Cash as priority #1. No new implementation is handed to Supervisor/Brain/Work until Owner explicitly locks architecture and releases Robot.

Background night-run gate: **TASK-048 — NIGHT_WINDOW_COMPLETE**. The approved 09:15 +07 boundary closed the old night window and preserved the later Owner-selected active task/autonomy.

Final-checkpoint evidence:

- canonical evidence report: `05_SYSTEM/NIGHT_RUN_2026-09-18_EVIDENCE_V1.md`;
- final review report: `08_AUTONOMY/NIGHT_RUN_REPORT_2026-09-19.md`;
- Business OS PR #119 remains draft/open/unmerged with full Robot V2 review scope;
- Media Robot PR #21 remains offline-only/unmerged;
- Business OS QA: **203/203 PASS** run `35371642271`;
- TASK-048 hard-stop reconciliation QA: **162/162 PASS**, 0 failed, run `35372881851`; QA probe PR #120 closed without merge;
- TASK-048 boundary-time guard QA: **162/162 PASS**, 0 failed, run `35373330382`; manual dispatch before 09:15 +07 is fail-closed; QA probe PR #121 closed without merge;
- TASK-048 idempotence QA: **162/162 PASS**, 0 failed, run `35373887433`; repeated post-boundary dispatch preserves completion timestamps and records `NIGHT_WINDOW_COMPLETE` once; QA probe PR #122 closed without merge;
- TASK-048 one-shot guard QA: **162/162 PASS**, 0 failed, run `35374298573`; once `NIGHT_WINDOW_COMPLETE` exists, later manual reruns no-op before any state mutation so a subsequent Owner-reviewed state cannot be overwritten; QA probe PR #123 closed without merge;
- TASK-048 evidence-surface QA: **162/162 PASS**, 0 failed, run `35375054600`; canonical night-run evidence pack is reconciled to `NIGHT_WINDOW_COMPLETE / OWNER REVIEW REQUIRED` by the hard-stop; QA probe PR #124 closed without merge;
- TASK-048 temporal-pause QA: **163/163 PASS**, 0 failed, run `35375852646`; existing `PAUSED` autonomy suppresses repeated Supervisor continuation during the time-only gate without creating `WAIT_USER`; QA probe PR #125 closed without merge;
- Media Robot QA: **83/83 PASS** runs `35370775036` and `35371002442`;
- no bounded hard-stop regression remains after reconciliation, boundary-time guard, idempotence, post-review one-shot and canonical-evidence surface fixes; pre-boundary Supervisor busy-loop prevention now uses the existing `PAUSED` autonomy mode.

TASK-048 remains a background temporal safety gate while TASK-049 is active:

1. preserve the verified reports/state;
2. do not merge either PR;
3. do not execute live Saydi Generate/Download;
4. do not reactivate TASK-035 Gmail production email;
5. at **2026-09-19 09:15 +07**, the GitHub-hosted hard-stop may close `NIGHT_WINDOW_COMPLETE`, but because Owner has activated TASK-049 it must not overwrite TASK-049/status/autonomy.

## Session handoff

New chat must read:

1. `00_CURRENT_STATE.md`
2. `00_PROJECT_STATE.json`
3. `00_TASK_QUEUE.md`
4. `00_MASTER_PLAN.md`
5. `00_BUSINESS_OS_BLUEPRINT.md`
6. `06_DECISION_LOG.md`
7. `07_CHANGE_LOG.md`
8. current domain/task docs
9. repository/PR/CI state

Repository evidence overrides stale chat memory.


## Approved night run

Owner approved `NIGHT_RUN_2026-09-18` for the window `2026-09-18 23:15 +07 → 2026-09-19 09:15 +07`.

Execution scope is restricted to:

- `magasincoffee/magasincoffee.github.io`;
- `magasincoffee/magasin-media-robot`.

Windows reboot/logon recovery is installed and verified on the self-hosted machine:

- HKCU logon autostart registered;
- canonical GitHub Runner verified online;
- Supervisor verified online;
- Owner STOP latch is clear;
- Windows login/PIN is never bypassed.

The GitHub-hosted hard-stop guard will close the old night window at 09:15 +07 even if the PC is offline; an Owner-reprioritized task remains authoritative.


## Superseded Brain/Worker architecture

Canonical contract: `00_SUPERVISOR_BRAIN_WORKER_ARCHITECTURE.md`.

- exactly one Brain conversation coordinates work;
- up to 3 concurrent Workers initially;
- Worker prompts are dynamic Brain `DISPATCH` instructions, never a repeated canned Continue prompt;
- each completed Worker assistant turn is captured in full once and relayed to Brain;
- message bodies are transient and are not persisted in Git/log/status/registry;
- target missing, conversation missing, stalled and unavailable states fail closed after bounded recovery;
- only explicit ChatGPT `conversationFull` evidence authorizes rollover of an existing logical conversation;
- a new Worker slot requires a validated Brain directive plus free capacity;
- runtime auto-upgrade from `main` is part of TASK-049 acceptance.

## Three-Lane V1 active architecture

Canonical contract: `00_SUPERVISOR_THREE_LANE_ARCHITECTURE.md`.

- exactly three isolated project lanes;
- Brain identity is Owner-bound by explicit URL only; no active Brain auto-discovery;
- each lane has its own project name, Owner Brain URL, optional Owner Work URL / Robot-managed Work URL, status, message, START and STOP;
- Owner may paste/replace Work URL while a lane is stopped; if blank, Robot auto-creates it; automatic Work rollover still requires positive `conversationFull` evidence;
- each completed Work result is relayed exactly once to the same lane Brain with both screenshot and full captured text;
- Brain chat is never auto-rolled; if Brain is full/missing, that lane waits for Owner to replace its Brain URL;
- transient fetch/CDP/network failures auto-retry in `RECOVERING` and do not ask Owner unless the condition is non-transient/security-related;
- local lane config/status/evidence remain outside Git.

## TASK-049 acceptance checkpoint — E2/F

**Partial acceptance only — TASK-049 remains IN_PROGRESS.**

- **TASK-049/E2 — Owner-visible Robot UI/live status: ACCEPTED.** PR #141 merged at `f076779c4d1e3afd709385f0558a7185caeabf51`. The Owner-facing Control Panel is Vietnamese; `ĐANG LÀM VIỆC` is derived from live `runtime-status.json.worker_running` IDs reconciled to the local `orchestration.json` worker registry and displays Worker/task identity; visible time conversion uses Windows `SE Asia Standard Time` with no `ToLocalTime()`; recovery actions remain mutually exclusive.
- **TASK-049/F — runtime survival / technical-recovery acceptance: ACCEPTED.** Supervisor Autostart Install run `35414750942` completed with Supervisor Tests **212/212 PASS**, install success and `verify-survival` success. Install evidence: `WORKER_RETRY_REQUIRED=False`, `TECHNICAL_RECOVERY_STUCK=False`, `SUPERVISOR_ONLINE=True`, `BRAIN_WORKER_RUNTIME=True`, `BUSINESS_CHROME_ONLINE=True`, `BUSINESS_CHROME_CDP_HEALTHY=True`. Post-job survival evidence: `POST_JOB_SUPERVISOR_ALIVE=True`, `POST_JOB_BRAIN_WORKER_ALIVE=True`, `POST_JOB_ROBOT_CHROME_ALIVE=True`.
- This checkpoint does **not** assert the remaining TASK-049 acceptance items in `00_SUPERVISOR_BRAIN_WORKER_ARCHITECTURE.md`; those must be independently reconciled before TASK-049 can become DONE.


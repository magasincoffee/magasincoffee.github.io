# MAGASIN Supervisor — Conversation-Aware Handoff Architecture

**Date:** 2026-09-18  
**Status:** CANONICAL  
**Purpose:** allow the Owner to work directly with ChatGPT, then let the Supervisor take over without restarting, duplicating, or ignoring the live work.

## 1. Core rule

Owner and Supervisor must operate in the **same supervised ChatGPT browser profile**.

The Control Panel button **ChatGPT Robot** opens:

```text
%LOCALAPPDATA%\MAGASIN\BusinessOS\supervisor\browser_profile
```

with Chrome remote debugging enabled. The Supervisor later attaches to that exact browser/session.

A normal Chrome window opened outside this profile is not observable by the Supervisor and therefore cannot be treated as a reliable handoff source.

## 2. Handoff precedence

When START ROBOT is pressed, the decision order is:

```text
Safety / approval boundary
  → live explicit Owner instruction in the supervised chat
  → current assistant execution state
  → repository source of truth
  → stale chat/history
```

The repository remains canonical after reconciliation. A newer direct Owner instruction is treated as an input that ChatGPT must reconcile into repository state before autonomous continuation.

## 3. Observe-first startup

The Supervisor must not immediately paste the generic continuation instruction.

Startup sequence:

1. attach to the shared supervised Chrome;
2. adopt the active conversation path when usable;
3. inspect UI state and the role of the latest visible message;
4. if assistant is running → WAIT;
5. if latest visible message is Owner/user and no response is complete yet → WAIT;
6. if the conversation is idle/completed → execute one **HANDOFF_RECONCILE** continuation;
7. after that response completes, normal AUTO_CONTINUE resumes from repository state.

No message text is written to Supervisor logs. Only privacy-safe metadata such as role/count/state is used by the local observer.

## 4. Five-Step architecture at handoff

The handoff prompt itself must enforce:

### QUESTION
- What did the Owner most recently request in this live conversation?
- What work is already running or completed?
- Does that request alter the current repository task or architecture?

### DELETE
- Do not restart completed work.
- Do not send a duplicate continuation while ChatGPT is already running.
- Do not create a parallel module merely because repository state is stale.

### SIMPLIFY
- Reconcile the live chat and repository into one current task.
- Keep one canonical capability and one active critical path.

### ACCELERATE
- Continue from the exact point already reached.
- Update repository state once, then resume micro-task execution.

### AUTOMATE
- Only after reconciliation may AUTO_CONTINUE resume.
- Retry/recovery remains bounded and fail-closed.

## 5. Two continuation modes

### HANDOFF_RECONCILE — once after robot startup

Used when the active conversation is idle and the robot has just taken control.

The model must read the current conversation, compare it with repository state, update source-of-truth if a newer Owner instruction changed direction, and continue without repeating finished work.

### NORMAL_CONTINUE — subsequent cycles

Used only after the handoff has been reconciled.

It reads repository state, applies the Five-Step gate, completes the current micro-task, tests, updates state, and moves to the next task when safe.

## 6. Operator workflow

Preferred workflow:

```text
Open MAGASIN BUSINESS OS CONTROL
  → ChatGPT Robot
  → Owner gives/adjusts instructions in that browser
  → ChatGPT may already be working
  → START ROBOT
  → Supervisor observes first
  → waits if work is running/pending
  → reconciles once when idle
  → AUTO_CONTINUE
```

This is the only supported zero-copy handoff flow. If the Owner chooses another ordinary Chrome profile, the Supervisor cannot reliably inspect or control that separate browser session.

## 7. Acceptance

A valid handoff must prove:

- START ROBOT does not send while assistant is visibly running;
- START ROBOT does not send while the latest visible message is the Owner and no assistant completion exists;
- first idle continuation uses HANDOFF_RECONCILE, not the generic prompt;
- later continuations use Five-Step + repository task context;
- ChatGPT Robot opens the same browser profile used by automation;
- no conversation text is persisted in logs.


## 8. Work UI completion rule

ChatGPT Work can expose tool/activity progress outside standard assistant-message containers. Therefore standard message-role order alone is not sufficient to decide completion.

The Supervisor uses a privacy-safe activity state machine:

```text
USER_PENDING
  + busy/loading/progress surface
    → WAIT and record Work progress
  + structural activity change
    → WAIT and reset idle timer
  + observed progress followed by 20s stable idle
    → treat as RESPONSE_COMPLETE
    → rearm AUTO_CONTINUE
```

At initial robot takeover only, a pre-existing `USER_PENDING` surface may settle after 20 seconds of stable idle even when the Supervisor did not witness the earlier Work progress. This is the bounded handoff fallback.

After any Supervisor send, stable `USER_PENDING` alone is **not** enough. The Supervisor must first observe Work/running/structural progress before it can rearm. This prevents duplicate prompts when a newly sent request has not actually been handled.

No message body is persisted for this decision. Only roles, busy flags and structural counts are used.


## 9. Owner-boundary reconciliation

`WAIT_USER` is a business-decision boundary, not a permanent runtime dead-end.

Canonical behavior:

```text
repository enters WAIT_USER
  → Supervisor keeps the boundary fail-closed
  → observe shared ChatGPT conversation
  → never act while ChatGPT Work is running
  → after the Owner explicitly decides, reconcile that decision into repository
  → only repository transition back to READY/AUTO_CONTINUE unlocks normal automation
```

The reconciliation prompt is deliberately constrained: it may update source-of-truth **only when the current conversation contains an explicit Owner decision matching the pending boundary**. Otherwise it must leave `WAIT_USER` unchanged.

`BLOCKED`, authentication, MFA, CAPTCHA, destructive-action, admin-escalation and ambiguous-decision states remain hard stops and are never bypassed by this mechanism.

For ChatGPT Work, the semantic `data-testid="stop-button"` is treated as a running signal. Completion stability uses conversation-turn metadata instead of whole-DOM size because the Work UI virtualizes content and can change DOM size while semantically idle.


## 10. Manual Owner recheck control

The Control Panel exposes a bounded manual control:

```text
✓ ĐÃ XỬ LÝ — KIỂM TRA LẠI
```

Its semantics are **recheck**, not **force continue**.

When the project is in `WAIT_USER` and not `BLOCKED`:

1. Owner presses the button after resolving the requested decision/setup in the shared ChatGPT workflow.
2. Control Panel writes a local, non-secret `OWNER_RESOLVED.request.json` marker.
3. Supervisor waits if ChatGPT is still running.
4. Once safely idle, Supervisor sends exactly one constrained Owner-boundary reconciliation request.
5. The local marker is consumed only when that reconciliation is actually sent.
6. Repository remains `WAIT_USER` unless ChatGPT verifies the pending boundary is truly resolved and updates source-of-truth.
7. `BLOCKED`, auth/MFA/CAPTCHA, destructive/admin, missing-secret and other unresolved security boundaries are never force-cleared by the button.

This control exists to repair stale synchronization between Owner ↔ ChatGPT ↔ repository. It is not an approval bypass.


## 11. Persistent diagnostic evidence

Supervisor runtime keeps a **local privacy-safe diagnostic folder**:

```text
%LOCALAPPDATA%\MAGASIN\BusinessOS\supervisor\diagnostics
```

Contents:

- `latest.json` — latest safe runtime snapshot;
- `incidents.ndjson` — compact incident index;
- `incidents\*.json` — individual repeated-stall/error records.

The diagnostic snapshot contains runtime/project/UI state, safe counters, controller latch state, Owner-reconcile state, decision/execution result and recovery state. It must **not** persist conversation bodies, credentials, cookies, OAuth secrets or tokens.

Repeated non-executed continuation stalls are promoted to incidents after a bounded threshold. Control Panel exposes **MỞ LOG LỖI** so the Owner can inspect the folder, while the local GitHub Runner can collect the same evidence for remote troubleshooting. The intended operator flow is that the Owner can report simply “robot lỗi”; diagnostics should provide the technical evidence without requiring the Owner to reconstruct the failure manually.

An explicit **ĐÃ XỬ LÝ — KIỂM TRA LẠI** click may release only the stale UI progress latch for one Owner-reconciliation attempt. It never changes repository status directly and never bypasses business/security/secret gates.

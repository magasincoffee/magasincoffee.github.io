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

# MAGASIN Supervisor Robot — V1 Contract

## Purpose

Giữ chuỗi thực hiện dự án liên tục khi Owner không ngồi chờ từng lượt ChatGPT.

Supervisor không thay thế business decisions và không được vượt approval boundary.

## Inputs

- `00_PROJECT_STATE.json`
- `00_TASK_QUEUE.md`
- ChatGPT UI state
- GitHub Actions/runner state khi cần

## Primary loop

```text
READ STATE
→ if WAIT_USER/BLOCKED: stop and notify
→ if AUTO_CONTINUE:
   observe ChatGPT
   if response complete: send canonical continue instruction
   if transient network/UI interruption: safe retry
   if uncertain/destructive/auth: stop
→ persist local supervisor log
```

## Canonical continue instruction

`Tiếp tục dự án MAGASIN theo repository source of truth. Đọc CURRENT_STATE, PROJECT_STATE, TASK_QUEUE và tiếp tục đúng micro-task hiện tại; test, sửa lỗi, regression/E2E, cập nhật state rồi sang task kế tiếp nếu không cần Owner.`

## Safety stops

Supervisor must stop on:

- credential/login/MFA/CAPTCHA;
- RED action;
- ambiguous decision;
- destructive production operation;
- permission escalation;
- state `WAIT_USER` or `BLOCKED`.

## Local control

Supervisor is a separate local process from GitHub runner.

Owner must be able to stop it by closing its shell/process. No Windows service in initial V1 unless Owner later approves it.

## Implementation preference

Use stable DOM/accessibility automation where available. Avoid OCR unless no reliable semantic surface exists.

## Logging

Log only:

- timestamp;
- state transition;
- UI action category;
- retry count;
- safe error summary.

Never log credentials, cookies, tokens, page auth state dumps, private chat content beyond the minimum needed for state classification.


## Operational V1

Status: **implemented and field-verified on MAGASIN-BUSINESS-PC**.

Runtime:

```text
%LOCALAPPDATA%\MAGASIN\BusinessOS\supervisor\
├── browser_profile\      # local only
├── target.json            # local only
├── supervisor.log         # safe event log only
├── supervisor.pid
└── runtime\
```

Desktop controls:

- `START_MAGASIN_SUPERVISOR.cmd`
- `STOP_MAGASIN_SUPERVISOR.cmd`

The Supervisor uses the installed real Chrome and attaches locally through CDP. It does not ask for or export login secrets.

### Autonomous continuation contract

When all conditions hold:

- `autonomy = AUTO_CONTINUE`;
- state is not `WAIT_USER`, `BLOCKED`, or `DONE`;
- ChatGPT response is complete;
- no auth/CAPTCHA/destructive/admin/ambiguous stop condition exists;

the Supervisor may send the canonical continue instruction.

After sending once, it disarms until observable assistant progress occurs, preventing duplicate continuation spam.

A recognized transient `Try again / Thử lại` control may be retried within the bounded retry policy.

### Kill switch

`STOP_MAGASIN_SUPERVISOR.cmd` first requests cooperative stop. If the dedicated Supervisor process does not exit within the bounded grace period, only that Supervisor process tree is force-stopped.

The GitHub runner is a separate process and is not stopped by the Supervisor kill switch.

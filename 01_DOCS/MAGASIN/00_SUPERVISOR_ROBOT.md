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

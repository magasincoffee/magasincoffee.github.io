# MAGASIN Supervisor

Local autonomy helper for MAGASIN Business OS.

## Current status

Supervisor V1 is implemented and field-verified on `MAGASIN-BUSINESS-PC`.

Capabilities:

- reads the public canonical `00_PROJECT_STATE.json`;
- attaches to the Owner-authenticated **real installed Chrome** through local CDP;
- never asks for or stores credentials, MFA, cookies, tokens, or message bodies;
- classifies ChatGPT UI state with fail-closed behavior;
- sends only the canonical Continue instruction when `AUTO_CONTINUE` permits it;
- clicks only a semantically recognized safe Retry control for transient failures;
- uses a bounded retry budget;
- prevents duplicate Continue sends until observable assistant progress occurs;
- pauses on `WAIT_USER` / `BLOCKED` and security-sensitive states;
- reconnects after ordinary browser/network interruptions;
- persists outside a GitHub Actions job;
- provides one Owner-facing `MAGASIN BUSINESS OS CONTROL` panel with START ROBOT / STOP, task/action/error/status visibility, and privacy-safe local logs.

## Local files

Local-only runtime root:

```text
%LOCALAPPDATA%\MAGASIN\BusinessOS\supervisor
```

Sensitive runtime/profile state must stay local and must never be committed.

Desktop control:

```text
MAGASIN BUSINESS OS CONTROL.lnk
```

The panel is the normal Owner entry point. START ROBOT launches the Supervisor in background mode. STOP invokes the bounded Supervisor kill-switch contract. The panel reads local `runtime-status.json` plus canonical public `00_PROJECT_STATE.json`; it shows current/next task, UI observation, continuation decision/action, update time, and Owner-required errors without storing private chat message bodies.

The GitHub runner remains a separate process and is not controlled by the Supervisor STOP button.

## Safety stops

Supervisor must not continue through:

- login/credential entry;
- MFA/OTP;
- CAPTCHA;
- destructive production actions;
- admin/security escalation;
- ambiguous business decisions;
- project state `WAIT_USER` or `BLOCKED`.

## Development test

```powershell
cd 08_INTEGRATIONS\supervisor
npm test
```

Production/private data, authenticated browser profiles, target conversation identifiers and local logs remain outside Git.

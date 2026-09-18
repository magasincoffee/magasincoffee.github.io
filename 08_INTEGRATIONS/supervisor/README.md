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
- provides Owner-controlled START/STOP desktop kill switches.

## Local files

Local-only runtime root:

```text
%LOCALAPPDATA%\MAGASIN\BusinessOS\supervisor
```

Sensitive runtime/profile state must stay local and must never be committed.

Desktop controls:

```text
START_MAGASIN_SUPERVISOR.cmd
STOP_MAGASIN_SUPERVISOR.cmd
```

Closing the dedicated Supervisor PowerShell window or using the STOP shortcut stops UI continuation automation. Closing the separate GitHub runner shell stops new local Actions jobs.

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

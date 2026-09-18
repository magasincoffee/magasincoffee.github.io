# MAGASIN Supervisor

Local autonomy helper for MAGASIN Business OS.

## V1 capabilities

- validates repository project state;
- observes ChatGPT UI without capturing message bodies;
- uses installed real Chrome with a dedicated local authenticated profile;
- sends the canonical Continue instruction only when `AUTO_CONTINUE` is allowed;
- retries recognized transient `Try again / Thử lại` controls with a bounded retry policy;
- reconnects to local Chrome/CDP after ordinary connection loss;
- prevents duplicate Continue actions until assistant progress is observed;
- stops/fails closed for auth, MFA, CAPTCHA, destructive/admin/ambiguous states, `WAIT_USER`, or `BLOCKED`;
- keeps profile, conversation target and safe runtime logs local;
- provides Desktop START/STOP kill-switch commands.

## Tests

```powershell
cd 08_INTEGRATIONS\supervisor
npm test
```

## Local installation

Installation is performed from the trusted owner-controlled self-hosted runner during the bootstrap gate.

Installed runtime:

```text
%LOCALAPPDATA%\MAGASIN\BusinessOS\supervisor\runtime
```

Desktop controls:

```text
START_MAGASIN_SUPERVISOR.cmd
STOP_MAGASIN_SUPERVISOR.cmd
```

The Supervisor is intentionally not installed as a Windows Service in V1. Closing/stopping the dedicated Supervisor process remains a visible local control boundary.

## Security

Never commit or upload:

- credentials;
- cookies/tokens;
- browser profiles;
- target conversation identifiers;
- private chat contents.

Only safe state/action-category logs may be retained locally.

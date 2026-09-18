# MAGASIN Supervisor

Local autonomy helper for MAGASIN Business OS.

Current foundation is intentionally UI-independent:

- reads and validates `01_DOCS/MAGASIN/00_PROJECT_STATE.json`;
- makes fail-closed continuation decisions;
- retries only classified transient failures within a small budget;
- stops for auth/MFA/CAPTCHA/destructive/admin/ambiguous states;
- never stores or requests credentials.

The UI adapter will be added only after this pure state/decision layer passes tests.

Run:

```powershell
cd 08_INTEGRATIONS\supervisor
npm test
```

No live ChatGPT action, browser automation or local profile access exists in this foundation yet.

# AUTH-PROD-006 — Existing OWNER Login Path Diagnosis

**Track:** `AUTH-PROD / MAGASIN_AUTH_PRODUCTION_READINESS_V1`  
**Task:** `AUTH-PROD-006 — Diagnose existing OWNER login path`  
**Status:** `DONE / D4 CLASSIFIED`  
**Exact base:** `main @ fea3067395d425bdb390f59c9575096cda5e5958`  
**Evidence date:** `2026-09-28`

## 1. Classification

The reported OWNER login failure is classified as:

```text
AUTHENTICATION / CREDENTIAL-PATH REJECTION
not authorization
not OWNER role/status
not RLS
not stale PENDING session interference
```

Supabase Auth remains the password/session authority.

## 2. Production Auth-log evidence

Production Auth logs from the same production website/browser context show:

```text
2026-09-28T03:58:39Z
POST /token
grant_type=password
status=400
error_code=invalid_credentials

2026-09-28T03:58:46Z
POST /token
grant_type=password
status=200
login=successful
```

The successful password grant seven seconds later demonstrates that the Auth endpoint, browser path and account authorization path were operational.

The logs prove that the failed request was rejected at the credential layer. They do **not** distinguish whether the human cause was a typo, an old password, or another incorrect credential value; no stronger claim is made.

No email, username, user UUID, IP address, password, token, cookie, or session value is recorded in this evidence.

## 3. OWNER authority checks

Fresh production read-only checks return:

```text
OWNER profile count                 = 1
OWNER profile status ACTIVE         = true
matching Auth identity present      = true
OWNER email confirmed               = true
username resolves to Auth email     = true
```

No OWNER role/status mutation was needed or performed to diagnose the credential failure.

## 4. Valid-login confirmation

AUTH-PROD-005 production proof already confirms:

- ACTIVE OWNER/email login = PASS;
- ACTIVE OWNER/username login = PASS;
- same-browser logout/switch = PASS;
- invalid credential -> form recovery -> correct credential retry = PASS.

The exact-main Auth regression suite also includes secret-backed ACTIVE production smoke.

## 5. D4 separation

The incident demonstrates why credential failure must remain separate from authorization:

- `invalid_credentials` is resolved by supplying a valid credential or using normal password recovery;
- changing `profiles.role`, `profiles.status`, RLS or grants cannot make an invalid password valid;
- the bounded profile grant correction from AUTH-PROD-005 addressed Owner activation only and is not used as a credential workaround.

No OWNER password reset was required for this diagnosis.

## 6. Task decision

```text
root cause class         = credential-path rejection
valid OWNER login        = confirmed
username resolver        = confirmed
stale-session regression = not present in proven workflow
authorization mutation   = not used
AUTH-PROD-D4             = CLASSIFIED / CLOSED
AUTH-PROD-006            = DONE
```

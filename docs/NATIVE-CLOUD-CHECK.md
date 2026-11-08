# Native enrollment: account observations still required

No account, provider or deployment was used in this session. These are owner/
account-reviewer checks, not passed results. Migrations, actual hostname/path
precedence and every preview/custom/`workers.dev` alias must be reviewed before
native traffic is enabled. No blanket Access bypass or Origin exemption is
proposed. Browser/admin paths keep Access; device paths enforce their bearer.

The short owner procedure records **owner-reported GUI observations** only. It
does not extract a phone token to run privileged API probes. In particular, a
pending screen does not prove the server rejects a pending bearer. API-negative
cases below require a trusted owner-local, secret-aware diagnostic client with a
disposable diagnostic credential. Keep its secret only on Linux; do not extract
phone keys or paste credentials into chat, shell arguments, screenshots or logs.
Until those requests are actually observed, mark them unverified. Existing local
integration tests are not a substitute for these real-account observations.

| Case | Required observation | Failure / stop condition |
|---|---|---|
| Account readiness | Correct D1 binding with migrations through0007; configured owner; reviewed route precedence/aliases and request limits. Record booleans, not account dumps. | Missing table/binding, wrong owner, public alternate endpoint, or unknown policy. |
| Unauthenticated device API | An actual `GET /api/device/v1/health` without authority reaches the Worker and returns401 `AUTH_REQUIRED`, no personal data. | HTML/login redirect, unexpected200/data, TLS error or an edge denial that does not establish Worker reachability. |
| Browser/admin boundary | Logged-out `/owner-devices` and browser personal-data API require owner Access. Browser writes with missing/null/foreign Origin fail403 `INVALID_ORIGIN`; only same-origin owner writes work. | A native-route exception exposes browser/admin access, or a malicious webpage can write. |
| Native mixed headers | Any Origin (even matching/null), Cookie, Access assertion or collector-key header is rejected by the native namespace. No bearer/invalid bearer cannot read data. | Ambient browser or collector authority substitutes for a device credential. |
| Pending enrollment | An unused five-minute grant creates a pending record with a hash only. Diagnostic pending bearer cannot read `/tasks` (401). Phone remains pending without ledger access. | Task data before activation; secret/grant stored or logged plaintext; granting notification access as a side effect. |
| Lost enrollment response | Same grant/client/secret retry returns the same pending record; another client/secret gets409 `ENROLLMENT_CONFLICT`. | Duplicate authority, replacement secret or assumed activation. |
| Fingerprint activation | Compare the entire phone/browser fingerprint privately. Wrong fingerprint409 `FINGERPRINT_MISMATCH`; explicit correct activation permits actual phone `/me`/task read. | Activation on grant possession alone, mismatched owner, redirect/HTML, or a UI success without a fresh server read. |
| Expired grant | After five real server minutes, unused grant enrollment fails401. Use a fresh grant afterwards. | A stale grant still creates authority. Changing the phone clock proves nothing. |
| Credential expiry | On a disposable test credential only, the account reviewer sets its server expiry into the past, then a fresh request fails401. Do not shorten global policy or modify real tasks. | Expired authority still reads/writes; only inspecting an expiry label is not a test. Skip if no reviewer can perform this safely. |
| Revoke other install | Trusted Access browser revokes the phone's test install; its next request fails401. Task credentials/cache/journal clear and an unconfirmed-send warning remains when applicable; Capture remains intact. | Continued new authority, stale personal snapshot displayed as fresh, lost raw state, or an assumed failed prior write. |
| Offline revocation | Offline snapshot remains explicitly stale/read-only; reconnect observes denial. Inspect canonical data after reenrollment before replacing an uncertain send. | Claiming remote erasure of an offline cache or automatically replaying a cleared journal. |
| Device scope | Valid native credential cannot mint grants, administer another install, mint collector keys or call `/sync*` (403). Revoke-self affects only itself. | Escalation from daily owner UI authority into credential/source ingestion administration. |
| Privacy | Native cloud traffic contains structured fields and necessary auth only. Raw capture remains Android↔Linux; provider use still requires explicit configured consent. | Raw text/quotes/exports/message hashes in cloud, error reports, assets or backups. Never export a HAR to demonstrate this. |

Share only case booleans, counts and fixed status/error codes. Do not return
request/response bodies, URLs, tokens, group keys, source text or raw SQL/account
output. A request committed before revocation can finish; revocation does not
undo it. The signed phone build, successful account path and actual notification
capture are separate gates. No listener event or capture has yet been observed.

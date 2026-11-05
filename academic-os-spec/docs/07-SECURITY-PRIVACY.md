# 07 — SECURITY, PRIVACY AND THREAT MODEL

## 1. Security objectives
Single authorized owner, least-privilege integrations, minimization of classmates' data, no public read access, reproducible deletion/export, and zero dependence on university security workarounds. Cloudflare is a third-party processing environment; 9Router may forward snippets to upstream providers. The project cannot truthfully promise that data never leaves the laptop when those services are enabled.

## 2. Threat actors and assets
**Assets:** academic tasks, group information, WhatsApp exports, Moodle authenticated sessions, iCalendar tokenized URLs, 9Router API credential, Cloudflare API token, push subscriptions, user identity, source evidence.

**Threats:** exposed `workers.dev` route; leaked collector key; replay/repeated ingestion; XSS from Moodle/chat descriptions; CSRF; injection against AI model; malicious attachment; compromised browser extension; stolen phone/laptop; excessive cloud storage; accidental group import; leaked provider logs; denial of service or free-tier quota exhaustion.

## 3. Data classification / flows
| Class | Examples | Default location | Rule |
|---|---|---|---|
| Secrets | 9Router token, Moodle sessions, iCal URL, collector key, Cloudflare token | Local secret storage / Cloudflare secret if absolutely necessary | Never in client JS/logs/repo |
| Raw third-party content | WhatsApp exports, sender names/numbers, attachments | Local encrypted files or SQLite | Never upload full transcript by default |
| Sensitive derived | Evidence excerpts, group-specific summaries, task text | D1 after explicit opt-in/limit | Require owner auth, retention/deletion |
| Ordinary derived | Due date, generic title, source ID, task status | D1 | Minimize, encrypt in transit |
| Telemetry | Sync counts, parse errors, timings | Sanitized logs | No message bodies or bearer URLs |

## 4. Authentication and authorization
**Preferred:** Cloudflare Access protecting `workers.dev` production and preview routes with a policy permitting only the owner's identity. Verify the applicable free-plan terms, device/browser behavior, and API integration; Access configuration is not assumed already done. Every API route should also validate an application-level owner/session context or trusted Access assertion as appropriate; **do not trust an unverified email header supplied by clients**.

**Collector writes:** distinct upload-specific credential and authorization route, ideally Cloudflare Access service auth plus Worker-side scoped signature checks where feasible. Use nonce/timestamp (±5 min), canonical request hash + HMAC-SHA256, constant-time comparison where available, replay cache in D1; rotate key. Do not expose collector key in PWA. If using Access service tokens, verify compatibility with Worker route and 24/7 cron. Keep health/read data separate from collector write scope.

**Emergency fallback:** verified OIDC login with issuer/JWKS validation, allowlisted immutable subject, CSRF/session cookies (`Secure`, `HttpOnly`, `SameSite=Lax/Strict`) and MFA. Avoid custom password auth on Workers Free unless carefully reviewed. Any bootstrap/invitation endpoint must be removed or locked after owner provisioning.

**Session controls:** logout/revoke; limit session lifetime; warn when cached PWA task data remains on device; revoke push subscriptions on logout; no sensitive data in push payload by default.

## 5. API protections
- Enforce authentication before sensitive database access; use server-side field-level authorization.
- Validate JSON Schema, content type, upload size and structured type; constrain string lengths. SQL must use bound parameters.
- CSRF protect state-changing browser endpoints, reject invalid Origin; use session-bound CSRF token if using cookies. CORS restrict to exact app origin(s), never `*` with credentials.
- Set `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, clickjacking restrictions and HSTS where applicable.
- Sanitize untrusted HTML/text using trusted framework escaping; no raw HTML rendering of chat messages.
- Rate limit app and collector endpoints; bound pagination and exports; fail closed if auth uncertain.
- Use per-source idempotency uniqueness; constrain import batches to avoid quota exhaustion.
- Avoid logging request body, `Authorization` header, cookies, source URLs with tokens, and raw model prompts.

## 6. Prompt injection and AI risk
Treat external messages as hostile text even if sent by classmates. The AI gets only data and a constrained extraction task. No shell/network/database tools given to model. Its JSON is validated by deterministic code and is stored as *candidate*, not canonical truth. Evidence IDs must exist in local batch. Model can be wrong about due dates/owners; require review of conflicts and ambiguous temporal claims. Include injection fixtures and regression testing.

## 7. WhatsApp and third-party privacy
- Only import chats selected by owner; no broad surveillance or hidden auto-capture.
- Chat Advanced Privacy restrictions are respected. Do not circumvent export restrictions or OS preview settings.
- Encourage transparency/appropriate permission where group members' messages are processed externally. The user remains responsible for permissions and applicable institution/platform requirements.
- Redact phone numbers, private names, unrelated interpersonal conversation and unnecessary media before remote AI; allow no-AI/manual mode.
- Optionally maintain ephemeral local evidence mapping for provenance; cloud snippets can be excluded, with a visible `source available locally only` state.

## 8. Local security
- Store export files in a private directory mode 0700; use full-disk encryption if available (not assume hardware support).
- Keep Playwright browser profiles separate; do not copy Chrome cookies/session tokens into cloud.
- 9Router binds `127.0.0.1` unless a separately secured network path is explicitly required; never make its management API public for convenience.
- On an older Arch installation, apply routine security updates, use minimal dependencies, verify supply-chain packages. Don't force costly compilation-heavy dependencies on 8 GB RAM.
- Android companion app uses declared notification listener only, stores minimal data, clear controls, no unexpected permissions.

## 9. Deletion and retention
Owner can delete group data and derived artifacts. Deletion semantics:
1. Local raw export and normalized message records: erase relevant files/records (explain SSD/backup limitations of secure deletion).
2. Cloud source items/evidence: tombstone or delete, unlink candidates; preserve independent tasks only if separate owner/manual source exists.
3. Cloud tasks: explicit user decision to delete or retain a task whose only evidence has been removed. Do not silently resurrect via sync.
4. Backups: encrypt, retain limited copies, provide purge procedure; disclose that provider backups may have separate retention.
5. Push subscriptions: revoke inactive endpoints.

Privacy settings must include a machine-readable export and wipe test.

## 10. Security acceptance tests
- Anonymous user cannot access any private GET/POST route or static PWA private data embedded in assets.
- A forged `Cf-Access-Jwt-Assertion` header (or auth header) cannot create an identity.
- Replay of collector signed envelope rejected, even if request body valid.
- A huge chat import and malformed JSON are rejected early with bounded resource use.
- HTML/script in a group message renders inert as text.
- Deliberate model prompt injection cannot invoke tools or alter canonical tasks without owner approval.
- An owner can revoke device credentials, export data and delete one chat source without leaking unrelated group data.

**Source note:** Cloudflare Access Workers documentation and WhatsApp Help Center are cataloged in `12-SOURCES.md`. Cloudflare Access and its free entitlement are a **deployment gate**, not a presumed setup.

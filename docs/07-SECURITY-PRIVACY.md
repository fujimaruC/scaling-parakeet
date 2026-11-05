# 07 — Security and privacy contract

Single-owner access and local raw data are product requirements. The updated owner choices allow minimized unapproved proposals in cloud, private remote phone→Linux transfer and explicit external AI processing. They do not authorize cloud raw archives or AI auto-approval.

## Data boundary matrix

| Data | Android | Linux | Worker/D1/PWA cloud | Upstream AI |
|---|---|---|---|---|
| Raw export archives | No Academic OS storage | Only permitted storage destination | Never | Never whole archive |
| Raw notification text | Encrypted app-private queue | Protected evidence store after receipt | Never, including encrypted raw backups | Selected minimized text only with explicit policy |
| Original evidence quotes | Local selected records | Local evidence UI | Never | Only under approved extraction policy |
| Structured proposals/tasks | Companion does not manage tasks | Local staging/cache | Allowed, necessary fields only | Extraction output untrusted |
| Sender directory/contact numbers | Avoid; only eligible local metadata | Pseudonymize/minimize | Never | Redact unless necessary and explicitly permitted |
| Router/LMS secrets | No | Local secret store | Never | Only intended provider auth through router |
| Device pairing keys | Keystore | Local protected store | Never | Never |
| Cloud collector credentials | No | Local protected store | Server-side verification only | Never |
| Safe health/counts/opaque refs | Yes | Yes | Allowed | Unnecessary |

## Storage and logging

Android raw queue is excluded from OS backup; explicitly disable cloud backup and verify actual Android 9 behavior. Encrypt payloads with platform cryptography/Keystore-backed keys, no custom algorithms. Do not write plaintext payloads to logcat, crash reports, public external storage, screenshots or diagnostics. Linux uses private directories mode 0700 and managed keys; filesystem encryption availability must be checked, not assumed. Raw data directories must be outside cloud-sync folders and excluded from backups that leave Linux.

PWA caches structured records only. Local evidence UI is separate, authenticated, no-store and loopback by default. No automatic cloud fetch/proxy of evidence. Source labels and descriptions are minimized; necessary task text can still be sensitive. Provide owner preview/settings; schema validation alone cannot detect all semantic leakage.

## Access model

Cloud owner auth preferred: Cloudflare Access + Worker-verified identity; verify actual configured routes, preview domains, service authentication and Android session behavior. Never trust arbitrary identity headers. If infeasible, evaluate audited OIDC owner-subject allowlist rather than public fallback.

Collector credential has source-specific `sync:write` and `sources:status` only, never tasks/settings/export. Android device credential reaches only paired Linux receipt/status endpoints. Distinct credential revocation and source generations prevent old queued data resurrecting deleted content. Internal scheduled handler has no public invocation endpoint.

Browser writes require Origin validation and CSRF protection with cookie sessions. Set CSP, nosniff, referrer policy, clickjacking prevention. Bound sizes, parameterized SQL, escaped text, scoped CORS and sanitized errors. Treat model output and imported source text as data, never executable instructions. AI has no application tools.

## Private remote transport

End-to-end phone/Linux encryption, peer verification, least-privilege network ACL and app pairing are mandatory. A VPN relay may carry encrypted packets; it is not permission to store raw content in cloud queues. Candidate provider must disclose control-plane metadata and relay behavior. No public raw upload endpoint or public 9Router. Restrict receiver to private interface and correct port; no blanket LAN trust or TLS verification bypass. See [15](15-PRIVATE-TRANSPORT.md).

## External AI policy

Default off. Before enabling, disclose route/provider, fields, redaction, selected sources and retention implications. Local 9Router can route externally. Provider change revokes policy until reconfirmed; no unapproved failover. Imported text cannot change consent, endpoints, allowlists or task state.

## Enrollment and filtering

Notification access is system-wide capability but application persistence is restricted to selected verified conversations. Unmatched metadata creates a sanitized gap; no raw-body quarantine of all phone messages. Group-name collisions and renamed groups need remapping. Exports require explicit source selection. Honor unavailable exports/hidden previews; use manual owner-authored tasks when capture is blocked.

## Purge and backup

Source purge revokes generation and credentials, withdraws unsupported proposals, removes cloud evidence links, asks retain-as-manual/delete for unsupported approved tasks, and requests phone/Linux cleanup. Audit/cache/export paths must honor deletion. Offline devices leave purge pending, not falsely completed. Canonical backups encrypted locally; no raw exported chats in backup package. Keys/push subscriptions excluded. Restore checks tombstones before re-enabling sync/dispatch.

## Required adversarial tests

Anonymous/forged identity, owner acting as collector, collector reading tasks, device reading cloud, nonce replay, same key/different body, oversize payload, stale generation, malicious source HTML, model instruction injection, invalid evidence, provider consent change, raw-text sink scan, Android backup restore, interrupted receipt ack, lost phone credential and purge with offline device. No real chats before these gates pass with synthetic data.

# 15 — Private remote phone-to-Linux transport

Owner selected **private remote connection**, not same-Wi-Fi-only or routine USB transfer. Local manual transfer may remain a fallback but cannot silently replace the selected architecture.

## Candidate design to verify in M0

Evaluate Tailscale/private WireGuard connectivity first: phone and Linux authenticate as owner devices, with ACL allowing only phone→Linux receiver port. Prefer direct packets; provider-encrypted relay transit can be assessed if direct NAT traversal fails. No raw storage, queues or processing at a relay. Document metadata exposure and whether relay transit meets the owner's configured policy. Provider choice/account enrollment is pending; do not say Tailscale is already selected or installed.

Tailscale docs currently list Android 8+ support and a personal free plan; this is vendor evidence, not evidence of the owner's device/account. Verify current terms, app compatibility, battery behavior, key expiry and coexistence with existing Android VPN before choosing. If the phone cannot use the required VPN or owner declines provider metadata/relay, compare direct WireGuard/private reachable host. Paid always-on raw processing would change the Linux-only architecture and requires a new decision; an inexpensive server does not solve this by permission alone.

## Receiver and pairing

Linux receiver binds only to private interface; loopback local UI separate. Firewall default deny on public interface. Use TLS with a pinned peer identity for app transport even over private VPN. No disabled certificate checks. Short-lived one-use pairing token/QR contains receiver identity/fingerprint and nonce; explicit local confirmation binds phone device ID/public credential and allowed source generations. No long-lived secret in QR or URL query. Rotate/revoke per device; revoked device cannot send or read evidence.

Local protocol version `1`; independent from cloud sync. App auth key lives in Android Keystore and protected Linux storage. Phone can submit batches and read sanitized receipt/status for its own device only. It cannot fetch Linux exports, router secrets or other devices' evidence.

## Local endpoints (not on Worker)

| Endpoint | Scope | Contract |
|---|---|---|
| POST `/local/v1/pair` | one-use local-confirmed pairing | device identity + token proof; returns scoped paired configuration |
| POST `/local/v1/notification-batches` | paired device write | <=100 events, <=256 KiB; atomic durable receipt |
| GET `/local/v1/receipts/:batch_id` | same paired device | received digest/count/commit state; no event bodies |
| GET `/local/v1/device-status` | same device | pairing, allowed sources/generations, pending purge; no tasks/evidence |
| POST `/local/v1/purge-ack` | same device | generation wiped acknowledgment |

Raw local envelope includes protocol, device_id, batch_id, source IDs/generations, created_at, ordered events with stable event_id, captured_at, source_message_at nullable, identity confidence and eligible encrypted-at-rest content. Only this transport accepts notification content. Local export files never use it. Exact wire schema and cryptographic library choice must be frozen in M0 after observed Android metadata; avoid encoding speculative WhatsApp fields as required.

## Retry/ack semantics

Sign request over method, canonical path, current timestamp, fresh nonce and body digest; verify paired identity and replay scope. Reuse batch_id and immutable bytes for retry; fresh request auth on every attempt. Linux stores device+batch ID+digest and events in one local SQLite transaction, commits durable storage, then returns `committed` receipt with accepted event IDs/count. Same batch/digest returns same receipt; changed digest conflicts. If response lost, query receipt or retry same bytes. Phone erases only after authenticated commit receipt. Acknowledged means on Linux, not extracted or synced to cloud.

Linux runs queued normalization/extraction asynchronously. Disk full, DB lock/key missing, stale generation or invalid payload never produces success. Proposed connect/read deadlines 10s/30s and exponential jitter capped 15min; network-aware scheduling and manual retry. Report phone clock skew separately rather than relaxing signatures silently. Clock synchronization instructions never expose secrets.

## Recovery and deletion

After reconnect, fetch current scoped generation/tombstone status before uploading. Purge revoked local source content and acknowledge; reject old batches even if sender skipped preflight. If Android has erased a committed batch and Linux storage is lost, raw evidence may be unrecoverable under no-cloud-backup policy; cloud tasks survive and evidence becomes unavailable. No claim of zero data loss under device loss.

User can revoke pairing without deleting approved cloud tasks. Changing receiver keys requires explicit re-pair, never trust-on-any-certificate fallback. Pairing recovery instructions must be usable through local UI and companion without terminal daily workflow.

## Validation

Real phone mobile network→Linux different network; invalid peer cert; revoked phone; wrong source; replay; same batch/different bytes; clock skew; duplicate events; before/after-commit disconnect; Linux shutdown; queue cap; invalid VPN; expired network auth; public-port scan; no raw content in cloud traffic/logging. Sanitized packet/endpoint audit documents destinations without recording message plaintext.

## Acknowledgment ledger (base 57947a3 follow-up)

Only the existing phone controls are implemented: source purge/revocation and durable-receipt cleanup. New control kinds must implement the same ledger before being enabled. Cloud holds opaque device/batch IDs, generations, fixed phases and server observation times, never message hashes/bodies. The source-scoped collector relays authenticated phone attestations; this is not independent physical attestation against a compromised Linux collector.

Purge creates one action per known device; later first contact can register previously unknown inventory. Inventory is always explicitly incomplete. Receipt records start queued from Linux commit; that is not phone cleanup. Phone explicitly acknowledges `delivered`, durably pauses/wipes/removes pending raw batch as appropriate, then acknowledges `applied`. Receipt cleanup retains encrypted metadata-only retry state; after response loss it repeats idempotent local cleanup and acknowledgment. Purge keeps its pairing credential until the applied response arrives, enabling offline retry. Old phone clients lacking the new phase can only report delivered, never application confirmation.

PWA Sources polls every 15 seconds and separates progress queued/delivered/applied from pending/expired/retired_unconfirmed/confirmed. Seven-day expiry is visibility only, not success or cancellation of mandatory source revocation. Owner retirement preserves unresolved history, not a wipe claim. A late explicit application acknowledgment can confirm with its timestamps preserved. Missing inventory, missing response, laptop never returning or stale UI never implies completion. No push delivery is required or claimed by this implementation.

Run the collector control loop independently of jobs/AI (one configured source credential per process):

```bash
COLLECTOR_SOURCE_ID=SOURCE_UUID .venv/bin/python -m academic_os.control --data-dir /absolute/private/linux-directory --watch
```

Use local environment configuration from 18-DEVELOPMENT; no secrets in chat or repository. The loop checks every 30 seconds while running, reconciles tombstones before raw processing, retries local wipe acknowledgment and relay journals after failure. Receipt relay pages rotate in batches of 50 and advance only after successful cloud response. Keep this process running alongside the local UI/private receiver. The laptop being off remains a visible unresolved state, not guaranteed delivery. Local SQLite and cloud D1 are never one distributed transaction; idempotent phase journals close response-loss windows. Cloud still rejects stale source generations. Actual phone/network/account behavior is unverified.

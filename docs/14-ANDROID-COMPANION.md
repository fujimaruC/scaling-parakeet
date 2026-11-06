# 14 — Android 9 notification companion

MVP supporting component, Kotlin, actual Android 9/API 28 test required. No native task-management UI. Dependencies must support API 28; pin target/build SDK/toolchain separately from minSdk. Do not assume newer notification runtime permission APIs apply to Android 9 notification-listener access.

## M0 device record (no raw screenshots/logs)

Record model, OS/API/build, `ActivityManager.isLowRamDevice()`, WhatsApp package/version, browser version, notification channel/privacy settings, battery mode, available storage and current VPN use. Android docs explicitly limit notification listener access on low-RAM Android Q-and-below devices; report unsupported if applicable. Do not claim RAM size alone determines the flag.

Use synthetic messages in an owner-controlled test conversation; do not enroll normal groups before privacy tests. If hardware is not connected to the coding environment, create a minimal debug APK/test instructions, have owner run cases and retain sanitized results. Emulator-only results leave M0 device gate open.

## Service lifecycle

Declare service with BIND_NOTIFICATION_LISTENER_SERVICE binding permission and the documented service action. Owner grants access through Android system settings; do not automate granting. Reflect access granted, service connected, disconnected, disabled and unsupported separately.

Wait for `onListenerConnected()` before notification APIs. Handle posted/removed callbacks and disconnected callback. Request rebind only in documented lifecycle conditions with bounded backoff. Callbacks must stay short; copy only eligible necessary fields then enqueue bounded background persistence. Track drops if even the in-memory handoff overflows. A process death before durable write may lose events; recovery cannot guarantee replay.

On connection reconcile `getActiveNotifications()` through identical filtering/dedupe rules. This exposes currently outstanding notifications, not a historical chat database. Reboot, app upgrade, OS process kill, force-stop, revoked permission and locked-device states are separate cases. Force-stop may require owner reopening/re-enabling; never claim self-recovery is guaranteed.

## Metadata extraction and allowlist

Inspect package, notification key/id/tag, post time, group key, group-summary flag, title/subtitle and MessagingStyle message entries only if provided. Respect API-level differences. Notification key/group key is not guaranteed stable WhatsApp conversation identity. Message time may be absent; preserve null and label OS observation time separately.

Default only known owner-selected WhatsApp package. Enrollment observes minimal metadata under explicit owner interaction; match conversation with verified available identifiers and owner mapping. Display-name collisions, generic summary titles, missing identity or renamed group invalidate automatic mapping. Do not persist raw bodies for unmatched events. Store aggregate sanitized gap reason/count instead; do not keep a shadow inbox of unrelated chats.

MessagingStyle may carry multiple messages or repeated historical context. Normalize each observed entry conservatively, recording evidence timestamp precision; summary notification does not imply all messages were captured. No UI clicks, reply RemoteInput, notification dismissal, accessibility scraping or hidden-preview recovery.

## Local queue

Encrypt eligible payloads using standard authenticated encryption with Keystore-managed key; metadata minimized in SQLite. Immutable event UUID, source mapping/generation, capture time, source time nullable, payload revision hash local only, queue state, attempts and batch reference. Do not use cloud-accessible paths. Explicitly exclude data from Android backup, including WAL/temp paths; validate backup restore test.

States: pending → in_flight → linux_committed → erased. Transport failure returns to pending; permanent validation failure becomes quarantined_local with sanitized reason and owner action. No cloud dead-letter raw content. Linux commit acknowledgment, not AI completion, permits phone erasure. Linux then owns retained evidence.

Proposed bounds: 50 MiB encrypted queue/14 days unacknowledged; warn 80%, record gap intervals when expiry/overflow drops data; never report no gaps after a loss. Owner can pause/wipe. Retention, bytes and age visible. Linux raw notifications default purge after 30 days; references may remain labeled evidence_expired. Source purge overrides retention and invalidates future stale batches.

## Background transfer

Use bounded scheduled/background work compatible with Android 9 and foreground manual Sync action. Network/battery restrictions can delay work. Do not require always-on foreground service as an untested assumption. Separate private-network connection state from paired-receiver authentication and Linux availability. Never fall back to public/cloud upload. See [15](15-PRIVATE-TRANSPORT.md).

## Required actual-device matrix

| Case | Expected evidence |
|---|---|
| Grant/revoke access | Correct status, no collection after revoke |
| Two selected and one unselected conversation | Eligible events captured; unselected bodies absent everywhere |
| Same-name/renamed/missing conversation metadata | No broad capture; mapping warning |
| Expanded/bundled/updated notifications | Revision dedupe; no fabricated message count |
| Muted/disabled/hidden previews | Gaps/limitations, no reconstructed text |
| Screen locked/unlocked + battery saver | Record observed delivery/delay, no guarantee extrapolation |
| Disconnect/rebind, app kill, reboot, force-stop | Correct lifecycle and explicit unrecoverable intervals |
| Linux off then reconnect | Queue survives; durable receipt, no duplicate evidence |
| Transfer interrupted before/after server commit | Same batch retries; sender only erases on receipt |
| Capacity/expiry/key loss | Visible loss/repair path; no silent plaintext fallback |
| OS backup/restore and logcat inspection | Raw queue absent from backup/logs |
| Private remote connection on mobile data | Paired encrypted receipt with laptop online; delay state when unreachable |

Pass means tested supported behavior, not complete WhatsApp history. If conversation restriction cannot be reliable, mark source unsupported until an explicit safe mapping exists; export fallback remains operational and full MVP gate remains blocked.

## Recorded M0 device evidence — 2026-11-06

Collected over ADB from the owner's actual phone with the debug probe installed. Booleans, counts and build strings only; no message content, no screenshots, no notification text.

| Field | Observed value |
|---|---|
| Model / manufacturer | CPH2015 / OPPO |
| OS / API | Android 9 / API 28 |
| Build | `CPH2015EX_11_A.67`, fingerprint `OPPO/CPH2015/OP4C7D:9/PPR1.180610.011/1640680627:user/release-keys` |
| Security patch | 2022-01-05 |
| ABI / RAM | arm64-v8a / 3.82 GB total |
| `ActivityManager.isLowRamDevice()` | **false** (read from inside the app, not inferred from RAM) |
| Free `/data` | 11 GB free of 106 GB (90% used) |
| WhatsApp | 2.26.42.74 (versionCode 264207400, targetSdk 36) |
| Chrome | 138.0.7204.179 |
| Timezone / locale | Asia/Makassar / en-GB |
| Battery saver | enabled at time of record (`global low_power=1`) |
| VPN interfaces (`tun`/`ppp`/`wg`) | none present at time of record |
| Notification listeners enabled | Google app only; Academic OS not granted |
| Debug APK install | `Success`; `MainActivity` resumed; 0 fatal exceptions after the fix below |

Because `isLowRamDevice()` is false, the documented low-RAM listener restriction does not apply to this device. This is an observation for this build only; it is not a general claim about CPH2015 units.

### Defect found by device testing (fixed)

`Queue` extends `SQLiteOpenHelper`, which does **not** implement `AutoCloseable` on API 28. Every `Queue(...).use { }` call therefore threw `ClassCastException` and `MainActivity` crashed on launch — invisible to compile, lint and synthetic tests. Fixed by declaring `Queue : SQLiteOpenHelper(...), AutoCloseable`. Six call sites in `MainActivity`, `CaptureService` and `Transport` were affected.

### Deviation from contract (open)

`Queue.add` stores an **unkeyed** SHA-256 of the payload as `fingerprint`, while [02](02-DATA-MODEL.md) requires keyed hashes with locally managed secrets. The column is local-only and never synced, but it is a stable content identifier at rest and does not meet the stated rule. Not yet changed.

### Device cases still unverified

Grant/revoke, service connect/disconnect, selected-vs-unselected filtering, bundled/updated notification dedupe, muted or hidden previews, locked screen and battery saver delivery, app kill / reboot / force-stop recovery, Linux-off queue retention, interrupted-ack retry, capacity and key-loss paths, backup/logcat sink inspection, and transfer over mobile data. The listener grant must be made by the owner in system settings; the coding agent does not automate it.

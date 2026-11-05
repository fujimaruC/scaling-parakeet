# 08 — Operations, costs and recovery

Prefer one Worker for static PWA/API/cron and one D1 database, plus local Linux collector and Android capture companion. `$0/month` is a goal, not a hard ceiling. No paid service has been approved. Compare paid options using actual benefit, recurring/variable cost, cap/alerts, cancellation and data consequences before purchase.

## Environments

Local: synthetic data, local D1, mocked identity/provider/push, private receiver disabled until pairing. Staging: authenticated cloud environment, synthetic records only. Production: owner-only after auth/privacy/device/recovery gates. Separate secrets/bindings. Never ship a development auth bypass to a deployed route.

Pin runtime and SDK versions after checking maintained support and Android 9 requirements. Use Gradle wrapper, Java compatibility recorded, Node package lock and Python environment lock. Build one heavy target at a time on 8 GB hardware. Do not run Gradle, Chromium and browser collection concurrently by default.

## Deployment checks

1. Verify current Worker/D1/Access entitlements and limits against official docs and actual account. Source availability is not account validation.
2. Configure private production and preview routes, exact owner identity and scoped collector credentials. Test anonymous and forged-token reads/writes before personal data.
3. Apply versioned migration with verified backup; static assets contain no task snapshots or keys.
4. Configure internal cron, proposed every 15 minutes. Check measured runtime/batch size against plan limits.
5. Configure push only after permission and runtime/device validation. Inbox remains usable when push is unsupported.
6. Confirm remote receiver restricted to paired phone/network and raw queue excluded from backups/logging.
7. Perform laptop-off cloud test and canonical backup restore in disposable environment.
8. Record deployed revision, tests, costs and remaining limitations. Deployment itself is not implied by a documentation handoff.

## Scheduler policy

Store reminder intents with due revision and unique rule occurrence. Cron scans bounded batches of due pending intents, claims an expiring lease atomically, creates one inbox item per intent and dispatches eligible device pushes. Recheck task state/due revision before dispatch; cancellation races already past external send are possible and must be logged honestly.

Separate processing state pending/leased/completed/canceled/dead_letter from delivery state pending/provider_accepted/failed/unknown/device_acknowledged. Provider acceptance is not displayed as physical delivery. Proposed retry cap 3 with jitter; ambiguous network result stays unknown rather than unlimited resends. Lease expiry permits recovery with honest duplicate-delivery limitation.

Catch-up policy proposed: deadline reminder missed by less than 6h may create one current alert if still useful; older ones expire into history. No catch-up storm after restore/outage. Daily briefing uses unique owner-local date and policy version. Quiet hours shift permissible notifications but never silently change task due times; show policy and skip if shifted alert is no longer useful. Snooze creates a new unique occurrence and is canceled when task completed/deleted.

## Observability

Counts, timings, sanitized error codes, queue size, last event observation, last durable receipt, last AI run, last cloud sync and source coverage are separate metrics. Cloud cannot directly know current phone permission while phone offline; label last-reported state with age. Never log bodies, signatures, session cookies, raw source URLs or model prompts.

Measure Worker requests/CPU, D1 reads/writes/storage and mobile/local memory. Proposed alerts at 50/80% of configured account limits; account-level usage may include other projects. Quota failure preserves cache/local queue, pauses retry storms and never claims successful sync. Static content availability does not imply data API availability.

## Backup/restore

Owner-initiated or explicitly configured local scheduled canonical export. Encrypt with standard `age`-style tooling after owner chooses key management; do not embed keys. Exclude raw evidence, sessions, push endpoints and device secrets. Restore into disposable local D1; compare counts and normalized hashes, test timezone/reminder derivation with dispatch disabled, preserve deletion generations. Restore production only after evidence review. Provider recovery facilities are supplementary, not the only backup. Rotate old copies after purge.

## Incident matrix

| Failure | Required behavior |
|---|---|
| Phone listener disconnected | Mark last-known state; reconnect where OS permits; unknown gap remains |
| Linux off/private VPN down | Phone queues until bound, warns before expiration/capacity; no raw cloud detour |
| Provider off/consent invalid | Keep eligible local pipeline pending; manual processing available |
| Cloud quota/outage | Cached PWA, failed sync indicator, bounded backoff; cloud scheduler may pause |
| Auth exposed | Block private-data deployment/access and remediate before use |
| Push denied/expired | Inbox entry remains; revoke invalid subscription and show status |
| Source purged while device offline | Tombstone applied before next receipt; pending device wipe visible |
| Lost paired device | Revoke its pairing and source scope; re-enroll explicitly |
| Missed notification history | Do not invent recovery; offer permitted export backfill/manual task |

Current vendor facts are recorded in [12](12-SOURCES.md); no perpetual free-cost, full coverage or delivery SLA is promised.

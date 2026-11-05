# 08 — DEPLOYMENT, OPERATIONS AND $0 COST GUARDRAILS

## 1. Hosting recommendation
Use one Cloudflare Worker (static assets + authenticated API + scheduled handler) and one D1 database, deployed to a free `workers.dev` hostname where supported. Keep Python collector and existing 9Router on Arch. Avoid all paid service dependencies, managed queues, always-on VPS, third-party SMS gateways and paid domains.

**Verified at spec creation (2026-11-05; check before deploy):** Workers Free 100,000 requests/day, 10 ms CPU/invocation, 5 Cron Triggers/account; free static asset requests. D1 free 5M rows read/day, 100K rows written/day, 5 GB total storage but **500 MB maximum per individual free database**. Exceeding free D1 daily row quotas causes queries to fail until reset; not a promise of availability. See `12-SOURCES.md` for primary documentation.

## 2. Environment layout
- **Local dev:** Wrangler dev, local D1, no real task data, fake 9Router adapter by default.
- **Staging:** optional separate Worker/D1 within free quotas; private, seeded with synthetic records only.
- **Production:** private Worker + real D1, protected with Access or equivalent audited auth.
- **Arch:** local collector, local secrets, encrypted exports, systemd oneshot service/timer when desired, not always-on.
- **Android:** browser PWA installation only for v0.1; native companion separately evaluated.

## 3. Deployment checklist
1. Verify current provider free-tier terms, D1 database limit and Access feasibility; record date in `STATUS.md`.
2. Set up Cloudflare account with MFA and least-privilege API token for deployment.
3. Create Worker, add static assets, bind D1, apply migrations, configure scheduled handler and `workers.dev` route.
4. Put access policy in front of **all** protected routes (including preview). Test anonymous GET/POST access, not merely login UI.
5. Provision collector-specific write credential in approved secret store; local `.env` never committed.
6. Configure push using VAPID only if supported on target device/runtime; validate secure push endpoint persistence and failure handling.
7. Deploy tests and health monitor; verify that turning off Arch doesn't affect app reads or scheduled intent processing.
8. Create an encrypted backup on local device and restore it in a disposable environment before accepting real data.

## 4. Scheduling policy
**Cloud cron** scans D1 pending reminder intents at a measured cadence (e.g., every 15 min). One trigger can do multiple lightweight jobs; Workers Free has limited triggers and CPU. Exact scheduling/delivery is not guaranteed to the minute; schedule early enough for practical use. The reminder processor must not need 9Router. If `date_only`, compute reminder instant from user preferences; never rewrite source deadline.

**Local systemd:** oneshot import/enrichment tasks triggered manually or on a timer while Arch is awake. Avoid waking the old laptop or running browser automation constantly. `flock` (or equivalent lock) prevents concurrent collectors. Restart after failures with backoff; do not spin.

**Optional phone companion:** network sync when device allows, never advertised as continuous/complete.

## 5. Observability
- `GET /api/health`: private, sanitized component status (cloud/db, not sensitive stack trace).
- Sync metrics: input count, parsed count, duplicates, ambiguous, candidates, duration, last success, last error code, source coverage.
- Reminder metrics: scheduled, leased, dispatched/failed/unknown, invalidated subscriptions, retry count.
- Cost metrics: Worker requests/day, D1 rows read/write/day and storage. Low threshold warnings (e.g. 50%, 80% of free limits), quota-avoiding pagination and indexing.
- AI metrics: batch count, processed tokens if exposed, invalid JSON, timeout/retry count; no raw prompts in logs.
- On-screen `source health` and `last seen` statuses are user-facing observability, not vanity charts.

## 6. Failure playbook
| Incident | Symptom | Required response |
|---|---|---|
| Laptop offline | No new chat/Moodle collector data | Tasks + reminders continue; display stale sources |
| 9Router failure | AI candidate queue pending | Store parsed local source; retry on explicit/local schedule; no reminder impact |
| D1 daily quota exhausted | API returns DB quota errors | Preserve offline snapshot, show sync error, pause writes, avoid retry storms |
| Cloud auth misconfigured | Protected API anonymously accessible | Block deployment / revoke exposed tokens; investigate before enabling data |
| Push blocked/battery optimized | Notification missing | Log delivery status honestly; in-app reminder always visible |
| iCalendar token expired | Moodle sync stops | Mark blocked, request owner re-auth/re-export; no scraping bypass |
| Wrong date extraction | Conflicting candidate | Keep original evidence; owner reviews, audit decision, recompute reminders |
| Collector upload interrupted | Partial batch | Reconcile with idempotency key / atomic batch results; retry safely |
| Provider outage | Dashboard not reachable | Cached tasks view if available; no claim of cloud availability SLA |

## 7. Backup + restore
- Implement periodic **owner-initiated** or local scheduled export via authenticated API (JSON + schema version + source IDs + task events + settings), encrypt locally with `age` or comparable standard tooling.
- Never store decryption key in the ZIP/repo/cloud. Keep one offline copy if possible.
- Restore procedure: create disposable D1 / local DB, import migration-compatible data, compare record counts and hashes, test due scheduling with fake push, then restore production only when verified.
- Cloudflare D1 Time Travel is supplemental and has plan-specific retention; **not** sole backup strategy.
- Verify deletion semantics: backups may retain deleted records until rotated; disclose this to owner.

## 8. Cost budget and graceful degradation
| Item | Budget | Control |
|---|---|---|
| Worker/API/static | $0 target | Static-first UI, small API, indexed queries, avoid SSR |
| D1 | $0 target | Small derived records, no raw transcripts, cap storage, audit quotas |
| Auth | $0 target | Verify Access eligibility or use secure no-cost identity path |
| AI | $0 incremental target | Use already-running 9Router with consent; no paid model fallback automatically |
| WhatsApp extraction | $0 | Manual exports; phone companion optional |
| LMS extraction | $0 | Authorized exports/browser-assisted/manual |
| Notifications | $0 target | Web Push if compatible; no SMS |
| Domain | $0 | `workers.dev` hostname |

**Important distinction:** zero additional cloud bill does not equal free electricity, cellular data, guaranteed provider availability, or perpetual provider quotas. If any feature would incur a charge, disable it until owner explicitly opts in.

## 9. Service objectives (not SLAs)
- Target: accessible authenticated dashboard with Arch powered off.
- Target: reminders checked at least every configured cron period during provider availability.
- Target: manually entered task reflected on second device after successful sync.
- Target: logged, explainable source freshness after every import or failure.
- Do not label any of these as guaranteed 24/7 uptime or push delivery.

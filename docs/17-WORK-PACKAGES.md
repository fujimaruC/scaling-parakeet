# 17 — Detailed implementation work packages

Use this as the next model's execution plan. Application files/commands below are **to be created**, not already present. Each package ends with STATUS evidence, relevant ADR updates and a concise handoff. No time estimates pretend to know device/account access or actual data volume.

## Common package contract

Before changes: name milestone/feature IDs, inspect existing work, list test IDs and blockers. Implement one end-to-end flow with failure states. Add synthetic regression tests that prove behavior, not merely mirror functions. Run relevant checks, record exact commands/outcomes and unresolved external tests. Never mark success on generated code alone. Continue independent work while a device/account gate is blocked; do not check off the blocked milestone.

## M0 packages

### W00 — Workspace and contracts (F01,F25)
- Create root workspaces, locked JS/Python environments, Gradle wrapper and version notes. React TS static shell, Worker local harness, Python module and companion test app.
- Implement JSON Schema adapters in TS/Python and ensure same valid/invalid corpus. Create minimal local D1 migration and transactional smoke test.
- Add `.gitignore` for keys, `.env`, private exports, queues, browser sessions, build products and real fixtures. CI includes documentation links/schemas plus code checks.
- Target commands: `npm run check` for JS + contracts, `npm run test:integration`, `npm run test:e2e`; `python -m pytest` from collector env; `./gradlew testDebugUnitTest assembleDebug` in Android project. Document actual equivalents after scaffolding. Do not claim these work before implementation.
- Exit: synthetic command runner reproducible; schema violations fail; no app secrets/static personal data.

### W01 — Android feasibility kit (F05,F06,F07)
- Implement smallest permission/status screen and NotificationListenerService. Synthetic test conversation enrollment; capture only selected metadata/body.
- Add encrypted persistent queue, explicit backup exclusions and lifecycle telemetry with no raw logs. Instrument real device cases in [14](14-ANDROID-COMPANION.md).
- Record metadata shape locally without copying real chats to repo; preserve unknown timestamps/mappings.
- Exit: actual phone protocol completed or exact blocking device requirement reported; no fallback to broad capture.

### W02 — Private transport proof (F08)
- Compare Tailscale/direct private WireGuard against Android 9, existing VPN, NAT, metadata and cost. Record chosen candidate as proposed until tested.
- Implement synthetic paired Linux receiver and phone receipt client, pinned identity, private binding and bounded retries. Separate app pairing from VPN trust.
- Inject disconnect before and after commit; demonstrate replay-safe receipt and phone erasure only after durable acknowledgment.
- Exit: real different-network phone/Linux receipt test + public interface denial. Laptop-off delay is expected and displayed.

### W03 — Auth/provider/cost feasibility (F01,F12,F25,F27)
- Verify Worker Access/collector service scope and preview protection using synthetic data where account available. Test verified identity, reject forged headers and dev bypass.
- Discover locally configured 9Router only through owner setup; run synthetic route test, record provider-policy limitations; no upstream account management.
- Produce vendor/current-cost note and research-only linked-device comparison. Do not link WhatsApp or subscribe/provision paid services.
- Exit: ADRs distinguish vendor docs, local tests and actual account/device proof; unresolved gates retained.

## M1 packages

### W10 — Domain and D1 (F02,F03,F04)
- Migrate contexts/tasks/assertions/events/settings/tombstones; use schema date rules and indices.
- Domain functions create/edit/status/archive/delete with CAS and audit. Atomic due_revision/reminder invalidation semantics prepared now.
- Test academic and organization fixtures; unknown/date-only/exact/timezone cases; stale edit fails, repeat create idempotent.

### W11 — Private API and core UI (F01,F03,F22)
- Auth middleware before routes; CSRF/Origin validation; bounded errors; task/context API.
- Responsive task list/detail/quick-add, ID/EN dictionaries, light/dark tokens and accessible controls.
- Integrate real local API/D1, not static arrays. Empty/loading/error/409 states. Mobile and keyboard test.
- Exit M1: owner flow on two browser sessions, anonymous denied, context/domain parity; STATUS honest about deployed auth.

## M2 packages

### W20 — Source enrollment and local evidence (F09,F10,F11,F24)
- Owner creates safe source alias/generation; collector provisioned scope. Local conversation mapping and source pause behavior.
- Build Linux browser import preview; stream parser with explicit locale/timezone, boundaries/warnings. Persist original local evidence and independent observation times.
- Implement repeat/overlap dedupe, local fingerprints and stable cloud opaque refs. Purge generations early; no stale-source ingest.

### W21 — Production capture queue and receiver (F05–F08)
- Harden proven M0 listener/filters into companion UI status, pause/wipe/pair, queue limits and retry state.
- Harden receipt transaction and crash handling; fetch tombstones before upload; one source cannot use another's credential.
- Test process loss/expired keys/disk full/clock skew/purge with offline device. Run real-device regression.

### W22 — Backfill and no-AI end-to-end (F09–F11,F21)
- Normalize both acquisition methods into one local store. Conservative cross-source correlation with possible_duplicate review flags.
- Show import/transfer history and sanitized source health; explicit local-only raw evidence UI.
- Send synthetic minimized stubs through signed cloud envelope. Verify D1/log/assets/backup cannot contain raw source fields.
- Exit M2: both paths work independently; no-AI mode usable; repeated observations safe; local UI needs no daily terminal.

## M3 packages

### W30 — Consent and extraction adapter (F12)
- Provider/route policy UI local, source scope, redaction preview, revocation and policy-version cache keys.
- Async bounded job queue, timeout/backoff, schema plus semantic evidence/date checks; no tool invocation by model.
- Project output through allowlisted cloud fields and issue enums; never pass arbitrary rationale or raw summary.
- Test malicious input, ambiguous relative date, provider policy change, no-AI mode and router outage.

### W31 — Proposals, review and conflicts (F04,F13,F14)
- Atomic cloud sync and candidate CAS, owner review API, task/evidence/event/reminder transaction.
- PWA review with unavailable-local-evidence label, before/after comparison, edit/reject/clarify and explicit manual override.
- Race two approvals, lose response then retry, purge evidence during review, repeat extraction after acceptance. Prove single canonical task and no lost owner edit.
- Exit M3: academic + organization complete capture→proposal→owner approval→task paths, no hidden acceptance.

## M4 packages

### W40 — Scheduler, inbox and push (F18,F19)
- Pure date-policy function, D1 intents/leases, cron bounded scans, inbox uniqueness, delivery adapter stub first.
- Cancellation/due revision, expired lease, unknown delivery, quiet hours, catch-up, snooze and daily policy tests.
- Configure real push only after runtime/device test. Test laptop/9Router off; retain inbox when push unavailable.

### W41 — Daily UX and offline (F15–F17,F20–F22)
- Today, calendar/month+list, search, history, deterministic briefing and separate source health dimensions.
- PWA manifest/static shell cache and owner-scoped structured snapshot; logout wipes, offline writes disabled.
- Run both languages/themes, 360px/text scaling/keyboard, slow network, source stale/unknown and long labels. Measure bundle/startup.

### W42 — Export, purge, restore and release (F23–F25)
- Coherent canonical JSON export and spreadsheet-injection-safe CSV; local encryption flow and key handling.
- Purge preview/commit, retained manual tasks, multi-source tasks, tombstones, offline wipe acknowledgments and cache invalidation.
- Restore into disposable DB with dispatch off; content parity plus preserved tombstones and future reminder regeneration.
- Run security/privacy sink audit, current quota review, real Android capture/push result and seven-day owner pilot. No full MVP claim before M0–M4 required evidence.

## M5 package W50 — Evidence-gated LMS (F26)

Verify account-visible calendar/API first; collect no credentials in chat. Implement local ICS with recurrence/date precision/UID/revision semantics and authorized tests. Browser adapter only after permitted source fixture. Preserve source disagreements and proposal approval; no autonomous submissions or done-state inference. Block unsupported integration clearly.

## Next-session handoff record

Include branch/base revision, package/feature IDs, changed paths, commands and results, external proof status, unresolved decisions, next smallest package and safe resume instructions. Do not restart completed slices or collapse blocked device gates into passing mocks.

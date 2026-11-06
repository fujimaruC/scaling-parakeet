# Project status — evidence and remaining work

**2026-11-06 · Asia/Makassar. Implementation started across the system; full MVP is not complete.**

Remote base: `58f00ed4770f16ae5bf73e205cad8c293bfea608` (GitHub main fetched at session start). Working branch: `build/academic-os-system`. The owner's latest request authorizes work across all milestones; the previous M0-only session boundary is superseded. Physical-device, account, privacy and release gates remain mandatory. No remote push, deployment, real chat import or paid provisioning performed.

## Implemented and exercised locally

| Area | Evidence |
|---|---|
| Workspace/tooling | Locked npm dependencies, Python requirements lock, TS config, separate React/Worker/contracts/Python/Kotlin projects, CI definition |
| Shared contracts | TS AJV + Python JSON Schema adapters, semantic dates/evidence; same synthetic fixtures |
| Worker/D1 ledger | Migration, owner identity fail-closed, contexts, task create/read/edit/delete, CAS and audit, exact/date-only/unknown dates |
| Proposal workflow | Source enrollment, scoped HMAC ingestion, nonce/idempotency, structured projection, explicit approval/rejection and transactional guards |
| Reminders | Persistent intents, deadline revision invalidation, bounded cron, unique in-app inbox; no local-AI dependency; six-hour catch-up cancellation |
| React app | Today/list, calendar-style agenda (not full month grid), search over fetched tasks, review approve/reject, sources, history, inbox, context setup, ID/EN/theme, canonical export |
| Offline | IndexedDB structured snapshot and disabled writes exercised via browser; production service worker installation/cache lifecycle still needs testing |
| Linux | Encrypted evidence store, text export parser, repeat import, local authenticated browser import UI, durable notification receipt core and generation revocation |
| AI | Consent-gated adapter and strict structured projection; no real provider request or fully integrated processing-job UI yet |
| Backup | Encrypted canonical export and disposable SQLite restore parity test; no secrets/raw evidence included |
| Calendar import | Conservative ICS preview parser; recurrence/floating-time uncertainty flagged; actual ITK connection unverified |
| Android | Source-only permission/lifecycle/filter/encrypted queue probe and official Gradle wrapper. No compiled APK or real device result |

## Commands and outcomes

- `npm run check`: formatting/type checks, local D1 tests, PWA build and Worker dry-run. See final commit/run evidence for latest test counts.
- `npm run test:e2e`: **2 passed** — create organization/context/task, reload persistence, completion, offline read-only snapshot and 360px/theme navigation.
- `.venv/bin/python -m unittest discover -s collectors/local/tests -v`: **10 passed** — encryption, idempotent receipt/import, revocation, malformed batch rollback, consent, projection, canonical restore, ICS and local browser auth/import flow.
- `python scripts/validate_planning.py`: passes schemas, invalid-input cases and documentation links; this is distinct from application tests.
- PWA production bundle measured at approximately **74.34 KiB gzip JS**, **1.79 KiB gzip CSS**. Worker dry-run **79.49 KiB gzip**. No performance/device SLA implied.
- Android `./gradlew assembleDebug --no-daemon`: **BLOCKED**. Initial Java proxy resolution fixed; Gradle downloaded. Build then failed because installed Java 17 runtime lacks JAVA_COMPILER/javac. Android SDK/device also unavailable. Source compilation and actual-device behavior remain unverified.
- Browser installer initially received invalid archives; Playwright 1.56.1 fallback mirror succeeded. Initial E2E failures exposed development proxy origin mismatch; one-origin synthetic runner fixed it. Production Origin enforcement retained.

## Milestone truth

M0 remains **PARTIAL/BLOCKED**: JS/Python foundation is runnable, Android source probe exists, but actual phone, private transport, Cloudflare account and 9Router proof are missing. Independent later-milestone implementation is allowed by the owner's expanded instruction; this does not sign off M0.

M1 is **locally exercised, not release-verified**. M2–M4 are **partial implementations**, not completed milestones. M5 has a local ICS parser only; ITK integration remains conditional/unverified.

## Concrete remaining implementation and verification

1. Compile Android on full JDK/SDK; run actual Android 9 lifecycle/low-RAM/metadata/filter/backup/retention matrix. Probe has no native transfer client.
2. Complete user-confirmed private transport provider setup, one-use pairing/peer pinning, native sender, receipt polling/ack cleanup, background retry and remote actual-device test.
3. Connect import→privacy preview→provider consent→extraction jobs→durable outbound batch retry UI. Current modules are tested independently, not a complete daily workflow.
4. Harden review edits/clarification/deadline-target UI, pending proposal CAS revisions, cursor pagination/filter contracts, real task detail/edit, full calendar and due-oriented briefing.
5. Implement reminder rule editing, quiet hours, snooze, device push/subscription lifecycle and on-device delivery evidence. Current scheduler delivers in-app only.
6. Finish source purge audit scrubbing, independent-source/manual-retain distinctions, pending device acknowledgments and browser cache invalidation; verify no resurrection across all devices/backups. Current source purge route is preliminary.
7. Production auth positive/negative test including previews; worker quota/CPU measurement; deployment with actual owner account. Credentials remain unconfigured and private APIs deny access.
8. Production offline installation/logout/cache tests, accessibility audit, Android/browser compatibility and complete translations for remaining metadata labels.
9. Restore into disposable D1 and regenerate future reminders safely, enforce restored tombstones before sync; current backup test is disposable SQLite only.
10. Actual provider-route/policy verification, authorized ITK feasibility, final cost/transport ADR and seven-day owner pilot.

The system cannot be declared complete from these local proofs. No original group history, physical notification delivery or ITK access is assumed. Run instructions are in 18-DEVELOPMENT.md; continue from the remaining list, preserving working slices and adding evidence.

Mobile dark-mode render visually inspected after browser tests. `git diff --cached --check` passed. GitHub CI workflow is defined but has not been triggered here. All validation used synthetic data.

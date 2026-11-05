# 09 — Milestones and release gates

Version 0.2.0. Implement one complete slice at a time. Work packages [17](17-WORK-PACKAGES.md) carry concrete instructions; feature catalog [13](13-FEATURE-CATALOG.md) carries traceability. Current default handoff authorizes **M0 only**.

## M0 — Feasibility, device proof and runnable foundation

- Inventory repo; pin React/TS/Worker/Python/Kotlin tooling compatible with hardware; setup monorepo, local D1, CI and synthetic fixtures.
- Build minimal real Android 9 probe for access/lifecycle, metadata, allowlist feasibility, queue persistence/encryption/backup exclusion and reconnect recovery.
- Prototype private remote pairing/receiver/receipt using synthetic content; test phone on a different network while Linux on/off.
- Verify provider consent/projection boundaries; 9Router synthetic smoke test only if local instance accessible. No assumption this cloud environment can reach owner's localhost.
- Verify Cloudflare Access/service authentication feasibility and current cost model; mock/local negative auth tests plus account evidence when available.
- Write research-only linked-device ADR; no account linking or integration code.
- Create schemas/adapters and local D1 migration smoke tests; define one documented check command.

**Exit:** reproducible local skeleton checks; real Android device evidence for required behavior; transport/privacy and auth design evidence; ADR updates. If physical/account access absent, mark subgate BLOCKED, prepare test kit and continue independent local work, but never mark M0 complete. Unsupported actual device triggers owner decision, not silent listener demotion.

## M1 — Private responsibility ledger

Owner authentication, contexts including organization, task CRUD/date precision/status/history, scoped source enrollment, optimistic concurrency, source generations, base React shell and manual quick-add. Minimal local browser setup. Cloud identity verified before real data.

**Exit:** academic assignment and organization duty round-trip through DB/UI; unknown/date-only correct; second-device/360px view; negative auth and concurrency pass. No integration needed to use manual tasks.

## M2 — Both collection paths and durable transfer

Harden Kotlin capture queue/filters/status, private remote Linux receipt/ack, Linux export parser and browser import preview/history. Shared normalization, local evidence store, overlap and cross-source linking. No-AI mode and fake structured cloud sync. Source pause/purge generations enforced early.

**Exit:** actual phone plus export backfill produces stable local evidence; retry/duplicate/interrupted-ack tests pass; nonselected conversations absent; no raw cloud storage/log/backup; local UI usable without routine terminal commands.

## M3 — Consent, extraction and owner review

9Router adapter, provider-policy consent, redaction, strict output and semantic/evidence validation, cloud projection, signed sync, proposal inbox, owner edits/rejection/clarification/approval, conflicts and audit. Scope rules tested.

**Exit:** academic + Himpunan synthetic proposals reviewed; all AI task changes explicitly approved; duplicate extraction/import does not duplicate task; revoked consent/provider outage preserves task usability; privacy sink scans pass.

## M4 — Daily PWA, reminders, privacy release candidate

Today/calendar/list/search/history/briefing; ID/EN and light/dark; cloud cron/intents/inbox/push feasibility; offline snapshot; reliable source health; snooze/settings; canonical export/encrypted restore; source/task purge incl offline-device acknowledgment; resource/accessibility tests.

**Exit:** M0–M4 acceptance evidence plus real-device proof, cloud production/preview auth, laptop-off reminder/read test, interrupted sync/review races, cache/logout clear, purge no resurrection and canonical restore. Seven-day owner pilot records limitations. This is MVP completion; no speculative integration can be called connected.

## M5 — Conditional ITK integration

Inspect owner-visible calendar/API capability through permitted session. Prefer local `.ics` import, then permitted feed/authorized API; browser-assisted adapter only with actual layout and permission evidence. Preserve source precision and conflicts. Never auto-approve AI interpretation or auto-complete from missing assignments.

**Exit:** verified ITK source returns expected fields with repeated/changed event tests; otherwise explicitly blocked and manual source-link tasks remain. The lack of Moodle API does not block M0–M4 MVP.

## Later releases

Recurring responsibilities, subtasks, exam planning, AI group recaps/decision archive, offline writes and any owner-approved third adapter need separate feature/ADR approval. Listener is not in this future bucket. Basic search/calendar/briefing/deletion/backup are not deferred polish.

## Release control

A milestone is complete only with commands/outcomes and required real-device/account observations in STATUS. Synthetic mocks prove logic, not transport/device/service availability. Fallback-only preview may be useful but must be labeled explicitly if dual ingestion gate is unfulfilled. No automatic deployment, paid provisioning or GitHub push is implied by the plan.

# 00 — Academic OS product requirements

**Version 0.2.0 · 2026-11-06 · specification only.** Owner-confirmed scope is in [16](16-OWNER-DECISIONS.md). Implementation truth lives only in [STATUS](STATUS.md).

## Problem and product promise

Academic deadlines and Himpunan/organizational commitments are scattered across Moodle and selected WhatsApp conversations. The owner needs less mental overhead: know what to do, when, why, what changed and what may be missing. This is a personal memory system, not a productivity scoring tool.

One private owner uses an 8 GB Arch Linux VAIO and Android 9. No team accounts or collaboration platform. Organizations are responsibility contexts, not additional users.

## Outcomes

| ID | Outcome | Release proof |
|---|---|---|
| O1 | Obligations persist across devices | Manual/approved academic and organizational tasks survive refresh and second-device read |
| O2 | Capture reduces manual effort | Actual Android 9 listener records selected notification events; export backfill works independently |
| O3 | AI never silently decides | Zero canonical changes without explicit owner review; audit links every accepted proposal |
| O4 | Provenance stays honest | Every proposal has valid evidence references and local-evidence availability; gaps never called complete |
| O5 | Laptop-off usefulness | Cloud tasks, deterministic briefing and reminder checks pass with collector/AI disconnected |
| O6 | Raw content stays local | Sink inspection finds no raw messages/quotes/exports in cloud DB, API payloads, logs, backups or assets |
| O7 | Mobile accessibility | ID/EN, light/dark, 360px, keyboard, 200% text and offline snapshot checks pass |
| O8 | Affordable operation | Measured usage/cost plan; no unapproved recurring service or automatic paid fallback |

## MVP boundaries

Required: private login; context/course/organization organization; manual tasks; exact/date-only/unknown dates; status/priority; listener and export importer; private remote phone→Linux queue; local normalization/evidence; explicit AI consent; structured proposals; review/edit/reject/conflicts; home/tasks/calendar/search/history; deterministic daily briefing; cloud reminder engine/in-app inbox; push feasibility and honest fallback; offline read cache; source health; export/purge/encrypted canonical backup/restore; local browser import/setup UI; ID/EN and light/dark.

Conditional after source verification: ITK iCalendar or permitted student-visible integration. Moodle failure does not stop manual tasks. Unofficial linked-device clients are research only.

Later: recurring responsibilities, rich subtasks, study planning, AI group recaps, searchable non-task decision archive, offline writes. Native Android task manager, public users, autonomous submissions/messages, opaque automatic approval and full WhatsApp coverage claims are out of scope.

## Required flows

1. **Today:** Academic report and organization meeting coexist in urgency order. Unknown dates appear in a separate visible section. Source warnings never imply that silence means no new responsibilities.
2. **Phone capture:** Owner enables listener, selects verified conversation mappings, pairs Linux. Eligible events queue on phone; laptop unreachability does not discard them. Missing metadata produces a coverage warning, not broader collection.
3. **Backfill:** Owner imports a Linux-local export, previews group/range/gaps, normalizes, deduplicates and optionally extracts. Export evidence can enrich an existing notification-derived proposal without duplicating a task.
4. **AI review:** With explicit route/provider consent, selected text is minimized and extracted on the local pipeline. Structured proposal syncs to PWA. Owner accepts, edits, rejects or requests clarification. Quotes remain local; phone shows evidence unavailable remotely when appropriate.
5. **Deadline change:** New claim preserves old deadline and evidence. Only owner acceptance updates the task and cancels/recomputes reminder intents atomically.
6. **Laptop off:** Phone capture can continue best-effort; processing and cloud proposal arrival wait. Existing tasks/briefing/reminders continue in cloud. UI differentiates capture heartbeat, transfer receipt, AI run and cloud sync.
7. **Delete:** Source purge previews affected evidence/proposals/tasks. Owner decides whether unsupported approved tasks survive as manual records. Old queues cannot resurrect purged evidence.

## Functional contract

| ID | Requirement |
|---|---|
| FR01 | One owner, authenticated server-side access, separate source-scoped collector and phone credentials |
| FR02 | Context type academic/organization/personal; course required by neither task nor organization workflow; context archive preserves history |
| FR03 | Task CRUD, todo/doing/blocked/done/archived, owner priority, optional due, stable IDs, optimistic versions, audit |
| FR04 | Both WhatsApp methods normalize into local evidence records with source/observation time and uncertainty kept distinct |
| FR05 | Listener grants, lifecycle, allowlist mapping, queue, remote transfer, status and incomplete coverage visible; actual Android 9 proof |
| FR06 | Export import local only; parsing preview, import history, overlap dedupe and manual fallback always usable |
| FR07 | Explicit external-AI policy; bounded adapter; strict/semantic validation; injection-resistant proposals; no direct task writes |
| FR08 | Cloud proposals contain necessary structured fields and opaque references only; approve/edit/reject/clarify, evidence state and conflicts |
| FR09 | Today, tasks, review, calendar/list, search, history, sources and settings work for both domains |
| FR10 | Persistent cloud reminder intents and inbox; configurable timing, snooze, privacy-safe push, delivery status; no AI dependency |
| FR11 | Read-only offline snapshot with timestamp; no fake write success; clear all private cache on logout |
| FR12 | Canonical JSON export, spreadsheet-safe CSV, encrypted local backup/restore; source/task purge and non-resurrection |
| FR13 | Source health distinguishes availability, freshness, coverage and verification; never estimates unseen-message counts without evidence |
| FR14 | Indonesian/English interface and parsing support, light/dark, accessible phone and desktop use |
| FR15 | Deterministic daily overview from saved tasks; non-task announcements can be reviewed for manual promotion/dismissal, not auto-converted |
| FR16 | ITK integration is an evidence-gated workstream; authorized calendar/file/manual fallback remains explicit |

## Date, approval and privacy invariants

Date-only is not midnight or 23:59. Unknown source timestamp prevents confident relative-date resolution. Notification post time is observation time unless message timestamp is actually available. Every AI-originated task and deadline edit needs explicit owner action, even a high-confidence statement. Manual tasks are independent owner input.

Cloud may contain minimized proposals, approved tasks, safe context aliases, opaque evidence refs, observation timestamps and health. No raw quotation, sender directory, chat history or arbitrary model rationale. Strict schema plus local projection and owner configuration govern this boundary. Raw evidence may be unavailable when Linux is off; do not pretend it can be shown.

## Proposed operational defaults

One owner; current semester and active obligations first. Exact deadline reminders 24h and 3h before, date-only at 09:00 previous day, daily overview 07:00, Asia/Makassar. All editable, shown during setup. Cloud check cadence target 15 minutes, best-effort provider/device delivery. Late-created tasks produce at most one catch-up alert within the documented window, never replay an entire overdue history. Unknown/approximate dates receive no timed deadline reminder until confirmed.

Raw notification queue default 14-day maximum and 50 MiB bound; warn at 80%, record aggregate gap if capacity/expiry drops content. Purge acknowledged phone raw data after durable Linux receipt; retain Linux raw notifications at most 30 days by default. Local export files remain until owner deletes with a retention reminder. No raw cloud backup, including encrypted raw archives. Proposed values must be visible/configurable and measured on hardware.

## Definition of release

M0–M4 plus pilot gates must pass. Listener must be proven on the actual Android 9 phone, not silently replaced by export-only. A fallback-only build may ship explicitly as a limited preview; it is not completed MVP. Export backfill, approval audit, duplicate/conflict handling, privacy sinks, remote interrupted-transfer recovery, laptop-off cloud scheduler, offline cache clear, authentication on production/preview, backup/restore and deletion are required evidence.

A seven-day owner pilot should include one academic and one organizational approved obligation, repeated import, delayed phone transfer and laptop-off use. Pilot results are observations, not guarantees of no missed tasks. Device, account or provider access unavailable to the coding agent remains a recorded release blocker.

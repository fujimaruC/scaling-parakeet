# 00 — MASTER PRODUCT REQUIREMENTS DOCUMENT

**Project:** Academic OS  
**Version:** 0.1.0 — specification, not implementation  
**Owner:** one individual, IT-background student at Institut Teknologi Kalimantan (ITK)  
**Primary timezone:** `Asia/Makassar` (`UTC+08:00`)  
**Target operational spend:** `$0/month`, not guaranteed unlimited usage  
**Date:** 2026-11-05

## 1. The problem
University assignments live across an increasingly complicated Moodle-based LMS and important discussions in WhatsApp groups. Critical information arrives asynchronously, is easy to forget, can change, and is difficult to verify. The owner has strong systems knowledge but limited budget, an 8 GB Arch Linux laptop that is not always powered on, and an Android 9 phone. The product must reduce *memory burden*, not simply build another list the user needs to remember to check.

## 2. Product promise
> "Tell me what I must do, what changed, where the claim came from, and what I might have missed — even if my laptop is off."

Academic OS is a personal academic inbox, planner, and provenance-backed memory layer. It does **not** promise to read every WhatsApp message or discover every LMS assignment automatically.

## 3. Product objectives and metrics

| ID | Objective | Measurement / release threshold |
|---|---|---|
| O1 | Keep a reliable personal assignment list | 100% of manually entered tasks persist across refresh/device change in acceptance tests |
| O2 | Preserve source trust | 100% of AI-generated task candidates have explicit source IDs or are labeled `insufficient_evidence` |
| O3 | Reduce missed tasks | Reminders generated for all eligible, saved deadlines according to policy in deterministic scheduler tests; actual device delivery is best-effort |
| O4 | Remain useful when VAIO is off | Dashboard and existing tasks load from cloud without collector/9Router in outage E2E test |
| O5 | Minimize false certainty | UI shows last sync, coverage, and `unverified/conflicted` status whenever applicable |
| O6 | Achieve zero recurring mandatory spend | Baseline deploy fits published free limits; rate limits + usage monitoring + fail-closed when quota exhausted |
| O7 | Remain usable on Android 9 | Test on real device or representative supported browser; readable mobile layout, offline cached tasks, nonblocking performance |
| O8 | Respect group privacy | Only explicitly selected chats are processed; raw chats stay local by default; deletion is testable |

**Success indicator after pilot (target, not claim):** one week of daily use, no unexpected data leaks, at least three correctly evidenced real-world task captures (with owner verification), no duplicate task creation from repeated imports, usable dashboard with VAIO powered off.

## 4. Personas and critical scenarios
**Primary/only persona:** technically capable student who forgets tasks, dislikes repetitive manual tracking, needs phone access and near-zero operating expense.

1. **Morning:** Open PWA → see `Today`, `Due soon`, `Needs review`, and `What changed since last visit?` plus source freshness.
2. **Unexpected chat update:** Import an authorized class-group export → AI proposes an assignment date change → compare against LMS assertion → owner confirms or rejects before canonical deadline changes.
3. **Laptop off:** Phone opens cached/hosted tasks; cron checks existing deadlines. No new local AI analysis claimed.
4. **Missed messages:** Notification listener saw gaps/muted notifications; dashboard says `partial coverage` and offers chat export, not `all caught up`.
5. **LMS not integrable:** User saves task manually / uses browser-assisted collection on their own account; project remains useful.
6. **Network outage:** PWA shows cached tasks and offline badge, disables unsafe writes or queues idempotent edits with explicit sync state.
7. **Disputed deadline:** Moodle says Friday; group says Sunday → two claims appear with evidence and verification status; no silent overwrite.

## 5. Capability release matrix

| Capability | v0.1 (MVP) | v0.2 | v0.3 / optional |
|---|---|---|---|
| Private login, task CRUD, filters, manual entry | Required | Maintain | Maintain |
| Source-linked candidate review queue | Required | Improve | Improve |
| Local WhatsApp text export importer | Required | Improve formats | Retention controls |
| Local AI extraction through existing 9Router | Required (opt-in per import) | Batching/fallback | Advanced recall |
| Cloudflare Workers + D1 hosted PWA | Required | Improve | Maintain |
| Cloud deadline checks + notifications | Reminder engine required; push tested, with visible fallback | Harden delivery | Optional multi-channel |
| PWA cached read-only offline view | Required | Offline edit queue | — |
| ITK Moodle integration | Feasibility gate; manual entry fallback | Calendar/API/extension if verified | Browser-assisted ingestion if permitted |
| WhatsApp Android notification listener | Not required; feasibility spike | Optional prototype with consent | Best-effort integration |
| Local semantic search of full raw chat | Out of scope | Optional local search | — |
| Multi-user/public service | Never | Never | Never |

## 6. Functional requirements

### FR-01: Single-owner workspace
- Only a preauthorized identity can access private data. Public sign-up disabled; sensitive API routes protected server-side.
- Owner can create/edit/archive/delete tasks and review ingestion status.
- Separate least-privilege credential for collector uploads, revocable without losing owner access.

### FR-02: Task representation
Required fields: stable ID, title, status, source(s), deadline precision (`datetime`, `date_only`, `approximate`, `unknown`), date in source timezone, course/group tag, priority, evidence, created/updated timestamps. Optional description, submission URL, checklist, reminders, notes and conflicts. **Missing due date must not default to midnight.**

### FR-03: Source-aware ingestion
- Import one or more WhatsApp exported text files that belong to owner-selected groups, locally; support repeated/overlapping exports idempotently.
- Parse timestamps, multiline messages, sender labels, system notices, edited content when representable, and language variations conservatively.
- Support a local no-AI import/preview mode. Never upload raw chats to D1 by default.
- Record source health (`ok`, `partial`, `stale`, `offline`, `blocked`, `unverified`) and `last_successful_sync` per connector.

### FR-04: AI-assisted extraction
- Existing 9Router provides configurable OpenAI-compatible `/v1/chat/completions` endpoint on laptop; use bounded batches and validated structured JSON.
- Extract candidate task, meeting, exam, announcement, deadline update, decision, and owner action; include evidence IDs and unknown fields as `null`.
- AI outputs are untrusted suggestions until validated; critical date updates require owner review.
- Reminders must continue when AI is unavailable.

### FR-05: Reconciliation and provenance
- Create independent source assertions for LMS, chat and manual input; preserve disagreements.
- The user can approve, edit, dismiss, snooze, or mark ambiguous items; actions are audited.
- Deduplication must not merge distinct assignments with coincidentally similar titles.
- Every important change has before/after state and linked evidence or explicit `manual_override`.

### FR-06: Dashboard and memory UX
- Default sections: `Today`, `Upcoming`, `Overdue`, `Needs review`, `What changed?`, `Sources`.
- Search tasks; filter by course, origin, status, time range; default sort by urgency without obscuring unknown due dates.
- Each card shows original link when safe, last-sync time and `verified` vs `AI-suggested` badge.
- Android 9 interface uses responsive PWA and readable typography; no excessive motion/heavy visual shaders.

### FR-07: Reminders
- Configurable rules, default **24 hours and 3 hours before exact deadlines**; for `date_only`, a configurable local-time reminder (e.g. 09:00 on preceding day). Do not assume a precise due time.
- Persist reminder intents in D1; cloud cron identifies due intents without local computer.
- Prevent duplicate sends via atomic claim, idempotency, and status tracking; retain attempted/delivered/failed/unknown distinctions.
- Push is best-effort; support visible in-app alerts and optional owner-chosen fallback channel only after verified setup.

### FR-08: Offline and sync
- Cache last successfully fetched task set on device with a visible `last updated` timestamp and logout/clear control.
- Server state remains authoritative after sync. Local edits should be disabled in v0.1 offline rather than give a false success state.
- Collector can retry after downtime without duplicate rows or corrupting newer user edits.

### FR-09: Export and deletion
- User may export canonical tasks + sources + user decisions as JSON/CSV.
- Delete chosen source imports and associated derived records according to explicit policy; reconcile tasks referenced by multiple sources.
- Provide encrypted backups, restore test and data purge instructions.

## 7. Nonfunctional requirements

| Category | Requirement |
|---|---|
| Privacy | Data minimization; explicit allowlist; raw chat local by default; provider disclosure before remote AI requests |
| Reliability | Durable D1 task storage, retry-safe sync, worker-independent reminders, visible source coverage |
| Security | HTTPS, signed collector writes, replay protection, access policy, no public secrets, CSRF protections on mutable browser routes |
| Performance | First useful mobile view on mid-range Android 9 browser; avoid megabyte-sized JS frameworks if unnecessary; target p95 API read <1 s under normal conditions (measure, don't promise) |
| Availability | Public Internet–reachable *authenticated* dashboard while laptop is off, subject to host availability; no uptime SLA |
| Cost | No recurring mandatory charge; alarms for free quota and read-only degradation if exhausted |
| Accessibility | Keyboard navigation; WCAG AA contrast target; touch-friendly controls; motion reduction; text scaling |
| Maintainability | Modular docs, tests, migrations, structured logs without message bodies, ADRs |
| Localization | English UI first; Indonesian message parsing; Asia/Makassar timezone configurable; consistent 12/24h and localized date formats |

## 8. Assumptions, dependencies, and falsification

| Hypothesis | Status | Required proof / fallback |
|---|---|---|
| ITK Moodle exposes iCalendar export | Unverified | Inspect calendar UI when signed in; fallback manual task entry |
| ITK enables student API | Unverified | Test an authorized student-visible interface; fallback calendar/browser-assisted/manual |
| WhatsApp export works for selected groups | Depends on group privacy settings | One owner-provided redacted fixture; Advanced Chat Privacy may block |
| Android notification listener captures useful group text | Unverified on Android 9 | Test actual device and notification settings; **never** promise full coverage |
| 9Router works locally with selected model | User reports working | Agent can test `/v1/models` or minimal local completion without exposing upstream accounts |
| Worker + D1 free-tier fits usage | Likely at personal scale | Deploy load test, quotas, monitoring; fail safe |
| Browser push reaches Android 9 consistently | Unverified | On-device test; in-app alert fallback |

**Explicit non-goals:** automatic university grade changes/submissions; 24/7 full WhatsApp monitoring; bypass of institutional controls; scraping people not in approved chats; account rotation/usage-limit evasion; collection of nonessential personal data.

## 9. Definition of MVP completion
All of the following must be proven, not merely described:

- An authenticated owner can add a task on laptop and view it on Android or emulator.
- An authorized, synthetic WhatsApp export produces source-linked **candidate** items through either a mocked AI or 9Router adapter; invalid model output never directly modifies tasks.
- Reimporting the same exported messages creates **zero** duplicate source messages/candidates under defined deduplication rules.
- Owner can accept/dismiss/edit a candidate; history is recorded.
- A configured reminder intent is claimed and processed by cloud-side scheduler with 9Router and laptop completely offline.
- Dashboard remains readable with local collector unavailable and shows accurate stale indicators.
- Owner can export data, restore from an encrypted backup (tested), and delete imported source data.
- No public unauthenticated read/write route exposes tasks, summaries, or source metadata.
- Zero mandatory billed resources for the tested deployment; known quotas recorded.
- `docs/STATUS.md` contains dated test evidence and remaining limitations.

## 10. Change control
Master PRD owns product scope and success criteria. Architecture and subsystem docs cannot silently weaken its constraints. Decision changes require an ADR, impacted docs update, regression tests, and increment of specification version. Implemented status is tracked **only** in `STATUS.md` against concrete evidence.

## 11. Navigation
Read `01` architecture for boundary design; `02` data; `03` Moodle; `04` WhatsApp; `05` AI; `06` UI; `07` security; `08` operations; `09` milestones; `10` contracts; `11` testing; `12` sources.

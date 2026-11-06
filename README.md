# Academic OS

Private memory for **academic and organizational responsibilities**: what needs doing, when, where it came from, what changed and what may have been missed.

**Specification v0.2.0 · 2026-11-06 · implementation in progress.**

[Run the local implementation and checks](docs/18-DEVELOPMENT.md). See STATUS for tested behavior and remaining gates.

One owner. An 8 GB Arch Linux VAIO, an Android 9 phone, Moodle, and selected WhatsApp conversations. No teams, no public accounts, no productivity scoring.

## Start here

1. [Agent rules](AGENTS.md)
2. [Confirmed owner decisions](docs/16-OWNER-DECISIONS.md)
3. [Master PRD](docs/00-MASTER-PRD.md)
4. [Implementation gates](docs/09-IMPLEMENTATION.md) and [detailed work packages](docs/17-WORK-PACKAGES.md)
5. [Status](docs/STATUS.md) and [decisions](docs/DECISIONS.md)
6. [Next-model handoff](FIRST-AGENT-SESSION.md) · [Cloud-agent prompt](NEXT-PROMPT.md)
7. [Background checks](docs/AUTOMATION.md) — how delivery is watched while away
8. [Verification log](docs/VERIFICATION-LOG.md) — what was actually run, and what was not
9. [Next slice](docs/NEXT-SLICE.md) — the handoff prompt to continue

## Product structure

| Surface | Responsibility |
|---|---|
| Responsive React PWA | Today, tasks, proposals, calendar, search, history, settings; Indonesian/English and light/dark |
| Kotlin Android companion | Selected WhatsApp notification capture, local queue, device pairing and health; no native task manager |
| Python Linux collector + local browser UI | Export import, phone receipt, normalized evidence, privacy preview, 9Router extraction, sync |
| Cloudflare Worker + D1 | Private structured proposals/tasks, owner decisions, cloud reminders and device-independent reads |

Both notification capture **and** manual export import belong in MVP. Academic courses and Himpunan/organizational contexts are equally supported. Every AI task requires explicit owner approval. Raw messages, quotes and exports never enter application cloud storage. Minimized unapproved proposals may sync for phone review; full evidence stays local. Remote phone-to-Linux transport is preferred and must be proven privately on the actual Android 9 device.

$0 mandatory recurring spend is a preference, not an absolute constraint. Paid alternatives require a concrete cost/benefit decision; no billing activation is authorized by this planning package.

## The problem, in one flow

1. **Today** — academic deadlines and organizational duties in one urgency order; unknown dates sit in their own visible section.
2. **Capture** — the phone listener queues selected notification events; the laptop being off never discards them.
3. **Backfill** — a Linux-local WhatsApp export is previewed, normalized, deduplicated and optionally extracted.
4. **Review** — AI proposes; the owner accepts, edits, rejects or asks for clarification. Quotes never leave the laptop.
5. **Change** — a new deadline claim preserves the old one plus evidence; only owner acceptance moves the task and recomputes reminders.
6. **Laptop off** — cloud tasks, briefing and reminders keep working; capture waits and says so.

## Roadmap

Implementation proceeds one vertical slice at a time. The owner has authorized implementation across the system. External/device gates still require real evidence.

| Gate | Scope | State |
|---|---|---|
| **M0** Feasibility and foundation | Toolchain, monorepo, contracts, local D1; real Android 9 listener probe; private phone→Linux transport proof; Cloudflare auth/cost; 9Router synthetic smoke; linked-device research ADR | PARTIAL — see STATUS |
| **M1** Private ledger | Owner auth, contexts, task CRUD with date precision, history, manual quick-add, base React shell | PARTIAL — see STATUS |
| **M2** Both collection paths | Hardened listener queue, remote receipt/ack, export parser and import preview, shared normalization, dedupe, local evidence | PARTIAL — see STATUS |
| **M3** AI review | 9Router adapter, consent, redaction, strict validation, cloud projection, proposal inbox, conflicts | PARTIAL — see STATUS |
| **M4** Daily product | PWA screens, cloud scheduler/inbox, push feasibility, offline snapshot, source health, export/purge/restore, 7-day pilot = **MVP** | PARTIAL — see STATUS |
| **M5** ITK integration | Evidence-gated iCalendar or permitted feed/API; manual fallback otherwise | UNVERIFIED / conditional |

Work packages: `W00`–`W03` (M0), `W10`–`W11` (M1), `W20`–`W22` (M2), `W30`–`W31` (M3), `W40`–`W42` (M4), `W50` (M5) — details in [17](docs/17-WORK-PACKAGES.md).

### M0 exit condition

Reproducible local skeleton checks; **real Android device evidence** for lifecycle, metadata, filtering, queue and recovery; transport/privacy and auth design evidence; ADRs updated. If the phone or accounts are unreachable, the subgate is marked `BLOCKED` and independent local work continues — M0 is never declared complete on mocks.

## Feature scope

30 tracked features in [13](docs/13-FEATURE-CATALOG.md). MVP-required highlights:

| Area | Features |
|---|---|
| Identity and ledger | F01 single-owner auth · F02 academic/organization contexts · F03 task CRUD · F04 versioned history |
| Android capture | F05 listener lifecycle · F06 conversation filtering · F07 encrypted queue · F08 private transfer |
| Linux ingest | F09 export import + preview · F10 normalization/dedupe · F11 local evidence vs cloud projection |
| AI | F12 consent and extraction · F13 owner review · F14 deadline conflict reconciliation |
| Daily use | F15 today/list/calendar · F16 search/history · F17 deterministic briefing · F18 reminders/inbox · F19 push feasibility · F20 offline snapshot · F21 source health · F22 ID/EN, themes, a11y |
| Lifecycle | F23 export/encrypted restore · F24 purge without resurrection · F25 budgets and recovery |
| Conditional | F26 ITK source · F27 linked-device research (no enrollment) |

Later: F28 subtasks/recurrence, F29 group recaps, F30 offline writes.

## Architecture

Repository modules (implementation maturity differs; see STATUS):

```
apps/web                  React + TS static PWA (cloud-facing)
apps/worker               TS Worker + D1: auth, routes, domain, scheduler, delivery
apps/worker/migrations    Versioned D1 SQL, no real seeds
apps/android-companion    Kotlin listener, queue, pairing, transfer
collectors/local          Local browser import/evidence/processing UI and private receiver
collectors/local          Python ingest, normalize, evidence, privacy, ai, sync
packages/contracts        Validation adapters generated from root schemas
tests/{fixtures,contract,integration,e2e}   Synthetic only
scripts                   Setup and check runners
```

Trust boundary: raw source text lives on Android and Linux only. The cloud holds structured proposals, approved tasks, opaque evidence IDs and reminder state. Collector credentials are source-scoped and cannot read the dashboard API wholesale. See [01](docs/01-ARCHITECTURE.md) and [07](docs/07-SECURITY-PRIVACY.md).

## Data model at a glance

- **Cloud:** `contexts`, `sources`, `source_items` (no quotes, no bodies, no raw hashes), `candidates`, `candidate_evidence`, `assertions`, `tasks`, `task_evidence`, `review_actions`, `task_events`, `reminder_rules`, `reminder_intents`, `notification_inbox`, `delivery_attempts`, `push_subscriptions`, `idempotency_records`, `replay_nonces`, `source_tombstones`, `settings`.
- **Local only:** phone capture events and receipts; Linux raw exports, normalized messages, extraction runs, consent receipts.
- **Dates** stay distinct: exact timestamp, date-only, approximate, unknown (`null`). Relative dates resolve from the source message time, never from "today".
- Every mutation is versioned; approvals and reminder recomputation are atomic.

Details in [02](docs/02-DATA-MODEL.md) and [10](docs/10-API-CONTRACTS.md).

## Rules that do not bend

- One owner. No registration, no shared workspace, no public personal-data endpoint.
- Listener **and** export import are both MVP; a working export fallback does not satisfy the dual-ingestion gate.
- No raw chat text, quotes, exports or content hashes in Worker/D1, logs, assets, crash reports or cloud backups.
- Every AI-extracted task waits for explicit owner approval; a model's `needs_review` field cannot override that.
- 9Router is replaceable. External processing stays off until a named route and privacy policy are enabled.
- Cloud tasks, briefing and reminders work with the laptop and 9Router switched off.
- No hidden collection, non-allowlisted conversations, MFA/CAPTCHA circumvention or unsolicited messaging. Linked-device integration is research only.
- Never fabricate coverage, missed-message counts, deadlines, push delivery or test results.

## Documentation map

| Document | Contract |
|---|---|
| [00 PRD](docs/00-MASTER-PRD.md) | Product requirements and release definition |
| [01 Architecture](docs/01-ARCHITECTURE.md) | Components, repository modules and trust boundaries |
| [02 Data model](docs/02-DATA-MODEL.md) | Entities, dates, provenance, versioning and purge |
| [03 LMS](docs/03-LMS-INTEGRATION.md) | Evidence-gated ITK integration |
| [04 WhatsApp](docs/04-WHATSAPP-INGESTION.md) | Export + notification normalization/backfill |
| [05 AI](docs/05-AI-PIPELINE.md) | Consent, deterministic validation and proposal lifecycle |
| [06 UX](docs/06-UI-UX.md) | Screens, interactions and accessibility |
| [07 Security/privacy](docs/07-SECURITY-PRIVACY.md) | Storage, authorization and data handling |
| [08 Operations](docs/08-OPERATIONS.md) | Deployment, budgets, backups and incidents |
| [09 Implementation](docs/09-IMPLEMENTATION.md) | Milestones and release gates |
| [10 API](docs/10-API-CONTRACTS.md) | Local/cloud endpoints and retry semantics |
| [11 Tests](docs/11-TEST-STRATEGY.md) | Acceptance matrix and evidence |
| [12 Sources](docs/12-SOURCES.md) | Dated primary references and uncertainty |
| [13 Features](docs/13-FEATURE-CATALOG.md) | Priority, dependencies and acceptance mapping |
| [14 Android](docs/14-ANDROID-COMPANION.md) | Listener lifecycle and real-device test protocol |
| [15 Transport](docs/15-PRIVATE-TRANSPORT.md) | Private remote pairing, queue and acknowledgments |
| [16 Owner decisions](docs/16-OWNER-DECISIONS.md) | Confirmed requirements vs proposed engineering choices |
| [17 Work packages](docs/17-WORK-PACKAGES.md) | Executable instructions and milestone handoffs |

`docs/`, `schemas/` and `examples/` at the repository root are canonical. Old package entry points redirect here; do not create independent copies. Use `npm run check`, `npm run test:e2e` and the Python checks in the development guide. Documentation validation is not application verification.

## Validate this planning package

Use a Python virtual environment, install `requirements-docs.txt`, then run `python scripts/validate_planning.py`. It checks local documentation links, v2 schema/examples and rejection cases. It does not test application behavior or device/service feasibility. Runtime validators must explicitly enable date/UUID/time formats and implement semantic/reference checks.

```bash
python -m venv .venv && . .venv/bin/activate
pip install -r requirements-docs.txt
python scripts/validate_planning.py
```

Expected output reports 3 schemas, 5 valid fixtures/date variants, 21 rejection cases, the current relative-link count, 30 features and 34 test IDs.

## Status

Runnable local implementation and a compiled Android debug companion are present. Deployment/device/account gates remain open. Evidence, incomplete features and next steps live in [STATUS](docs/STATUS.md).

# Academic OS — Private, Zero-Budget, Agent-Ready Specification

**Status:** planning/specification only. **Version:** PRD v0.1.0. **Last reviewed:** 2026-11-05. **Owner:** single end user.

Academic OS is a private, mobile-friendly academic memory system that captures ITK Moodle assignments and permitted WhatsApp group information, identifies actionable academic items through an existing 9Router AI endpoint, and delivers dependable reminders from saved deadlines. It is not a general-purpose LMS replacement, WhatsApp scraper, or SaaS product.

> **Non-negotiable:** When the Arch laptop/9Router is off, the hosted dashboard, already-synced tasks, and cloud-scheduled reminder checks must remain usable (subject to cloud/notification availability). New local-only ingestion/AI work waits and is explicitly marked stale.

## Read order for coding agents

1. [`AGENTS.md`](AGENTS.md) — mandatory implementation and safety rules.
2. [`docs/00-MASTER-PRD.md`](docs/00-MASTER-PRD.md) — product requirements, priorities, success criteria.
3. [`docs/09-IMPLEMENTATION.md`](docs/09-IMPLEMENTATION.md) — stage gates and vertical slices.
4. The relevant subsystem spec; use [`docs/01-ARCHITECTURE.md`](docs/01-ARCHITECTURE.md) for cross-component changes.
5. [`docs/DECISIONS.md`](docs/DECISIONS.md) and [`docs/STATUS.md`](docs/STATUS.md) — architectural decisions and known unknowns.

## Document map

| Document | Purpose |
|---|---|
| `docs/00-MASTER-PRD.md` | Product contract and acceptance criteria |
| `docs/01-ARCHITECTURE.md` | Component boundaries, trust boundaries, operating modes |
| `docs/02-DATA-MODEL.md` | D1 schema, IDs, provenance, merges, retention |
| `docs/03-LMS-INTEGRATION.md` | ITK Moodle investigation and permitted ingestion fallbacks |
| `docs/04-WHATSAPP-INGESTION.md` | Exports first; optional Android notification feed later |
| `docs/05-AI-PIPELINE.md` | 9Router adapter, schemas, guardrails and review workflow |
| `docs/06-UI-UX.md` | PWA information architecture, accessibility and stale-data UX |
| `docs/07-SECURITY-PRIVACY.md` | Threat model, authentication, consent and privacy |
| `docs/08-OPERATIONS.md` | $0 architecture, deployment, cron, backup and observability |
| `docs/09-IMPLEMENTATION.md` | Milestones, dependency gates, acceptance tests |
| `docs/10-API-CONTRACTS.md` | Endpoint shapes, state transitions, idempotency |
| `docs/11-TEST-STRATEGY.md` | Quality gates and realistic test cases |
| `docs/12-SOURCES.md` | Dated sources, assumptions and verification checklist |
| `docs/DECISIONS.md` | Architecture Decision Records (ADRs) |
| `docs/STATUS.md` | Progress, verified facts, unverified integrations |
| `schemas/ai-extraction.schema.json` | Machine-readable AI output schema |
| `schemas/sync-envelope.schema.json` | Machine-readable collector upload schema |
| `examples/.env.example` | Placeholder environment settings; no secrets |
| `examples/sample-messages.txt` | Fictional Indonesian test input |

## Hardware and budget constraints

- **Computer:** older Sony VAIO E Series 14P on Arch Linux, 8 GB RAM, hybrid GPU; do **not** depend on GPU acceleration or 24/7 operation.
- **Phone:** Android 9; prefer responsive PWA; native notification listener is optional and must be proven on the actual device.
- **AI:** already-running, local **9Router** endpoint with user-managed upstream accounts. Treat 9Router as replaceable OpenAI-compatible infrastructure, not as guaranteed cloud availability. No account credential handling in Academic OS.
- **LMS:** `https://kuliah.itk.ac.id`, Moodle-based; **student API / calendar export availability unverified**. No IT administrator cooperation assumed.
- **Chat:** selected WhatsApp groups only; no complete official personal-group message API assumed.
- **Hosting:** aim for a Cloudflare Workers + D1 free-tier deployment, using `workers.dev` if practical. No paid domain or VPS required for MVP.

## Scope boundaries

**In:** single-user tasks, review queue, manual task entry, source-aware extraction, daily/weekly recaps, due-date reminders, source health, mobile/offline read cache, export/backups.

**Out of initial scope:** WhatsApp automation promising full coverage, automatic LMS submissions, message sending, autonomous account changes, university SSO bypass, public accounts, live GPU inference, payment features, collaboration/multi-tenancy, and 24/7 on-device AI.

## Development convention

The repository accompanying this package is **documentation**, not a deployed application. No user data, tokens, passwords, export files, or 9Router configuration are bundled. Implementation agents must validate infrastructure availability and security before claiming features are complete.

## Starting prompt for your coding agent

> Implement Academic OS incrementally. Read `AGENTS.md`, `docs/00-MASTER-PRD.md`, `docs/09-IMPLEMENTATION.md`, and relevant specs. Begin with the first uncompleted implementation gate. Never assume ITK Moodle API access or full WhatsApp message coverage. Keep the app private, free-tier-compatible, and usable when my laptop is offline. Add tests, update `docs/STATUS.md` and `docs/DECISIONS.md`, and report exactly which acceptance criteria passed and which remain blocked.

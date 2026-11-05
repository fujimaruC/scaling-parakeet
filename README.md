# Academic OS

Private memory for **academic and organizational responsibilities**: what needs doing, when, where it came from, what changed and what may have been missed.

**Specification v0.2.0 · 2026-11-06 · planning complete; application not implemented.**

## Start here

1. [Agent rules](AGENTS.md)
2. [Confirmed owner decisions](docs/16-OWNER-DECISIONS.md)
3. [Master PRD](docs/00-MASTER-PRD.md)
4. [Implementation gates](docs/09-IMPLEMENTATION.md) and [detailed work packages](docs/17-WORK-PACKAGES.md)
5. [Status](docs/STATUS.md) and [decisions](docs/DECISIONS.md)
6. [Next-model handoff](FIRST-AGENT-SESSION.md)

## Product structure

| Surface | Responsibility |
|---|---|
| Responsive React PWA | Today, tasks, proposals, calendar, search, history, settings; Indonesian/English and light/dark |
| Kotlin Android companion | Selected WhatsApp notification capture, local queue, device pairing and health; no native task manager |
| Python Linux collector + local browser UI | Export import, phone receipt, normalized evidence, privacy preview, 9Router extraction, sync |
| Cloudflare Worker + D1 | Private structured proposals/tasks, owner decisions, cloud reminders and device-independent reads |

Both notification capture **and** manual export import belong in MVP. Academic courses and Himpunan/organizational contexts are equally supported. Every AI task requires explicit owner approval. Raw messages, quotes and exports never enter application cloud storage. Minimized unapproved proposals may sync for phone review; full evidence stays local. Remote phone-to-Linux transport is preferred and must be proven privately on the actual Android 9 device.

$0 mandatory recurring spend is a preference, not an absolute constraint. Paid alternatives require a concrete cost/benefit decision; no billing activation is authorized by this planning package.

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

`docs/`, `schemas/` and `examples/` at the repository root are canonical. Old package entry points redirect here; do not create independent copies. No application test commands exist yet: M0 must implement them. Documentation validation is not application verification.

## Validate this planning package

Use a Python virtual environment, install `requirements-docs.txt`, then run `python scripts/validate_planning.py`. It checks local documentation links, v2 schema/examples and rejection cases. It does not test application behavior or device/service feasibility. Runtime validators must explicitly enable date/UUID/time formats and implement semantic/reference checks.

# ARCHITECTURE DECISION RECORDS

Each decision includes status and consequences. `Accepted` means **spec design accepted**, not feature implemented. Changes require date, impact review and updates to impacted specifications.

## ADR-001 — Hybrid cloud memory, local collection/AI
- **Date:** 2026-11-05. **Status:** Accepted for MVP design.
- **Context:** Arch VAIO 8 GB cannot be always on; owner needs phone dashboard and reminders at $0 incremental cloud cost.
- **Decision:** Cloudflare Worker+D1 stores canonical tasks and executes reminder checks. Arch hosts local WhatsApp/Moodle collector and existing 9Router adapter. Optional phone companion later.
- **Consequence:** Cloud dashboard remains useful without Arch; local-only ingestion/AI stop when laptop off. Source status must be explicit. Hosting free-tier availability isn't guaranteed.
- **Alternatives rejected:** VPS/always-on laptop (cost/power), fully local-only (no remote dashboard), serverless AI inference on Free Worker (CPU/feasibility).

## ADR-002 — Manual WhatsApp exports first
- **Date:** 2026-11-05. **Status:** Accepted.
- **Decision:** MVP imports explicitly selected WhatsApp exports locally. No unofficial linked-device clients or WhatsApp Web automation dependency.
- **Consequence:** History capture is manual and conditional on Advanced Chat Privacy; future notification listener is partial-only and optional.

## ADR-003 — 9Router as replaceable AI adapter
- **Date:** 2026-11-05. **Status:** Accepted.
- **Decision:** Use existing local OpenAI-compatible 9Router with configurable endpoint/model. No management of upstream user accounts, provider authentication flows or guaranteed quotas.
- **Consequence:** AI enrichment depends on available router; canonical task state and cloud reminders do not.

## ADR-004 — Evidence before automation
- **Date:** 2026-11-05. **Status:** Accepted.
- **Decision:** AI output is structured candidate + evidence, not authoritative task. Critical due-date discrepancies require explicit owner decision.
- **Consequence:** Extra review step prevents silent hallucinations and mistaken reminders; data model needs source assertions and audit.

## ADR-005 — Cloud-only derived records by default
- **Date:** 2026-11-05. **Status:** Accepted.
- **Decision:** Keep raw WhatsApp exports on Arch; sync minimal source metadata and reviewed/derived academic items to D1. AI excerpts only with appropriate opt-in and redaction.
- **Consequence:** Full evidence may be unavailable from phone if laptop is off, but privacy exposure is smaller.

## ADR-006 — Authentication selection is a deployment gate
- **Date:** 2026-11-05. **Status:** Proposed / Verify.
- **Preferred:** Cloudflare Access with one owner allowlist on `workers.dev`, plus distinct authenticated collector write scope. If infeasible, implement audited secure OIDC owner-only login.
- **Decision pending:** Confirm free-tier eligibility and exact integration with Worker routing, scheduled handlers, service tokens and PWA offline cache.
- **Do not do:** deploy public private-data endpoints; trust unsigned identity headers; expose login page as the only security control.

## ADR-007 — UI framework selection pending
- **Date:** 2026-11-05. **Status:** Proposed.
- **Candidate:** Vite + TypeScript + Svelte or React. Choose based on small static bundle, maintainability and agent familiarity; avoid SSR by default.
- **Decision pending:** Benchmark initial bundle and mobile performance on low-end Android-like profile. Do not scaffold both stacks.

## ADR-008 — Reminder semantics independent of AI
- **Date:** 2026-11-05. **Status:** Accepted.
- **Decision:** D1 reminder intents + Worker Cron for existing tasks. Date-only tasks use a separate configurable notification-time policy. Push is best-effort, with in-app inbox.
- **Consequence:** 9Router down does not stop reminders, but cloud quota/outage or phone restrictions may prevent delivery; show honest status.

## ADR template
```markdown
## ADR-### — Title
- Date:
- Status: Proposed | Accepted | Superseded
- Context:
- Decision:
- Consequences:
- Alternatives:
- Verification / rollback:
```

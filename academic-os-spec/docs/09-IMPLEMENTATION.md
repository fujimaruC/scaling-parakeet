# 09 — IMPLEMENTATION PLAN, DEPENDENCIES AND RELEASE GATES

**Principle:** vertical slices beat feature-shaped stubs. All milestones have automated criteria, manual verification and explicit failure behavior. Track actual progress in `STATUS.md`.

## Milestone 0 — Feasibility and project skeleton (P0)
**Deliverables:** repo scaffolding (`apps/web`, `apps/worker`, `collectors/local`, `packages/contracts`), TypeScript+Python tooling, CI lint/typecheck/tests, local D1 migrations, env templates, technical feasibility checklist. Use synthetic data only.

**Gate checks:**
- Verify Cloudflare Workers/D1 free tier and auth approach on `workers.dev` (or document blockers).
- Confirm whether 9Router local API can run an authorized test request using an already-selected model, without exposing account credentials.
- Record LMS API/calendar status as unverified until user-visible testing; do not block everything on it.
- Select and record frontend framework and authentication design in an ADR.

**Exit:** single command runs skeleton tests; no unprotected private endpoints; `STATUS.md` updated.

## Milestone 1 — Core private task ledger (P0)
**Deliverables:** authenticated PWA and Worker task API; manual CRUD, task statuses, exact/date-only/unknown due, D1 migrations, basic list and detail views, source freshness placeholder.

**E2E:** create task on desktop, load on Android-like viewport; verify 403/401 without auth; unknown due date stays unknown; optimistic update conflict handled. With VAIO off, reads still work.

## Milestone 2 — Local WhatsApp import, no AI required (P0)
**Deliverables:** deterministic parser for synthetic Indonesian exports, allowlist, local SQLite/raw retention, dedupe, preview/errors/coverage report, mocked sync envelope to Worker. No real group messages in fixtures.

**E2E:** five multiline messages parse correctly; repeat import yields no duplicates; blocked/unselected group rejected; D1 stores only minimized structured metadata.

## Milestone 3 — 9Router extraction + review inbox (P0)
**Deliverables:** OpenAI-compatible adapter, schema-validation, bounded retry, prompt-injection tests, evidence resolution, candidate-review workflow, conflict UI, auditable accept/dismiss actions.

**E2E:** source-linked group assignment appears in inbox; acceptance creates/updates task only after user confirmation; malicious group text never executes action; 9Router downtime does not affect existing tasks.

## Milestone 4 — Cloud reminder engine and mobile offline cache (P0)
**Deliverables:** cloud cron processing D1 `reminder_intents`, claim/retry/de-dupe, in-app alerts, Web Push feasibility/optional enabled path, Android PWA caching, source health indicators.

**E2E:** simulate deadline and cron while collector off; due intent marked processed (and push attempted only if configured); offline PWA renders prior task snapshot; user sees freshness warning; timezones and date-only policy tested.

**Release candidate v0.1** if milestones 0–4 and security/backup gates pass.

## Milestone 5 — ITK Moodle source integration (P1, evidence-gated)
**Deliverables:** `.ics` import and/or authorized, tested course-page capture; source assertions for LMS deadlines and official links; stale/blocked status. Start manual iCal ingestion before cloud automated feed.

**Gate:** feature can only claim `connected` when tested with user-authorized ITK account. If unavailable, manual tasks and source-link clipboard import remain supported; do not create fake API clients.

## Milestone 6 — Android 9 notification-assisted ingestion (P2, experimental)
**Deliverables:** small Kotlin companion app (only if feasible) with explicit notification access, group allowlist, encrypted app-private queue, best-effort sync, coverage labels, data wipe.

**Gate:** verify OS/device callback behavior, permissions, battery constraints, muted group behavior, privacy of previews, and compliance. UI must always label `partial`; deployment optional.

## Milestone 7 — Better recaps, search and hardening (P2)
**Deliverables:** daily deterministic briefing when AI offline, optional AI recap when local processing available, search, clearer decision-history drill-down, privacy deletion and restore automation, accessibility/performance tuning.

## Vertical-slice backlog (in dependency order)
| ID | Work item | Depends on | Acceptance test |
|---|---|---|---|
| S01 | D1 schema and migrations | M0 | migrate + rollback/replay test |
| S02 | Owner auth protection | M0 | anonymous cannot read or write |
| S03 | Task CRUD API | S01,S02 | CRUD + version conflicts |
| S04 | PWA task list/manual entry | S03 | mobile, keyboard E2E |
| S05 | Local chat export parser | M0 | fixture + overlap dedupe |
| S06 | Collector signed sync | S01,S02,S05 | reject replay/invalid schema |
| S07 | 9Router adapter and schema | S05 | malicious/invalid model response rejected |
| S08 | Candidate review UI/API | S03,S06,S07 | source-linked accept/decline |
| S09 | Reminder policies + cron | S03 | laptop-off deterministic test |
| S10 | PWA offline cache | S04 | offline snapshot + stale label |
| S11 | Push feasibility | S09 | Android 9 real-device test or visible blocker |
| S12 | Moodle `.ics` adapter | S01 | valid VEVENT fixture and date-only case |
| S13 | ITK user-visible integration | S12 + permission evidence | provenance + sync coverage on account |
| S14 | Android notification companion | S05 + owner consent | partial-coverage real-device tests |
| S15 | Backup/restore + source deletion | S01,S03,S06 | data parity + no resurrection |

## Test gates for every PR
1. No security scope/permission expansion without explicit ADR.
2. `format`, `lint`, `typecheck`, `unit` pass for changed projects.
3. Integration contract tests use synthetic fixtures; cloud auth test must be negative as well as positive.
4. New UI tested in 360px viewport + keyboard navigation + disconnected mode where relevant.
5. Source-specific edge cases covered or documented with blocked label.
6. Cloud quota/cost implication summarized; no unexpected paid resource.
7. `STATUS.md` updated with evidence and next action.

## Release checklist
- [ ] Auth verified on production and preview routes
- [ ] Database migrations applied with backup
- [ ] Signed collector access scoped and rotateable
- [ ] No raw chats/credentials in cloud logs/assets
- [ ] Reminder cron verified without local collector/AI
- [ ] Mobile PWA offline read works with stale banner
- [ ] AI outputs validated and human review required for uncertain updates
- [ ] Group allowlist, source purge, and export tested
- [ ] Free quota thresholds and incident plan documented
- [ ] Real Android 9 device push tested or explicitly marked unsupported
- [ ] Moodle status truthfully reported as tested/unverified
- [ ] Acceptance evidence in `STATUS.md`

## What agent must not do
Do not implement a polished landing page while core CRUD/auth is absent; do not make WhatsApp Web scraping critical path; do not wait for Moodle admin help; do not add multi-user architecture; do not introduce pay-as-you-go AI fallback; do not mark mock/demo integrations as operational.

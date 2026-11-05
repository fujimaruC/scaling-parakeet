# Planning intake and repository audit

Historical v0.1 discovery audit. Owner interview is now incorporated in v0.2; see `16-OWNER-DECISIONS.md`, current PRD and STATUS. Paths below describe the original repository layout. This audit is not an active conflicting instruction.

## Baseline and scope

- Repository: https://github.com/fujimaruC/scaling-parakeet.git
- Inspected commit: `293525f96a473fcbcab9026df58e16d17a18d59a` (`first commit`).
- Read all 26 tracked files, including instruction duplicates, subsystem specifications, schemas, sample configuration and fictional messages.
- The repository contains specifications only. No application, dependency manifest, migration, CI implementation or executable test suite is present.
- The owner requested a comprehensive planning package, feature structure, detailed implementation instructions and PRD for a later model, with a detailed interview before filling product gaps.
- Current work is documentation discovery only. No application code, deployment, external account setup or remote push has been performed.
- Existing vendor claims in `12-SOURCES.md` are inherited claims, not independently verified by this audit. Verify official sources before adopting mutable platform limits or capabilities in the revised plan.

## Findings requiring resolution

| ID | Evidence | Issue / planning action |
|---|---|---|
| A01 | Root `AGENTS.md`, `FIRST-AGENT-SESSION.md`; nested package | Root instructions reference absent root `docs/` and `schemas/`. Choose one canonical layout and repair all entry points. |
| A02 | Root and nested AGENTS/master PRD/session prompt | Duplicates are currently identical, but independent copies can drift. Establish one source of truth and explicit navigation. |
| A03 | Master product promise, ADR-002, M2, M5 | Export-first chat ingestion and deferred Moodle integration may not meet the owner's actual automation need. Interview before approving MVP scope. |
| A04 | Master FR-06, capability matrix, M7 | Search and recaps have inconsistent or incomplete release assignments. Calendar views lack a clear milestone. Create feature-to-release traceability. |
| A05 | M0-4 release gate, M7, S15 | Backup, restore and deletion are release gates but also described as later hardening. Separate mandatory working baseline from later automation/polish. |
| A06 | Master FR-03, architecture section 6, UI trust states | Connector status vocabulary differs (`ok`/`healthy`, `unverified`/`not_configured`, etc.). Separate health, coverage, configuration and verification rather than mixing enums. |
| A07 | AI schema, sync schema, API section 5 | `candidate_json` permits an arbitrary object; candidate/source/evidence identity mapping across local and cloud records is not fully defined. Specify strict nested validation, stable IDs and batch/reference rules. |
| A08 | API review example, data model candidates | Review requests require `expected_candidate_version`, but candidate table contract has no version. Define concurrency and atomic review behavior. |
| A09 | API task DELETE, data-model read invariant and tasks table | Soft deletion/tombstones are required, but task deletion fields and resurrection prevention are incomplete. Define purge, retention, imports and task ownership behavior together. |
| A10 | Data model reminder state, architecture claims, master FR-07 | Reminder processing state and delivery evidence are not consistently separated. Define leasing, retries, unknown outcomes, cancellation and overdue catch-up without claiming exactly-once delivery. |
| A11 | Master FR-05, UI section 6, API table | Snooze/mute and review snooze are mentioned without complete state, persistence or endpoint contracts. Scope explicitly. |
| A12 | Source/recap/settings API, data model | Source provisioning and credential lifecycle, stored recaps, settings writes, export/restore coverage and non-task candidate outcomes need end-to-end contracts. |
| A13 | ADR-006/007, M0 | Framework and auth remain proposed. Determine owner constraints, then verify feasibility and record choices rather than treating proposals as accepted implementations. |
| A14 | Master performance targets, test strategy | Bundle/resource limits, actual device/browser, expected import scale and reminder tolerance need measurable acceptance budgets. |
| A15 | First-session prompt vs owner request to build all work later | Existing prompt permits M0 only. Define the next model's session boundary, continuation rules and evidence-dependent gates explicitly. |

## Owner interview topics

1. Rank the actual problem: missed LMS deadlines, buried chat instructions, group coordination, revision planning, or another need; provide a recent concrete example.
2. Confirm or revise single-owner use, zero mandatory spend, local 9Router, VAIO/Arch 8 GB, Android 9, ITK and Asia/Makassar assumptions.
3. Define acceptable import effort and freshness: manual export cadence, laptop-off duration and acceptable delay for new information.
4. Choose the useful first release: planner/review/manual export first, or integration-led acceptance; distinguish LMS and chat priorities.
5. Describe known Moodle and chat export availability without sharing secrets or classmates' conversations.
6. Estimate courses, groups, message volume, active tasks and historical import range.
7. Choose what evidence may reach cloud and upstream AI; establish remote review usability and privacy defaults.
8. Define candidate review burden, reliable-source ingestion policy and conflict handling.
9. Define reminder channels, timing, quiet hours, overdue behavior and delivery expectations.
10. Choose required non-task features and review how meetings, announcements and decisions should appear.
11. Define UI language, visual direction and highest-frequency phone actions.
12. Describe Cloudflare/auth readiness, framework preferences and local CLI versus guided import requirements.
13. Define next-model work boundaries, deployment expectations and delivery format for the planning changes.

## Planned final package after interview

- Canonical README and instruction entry points with repaired links and documented precedence.
- Revised master PRD with owner-confirmed scope, non-goals, user journeys and measurable release criteria.
- Feature catalog with stable IDs, priorities, dependencies, failure states and acceptance tests.
- Screen/flow structure and concrete frontend/backend/collector/module ownership.
- Consistent data, API, sync, date, evidence, deletion and reminder contracts.
- Ordered implementation slices with prerequisites, checks and stop/continue rules.
- Decision log and explicit unresolved feasibility gates.
- Next-model handoff prompt, reading order and status/evidence template.

Keep existing security and privacy guardrails in force. Do not convert unanswered interview topics into owner-approved choices. Mark every proposed solution and distinguish repository inspection, vendor documentation, account verification and actual implementation testing.

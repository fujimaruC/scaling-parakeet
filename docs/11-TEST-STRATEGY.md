# 11 — Acceptance and validation strategy

Tests below are required implementation work, **not passing tests in this documentation repository**. Use synthetic Indonesian academic and Himpunan examples. Separate deterministic logic, integration, browser and actual-device/account evidence.

| ID | Scenario | Expected proof / gate |
|---|---|---|
| T01 | Anonymous/forged owner identity on production and preview | All private read/write fails; no static private data |
| T02 | Collector/phone/owner scope separation | Collector cannot read tasks or approve; phone cannot access cloud; owner cannot impersonate collector |
| T03 | Academic course + organization without course | Both create/filter/review/calendar/remind equally |
| T04 | Unknown/approximate/date-only/exact due | No invented time; unknown has no scheduled deadline |
| T05 | Relative date from trustworthy/absent message time | Uses source time only; absent source time remains ambiguous |
| T06 | Invalid date, timezone, DST ambiguity | Semantic validation rejects or requires clarification |
| T07 | Two task edits race | One CAS wins, other 409; no partial audit/reminder write |
| T08 | Actual Android permission/lifecycle/low-RAM/reboot/force-stop | Sanitized real-device matrix, supported vs blocked honest |
| T09 | Selected/unselected/same-name/missing metadata | No unrelated raw persistence; uncertain mapping skipped |
| T10 | Phone queue process kill/backup/cap/expiry | Durable encrypted storage, no cloud backup; recorded gaps |
| T11 | Private remote link mobile-data→Linux | Paired TLS/ACL, private-only receiver; Linux-off queues |
| T12 | Interrupted before/after commit; same batch changed body | One receipt/evidence set, no premature erasure; conflict on mutation |
| T13 | Multiline/export locales/system/media/header-like lines | Correct boundaries, warnings, local-only file import/history |
| T14 | Repeated/overlapping exports and notification backfill | No duplicate evidence/proposals; uncertain matches flagged |
| T15 | Two approvals / lost response / accepted proposal reanalysis | One task; idempotent review; prior decision preserved |
| T16 | Raw text/quotes/hash/sender in cloud envelope/log/backup | Schema rejects fields and projection/sink inspection finds no leaks |
| T17 | Consent off/revoked/provider changed | Zero external AI content calls; pending/manual fallback |
| T18 | Model invalid JSON/evidence/instructions/secret-containing source | Bounded retry, no tools/direct canonical writes, safe projection |
| T19 | AI proposal accept/edit/reject/clarify | Only explicit owner acceptance creates/updates task; audit present |
| T20 | Formal LMS vs group/internal/organization due conflict | Both claims preserved; owner resolves, reminders recomputed |
| T21 | Calendar + no-date tasks + completed/archive filters | Correct all-day vs timed placement and domain coverage |
| T22 | Search escaping/SQL/long input/pagination | Bounded results, no injection or unbounded data scans |
| T23 | Daily briefing with router/Linux off | Deterministic saved-task overview; pending separate |
| T24 | Cron while Linux off; two cron workers; expired lease | Unique inbox intent, bounded claims/retry, no device dependency |
| T25 | Due edit/complete/delete/snooze/quiet hours/outage catch-up | Old revisions invalidated; no stale reminder storm |
| T26 | Real Android browser push denied/locked/reboot/battery | Actual result recorded; provider accepted != delivered; inbox fallback |
| T27 | Offline snapshot/logout/relogin/new owner session | Clear timestamps, disabled writes, no cache leak after logout |
| T28 | Source silence/disconnect/old heartbeat/export overlap | Unknown/partial/stale distinct, no invented missed-message counts |
| T29 | ID/EN light/dark 360px keyboard/text 200% | Readable, no essential clipping/overflow, focus and labels |
| T30 | Canonical export/encrypted disposable restore | Normalized counts/hashes match; no raw/keys/push endpoints; dispatch off |
| T31 | Purge multi-source/task-only/phone offline/old backup | Correct owner choices, generation rejects resurrection, wipe pending honest |
| T32 | Cloud quota/disk full/key loss/provider failure | No fake success; bounded retry; visible fallback and recovery |
| T33 | Resource budgets/cost guardrails | Measured bundle/memory/query/CPU, proposed budgets reviewed |
| T34 | Authorized real ITK source and repeated/changed ICS events | Account evidence, correct precision/provenance; no speculative API claim |

## Test layers

Unit: dates, normalizer, dedupe, privacy projection, scheduler policies. Contract: schemas across TS/Python, auth scope, idempotency, source generation. Integration: local SQLite receipt transactions, D1 approval/reminder/purge, consent job transitions. E2E: React/local UI with synthetic backend, offline behavior, owner review conflicts. Device: Kotlin listener and browser push separately. Account: Access policies and ITK permissions separately.

## Proposed performance budgets (validate in M0, not user volume estimates)

Initial cloud PWA JS <=200 KiB gzip excluding deferred routes; first useful mobile view <=3s in a documented throttled profile; p95 warmed task read <1s in recorded normal test conditions. Linux parser test 20k synthetic messages with incremental reading, target peak RSS <256 MiB excluding browser/runtime tooling. Phone callback target <50ms of application work with background persistence; measure without claiming crash-proof capture. Cloud sync <=256 KiB/100 items/50 candidates; queue 50 MiB target; bounded scheduler batch starts at 20 intents and is tuned to measured CPU/subrequests.

These are engineering targets, not observed facts or service guarantees. If incompatible with actual hardware/runtime limits, record measured evidence and ADR change before increasing them. Test both small data and synthetic stress; do not invent actual group counts.

## Required fixtures

Fictional academic report, Himpunan event duty, meeting time proposal, unanswered deadline question, same-title distinct tasks, message-time missing, identical text repeats, notification summary/update, hidden preview, renamed conversation, export backfill, malicious instructions and raw leak sentinel. Real private chats never enter repo, CI or public screenshots.

## Verification reporting

Record date/timezone, branch/ref, test ID, command, environment/version, result, output location and limitations. Mocked push proves adapter logic only; emulator proves UI/logic only; vendor docs prove general capability only. Keep physical-device and deployed-account verification separate. Final release evidence includes seven-day pilot, both domains and both capture paths.

## Executable acceptance traceability — builder follow-up, 2026-11-09

These mappings identify assertions, not proof inferred from matching test names.
All listed code checks use synthetic data. An acceptance ID remains open where
its real-device/account observation or owner budget review is absent.

| ID | Executable evidence and exact scenario | What it proves; remaining gap |
|---|---|---|
| T18 | [test_injection.py](../collectors/local/tests/test_injection.py): `test_hostile_corpus_stays_user_data_and_every_valid_output_needs_review`, `test_schema_rejects_no_evidence_fake_schema_tools_and_autoapproval`, `test_evidence_subset_and_invalid_json_fail_before_projection`, `test_secret_shaped_source_values_never_reach_provider_json`, `test_provider_attempt_and_input_output_sizes_are_bounded`; [review-boundary.test.ts](../tests/integration/review-boundary.test.ts): `AI-shaped proposals with review flags and issues cannot perform a canonical write without an explicit owner review` | Seven hostile source cases, rejected adversarial outputs, strict schema/known-evidence subset, known token-pattern redaction, one bounded provider attempt, no tool request/execution and no canonical write on sync. The HTTP provider is a local mock; model obedience and semantic grounding are unverified. Secrets outside the tested heuristic patterns can remain; owner preview/consent is still required. |
| T19 | [ledger.test.ts](../tests/integration/ledger.test.ts): `signed ingestion remains proposal-only and explicit approval is idempotent`; [review-boundary.test.ts](../tests/integration/review-boundary.test.ts): `reject and clarify only audit a proposal; accept with edits alone creates the corrected canonical task`; [app.spec.ts](../tests/e2e/app.spec.ts): `correct a proposal before approval`; [native-owner.test.ts](../tests/integration/native-owner.test.ts): `proposal acceptance is explicit, compensating Undo is versioned, exports exclude auth tables` | Real local Worker handlers preserve proposals until explicit owner acceptance, audit reject/clarify without creating tasks, apply owner edits, and replay reviews/Undo with versions. Native screen/owner usability and real account remain unverified. |
| T20 | [review-boundary.test.ts](../tests/integration/review-boundary.test.ts): `two sources retain disagreeing deadline claims until the owner explicitly chooses one, with versioned reminder recomputation`; [ledger.test.ts](../tests/integration/ledger.test.ts): `deadline-change approval requires explicit current target and preserves history`; [test_injection.py](../collectors/local/tests/test_injection.py): `test_conflicting_deadlines_stay_two_review_proposals` | Synthetic formal-calendar and WhatsApp-export sources carry different deadlines for an organizational duty. Neither sync changes the task. Missing target/stale target version fails; owner chooses one, old intents cancel and new revision schedules; rejected/stale competing claim remains preserved. This does not verify real LMS authority or AI detection of a conflict in arbitrary language. |
| T30 | [test_restore_contract.py](../collectors/local/tests/test_restore_contract.py): `test_all_eleven_tables_restore_counts_hashes_tombstones_without_dispatch_or_credentials`; [test_core.py](../collectors/local/tests/test_core.py): `BackupTests.test_encrypted_disposable_restore_parity_and_no_dispatch`; [export-contract.test.ts](../tests/integration/export-contract.test.ts): `CSV and JSON export exactly the same eleven tables with per-table parity and stable columns` | Every canonical table is nonempty in the new restore fixture. Independent normalized SHA-256/count comparison preserves tombstones, while credentials, push endpoints and delivery intents remain absent; no old dispatch is restored. CSV matches JSON row counts but is a spreadsheet presentation, not a lossless restore format. Disposable SQLite/Miniflare are local models; production D1 restore is unverified. |
| T33 | [measure_resources.ts](../scripts/measure_resources.ts), [RESOURCE-BUDGETS](RESOURCE-BUDGETS.md); [release-gaps.test.ts](../tests/integration/release-gaps.test.ts): `persistent accounting enforces atomic minute limits across new handlers and a fixed refusal without mutation`, `a year ledger searches beyond the first 100, escapes wildcard queries and pages calendar without collapsing precisions` | Reproducible production byte/gzip sizes, local query plans/wall-time profiles, measured harness RSS and existing request-class limits; refusal is tested. Real Worker CPU, production D1 row usage, phone callbacks, mobile startup and parser RSS remain unmeasured. Proposed ceilings still need owner/account review; T33 is not complete. |

Consent is enforced by code before any provider request (`Pipeline.policy` and
`ai.extract`), not by the SYSTEM sentence. Schema enforces required nonempty
UUID evidence, declared fields and `needs_review: true`; subset/date semantics
are checked separately. Tools are neither advertised nor executed by the adapter.
A prompt cannot prove extraction truth. Projection review authorizes sending a
structured proposal; it is **not** canonical task approval. Worker owner auth,
review action and CAS are the separate final boundary.

Run exact commands from [development setup](18-DEVELOPMENT.md). New fault proofs:
`.venv/bin/python scripts/check_contract_mutations.py --output-dir <outside repo>`.
The script declares and prints its actual fault count and stores each baseline,
broken assertion and restored pass in private fixture copies. It must run without
another synthetic browser server on port4173. The inherited release mutation
runner remains required and independent; never combine the two counts into a
claim that device behavior was verified.

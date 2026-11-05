# 11 — TEST STRATEGY AND ACCEPTANCE MATRIX

## 1. Testing pyramid
- **Unit:** WhatsApp export parser, iCalendar parser, date precision, timezone, deterministic extraction checks, digest/fingerprint, reminder time derivation, redaction.
- **Contract:** JSON Schemas and Worker route auth, envelope idempotency, 9Router response validation and error codes.
- **Integration:** Worker + local D1 migration, candidates → approval → tasks, reminders → dispatch stub, purge semantics, backup/restore.
- **E2E:** browser task entry/review on desktop and Android 360px viewport, offline snapshot, auth negative tests, source health UI.
- **Manual/device:** Android 9 PWA install, background push/permissions, notification listener only if optional companion built; owner Moodle integration feasibility.

Use fake 9Router responses and synthetic chat fixtures in CI; do **not** make tests depend on external subscriptions or university access.

## 2. Deterministic cases

| Test ID | Scenario | Expected |
|---|---|---|
| T001 | Manual task without due date | `unknown` due; appears in No Date, no scheduled reminder by default |
| T002 | Date-only assignment | Display exactly date with `date_only`; no fabricated midnight deadline |
| T003 | `besok` sent Nov 5 19:00 Asia/Makassar | Nov 6 local date; review if context ambiguous |
| T004 | Exact deadline Nov 10 23:59 Asia/Makassar | UTC conversion correct (Nov 10 15:59Z) |
| T005 | Export reimport exact | No duplicate source items or candidates |
| T006 | Overlapping exports | Known duplicates linked; ambiguous duplicates flagged |
| T007 | Multiline WhatsApp message | One message with linebreaks, no false splitting |
| T008 | Date string in code block/chat body | No false message header where grammar doesn't match |
| T009 | Deleted/media placeholder | Missing content labeled; not invented |
| T010 | Non-allowlisted group | Denied before AI/cloud upload |
| T011 | Advanced Chat Privacy blocks export | Manual entry fallback, no bypass attempt |
| T012 | Notification preview misses messages | UI `partial`, not `fully synced` |
| T013 | Model returns invalid JSON | Rejected/corrective retry bounded; no canonical write |
| T014 | Model cites nonexistent message ID | Rejected/marked unsupported evidence |
| T015 | Prompt-injection message | No tool execution/secret access/auto-delete |
| T016 | LMS and group due-date conflict | Both assertions visible; owner review required |
| T017 | User confirmed field vs new AI guess | Manual lock preserved; conflict surfaced |
| T018 | Collector request replay | Rejected via nonce/idempotency; no duplicate rows |
| T019 | Auth bypass attempt | Private GET/POST fails closed |
| T020 | Arch laptop & 9Router OFF | Cloud task reads and scheduler processing still work |
| T021 | Push permission denied | In-app reminder available; no claim delivered |
| T022 | Cloud unavailable | Cached read-only snapshot and stale banner |
| T023 | D1 quota exhausted | Explicit error; no retry storm or fake success |
| T024 | Concurrent task update | One succeeds, one 409; no lost owner edit |
| T025 | Purge one group source | Linked evidence removed; independent tasks preserved |
| T026 | Encrypted backup restore | Counts, hashes and recurrence policy match baseline |
| T027 | Mobile 360px width | No horizontal overflow; touch/keyboard controls usable |
| T028 | Long German/Indonesian/Arabic title | Text wraps gracefully; source quotes remain escaped |

## 3. Property-based tests
- Parser never emits timestamp from impossible date without an error flag.
- Dedup fingerprint unchanged by harmless line-ending variations but preserves distinct occurrences.
- Reminder intent scheduled once for a given `(task_id, rule_id, due_revision)`.
- All valid accepted candidate evidence belongs to owner-selected source set.
- Any system state with `due_precision=unknown` has `due_at_utc=null`.
- Every state-changing user action creates a task event (except idempotent retried request).

## 4. Performance tests
- Synthetic export up to 20k messages parsed in batches on 8 GB laptop without memory blowup; record peak RSS and wall time on actual CPU if possible.
- Avoid running Chromium/Playwright and local model concurrently on old VAIO; browser collection may be an opt-in separate command.
- PWA bundle budget decided at M0 after baseline measurement; report payload/JS size and cold-load time on throttled simulated mid-range phone.
- D1 index plans for time-based task/reminder reads: ensure bounded daily row scans under free-tier quota at expected personal scale.

## 5. Privacy and security test procedure
- Static asset inspection: no secrets, private chat text or real personal task snapshots in build output.
- Mock logs and crash reports never contain raw `Authorization`, session cookies, iCal token URLs or exported messages.
- Unauthenticated API requests via `curl` fail, including preview/staging domain.
- Collector key can only write allowed sync envelope; cannot list tasks.
- DOM/text renderer safely escapes HTML/JS from chat and LMS.
- Browser cache clears after logout and is scoped to owner; app displays privacy warning on shared device.

## 6. Real device and integration verification
**Android 9:** actual PWA installation and full-screen vs browser behavior, data-saver mode, permission prompts, notification delivery while locked and after reboot, aggressive battery mode, offline cache. Record result per browser/OS build; if unreliable, provide in-app alerts and honest delivery state.

**Moodle:** owner-provided, permissioned calendar or page capture. Test one actual assignment but keep actual personal content out of repo; redact all screenshots/logs.

**WhatsApp:** one owner-selected export, with redacted transcript local only. Test reimport and group detection; do not put private fixtures into CI or share with agent.

## 7. Release gates and evidence
Create a `STATUS.md` entry containing date, commit, tests run, environment, pass/fail, unresolved problems, manual evidence path (non-sensitive). Never mark `verified` based only on generated code or a unit test stub.

Exit checks for v0.1 are those in `00-MASTER-PRD.md` section 9 and `09-IMPLEMENTATION.md` release checklist.

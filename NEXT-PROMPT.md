# ChatGPT Web — build prompt, round 6

**How to use**

1. This file is on `main`. The agent fetches the repo itself.
2. Paste **Part 2** into ChatGPT Web (the whole fenced block).
3. The agent returns one zip; it is verified locally against the sha in `APPLY.md`.
4. **Phone and account testing stay deferred** — the cloud agent has neither and
   must not claim them.

---

## Part 1 — State of the system (for the owner, 2026-11-10)

**Base:** `main` at the commit that introduced this file.

Round 5 added streaming CSV export with epoch verification (migration 0009),
fixed browser test seed fixtures, 340-rule structural accessibility checks, and
legacy manual-only job execution (`ad7afc9`), independently verified locally in
VERIFICATION-LOG §27 and §28.

| Check | Result |
|---|---|
| `npm run check` | 10 files / 62 Vitest, typecheck, lint, web+worker build |
| Python discovery | 102 passed |
| `playwright test` | 21 passed across 3 consecutive runs |
| `npm run test:pwa` | 1 passed |
| Gradle `assembleDebug lint testDebugUnitTest` | BUILD SUCCESSFUL 4m4s; 8 native-policy, 6 queue-privacy |
| all mutation suites | 14 contract + 16 release + 18 round-4 + 12 round-5 = 60 faults, zero survivors |
| planning / placeholders / gate claims | PASS — 166 links, 2 gate claims |
| Hardware install on CPH2015 (API 28) | APK `e482a5aa` installed in place; 0 new crashes (count stayed 1); clean window |

**Phone status:** In-place install verified on hardware; listener connected; queue 0;
positive capture remains open waiting for an incoming self-chat WhatsApp message.

---

## Part 2 — Paste into ChatGPT Web

```text
You are the implementation agent for a private, single-owner academic and
organizational memory system. One user. No teams, no registration, no public
data endpoints. You work in a fresh clone, run the checks yourself, and return
one zip.

REPOSITORY
  https://github.com/fujimaruC/scaling-parakeet
  Branch: main
  Base: whatever HEAD your fresh clone has. Record `git rev-parse HEAD` and put
        that exact sha in APPLY.md. Do not check out an older commit.
  Sanity: NEXT-PROMPT.md must exist in the tree.

You are the BUILDER. A separate verifier runs your output on the owner's real
Android 9 phone and against the real Cloudflare account. You have neither.
Never claim a device, account, network, push, provider or deployment result.

READ FIRST, in this order
  AGENTS.md, docs/STATUS.md, docs/VERIFICATION-LOG.md (§17-28 are newest),
  docs/RESOURCE-BUDGETS.md and docs/RESOURCE-MEASUREMENTS.json,
  docs/17-WORK-PACKAGES.md (W30, W42, W50), docs/11-TEST-STRATEGY.md,
  docs/10-API-CONTRACTS.md, docs/07-SECURITY-PRIVACY.md, docs/03-ITK-COLLECTOR.md

WHAT EXISTS — do not rewrite it
React/TS PWA, TS Worker with 9 D1 migrations, Python collector with encrypted
local evidence, streaming CSV export with migration 0009 epoch tracking,
disposable restore, 340-rule structural accessibility suite, legacy job one-shot
support, and a Kotlin companion with eight screens. 62 Vitest, 102 Python, 21
Playwright, 1 production-PWA and 14 JVM cases pass, plus 60 mutation faults across
four suites. This is not a scaffold.

HOW TO THINK
Find the best solution, not literal compliance. For each problem say what it
protects, consider more than one approach, choose one, and justify it in a line
or two. Prefer the smallest design that fully solves it. Correctness on the edge
case beats elegance on the happy path.

FOUR SLICES, in this order. Stop and report when done.

1. DISPOSABLE D1 CANONICAL RESTORE VERIFICATION (W42 / F23 / Gate 8)

   `docs/STATUS.md` Gate 8 states:
   "Restore encrypted canonical data into disposable D1, verify future reminders,
   restored tombstones and revoked source reconciliation before sync. Current
   automated restore uses disposable SQLite."

   Currently `collectors/local/src/academic_os/backup.py` only implements restore
   into SQLite.
   - Build a TypeScript/Node tool or integration test (`tests/integration/d1-restore.test.ts`)
     that tests restoring an encrypted canonical backup into a disposable Miniflare D1
     database with all migrations (0001–0009).
   - Verify:
     - All 11 allowlisted tables from `packages/contracts/canonical-tables.json` are
       restored with row-count and digest parity against the export.
     - Foreign key integrity passes on D1.
     - Disallowed tables (credentials, push_subscriptions, nonces, etc.) are NOT restored.
     - Future reminders are re-enqueued for active tasks into `reminder_rebuilds`.
     - Restored source tombstones are preserved.
     - Delivery intents are NOT restored (no old reminder storm).
   - Test fail-closed on corrupt key, tampered archive, or mismatched schema version.

2. ITK MOODLE LMS LOCAL UI INTEGRATION AND PREVIEW (W50 / F26)

   `collectors/local/src/academic_os/itk.py` contains core parser logic, but it has no
   UI affordance in `server.py` or `/operations`.
   - Add an ITK Moodle LMS preview and import flow in the local server/operations UI:
     - Owner can provide session cookies or profile directory to trigger local preview.
     - Returns structured preview (discovered courses, pending assignments, quizzes,
       deadlines, submission status) without making cloud requests.
     - Enrolls as source with kind `itk_lms`, tracks generations, and creates synthetic
       envelope for projection review.
     - Fail closed on session expiry, changed HTML markup, or ambiguous dates with
       clear localized messages.
   - Add unit/integration tests with synthetic HTML fixtures in `test_itk.py`.

3. SYNTHETIC 9ROUTER MOCK & END-TO-END JOB RETRY TEST (W30 / F12 / Gate 3)

   `docs/STATUS.md` Gate 3 requires verifying named 9Router route/provider behavior
   with synthetic input, positive consent and prompt-injection tests.
   - Build a synthetic local 9Router mock server (`tests/helpers/mock-9router.ts` or
     python helper) simulating:
     - Valid chat completions responses matching `ai-extraction.schema.json`.
     - Malformed/hallucinated JSON outputs that trigger extraction validation failures.
     - Rate limiting (429) that exercises the exponential backoff in `jobs.py`.
     - 5xx gateway errors that leave jobs in `unknown` without automatic replay.
     - Provider policy version mismatch that refuses extraction.
   - Write an integration test proving the full lifecycle:
     consent -> `run` -> `_extract_job` (with retry on 429) -> projection review ->
     `queue` -> `_send_job` -> sync commit.

4. SELECTIVE EXPORT AND MASSIVE LEDGER MEMORY GUARD (W42 / F23 follow-up)

   Following up on the 10,000-task 23.4 MB measurement in `docs/RESOURCE-BUDGETS.md`:
   - Support table-selective export: `/export?format=csv&table=tasks` or
     `/export?format=json&table=tasks` allowing export of specific tables.
   - Add an explicit configurable safety ceiling (e.g. max row limit per export returning
     clean 413 `EXPORT_TOO_LARGE` with a helpful error message rather than exceeding
     Worker memory limits on unbounded tables).
   - Keep CSV formula neutralization and RFC 4180 quoting intact.
   - Test table-selective export and limit refusal.

If you finish all four, stop and report. Do not start work that needs a device,
an account, a provider or a deployment.

HARD LIMITS — not negotiable

  No raw chat text, quotations, exports, message bodies or raw-content hashes
  may leave Android/Linux for the cloud, logs, assets, crash reports or backups.
  Every AI-derived task needs explicit owner approval; nothing auto-accepts.
  One owner. No registration, no sharing, no public personal-data endpoint.
  Never claim a device, account, network, push or provider test passed.
  Do not push to GitHub, deploy, or provision any paid service.
  Do not add a dependency unless the standard library genuinely cannot do it;
  if you do, justify it in one line and update the lockfile.
  Do not weaken a privacy, approval or fail-closed rule to make a test pass.
  Do not widen the capture selector, automate a permission grant, or touch
  signing configuration.
  Do not convert an unverified field into a verified one by assertion.

THINGS THAT WILL BITE YOU
  Five defects here passed every automated check and only failed on the phone.
  Assume the same blindness.
  API 28 is the runtime floor; verifyApi28 compiles all Kotlin against android-28
  with -no-jdk. Dates have four precisions and must never collapse.
  The export allowlist and the local backup allowlist are one shared file,
  `packages/contracts/canonical-tables.json`. Change it once, not twice.
  `check_gate_claims.py` fails closed: it runs the named test and rejects a
  contradictory STATUS sentence. Keep that property if you touch it.
  `docs/RESOURCE-BUDGETS.md` ceilings are engineering thresholds, not billing.

ACCEPTANCE — run and paste real output
  npm ci
  npm run check
  npm run test:e2e
  npm run test:pwa
  .venv/bin/python scripts/validate_planning.py
  .venv/bin/python scripts/check_gate_claims.py
  .venv/bin/python -m unittest discover -s collectors/local/tests -v
  .venv/bin/python scripts/check_contract_mutations.py --output-dir <outside repo>
  .venv/bin/python scripts/check_release_mutations.py --output-dir <outside repo>
  .venv/bin/python scripts/check_round4_mutations.py --output-dir <outside repo>
  .venv/bin/python scripts/check_round5_mutations.py --output-dir <outside repo>
  node --import tsx scripts/measure_resources.ts <outside repo>/resources.json
  cd apps/android-companion && ./gradlew assembleDebug lint testDebugUnitTest --no-daemon

  Run heavy suites sequentially; browser fault cases need port 4173 free.
  Android needs JDK 17, build-tools 35.0.0, platforms 28 and 35.
  Lint is 0 errors. Do not make it worse.
  Prove tests bite: break the code, show the failure, restore, show the pass.

REPORTING
  Paste actual command output, not a summary. Write "unverified" where something
  is unverified. Say BLOCKED and name the missing observation. Explain design
  choices in a line or two. Report existing defects rather than working around
  them.

UPDATE
  docs/STATUS.md, docs/VERIFICATION-LOG.md (new numbered section),
  docs/RESOURCE-BUDGETS.md if ceilings change,
  docs/11-TEST-STRATEGY.md if gate claims change.
  Do not mark any milestone complete.

DELIVERABLE — one zip
  Academic-OS-System-<short sha>.zip containing source/ (full working tree),
  academic-os.patch (git am --3way against the base sha you recorded), APPLY.md
  (base sha, what changed, why, how to verify, what you could not verify).
  Keep source/ and the patch consistent; the verifier applies the patch to a
  fresh clone of that sha and diffs it against source/.
```

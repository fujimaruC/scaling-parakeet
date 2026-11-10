# ChatGPT Web — complete build prompt (all remaining implementation in one go)

**How to use**

1. This file is on `main`. The agent fetches the repo itself.
2. Paste **Part 2** into ChatGPT Web (the whole fenced block).
3. The agent implements all remaining local/synthetic build scope in one go, runs checks, and returns one zip.
4. That zip comes back here and is verified locally. **Phone and account testing stay deferred** — the cloud agent has neither and must not claim them.

---

## Part 1 — State of the system (for the owner, 2026-11-10)

**Base:** `main` at the commit that introduced this file.

Previous deliveries established:
- React/TS PWA with 8 surfaces, theme persistence, offline snapshot, and 340 structural a11y checks.
- TS Worker with 9 D1 migrations, streaming CSV export, Web Push adapter, durable request accounting, and paged global history.
- Python collector with encrypted local evidence, multi-source operations, bounded job retries, and gate-claims guard.
- Kotlin companion with 8 surfaces, verified on hardware (CPH2015 / API 28) with 0 crashes, listener connected, pairing sealed.
- Passing local test suite: 62 Vitest, 102 Python, 21 Playwright, 1 production PWA, 14 JVM policy cases, 60 mutation faults across 4 suites with 0 survivors.

---

## Part 2 — Paste into ChatGPT Web

```text
You are the implementation agent for a private, single-owner academic and
organizational memory system. One user. No teams, no registration, no public
data endpoints. You work in a fresh clone, run the checks yourself, and return
one complete zip.

REPOSITORY
  https://github.com/fujimaruC/scaling-parakeet
  Branch: main
  Base: whatever HEAD your fresh clone has. Record `git rev-parse HEAD` and put
        that exact sha in APPLY.md. Do not check out an older commit.
  Sanity: NEXT-PROMPT.md must exist in the tree.

DO NOT STOP HALF-WAY OR BUILD IN PIECES.
Build and complete ALL remaining local/synthetic implementation scope across the
entire codebase in this single run. Do not leave placeholder functions, stubs, or
"left for next round" comments.

You are the BUILDER. A separate verifier runs your output on the owner's real
Android 9 phone and against the real Cloudflare account. You have neither.
Never claim a device, account, network, push, provider or deployment result.

READ FIRST, in this order
  AGENTS.md, docs/STATUS.md, docs/VERIFICATION-LOG.md (§17-28 are newest),
  docs/17-WORK-PACKAGES.md (W30, W42, W50), docs/11-TEST-STRATEGY.md,
  docs/10-API-CONTRACTS.md, docs/07-SECURITY-PRIVACY.md, docs/03-ITK-COLLECTOR.md,
  docs/RESOURCE-BUDGETS.md and docs/RESOURCE-MEASUREMENTS.json

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

COMPLETE ALL OF THE FOLLOWING IN THIS SINGLE RUN:

1. DISPOSABLE D1 CANONICAL RESTORE (W42 / F23 / Gate 8)
   `docs/STATUS.md` Gate 8 requires restoring encrypted canonical data into
   disposable D1.
   - Build a complete TypeScript/Node restore tool and integration test
     (`tests/integration/d1-restore.test.ts`) against disposable Miniflare D1
     with all migrations (0001–0009).
   - Decrypt the canonical export, insert all 11 allowlisted tables from
     `packages/contracts/canonical-tables.json`, and verify foreign key integrity.
   - Verify exact row-count and digest parity against the export.
   - Verify disallowed tables (credentials, push_subscriptions, nonces, etc.)
     and past delivery intents are NOT restored.
   - Enqueue future reminders for active tasks into `reminder_rebuilds`.
   - Preserve restored source tombstones.
   - Test fail-closed on corrupt key, tampered archive, or invalid schema version.

2. ITK MOODLE LMS FULL INTEGRATION & LOCAL UI (W50 / F26)
   Connect `collectors/local/src/academic_os/itk.py` into the local UI (`server.py`
   and `/operations`):
   - Provide local UI controls to supply Moodle session cookies or profile path.
   - Run course discovery and assignment/quiz extraction locally without cloud calls.
   - Display structured preview (courses, pending tasks, deadlines, status).
   - Enroll as source kind `itk_lms`, track generations, and project into the sync
     envelope for projection review.
   - Handle session expiry, changed HTML markup, and ambiguous dates cleanly with
     localized messages.
   - Add comprehensive unit and integration tests with synthetic fixtures in
     `collectors/local/tests/test_itk.py`.

3. SYNTHETIC 9ROUTER MOCK & FULL RETRY PIPELINE (W30 / F12 / Gate 3)
   Gate 3 requires verifying provider/route/policy behavior with synthetic inputs.
   - Build a synthetic local 9Router mock server (`scripts/mock_9router.py` or test
     harness) simulating:
     - Valid chat completions matching `ai-extraction.schema.json`.
     - Malformed JSON triggering validation failure.
     - Rate-limiting (429) that exercises exponential backoff in `jobs.py`.
     - Upstream 5xx errors that leave jobs in `unknown` without automatic replay.
     - Policy/version mismatch refusing extraction.
   - Write end-to-end integration tests proving the entire flow:
     consent -> `run` -> `_extract_job` (retry on 429) -> projection review ->
     `queue` -> `_send_job` -> sync commit.

4. SELECTIVE EXPORT & SAFETY BOUNDS (W42 / F23 follow-up)
   Follow up on the 10,000-task 23.4 MB measurement in `docs/RESOURCE-BUDGETS.md`:
   - Support table-selective export: `/export?format=csv&table=tasks` and
     `/export?format=json&table=tasks` for all allowlisted tables.
   - Add a configurable safety limit (e.g. max rows per export returning clean 413
     `EXPORT_TOO_LARGE` with helpful error instead of exceeding memory limits).
   - Ensure formula neutralization and RFC 4180 quoting remain strictly enforced.
   - Test table-selective export and limit refusal.

5. TRACEABILITY & VERIFICATION COMPLETION
   - Complete the traceability table in `docs/11-TEST-STRATEGY.md` for all
     remaining acceptance IDs (T01–T34).
   - Update `docs/STATUS.md` and `docs/VERIFICATION-LOG.md` with a new numbered section.
   - Update `scripts/check_gate_claims.py` to cover Gate 8 and Gate 3 claims.

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

ACCEPTANCE — run all of these and paste real output
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

DELIVERABLE — one zip
  Academic-OS-System-<short sha>.zip containing source/ (full working tree),
  academic-os.patch (git am --3way against the base sha you recorded), APPLY.md
  (base sha, what changed, why, how to verify, what you could not verify).
  Keep source/ and the patch consistent; the verifier applies the patch to a
  fresh clone of that sha and diffs it against source/.
```

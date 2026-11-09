# ChatGPT Web — build prompt, round 5

**How to use**

1. This file is on `main`. The agent fetches the repo itself.
2. Paste **Part 2** into ChatGPT Web (the whole fenced block).
3. The agent returns one zip; it is verified locally against the sha in `APPLY.md`.
4. **Phone and account testing stay deferred** — the cloud agent has neither and
   must not claim them.

---

## Part 1 — State of the system (for the owner, 2026-11-09)

**Base:** `main` at the commit that introduced this file.

Round 4 added the 10k-task measurement, bounded job retries, multi-source local
operations and a gate-claims guard (`9841fec`), plus independent verification
(`3b84d17`).

| Check | Result |
|---|---|
| `npm run check` | 9 files / 58 Vitest, typecheck, lint, web+worker build |
| Python discovery | 98 passed |
| `playwright test` | 16 passed (one needed 19.6 s of a 30 s budget when run alone) |
| `npm run test:pwa` | 1 passed |
| Gradle `assembleDebug lint testDebugUnitTest` | BUILD SUCCESSFUL 12m36s; 8 native-policy, 6 queue-privacy |
| contract / release / round-4 faults | 14/14, 16/16, 18/18, zero survivors |
| planning / placeholders / gate claims | PASS — 153 links, 2 gate claims |

### The four gaps this round should close

Each was confirmed by reading the tree, not by trusting the roadmap.

1. **The CSV export is assembled as one string.** `apps/worker/src/export.ts:70`
   ends with `lines.join('\r\n')`, so every row of all eleven tables exists in
   memory before the first byte is sent. `docs/RESOURCE-BUDGETS.md` measured a
   populated 10,000-task export at **23,438,847 bytes** — above its own 8 MiB
   review threshold — and says plainly that "streaming/chunking export deserves a
   separate design before using large real ledgers; this slice does not claim that
   risk solved."
2. **Two browser tests carry unmeasured time budgets.** `tests/e2e/s2.spec.ts:415`
   seeds 101 tasks through 101 sequential POSTs and `:523` applies 35 sequential
   PATCHes, both under Playwright's default 30 s with no explicit override. The
   first measured 19.6 s alone and failed at 31.0 s while other suites ran. This is
   the third time a harness margin has masqueraded as a defect.
3. **Accessibility is spot-checked, not audited.** `tests/e2e/s2.spec.ts` has a
   hand-rolled contrast helper and some keyboard assertions, but no automated
   structural check: nothing asserts that every interactive control has an
   accessible name, that inputs are labelled, or that focus order is sane. F22 is
   a P0 feature and `axe` is not a dependency.
4. **A legacy job state has no visible path.** `jobs.py:111` returns
   `{'state':'legacy_manual_only'}` for any job without a `processing_retry` row,
   and `_send_job` accepts `manual=True` for exactly that state — but nothing in
   the `/operations` page explains it or offers the manual retry.

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
  AGENTS.md, docs/STATUS.md, docs/VERIFICATION-LOG.md (§17-25 are newest),
  docs/RESOURCE-BUDGETS.md and docs/RESOURCE-MEASUREMENTS.json,
  apps/worker/src/export.ts, apps/worker/src/task-list.ts,
  collectors/local/src/academic_os/jobs.py and operations.py,
  tests/e2e/s2.spec.ts, docs/11-TEST-STRATEGY.md, docs/07-SECURITY-PRIVACY.md

WHAT EXISTS — do not rewrite it
React/TS PWA, TS Worker with 8 D1 migrations, Python collector with encrypted
local evidence, disposable restore, streaming-free CSV+JSON export, pinned TLS
receiver, and a Kotlin companion with eight screens. 58 Vitest, 98 Python, 16
Playwright, 1 production-PWA and 14 JVM cases pass, plus three fault suites
(14/16/18) and a gate-claims guard. This is not a scaffold.

HOW TO THINK
Find the best solution, not literal compliance. For each problem say what it
protects, consider more than one approach, choose one, and justify it in a line
or two. Prefer the smallest design that fully solves it. Correctness on the edge
case beats elegance on the happy path.

FOUR SLICES, in this order. Stop and report when done.

1. STREAM THE CANONICAL EXPORT — do not buffer a whole ledger.

   `canonicalCSV()` builds an array of lines and joins it into one string, so a
   large ledger is fully materialised in Worker memory. The measured 10k export
   is 23.4 MB against an 8 MiB review threshold, and the budget document already
   names streaming as the next design step.

   Requirements:
   - Stream the CSV response. Read rows in bounded pages per table rather than
     one `db.batch()` over all eleven tables. Use a `ReadableStream` and enqueue
     chunks; do not build one giant string anywhere.
   - The output must be byte-identical to the current implementation for the same
     snapshot — same header, same column order, same primary-key ordering, same
     CRLF, same `'` prefix for `= + - @ TAB CR`, same RFC 4180 quoting.
   - Never silently truncate. If you introduce a size ceiling, it must be an
     explicit, documented refusal with a fixed error code, not a partial file.
   - JSON export may stay as it is; say so and why rather than converting both.
   - Keep the route owner-only and inside the existing `export` budget class.

   Test: a fixture large enough to exceed one page produces output byte-identical
   to the buffered path (keep the old function as a test-only reference or compare
   against a recorded fixture), paging covers every table including empty ones,
   and an interrupted stream cannot leave a half-written success response.

2. GIVE THE BROWSER TESTS MEASURED BUDGETS.

   Two tests in `tests/e2e/s2.spec.ts` seed data through sequential HTTP calls
   under Playwright's 30 s default. One of them already failed at 31 s under load
   and passes at 19.6 s alone. This is the third harness-margin incident in this
   project.

   - Measure each test's duration on an idle machine. Record the numbers.
   - Set an explicit per-test timeout only where the measured margin is thin, and
     write the measurement into a comment next to the number. Do not blanket-raise
     every timeout.
   - Prefer reducing the work over raising the bound: if 101 sequential POSTs can
     become one seeded fixture or a batched route that already exists, do that and
     say so. A faster test is better than a longer timeout.
   - Add a small script or reporter that lists the slowest tests and their margin,
     so the next person can see the risk before it bites.

   Test: the suite passes three consecutive runs on an unloaded machine, and the
   reported margins are recorded in the verification log.

3. AUDIT ACCESSIBILITY STRUCTURALLY, WITHOUT A NEW DEPENDENCY.

   F22 is a P0 feature. Today there is a contrast helper and some keyboard
   assertions, but nothing checks structure. `axe` is not a dependency and this
   brief does not add one.

   Write a Playwright audit that, for the main screens in both themes and both
   languages, asserts:
   - every interactive element (button, link, input, select, textarea) has a
     non-empty accessible name;
   - every form control is associated with a label or an `aria-label`;
   - no positive `tabindex`;
   - a visible focus indicator exists on the focused control;
   - primary controls meet the 44x44 target.

   Report findings as a table of screen → rule → result, and fail on violations
   rather than logging them. If a screen genuinely cannot meet a rule, fix the
   screen or record an explicit, reasoned exception in the test — do not silently
   skip it.

   Test: introduce a deliberate violation (an icon-only button with no label) and
   show the audit failing, then restore it and show it passing.

4. GIVE THE LEGACY JOB STATE A VISIBLE PATH.

   `Attempts.view()` returns `legacy_manual_only` for any job without a retry row,
   and `_send_job` already accepts `manual=True` for that state — but the
   `/operations` page does not explain it or offer the action.

   - Show the state explicitly on the job row, with one sentence saying what it
     means: the job predates retry metadata, so it is manual-only.
   - Offer the existing manual send for exactly that state, subject to the same
     source-credential and consent checks as today.
   - Do not auto-migrate legacy jobs into the retry table and do not silently
     replay them.
   - Keep the row-specific identity and generation checks already in place.

   Test: a job with no retry row shows the state and can be sent manually once,
   a second attempt is refused with a fixed code, and a job belonging to another
   source cannot be acted on from this row.

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
  Three test failures were harness limits, not product defects: a 20 s timeout on
  a 1200-row fixture, 120 concurrent db.batch() calls tripping Miniflare's RPC
  assert, and a 101-POST seed exceeding Playwright's 30 s default under load.
  Bound by measurement; never tighten below the observed cost.
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
  node --import tsx scripts/measure_resources.ts <outside repo>/resources.json
  cd apps/android-companion && ./gradlew assembleDebug lint testDebugUnitTest --no-daemon

  Run heavy suites sequentially; the browser fault case needs port 4173 free.
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
  docs/RESOURCE-BUDGETS.md and RESOURCE-MEASUREMENTS.json (new export profile),
  docs/11-TEST-STRATEGY.md if a gate mapping changed.
  Do not mark any milestone complete.

DELIVERABLE — one zip
  Academic-OS-System-<short sha>.zip containing source/ (full working tree),
  academic-os.patch (git am --3way against the base sha you recorded), APPLY.md
  (base sha, what changed, why, how to verify, what you could not verify).
  Keep source/ and the patch consistent; the verifier applies the patch to a
  fresh clone of that sha and diffs it against source/.
```

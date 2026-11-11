# ChatGPT Web — build prompt, round 8

**How to use**

1. This file is on `main`. The agent fetches the repo itself.
2. Paste **Part 2** into ChatGPT Web (the whole fenced block).
3. The agent returns one zip; it is verified locally against the sha in `APPLY.md`.
4. **Phone, account, provider and deployment testing stay deferred** — the cloud
   agent has none of them and must not claim them.

---

## Part 1 — State of the system (for the owner, 2026-11-11)

**Base:** `main` at the commit that introduced this file.

Round 7 built the guard/promotion path and a single bounded fault inventory.
Independent verification on the owner's machine then **ran all twelve suites**
and found two real defects in what round 7 delivered:

- **`check_s2_mutations.py` case `exact-time-format` was a dead proof.** It
  mutates `dueLabel`'s `hourCycle: 'h23'` but selects the test
  "grouping uses owner calendar boundaries…", which calls `when()`, not
  `dueLabel()`. The test passed with the mutation in place, so the case was
  reported as a survivor. `dueLabel` is called by exactly one test —
  "calendar grouping keeps four precisions…". Selector corrected; the suite now
  kills it. **A fault runner that selects a test which never reaches the mutated
  code is worse than no runner: it reports a survivor or a false pass forever.**
- **`scripts/mutation_harness.py` rejected genuine Vitest failures.** It accepted
  only `AssertionError`, but Vitest reports `expect(p).rejects` failures as
  `Error: promise resolved "..." instead of rejecting`. `check_ack_mutations.py`
  case `stale-generation` was misclassified as a survivor; after the fix the
  suite is 6/6.

### Measured on the owner's machine (sequential, synthetic data, no account)

| Suite | Declared | Result | Wall clock |
|---|---:|---|---:|
| contract | 14 | 14 killed, 0 survivors | 292 s |
| release | 16 | 16 killed, 0 survivors | 493 s |
| round4 | 18 | 18 killed, 0 survivors | 46 s |
| round5 | 12 | 12 killed (one CPU-contention rerun) | 6/6 cases + rerun |
| ack | 6 | 6 killed, 0 survivors | 73 s |
| s2 | 22 | 22 killed and restored, 0 survivors | 834 s |
| evidence | 10 | 10 killed, 0 survivors | 17 s |
| foundation | 4 | 4 killed, 0 survivors | 149 s |
| owner-safety | 7 | 7 killed, 0 survivors | 12 s |
| round6 | 15 | 15 killed, 0 survivors | 615 s |
| android | 6 | 6 killed, 0 survivors (split across four runs) | ~2200 s total |
| native | 10 | 10 killed, 0 survivors (6, then 1 + 3 separately) | ~1800 s total |

Supporting suites: `npm run check` **12 files / 70 Vitest**, Python discovery
**121 passed**, Playwright **21 passed**, PWA **1 passed**, Gradle
`assembleDebug lint testDebugUnitTest` **BUILD SUCCESSFUL 3m34s**, planning
validator **171 links / 30 features / 34 test IDs**, `check_gate_claims.py`
**PASS — 5 claims, fails closed on drift**.

`check_android_mutations.py` needs a per-case Gradle budget above 300 s: a
single baseline build took 42 s idle but 2m09s under load, and the harness's
300 s per-command ceiling then aborted the case as `COMMAND_TIMEOUT`. That is a
ceiling defect, not a product defect. Round 8 should fix it and say by how much.

### The six gaps this round should close

Each was confirmed by reading the tree and running it, not by trusting docs.

1. **F27 has no deliverable.** `docs/13-FEATURE-CATALOG.md` says F27 is
   "written go/no-go options only; no enrollment", and
   `docs/04-WHATSAPP-INGESTION.md` authorizes a Baileys research spike — but no
   such document exists. `docs/12-SOURCES.md` has three paragraphs. There is no
   comparison, no decision, no ADR. The feature is unimplemented.
2. **Gate 9 has no ADR and no runbook.** `docs/STATUS.md` gate 9 requires
   "finish cost/transport ADR and perform the seven-day owner pilot". There is no
   cost/transport ADR (`docs/DECISIONS.md` stops at ADR-030) and no pilot runbook
   anywhere in `docs/`. The owner cannot start the pilot because nothing says
   what to do on day one.
3. **Six owner-gate documents are unlinked from `README.md`.**
   `docs/OWNER-DEVICE-SESSION.md`, `docs/NATIVE-CLOUD-CHECK.md`,
   `docs/SIGNING-SAFETY.md`, `docs/DEVICE-SMOKE.md`, `docs/NATIVE-OWNER-RUN.md`
   and `docs/next-scope/OWNER-VERIFY.md` are the documents the owner must
   actually follow, and the documentation map does not mention any of them. Zero
   inbound links from the README.
4. **Eleven of seventeen Python test modules have no fault proof.**
   `scripts/check_*_mutations.py` anchors only `test_control`, `test_device_evidence`,
   `test_itk`, `test_legacy_jobs`, `test_owner_safety` and `test_router_pipeline`.
   Unanchored: `test_core`, `test_injection`, `test_pairing`, `test_transport`,
   `test_retry`, `test_pipeline`, `test_operations`, `test_server`,
   `test_restore_contract`, `test_fault_harness`, `test_gate_scopes`.
5. **No runner checks that its selector reaches the mutated code.** This is the
   defect that produced the dead `exact-time-format` case. The harness verifies a
   named assertion ran and failed, but never verifies the selected test even
   imports the file it mutated.
6. **Every suite ceiling is unmeasured policy.** `run_fault_suites.py --list`
   prints `measured_seconds: None` for all twelve, and
   `docs/next-scope/OWNER-VERIFY.md` says "NOT RUN / unmeasured" for every row.
   Round 7 wrote the ceilings; nobody has compared them to reality.

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

THIS ROUND YOU MUST RUN TESTS. Round 7 was source-only by owner instruction;
that instruction is lifted for this round. Every claim you make about a suite
must come from output you actually captured, pasted verbatim. If something
cannot run in your environment, say BLOCKED and name the missing thing. Do not
estimate a duration, a count or a pass.

READ FIRST, in this order
  AGENTS.md, docs/STATUS.md (the gate list), docs/VERIFICATION-LOG.md (§17-32),
  docs/11-TEST-STRATEGY.md (gate-claims table and T01-T34 mapping),
  docs/13-FEATURE-CATALOG.md (F27), docs/04-WHATSAPP-INGESTION.md,
  docs/12-SOURCES.md (linked-device section), docs/16-OWNER-DECISIONS.md,
  docs/DECISIONS.md (ADR-030 is the last one), scripts/check_gate_claims.py,
  scripts/mutation_harness.py, scripts/run_fault_suites.py,
  scripts/fault_registry.py, scripts/check_s2_mutations.py,
  .github/workflows/check.yml, docs/next-scope/OWNER-VERIFY.md

WHAT EXISTS — do not rewrite it
React/TS PWA, TS Worker with 9 D1 migrations, Python collector with encrypted
local evidence, streaming CSV export with epoch verification, disposable D1
restore, local ITK preview, synthetic router harness, and a Kotlin companion with
eight screens. 70 Vitest, 121 Python, 21 Playwright, 1 production-PWA and 14 JVM
cases pass; 140 faults are declared across twelve runners. This is not a scaffold.

HOW TO THINK
Find the best solution, not literal compliance. For each problem say what it
protects, consider more than one approach, choose one, and justify it in a line
or two. Prefer the smallest design that fully solves it. Correctness on the edge
case beats elegance on the happy path.

SIX SLICES, in this order. Stop and report when done.

1. WRITE THE F27 GO/NO-GO.

   F27 is a required M0 document and does not exist. Produce
   `docs/next-scope/F27-LINKED-DEVICE-GO-NO-GO.md` and a matching ADR-031.

   Compare exactly two options against this system's constraints, not against
   generic WhatsApp automation marketing:

   - **A. Notification listener + Linux export import** (the approved baseline).
   - **B. Unofficial linked-device library (Baileys)** — research only.

   For each: what metadata it can and cannot see, whether it can ever produce
   message bodies that the listener cannot, local storage requirements, session
   and credential exposure, reconnect/version-drift behaviour, account risk,
   maintenance burden, and whether it fits a single-owner privacy model where raw
   text may never leave the owner's Linux host.

   Then state a recommendation with a one-line reason, and list the conditions
   that would reverse it. Say plainly that **no enrollment, runtime adapter or
   third ingestion path is authorized** and that the MVP gate remains
   listener + export. Cite `docs/12-SOURCES.md`; do not invent a benchmark,
   a reliability number or a compliance claim. If a fact is unknown, write
   "unknown".

   Also update the F27 row in `docs/13-FEATURE-CATALOG.md` to point at the new
   document, and add the ADR to `docs/DECISIONS.md`.

2. WRITE THE GATE-9 COST/TRANSPORT ADR AND THE SEVEN-DAY PILOT RUNBOOK.

   Two documents, both missing.

   `docs/DECISIONS.md` ADR-032 — cost and transport:
   - The transport decision is already made in ADR: private overlay, no public
     tunnel terminating raw content, no always-on raw-processing VPS. Record the
     *cost* half: what the owner must pay for (Cloudflare plan tier, D1 rows
     written/read, Worker requests and CPU, private-network option) and what
     stays free. Use the $0 preference from AGENTS.md and name any figure you
     cannot verify as unknown rather than guessing a price.
   - Give a decision, not a menu. If the honest answer is "stay on the free tier
     until the pilot measures X", say that and name X.

   `docs/next-scope/PILOT-RUNBOOK.md` — seven days, owner-executable:
   - One section per day: what to do, what to record, what would count as a
     failure that stops the pilot.
   - Cover both ingestion paths (listener on the phone, manual export on Linux),
     both contexts (academic and organizational), reminder delivery with the
     laptop off, the phone queue across an interrupted ack, and a source deletion
     that must not resurrect.
   - Include an evidence table the owner fills in: date, path exercised, expected,
     observed, verdict, and where the log lives.
   - State the abort criteria explicitly, and state that a completed runbook
     entry is the only thing that closes gate 9 — not a passing test.

3. LINK THE SIX OWNER-GATE DOCUMENTS FROM THE README.

   Add them to the documentation map in `README.md` with one-line contracts, in a
   separate group so they are not confused with the numbered specification
   series. `scripts/validate_planning.py` already fails on broken relative links,
   so this is guarded — run it and paste the new link count.

   Do not create new documents in this slice. If one of the six is stale enough
   to mislead, fix it in place and say what was wrong.

4. RUN THE FULL ACCEPTANCE SEQUENCE AND REPLACE THE UNMEASURED CEILINGS.

   Run, sequentially, on an idle machine, and paste real output:

     npm ci
     npm run check
     npm run test:e2e
     npm run test:pwa
     .venv/bin/python scripts/validate_planning.py
     .venv/bin/python scripts/check_gate_claims.py
     .venv/bin/python -m unittest discover -s collectors/local/tests -v
     .venv/bin/python scripts/run_fault_suites.py --output-dir <outside>

   Then update `scripts/fault_registry.py`, the table in
   `docs/next-scope/OWNER-VERIFY.md`, and the decision table in
   `docs/next-scope/FAULT-TRIAGE.md` so every row carries a measured duration and
   a real verdict instead of `NOT RUN / unmeasured`. Note that
   `run_fault_suites.py --list` prints a hardcoded `'measured_seconds': None`;
   either fill it from the registry or drop the field. Do not leave a field that
   can only ever say "unknown". Where a measured duration
   exceeds the declared ceiling, raise the ceiling and say by how much and why —
   do not silently truncate a suite to fit.

   Known ceiling defect to fix first: `check_android_mutations.py` runs Gradle at
   300 s per command. Measured on the owner's machine: the `testQueuePrivacy`
   baseline alone took **209 s**, and an earlier run took 129 s — so the ceiling
   leaves 91 s of margin and the suite aborted with `COMMAND_TIMEOUT` on a loaded
   machine. Raise the per-command Gradle bound and the android suite budget, and
   record the measurement that justifies the new number. Do not raise it blindly:
   state the new bound and the worst observed build that fits inside it.

   `check_native_mutations.py` has the same defect one level up, and it has now
   been observed rather than predicted. Measured per case: 240, 253, 286, 237,
   158, 149 s for the six Gradle cases that completed. The suite ran 1500 s,
   killed six cases correctly, and then died on case 7's restored phase with
   `COMMAND_TIMEOUT` — because `run_suite` passes `min(command_limit, remaining)`
   to the child, so the last command inherits a truncated timeout and its failure
   is indistinguishable from a product failure. Fix both halves: raise the suite
   budget above the arithmetic, and make an exhausted budget raise
   `SUITE_TIMEOUT` instead of silently shortening a child's timeout. The three
   vitest cases at the end never ran at all.

5. CLOSE THE PYTHON FAULT GAP.

   Eleven Python test modules have no fault anchor. Add cases for the highest
   value invariants only — not one per test — in a new
   `scripts/check_round7_mutations.py` following the existing pattern, and
   register it in `scripts/fault_registry.py` and the OWNER-VERIFY table.

   Prioritise, in this order:
   - `test_injection` — the prompt-injection boundary. Break the assertion that
     model output is data and cannot become an instruction or an approved task.
   - `test_transport` — break the HMAC/replay check so a replayed nonce is
     accepted.
   - `test_pairing` — break expiry or revocation so a stale pairing still works.
   - `test_restore_contract` — break the excluded-table rule.
   - `test_retry` or `test_pipeline` — break the "unknown outcome is not success"
     rule.

   Every case: private fixture copy, baseline → broken → restored, assertion-only
   failure required, `finally` restore, hard refusal on missing anchors or
   survivors. Then run the new suite and paste the result.

6. MAKE A DEAD SELECTOR IMPOSSIBLE.

   This is the defect that made round 7's `exact-time-format` case worthless. The
   harness checks that a named assertion ran and failed — never that the selected
   test can reach the mutated file.

   Add a static reachability check to `scripts/mutation_harness.py`: for a
   `vitest` case, parse the target test file, follow its relative imports
   transitively, and refuse the case before running it if the mutated path is not
   reachable from the selected test file. Fail closed with a named error code.

   Follow `.json` imports too. `check_round6_mutations.py` case
   `restore-excluded-credential` mutates `packages/contracts/canonical-tables.json`,
   which is reachable only through `tests/integration/d1-restore.test.ts` ->
   `scripts/lib/d1-restore.ts` -> the JSON file. A guard that follows only `.ts`
   would reject a legitimate, passing case. Verify all twelve suites still pass
   after you add it; a guard that cannot express an existing case is the wrong
   guard.

   Then prove it: restore the old wrong selector for `exact-time-format` in a
   private fixture and show the new guard rejecting it, without running Vitest.

   Keep the fix small. A regex over import statements is acceptable if it fails
   closed on anything it cannot parse. Do not add a dependency.

HARD LIMITS — not negotiable
  No raw chat text, quotations, exports, message bodies or raw-content hashes
  may leave Android/Linux for the cloud, logs, assets, crash reports or backups.
  Every AI-derived task needs explicit owner approval; nothing auto-accepts.
  One owner. No registration, no sharing, no public-personal-data endpoint.
  Never claim a device, account, network, push or provider test passed.
  Do not push to GitHub, deploy, or provision any paid service.
  Do not enroll a WhatsApp linked device, install Baileys, or write an adapter
  for it. F27 is a document, not code.
  Do not add a dependency unless the standard library genuinely cannot do it;
  if you do, justify it in one line and update the lockfile.
  Do not weaken a privacy, approval or fail-closed rule to make a test pass.
  Do not widen the capture selector, automate a permission grant, or touch
  signing configuration.
  Do not convert an unverified field into a verified one by assertion. Promoting
  a gate requires the named test to actually run and pass.

THINGS THAT WILL BITE YOU
  D1's compound-SELECT limit is 5 terms. An 11-table UNION ALL returns
  D1_ERROR: too many terms and surfaces as a 503. Use scalar subqueries.
  Miniflare's D1 RPC layer asserts under ~120 concurrent db.batch() calls; bound
  the parallelism in any new test.
  Playwright's default test timeout is 30 s and port 4173 must be free; browser
  fault cases and `npm run test:e2e` cannot overlap.
  API 28 is the runtime floor; `verifyApi28` compiles all Kotlin against
  android-28 with `-no-jdk`.
  Dates have four precisions and must never collapse.
  The export allowlist and the local backup allowlist are one shared file,
  `packages/contracts/canonical-tables.json`. Change it once, not twice.
  A mutation whose selector never reaches the mutated file will pass forever.
  That is how round 7 shipped a dead proof.

ACCEPTANCE — run and paste real output
  The sequence in slice 4, plus:
  .venv/bin/python scripts/check_round7_mutations.py --output-dir <outside repo>
  .venv/bin/python scripts/run_fault_suites.py --output-dir <outside repo>
  cd apps/android-companion && ./gradlew assembleDebug lint testDebugUnitTest --no-daemon

  Prove tests bite: break the code, show the failure, restore, show the pass.
  Lint is 0 errors. Do not make it worse.

REPORTING
  Paste actual command output, not a summary. Write "unverified" where something
  is unverified. Say BLOCKED and name the missing observation. Explain design
  choices in a line or two. Report existing defects rather than working around
  them.

UPDATE
  docs/next-scope/F27-LINKED-DEVICE-GO-NO-GO.md (new),
  docs/next-scope/PILOT-RUNBOOK.md (new),
  docs/DECISIONS.md (ADR-031, ADR-032),
  docs/13-FEATURE-CATALOG.md (F27 row),
  README.md (documentation map),
  scripts/fault_registry.py, docs/next-scope/OWNER-VERIFY.md,
  docs/next-scope/FAULT-TRIAGE.md, scripts/run_fault_suites.py,
  scripts/mutation_harness.py, scripts/check_android_mutations.py,
  scripts/check_round7_mutations.py (new),
  docs/STATUS.md, docs/VERIFICATION-LOG.md (new numbered section).
  Do not mark any milestone complete. Gate 9 closes only on a completed pilot.

DELIVERABLE — one zip
  Academic-OS-System-<short sha>.zip containing source/ (full working tree),
  academic-os.patch (git am --3way against the base sha you recorded), APPLY.md
  (base sha, what changed, why, how to verify, what you could not verify).
  Keep source/ and the patch consistent; the verifier applies the patch to a
  fresh clone of that sha and diffs it against source/.
```

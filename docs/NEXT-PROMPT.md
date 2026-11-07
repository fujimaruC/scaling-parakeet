# Next prompt — S3–S7 verification and hardening

**How to use:** Part 1 is for the owner. Part 2 is the brief — paste it whole into the
implementation agent. Nothing below this line is required reading for the owner.

Base: the code is `1a9c8c7`. `main` on GitHub is newer only because this brief is a commit.
`git log --oneline -1` is correct at whatever it prints; check that `1a9c8c7` is in the last ten.

---

## Part 1 — Why this scope, for the owner

S3–S7 wrote 3,846 lines across 34 files and **zero tests**. Confirmed mechanically: `git diff --stat
11a08eb d748479 -- tests/` returns only `scripts/generate_pwa_icons.py`. The code compiles,
the old suites still pass, and that is the entire evidence base for it.

Our local verification run found six real defects in one pass — three accessibility name
collisions, a panel that collapsed on every page change, and two mutation cases that could
never fail. None of those were compile errors. All six had been sitting in "finished" code.

That is the argument for the next slice: the remaining 8 verification items in
`docs/S3-S7-HANDOFF.md` have never run, and they cover exactly the paths where a silent
wrong value is plausible — undo races, cross-tab logout, cache state after purge, pending
writes across reconnect. Those are the places a fake pass is worse than a known gap.

Android identity and large-ledger pagination stay listed and authorized. They are not
cancelled, only queued.

---

## Part 2 — Paste into the implementation agent

```text
You are the verification-and-hardening agent for a private, single-owner academic and
organizational memory system. One user. No teams, no registration, no public personal-data
endpoint. Your job this session is to make the newly written S3-S7 code actually proven or
honestly marked unproven. You are not here to add features because they seem reasonable.

REPOSITORY
  https://github.com/fujimaruC/scaling-parakeet
  Branch: main
  Code base commit: 1a9c8c781b3ac264ae9216cd8e86fae2f4c7af2b
  Verify before writing code:
    git log --oneline -10
    git log --oneline -1
  Your HEAD may be newer than the code base, because this brief is itself a commit.
  That is expected. What must be true:
    - 1a9c8c7 appears in git log --oneline -10, with the subject
      "test: verify S3-S7 on the real suites and fix what they found"
    - the four commits 1a9c8c7, d748479, 4d098ce, 11a08eb all appear, in that order
    - docs/NEXT-PROMPT.md exists at HEAD (this file)
  If any of those is false, STOP and say so. Do not work on a different tree.
  Produce your patch against 1a9c8c7, not against your HEAD, and say which you used.

READ BEFORE WRITING CODE, in this order:
  AGENTS.md
  docs/16-OWNER-DECISIONS.md       <- owner's decisions outrank code comments
  docs/DECISIONS.md                <- ADR-021/022/023 define what S3-S7 chose and why
  docs/S3-S7-HANDOFF.md            <- the 8 unrun verification items; your actual task list
  docs/STATUS.md                   <- what is claimed, what is disclaimed
  docs/VERIFICATION-LOG.md         <- section 11 is the run that produced this prompt
  docs/design/UI-DESIGN-AGENT.md   <- the S1-S7 slice contract
  docs/02-DATA-MODEL.md
  docs/10-API-CONTRACTS.md
  docs/07-SECURITY-PRIVACY.md
  docs/11-TEST-STRATEGY.md
  docs/18-DEVELOPMENT.md

WHAT IS TRUE RIGHT NOW

The application is not a scaffold. A React/TypeScript PWA, a TypeScript Worker with D1
migrations 0001-0006, a Python collector and a Kotlin Android companion all exist and run.

Machine-verified on commit 1a9c8c7, synthetic data only:
  npm run check                         exit 0  (prettier, tsc --noEmit, Vitest, Vite build,
                                                 Worker wrangler dry-run)
  npm test                              25 passed in 3 files
  npm run test:e2e                      12 passed in 3 files
  scripts/check_s2_mutations.py         PASS: 22 declared faults, every baseline passed,
                                        every broken version failed a real assertion, every
                                        restored version passed. 66/66 logs. 0 survivors.
  python unittest discover (collector)  34 tests OK
  scripts/validate_planning.py          PASS: 3 schemas, 5 fixtures, 21 rejection cases,
                                        84 links, 30 features, 34 test IDs
  npm run test:pwa                      NOT re-run on this commit
  Gradle assembleDebug/lint/unitTest    NOT re-run on this commit

Do not inherit those counts as yours. Reproduce them yourself and report what you observe.

WHAT HAPPENED IN THE TERMINAL SESSION THAT PRODUCED THIS BRIEF

You are the second agent on this work. The first one ran locally, on the owner's Linux
machine, against the tree that is now `1a9c8c7`. This is its context, so you do not repeat it
or assume it went further than it did.

  Environment actually used: Node 24.22.1, npm 11.9.0, Python 3.12.14, JDK 17 at
  ~/.local/opt/jdk-17.0.21+9, ANDROID_HOME=/home/riko/Android/Sdk with platforms 28 and 35
  and build-tools 35.0.0, Gradle 8.11.1, Playwright Chromium headless shell 1248.
  Linux, Chromium only. No Safari, no Firefox, no real Android browser.

  What it did, in order: applied the pending S3-S7 patch, ran the suites, found six defects,
  fixed them, repaired two unsound mutation cases, re-ran everything, then fast-forwarded
  `main` from 6de38fd to 1a9c8c7 and pushed. That push is why you can see this code at all;
  before it, every line of S3-S7 existed only as an unpushed local branch.

  Git history you should expect:
    6de38fd  origin/main before this work
    11a08eb  S2 ledger
    4d098ce  S3-S7 implementation
    d748479  S3-S7 handoff
    1a9c8c7  the verification run and its six fixes
    (newer)  this brief and a line-count correction
  `main` is now the verified tree. There is no separate branch to find.

  Its honest mistakes, because they are the same traps waiting for you:
    - It first reported "10,599 lines with zero tests". The zero-test claim was right; the
      line count was wrong. 10,599 was the whole 6de38fd..d748479 delta including S2.
      S3-S7 alone is 3,846 insertions across 34 files. It corrected every document.
      Lesson: check which commit range a number came from before quoting it.
    - `npm run lint` returned exit 2 with "JSON parse failed". That was the shell's
      output-condensing wrapper failing to parse ESLint output, not the linter. The same
      command through the wrapper's proxy returned exit 0. Lesson: a tool that transforms
      output can manufacture a failure. Confirm the failure is real before chasing it.
    - It wrote a brief that told you to expect exactly five commits with 1a9c8c7 newest.
      Committing the brief changed HEAD, so that check would have failed on a correct tree.
      It is fixed above. Lesson: a verification instruction must not assume it is the last
      commit.

  What it did NOT do: no device test, no real account, no provider, no deployment, no
  notification access. `adb devices` returned zero devices on every check and the Academic OS
  package never appeared in `enabled_notification_listeners`. Every real-phone observation in
  this repository predates S3-S7 and belongs to an earlier session's build.

  Its full record is docs/VERIFICATION-LOG.md section 11. Read it; do not overwrite it.

THE CENTRAL FACT YOU MUST NOT FORGET

S3-S7 shipped 3,846 lines across 34 files with ZERO tests. Verified:
  git diff --stat 11a08eb d748479 -- tests/
returns only scripts/generate_pwa_icons.py.

Every test in this repository predates S3-S7. They assert S2-era read-only behaviour. The
fact that they still pass means S2 did not regress. It says nothing about completion, undo,
quick-add, the review stack, calendar paging, the offline snapshot, or the service worker.

Six defects were found the moment those old suites were finally pointed at the new UI:
  1. Preferences save button was named "Save", colliding with the context form on the same
     screen. Ambiguous for both a user and an assistive-technology user.
  2. The date precision select had no accessible name at all.
  3. The QuickSheet task-type button group borrowed the context label, so the group and the
     context select were both announced as "Context".
  4. Fixing 3 left the context select inheriting the collision.
  5. The Tools disclosure lived inside <main key={page}>, so every page change remounted it
     and silently collapsed the panel mid-session.
  6. Once moved outside <main>, it lost the horizontal padding.

None of those were compile errors. All six had passed typecheck, lint, bundling, and every
existing test. Assume more of this class exists. That is why you are here.

HOW TO THINK

Your job is to find what is actually true, not to produce a green report. For each problem:
work out what the guarantee really protects, consider more than one way to test it, choose
one, and say in a line or two why you chose it. If you find a better approach than anything
implied here, take it and say so.

Simplicity is a design goal, not a prohibition. Prefer the smallest design that fully proves
the property. Do not cripple a test to keep it short, and do not build a harness for a need
that does not exist.

Correctness on the edge case beats elegance on the happy path. This system handles privacy
boundaries, a phone that loses power mid-write, and a laptop switched off for days.

A passing suite proves nothing about behaviour. Three defects in this project were found only
by real device testing after every automated check had passed. A fourth was inside the
evidence tool itself: it reported reopen_ok=false for a working app. A fifth made
fatal_exception_observed permanently null because the logcat flag hid the tool's own START
marker. A plausible-but-wrong value is worse than an absent one.

WHAT TO ACHIEVE THIS SESSION

Work docs/S3-S7-HANDOFF.md section "Targeted verification work", items 1 through 8. They are
reproduced here with the reasoning that makes each one worth doing.

1. MIGRATION 0006 AND AUTHORIZATION
   Apply migration 0006 on a disposable, already-migrated D1. Then exercise owner,
   collector and anonymous authorization, origin checks, CAS rollback, and idempotency
   collisions. Keep every existing generation, approval, raw-data and reminder guard
   intact. 0006 records structured inverse fields and evidence IDs for compensating undo;
   if it is wrong, every undo in the product is wrong.

2. WRITE PATHS AGAINST REAL WORKER DATA
   Completion, undo-completion, quick-add, all four date precisions, full edit, delete.
   For each: visible pending state versus canonical group and count, definite-failure
   rollback, committed response lost in transit, reload, same-body/version/key retry,
   repeated retry, a later edit arriving first, quota or storage failure, 401/403, logout,
   and logout in a second tab. Confirm no background write is ever sent on reconnect, and
   that a pending create blocks a replacement rather than racing it.
   The contract is: pending feedback may be immediate, final success and counts reconcile
   only after server acknowledgment, and offline writes stay disabled.

3. REVIEW INBOX AND COMPENSATING UNDO
   New, conflict, unknown, issues and non-task promotion. Explicit target search that must
   work past page one. Missing evidence. A genuine pointer threshold, vertical cancel, and
   pointercancel as separate events. Buttons and keys as alternatives. Held and modified
   modifier keys. Dialog focus trapping and return. No approval triggered by typing in an
   input. A date edit alone must never accept a proposal.
   Undo must append history rather than delete it, restore prior evidence and deadline, and
   create future-only reminders. New-task undo must leave a tombstone. Rejecting without a
   selected target must not invent a task association.

4. UNDO RACES AND SCRUBBING
   A newer task edit, candidate edit or settings-reminder edit; another review landing
   concurrently; purge of the current source or a source that previously supported the
   decision; evidence removed; repeated compensation; interrupted or committed-response-lost
   replay. Verify inverse and audit scrubbing, and purge after a new-task undo. Verify the
   backup allowlist excludes review_effects, and that restoring a backup cannot revive a
   historical undo capability.

5. LARGE LEDGER
   Seed at least 1500 structured synthetic tasks across a full year. Drive calendar month
   paging, late-arriving pages, source versus owner timezone boundaries, DST gaps and folds,
   a skipped midnight, all-day versus exact dates, no-date and approximate separation,
   browser Back and deep links, and context/title queries after the first global page of 100.
   Never infer an unloaded count as zero. Empty, loading, unavailable and partial must be
   four distinguishable states in the assertions, not one.

6. COMPILED-PWA OFFLINE
   Snapshot timestamp; an unvisited month or detail correctly unavailable rather than empty;
   Cache Storage excluding API, Access and personal navigation; login HTML not admitted as a
   shell asset; per-build cache updates; refresh on authenticated generation change; cache
   invalidation after purge and after mutations; auth loss; cross-tab logout. Verify a saved
   pending write is never sent automatically by the service worker or by reconnect.

7. LANGUAGE, THEME, ACCESSIBILITY AND FOCUS
   Indonesian and English, both themes, 360px, 200% text. Real button roles and accessible
   names, target sizes, focus rings, modal trap and return, Escape, backdrop and browser Back.
   Reduced motion honoured and haptics a no-op where unsupported. Capture synthetic visual
   baselines per card type, sheet and screen.
   Section 7 of the design contract is a contract, not polish. If you cannot verify something
   without a screen reader, write "unverified" rather than "passes".

8. MAKE THE NEW GUARANTEES BITE
   For each new guarantee you add, revert the fix locally and show the test failing, restore
   it and show it passing. Paste both outputs. Extend the existing fault runner rather than
   starting a second one, keep it running faults sequentially in an isolated tree, and keep
   the finally-restore. Do not reuse old fault counts, and never present a compile as runtime
   proof.
   Two cases in the existing runner were found to be unsound and were already repaired: one
   was an equivalent mutation that could never change behaviour, and one targeted a route
   that renders no toast. Check that each new case genuinely can fail. A case that cannot
   fail is worse than no case, because it reads as coverage.

CONSTRAINTS — HARD LIMITS, NOT ASPIRATIONS

  One owner. No registration, no sharing, no public personal-data endpoint.
  Raw notification text, chat exports, quotations, message bodies and raw-content hashes
  never leave Android/Linux. They do not go to the Worker, D1, public assets, cloud object
  storage, crash reports or cloud backups. Raw export files stay exclusively on Linux.
  Every AI-derived task requires explicit owner approval before any canonical mutation. A
  model's needs_review field cannot override this.
  Do not weaken any approval, privacy or dual-ingestion rule to make a test pass. If a test
  only passes because a guard was loosened, the test is wrong.
  No new dependency. If one appears unavoidable, stop and ask instead of adding it.
  Do not push to GitHub, deploy, or provision any paid service.
  Never claim a device, account, network or push test passed. You have no device and no
  account. adb reports zero devices and notification access is not granted; that is not a
  blocker for your work, it is a boundary on what you may claim.
  Never convert an unverified field into a verified one by assertion.

EXPLICITLY NOT THIS SESSION

  Android launcher icon, localized native strings, native theme, native accessibility work.
  Large-ledger server-side pagination beyond making the existing bounded paging honest.
  Any new product surface. Any dependency. Any real account, provider or deployment.
  These stay listed in STATUS as authorized and outstanding. Do not half-do them here.

ACCEPTANCE — run these, paste real output, do not summarize it

  npm ci
  npm run check
  npm run test:e2e
  npm run test:pwa
  .venv/bin/python scripts/validate_planning.py
  .venv/bin/python -m unittest discover -s collectors/local/tests -v
  .venv/bin/python scripts/check_s2_mutations.py --output-dir <outside the checkout>
  cd apps/android-companion && ./gradlew assembleDebug lint testDebugUnitTest

  Android needs JDK 17, build-tools 35.0.0, and platforms 28 and 35 (verifyApi28 requires
  android-28). Lint currently reports 0 errors and 4 warnings. Do not make it worse. If
  something is missing, install it and say exactly what you did.

  If you add or change a test that asserts a new guarantee, show it fail with the fix
  reverted and pass with the fix in place. Two outputs, not one claim.

REPORTING

  Paste actual command output, not your summary of it. Counts are whatever your run printed.
  Write "unverified" where something is unverified. If blocked, write BLOCKED and name the
  exact missing observation. If you chose one approach over another, say why in a line or
  two. If you find an existing defect, report it rather than quietly working around it.
  "Looks fine" is not evidence. A screenshot is not an accessibility audit.

UPDATE THESE FILES

  docs/VERIFICATION-LOG.md   add a new numbered section with what you ran and its real outcome
  docs/STATUS.md             make the gate language match what you actually observed
  docs/06-UI-UX.md           only if the screen contract changed
  docs/DECISIONS.md          add an ADR for any new decision this session forces

  Do not mark a milestone complete. Do not mark a release gate closed without the observation
  that closes it. Do not edit docs/VERIFICATION-LOG.md section 11; it is a historical record
  of a different run.

DELIVERABLE — one zip

  Academic-OS-System-<short sha>.zip containing:
    source/                  full working tree
    academic-os.patch        git am --3way compatible against 1a9c8c7
    APPLY.md                 base commit, what changed, why, what you could not verify

  Keep source/ and the patch consistent. We apply the patch and diff it against source/ as a
  cross-check. If APPLY.md claims a test or fault count, the shipped scripts must reproduce
  that exact number. Earlier packages claimed more than their scripts contained; that is the
  specific failure to avoid.

STOP AND REPORT WHEN DONE

Do not begin Android identity work. Do not begin pagination work. Finish the eight items,
report what is now proven and what is still not, and stop.
```
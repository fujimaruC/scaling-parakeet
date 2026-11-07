# Next prompt — make S3–S7 real

**How to use:** Part 1 is for the owner. Part 2 is the brief — paste it whole.

Code base: `1a9c8c7`. `main` may be newer; that is expected. Confirm `1a9c8c7` appears in `git log --oneline -15`.

---

## Part 1 — Why this scope

S3–S7 wrote 3,846 lines across 34 files with **zero tests of its own**. Verified mechanically: `git diff --name-only 11a08eb d748479 -- tests/` returns nothing at all.

So the code compiles, and every existing test predates it. Those tests assert S2-era read-only behaviour. Their passing proves S2 did not regress. It proves nothing about completion, undo, the review stack, calendar paging, the offline snapshot or the service worker.

That gap was measurable. The moment the old suites were finally pointed at the new UI they produced six real defects — three accessibility name collisions, a panel that collapsed on every page change, and two mutation cases that could never fail. None were compile errors. All six had passed typecheck, lint, bundling and every test that existed.

The eight areas below are where a wrong value stays invisible: undo races, cross-tab logout, cache state after purge, pending writes across reconnect. A fake pass there is worse than a known gap, because it retires the worry without removing the risk.

Android identity and large-ledger pagination stay authorized and queued. Not cancelled.

---

## Part 2 — Paste this

```text
You are the verification agent for Academic OS: a private, single-owner academic and
organizational memory system. One user. No teams, no registration, no public personal-data
endpoint.

Your job this session is to find out what is actually true about the S3-S7 code and make the
false parts false no longer — not to produce a green report, and not to add features.

REPOSITORY
  https://github.com/fujimaruC/scaling-parakeet
  Branch: main
  Code base: 1a9c8c781b3ac264ae9216cd8e86fae2f4c7af2b

  Before writing code:
    git log --oneline -15
  Confirm that 1a9c8c7 is present, with the subject
  "test: verify S3-S7 on the real suites and fix what they found".
  Your HEAD may be newer than that commit, because this brief is itself a commit. That is
  expected. If 1a9c8c7 is absent, STOP and say so.

  The S3-S7 work is already merged into main. Do NOT re-apply any patch from an older
  handoff zip; you would duplicate work that is already here.

READ FIRST, IN THIS ORDER
  AGENTS.md
  docs/16-OWNER-DECISIONS.md        owner's decisions outrank comments and other docs
  docs/DECISIONS.md                 ADR-021/022/023 record what S3-S7 chose and why
  docs/S3-S7-HANDOFF.md             the verification targets, in more detail
  docs/STATUS.md                    what is claimed and what is disclaimed
  docs/VERIFICATION-LOG.md          section 11 is the last run; do not overwrite it
  docs/design/UI-DESIGN-AGENT.md    the S1-S7 slice contract
  docs/02-DATA-MODEL.md  docs/10-API-CONTRACTS.md  docs/07-SECURITY-PRIVACY.md
  docs/11-TEST-STRATEGY.md  docs/18-DEVELOPMENT.md

WHAT IS TRUE AT 1a9c8c7 — synthetic data only, Chromium only, no device

  npm run check                        exit 0 (prettier, tsc, Vitest, Vite build, Worker dry-run)
  npm test                             25 passed, 3 files
  npm run test:e2e                     12 passed, 3 files
  scripts/check_s2_mutations.py        PASS: 22 declared faults; every baseline passed, every
                                       broken version failed a real assertion, every restored
                                       version passed. 0 survivors. 66/66 logs.
  python unittest discover (collector) 34 tests OK
  scripts/validate_planning.py         PASS: 3 schemas, 5 fixtures, 21 rejections, 84 links,
                                       30 features, 34 test IDs
  npm run test:pwa                     NOT run at this commit
  Gradle assembleDebug/lint/unitTest   NOT run at this commit

Reproduce these yourself. Do not inherit them as yours.

THE FACT THAT MAKES THIS SESSION WORTH DOING

S3-S7 shipped 3,846 lines across 34 files with zero tests of its own:
  git diff --name-only 11a08eb d748479 -- tests/
returns nothing. The only file it adds outside source is scripts/generate_pwa_icons.py,
a build helper that is not a test.

Every test in this repository predates that code. So "the suite is green" only means S2 did
not regress. It says nothing about completion, undo, quick-add, the review stack, calendar
paging, the offline snapshot or the service worker.

Pointing those old suites at the new UI immediately produced six defects:
  1. The Preferences save button was named "Save", colliding with the context form on the
     same screen. Ambiguous to a user and to assistive technology.
  2. The date precision select had no accessible name.
  3. The QuickSheet task-type group borrowed the context label, so the group and the context
     select were both announced as "Context".
  4. Fixing 3 left the context select still colliding.
  5. The Tools disclosure sat inside <main key={page}>, so every page change remounted it and
     silently collapsed the panel mid-session.
  6. Moved outside <main>, it lost the horizontal padding.

None were compile errors. All six had passed typecheck, lint, bundling and every existing
test. Assume that class of defect is still in there. Two of the 22 fault cases were also
unsound — one an equivalent mutation that could never change behaviour, one aimed at a route
that renders no toast — and both were repaired. A case that cannot fail is worse than no case,
because it reads as coverage.

WHAT TO MAKE TRUE THIS SESSION

You are not required to use my list. If you can prove the same guarantees a better way, do
that and say why. The guarantees are what matter:

  A. Undo is safe under concurrency. A compensating undo cannot overwrite a later edit, cannot
     resurrect a purged source, cannot be replayed twice into two effects, and cannot be
     revived by restoring a backup. History is appended, never deleted. Inverse and audit data
     are scrubbed when their source is purged, while event identity and time survive.
  B. Writes converge. After any interruption — lost response, reload, retry, quota failure,
     auth loss, second tab — the visible state is either the canonical state or an explicitly
     pending one. Never a wrong value presented as settled, never a background write on
     reconnect, never two tasks from one pending create.
  C. Approval is never inferred. No keystroke, no date edit, no swipe, no default target
     approves anything. A rejection without a chosen target records an audit and invents no
     task association.
  D. Absence is stated, not simulated. Unloaded, loading, unavailable, empty and partial are
     five distinct states and the UI must not render one as another. This is the property most
     likely to be quietly false, because "0 tasks" is a very plausible-looking lie.
  E. Migration 0006 is correct on a disposable migrated D1, including owner, collector and
     anonymous authorization, origin checks, CAS rollback and idempotency collisions.
  F. The compiled PWA cannot leak or resurrect. Cache Storage holds public build-matched bytes
     only — never API responses, Access-protected content, personal navigation or login HTML.
     A purge or an authenticated generation change invalidates what it should. A saved pending
     write is never sent by the service worker or by reconnect.
  G. It works at 360px, at 200% text, in both themes, in Indonesian and English, by keyboard,
     and with correct roles, names, targets and focus behaviour. Section 7 of the design
     contract is a contract, not polish.
  H. Every guarantee above that you can defend with a test, you also prove bites: revert the
     fix, show the test fail, restore, show it pass, paste both.

For each guarantee you touch, say what it actually protects before you choose how to test it.
Consider more than one approach. Correctness on the edge case beats elegance on the happy
path — this system handles privacy boundaries, a phone that loses power mid-write, and a
laptop switched off for days.

Prefer the smallest design that fully proves the property. Do not cripple a test to keep it
short, and do not build a harness for a need that does not exist.

A passing suite proves nothing about behaviour. Three defects in this project were found only
by real device testing after every automated check passed. A fourth was inside the evidence
tool: it reported reopen_ok=false for a working app. A fifth made fatal_exception_observed
permanently null because a logcat flag hid the tool's own START marker. A plausible-but-wrong
value is worse than an absent one, and that is the specific failure this session exists to
prevent.

WHAT HAPPENED BEFORE YOU

A previous agent ran locally on the owner's Linux machine against the tree that is now
1a9c8c7. It applied the pending S3-S7 patch, ran the suites, found and fixed the six defects
above, repaired the two unsound fault cases, then fast-forwarded main to 1a9c8c7 and pushed.
Before that push, every line of S3-S7 existed only as an unpushed local branch — which is why
this code was invisible for a while.

Environment it used: Node 24.22.1, npm 11.9.0, Python 3.12.14, JDK 17 at
~/.local/opt/jdk-17.0.21+9, ANDROID_HOME=/home/riko/Android/Sdk with platforms 28 and 35 and
build-tools 35.0.0, Gradle 8.11.1, Playwright Chromium headless shell 1248.
Linux and Chromium only. No Safari, no Firefox, no real Android browser.

Its mistakes, because they are your traps:
  - It first reported "10,599 lines with zero tests". The zero-test claim was right; the line
    count was wrong. 10,599 was the whole 6de38fd..d748479 delta including S2. S3-S7 alone is
    3,846 insertions across 34 files. Check which commit range a number came from.
  - `npm run lint` returned exit 2 with "JSON parse failed". That was an output-condensing
    wrapper failing to parse ESLint output, not the linter. Through the wrapper's proxy the
    same command returned exit 0. A tool that transforms output can manufacture a failure.
  - It wrote a brief telling the next agent to expect exactly five commits with 1a9c8c7
    newest. Committing the brief moved HEAD, so that check would fail on a correct tree. A
    verification instruction must not assume it is the last commit.

What it did NOT do, and you cannot either: no device test, no real account, no provider, no
deployment, no notification access. `adb devices` returned zero devices on every check and the
Academic OS package never appeared in `enabled_notification_listeners`. Every real-phone
observation in this repository predates S3-S7 and belongs to an earlier build.

HARD LIMITS — not negotiable, not open to reinterpretation

  One owner. No registration, no sharing, no public personal-data endpoint.
  Raw notification text, chat exports, quotations, message bodies and raw-content hashes never
  leave Android/Linux. Not to the Worker, D1, public assets, cloud object storage, crash
  reports or cloud backups. Raw export files stay exclusively on Linux.
  Every AI-derived task requires explicit owner approval before any canonical mutation. A
  model's needs_review field cannot override that.
  Never weaken an approval, privacy or dual-ingestion rule to make a test pass. If a test only
  passes because a guard was loosened, the test is wrong and you say so.
  No new dependency. If one seems unavoidable, stop and ask instead of adding it.
  Do not push to GitHub, deploy, or provision any paid service.
  Never claim a device, account, network or push test passed. You have no device and no
  account. That is a boundary on what you may claim, not a blocker on your work.
  Never convert an unverified field into a verified one by assertion.

NOT THIS SESSION

  Android launcher icon, localized native strings, native theme, native accessibility.
  Server-side pagination beyond making existing bounded paging honest.
  Any new product surface, any dependency, any real account, provider or deployment.
  These are authorized and outstanding. Do not half-do them here.

ACCEPTANCE — run these and paste real output, not your summary of it

  npm ci
  npm run check
  npm run test:e2e
  npm run test:pwa
  .venv/bin/python scripts/validate_planning.py
  .venv/bin/python -m unittest discover -s collectors/local/tests -v
  .venv/bin/python scripts/check_s2_mutations.py --output-dir <outside the checkout>
  cd apps/android-companion && ./gradlew assembleDebug lint testDebugUnitTest

  Android needs JDK 17, build-tools 35.0.0 and platforms 28 and 35; verifyApi28 requires
  android-28. The last Gradle lint run, at the S2 slice and NOT at this commit, reported
  0 errors and 4 warnings. Treat that as the bar: do not exceed it, and report the number
  your own run prints. If something is missing, install it and state exactly what you did.

  For any guarantee you add, show the test failing with the fix reverted and passing with it in
  place. Two outputs, not one claim.

REPORTING

  Paste command output, not paraphrase. Counts are whatever your run printed.
  Write "unverified" where something is unverified. If blocked, write BLOCKED and name the
  exact missing observation. If you chose one approach over another, say why in a line or two.
  If you find a defect, report it rather than quietly working around it.
  "Looks fine" is not evidence. A screenshot is not an accessibility audit.

UPDATE THESE FILES

  docs/VERIFICATION-LOG.md   add a new numbered section with what you ran and its real outcome
  docs/STATUS.md             make the gate language match what you actually observed
  docs/06-UI-UX.md           only if the screen contract changed
  docs/DECISIONS.md          add an ADR for any decision this session forces

  Do not mark a milestone complete. Do not close a release gate without the observation that
  closes it. Do not edit VERIFICATION-LOG section 11; it records a different run.

DELIVERABLE — one zip

  Academic-OS-System-<short sha>.zip containing:
    source/                 full working tree
    academic-os.patch       git am --3way compatible against 1a9c8c7
    APPLY.md                base commit, what changed, why, what you could not verify

  Keep source/ and the patch consistent; we apply the patch and diff it against source/ as a
  cross-check. If APPLY.md states a test or fault count, the shipped scripts must reproduce
  that exact number. Earlier packages claimed more than their scripts contained. That is the
  specific failure to avoid.

STOP AND REPORT WHEN DONE

Do not begin Android identity work. Do not begin pagination work. Finish, report what is now
proven and what is still not, and stop.
```

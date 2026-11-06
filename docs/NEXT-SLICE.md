# Next slice — handoff prompt

**How to use:** paste the block in Part 2 into the cloud agent. Part 1 is the reasoning behind the scope, for the owner.

Base: `c7c57c5` (or whatever `main` is after the push). Check with `git log --oneline -1`.

---

## Part 1 — Why this scope, and what it is not

### Where the project actually stands

Everything below was verified on real hardware or a real local run. Details in [VERIFICATION-LOG](VERIFICATION-LOG.md).

- 18 D1 integration tests, 23 Python tests, 6 JVM policy tests, 5 Playwright, 1 PWA offline test — all pass.
- Gradle build + lint + `verifyApi28` pass; APK installs, launches and reopens on the owner's Android 9 phone with zero crashes.
- Two device-only defects were found this way and fixed: a launch crash invisible to every test, and an evidence tool that reported a false negative.

### What is still empty

**No capture has ever run on hardware.** `notification_access=false` for the entire project history. The listener service has never received a notification.

That single fact blocks M0, and no cloud agent can change it. Everything else is downstream of it: filtering, dedupe, queue durability, interrupted ack, transport — all untested against real WhatsApp events.

### Why not "just do the capture matrix"

Because the matrix is the owner's job, it runs once, and it is expensive to get wrong. The agent's job is to make that one run cheap and trustworthy, then to remove everything else that is still guesswork.

### The chosen scope, and the reasoning

Two candidates were considered:

**A. Push notification lifecycle (gate 4).** High user value — reminders are the point of the product. But physical delivery cannot be verified without an account, a browser subscription and a device, so the agent would be writing code it cannot prove works. That is the same trap that produced the launch crash.

**B. Close the remaining honesty gaps in the evidence pipeline.** Lower glamour, but every part is locally verifiable, and it directly improves the one device run that matters.

**B was chosen**, because it converts an untestable feature into a trustworthy one later. Specifically: four fields in `device_evidence.py` are still `null` — `fatal_exception_observed`, `install_ok`, `apk_sha256`, `source_commit`. All four are mechanically checkable *right now*, and all four are exactly what you need recorded when something goes wrong on the phone. A crash during the matrix would currently be invisible in the record.

That is the gap this slice closes.

### What would change this decision

If the owner grants notification access before this slice starts, do the capture matrix first — real evidence beats better tooling. The prompt says so explicitly.

---

## Part 2 — Paste into ChatGPT

```text
You are the implementation agent for a private, single-owner academic and
organizational memory system. One user, no teams, no registration, no public
data endpoints. You work in a fresh clone, run the checks yourself, and
return a zip.

REPOSITORY
https://github.com/fujimaruC/scaling-parakeet
Branch: main
Base commit: c7c57c5
Verify with: git log --oneline -1

READ BEFORE WRITING CODE, in this order:
  AGENTS.md
  docs/STATUS.md
  docs/VERIFICATION-LOG.md        <-- read this fully; it says what was
                                      actually run and what was not
  docs/DEVICE-SMOKE.md
  docs/18-DEVELOPMENT.md
  docs/15-PRIVATE-TRANSPORT.md
  docs/02-DATA-MODEL.md

WHAT IS TRUE

The repository is not a scaffold. A working React/TypeScript PWA, a
TypeScript Worker with D1 migrations, a Python collector and a Kotlin
Android companion already exist. Do not rewrite or restructure them.

Current verified state: 18 D1 tests, 23 Python tests, 6 JVM policy tests,
5 Playwright, 1 PWA offline test all pass. Gradle build, lint and the
API-28 surface check pass. The APK installs, launches and reopens on the
owner's OPPO CPH2015 (Android 9, API 28) with zero fatal exceptions.

Two defects were found by real device testing that every automated check
had missed:
 1. Queue extended SQLiteOpenHelper, which does not implement
    AutoCloseable on API 28, so every Queue(...).use{} threw
    ClassCastException and the app crashed on launch.
 2. The evidence tool reported reopen_ok=false for an app that had
    reopened fine, because a warm resume delivers no new intent.
Draw the conclusion: passing synthetic tests proves nothing about device
behaviour, and a tool that reports a plausible-but-wrong value is worse
than no tool.

Notification access is NOT granted and has never been granted. No capture
has ever run on hardware. You have no device, no account and no provider.

HOW TO THINK — read this twice

Your job is to find the best solution, not to execute instructions
literally. For each problem: work out what it actually protects, consider
more than one approach, choose one, and say in a line or two why you chose
it over the alternative. If you find a better approach than anything
implied here, take it and say so.

Simplicity is a design goal, not a prohibition. Prefer the smallest design
that fully solves the problem. Do not cripple a feature to save lines, and
do not add machinery for a need that does not exist yet.

Correctness on the edge case beats elegance on the happy path. This system
handles privacy boundaries, a phone that loses power mid-write, and a
laptop switched off for days. Choose the option that is still right when
the network drops, the clock is wrong, or the process dies between two
statements.

WHAT TO ACHIEVE THIS SESSION

0. First, check whether you should do this at all.

   If the owner has granted notification access by the time you start,
   say so and ask whether to pivot to the capture matrix instead. Real
   evidence outranks better tooling. Do not assume it is granted; the
   default is that it is not.

1. Make the device evidence record complete and trustworthy.

   scripts/device_evidence.py currently emits four fields it never fills:
   fatal_exception_observed, install_ok, apk_sha256, source_commit. All
   four are mechanically checkable with adb and the APK on disk. A crash
   during the owner's one capture run would currently be invisible in the
   record.

   Fill them. While doing so, consider:
   - install_ok should reflect whether the install actually succeeded,
     not whether a command was issued.
   - fatal_exception_observed should not be satisfied by "no crash in the
     last 200 lines" if a crash earlier in the run would be missed.
   - apk_sha256 should identify the artefact that is actually installed,
     not merely the file you built.
   - source_commit should not be a guess about git state.

   These are four small problems with a shared theme: a field that is
   present but wrong is worse than a field that is absent. If you cannot
   observe something reliably, leave it null and list it under
   `unavailable` — that behaviour already exists and is correct.

2. Make the tool impossible to fool by stale state.

   The reopen_ok bug had one root cause: the tool trusted log output
   without proving it came from this run. That was fixed with per-launch
   tokens. Audit the rest of the tool for the same class of mistake —
   any place a previous run's state, a leftover process, a cached value
   or an unrelated log line could satisfy a check. Fix what you find.

   Consider whether the tool should refuse to emit a record at all when
   it cannot distinguish runs, rather than emitting a plausible one.

3. Give the owner a one-command capture-matrix harness.

   The owner will run the capture matrix by hand, once. Right now that
   means reading docs/14-ANDROID-COMPANION.md and manually recording
   results, which invites sloppy evidence.

   Build the smallest thing that makes the run trustworthy: a way to
   record per-case results that cannot mark a case PASS unless it ran,
   cannot be edited into a pass after the fact, and produces output in
   the sanitized shape DEVICE-SMOKE.md already defines. It does not need
   to automate the phone — the owner still taps the phone. It needs to
   stop the owner from accidentally recording a false pass.

   Prefer boring and obvious over clever. The owner will be tired when
   they run this.

HARD LIMITS — not negotiable, not open to reinterpretation

  No raw chat text, quotes, exports, message bodies or raw-content hashes
  may leave Android/Linux for the cloud, logs, assets or backups.
  Every AI-derived task needs explicit owner approval; nothing auto-accepts.
  One owner. No registration, no sharing, no public personal-data endpoint.
  Never claim a device, account, network or push test passed. You have no
  device and no account.
  Do not push to GitHub, deploy, or provision any paid service.
  Do not add a dependency unless the standard library genuinely cannot do
  it; if you do, justify it in one line.
  Do not include real chat data, exports, credentials or keys anywhere.
  Do not weaken an existing privacy or approval rule to make a test pass.
  Do not convert an unverified field into a verified one by assertion.

ACCEPTANCE — run these and paste real output

  npm ci
  npm run check
  npm run test:e2e
  .venv/bin/python scripts/validate_planning.py
  .venv/bin/python -m unittest discover -s collectors/local/tests -v
  cd apps/android-companion && ./gradlew assembleDebug lint testDebugUnitTest

  Note: the previous two slices skipped test:e2e and test:pwa. Run them
  this time unless your change cannot affect the browser.

  Android needs JDK 17 and build-tools 35.0.0 plus platforms 28 and 35
  (verifyApi28 requires android-28). If something is missing, install it
  and say exactly what you did.

  Prove your tests bite: for each new guarantee, revert the fix locally,
  show the test failing, restore it, show it passing. Paste both outputs.
  A test that passes before and after the fix is not a test.

REPORTING

  Paste actual command output, not your summary of it.
  Write "unverified" where something is unverified.
  If blocked, say BLOCKED and name the missing observation.
  When you chose one design over another, say why in a line or two.
  If you find an existing defect, report it — do not quietly work around it.

UPDATE THESE FILES

  docs/VERIFICATION-LOG.md   add what you ran and its real outcome
  docs/STATUS.md             update gate language to match reality
  docs/DEVICE-SMOKE.md       if the evidence record shape changed

  Do not mark any milestone complete. The capture matrix is still unrun.

DELIVERABLE — one zip

  Academic-OS-System-<short sha>.zip containing:
    source/                 full working tree
    academic-os.patch       git am --3way compatible against c7c57c5
    APPLY.md                base commit, what changed, why, what you could
                            not verify
    docs/VERIFICATION-LOG.md updated inside source/

  Keep source/ and the patch consistent. We apply the patch and diff it
  against source/ as a cross-check. If you claim a number of tests or
  faults in APPLY.md, make sure the scripts actually reproduce that
  number — the last two packages did not.
```

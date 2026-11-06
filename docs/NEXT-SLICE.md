# Next slice — handoff prompt

**How to use:** Part 1 explains the choice, for the owner. Part 2 is the brief — paste it, or point the agent at this file.

Base: the commit that introduced this file. Confirm with:
`git log --oneline -1 -- docs/NEXT-SLICE.md`

---

## Part 1 — Why this scope

### Where things actually stand

Everything below is measured, not assumed. Full detail in [VERIFICATION-LOG](VERIFICATION-LOG.md).

- 18 D1 tests, 33 Python tests, 6 JVM policy tests, 5 Playwright, 1 PWA offline — all pass.
- Gradle build, lint and the API-28 surface check pass. The APK installs, launches and reopens on the owner's Android 9 phone with zero crashes.
- The evidence collector now reports real values for all four fields that used to be null — `install_ok`, `apk_sha256`, `source_commit`, `fatal_exception_observed` — and each was cross-checked independently.
- The capture matrix harness exists, seals its journal with an HMAC chain, and refuses to run unattended. Verified: a 0-byte journal is rejected as `Incomplete journal`.

### The one thing blocking everything

**Notification access has never been granted.** `notification_access=false` for the entire project history. No listener event has ever been received.

That is the owner's job, takes thirty seconds, and cannot be delegated. Every capture claim stays unproven until it happens.

### What the agent should therefore do

Not capture work — it cannot verify any of it. Not Web Push — delivery needs an account, a subscription and a device.

Instead: **make the thing usable as a product.** Three gates are open and every part is locally verifiable:

| Gate | What is missing | Verifiable locally? |
|---|---|---|
| 5 | Full labels/translations, accessibility and keyboard audit, calendar pagination | Yes |
| 2 | Launcher icon, localized native resources, release UI | Yes |
| 8 | Restore into disposable D1 with tombstones and future reminders | Yes |

Right now the app is a probe with hardcoded English strings and no icon. The PWA carries ID/EN and themes, but the Android companion has a `MissingApplicationIcon` lint warning that has been there since the first build.

This slice makes it look and behave like something you would actually open every day — which matters, because a tool you avoid using is a tool that fails regardless of how correct its tests are.

### What would change this decision

If notification access gets granted, do the matrix first. Real evidence outranks polish. The prompt says so.

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
Base commit: the commit that introduced this file.
Verify with: git log --oneline -1 -- docs/NEXT-SLICE.md

READ BEFORE WRITING CODE, in this order:
  AGENTS.md
  docs/STATUS.md
  docs/VERIFICATION-LOG.md        <-- what was actually run, and what was not
  docs/DEVICE-SMOKE.md
  docs/18-DEVELOPMENT.md
  docs/06-UI-UX.md
  docs/02-DATA-MODEL.md

WHAT IS TRUE

The repository is not a scaffold. A working React/TypeScript PWA, a
TypeScript Worker with D1 migrations, a Python collector and a Kotlin
Android companion already exist and run. Do not rewrite or restructure them.

Verified locally: 18 D1 tests, 33 Python tests, 6 JVM policy tests, 5
Playwright, 1 PWA offline test. Gradle build, lint and the API-28 surface
check pass. The APK installs, launches and reopens on the owner's OPPO
CPH2015 (Android 9, API 28) with zero fatal exceptions.

Three defects were found only by real device testing, after every automated
check had passed:
 1. Queue extended SQLiteOpenHelper, which does not implement AutoCloseable
    on API 28, so the app crashed on launch.
 2. The evidence tool reported reopen_ok=false for a working app, because a
    warm resume delivers no new intent.
 3. The capture harness could have been driven headlessly, which would have
    let an agent manufacture a matrix result. It now blocks on owner input.
Draw the conclusion: a passing suite proves nothing about behaviour, and a
plausible-but-wrong value is worse than an absent one.

Notification access has never been granted. No listener event has ever been
received. You have no device, no account and no provider.

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
laptop switched off for days.

WHAT TO ACHIEVE THIS SESSION

0. First, check whether you should do this at all.

   If the owner has granted notification access by the time you start, say
   so and ask whether to pivot to the capture matrix. Real evidence outranks
   polish. Do not assume it is granted; the default is that it is not.

1. Make the Android companion look like something a person would open.

   It currently has no launcher icon (a standing lint warning), hardcoded
   English strings, and a bare default theme. For a tool the owner must
   open every day, that is not cosmetic — an app that looks unfinished is
   an app that gets avoided.

   Give it a real identity: a launcher icon, string resources for every
   user-visible string, and a theme that belongs to this product rather
   than the platform default. Respect the existing constraints: no new
   dependency unless the standard library or platform genuinely cannot do
   it, and nothing that bloats the 8 GB VAIO build or the APK.

   Consider what the app is for — a private capture tool with visible
   status, not a task manager. Design for that.

2. Audit and fix accessibility across both surfaces.

   The PWA is claimed to support 360px, keyboard use and 200% text. Verify
   that rather than trusting it. Check the Android companion too: it is
   built from programmatic views with no content descriptions, and a
   screen-reader user currently cannot tell what the status line says.

   Produce evidence, not assertions: what you tested, how, and what still
   fails. If something cannot be verified without a device or a screen
   reader, say so — do not mark it passed.

3. Make the PWA hold up on a large ledger.

   Calendar and list views currently load bounded subsets with a partial
   disclosure. Extend pagination so a year of tasks remains navigable
   without loading everything, and make sure the disclosure stays honest
   when a view is partial.

   Test with a synthetic ledger large enough to expose the problem — do not
   test with five tasks and declare it fixed.

HARD LIMITS — not negotiable, not open to reinterpretation

  No raw chat text, quotes, exports, message bodies or raw-content hashes
  may leave Android/Linux for the cloud, logs, assets or backups.
  Every AI-derived task needs explicit owner approval; nothing auto-accepts.
  One owner. No registration, no sharing, no public personal-data endpoint.
  Never claim a device, account, network or push test passed. You have no
  device and no account.
  Do not push to GitHub, deploy, or provision any paid service.
  Do not add a dependency unless the standard library or platform genuinely
  cannot do it; if you do, justify it in one line.
  Do not include real chat data, exports, credentials or keys anywhere.
  Do not weaken an existing privacy or approval rule to make a test pass.
  Do not convert an unverified field into a verified one by assertion.

ACCEPTANCE — run these and paste real output

  npm ci
  npm run check
  npm run test:e2e
  npm run test:pwa
  .venv/bin/python scripts/validate_planning.py
  .venv/bin/python -m unittest discover -s collectors/local/tests -v
  cd apps/android-companion && ./gradlew assembleDebug lint testDebugUnitTest

  Android needs JDK 17, build-tools 35.0.0 and platforms 28 and 35
  (verifyApi28 requires android-28). If something is missing, install it and
  say exactly what you did.

  Lint must come out with fewer warnings than it has now. Current standing
  warnings: MissingApplicationIcon, ApplySharedPref x2, CustomX509TrustManager.
  If you leave one in place, say why.

  Prove your tests bite: for each new guarantee, revert the fix locally,
  show the test failing, restore it, show it passing. Paste both outputs.

REPORTING

  Paste actual command output, not your summary of it.
  Write "unverified" where something is unverified.
  If blocked, say BLOCKED and name the missing observation.
  When you chose one design over another, say why in a line or two.
  If you find an existing defect, report it — do not quietly work around it.
  Accessibility claims need evidence. "Looks fine" is not evidence.

UPDATE THESE FILES

  docs/VERIFICATION-LOG.md   add what you ran and its real outcome
  docs/STATUS.md             update gate language to match reality
  docs/06-UI-UX.md           if the interface contract changed

  Do not mark any milestone complete. The capture matrix is still unrun.

DELIVERABLE — one zip

  Academic-OS-System-<short sha>.zip containing:
    source/                 full working tree
    academic-os.patch       git am --3way compatible against that base
    APPLY.md                base commit, what changed, why, what you could
                            not verify
    docs/VERIFICATION-LOG.md updated inside source/

  Keep source/ and the patch consistent. We apply the patch and diff it
  against source/ as a cross-check. If you claim a count of tests or faults
  in APPLY.md, make sure the shipped scripts reproduce that number — earlier
  packages claimed more than their scripts contained.
```

# Next slice — handoff prompt

**How to use:** Part 1 explains the choice, for the owner. Part 2 is the brief — paste it, or point the agent at this file.

Base: the commit that introduced this file. Confirm with:
`git log --oneline -1 -- docs/NEXT-SLICE.md`

---

## Part 1 — Why this scope

### What changed since the last prompt

The owner supplied a design contract (`docs/design/UI-DESIGN-AGENT.md`) and a prototype, and delegated refinement. S1 of that spec is now built and verified: tokens, self-hosted fonts, bitmap icons, primitives, shell, theme persistence, `/__kit`.

That spec is now authoritative for the PWA's appearance and screen structure, and it orders a stop for owner review after each slice. S1 is reviewed and accepted. S2 is next.

### What S2 is

Read-only Today, Tasks and Task detail against real Worker data — grouping, urgency, history timeline. No writes yet. The spec is explicit that writes land in S3.

This is the right slice because it is where the app stops being a kit demo and starts being the thing you open in the morning. It is also entirely locally verifiable against synthetic fixtures, which matters: the last three slices each produced a defect that only hardware caught, and this one has no device dependency at all.

### Still owed, and deliberately not dropped

The earlier brief asked for Android companion identity (icon, strings, theme), an accessibility audit across both surfaces, and large-ledger pagination. **None of that is cancelled by importing the design.** ADR-021 says so explicitly. It is deferred, not deleted, and stays listed in STATUS.

The Android work is best done after S2 shows the real screen language, so the companion matches the product rather than a guess.

### What would change this decision

If notification access is granted, run the capture matrix first. Real evidence outranks any UI work. The prompt says so.

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
  docs/design/UI-DESIGN-AGENT.md    <-- authoritative for UI and screens
  docs/DECISIONS.md                 <-- ADR-021 reconciles it with 06-UI-UX
  docs/06-UI-UX.md
  docs/STATUS.md
  docs/VERIFICATION-LOG.md
  docs/18-DEVELOPMENT.md

WHAT IS TRUE

The repository is not a scaffold. A working React/TypeScript PWA, a
TypeScript Worker with D1 migrations, a Python collector and a Kotlin
Android companion already exist and run.

Verified locally: 20 Vitest (18 D1 + 2 foundation), 33 Python, 6 JVM policy,
7 Playwright, 1 PWA offline. Gradle build, lint and the API-28 surface check
pass. The APK installs, launches and reopens on the owner's OPPO CPH2015
(Android 9, API 28).

S1 of the design contract is complete: tokens, self-hosted Pixelify Sans and
Inter, bitmap icons, Box/Chip/Tag/Button/UrgencyBar primitives, centred
four-tab shell, FAB, dev-only /__kit, persisted system/light/dark. The owner
has reviewed and accepted it.

Three defects in this project were found only by real device testing, after
every automated check had passed. A fourth was found in the evidence tool
itself: it reported reopen_ok=false for a working app. Draw the conclusion:
a passing suite proves nothing about behaviour, and a plausible-but-wrong
value is worse than an absent one.

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

FIX FIRST — a verified defect in the shipped evidence tool

  scripts/device_evidence.py can never observe crash coverage on the owner's
  phone. fatal_exception_observed returns null on every run, so a crash during
  the capture matrix would be invisible.

  Root cause, isolated by experiment: CrashWindow.start() passes -T 1 to
  logcat. With that flag the live stream never sees the AOS-RUN START marker,
  so the window never opens and every subsequent line is discarded.

    adb logcat -d -b main -b crash -v brief -T 1 'AOS-RUN:I' '*:S'   -> 0
    adb logcat -d -b main -b crash -v brief      'AOS-RUN:I' '*:S'   -> 1

  Live-stream proof without -T 1: both START and END for a fresh token were
  captured (count 2). -T is redundant because the monitor's own token already
  scopes the window.

  Fix it, and add a test that fails if the marker-scoped window can miss its
  own markers. Detail in docs/VERIFICATION-LOG.md section 8.

WHAT TO ACHIEVE THIS SESSION — S2 ONLY

Implement S2 from the design contract: read-only Today, Tasks and Task
detail against real Worker data.

  - Today: header, chips, review banner when proposals are pending, due-today
    cards, this-week rows, and the always-visible "Tanpa tanggal" row.
  - Tasks: segmented context filter, the five groups in spec order, empty
    groups hidden, due-ascending within a group.
  - TaskRow: 44x44 hit area around a 24px box, real <button>, aria-label,
    pixel "when" text, done state.
  - Task detail: deadline card with all four date precisions rendered
    distinctly, reminder line from real reminder_rules, history timeline
    newest-first.
  - Sheets and toast per §5.7, including the precision selector the
    prototype omits.

Constraints that matter here:

  - Read-only. Writes, optimistic updates and undo belong to S3. Do not
    implement them early.
  - Date precision must stay distinct. exact timestamp, date-only,
    approximate and unknown are four different things and the UI must never
    collapse them. Unknown always appears under "Tanpa tanggal".
  - Reminder text comes from data, not a hardcoded string.
  - No sample data in production paths. Fixtures live in tests/fixtures or
    dev seeds only.
  - Do not add a dependency. The existing React, fetch, IndexedDB and
    browser History are sufficient, as ADR-021 records.

Accessibility is required, not polish — §7 is a contract. Every control a
real button, 44x44 targets, visible focus ring, aria-labels on icon-only
buttons, contrast 4.5:1 in both themes, and never colour alone. If you
cannot verify something without a screen reader, say so rather than
claiming it passes.

HARD LIMITS — not negotiable, not open to reinterpretation

  No raw chat text, quotes, exports, message bodies or raw-content hashes
  may leave Android/Linux for the cloud, logs, assets or backups.
  Every AI-derived task needs explicit owner approval; nothing auto-accepts.
  One owner. No registration, no sharing, no public personal-data endpoint.
  Never claim a device, account, network or push test passed. You have no
  device and no account.
  Do not push to GitHub, deploy, or provision any paid service.
  Do not add a dependency; if you believe one is unavoidable, stop and ask
  instead of adding it.
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

  Lint currently reports 0 errors and 4 warnings: MissingApplicationIcon,
  ApplySharedPref x2, CustomX509TrustManager, SetTextI18n. Do not make it
  worse. The Android icon work is a separate slice; do not half-do it here.

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
  docs/06-UI-UX.md           if the screen contract changed

  Do not mark any milestone complete. The capture matrix is still unrun, and
  the Android identity, accessibility audit and large-ledger pagination from
  the earlier brief remain outstanding and must stay listed as such.

STOP AFTER S2

The design contract requires owner review between slices. Finish S2, report,
and stop. Do not begin S3.

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

# ChatGPT Web — build prompt for the remaining Academic OS scope

**How to use**

1. This file is committed on `main`. The agent fetches the repo itself.
2. Paste **Part 2** into ChatGPT Web (the whole fenced block).
3. The agent works in its own clone and returns one zip.
4. That zip comes back here, where it is **verified on the real phone**. The
   cloud agent cannot reach the device, the Cloudflare account or 9Router, so it
   must not claim anything about them.

**Division of labour, and why it is written down.** This repository is built by
cloud agents and verified locally. Every device defect found so far — the API-28
`AutoCloseable` launch crash, the `-T 1` marker window, the chatty false
negative, the `onListenerConnected` `SecurityException`, the exact-title
selector — passed every automated check first. A cloud agent can prove code is
self-consistent. Only the phone proves it works.

---

## Part 1 — State of the system (for the owner, 2026-11-09)

**Base:** `main` at `f36c410`, pushed to `origin`.

| Surface | State |
|---|---|
| PWA (React/TS) | Today, tasks, detail, calendar, review, settings, history, inbox, offline snapshot, ID/EN, light/dark |
| Worker + D1 | 7 migrations; tasks, contexts, events, review effects, reminder intents, inbox, device credentials, purge/receipt |
| Python collector | Encrypted local evidence, export import, pairing, pinned TLS receiver, consent/extraction/projection, restore |
| Android companion | 8 surfaces on real Worker handlers; encrypted queue; listener capture; sealed pairing; sync job |
| Deployment | **never deployed.** D1 id is all zeros; `OWNER_SUB`/`ACCESS_TEAM`/`ACCESS_AUD` are `UNCONFIGURED` |

**Verified here on 2026-11-09** (`f36c410`):

```text
vitest run                4 files / 36 tests passed
python unittest           70 tests OK
playwright e2e            11 passed, 1 failed; the failure passed alone on retry (flaky)
playwright production     1 passed (offline reload + logout wipe)
gradle assembleDebug lint testDebugUnitTest   BUILD SUCCESSFUL 6m16s
  native policy 8 cases, queue privacy 6 cases, lint 0 errors
planning validation       PASS (114 links, 30 features, 34 test IDs)
placeholder scan          PASS
```

**Verified on the CPH2015 (Android 9 / API 28):** install in place from the
previous build with no data loss, launch, reopen, clean crash window
(`crash_coverage_complete: true`, `fatal: false`), listener `connected` and
recovering after a forced disconnect, pairing to a local TLS receiver over
`adb reverse` with HMAC-verified requests, and the negative filter case (28 real
notifications replayed through a non-matching synthetic mapping left the queue
at 0).

**Not verified, by anyone:** any captured notification, real network transport,
laptop-off queueing, enrollment/activation/revocation against a real account,
Cloudflare Access, 9Router, Web Push delivery, D1 restore in production, ITK.

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
  Base commit: f36c410   (verify: git log --oneline -1)

You are the BUILDER. A separate verifier runs your output on the owner's real
Android 9 phone and against the real Cloudflare account. You have neither. Do
not claim a device, account, network, push or provider result.

READ BEFORE WRITING CODE, in this order
  AGENTS.md                          rules, precedence, completion gates
  docs/STATUS.md                     what is true, what is not
  docs/VERIFICATION-LOG.md           sections 17-19 are the latest device work
  docs/16-OWNER-DECISIONS.md         read the provenance warning at the top
  docs/DECISIONS.md                  ADRs 016-024
  docs/17-WORK-PACKAGES.md           W00-W50 package definitions
  docs/13-FEATURE-CATALOG.md         F01-F30, 25 are P0
  docs/18-DEVELOPMENT.md             reproducible setup
  docs/14-ANDROID-COMPANION.md       companion contract and device matrix
  docs/07-SECURITY-PRIVACY.md        the boundary you must not move

WHAT IS ALREADY BUILT — do not rewrite it

A working React/TypeScript PWA, a TypeScript Worker with 7 D1 migrations, a
Python collector with an encrypted local evidence store, and a Kotlin Android
companion with eight real screens. 36 Vitest, 70 Python, 12 Playwright and 14
JVM cases pass. The APK installs, launches and reopens on the owner's phone.

This is not a scaffold and not a prototype. Extend it.

HOW TO THINK

Your job is to find the best solution, not to execute instructions literally.
For each problem: work out what it actually protects, consider more than one
approach, choose one, and say in a line or two why. If you find a better
approach than anything implied here, take it and say so.

Simplicity is a design goal, not a prohibition. Prefer the smallest design that
fully solves the problem. Do not cripple a feature to save lines; do not add
machinery for a need that does not exist.

Correctness on the edge case beats elegance on the happy path. This system
handles dates, privacy boundaries, and a phone that loses power mid-write.

SCOPE FOR THIS SESSION — the four things that actually block release

Work in this order. Each is a vertical slice with failure states, not a screen
stub. Stop and report if a slice needs a decision you cannot make.

1. WEB PUSH — F19, the only P0 feature with no code at all.
   There is no push code in apps/web/src or apps/worker/src; the service worker
   has no push handler; /health reports push:"not_configured". The reminder
   engine and durable in-app inbox already work and must keep working when push
   is absent.
   Reach a defensible outcome, which may legitimately be "explicitly
   unsupported" if the platform or key story does not hold — the feature
   catalogue allows that, but only with the reason recorded. If you implement
   it: subscription lifecycle, VAPID keys supplied as Worker secrets (never in
   git), per-device subscription storage with revocation, delivery from the
   existing cron tick, expired-subscription pruning, and inbox dedupe so a push
   never duplicates an inbox row. Push must never carry message text.
   Test it synthetically: subscribe, deliver, expire, revoke, and prove the
   inbox row is unchanged in count and content when push fails.

2. SEARCH AND CALENDAR AT SCALE — F16, F15.
   The Worker already supports ?q= with title_only and LIKE escaping, and
   calendarRange() filters exact instants separately from date-only values.
   The PWA does not use them: Ledger.tsx filters the loaded page client-side.
   That is correct for a small ledger and wrong for a large one.
   Move search and calendar filtering to the server for the views that can
   exceed one page, keep the bounded-page disclosure honest, and prove that a
   filtered result never silently implies "no matches" when only one page was
   read. Pagination cursors must stay opaque and stable.

3. OPERATIONAL BUDGETS AND HEALTH — F25, the other P0 with no code.
   grep for budget/quota/rate-limit in apps/worker/src returns nothing. There is
   a /health route that reports three strings.
   Build the smallest honest thing: request accounting that survives a restart,
   a documented limit per route class, a health payload that distinguishes
   "never reported" from "reported stale" from "healthy", and a refusal path
   that returns a fixed code rather than a 500. Do not invent a billing
   integration and do not provision anything.

4. NATIVE PARITY GAPS that the PWA has and the companion does not.
   Read the eight screens first. Then close only what is genuinely missing —
   candidate areas: search entry, history paging on a large ledger, source
   health detail, export. Do not redesign the UI; it has an accepted design
   contract and the owner has reviewed it.

If you finish those and still have budget, take the next item from
docs/STATUS.md "Remaining implementation and release gates" — but do not start
anything that requires a device, an account, a provider or a deployment.

HARD LIMITS — not negotiable, not open to reinterpretation

  No raw chat text, quotations, exports, message bodies or raw-content hashes
  may leave Android/Linux for the cloud, logs, assets, crash reports or backups.
  Every AI-derived task needs explicit owner approval; nothing auto-accepts.
  One owner. No registration, no sharing, no public personal-data endpoint.
  Never claim a device, account, network, push or provider test passed.
  Do not push to GitHub, deploy, or provision any paid service.
  Do not add a dependency unless the standard library genuinely cannot do it;
  if you do, justify it in one line and update the lockfile.
  Do not weaken an existing privacy, approval or fail-closed rule to make a test
  pass. If a rule blocks you, say so and stop.
  Do not convert an unverified field into a verified one by assertion.

THINGS THAT WILL BITE YOU — learned the hard way here

  A passing suite proves nothing about behaviour. Five defects in this project
  passed every automated check and only failed on the phone: an API-28
  AutoCloseable assumption, a logcat -T 1 window that never opened, a chatty
  rule that reported every clean run as unverified, an onListenerConnected
  SecurityException after an in-place update, and an exact-title selector that
  could never match a live notification. Assume the same blindness.
  API 28 is the runtime floor. verifyApi28 compiles all Kotlin against
  android-28 with -no-jdk; anything newer than 28 fails the build. Keep it.
  Dates have four precisions — exact, date-only, approximate, unknown — and the
  UI must never collapse them. Unknown always appears under "Tanpa tanggal".
  The notification selector matches conversation identity plus group key.
  On this phone every WhatsApp notification shares one group key, so the group
  half is currently inert. Do not "fix" that by widening the match.
  The capture screen stores its mapping once; it is not re-entered per launch.
  A queue reset clears pairing but keeps the mapping.

ACCEPTANCE — run these and paste real output

  npm ci
  npm run check                 # lint + tsc + vitest + web/worker build
  npm run test:e2e
  npm run test:pwa
  .venv/bin/python scripts/validate_planning.py
  .venv/bin/python -m unittest discover -s collectors/local/tests -v
  cd apps/android-companion && ./gradlew assembleDebug lint testDebugUnitTest --no-daemon

  Android needs JDK 17, build-tools 35.0.0, platforms 28 and 35. If something is
  missing, install it and say exactly what you did.

  Lint is currently 0 errors. Do not make it worse.

  Prove your tests bite: for each new guarantee, break the code locally, show
  the test failing, restore it, show it passing. Paste both outputs. A test that
  passes before and after the fix is not a test.

  If a check cannot run, write BLOCKED with the exact error. Do not skip it
  quietly and do not describe it as passing.

REPORTING

  Paste actual command output, not your summary of it.
  Write "unverified" where something is unverified.
  If blocked, say BLOCKED and name the missing observation.
  When you chose one design over another, say why in a line or two.
  If you find an existing defect, report it — do not quietly work around it.

UPDATE THESE FILES

  docs/STATUS.md             exact commands, real outcomes, what remains
                             unverified, and any decision a future agent must
                             not silently reverse
  docs/VERIFICATION-LOG.md   a new numbered section for this session
  docs/DECISIONS.md          an ADR if you changed a contract
  docs/13-FEATURE-CATALOG.md only if a feature's gate genuinely changed

  Do not mark any milestone complete. M0 and every release gate stay open until
  the device and account observations exist.

DELIVERABLE — one zip

  Academic-OS-System-<short sha>.zip containing:
    source/                 full working tree
    academic-os.patch       git am --3way compatible against f36c410
    APPLY.md                base commit, what changed, why, how to verify, and
                            what you could not verify

  Keep source/ and the patch consistent. The verifier applies the patch to a
  fresh clone and diffs it against source/ as a cross-check. If APPLY.md claims
  a count of tests or faults, the shipped scripts must reproduce that number —
  earlier packages claimed more than their scripts contained.
```

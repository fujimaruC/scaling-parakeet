# Next session — handoff prompt for the cloud agent

**How to use this file**

1. Push `main` (this file included). The cloud agent fetches the repo from GitHub.
2. Copy everything inside the block in **Part 2** and paste it into ChatGPT Web.
3. The agent works in its own workspace and zips the result back.
4. We test the zip here — including on the actual phone, which the cloud agent cannot reach.

`FIRST-AGENT-SESSION.md` is for an agent that has the repo *and* the device. This file is for the agent that has neither.

---

## Part 1 — Progress snapshot (for the human)

**As of 2026-11-06 · branch `main` · commit `6d8a2f3`**

### Verified here, this machine

| Check | Result |
|---|---|
| `npm run check` | PASS — 16 D1 integration tests, format, tsc, PWA build, Worker dry-run |
| `npm run test:e2e` | 5 passed |
| `npm run test:pwa` | 1 passed — compiled service worker offline reload, snapshot cleared on logout |
| Python unit tests | 19 passed |
| `scripts/validate_planning.py` | PASS — 3 schemas, 21 rejection cases, 58 links |
| `scripts/check_placeholders.py` | PASS |
| Gradle `assembleDebug` + `lint` + `testDebugUnitTest` | PASS — 0 lint errors, 6 pre-existing warnings |

### Verified on the actual phone

| Fact | Value |
|---|---|
| Device | OPPO CPH2015, Android 9 / API 28 |
| `isLowRamDevice()` | `false` — low-RAM listener restriction does not apply |
| Debug APK | installed, launched, `MainActivity` resumed, 0 fatal exceptions |
| Notification access | **not granted** (owner must tap it) |
| WhatsApp / Chrome | 2.26.42.74 / 138.0.7204.179 |

### The lesson that matters most

All 41 automated tests passed while the app **crashed on launch** on the phone. `Queue` extends `SQLiteOpenHelper`, which does not implement `AutoCloseable` on API 28, so every `Queue(...).use { }` threw `ClassCastException`. Fixed in `6d8a2f3`.

Compile, lint, TypeScript, Python, Vitest and Playwright were all blind to it. Every future handoff must assume the same blindness.

### Open findings

1. **Contract violation — unkeyed fingerprint.** `Queue.add` stores a plain SHA-256 of the payload. `docs/02-DATA-MODEL.md` requires a keyed hash with a locally managed secret. Local-only column, never synced, but it is a stable content identifier at rest.
2. **API-28 compatibility is unaudited.** One API-28-only crash has already shipped past every check. There is no guard against a second.
3. **No device smoke checklist.** The crash would have been caught by a 60-second run that nobody had written down.
4. **Listener grant not performed.** No capture case has ever been exercised on hardware.
5. **Cloudflare Access, real 9Router route, Web Push delivery, D1 restore** — all still unverified.

### Recommended order

| Slice | Scope | Who can do it |
|---|---|---|
| **1 (this prompt)** | Remove the stable on-disk content identifier, prevent a second API-28 crash class, 60-second device smoke check | Cloud agent |
| 2 | Web Push subscription lifecycle + purge-status polling | Cloud agent |
| 3 | Server search/calendar pagination, localization, icon, release packaging | Cloud agent |
| 4 | Listener capture matrix, transport on device, seven-day pilot | **Us, with the phone** |

Slice 1 goes first because it closes a security contract violation and prevents the bug class that already cost us a session.

### How the prompt is written

Part 2 states the **outcome** and the **hard limits**, then hands the mechanism to the agent. It asks for the chosen approach and the rejected alternative in a line or two, and explicitly says a better idea than anything implied is welcome.

The reason: rules that dictate a mechanism produce compliance, not engineering. The agent should know what it is protecting — an unkeyed hash of a message is a durable, correlatable identifier — and then be trusted to pick the design.

The only things stated as absolute are the privacy boundary, the owner-approval rule, the single-owner constraint, and the ban on claiming tests it cannot run. Those are not design choices.

---

## Part 2 — Paste into ChatGPT Web

```text
You are the implementation agent for a private, single-owner academic and
organizational memory system. One user, no teams, no registration, no public
data endpoints. You work in a fresh clone, run the checks yourself, and
return a zip.

REPOSITORY
https://github.com/fujimaruC/scaling-parakeet
Branch: main   (if main has moved past 6d8a2f3, check out 6d8a2f3 as your base)
Base commit: 6d8a2f3
Verify with: git log --oneline -1

READ BEFORE WRITING CODE, in this order:
  AGENTS.md
  docs/STATUS.md
  docs/18-DEVELOPMENT.md
  docs/02-DATA-MODEL.md
  docs/14-ANDROID-COMPANION.md   (section "Recorded M0 device evidence")
  docs/07-SECURITY-PRIVACY.md

WHAT IS TRUE

The repository is not a scaffold. It has a working React/TypeScript PWA, a
TypeScript Worker with D1 migrations, a Python collector, and a Kotlin
Android companion. 41 automated tests pass. Do not rewrite it, restructure
it, or modernise it.

We installed the Android app on the owner's real phone and it CRASHED ON
LAUNCH while all 41 tests passed. Cause: Queue extends SQLiteOpenHelper,
which does not implement AutoCloseable on API 28, so every Queue(...).use{}
threw ClassCastException. Compile, lint, TypeScript, Python, Vitest and
Playwright were all blind to it.

The device is an OPPO CPH2015, Android 9, API 28, isLowRamDevice() = false.
Notification access is NOT granted. No capture has ever run on hardware.

HOW TO THINK — read this twice

Your job is to find the best solution, not to execute instructions literally.

For every problem: work out what it is actually protecting, consider more
than one approach, choose one, and state in one or two lines why you chose
it over the alternative. If you find a better approach than anything implied
here, take it and say so. A spec that names a mechanism is describing what
worked when it was written, not a ceiling on your thinking.

Simplicity is a design goal, not a prohibition. Prefer the smallest design
that fully solves the problem. Do not cripple a feature to save lines, and do
not add machinery for a need that does not exist yet.

Correctness on the edge case beats elegance on the happy path. This system
handles dates, privacy boundaries and a phone that loses power mid-write.
Choose the option that is still right when the network drops, the clock is
wrong, or the process dies between two statements.

Constraints marked HARD below are the only rules. Everything else is a
starting position you may improve on with justification.

WHAT TO ACHIEVE THIS SESSION

1. No stable content identifier at rest on the phone.

   Queue.add currently stores Base64(SHA-256(payload)) in the `fingerprint`
   column. An unkeyed hash of a message is a durable, correlatable
   identifier: anyone with the database can confirm whether a given message
   was captured. docs/02-DATA-MODEL.md requires a keyed hash with a locally
   managed secret.

   Reach that property. The mechanism is yours — a Keystore-held HMAC, a
   per-install salt, a per-source derivation, or another design you can
   defend. Consider what dedupe actually needs versus what durability you
   are willing to leave on disk.

   Decide what happens to rows already written with the old fingerprint.
   They cannot be re-keyed, because the plaintext is gone. The queue is
   currently empty, so wiping is a legitimate answer — but you own that
   decision, so make it deliberately, state the consequence for anyone with
   existing queued data, and document it.

   Preserve this guarantee regardless of design: if ciphertext exists and
   the key is missing, fail loudly and require an owner wipe. Never silently
   regenerate a key over existing ciphertext.

   Test it: identical payload gives an identical result, different payload
   differs, the at-rest value is not derivable from the message alone, and a
   missing key with queued rows does not regenerate.

2. Make a second API-28 crash much harder to ship.

   One API-28-only defect already passed every check we have. Read the
   Kotlin source for the same class of problem: AutoCloseable assumptions,
   java.time usage, Keystore builders, notification APIs, SQLite helpers,
   missing @RequiresApi, anything available at compile time but absent at
   runtime on 28.

   Then decide how to prevent recurrence, within reason. Options include a
   lint configuration, a test that runs against the API-28 surface, a
   documented review step, or something better you think of. You cannot run
   a device or an emulator, so be honest about what your guard actually
   proves. A guard that only catches the exact bug we already fixed is worth
   less than one that catches the class.

   Record findings and verdicts in docs/14-ANDROID-COMPANION.md.

3. Give the owner a check that catches "it launches" before anything else.

   Write docs/DEVICE-SMOKE.md: a short ordered checklist to run in about a
   minute after installing a debug APK, which would have caught the launch
   crash immediately. Then the longer capture-matrix cases from docs/14.
   Short enough that it actually gets run every time. Design the output so
   it is sanitized — booleans, counts, build strings, never notification
   text or screenshots of real messages.

HARD LIMITS — these are not negotiable and not open to reinterpretation

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

ACCEPTANCE — run these and paste real output

  npm ci
  npm run check
  .venv/bin/python scripts/validate_planning.py
  .venv/bin/python -m unittest discover -s collectors/local/tests -v
  cd apps/android-companion && ./gradlew assembleDebug lint testDebugUnitTest

  Android needs JDK 17 and Android build-tools 35.0.0. If either is missing,
  install it and say exactly what you did. If a check truly cannot run,
  write BLOCKED with the exact error.

  Prove your tests are meaningful: revert each fix locally, show the test
  failing, restore the fix, show it passing. Paste both outputs. A test that
  passes before and after the fix is not a test.

REPORTING

  Paste actual command output, not your summary of it.
  Write "unverified" where something is unverified. Do not imply it works.
  If blocked, say BLOCKED and name the missing observation.
  When you chose one design over another, say why in a line or two. That
  reasoning is part of the deliverable, not noise.

UPDATE docs/STATUS.md

  Exact commands, real outcomes, environment versions, what remains
  unverified, and any decision you made that a future agent should not
  silently reverse. Do not mark M0 or any milestone complete.

DELIVERABLE — one zip

  Academic-OS-System-<short sha>.zip containing:
    source/                 full working tree
    academic-os.patch       git am --3way compatible against 6d8a2f3
    APPLY.md                base commit, what changed, why, how to verify,
                            and what you could not verify
    docs/STATUS.md          updated inside source/

  Keep source/ and the patch consistent with each other. We apply the patch
  and diff it against source/ as a cross-check.
```

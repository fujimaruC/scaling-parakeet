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
| **1 (this prompt)** | Keyed fingerprint, API-28 audit, device smoke checklist | Cloud agent |
| 2 | Web Push subscription lifecycle + purge-status polling | Cloud agent |
| 3 | Server search/calendar pagination, localization, icon, release packaging | Cloud agent |
| 4 | Listener capture matrix, transport on device, seven-day pilot | **Us, with the phone** |

Slice 1 goes first because it closes a security contract violation and prevents the bug class that already cost us a session.

---

## Part 2 — Paste into ChatGPT Web

```text
You are the implementation agent for a private, single-owner academic and
organizational memory system. One user, no teams, no registration, no public
data endpoints. You will work in a fresh clone of the repository, run the
checks yourself, and return a zip.

REPOSITORY
https://github.com/fujimaruC/scaling-parakeet
Branch: main
Base commit: 6d8a2f3
Verify with: git log --oneline -1

READ BEFORE WRITING CODE, in this order:
  AGENTS.md
  docs/STATUS.md
  docs/18-DEVELOPMENT.md
  docs/02-DATA-MODEL.md
  docs/14-ANDROID-COMPANION.md   (read the section
                                  "Recorded M0 device evidence")
  docs/07-SECURITY-PRIVACY.md

CONTEXT YOU MUST ACCEPT AS TRUE

The repository is not a scaffold. It contains a working React/TypeScript PWA,
a TypeScript Worker with D1 migrations, a Python collector, and a Kotlin
Android companion. 41 automated tests pass. Do not rewrite it, do not
restructure it, and do not "modernise" it.

We tested the Android app on the owner's real phone and it CRASHED ON LAUNCH
while all 41 tests passed. Cause: Queue extends SQLiteOpenHelper, which does
not implement AutoCloseable on API 28, so every Queue(...).use{} threw
ClassCastException. Compile, lint, TypeScript, Python, Vitest and Playwright
were all blind to it.

Draw the correct conclusion: passing synthetic tests proves nothing about
device behaviour. You cannot test on a device. Therefore you must never
report device behaviour as verified, and you must make it harder for the
next bug of this class to reach hardware.

The device is an OPPO CPH2015, Android 9, API 28, isLowRamDevice() = false.
Notification access is NOT granted. No capture has ever been exercised.

YOUR TASK — SLICE 1 ONLY

1. Replace the unkeyed fingerprint with a keyed one.

   Current state: Queue.add stores
   Base64(SHA-256(payload)) in the `fingerprint` column.
   Required by docs/02-DATA-MODEL.md: a keyed hash using a locally
   managed secret.

   Implement HMAC-SHA256 using a key from the Android Keystore. Do not reuse
   the AES queue key directly; derive or use a separate alias. The key must
   never leave the device and must never be logged.

   You must handle rows already written with the old unkeyed fingerprint.
   You cannot re-key them, because you do not have the plaintext. Choose the
   smallest correct approach, for example a fingerprint_version column where
   new rows are v2 and legacy rows stay v1 and match only among themselves.
   Whatever you choose, dedupe must keep working for events already queued,
   and you must state the migration behaviour explicitly.

   Preserve this existing guarantee: if ciphertext exists and the key is
   missing, fail loudly and require an owner wipe. Never silently regenerate
   a key over existing ciphertext.

   Test: identical payload gives an identical fingerprint; different payload
   differs; legacy rows still dedupe against each other; missing key with
   queued rows does not regenerate.

2. Audit the Kotlin source for API-28 compatibility.

   Look specifically at: AutoCloseable implementations, java.time usage,
   Keystore parameter builders, notification APIs, SQLite helpers, and any
   API guarded by @RequiresApi or SDK_INT that is missing.

   Add a section to docs/14-ANDROID-COMPANION.md titled
   "API-28 compatibility notes" listing every finding with a verdict
   (safe / fixed / unverifiable). If you cannot add an automated guard,
   say so plainly instead of inventing one.

3. Write docs/DEVICE-SMOKE.md.

   A short, ordered checklist the owner can run in about 60 seconds after
   installing a debug APK, which would have caught the launch crash
   immediately. Then the longer capture matrix cases, taken from docs/14.
   Keep it short enough that the owner will actually run it every time.
   Use sanitized evidence only: booleans, counts, build strings. No
   screenshots of real notifications, no message text.

CONSTRAINTS

  Do not add dependencies unless the standard library genuinely cannot do it,
  and justify any addition in one line.
  Do not restructure the repository or rename modules.
  Do not push to GitHub, deploy, or provision any paid service.
  Do not include real chat data, exports, credentials, or keys anywhere.
  Keep the existing style: small, direct, no speculative abstraction.

ACCEPTANCE — you must actually run these and paste real output

  npm ci
  npm run check
  .venv/bin/python scripts/validate_planning.py
  .venv/bin/python -m unittest discover -s collectors/local/tests -v
  cd apps/android-companion && ./gradlew assembleDebug lint testDebugUnitTest

  Android requires JDK 17 and Android build-tools 35.0.0. If either is
  missing in your environment, install them and say exactly what you did.
  If a check genuinely cannot run, write BLOCKED with the exact error.

  Prove your new tests are meaningful: revert each fix locally, show the
  test failing, restore the fix, show it passing. Paste both outputs.

REPORTING RULES

  Paste actual command output, not your summary of it.
  If something is unverified, write "unverified" — do not imply it works.
  Never claim a device, account, network, or push test passed.
  If you are blocked, say BLOCKED and name the missing observation.

UPDATE docs/STATUS.md

  Add the exact commands you ran, their real outcomes, the environment
  (Node/Python/JDK/SDK versions), and anything still unverified. Do not
  mark M0 or any milestone complete.

DELIVERABLE — return a single zip

  Academic-OS-System-<short sha>.zip containing:
    source/                 full working tree
    academic-os.patch       git am --3way compatible against 6d8a2f3
    APPLY.md                what changed, how to apply, how to verify
    docs/STATUS.md          updated inside source/, not as a separate file

  APPLY.md must state: base commit, what changed, the exact commands we
  should run after applying, and what you could not verify.
```

# Verification log — what was actually run

**Purpose.** A single record of every check executed against this repository, by whom, on what, and what it does *not* prove. Written so the next agent does not re-run work or inherit an unverified assumption as fact.

**Rule for this document.** A line appears here only if the command really ran. Anything not run is marked `NOT RUN`. Synthetic results never imply device, account, network or provider behaviour.

Historical owner record through 2026-11-06, commit `c7c57c5`; later cloud checks are appended below.

---

## 1. Automated suites (this machine)

| Command | Result | Notes |
|---|---|---|
| `npm run check` | **PASS** | Includes format check, `tsc`, Vitest, PWA build, Worker dry-run |
| `npm run test` (Vitest) | **18 passed** | D1 integration tests under Miniflare/workerd |
| `npm run test:e2e` (Playwright) | **5 passed** | Ran earlier this session; **not** re-run for the Android-only slices |
| `npm run test:pwa` | **1 passed** | Compiled service worker offline reload + snapshot clear on logout |
| `.venv/bin/python -m unittest discover -s collectors/local/tests` | **23 passed** | Import, encryption, receipts, pairing, control loop, evidence projection |
| `.venv/bin/python scripts/validate_planning.py` | **PASS** | 3 schemas, 5 fixtures, 21 rejection cases, 68 links, 30 features, 34 test IDs |
| `python scripts/check_placeholders.py` | **PASS** | Common key/token formats only; not an exhaustive secret audit |

### Build output

| Artifact | Size |
|---|---|
| PWA JS | 253.27 kB → **79.75 kB gzip** |
| PWA CSS | 6.90 kB → **2.11 kB gzip** |
| Worker (dry-run) | ~82 kB gzip |

Not a performance guarantee — these are bundle sizes, not measured runtime on the 8 GB VAIO or the phone.

### Android

| Command | Result |
|---|---|
| `./gradlew assembleDebug lint testDebugUnitTest` | **BUILD SUCCESSFUL**, 5m 04s |
| `verifyApi28` (compiles all Kotlin against `android-28/android.jar`, `-no-jdk -no-stdlib`) | **PASS** |
| JVM policy tests (`QueuePrivacyTest`) | **6 passed** |
| Android lint | 0 errors; warnings: `MissingApplicationIcon`, `ApplySharedPref` ×2, `CustomX509TrustManager` |

Toolchain required: **JDK 17** (`~/.local/opt/jdk-17.0.21+9`), `ANDROID_HOME=/home/riko/Android/Sdk`, `platforms;android-28` **and** `35`, `build-tools;35.0.0`.

---

## 2. Fault-injection (mutation) checks

These prove tests actually bite: the fix is reverted, the suite must fail, then the fix is restored and must pass.

| Script | Cases | Result |
|---|---|---|
| `scripts/check_android_mutations.py` | 6 | 6 broken → exit 1, 6 restored → exit 0 |
| `scripts/check_ack_mutations.py` | 6 | 6 broken → exit 1, 6 restored → exit 0 |

**Known discrepancy.** `APPLY.md` for `4fde0c1` claims "seven deliberate faults". The script contains **six**. The seventh, `phone-order`, appears in `docs/ACK-CHECKS.md` with a genuine broken run (`testQueuePrivacy FAILED`) and restored run (6 JVM tests pass) — it was executed by hand, not scripted. The claim is true but **not reproducible from the script alone**.

---

## 3. Device evidence (owner's phone, over ADB)

Device: **OPPO CPH2015**, Android **9 / API 28**, arm64-v8a, 3.82 GB RAM, build `CPH2015EX_11_A.67`, security patch 2022-01-05.

| Fact | Value | How observed |
|---|---|---|
| `isLowRamDevice()` | **false** | Read inside the app, not inferred from RAM |
| APK install | Success | `adb install -r` |
| Launch | Stays open, `MainActivity` resumed | `dumpsys activity activities` |
| Reopen | OK | See defect 2 below |
| Fatal exceptions | **0** | `logcat` after each launch |
| Queue count | 0 | `AOS-PROBE` log line |
| Repair required | false | After database reset |
| Notification access | **false** | `settings get secure enabled_notification_listeners` |
| WhatsApp / Chrome | 2.26.42.74 / 138.0.7204.179 | `dumpsys package` |
| Free `/data` | 11 GB of 106 GB (90% used) | `df -h` |
| Timezone / locale | Asia/Makassar / en-GB | `getprop` |

### `scripts/device_evidence.py --samples 1` (after fix)

```json
{"android_api": 28, "device_model": "CPH2015", "device_build": "CPH2015EX_11_A.67",
 "version": "0.1-probe", "launch_stays_open": true, "reopen_ok": true,
 "low_ram": false, "notification_access": false, "queue_count": 0,
 "observed_gap_count": 0, "repair_required": false,
 "fatal_exception_observed": null, "install_ok": null, "apk_sha256": null,
 "source_commit": null, "repair_code": null, "owner_reset_performed": null,
 "smoke_result": "unverified", "capture": "not_run", "transport": "not_run",
 "key_loss_recovery": "not_run", "backup_exclusion": "not_run"}
```

**Still unchecked nulls:** `fatal_exception_observed`, `install_ok`, `apk_sha256`, `source_commit`. All four are mechanically checkable and none are implemented. Do not read a null as a pass.

---

## 4. Experiments that produced real findings

### Finding 1 — app crashed on launch while all tests passed

`Queue` extended `SQLiteOpenHelper`, which does **not** implement `AutoCloseable` on API 28. Every `Queue(...).use { }` threw `ClassCastException`; `MainActivity` died in `render()`.

Six call sites affected across `MainActivity`, `CaptureService`, `Transport`. Compile, lint, TypeScript, Python, Vitest and Playwright were all blind to it. Fixed by declaring `AutoCloseable` and overriding `close()`.

**Lesson that governs every later slice:** passing synthetic tests says nothing about device behaviour.

### Finding 2 — evidence tool reported a false negative

`device_evidence.py` reported `reopen_ok: false` for an app that had reopened correctly.

Controlled measurement:

| Action | Evidence tokens emitted |
|---|---|
| `am start` on an already-running task | **0** ("intent delivered to currently running top-most instance") |
| `am start -S` (force restart) | **2** |

Cause: a warm resume delivers **no new intent**, so `onResume` → `render()` re-reads the *original* intent and logs nothing. The tool demanded a fresh token and concluded failure.

Fix: force-stop before sample 1 (genuine cold start), and accept process-alive + resumed-activity for sample 2. Both samples now report true.

### Finding 3 — `pm clear` is refused on this device

`SecurityException: PID ... does not have permission android.permission.CLEAR_APP_USER_DATA`. Shell cannot clear app data on ColorOS. Uninstall + reinstall is the working equivalent.

### Finding 4 — ColorOS intercepts the first launch after install

`com.coloros.phonemanager/.FakeActivity` was the resumed activity for several seconds after reinstall; no app process existed. A second launch started it normally. **Any future launch probe must tolerate this**, or it will report a false failure.

### Finding 5 — build environment gaps

- `verifyApi28` requires `platforms;android-28`; without it the build fails with an explicit message.
- Gradle 8.11.1 / AGP 8.9.2 reject JDK 21+ and require JDK 17. The Arch `jre17-openjdk` package ships **no `javac`**; a full JDK 17 had to be provisioned.
- `git fetch`/`push` to GitHub timed out repeatedly during this session. Verification was unaffected; **publishing was**.

---

## 5. What this log does NOT establish

- No capture has ever run on hardware. `notification_access=false` for the entire session.
- No listener lifecycle, filtering, bundle dedupe, muted-preview, lock-screen, reboot, force-stop or interrupted-ack case has been exercised.
- No private-network peer, no TLS pin rejection on device, no mobile-data transfer.
- No Cloudflare Access policy, no production D1, no quota measurement, no restore into real D1.
- No 9Router provider call, no AI extraction against a real provider, no prompt-injection run against a live model.
- No Web Push delivery. In-app reminders only.
- No ITK/Moodle access of any kind.
- Playwright E2E and PWA tests were **not** re-run for the two most recent Android-focused slices.

**No milestone is complete. M0 remains PARTIAL/BLOCKED.**

---

## 6. Cloud evidence-integrity follow-up — base 43ddeea, 2026-11-06

User's explicit base 43ddeea supersedes the c7c57c5 revision in NEXT-SLICE's block. No live device was available. Historical nulls and NOT RUN entries above remain unverified; none are converted into a hardware result.

| Command | Actual result in this workspace |
|---|---|
| npm ci | exit 0 |
| npm run check | exit 0, 18 D1 tests, format/types/build/Worker dry-run |
| npm run test:e2e | 5 passed (rerun this slice) |
| npm run test:pwa | 1 passed (rerun this slice) |
| Python unittest discovery | 33 passed, synthetic only |
| scripts/check_evidence_mutations.py --output-dir ... | 9 declared faults: baseline 0, broken 1, restored 0 for every case |
| Gradle assembleDebug lint testDebugUnitTest --no-daemon | BUILD SUCCESSFUL, API-28 surface check and 6 JVM policy tests |
| Dirty-build actual APK asset inspection | source_commit=null, source_dirty=true; assertion passed |
| New adb collector / matrix harness on hardware | NOT RUN |
| Capture / listener received notification | NOT RUN; last notification_access=false; no capture has ever run on hardware |
| Account / real peer / network / push / provider | NOT RUN |

Full retained command output is in EVIDENCE-CHECKS.md. Test/fault counts come from unittest discovery and the shipped runner's CASES list, not hand-run extra faults. The mutation runner locks concurrent executions and isolates per-run Python bytecode caches, checks a passing baseline and actual test assertions, and restores source in finally. Earlier overlapping development runs contaminated a working copy; they were discarded, the production condition restored and the final suites rerun sequentially.

Existing defects found: resumed detection accepted component names anywhere in activity history; force-stop/process-absence success was not checked. Now only the actual resumed field qualifies, and warm resume must belong to the cold-run process or a fresh token. Run-bound crash markers, continuous consumption and explicit unknowns replace tail-based/inferred crash claims. Build-declared source provenance is not an independent reproducible-build attestation; unknown/dirty APKs remain null. Matrix journal signatures detect accidental editing, not a malicious owner/root holding its local key. Other capture cases remain UNVERIFIED even when prompted/run if the available sensors cannot certify their expected behavior.

Environment reused from the previous local toolchain: Java/compiler 17.0.20, Gradle 8.11.1, Kotlin 2.1.21, AGP 8.9.2; SDK platforms 28/35 and build-tools 35.0.0. Node 24.22.1, npm 11.9.0, Python 3.12.14. No new dependency or toolchain installation needed. Playwright's pinned Chromium headless shell was installed using npx playwright install chromium --only-shell. No device/emulator was started. No milestone complete.

Clean-build provenance check: actual APK asset declared source_commit=e65775873cfcf80fcd6e12b327ee6b4d91e5170d with source_dirty=false, matching that clean checkout exactly. Assertion passed after native acceptance exit 0. Later report-only commit does not change implementation. This is a local build check, NOT an installed-device observation or independent binary-source attestation. Full actual output, including all nine broken/restored runs and their clean baselines, is pasted in [EVIDENCE-CHECKS](EVIDENCE-CHECKS.md). The shipped CASES list has exactly nine faults; no hand-run extra faults are included in that count.

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
| scripts/check_evidence_mutations.py --output-dir ... | 10 declared faults: baseline 0, broken 1, restored 0 for every case |
| Gradle assembleDebug lint testDebugUnitTest --no-daemon | BUILD SUCCESSFUL, API-28 surface check and 6 JVM policy tests |
| Dirty-build actual APK asset inspection | source_commit=null, source_dirty=true; assertion passed |
| New adb collector / matrix harness on hardware | NOT RUN |
| Capture / listener received notification | NOT RUN; last notification_access=false; no capture has ever run on hardware |
| Account / real peer / network / push / provider | NOT RUN |

Full retained command output is in EVIDENCE-CHECKS.md. Test/fault counts come from unittest discovery and the shipped runner's CASES list, not hand-run extra faults. The mutation runner locks concurrent executions and isolates per-run Python bytecode caches, checks a passing baseline and actual test assertions, and restores source in finally. Earlier overlapping development runs contaminated a working copy; they were discarded, the production condition restored and the final suites rerun sequentially.

Existing defects found: resumed detection accepted component names anywhere in activity history; force-stop/process-absence success was not checked. Now only the actual resumed field qualifies, and warm resume must belong to the cold-run process or a fresh token. Run-bound crash markers, continuous consumption and explicit unknowns replace tail-based/inferred crash claims. Build-declared source provenance is not an independent reproducible-build attestation; unknown/dirty APKs remain null. Matrix journal signatures detect accidental editing, not a malicious owner/root holding its local key. Other capture cases remain UNVERIFIED even when prompted/run if the available sensors cannot certify their expected behavior.

Environment reused from the previous local toolchain: Java/compiler 17.0.20, Gradle 8.11.1, Kotlin 2.1.21, AGP 8.9.2; SDK platforms 28/35 and build-tools 35.0.0. Node 24.22.1, npm 11.9.0, Python 3.12.14. No new dependency or toolchain installation needed. Playwright's pinned Chromium headless shell was installed using npx playwright install chromium --only-shell. No device/emulator was started. No milestone complete.

Clean-build provenance check: actual APK asset declared source_commit=e65775873cfcf80fcd6e12b327ee6b4d91e5170d with source_dirty=false, matching that clean checkout exactly. Assertion passed after native acceptance exit 0. Later observer/verification changes do not alter the Android provenance producer tested by that build. This is a local build check, NOT an installed-device observation or independent binary-source attestation. Full actual output, including all ten broken/restored runs and their clean baselines, is pasted in [EVIDENCE-CHECKS](EVIDENCE-CHECKS.md). The shipped CASES list has exactly ten faults; no hand-run extra faults are included in that count.

Final observer hardening pins adb device selection and checks private in-memory boot identity. Missing identity refuses matrix collection, and stale boot cannot satisfy lifecycle evidence. Full Python discovery remains 33 tests; the shipped CASES list and final runner output now declare ten faults, each with baseline/pass, broken/fail and restored/pass. No new hardware observation was made.

---

## 7. Hardware run of the evidence tool — 2026-11-06

First hardware execution of the collector built in slice `55d268a`, on the owner's OPPO CPH2015 (Android 9 / API 28) over ADB.

```bash
.venv/bin/python scripts/device_evidence.py --apk <abs>/app-debug.apk
```

```json
{"android_api": 28,
 "apk_sha256": "beecd4e47d7968c2a9d574a4f9d14eee30cae1d0c0ed5b5cdbfa202ac1ae7f79",
 "device_build": "CPH2015EX_11_A.67", "device_model": "CPH2015",
 "fatal_exception_observed": false, "install_ok": true, "launch_stays_open": true,
 "low_ram": false, "notification_access": false, "queue_count": 0,
 "observed_gap_count": 0, "reopen_ok": true, "repair_required": false,
 "source_commit": "26d77198a772d243daafb0e5d0ac1f990ba98544", "version": "0.1-probe",
 "smoke_result": "unverified", "capture": "not_run", "transport": "not_run",
 "key_loss_recovery": "not_run", "backup_exclusion": "not_run",
 "unavailable": ["repair_code", "owner_reset_performed"]}
```

### The four previously-null fields are now observed

| Field | Value | Why it can be trusted |
|---|---|---|
| `install_ok` | `true` | Requires literal `Success` in `adb install` output, not merely an issued command |
| `fatal_exception_observed` | `false` | Continuous token-bounded crash stream; ambiguous coverage reports unknown, not false |
| `apk_sha256` | `beecd4e4…` | Pulled from the **installed** package (`pm path` + `adb pull`), then hashed |
| `source_commit` | `26d77198…` | Read from `assets/academic-os-build.json` inside the installed APK, only when `source_dirty:false` |

**Independent cross-checks performed here, not taken from the tool's own output:**

- `sha256sum` of the local built APK → `beecd4e47d7968c2a9d574a4f9d14eee30cae1d0c0ed5b5cdbfa202ac1ae7f79` — **identical** to the reported value.
- `git rev-parse HEAD` → `26d77198a772d243daafb0e5d0ac1f990ba98544` — **identical** to the reported `source_commit`.
- `adb logcat -d | grep -c 'FATAL EXCEPTION'` → **0**.
- Process alive: pid 20817; `AOS-PROBE` → `lowRam=false granted=false listener=unknown queue=0 gaps=0`.

### Capture matrix harness: fail-closed behaviour confirmed

`scripts/capture_matrix.py --apk … --output /tmp/matrix-1` was started against the phone. It created the journal directory (`0700`), wrote `local-verification.key` (32 bytes, `0600`), then stopped at the first interactive prompt:

```text
input('Case ' + case + ': Enter to begin; perform ONLY synthetic owner-controlled case. ')
EOFError: EOF when reading a line
```

This is correct. The harness requires the owner to physically perform each case; it cannot be driven headlessly, which is precisely what stops an agent from manufacturing a matrix result. The resulting `record.jsonl` is **0 bytes** and carries no `sealed` row, so `--verify` rejects it as `Incomplete journal`.

The matrix therefore has **not** produced a verdict. It remains NOT RUN.

### Still not proven by any of this

`notification_access=false`. No capture has ever run on hardware. `capture`, `transport`, `key_loss_recovery` and `backup_exclusion` are all `not_run`. `smoke_result` stays `unverified` — the tool refuses to infer a verdict from process presence, which is the correct choice.

## 8. Pixel-paper S1 foundation — base 5ae9583, 2026-11-06

Owner supplied a new design/prototype and delegated refinement. Implemented S1
only, stopping before S2 for the review checkpoint in design/UI-DESIGN-AGENT.md
§11. Original product-polish brief is not fully satisfied by this slice. Android
UI/resources/icon/accessibility, reduced native warnings and large-ledger
pagination remain outstanding. No milestone complete.

| Command / observation | Actual result |
|---|---|
| `npm ci` | exit 0; 170 packages installed |
| `npm run check` | exit 0; 20 Vitest tests (18 D1 + 2 foundation), types/format/build/dry-run |
| `npm run test:e2e` | 7 passed; existing 5 workflows plus 2 foundation browser tests |
| `npm run test:pwa` | 1 passed; offline hard reload, local display font load and logout snapshot clearing |
| `.venv/bin/python scripts/validate_planning.py` | PASS; actual output in DESIGN-S1-CHECKS |
| `.venv/bin/python -m unittest discover -s collectors/local/tests -v` | 33 passed, synthetic only |
| `.venv/bin/python scripts/check_foundation_mutations.py --output-dir ...` | 4 declared faults, each baseline exit 0 / broken assertion exit 1 / restored exit 0 |
| `cd apps/android-companion && ./gradlew assembleDebug lint testDebugUnitTest --no-daemon` | BUILD SUCCESSFUL; API-28 compile guard; 6 JVM policy tests; 0 errors, 4 warnings |
| `npx playwright test tests/e2e/foundation.spec.ts` | 2 passed; synthetic 390×844 light/dark renders inspected |
| Compiled production kit scan | PASS; development-only kit content absent from built JS |
| `scripts/check_placeholders.py`, `git diff --check` | PASS |
| New Android install, Chrome 138, TalkBack, capture, real account/provider/network/push | NOT RUN / unverified |

Retained raw command output, baseline/broken/restored faults and environment are
pasted in [DESIGN-S1-CHECKS](DESIGN-S1-CHECKS.md). Counts are discovered by shipped
suites/CASES, not manually added checks. Existing workflow selectors now follow
the secondary-page selector and short tab labels; assertions on persistence,
proposal approval, reminders and offline behavior remain intact.

### Accessibility evidence and its limits

The foundation browser checks exercise system theme changes, a persisted manual
override, local font loading with zero third-party requests on the kit, decorative
urgency, reduced-motion transition disabling, one keyboard Tab focus, and doubled
computed text sizes at 360/390/1280 widths **on the kit only**. Secondary routes
are exercised at 360px. This is not a full keyboard traversal, screen-reader test,
axe audit, contrast certification, browser text-zoom equivalence or every-screen
200% audit. These remain unverified. Screenshot inspection exposed a wrapped
“Responsibilities” bottom-tab label; shorter localized labels fixed that layout.
Current read-only screens remain the existing layouts under foundation styling,
not pixel-complete reference implementations. No visual-regression baseline has
been approved yet; images in docs/design/evidence are review captures, not a claim
of pixel equality. Existing 28px completion controls now have 44px hit areas.

Native static/lint evidence still includes MissingApplicationIcon, ApplySharedPref,
CustomX509TrustManager and SetTextI18n. Thus the original brief's “fewer warnings”
acceptance is **not met** in S1. Immediate durable credential commit and the pinned
trust manager retain existing safety reasons; do not replace them with async loss
or accept-all TLS just to remove warnings. Icon/resources/native accessibility
remain for the native follow-up; TalkBack has not run.

### Toolchain and development findings

Node 24.22.1, npm 11.9.0, Python 3.12.14. Playwright pinned headless Chromium and
FFmpeg installed (one download mirror initially returned a truncated ZIP; a
supported mirror succeeded). Existing JDK 17.0.20 modules had no compiler launcher;
restored standard module launchers in a private runtime copy and verified javac.
Downloaded Android CLI archive 12266719 and installed platforms 28/35 plus
build-tools 35.0.0 through sdkmanager. Gradle 8.11.1 was downloaded through the
configured proxy after direct resolution failed. Explicit private Gradle toolchain
properties prevent selecting the incomplete system JRE. Native build then passed.
No toolchain, signing key, APK, cache or runtime key is delivered.

Full fonts were converted losslessly to WOFF with already-installed fontTools;
WOFF2 conversion lacked Brotli, so no package was added. Bundled font assets total
487948 bytes (documented individual sizes and hashes in public/fonts/README.txt).
They are precached and licensed; production makes no Google Fonts calls. Original
prototype retains external font URLs because the owner required unchanged bytes;
it is documentation only, never served as production UI.

During development, old Settings button selectors and the kit's ambiguous implicit
Theme label caused browser failures. Selectors now follow real navigation, and
new theme selects have explicit localized accessible names (kit English label).
The mutation runner initially rejected ANSI-colored assertion output despite a
real failed expectation; it now strips ANSI before classifying failures. Finally
restoration preserved source. Final checks above are subsequent reruns, not those
failed development runs. No capture has ever run on the phone; last real access
value is false. All historical null/NOT RUN entries remain unchanged.

Archive cross-check found that git am normalizes CRLF in the upstream Pixelify
license, causing a tree mismatch. Normalized that license to LF without changing
its text; the owner-supplied reference/instruction files remain byte-identical.
The final round-trip is rerun against 5ae9583 before delivery.

---

## 8b. Hardware run against build `f68dec8`, and a defect in the crash monitor

Ran `scripts/device_evidence.py` twice against the owner's CPH2015 (API 28) with the APK built from `f68dec8`.

```json
{"android_api": 28, "device_model": "CPH2015", "device_build": "CPH2015EX_11_A.67",
 "install_ok": true, "launch_stays_open": true, "reopen_ok": true,
 "low_ram": false, "notification_access": false, "queue_count": 0,
 "observed_gap_count": 0, "repair_required": false,
 "source_commit": "f68dec82f3f1246b651f8d07efd0a38fe177ab74",
 "fatal_exception_observed": null,
 "unavailable": ["repair_code", "owner_reset_performed", "fatal_exception_observed"]}
```

The APK was later rebuilt from `56d4e1e`, and its embedded provenance now declares `56d4e1ef0359b153a0bffc6815a94e6b304b6e07` with `source_dirty:false`. The earlier build's declared commit became unreachable from `main` after the verification branch was rebased, which is why the rebuild was necessary.

### Defect: the crash monitor can never observe coverage on API 28

`fatal_exception_observed` returned `null` on both runs, and it returned `false` only once — on a build before this tool version. A `null` here means the window never opened, so the field is silently useless on this device.

Root cause, isolated by experiment:

```bash
adb shell log -t AOS-RUN "<token> START"   # marker is written, exit 0

adb logcat -d -b main -b crash -v brief -T 1 'AOS-RUN:I' '*:S'   -> 0 matches
adb logcat -d -b main -b crash -v brief      'AOS-RUN:I' '*:S'   -> 1 match
adb logcat -d -b main -b crash               'AOS-RUN:I' '*:S'   -> 1 match
adb logcat -d -v brief -T 1                  'AOS-RUN:I' '*:S'   -> 0 matches
adb logcat -d -b main -b crash -v threadtime -T 1 'AOS-RUN:I' '*:S' -> 0 matches
```

`-T 1` is the culprit, independent of buffer selection and format. `CrashWindow.start()` uses exactly that flag combination, so the live stream never sees the START marker, `started` is never set, and `feed()` discards every subsequent line — including any fatal exception.

Live-stream proof without `-T 1`: started a background `adb logcat -b main -b crash -v brief 'AOS-RUN:I' '*:S'`, then wrote START and END for a fresh token. Both markers were captured (`grep -c` → **2**).

**Why this matters:** the monitor fails safe — it returns `null`, never a false `false` — so it never fabricates a clean run. But it also never reports a real crash, which is the one job it has. During the owner's capture-matrix run every case would record `fatal_exception_observed: null`, so a crash mid-matrix would be invisible.

**Minimal fix:** drop `-T 1` from the `logcat` argument list in `CrashWindow.start()`. The monitor's own token already scopes the window, so `-T` is redundant as well as harmful.

**Not fixed here.** This session's role is architecture and verification, not implementation; the fix belongs in the next cloud package. It is listed as a required item in [NEXT-SLICE](NEXT-SLICE.md).


## 9. S2 local implementation — base 6de38fd, 2026-11-06

This is local synthetic evidence, not an owner/device/account session. Source
branch build/read-only-s2, fresh clone at 6de38fd71f5237a7eda90307fe04ba47c69d922d.
Owner-accepted S1 is preserved. S2 is ready for owner review; S3 is not started.
No milestone is complete. Full commands, real stdout/stderr and all failing /
restored fault outputs are in [S2-CHECKS](S2-CHECKS.md).

| Command | Actual result |
|---|---|
| `npm ci` | exit 0 |
| `npm run check` | exit 0; 25 Vitest: 19 D1 + 2 foundation + 4 S2, formatting/types/build/dry-run |
| `npm run test:e2e` | exit 0; 12 passed |
| `npm run test:pwa` | exit 0; 1 passed |
| `.venv/bin/python scripts/validate_planning.py` | exit 0; actual counts in S2-CHECKS |
| `.venv/bin/python -m unittest discover -s collectors/local/tests -v` | exit 0; 34 tests |
| `cd apps/android-companion && ./gradlew assembleDebug lint testDebugUnitTest --no-daemon` | exit 0; API-28 surface and 6 standalone JVM policy cases; 0 errors / 4 unchanged lint warnings |
| `.venv/bin/python scripts/check_s2_mutations.py --output-dir /absolute/synthetic/output` | exit 0; 22 baseline passes, 22 broken assertion failures, 22 restored passes |
| `node scripts/render_s2.mjs --output-dir /absolute/synthetic/output` | exit 0; 28 synthetic review captures, Chromium 141.0.7390.37 |

Environment: Node 24.22.1 / npm 11.9.0 / Python 3.12.14 / JDK 17.0.20 / Gradle
8.11.1; platforms 28/35 and build-tools 35.0.0 installed. Missing module launchers
were restored in a private Java runtime copy; setup details and native outputs
are in S2-CHECKS. No new application dependency or native source changes.

Crash-monitor fix: removed -T 1; the new process-boundary regression uses fake
streams modeling the owner's experimentally observed API-28 behavior. It observes
both token markers, excludes stale windows, and distinguishes clean vs fatal in
that model. **BLOCKED: fresh owner phone START/END/crash-coverage observation.**
Section 8's hardware fatal_exception_observed=null remains null and unverified.
notification_access=false; no listener event or capture has ever run. Historical
records above are not overwritten or upgraded by these synthetic results.

Today/Tasks/Detail read real Worker/D1 data; task-scoped history pages, actual
effective scheduler policy, precision-safe labels/grouping, owner-calendar sorting
and loaded-subset disclosure replace guesses. Unknown/approximate completed tasks
stay under Tanpa tanggal, following the explicit owner constraint. Exact times
sort by stored instant through DST rollback; no timestamp is invented for a date.
Reminder text is policy, not delivery evidence. Unknown context is unavailable,
not Personal. 401/403 clears the private read session. A failed older-history page
retains observed detail/events with explicit error and retry. Readonly preview
sheets/toasts have no canonical writes or undo. See ADR-022 / 06-UI-UX.

Accessibility: computed visible-leaf text contrast, both themes across all five
new surfaces, minimum observed ratios and sample counts are in E2E output. Ledger
targets measured at least 44×44 with 24px check boxes; modal/keyboard/Back/focus
return and simulated doubled text were exercised locally. Real TalkBack/Chrome
138, OS 200% scaling, native accessibility and full compliance remain unverified.
Review images are in [design/s2](design/s2/README.md), not approved golden renders.

Still NOT RUN/unverified: actual capture matrix, corrected evidence probe on the
phone, Keystore/SQLite interruptions, actual private-peer network/reconnect,
account/provider/push and production D1/Access. Android identity/resources/theme,
full accessibility audit, large-ledger Calendar/server-query expansion and S3–S7
remain open. No push, deploy, paid service, real messages, account credentials or
signing keys are included.


## 10. S3–S7 build-only handoff — 2026-11-07

The owner instructed the implementation agent to execute no tests and leave them
to another agent. This section records compilation only. All earlier sections
remain historical; none of their test counts certify this changed source. No
milestone is complete. See BUILD-S3-S7 for exact final command output and
S3-S7-HANDOFF for targeted verification instructions.

| Operation | Observation |
|---|---|
| Fresh GitHub clone/main | 6de38fd71f5237a7eda90307fe04ba47c69d922d |
| S2 recovery | Applied validated 48255c5 artifact patch before S3–S7 |
| npm ci --ignore-scripts | exit0, existing lockfile installed |
| ./node_modules/.bin/tsc --noEmit | exit0, no diagnostics (compiler only) |
| WRANGLER_SEND_METRICS=false npm run build | exit0, Vite build and Worker dry-run bundle |
| npm run check / Vitest / E2E / PWA / mutations | NOT RUN — owner delegated tests |
| Python tests / planning validation | NOT RUN — owner delegated validation |
| Gradle/API28/JVM/lint | NOT RUN — native unchanged in this slice |
| Browser / visual baselines / keyboard / a11y / screen reader | NOT RUN |
| Device / account / provider / private transport / push | NOT RUN / unverified |

Node v24.22.1, npm11.9.0, Python3.12.14. No new application dependency or SDK/JDK
installation. Source adds real task/review/Undo/calendar/settings/offline/PWA/
polish code, but no runtime pass is inferred from its existence or compile.
Migration0006 application is unverified. No test-count claim is made.

Source and patch packaging comparisons only establish byte/tree consistency;
they are not application tests. No new hardware fields were observed. In
particular notification_access=false, no listener event/capture ever received,
and latest fatal_exception_observed=null remain unchanged. Device defects have
escaped earlier suites; the next verifier must run the actual owner protocol
separately, without fabricating it. No push, deployment, paid provisioning or
real credentials/messages were used. Android identity/accessibility, real
large-ledger/device performance and all outstanding release gates remain open.

---

## 11. Independent verification of S3–S7 — base 6de38fd, 2026-11-07

Section 10 recorded compilation only, because the owner reserved testing for a
separate agent. This section is that agent's run, on the same tree. It adds no
feature and no source behaviour: the changes below are accessibility fixes, one
layout fix, test-assertion updates and two mutation-case repairs, all found by
running the suites against what S3–S7 actually shipped.

### What S3–S7 shipped that the build did not catch

`git diff 11a08eb HEAD -- tests/` was empty: the continuation added no test. Its
3,846 lines across 34 files passed typecheck and dry-run bundling, so nothing here was a compile
error. Six real defects surfaced only when the existing suites ran against the new
UI:

| # | Defect | Fix |
|---|---|---|
| 1 | `Preferences` save button's accessible name was the shared word `Save`, which also matched the context form on the same screen. `getByRole('button', {name:'Save'})` was ambiguous for both users and assistive tech. | Button text is now `Save timezone` / `Simpan zona waktu`. |
| 2 | `DateFields` precision `<select>` had no accessible name. | Added `aria-label={w.precision}`. |
| 3 | `QuickSheet`'s task-type button group borrowed `w.context` as its group name, so the group and the context `<select>` were both announced as "Context". | Group renamed `Task type` / `Jenis tugas`. |
| 4 | The context `<select>` inherited that collision once the group was renamed. | Context select carries its own `aria-label={w.context}`. |
| 5 | The Tools disclosure lived inside `<main key={page}>`, so every page change remounted it and silently collapsed the panel mid-session. | `<details className="shell-tools">` moved above the keyed `<main>`. Structurally a one-line move: `git diff -w` shows one deletion and one insertion. |
| 6 | After fix 5 the panel sat outside `<main>`'s horizontal padding. | `.shell-tools { padding: 0 16px; }`. |

Tests and contracts updated to match the real UI: `tests/e2e/app.spec.ts` now drives
the actual `QuickSheet`, row body buttons and S3 completion toggle, asserts a toast
never intercepts pointer events, and navigates back from the detail route before
using the shell; `tests/e2e/s2.spec.ts` records that S3 made completion and date
edits real versioned writes, and advances the paused clock past S5's 250 ms
debounce. `docs/06-UI-UX.md` states the Tools-panel rule and that the S3–S7
continuation, not the S2 slice, adds writes.

### Two mutation cases were unsound

Both were found by running the suite, not by reading it.

- `undated-filter` was an equivalent mutation: flipping its condition changed no
  observable behaviour, so no test could ever fail. Replaced with `undated-scroll`,
  which flips the condition that keeps the no-date row visible and is caught by the
  existing "keeps partial" test (`toBeInViewport`, line 441).
- `toast-hit-testing` pointed at a read-only S2 route, which renders no toast at
  all, so the mutation could not bite. The assertion it needed did not exist. Added
  a real `document.elementFromPoint` hit test at the toast centre to
  `app.spec.ts`, and repointed the case at it. Proven both ways: baseline
  `1 passed` exit 0; broken (`pointer-events: auto`) failed with
  `Expected: false / Received: true` at line 102, exit 1; restored exit 0.

No assertion was weakened to make a case pass. The approval and privacy guards are
untouched.

### Results actually observed on this tree

| Command | Result |
|---|---|
| `npm run check` (lint → typecheck → Vitest → build) | **exit 0** |
| `npm run lint` (prettier) | exit 0, all matched files conform |
| `npm run typecheck` (`tsc --noEmit`) | exit 0, no diagnostics |
| `npm test` (Vitest) | **25 passed**, 3 files |
| `npm run test:e2e` (Playwright) | **12 passed** (1.0m), 3 files, including the new toast hit test |
| `scripts/check_s2_mutations.py` | **PASS: 22 broken assertion failures; 22 restored passes; sources restored** — 66/66 logs, 0 non-zero baselines, 0 surviving mutations |
| `.venv/bin/python -m unittest discover -s collectors/local/tests` | **34 tests, OK** |
| `.venv/bin/python scripts/validate_planning.py` | **PASS**: 3 schemas, 5 fixtures, 21 rejection cases, 84 links, 30 features, 34 test IDs |
| `npx playwright test --list` | 12 tests in 3 files, all specs parse |

A first `npm run lint` returned exit 2 with "JSON parse failed" — that was the
output-condensing wrapper failing to parse ESLint output, not the linter. Re-run
through `rtk proxy` it returned exit 0; the direct result is what is recorded.

### What this does not establish

- **Not re-run:** `npm run test:pwa` on this tree, and Gradle
  `assembleDebug lint testDebugUnitTest`. The Android app source is byte-identical
  to 6de38fd (`git diff --name-only 6de38fd HEAD -- apps/android-companion` is
  empty); only `collectors/local/tests/test_device_evidence.py` changed, and its
  suite ran above. Skipping the Gradle rebuild is a scope decision, not a result.
- **Device behaviour is unverified.** `adb devices` reported 0 devices each check
  and `enabled_notification_listeners` did not include the Academic OS package
  throughout. No listener event, capture, queue interrupt, remote recovery or
  low-RAM lifecycle was observed. Synthetic suites cannot substitute for these.
- **Not attempted:** visual review, screen-reader/TalkBack pass, real
  provider/account/D1/Access, physical Web Push, production large-ledger
  performance.
- Migration 0006 application is still unverified.

---

## 12. Device smoke on hardware — 2026-11-07

Real run on the owner's phone over ADB, not an emulator and not a simulation. This
follows the one-minute protocol in [DEVICE-SMOKE](DEVICE-SMOKE.md) and executes only
install, cold launch, background/reopen and the permission-status read. It does not
grant notification access and does not touch any conversation.

Device: OPPO CPH2015, Android 9 / API 28, build `CPH2015EX_11_A.67`.
Command: `.venv/bin/python scripts/device_evidence.py --samples 2 --apk apps/android-companion/app/build/outputs/apk/debug/app-debug.apk`

| Field | Observed | How it was checked |
|---|---|---|
| `install_ok` | **true** | `adb install -r` returned Success, and the pulled installed APK matches the built one |
| `apk_sha256` | `3b6d2011731221f7c89899e6338e08bd036eea941ba5e098db25f49c557a2ba7` | Independent `adb pull` of `pm path` output, `sha256sum` both sides: identical |
| `source_commit` | `d7484799e5fa65536a0b47225059ff176590a160` | Read from the installed APK's `assets/academic-os-build.json`, `source_dirty:false` |
| `launch_stays_open` | **true** | Force-stop, then cold `am start`; process alive and `mResumedActivity` is `MainActivity` |
| `reopen_ok` | **true** | Home keyevent, relaunch; process alive, activity resumed |
| `fatal_exception_observed` | **false** | Tool's bounded marker-scoped window, cross-checked independently: `adb logcat -d -b crash` contains one `FATAL EXCEPTION`, its `Process:` line names `com.coloros.mcs` (a ColorOS system process), and **zero** crash blocks name `id.academicos.companion` |
| `notification_access` | **false** | `settings get secure enabled_notification_listeners` does not list the package |
| `low_ram` | false | Reported by the app in its own evidence line |
| `queue_count` | 0 | Reported by the app; database is readable, no repair prompt |
| `observed_gap_count` | 0 | Reported by the app |
| `repair_required` | false | No legacy-wipe prompt appeared; unlike the 2026-11-06 run, which was blocked |
| `capture` / `transport` / `key_loss_recovery` / `backup_exclusion` | `not_run` | Out of scope for the one-minute smoke |

Tooling note: the second sample reports `install_ok: null`. That is by design — the APK is
passed only on the first sample — and it is listed under `unavailable`, not as a failure.
`smoke_result` is hard-coded `unverified` by the tool and stays that way.

### What this proves

Install, cold launch, background/reopen, and the permission-status screen all work on
API 28 hardware for a build at `d748479`. The app runs with a readable database and no
repair state, and produced no fatal exception during the observed window. The earlier
`AutoCloseable` launch crash and the `-T 1` marker defect both stay fixed under real
conditions.

### What this does NOT prove

- **No listener event has ever been received.** `notification_access` is false, so the
  notification listener has never run. Capture, filtering, deduplication, queue durability,
  retention, restart survival and interrupted-ack recovery are all still unverified. This
  run cannot substitute for them and does not.
- The APK was built at `d748479`. Source at `d748479` contains no Android changes after
  that point, so `git diff --stat d748479 HEAD -- apps/android-companion` is empty and the
  binary correctly represents current native source. Web changes after that commit are not
  in the APK and are not claimed to be.
- One smoke run is not the capture matrix. `docs/DEVICE-SMOKE.md` and
  [14](14-ANDROID-COMPANION.md) remain the protocol for that.
- No emulator was used, so this result carries no claim beyond this physical device on this
  vendor build.

---

## 13. Native Android implementation — base 6bbfa26, 2026-11-08

Implementation session; no device or account. Fresh main clone verified
`6bbfa26 docs: add the native migration plan and the implementation brief`.
A workspace restart removed earlier transient work. The durable INPROGRESS
checkpoint was restored, fixes reconstructed, and all outcomes below are retained
reruns. Earlier missing logs are not counted as verification for this handoff.

### What changed

Native Today, Tasks, detail, Review, Calendar, Settings, full editor and
quick/date/proposal panels, plus a separate Capture entry; real shared Worker
reads/CAS writes, explicit review/Undo, encrypted observations/drafts, immutable
online-request recovery, ID/EN/resources/themes/fonts/icon and accessibility
controls. Migration 0007 and protected enrollment/admin implement accepted A/B/C.
No dependency added. PWA retained. CaptureService, Queue and Transport source are
unchanged from the base; their old real-device smoke does not verify this UI.

The standalone API-28 compiler now receives generated application R constants,
with full coverage/no-JDK flags preserved and an added source-inventory assertion.
Context/source creation and reminder-policy updates gained shared idempotency
receipts. A discovered snooze replay defect is fixed: receipt lookup precedes
checking a possibly expired requested time. Explicit native confirmation replaces
the web prototype's committing swipe; a date edit/draft/keypress/default target
never approves. Receipt/form/journal cleanup is transactional. Authentication loss
retains a non-content uncertain-send warning and clears the sensitive ledger,
without clearing the raw queue or pairing.

### Exact commands and retained outcomes

Complete stdout/stderr, including deliberate broken/restored runs, are under
[native-checks](native-checks/README.md). [NATIVE-CHECKS](NATIVE-CHECKS.md) explains
scope and exclusions; [NATIVE-OWNER-RUN](NATIVE-OWNER-RUN.md) is the owner checklist.

| Command | Actual result |
|---|---|
| `npm ci --ignore-scripts` | exit 0; 170 packages from the existing lockfile |
| `npm run check` | exit 0; 36 Vitest tests, Prettier, TypeScript, PWA and Worker dry-run build |
| `npm run test:e2e` | exit 0; 12 PWA browser tests (35.9s), local synthetic backend |
| `npm run test:pwa` | exit 0; 1 built-PWA offline/logout test (6.5s) |
| `.venv/bin/python -m unittest discover -s collectors/local/tests -v` | exit 0; 40 tests (1.501s), synthetic data |
| `./gradlew clean assembleDebug lint testDebugUnitTest verifyApi28 --console=plain --no-daemon -Dorg.gradle.java.home=/workspace/scratch/bbff8dae2870/native-toolchain/jdk -Dorg.gradle.java.installations.paths=/workspace/scratch/bbff8dae2870/native-toolchain/jdk -Dorg.gradle.java.installations.auto-detect=false` | exit 0; BUILD SUCCESSFUL in 43s; all-source API28, 6 existing QueuePrivacy plus 5 new NativePolicy standalone JVM cases |
| `GRADLE_USER_HOME=/workspace/scratch/bbff8dae2870/native-toolchain/gradle python scripts/check_native_mutations.py --output-dir /workspace/scratch/bbff8dae2870/native-logs/mutations --java-home /workspace/scratch/bbff8dae2870/native-toolchain/jdk --android-home /workspace/scratch/bbff8dae2870/native-toolchain/sdk` | exit 0; 10 intended failures and 10 restored passes; exact source restored |
| `.venv/bin/python scripts/validate_planning.py` | exit 0; planning artifacts only; full actual output retained |
| `.venv/bin/python scripts/check_placeholders.py` | exit 0; common private-key/provider-token pattern scan |
| `/workspace/scratch/bbff8dae2870/native-toolchain/sdk/platform-tools/adb devices -l` | exit 0; no attached devices, inventory only |

Gradle first passed in the workspace on the recovered source. A later full rerun
failed deleting its generated Kotlin output directory (log retained). The final
run used unchanged code commit d2f24e4 in a detached `/tmp/academic-os-native-final`
checkout, the same SDK/JDK and the same checks. No rule was narrowed. Isolated
lint reports **0 errors / 2 warnings**: existing Transport ApplySharedPref and
CustomX509TrustManager. Their persistence/pinning reasons are retained. The old
empty v26 icon folder warning is absent in the tracked-source isolated checkout.
API deprecation/compiler and future Gradle9 notices are not hidden.

Environment: Node24.22.1/npm11.9.0/Python3.12.14; OpenJDK17.0.20, Gradle8.11.1,
Kotlin2.1.21/AGP8.9.2. Missing standard JDK launchers were recreated from installed
modules in a private JDK copy. Official CLI archive12266719 and sdkmanager
installed platforms28/35, build-tools35.0.0/platform-tools. Nested platform
archive roots normalized. JAVA_HOME alone is insufficient for the bare-java
wrapper; PATH and Gradle Java properties were explicit. Existing locked Python
requirements were installed in a fresh venv. SDKs, caches and signing keys are
excluded from delivery.

### Limits that remain facts

No native UI instrumentation, device, account, provider, private transport or push
run. PWA 360px/200%/contrast evidence applies to PWA, not Android. Native TalkBack,
48dp hit testing, long-text layout, focus/keyboard, reduced motion, fonts/theme,
rotation, process death, Keystore/SQLite/disk failure, signing/update, backup
exclusion and actual HTTPS/PATCH are **unverified**. Production Access path
precedence/aliases, quotas, enrollment/revoke/expiry and D1 migration0007
application are **BLOCKED** on missing account observations.

The previous owner's d748479 smoke remains historical, not this APK's result.
Notification access is last observed false. **No listener event or capture has
ever occurred.** The capture matrix, private remote transport, source-generation
recovery on hardware, laptop-off action delivery, provider consent operation,
physical push and pilot remain unverified. No milestone is marked complete.

---

## 14. Verification of the native handoff `0b0b4c6` — 2026-11-08

Independent re-run of `Academic-OS-System-0b0b4c6.zip` on the owner's machine.
The delivery claims base `6bbfa26` and source snapshot `0b0b4c6`; this section
records what was reproduced here, not what the delivery asserts.

### Application and tree

| Check | Result |
|---|---|
| `git am --3way` on `6bbfa26` | **exit 0**, 5 commits applied, HEAD `44a9a50` |
| Resulting tree hash | **`660ae8fdaac4bf3b8f5f411d71a7f7c065c997c6`** — exact match to APPLY.md |
| Applied tree vs zip `source/` | **identical**; `diff -rq` differences are build artifacts only (`node_modules`, `dist`, `.gradle`, `build`, `__pycache__`, `test-results`, `local.properties`) |
| Authorship of the 5 commits | `Codex <codex@openai.com>` ×4, `Codex <codex@local.invalid>` ×1 |

### Suites actually run here

| Command | Result |
|---|---|
| `npm run check` | **exit 0**, 36 Vitest tests in 4 files (prettier, tsc, Vite + Worker dry-run) |
| `npm run test:e2e` | **exit 0**, 12 passed (1.7m) |
| `npm run test:pwa` | **exit 0**, 1 passed (7.3s) |
| `python -m unittest discover -s collectors/local/tests` | **exit 0**, 40 tests OK |
| `python scripts/validate_planning.py` | **exit 0**: 3 schemas, 5 fixtures, 21 rejections, 98 links, 30 features, 34 test IDs |
| `python scripts/check_placeholders.py` | **exit 0**, common private-key/provider-token patterns only |
| `./gradlew clean assembleDebug lint testDebugUnitTest verifyApi28` | **BUILD SUCCESSFUL in 6m 23s**, 54/54 tasks executed |
| `scripts/check_native_mutations.py` | **PASS: 10 intended failures; 10 restored passes. Source restored** |
| `adb devices` | **0 devices** — no install, launch or `AOS-PROBE` observation |

Lint reports **0 errors / 2 warnings**, both pre-existing in `Transport.kt`:
`ApplySharedPref` and `CustomX509TrustManager`. The JVM policy suites report
`Queue privacy policy: 6 tests passed` and `Native policy cases: 5`.

Mutation-log count, because it looks wrong at first glance: the runner executes
**one baseline per task group**, not per case (`if task not in checked`). Three
groups — `verifyApi28`, `testNativePolicy`, `worker` — give 3 baselines plus
10 broken plus 10 restored = **23 logs**, which is exactly what was produced.
0 survivors, 0 non-zero baselines. An expectation of 30 was my own error, not a
gap in the runner.

### Artifact identity

| Field | Observed |
|---|---|
| APK SHA-256 | `2ff7c83affb211b7334b489ce979b93fd63474fd2c434b5a6464a6d43e18bf2a` — exact match to APPLY.md |
| APK size | 3,295,710 bytes — exact match |
| Embedded build manifest | `{"source_commit":"d2f24e44827313f3f615ee5598411bad2d298f4d","source_dirty":false}` |
| Package | `id.academicos.companion`, versionCode 2, versionName `0.2-native-preview` |
| SDK | min 28, target 35, compile 35 |
| Signing | `CN=Android Debug` — not the owner's release identity |

### Code claims checked by reading

- `/api/device/v1/*` exists with `enroll`, `enrollment` and `session` (DELETE) routes.
- `device-auth.ts:38` rejects **any** `Origin` on the device namespace; `index.ts:771`
  still compares browser writes against `url.origin`. The asymmetry is correct.
- `/owner-devices` (page at :658, API at :777) sits behind `authorize()` and the
  same-origin branch. I first suspected it bypassed that branch; tracing the
  control flow showed it does not.
- `0007_owner_clients.sql` exists, storing only grant and credential hashes.
- Eight page branches: today, tasks, detail, review, calendar, settings, sources,
  history, reminders. `NativeForms.kt` provides quick, date, editor, proposalEditor
  and proposalDate.
- 1,605 Kotlin lines under `src/main/java`, 8 files in `ledger/`.
- `res/font/inter.ttf` and `pixelify.ttf` ship with both OFL licence files.
- `verifyApi28` gained a real guard: `check(production == checked)` fails the build
  if production Kotlin sits outside `src/main/java`.
- `CaptureService.kt`, `Queue.kt` and `Transport.kt` are **byte-identical** to
  `6bbfa26`, so the earlier device smoke does not describe this UI.
- **No dependency added**: every `package.json` and `package-lock.json` unchanged;
  no `dependencies` block in the Android module.
- The PWA is untouched and the Worker still serves `apps/web/dist`.
- The shipped mutation runner is byte-identical to the one in `source/`.

### What this does not establish

- **APK provenance cannot be diffed.** APPLY.md says the final build used code
  commit `d2f24e44`, with only documentation added afterwards. That commit is not
  present in this repository and the build ran in an ephemeral checkout, so the
  embedded string matches the claim but the code behind it cannot be compared.
- **No device observation of any kind.** Nothing was installed. Signature
  compatibility with the owner's existing install is unknown; the APK is
  debug-signed and APPLY.md warns an in-place update may fail without the original
  key. Do not uninstall or clear app data to work around that.
- Real enrollment, Cloudflare path isolation, D1 migration 0007 application,
  HTTPS behaviour on device, Keystore/SQLite/power-loss recovery, TalkBack,
  200% text, and the capture matrix all remain unverified.
- `notification_access` remains false. No listener event or capture has ever run.

---

## 15. Owner signing and device-evidence preparation — base e7417ce, 2026-11-08

Fresh clone/fetch plus GitHub API confirmed main
`e7417ce5db47e9ab16cb7bd24bc17827a4885a67`. Read §14, NATIVE-OWNER-RUN,
DEVICE-SMOKE, PLAN-NATIVE, STATUS and AGENTS before implementation. Scope
F08/F22/F24: safe owner update, observation integrity and the next real native
run. The native app is already implemented/verified locally by §14; it was not
rewritten, rebuilt or retested as a device app here. No dependency, native UI,
Worker, Origin guard, approval rule or API-28 guard changed. No push/deployment,
paid service, account, provider or phone test.

### Implemented

- `scripts/apk_safety.py` inspects candidate/installed APK certificates using the
  owner's existing SDK35 aapt/apksigner. It rejects mismatched/unverified signers,
  wrong packages, unknown inventory and retained-data records without a readable
  APK. A genuine first-install state is distinct from an unknown/mismatched
  existing install. `device_evidence.install` repeats this guard before install-r.
  No uninstall/clear/downgrade/permission grant or app-data backup exists.
- `scripts/owner_device_run.py` requires an owner terminal, first checks signing,
  reads back the intended APK and reuses the cold/warm smoke and live crash
  monitor. Each manual case also binds to that requested APK and boot interval.
  It saves an atomic private JSON after every stage, with fixed codes/counts/
  booleans and build identity only. Skipped/unavailable/interrupted cases do not
  acquire successful owner answers. Native observations are owner-reported,
  separate from instrumented fields; there is no overall PASS. The tool cannot
  defend against a malicious owner/root editing its code or report and does not
  claim such an attestation. Capture matrix startup also now rejects headless
  input before creating its journal.
- A false/missing installation acknowledgment or installed-byte readback stops
  before launching the old app. Crash coverage now has separate started/ended/
  complete fields. A missing marker or ambiguous attribution never means clean.

### Existing defects found, and what was already correct

Two parser defects were demonstrated before fixing them:

1. A token-looking substring in a different log tag could open/close the crash
   window. Markers now require the exact AOS-RUN/tag/PID/token protocol.
2. Reusing a PID after an earlier owner Process line could label another app's
   fatal as this app's crash. Conflicting process identities now become unknown,
   not a false positive or a clean window.

The initial regression command ran three cases: two assertion failures, one
pass. **Unattributed native-fatal handling in the unpadded fixture was already correct** and remains
covered; it is not a third defect fix. Full before-fix output is retained.
Legacy sampler/matrix entrypoints could also continue testing the old install
after a requested update was unconfirmed. Two added regressions failed before
fixing those entrypoints and now pass: they stop before further samples/cases.
Additional brief-format regressions exposed padded-tag gaps: strict markers
must allow formatting whitespace, and padded native-fatal/chatty tags must not
escape detection. Those three tests fail before correction and pass afterwards;
the live reader-thread model now also emits padded markers. These are format/
process-boundary models, not an observed OPPO log stream.
The existing warm-resume process/foreground logic and no-`-T 1` live logcat
command remain. Their process-boundary regression still runs. Reader threads
must finish before a window can be certified complete; unknown coverage is
never silently converted into fatal_exception_observed=false.

### Commands actually run (all local/synthetic)

Complete stdout/stderr and individual broken/restored logs are in
[owner-evidence-checks](owner-evidence-checks/README.md).

```text
.venv/bin/python -m unittest discover -s collectors/local/tests -v
Ran 66 tests in 1.651s
OK

.venv/bin/python scripts/check_owner_safety_mutations.py --output-dir <local-dir>
PASS: 7 intended failures; 7 restored passes; 0 survivors; working tools untouched.

.venv/bin/python scripts/check_evidence_mutations.py --output-dir <local-dir>
PASS: 10 intended failures; 10 restored passes; 0 survivors; working tools untouched.
```

The 66 tests comprise the previous40 and26 new owner-safety regressions. The new
fault runner declares7 faults, with one baseline plus7 broken plus7 restored
runs (15 logs). The existing **evidence** mutation runner declares10 faults,
with one baseline plus10 broken and10 restored runs (21 logs). These are not the prior native
Gradle mutation suite, and no Android runtime is used. Failure reasons must be
assertions; an unexpected runtime/import failure is rejected. Faults run in private temporary fixture copies; those copies restore exactly
in finally and the actual working tools are never mutated. Earlier development
runs revealed that shared-folder fault injection could leak a transient mutant
through workspace synchronization. Both runners now avoid that failure class by
staging only the required scripts/tests outside the working tree. The before-fix parser log has two failures, not three.

Python3.12.14. Existing locked Python requirements were installed in a fresh
venv; no package/dependency declaration changed. Planning validation and the
placeholder scan also ran; their exact outcomes are retained alongside the
logs. No SDK/JDK was installed or executed for APK inspection in this session.
SDK output is modeled in unit tests, not claimed verified on the phone.

NOT RUN here: npm/Vitest, browser/PWA tests, Gradle/verifyApi28, actual apksigner/
aapt, APK install/readback/launch, enrollment, any cloud/Access/D1/provider/push
check. These app suites remain the separately verified §14 baseline; application
source and build configuration are byte-identical to it. The new scripts do not
extract credentials or make account requests.

### Owner handoff and remaining observations

Run [OWNER-DEVICE-SESSION](OWNER-DEVICE-SESSION.md), starting with
[SIGNING-SAFETY](SIGNING-SAFETY.md), and return only its sanitized JSON. Use
[NATIVE-CLOUD-CHECK](NATIVE-CLOUD-CHECK.md) for exact account observations/failure
conditions. GUI pending state alone does not prove server-side pending denial;
server expiry cannot be proven by changing the phone clock. All absent real
observations remain unverified. If signing keys are unavailable, keep the
existing install intact. No uninstall/clear fallback is offered.

The new native task application has no real-device observation. Older companion
smokes remain historical, not proof for this APK. Notification access remains
last recorded false; no listener event or capture has ever occurred. No milestone
is complete. Actual device-discovered application defects can only be fixed once
the owner supplies a real run; none is invented or claimed resolved in advance.

## 16. Independent re-verification of `ebfb6ca` on the owner machine — 2026-11-08

Received `Academic-OS-System-ebfb6ca.zip` (newest of the delivered archives, 350
files, includes `START-HERE.md`/`APPLY.md`/`academic-os.patch`). Applied the
patch with `git am --3way` on branch `owner-evidence` from base `e7417ce`; the
resulting commit is `6db80bf` and its tree hash is
`e2694f2f99a0095a08190a4a856ec0c3cf20500d`, identical to the archive's declared
tree. `diff -rq` of `source/` against the checkout reported no differences
outside generated build/cache directories.

Everything below was run on this machine, not copied from `APPLY.md`.

```text
.venv/bin/python -m unittest discover -s collectors/local/tests
Ran 66 tests ... OK

.venv/bin/python scripts/check_owner_safety_mutations.py --output-dir <local>
PASS: 7 intended failures; 7 restored passes; 0 survivors; working tools untouched.

.venv/bin/python scripts/check_evidence_mutations.py --output-dir <local>
PASS: 10 intended failures; 10 restored passes; 0 survivors; working tools untouched.

.venv/bin/python scripts/check_s2_mutations.py --output-dir <local>
PASS: 22 broken assertion failures; 22 restored passes; sources restored.

.venv/bin/python scripts/validate_planning.py
PASS: 3 schemas; 5 valid fixtures/date variants; 21 rejection cases; 110 local
links; 30 features; 34 test IDs.

.venv/bin/python scripts/check_placeholders.py
PASS: no common private-key/provider-token formats found.

npx tsc --noEmit                     exit 0
npx prettier --check <all sources>   exit 0, 0 warnings
npx vitest run                       4 files / 36 tests passed
npm run build                        web + worker, wrangler dry-run exit 0
npx playwright test                  12 passed (58.3s)
npm run test:pwa                     1 passed (12.8s)
```

Android, with the pinned toolchain (`jdk-17.0.21+9`, SDK 35, build-tools
35.0.0): `./gradlew testDebugUnitTest lint --no-daemon` → `BUILD SUCCESSFUL in
3m 46s`, 6 queue-privacy and 5 native-policy JVM cases, lint clean. Node 26.12.0,
npm 12.2.1, Python 3.14.8 (.venv), Gradle 8.11.1.

### Real SDK inspection of real APKs (no device)

The new `apk_safety.certificate`/`check_update` were run against genuine
`apksigner`/`aapt` output rather than only the modeled unit fixtures:

- locally built `app-debug.apk` → package `id.academicos.companion` ok, cert
  `f45696913edb824a924976ad5c3e2628ed1b35293dce3ab956fb76ea59bd03c9`,
  `candidate_ephemeral: false`.
- previously delivered `Academic-OS-debug.apk` → cert
  `3b761748…6e3838`, `candidate_ephemeral: true`, confirming the hard-coded
  `EPHEMERAL_CERT` constant matches the real artifact.

Both stopped at `PACKAGE_STATE_UNVERIFIED` because `adb devices` lists no
attached phone, and `owner_device_run.py --preflight` exited 2 with
`DEVICE_NOT_IDENTIFIED`. That is the fail-closed path working, not a pass:
signing compatibility with the installed app is still unknown.

### One defect found and fixed here

`device_evidence.collect` assigned `safe['unavailable']` twice (once inside the
`finally`, once after it). The second assignment made the in-`finally` value
dead. Removed the duplicate; no behaviour change, all suites re-run after it.
This was the only duplicated statement found when scanning the new files.

NOT RUN: any device, install, readback, launch, notification capture,
enrollment/activation/revocation, Cloudflare/Access/D1/provider/push check. No
APK was rebuilt for the phone and no signing key was touched. Notification
access remains last recorded false; no listener event has ever occurred. M0 and
all release gates remain incomplete.

## 17. First real run of the native APK — CPH2015 / API 28, 2026-11-09

The owner connected the OPPO CPH2015 over USB. `adb devices` reports
`W4BI7L6SHQW879SG`, model CPH2015, Android 9 / API 28, build
`CPH2015EX_11_A.67` — the same phone as §12, but a different APK.

### What was on the phone before

`versionCode=1`, `versionName=0.1-probe`, commit `d748479`, sha256 `3b6d2011…`,
`firstInstallTime` 2026-11-06 15:42:03. Notification access was **not** granted;
the only enabled listener was Google's. A baseline `device_evidence.py` run
recorded `queue_count=0`, `low_ram=false`, `launch_stays_open=true`,
`reopen_ok=true`.

### Signing preflight (read-only)

```text
owner_device_run.py --sdk $ANDROID_HOME --apk app-debug.apk --preflight
{"allowed": true, "candidate_ephemeral": false, "candidate_package_ok": true,
 "error_code": null, "package_present": true, "signature_match": true}
```

Same signing identity as the installed app, so an in-place update was permitted.
No uninstall, clear, permission grant or downgrade ran.

### Install and smoke

```text
device_evidence.py --apk app-debug.apk --sdk $ANDROID_HOME
install_ok: true            version: 0.2-native-preview
source_commit: 44a9a50      apk_sha256: 2388355d…
launch_stays_open: true     reopen_ok: true
queue_count: 0              repair_required: false
notification_access: false  android_api: 28
```

`firstInstallTime` stayed 2026-11-06 15:42:03 while `lastUpdateTime` moved to
2026-11-09 07:30:24, confirming an in-place update rather than a reinstall.
`capture.db` from 2026-11-06 survived and `owner-ledger.db` was created — no
app data was lost.

### Defect found on the first real run, and fixed

That first run returned `crash_coverage_complete: false` with
`fatal_exception_observed: null` on a launch that was otherwise clean. The cause
was the monitor's chatty rule: **any** `I/chatty` line was treated as lost
coverage. ColorOS emits these constantly for tags the monitor never subscribes
to, for example:

```text
I/chatty  ( 1275): uid=1000(system) InputDispatcher identical 1 line
I/chatty  ( 2010): uid=10016(com.google.android.gms) lowpool[1249] identical 2 lines
```

On this device the coverage verdict could therefore never be `true`, so every
future run would have been reported as unverified. The rule now attributes
suppression to its owner: only our own package's monitored tags (`AOS-RUN`,
`AndroidRuntime`, `DEBUG`, `libc`) count as lost evidence, and unparsable lines
or our own unnamed suppression still fail closed.

Four regression tests were added and were confirmed to fail against the previous
rule (`None is not False`) before passing. After the fix the same real-device
run reports:

```text
crash_coverage_complete: true   crash_window_started: true   crash_window_ended: true
fatal_exception_observed: false launch_stays_open: true      reopen_ok: true
```

This is the first `fatal_exception_observed: false` backed by a **complete**
window on the new native app. §12's earlier false was from the probe build and a
different (defective) coverage rule.

Local re-checks after the change: Python discovery 70 pass; owner-safety
mutations 7 intended failures / 7 restored; evidence mutations 10 / 10; planning
validation and Prettier unaffected.

### Still not observed

Notification access remains false and **no listener event or capture has ever
occurred**. Install/readback/launch/reopen and clean-window coverage are now
evidenced for this APK; capture, filtering, queue durability, restart survival,
interrupted-ack recovery, transport, enrollment/activation/revocation, cloud
path isolation, provider and push remain unverified. `smoke_result` stays
`unverified` because the interactive owner session has not run. No milestone is
complete.

## 18. Live listener, pairing and filter check on the CPH2015 — 2026-11-09

Owner connected the phone and authorised terminal-driven interaction. Everything
below is real-device output; no notification body, title, group name or message
text is recorded in this file or in any tool output.

### Listener grant — explicit deviation, recorded

`DEVICE-SMOKE.md` says not to automate an access grant. The owner instructed that
the grant and the checks be driven from the terminal, so it was enabled with:

```text
adb shell cmd notification allow_listener id.academicos.companion/.CaptureService
```

This is a real OS permission transition, not a bypass of a privacy setting, and
the listener still receives only `com.whatsapp` events. It is recorded here as an
owner-authorised deviation so it is not mistaken for the documented owner-tap
procedure. `settings get secure enabled_notification_listeners` then contained
the component and `dumpsys notification` listed it under allowed listeners.

First observation of the whole project: the listener **connected**.
`health.xml` → `listener=connected`.

### Lifecycle recovery observed

```text
disallow_listener → health.listener=disconnected   (reported 1794182818660)
allow_listener    → health.listener=connected      (reported 1794182822336)
```

Grant count returned to 1 after the cycle. The service reconnected on its own
without an app restart.

### Pairing against a local TLS receiver

A loopback receiver was started on this machine (`--receiver`, TLS 1.2+, private
bind, pinned cert) and reached from the phone through `adb reverse`. The phone
paired through the Capture screen; the sealed config lives in
`private-pairing.xml` (562 bytes, one `config` entry; contents never printed).

Receiver-side proof:

```text
devices  1      nonces  5      receipts 0      evidence 0
```

`nonces` records HMAC-verified device requests, so TLS, certificate pinning,
hostname checks and per-request signing all completed on real hardware. The
device is stored unrevoked against source generation 1.

**Scope limit:** this path is USB `adb reverse` to a loopback listener. It is not
the private-network transport (no VPN, no private address, no mobile data), so
transport-over-network, laptop-off queueing and receipt-after-commit remain
unverified.

### Filter check (negative)

The mapping was set to a synthetic, deliberately non-matching pair
(`AOS_SYNTHETIC_SELF_TEST` / `0|com.whatsapp|g:aos_synthetic_test`) and capture
was enabled. The listener was then cycled, which makes `onListenerConnected`
replay every active notification into `capture()`.

```text
individual com.whatsapp notifications present: 28
queue_count after replay: 0
observed_gap_count: 0
```

So unselected conversations were not persisted. This is the negative half of
T09 on real hardware. It does **not** prove the positive half: no notification
matching a selected conversation was ever captured, because `capture()` accepts
only `com.whatsapp` and API 28 has no way to inject a synthetic notification for
that package. Pointing the mapping at a real conversation would have persisted
real message text, which the contract forbids.

### Where capture stands

No listener event has been captured yet. `capture` and `transport` remain
`not_run` in the tool's own record. The positive path needs one owner-controlled
WhatsApp self-chat message; it was not fabricated and is not claimed.

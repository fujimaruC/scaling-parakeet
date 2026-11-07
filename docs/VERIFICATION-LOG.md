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

# S2 actual local check output — base 6de38fd

Fresh clone, build/read-only-s2, 2026-11-06. All application data is synthetic.
Terminal ANSI control codes and trailing display padding are removed below; command
output is otherwise retained. Each final acceptance command exited 0. The build
uses Wrangler **dry-run only**; no deployment or account access took place.

Environment: Node 24.22.1, npm 11.9.0, Python 3.12.14, JDK/javac 17.0.20,
Gradle 8.11.1, AGP 8.9.2, Kotlin 2.1.21. Android platforms 28 (revision 6) and
35 (revision 2), build-tools 35.0.0. Chromium version is recorded in the render
manifest; it is not the owner's Chrome 138.

Missing JDK launchers and SDK were resolved locally: copied the existing Java 17
runtime to a private tool directory, restored javac/jar/javap/jlink/jmod launchers
using their standard `java -m` JDK modules, and selected that installation explicitly
in Gradle properties. Downloaded official Android command-line-tools archive
`commandlinetools-linux-12266719_latest.zip`, accepted SDK licenses, and ran
`sdkmanager --sdk_root=<private-sdk> 'platforms;android-28' 'platforms;android-35'
'build-tools;35.0.0'`. JAVA_HOME, ANDROID_HOME and GRADLE_USER_HOME pointed to private
tool directories; Java used the configured proxy, with no TLS verification bypass.
Toolchains, build outputs, debug signing keys and caches are excluded from source.
The venv uses the repository requirements; pinned Playwright headless Chromium
1194 and FFMPEG were installed. The first CDN archive was truncated; the official
Microsoft fallback downloaded successfully. No dependency or lockfile was added.

## Scope and choices

See ADR-022 for decisions. Token-scoped complete log windows replace the harmful
logcat tail flag; fake process streams exercise start/stop and actual reader
threads. This is a model of the owner's measured failure, not hardware proof.
Task-scoped cursor history and effective scheduler policy are read in one D1 batch
instead of guessing from global history or UI defaults. Unknown dates stay under
Tanpa tanggal even for completed tasks. Exact instants order repeated DST hours;
date-only never receives an invented midnight. One precomputed key per task avoids
repeated formatter construction. Native dialogs/History use existing platform APIs.
Readonly controls do not attempt writes, optimistic updates or undo.

## Evidence limits

**BLOCKED: owner phone observation of the corrected log window.** No device is
available here. Latest hardware fatal_exception_observed remains null; it is not
changed to false. notification_access=false; no listener event or capture has ever
run. Device/account/provider/private-peer-network/push, actual Chrome 138/TalkBack,
OS text scaling and complete accessibility compliance remain **unverified**.
No milestone complete; Android identity/native accessibility and large-ledger
calendar/server-query pagination remain open. S3 has not begun.

Browser assertions measure computed foreground/background contrast of visible leaf
text in Today/Tasks/Detail/date-sheet/quick-sheet, both themes; min ratios and
sample counts are printed below. They do not audit all compositing/native popup
states. Target geometry measures loaded ledger controls (44px) and check box (24px).
Keyboard/modal/Back/focus-return are exercised in pinned desktop Chromium with
reduced motion. Doubled computed text tests ledger/detail/date-sheet overflow;
this is not real OS 200% scaling or a screen-reader test. Screens are synthetic
review captures, not an approved pixel-match or performance certificate.

## Development findings

The verified baseline logcat defect is fixed. Existing global last-100 history
could omit a task and bounded candidate counts could undercount the badge. S2
adds task-scoped reads and uses aggregate briefing counts. New implementation
review/tests also caught and fixed inherited main sizing hiding Back, informational
toast pointer interception, DST-fold sort reversal, and older-history errors hiding
known detail. Missing context metadata is explicitly unavailable. Read-API 401/403
clears private UI/snapshots/counters. A legacy test's exact Review selector raced
the correct numeric badge; its selector now accepts the real accessible name.
No approval/privacy rule was loosened.

Discarded experiments are not counted as fault proof: a formatter mutation was
equivalent on this runtime and was rejected; the initial toast fault timed out on
a blocked click rather than an assertion and was rejected. The final test checks
the actual hit target before clicking. Final 22 cases below have independent
passing baselines, broken assertion failures and restored passes; sources are
restored in finally with a duplicate-run lock and isolated Python caches.

## Base verification

```bash
git log --oneline -1
```

```text
6de38fd docs: record a defect in the crash monitor and queue S2
```

## npm install

```bash
npm ci
```

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

added 170 packages in 14s
npm notice
npm notice New major version of npm available! 11.9.0 -> 12.2.2
npm notice Changelog: https://github.com/npm/cli/releases/tag/v12.2.2
npm notice To update run: npm install -g npm@12.2.2
npm notice
```

## Full check

```bash
npm run check
```

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> check
> npm run lint && npm run typecheck && npm test && npm run build

npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> lint
> prettier --check "apps/**/*.{ts,tsx,css}" "packages/**/*.ts" "tests/**/*.ts" "scripts/*.ts"

Checking formatting...
All matched files use Prettier code style!
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> typecheck
> tsc --noEmit

npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> test
> vitest run


 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-s2

 ✓ tests/integration/ledger.test.ts (19 tests) 8217ms
   ✓ persistent ledger > processes reminders without collector or AI and cancels old deadline revisions  376ms
   ✓ signed ingestion remains proposal-only and explicit approval is idempotent  460ms
   ✓ deadline-change approval requires explicit current target and preserves history  345ms
   ✓ source purge scrubs sole-source tasks, preserves manual edits, and accepts a scoped local wipe acknowledgment  720ms
   ✓ task pagination has no duplicates and applies context/status filters  328ms
   ✓ configurable reminder rules rebuild future intents without changing deadline precision  1500ms
   ✓ quiet hours defer and coalesce reminders without changing deadlines, including daylight-saving boundaries  891ms
   ✓ device actions require explicit attestations and expiry/retirement never confirm  605ms
   ✓ durable Linux receipt is queued until phone explicitly reports cleanup  319ms
   ✓ read detail scopes and paginates task history and exposes scheduler policy without writing  1163ms
 ✓ tests/s2.test.ts (4 tests) 163ms
 ✓ tests/foundation.test.ts (2 tests) 12ms

 Test Files  3 passed (3)
      Tests  25 passed (25)
   Start at  21:24:38
   Duration  9.59s (transform 195ms, setup 0ms, collect 604ms, tests 8.39s, environment 1ms, prepare 153ms)

npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> build
> npm run build -w @academic-os/web && npm run build -w @academic-os/worker

npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> build
> vite build

vite v7.3.7 building client environment for production...
transforming...
✓ 46 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.44 kB │ gzip:  0.30 kB
dist/assets/index-D6U1khp3.css   18.73 kB │ gzip:  4.83 kB
dist/assets/index-BrfTQB-T.js   277.12 kB │ gzip: 87.16 kB
✓ built in 1.08s
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> build
> wrangler deploy --dry-run --outdir dist

▲ [WARNING] Proxy environment variables detected. We'll use your proxy for fetch requests.



 ⛅️ wrangler 4.158.0
────────────────────
✨ Read 14 files from the assets directory /workspace/scratch/bbff8dae2870/academic-os-s2/apps/web/dist
Total Upload: 427.94 KiB / gzip: 84.50 KiB
Your Worker has access to the following bindings:
Binding                               Resource
env.DB (academic-os)                  D1 Database
env.ASSETS                            Assets
env.OWNER_SUB ("UNCONFIGURED")        Environment Variable
env.ACCESS_TEAM ("UNCONFIGURED")      Environment Variable
env.ACCESS_AUD ("UNCONFIGURED")       Environment Variable

--dry-run: exiting now.
```

## Browser E2E

```bash
npm run test:e2e
```

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> test:e2e
> playwright test

[WebServer] (node:359) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:372) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:372) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 12 tests using 1 worker

(node:414) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:414) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓   1 tests/e2e/app.spec.ts:2:1 › organization context, task persistence, completion and offline snapshot (2.8s)
  ✓   2 tests/e2e/app.spec.ts:129:1 › 360px navigation and both themes fit the viewport (411ms)
  ✓   3 tests/e2e/app.spec.ts:158:1 › save reminder rules twice with quiet hours (1.3s)
  ✓   4 tests/e2e/app.spec.ts:192:1 › edit task, keep date-only precision and navigate month calendar (1.2s)
  ✓   5 tests/e2e/app.spec.ts:248:1 › correct a proposal before approval (1.0s)
  ✓   6 tests/e2e/foundation.spec.ts:2:1 › foundation: fonts stay local, theme follows system and override, reduced motion and 200% text (800ms)
  ✓   7 tests/e2e/foundation.spec.ts:68:1 › foundation: four tabs and secondary workflows remain reachable at 360px (653ms)
  ✓   8 tests/e2e/s2.spec.ts:143:1 › S2 read-only routes, distinct dates, real policy, live clock and modal history (1.5s)
S2 contrast observations {"screen":"Today","theme":"light","samples":25,"min_ratio":5.358466738754086}
S2 contrast observations {"screen":"Today","theme":"dark","samples":25,"min_ratio":6.339454211981419}
S2 contrast observations {"screen":"Tasks","theme":"light","samples":44,"min_ratio":5.358466738754086}
S2 contrast observations {"screen":"Tasks","theme":"dark","samples":44,"min_ratio":6.6576395847258585}
S2 target observations {"samples":28,"min_width":44,"min_height":44}
S2 contrast observations {"screen":"Detail","theme":"light","samples":19,"min_ratio":5.358466738754086}
S2 contrast observations {"screen":"Detail","theme":"dark","samples":19,"min_ratio":6.530358026876049}
S2 contrast observations {"screen":"Date sheet","theme":"light","samples":5,"min_ratio":5.998700193644534}
S2 contrast observations {"screen":"Date sheet","theme":"dark","samples":5,"min_ratio":6.6576395847258585}
S2 contrast observations {"screen":"Quick sheet","theme":"light","samples":8,"min_ratio":5.998700193644534}
S2 contrast observations {"screen":"Quick sheet","theme":"dark","samples":8,"min_ratio":6.6576395847258585}
  ✓   9 tests/e2e/s2.spec.ts:316:1 › S2 360px, doubled text, target sizes, foreground contrast and deep-link availability (1.5s)
  ✓  10 tests/e2e/s2.spec.ts:395:1 › S2 keeps partial disclosure until existing bounded pages actually reach unknown tasks (7.7s)
  ✓  11 tests/e2e/s2.spec.ts:441:1 › S2 authorization denial clears the read session instead of retaining cached owner data (749ms)
  ✓  12 tests/e2e/s2.spec.ts:503:1 › S2 history paging failure preserves known detail and retries a bounded page (2.4s)

  12 passed (29.8s)
```

## Compiled PWA offline

```bash
npm run test:pwa
```

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> test:pwa
> npm run build -w @academic-os/web && playwright test --config playwright.production.config.ts

npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> build
> vite build

vite v7.3.7 building client environment for production...
transforming...
✓ 46 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.44 kB │ gzip:  0.30 kB
dist/assets/index-D6U1khp3.css   18.73 kB │ gzip:  4.83 kB
dist/assets/index-BrfTQB-T.js   277.12 kB │ gzip: 87.16 kB
✓ built in 1.04s
[WebServer] (node:739) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:752) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:752) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:782) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:782) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  1 tests/production/offline.spec.ts:2:1 › built PWA reloads offline and logout clears its private snapshot (1.2s)

  1 passed (4.8s)
```

## Planning

```bash
.venv/bin/python scripts/validate_planning.py
```

```text
PASS: 3 schemas; 5 valid fixtures/date variants; 21 rejection cases; 83 local links; 30 features; 34 test IDs.
This validates planning artifacts only. No application/device/account tests ran.
```

## Python

```bash
.venv/bin/python -m unittest discover -s collectors/local/tests -v
```

```text
test_evidence_projection_never_passes_unrun_cases_or_private_extras (test_control.ControlTests.test_evidence_projection_never_passes_unrun_cases_or_private_extras) ... ok
test_no_job_poll_wipes_locally_even_if_relay_response_is_lost (test_control.ControlTests.test_no_job_poll_wipes_locally_even_if_relay_response_is_lost) ... ok
test_offline_retry_generations_and_phase_journal (test_control.ControlTests.test_offline_retry_generations_and_phase_journal) ... ok
test_receipt_ack_requires_real_commit_and_survives_restart (test_control.ControlTests.test_receipt_ack_requires_real_commit_and_survives_restart) ... ok
test_encrypted_disposable_restore_parity_and_no_dispatch (test_core.BackupTests.test_encrypted_disposable_restore_parity_and_no_dispatch) ... ok
test_ics_precision_folding_and_recurrence_uncertainty (test_core.CalendarTests.test_ics_precision_folding_and_recurrence_uncertainty) ... ok
test_external_ai_needs_explicit_consent (test_core.CollectorTests.test_external_ai_needs_explicit_consent) ... ok
test_invalid_batch_rolls_back_all_events (test_core.CollectorTests.test_invalid_batch_rolls_back_all_events) ... ok
test_multiline_repeat_and_encryption (test_core.CollectorTests.test_multiline_repeat_and_encryption) ... ok
test_receipt_retry_and_purge_prevents_resurrection (test_core.CollectorTests.test_receipt_retry_and_purge_prevents_resurrection) ... ok
test_reject_unselected_before_parse (test_core.CollectorTests.test_reject_unselected_before_parse) ... ok
test_projection_never_copies_message_payload (test_core.ContractTests.test_projection_never_copies_message_payload) ... ok
test_shared_fixture_and_raw_rejection (test_core.ContractTests.test_shared_fixture_and_raw_rejection) ... ok
test_activity_history_cannot_satisfy_resumed (test_device_evidence.DeviceEvidenceTests.test_activity_history_cannot_satisfy_resumed) ... ok
test_case_cannot_pass_without_real_permission_transition_and_complete_window (test_device_evidence.DeviceEvidenceTests.test_case_cannot_pass_without_real_permission_transition_and_complete_window) ... ok
test_crash_window_ignores_old_and_unrelated_but_retains_early_crash (test_device_evidence.DeviceEvidenceTests.test_crash_window_ignores_old_and_unrelated_but_retains_early_crash) ... ok
test_dirty_or_missing_provenance_is_unknown (test_device_evidence.DeviceEvidenceTests.test_dirty_or_missing_provenance_is_unknown) ... ok
test_incomplete_or_ambiguous_stream_is_unknown (test_device_evidence.DeviceEvidenceTests.test_incomplete_or_ambiguous_stream_is_unknown) ... ok
test_install_success_is_not_issued_or_cached (test_device_evidence.DeviceEvidenceTests.test_install_success_is_not_issued_or_cached) ... ok
test_live_command_receives_its_own_markers_and_detects_in_window_crash (test_device_evidence.DeviceEvidenceTests.test_live_command_receives_its_own_markers_and_detects_in_window_crash) ... ok
test_native_crash_and_incomplete_fatal_attribution (test_device_evidence.DeviceEvidenceTests.test_native_crash_and_incomplete_fatal_attribution) ... ok
test_readback_hash_and_embedded_clean_revision (test_device_evidence.DeviceEvidenceTests.test_readback_hash_and_embedded_clean_revision) ... ok
test_run_binds_cold_process_warm_resume_and_installed_identity (test_device_evidence.DeviceEvidenceTests.test_run_binds_cold_process_warm_resume_and_installed_identity) ... ok
test_sealed_cases_reject_edits_truncation_and_finishing_without_beginning (test_device_evidence.DeviceEvidenceTests.test_sealed_cases_reject_edits_truncation_and_finishing_without_beginning) ... ok
test_expired_invite_does_not_create_device (test_pairing.PairingTests.test_expired_invite_does_not_create_device) ... ok
test_one_device_invite_idempotence_and_revocation_ack (test_pairing.PairingTests.test_one_device_invite_idempotence_and_revocation_ack) ... ok
test_cloud_purge_erases_raw_jobs_and_never_uploads (test_pipeline.PipelineTests.test_cloud_purge_erases_raw_jobs_and_never_uploads) ... ok
test_placeholders_and_revoked_consent_never_call_provider (test_pipeline.PipelineTests.test_placeholders_and_revoked_consent_never_call_provider) ... ok
test_provider_change_and_foreign_evidence_fail_closed (test_pipeline.PipelineTests.test_provider_change_and_foreign_evidence_fail_closed) ... ok
test_purge_removes_queued_jobs (test_pipeline.PipelineTests.test_purge_removes_queued_jobs) ... ok
test_redaction_keeps_dates_while_stripping_contacts (test_pipeline.PipelineTests.test_redaction_keeps_dates_while_stripping_contacts) ... ok
test_reviewed_projection_retry_preserves_exact_idempotency_after_restart (test_pipeline.PipelineTests.test_reviewed_projection_retry_preserves_exact_idempotency_after_restart) ... ok
test_loopback_login_and_import_while_cross_origin_is_rejected (test_server.LocalBrowserFlow.test_loopback_login_and_import_while_cross_origin_is_rejected) ... ok
test_private_https_pair_signed_receipt_retry_and_revocation (test_transport.TLSTransportTests.test_private_https_pair_signed_receipt_retry_and_revocation) ... ok

----------------------------------------------------------------------
Ran 34 tests in 1.711s

OK
```

## Android

```bash
cd apps/android-companion && ./gradlew assembleDebug lint testDebugUnitTest --no-daemon
```

```text
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=35491
To honour the JVM settings for this build a single-use Daemon process will be forked. For more on this, please refer to https://docs.gradle.org/8.11.1/userguide/gradle_daemon.html#sec:disabling_the_daemon in the Gradle documentation.
Daemon will be stopped at the end of the build
> Task :app:evidenceProvenance
> Task :app:preBuild
> Task :app:preDebugBuild
> Task :app:mergeDebugNativeDebugMetadata NO-SOURCE
> Task :app:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :app:checkDebugAarMetadata UP-TO-DATE
> Task :app:generateDebugResValues UP-TO-DATE
> Task :app:mapDebugSourceSetPaths UP-TO-DATE
> Task :app:generateDebugResources UP-TO-DATE
> Task :app:mergeDebugResources UP-TO-DATE
> Task :app:packageDebugResources UP-TO-DATE
> Task :app:parseDebugLocalResources UP-TO-DATE
> Task :app:createDebugCompatibleScreenManifests UP-TO-DATE
> Task :app:extractDeepLinksDebug UP-TO-DATE
> Task :app:processDebugMainManifest UP-TO-DATE
> Task :app:processDebugManifest UP-TO-DATE
> Task :app:processDebugManifestForPackage UP-TO-DATE
> Task :app:processDebugResources UP-TO-DATE
> Task :app:compileDebugKotlin UP-TO-DATE
> Task :app:javaPreCompileDebug UP-TO-DATE
> Task :app:compileDebugJavaWithJavac NO-SOURCE
> Task :app:mergeDebugShaders UP-TO-DATE
> Task :app:compileDebugShaders NO-SOURCE
> Task :app:generateDebugAssets UP-TO-DATE
> Task :app:mergeDebugAssets UP-TO-DATE
> Task :app:compressDebugAssets UP-TO-DATE
> Task :app:desugarDebugFileDependencies UP-TO-DATE
> Task :app:dexBuilderDebug UP-TO-DATE
> Task :app:mergeDebugGlobalSynthetics UP-TO-DATE
> Task :app:processDebugJavaRes UP-TO-DATE
> Task :app:mergeDebugJavaResource UP-TO-DATE
> Task :app:checkDebugDuplicateClasses UP-TO-DATE
> Task :app:mergeExtDexDebug UP-TO-DATE
> Task :app:mergeLibDexDebug UP-TO-DATE
> Task :app:mergeProjectDexDebug UP-TO-DATE
> Task :app:mergeDebugJniLibFolders UP-TO-DATE
> Task :app:mergeDebugNativeLibs NO-SOURCE
> Task :app:stripDebugDebugSymbols NO-SOURCE
> Task :app:validateSigningDebug UP-TO-DATE
> Task :app:writeDebugAppMetadata UP-TO-DATE
> Task :app:writeDebugSigningConfigVersions UP-TO-DATE
> Task :app:packageDebug UP-TO-DATE
> Task :app:createDebugApkListingFileRedirect UP-TO-DATE

> Task :app:verifyApi28
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=35491

> Task :app:assembleDebug
> Task :app:bundleDebugClassesToCompileJar UP-TO-DATE
> Task :app:preDebugAndroidTestBuild SKIPPED
> Task :app:generateDebugAndroidTestResValues UP-TO-DATE
> Task :app:generateDebugAndroidTestLintModel UP-TO-DATE
> Task :app:extractProguardFiles UP-TO-DATE
> Task :app:generateDebugLintReportModel UP-TO-DATE
> Task :app:preDebugUnitTestBuild
> Task :app:generateDebugUnitTestLintModel UP-TO-DATE
> Task :app:lintAnalyzeDebug UP-TO-DATE
> Task :app:lintAnalyzeDebugAndroidTest UP-TO-DATE
> Task :app:lintAnalyzeDebugUnitTest UP-TO-DATE
> Task :app:lintReportDebug UP-TO-DATE
> Task :app:lintDebug
> Task :app:lint
> Task :app:bundleDebugClassesToRuntimeJar UP-TO-DATE
> Task :app:compileDebugUnitTestKotlin UP-TO-DATE
> Task :app:javaPreCompileDebugUnitTest UP-TO-DATE
> Task :app:compileDebugUnitTestJavaWithJavac NO-SOURCE
> Task :app:processDebugUnitTestJavaRes UP-TO-DATE

> Task :app:testQueuePrivacy
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=35491
PASS fingerprint is deterministic only within the keyed installation
PASS missing AES key with queued OR pairing ciphertext never generates
PASS lost dedupe key with queued rows never generates
PASS restart reuses keys and ciphertext; loss remains blocked
PASS legacy format requires explicit owner reset, even when empty
PASS purge acknowledgment follows durable application and stops on failures
Queue privacy policy: 6 tests passed (JVM only; Android Keystore/SQLite/device unverified)

> Task :app:testDebugUnitTest UP-TO-DATE
[Incubating] Problems report is available at: file:///workspace/scratch/bbff8dae2870/academic-os-s2/apps/android-companion/build/reports/problems/problems-report.html

Deprecated Gradle features were used in this build, making it incompatible with Gradle 9.0.

You can use '--warning-mode all' to show the individual deprecation warnings and determine if they come from your own scripts or plugins.

For more on this, please refer to https://docs.gradle.org/8.11.1/userguide/command_line_interface.html#sec:command_line_warnings in the Gradle documentation.

BUILD SUCCESSFUL in 18s
52 actionable tasks: 4 executed, 48 up-to-date

Exit: 0
```

Actual lint XML: 0 errors / 4 warnings: ApplySharedPref, CustomX509TrustManager, MissingApplicationIcon, SetTextI18n. Unchanged native source: synchronous credential persistence and pinned trust manager are intentional; launcher icon and native string-resource work remain a separate slice. No warning suppressed. The initial uncached Android build also succeeded (52 tasks executed); final repeat reports its cached tasks honestly. Six policy cases are a standalone JVM main, not six JUnit/device tests.

## Fault-run summary

```bash
.venv/bin/python scripts/check_s2_mutations.py --output-dir /absolute/synthetic/output
```

```text
Declared faults: 22
live-markers baseline: exit 0
live-markers broken: exit 1
live-markers restored: exit 0
distinct-precision baseline: exit 0
distinct-precision broken: exit 1
distinct-precision restored: exit 0
owner-calendar baseline: exit 0
owner-calendar broken: exit 1
owner-calendar restored: exit 0
date-only-order baseline: exit 0
date-only-order broken: exit 1
date-only-order restored: exit 0
scoped-history baseline: exit 0
scoped-history broken: exit 1
scoped-history restored: exit 0
effective-policy baseline: exit 0
effective-policy broken: exit 1
effective-policy restored: exit 0
read-only baseline: exit 0
read-only broken: exit 1
read-only restored: exit 0
layered-history baseline: exit 0
layered-history broken: exit 1
layered-history restored: exit 0
modal-sheet baseline: exit 0
modal-sheet broken: exit 1
modal-sheet restored: exit 0
visible-clock baseline: exit 0
visible-clock broken: exit 1
visible-clock restored: exit 0
text-contrast baseline: exit 0
text-contrast broken: exit 1
text-contrast restored: exit 0
always-undated baseline: exit 0
always-undated broken: exit 1
always-undated restored: exit 0
aggregate-pending baseline: exit 0
aggregate-pending broken: exit 1
aggregate-pending restored: exit 0
undated-filter baseline: exit 0
undated-filter broken: exit 1
undated-filter restored: exit 0
unavailable-context baseline: exit 0
unavailable-context broken: exit 1
unavailable-context restored: exit 0
read-auth-clear baseline: exit 0
read-auth-clear broken: exit 1
read-auth-clear restored: exit 0
exact-time-format baseline: exit 0
exact-time-format broken: exit 1
exact-time-format restored: exit 0
bounded-detail baseline: exit 0
bounded-detail broken: exit 1
bounded-detail restored: exit 0
toast-hit-testing baseline: exit 0
toast-hit-testing broken: exit 1
toast-hit-testing restored: exit 0
exact-instant-order baseline: exit 0
exact-instant-order broken: exit 1
exact-instant-order restored: exit 0
unknown-done-group baseline: exit 0
unknown-done-group broken: exit 1
unknown-done-group restored: exit 0
history-page-error baseline: exit 0
history-page-error broken: exit 1
history-page-error restored: exit 0
PASS: 22 broken assertion failures; 22 restored passes; sources restored.
```

### live-markers

Source: `scripts/device_evidence.py`. Test command: `/workspace/scratch/bbff8dae2870/academic-os-s2/.venv/bin/python -m unittest discover -s collectors/local/tests -p test_device_evidence.py -v`.

The runner inserts `-X pycache_prefix=...` immediately after the Python executable.
Exact cache paths for this recorded run, by phase:

```text
baseline: /workspace/scratch/bbff8dae2870/s2-checks/faults-complete/live-markers-baseline-cache
broken: /workspace/scratch/bbff8dae2870/s2-checks/faults-complete/live-markers-broken-cache
restored: /workspace/scratch/bbff8dae2870/s2-checks/faults-complete/live-markers-restored-cache
```

baseline:

```text
test_activity_history_cannot_satisfy_resumed (test_device_evidence.DeviceEvidenceTests.test_activity_history_cannot_satisfy_resumed) ... ok
test_case_cannot_pass_without_real_permission_transition_and_complete_window (test_device_evidence.DeviceEvidenceTests.test_case_cannot_pass_without_real_permission_transition_and_complete_window) ... ok
test_crash_window_ignores_old_and_unrelated_but_retains_early_crash (test_device_evidence.DeviceEvidenceTests.test_crash_window_ignores_old_and_unrelated_but_retains_early_crash) ... ok
test_dirty_or_missing_provenance_is_unknown (test_device_evidence.DeviceEvidenceTests.test_dirty_or_missing_provenance_is_unknown) ... ok
test_incomplete_or_ambiguous_stream_is_unknown (test_device_evidence.DeviceEvidenceTests.test_incomplete_or_ambiguous_stream_is_unknown) ... ok
test_install_success_is_not_issued_or_cached (test_device_evidence.DeviceEvidenceTests.test_install_success_is_not_issued_or_cached) ... ok
test_live_command_receives_its_own_markers_and_detects_in_window_crash (test_device_evidence.DeviceEvidenceTests.test_live_command_receives_its_own_markers_and_detects_in_window_crash) ... ok
test_native_crash_and_incomplete_fatal_attribution (test_device_evidence.DeviceEvidenceTests.test_native_crash_and_incomplete_fatal_attribution) ... ok
test_readback_hash_and_embedded_clean_revision (test_device_evidence.DeviceEvidenceTests.test_readback_hash_and_embedded_clean_revision) ... ok
test_run_binds_cold_process_warm_resume_and_installed_identity (test_device_evidence.DeviceEvidenceTests.test_run_binds_cold_process_warm_resume_and_installed_identity) ... ok
test_sealed_cases_reject_edits_truncation_and_finishing_without_beginning (test_device_evidence.DeviceEvidenceTests.test_sealed_cases_reject_edits_truncation_and_finishing_without_beginning) ... ok

----------------------------------------------------------------------
Ran 11 tests in 0.019s

OK
```

broken:

```text
test_activity_history_cannot_satisfy_resumed (test_device_evidence.DeviceEvidenceTests.test_activity_history_cannot_satisfy_resumed) ... ok
test_case_cannot_pass_without_real_permission_transition_and_complete_window (test_device_evidence.DeviceEvidenceTests.test_case_cannot_pass_without_real_permission_transition_and_complete_window) ... ok
test_crash_window_ignores_old_and_unrelated_but_retains_early_crash (test_device_evidence.DeviceEvidenceTests.test_crash_window_ignores_old_and_unrelated_but_retains_early_crash) ... ok
test_dirty_or_missing_provenance_is_unknown (test_device_evidence.DeviceEvidenceTests.test_dirty_or_missing_provenance_is_unknown) ... ok
test_incomplete_or_ambiguous_stream_is_unknown (test_device_evidence.DeviceEvidenceTests.test_incomplete_or_ambiguous_stream_is_unknown) ... ok
test_install_success_is_not_issued_or_cached (test_device_evidence.DeviceEvidenceTests.test_install_success_is_not_issued_or_cached) ... ok
test_live_command_receives_its_own_markers_and_detects_in_window_crash (test_device_evidence.DeviceEvidenceTests.test_live_command_receives_its_own_markers_and_detects_in_window_crash) ... FAIL
test_native_crash_and_incomplete_fatal_attribution (test_device_evidence.DeviceEvidenceTests.test_native_crash_and_incomplete_fatal_attribution) ... ok
test_readback_hash_and_embedded_clean_revision (test_device_evidence.DeviceEvidenceTests.test_readback_hash_and_embedded_clean_revision) ... ok
test_run_binds_cold_process_warm_resume_and_installed_identity (test_device_evidence.DeviceEvidenceTests.test_run_binds_cold_process_warm_resume_and_installed_identity) ... ok
test_sealed_cases_reject_edits_truncation_and_finishing_without_beginning (test_device_evidence.DeviceEvidenceTests.test_sealed_cases_reject_edits_truncation_and_finishing_without_beginning) ... ok

======================================================================
FAIL: test_live_command_receives_its_own_markers_and_detects_in_window_crash (test_device_evidence.DeviceEvidenceTests.test_live_command_receives_its_own_markers_and_detects_in_window_crash)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/workspace/scratch/bbff8dae2870/academic-os-s2/collectors/local/tests/test_device_evidence.py", line 38, in test_live_command_receives_its_own_markers_and_detects_in_window_crash
    self.assertTrue(monitor.started.is_set(),'live logcat missed its own START')
AssertionError: False is not true : live logcat missed its own START

----------------------------------------------------------------------
Ran 11 tests in 6.021s

FAILED (failures=1)
```

restored:

```text
test_activity_history_cannot_satisfy_resumed (test_device_evidence.DeviceEvidenceTests.test_activity_history_cannot_satisfy_resumed) ... ok
test_case_cannot_pass_without_real_permission_transition_and_complete_window (test_device_evidence.DeviceEvidenceTests.test_case_cannot_pass_without_real_permission_transition_and_complete_window) ... ok
test_crash_window_ignores_old_and_unrelated_but_retains_early_crash (test_device_evidence.DeviceEvidenceTests.test_crash_window_ignores_old_and_unrelated_but_retains_early_crash) ... ok
test_dirty_or_missing_provenance_is_unknown (test_device_evidence.DeviceEvidenceTests.test_dirty_or_missing_provenance_is_unknown) ... ok
test_incomplete_or_ambiguous_stream_is_unknown (test_device_evidence.DeviceEvidenceTests.test_incomplete_or_ambiguous_stream_is_unknown) ... ok
test_install_success_is_not_issued_or_cached (test_device_evidence.DeviceEvidenceTests.test_install_success_is_not_issued_or_cached) ... ok
test_live_command_receives_its_own_markers_and_detects_in_window_crash (test_device_evidence.DeviceEvidenceTests.test_live_command_receives_its_own_markers_and_detects_in_window_crash) ... ok
test_native_crash_and_incomplete_fatal_attribution (test_device_evidence.DeviceEvidenceTests.test_native_crash_and_incomplete_fatal_attribution) ... ok
test_readback_hash_and_embedded_clean_revision (test_device_evidence.DeviceEvidenceTests.test_readback_hash_and_embedded_clean_revision) ... ok
test_run_binds_cold_process_warm_resume_and_installed_identity (test_device_evidence.DeviceEvidenceTests.test_run_binds_cold_process_warm_resume_and_installed_identity) ... ok
test_sealed_cases_reject_edits_truncation_and_finishing_without_beginning (test_device_evidence.DeviceEvidenceTests.test_sealed_cases_reject_edits_truncation_and_finishing_without_beginning) ... ok

----------------------------------------------------------------------
Ran 11 tests in 0.018s

OK
```

### distinct-precision

Source: `apps/web/src/read/model.ts`. Test command: `npx vitest run tests/s2.test.ts`.

baseline:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-s2

 ✓ tests/s2.test.ts (4 tests) 207ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  21:25:45
   Duration  464ms (transform 118ms, setup 0ms, collect 65ms, tests 207ms, environment 0ms, prepare 61ms)

```

broken:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-s2

 ❯ tests/s2.test.ts (4 tests | 1 failed) 206ms
   × calendar grouping keeps four precisions, fixed group order and date-only last on its local date 27ms
     → expected 'No date yet' to be 'Approximate — not confirmed' // Object.is equality
   ✓ grouping uses owner calendar boundaries rather than browser UTC, including DST and a large synthetic set 70ms
   ✓ reminder presentation follows effective server policy, including disabled, date-only and unknown 1ms
   ✓ Today keeps its undated navigation even when the loaded ledger is empty 107ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/s2.test.ts > calendar grouping keeps four precisions, fixed group order and date-only last on its local date
AssertionError: expected 'No date yet' to be 'Approximate — not confirmed' // Object.is equality

Expected: "Approximate — not confirmed"
Received: "No date yet"

 ❯ tests/s2.test.ts:46:21
     44|   expect(labels[2]).toContain('Date only');
     45|   expect(labels[2]).not.toMatch(/00:00|23:59/);
     46|   expect(labels[5]).toBe('Approximate — not confirmed');
       |                     ^
     47|   expect(labels[6]).toBe('No date yet');
     48|   expect(when(rows[2], 'en', now, zone)).toBe('Date only');

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 3 passed (4)
   Start at  21:25:47
   Duration  516ms (transform 124ms, setup 0ms, collect 84ms, tests 206ms, environment 0ms, prepare 70ms)

```

restored:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-s2

 ✓ tests/s2.test.ts (4 tests) 182ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  21:25:48
   Duration  459ms (transform 115ms, setup 0ms, collect 67ms, tests 182ms, environment 0ms, prepare 62ms)

```

### owner-calendar

Source: `apps/web/src/read/model.ts`. Test command: `npx vitest run tests/s2.test.ts`.

baseline:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-s2

 ✓ tests/s2.test.ts (4 tests) 180ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  21:25:49
   Duration  516ms (transform 138ms, setup 0ms, collect 81ms, tests 180ms, environment 0ms, prepare 88ms)

```

broken:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-s2

 ❯ tests/s2.test.ts (4 tests | 1 failed) 146ms
   ✓ calendar grouping keeps four precisions, fixed group order and date-only last on its local date 19ms
   × grouping uses owner calendar boundaries rather than browser UTC, including DST and a large synthetic set 9ms
     → expected [] to have a length of 1 but got +0
   ✓ reminder presentation follows effective server policy, including disabled, date-only and unknown 1ms
   ✓ Today keeps its undated navigation even when the loaded ledger is empty 116ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/s2.test.ts > grouping uses owner calendar boundaries rather than browser UTC, including DST and a large synthetic set
AssertionError: expected [] to have a length of 1 but got +0

- Expected
+ Received

- 1
+ 0

 ❯ tests/s2.test.ts:63:55
     61|   };
     62|   expect(when(exactMidnight, 'en', midnight, zone)).toBe('00:05');
     63|   expect(groupTasks([dayTask], midnight, zone).today).toHaveLength(1);
       |                                                       ^
     64|   const many = Array.from({ length: 1500 }, (_, i) => ({
     65|     ...rows[i % rows.length],

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 3 passed (4)
   Start at  21:25:50
   Duration  425ms (transform 118ms, setup 0ms, collect 73ms, tests 146ms, environment 0ms, prepare 59ms)

```

restored:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-s2

 ✓ tests/s2.test.ts (4 tests) 183ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  21:25:51
   Duration  458ms (transform 119ms, setup 0ms, collect 67ms, tests 183ms, environment 0ms, prepare 64ms)

```

### date-only-order

Source: `apps/web/src/read/model.ts`. Test command: `npx vitest run tests/s2.test.ts`.

baseline:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-s2

 ✓ tests/s2.test.ts (4 tests) 204ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  21:25:52
   Duration  489ms (transform 129ms, setup 0ms, collect 71ms, tests 204ms, environment 0ms, prepare 59ms)

```

broken:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-s2

 ❯ tests/s2.test.ts (4 tests | 1 failed) 290ms
   × calendar grouping keeps four precisions, fixed group order and date-only last on its local date 90ms
     → expected [ 'Synthetic overdue duty', …(2) ] to deeply equal [ 'Synthetic overdue duty', …(2) ]
   ✓ grouping uses owner calendar boundaries rather than browser UTC, including DST and a large synthetic set 66ms
   ✓ reminder presentation follows effective server policy, including disabled, date-only and unknown 1ms
   ✓ Today keeps its undated navigation even when the loaded ledger is empty 132ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/s2.test.ts > calendar grouping keeps four precisions, fixed group order and date-only last on its local date
AssertionError: expected [ 'Synthetic overdue duty', …(2) ] to deeply equal [ 'Synthetic overdue duty', …(2) ]

- Expected
+ Received

  [
    "Synthetic overdue duty",
-   "Synthetic exact deadline",
    "Synthetic date-only deadline",
+   "Synthetic exact deadline",
  ]

 ❯ tests/s2.test.ts:32:44
     30|     'done',
     31|   ]);
     32|   expect(groups.today.map((t) => t.title)).toEqual([
       |                                            ^
     33|     'Synthetic overdue duty',
     34|     'Synthetic exact deadline',

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 3 passed (4)
   Start at  21:25:54
   Duration  612ms (transform 142ms, setup 0ms, collect 96ms, tests 290ms, environment 0ms, prepare 60ms)

```

restored:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-s2

 ✓ tests/s2.test.ts (4 tests) 185ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  21:25:55
   Duration  461ms (transform 118ms, setup 0ms, collect 70ms, tests 185ms, environment 0ms, prepare 64ms)

```

### scoped-history

Source: `apps/worker/src/index.ts`. Test command: `npx vitest run tests/integration/ledger.test.ts -t 'read detail scopes'`.

baseline:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-s2

 ✓ tests/integration/ledger.test.ts (19 tests | 18 skipped) 1900ms
   ✓ read detail scopes and paginates task history and exposes scheduler policy without writing  1286ms

 Test Files  1 passed (1)
      Tests  1 passed | 18 skipped (19)
   Start at  21:25:56
   Duration  2.70s (transform 164ms, setup 0ms, collect 595ms, tests 1.90s, environment 0ms, prepare 62ms)

```

broken:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-s2

 ❯ tests/integration/ledger.test.ts (19 tests | 1 failed | 18 skipped) 1932ms
   ↓ persistent ledger > production auth fails closed and forged headers do not authenticate
   ↓ persistent ledger > rejects cross-origin writes
   ↓ persistent ledger > stores an organizational duty without a course and preserves unknown dates
   ↓ persistent ledger > prevents lost edits and audits only a successful CAS
   ↓ persistent ledger > processes reminders without collector or AI and cancels old deadline revisions
   ↓ date and projection boundaries > rejects impossible dates and invented times
   ↓ date and projection boundaries > rejects raw fields and unsupported evidence
   ↓ signed ingestion remains proposal-only and explicit approval is idempotent
   ↓ a losing deadline edit cannot schedule its reminders
   ↓ title-only edits preserve reminder revision and do not re-alert
   ↓ snooze retries are idempotent and completed tasks cannot snooze
   ↓ deadline-change approval requires explicit current target and preserves history
   ↓ source purge scrubs sole-source tasks, preserves manual edits, and accepts a scoped local wipe acknowledgment
   ↓ task pagination has no duplicates and applies context/status filters
   ↓ configurable reminder rules rebuild future intents without changing deadline precision
   ↓ quiet hours defer and coalesce reminders without changing deadlines, including daylight-saving boundaries
   ↓ device actions require explicit attestations and expiry/retirement never confirm
   ↓ durable Linux receipt is queued until phone explicitly reports cleanup
   × read detail scopes and paginates task history and exposes scheduler policy without writing 1262ms
     → expected false to be true // Object.is equality

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/integration/ledger.test.ts > read detail scopes and paginates task history and exposes scheduler policy without writing
AssertionError: expected false to be true // Object.is equality

- Expected
+ Received

- true
+ false

 ❯ tests/integration/ledger.test.ts:922:64
    920|   expect(page.task.id).toBe(own.id);
    921|   expect(page.history).toHaveLength(30);
    922|   expect(page.history.every((e: any) => e.task_id === own.id)).toBe(tr…
       |                                                                ^
    923|   expect(page.history.map((e: any) => e.id)).toEqual(
    924|     page.history.map((e: any) => e.id).sort((a: number, b: number) => …

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 18 skipped (19)
   Start at  21:25:59
   Duration  2.69s (transform 134ms, setup 0ms, collect 558ms, tests 1.93s, environment 0ms, prepare 55ms)

```

restored:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-s2

 ✓ tests/integration/ledger.test.ts (19 tests | 18 skipped) 2003ms
   ✓ read detail scopes and paginates task history and exposes scheduler policy without writing  1349ms

 Test Files  1 passed (1)
      Tests  1 passed | 18 skipped (19)
   Start at  21:26:03
   Duration  2.79s (transform 143ms, setup 0ms, collect 571ms, tests 2.00s, environment 0ms, prepare 64ms)

```

### effective-policy

Source: `apps/worker/src/index.ts`. Test command: `npx vitest run tests/integration/ledger.test.ts -t 'read detail scopes'`.

baseline:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-s2

 ✓ tests/integration/ledger.test.ts (19 tests | 18 skipped) 1929ms
   ✓ read detail scopes and paginates task history and exposes scheduler policy without writing  1318ms

 Test Files  1 passed (1)
      Tests  1 passed | 18 skipped (19)
   Start at  21:26:06
   Duration  2.70s (transform 157ms, setup 0ms, collect 566ms, tests 1.93s, environment 0ms, prepare 61ms)

```

broken:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-s2

 ❯ tests/integration/ledger.test.ts (19 tests | 1 failed | 18 skipped) 1875ms
   ↓ persistent ledger > production auth fails closed and forged headers do not authenticate
   ↓ persistent ledger > rejects cross-origin writes
   ↓ persistent ledger > stores an organizational duty without a course and preserves unknown dates
   ↓ persistent ledger > prevents lost edits and audits only a successful CAS
   ↓ persistent ledger > processes reminders without collector or AI and cancels old deadline revisions
   ↓ date and projection boundaries > rejects impossible dates and invented times
   ↓ date and projection boundaries > rejects raw fields and unsupported evidence
   ↓ signed ingestion remains proposal-only and explicit approval is idempotent
   ↓ a losing deadline edit cannot schedule its reminders
   ↓ title-only edits preserve reminder revision and do not re-alert
   ↓ snooze retries are idempotent and completed tasks cannot snooze
   ↓ deadline-change approval requires explicit current target and preserves history
   ↓ source purge scrubs sole-source tasks, preserves manual edits, and accepts a scoped local wipe acknowledgment
   ↓ task pagination has no duplicates and applies context/status filters
   ↓ configurable reminder rules rebuild future intents without changing deadline precision
   ↓ quiet hours defer and coalesce reminders without changing deadlines, including daylight-saving boundaries
   ↓ device actions require explicit attestations and expiry/retirement never confirm
   ↓ durable Linux receipt is queued until phone explicitly reports cleanup
   × read detail scopes and paginates task history and exposes scheduler policy without writing 1256ms
     → expected [ 24, 3 ] to deeply equal [ 7, 1 ]

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/integration/ledger.test.ts > read detail scopes and paginates task history and exposes scheduler policy without writing
AssertionError: expected [ 24, 3 ] to deeply equal [ 7, 1 ]

- Expected
+ Received

  [
-   7,
-   1,
+   24,
+   3,
  ]

 ❯ tests/integration/ledger.test.ts:926:45
    924|     page.history.map((e: any) => e.id).sort((a: number, b: number) => …
    925|   );
    926|   expect(page.reminder_policy.offset_hours).toEqual([7, 1]);
       |                                             ^
    927|   expect(page.reminder_policy_origin).toBe('configured');
    928|   const next = await data(

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 18 skipped (19)
   Start at  21:26:10
   Duration  2.63s (transform 141ms, setup 0ms, collect 550ms, tests 1.87s, environment 0ms, prepare 55ms)

```

restored:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-s2

 ✓ tests/integration/ledger.test.ts (19 tests | 18 skipped) 1884ms
   ✓ read detail scopes and paginates task history and exposes scheduler policy without writing  1270ms

 Test Files  1 passed (1)
      Tests  1 passed | 18 skipped (19)
   Start at  21:26:13
   Duration  2.64s (transform 139ms, setup 0ms, collect 529ms, tests 1.88s, environment 0ms, prepare 66ms)

```

### read-only

Source: `apps/web/src/main.tsx`. Test command: `npx playwright test tests/e2e/s2.spec.ts --grep 'read-only routes'`.

baseline:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:2353) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:2366) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:2366) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:2406) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:2406) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  1 tests/e2e/s2.spec.ts:143:1 › S2 read-only routes, distinct dates, real policy, live clock and modal history (1.6s)

  1 passed (9.2s)
```

broken:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:2516) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:2529) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:2529) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:2567) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:2567) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✘  1 tests/e2e/s2.spec.ts:143:1 › S2 read-only routes, distinct dates, real policy, live clock and modal history (1.4s)


  1) tests/e2e/s2.spec.ts:143:1 › S2 read-only routes, distinct dates, real policy, live clock and modal history

    Error: expect(received).toEqual(expected) // deep equality

    - Expected  - 1
    + Received  + 3

    - Array []
    + Array [
    +   "PATCH",
    + ]

      252 |     page.getByRole('button', { name: 'Add task', exact: true }),
      253 |   ).toBeFocused();
    > 254 |   expect(writes).toEqual([]);
          |                  ^
      255 | });
      256 | function contrast(a: number[], b: number[]) {
      257 |   const lum = (c: number[]) =>
        at /workspace/scratch/bbff8dae2870/academic-os-s2/tests/e2e/s2.spec.ts:254:18

    Error Context: test-results/s2-S2-read-only-routes-dis-a30ae-ive-clock-and-modal-history/error-context.md

  1 failed
    tests/e2e/s2.spec.ts:143:1 › S2 read-only routes, distinct dates, real policy, live clock and modal history
```

restored:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:2677) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:2690) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:2690) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:2728) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:2728) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  1 tests/e2e/s2.spec.ts:143:1 › S2 read-only routes, distinct dates, real policy, live clock and modal history (1.3s)

  1 passed (8.0s)
```

### layered-history

Source: `apps/web/src/read/location.ts`. Test command: `npx playwright test tests/e2e/s2.spec.ts --grep 'read-only routes'`.

baseline:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:2842) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:2855) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:2855) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:2895) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:2895) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  1 tests/e2e/s2.spec.ts:143:1 › S2 read-only routes, distinct dates, real policy, live clock and modal history (1.3s)

  1 passed (9.0s)
```

broken:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:3006) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:3019) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:3019) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:3059) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:3059) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✘  1 tests/e2e/s2.spec.ts:143:1 › S2 read-only routes, distinct dates, real policy, live clock and modal history (6.1s)


  1) tests/e2e/s2.spec.ts:143:1 › S2 read-only routes, distinct dates, real policy, live clock and modal history

    Error: expect(page).toHaveURL(expected) failed

    Expected pattern: /\/tasks\/a87800a3-255f-4ad3-880f-0fcb623b7342$/
    Received string:  "about:blank"
    Timeout: 5000ms

    Call log:
      - Expect "toHaveURL" with timeout 5000ms
        9 × unexpected value "about:blank"


      205 |   await page.goBack();
      206 |   await expect(dialog).toHaveCount(0);
    > 207 |   await expect(page).toHaveURL(new RegExp('/tasks/' + id + '$'));
          |                      ^
      208 |   await expect(page.locator('[data-precision="datetime"]')).toContainText(
      209 |     '23:59',
      210 |   );
        at /workspace/scratch/bbff8dae2870/academic-os-s2/tests/e2e/s2.spec.ts:207:22

  1 failed
    tests/e2e/s2.spec.ts:143:1 › S2 read-only routes, distinct dates, real policy, live clock and modal history
```

restored:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:3168) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:3181) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:3181) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:3220) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:3220) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  1 tests/e2e/s2.spec.ts:143:1 › S2 read-only routes, distinct dates, real policy, live clock and modal history (1.5s)

  1 passed (8.2s)
```

### modal-sheet

Source: `apps/web/src/read/Sheet.tsx`. Test command: `npx playwright test tests/e2e/s2.spec.ts --grep 'read-only routes'`.

baseline:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:3330) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:3343) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:3343) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:3382) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:3382) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  1 tests/e2e/s2.spec.ts:143:1 › S2 read-only routes, distinct dates, real policy, live clock and modal history (1.2s)

  1 passed (7.8s)
```

broken:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:3492) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:3505) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:3505) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:3545) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:3545) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✘  1 tests/e2e/s2.spec.ts:143:1 › S2 read-only routes, distinct dates, real policy, live clock and modal history (888ms)


  1) tests/e2e/s2.spec.ts:143:1 › S2 read-only routes, distinct dates, real policy, live clock and modal history

    Error: expect(received).toBe(expected) // Object.is equality

    Expected: true
    Received: false

      186 |   const dialog = page.getByRole('dialog');
      187 |   await expect(dialog).toBeVisible();
    > 188 |   expect(await dialog.evaluate((el) => el.matches(':modal'))).toBe(true);
          |                                                               ^
      189 |   await expect(
      190 |     dialog.getByRole('button', { name: 'Save', exact: true }),
      191 |   ).toBeDisabled();
        at /workspace/scratch/bbff8dae2870/academic-os-s2/tests/e2e/s2.spec.ts:188:63

    Error Context: test-results/s2-S2-read-only-routes-dis-a30ae-ive-clock-and-modal-history/error-context.md

  1 failed
    tests/e2e/s2.spec.ts:143:1 › S2 read-only routes, distinct dates, real policy, live clock and modal history
```

restored:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:3655) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:3668) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:3668) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:3708) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:3708) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  1 tests/e2e/s2.spec.ts:143:1 › S2 read-only routes, distinct dates, real policy, live clock and modal history (1.4s)

  1 passed (9.0s)
```

### visible-clock

Source: `apps/web/src/read/clock.ts`. Test command: `npx playwright test tests/e2e/s2.spec.ts --grep 'read-only routes'`.

baseline:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:3819) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:3832) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:3832) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:3871) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:3871) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  1 tests/e2e/s2.spec.ts:143:1 › S2 read-only routes, distinct dates, real policy, live clock and modal history (1.3s)

  1 passed (7.7s)
```

broken:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:3982) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:3995) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:3995) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:4035) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:4035) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✘  1 tests/e2e/s2.spec.ts:143:1 › S2 read-only routes, distinct dates, real policy, live clock and modal history (5.7s)


  1) tests/e2e/s2.spec.ts:143:1 › S2 read-only routes, distinct dates, real policy, live clock and modal history

    Error: expect(locator).toHaveText(expected) failed

    Locator:  getByRole('article', { name: 'Synthetic exact deadline', exact: true }).locator('.s2-time-left')
    Expected: "11h 58m"
    Received: "11h 59m"
    Timeout:  5000ms

    Call log:
      - Expect "toHaveText" with timeout 5000ms
      - waiting for getByRole('article', { name: 'Synthetic exact deadline', exact: true }).locator('.s2-time-left')
        9 × locator resolved to <span class="s2-time-left">11h 59m</span>
          - unexpected value "11h 59m"


      155 |   await expect(card.locator('.s2-time-left')).toHaveText('11h 59m');
      156 |   await page.clock.fastForward(60000);
    > 157 |   await expect(card.locator('.s2-time-left')).toHaveText('11h 58m');
          |                                               ^
      158 |   await expect(
      159 |     article(page, 'Synthetic date-only deadline').locator('.seg'),
      160 |   ).toHaveCount(0);
        at /workspace/scratch/bbff8dae2870/academic-os-s2/tests/e2e/s2.spec.ts:157:47

    Error Context: test-results/s2-S2-read-only-routes-dis-a30ae-ive-clock-and-modal-history/error-context.md

  1 failed
    tests/e2e/s2.spec.ts:143:1 › S2 read-only routes, distinct dates, real policy, live clock and modal history
```

restored:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:4146) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:4159) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:4159) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:4199) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:4199) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  1 tests/e2e/s2.spec.ts:143:1 › S2 read-only routes, distinct dates, real policy, live clock and modal history (1.2s)

  1 passed (7.5s)
```

### text-contrast

Source: `apps/web/src/read/read.css`. Test command: `npx playwright test tests/e2e/s2.spec.ts --grep 360px`.

baseline:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:4310) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:4323) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:4323) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:4363) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:4363) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
S2 contrast observations {"screen":"Today","theme":"light","samples":25,"min_ratio":5.358466738754086}
S2 contrast observations {"screen":"Today","theme":"dark","samples":25,"min_ratio":6.339454211981419}
S2 contrast observations {"screen":"Tasks","theme":"light","samples":35,"min_ratio":5.358466738754086}
S2 contrast observations {"screen":"Tasks","theme":"dark","samples":35,"min_ratio":6.6576395847258585}
S2 target observations {"samples":22,"min_width":44,"min_height":44}
S2 contrast observations {"screen":"Detail","theme":"light","samples":19,"min_ratio":5.358466738754086}
S2 contrast observations {"screen":"Detail","theme":"dark","samples":19,"min_ratio":6.530358026876049}
S2 contrast observations {"screen":"Date sheet","theme":"light","samples":5,"min_ratio":5.998700193644534}
S2 contrast observations {"screen":"Date sheet","theme":"dark","samples":5,"min_ratio":6.6576395847258585}
S2 contrast observations {"screen":"Quick sheet","theme":"light","samples":8,"min_ratio":5.998700193644534}
S2 contrast observations {"screen":"Quick sheet","theme":"dark","samples":8,"min_ratio":6.6576395847258585}
  ✓  1 tests/e2e/s2.spec.ts:316:1 › S2 360px, doubled text, target sizes, foreground contrast and deep-link availability (1.6s)

  1 passed (8.6s)
```

broken:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:4471) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:4484) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:4484) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:4524) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:4524) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
S2 contrast observations {"screen":"Today","theme":"light","samples":25,"min_ratio":1}
  ✘  1 tests/e2e/s2.spec.ts:316:1 › S2 360px, doubled text, target sizes, foreground contrast and deep-link availability (521ms)


  1) tests/e2e/s2.spec.ts:316:1 › S2 360px, doubled text, target sizes, foreground contrast and deep-link availability

    Error: {"text":"2 due today","fg":[255,255,255],"bg":[255,255,255]}

    expect(received).toBeGreaterThanOrEqual(expected)

    Expected: >= 4.5
    Received:    1

      306 |     );
      307 |     for (const p of paints)
    > 308 |       expect(contrast(p.fg, p.bg), JSON.stringify(p)).toBeGreaterThanOrEqual(
          |                                                       ^
      309 |         4.5,
      310 |       );
      311 |   }
        at auditContrast (/workspace/scratch/bbff8dae2870/academic-os-s2/tests/e2e/s2.spec.ts:308:55)
        at /workspace/scratch/bbff8dae2870/academic-os-s2/tests/e2e/s2.spec.ts:321:5

    Error Context: test-results/s2-S2-360px-doubled-text-t-f5c69--and-deep-link-availability/error-context.md

  1 failed
    tests/e2e/s2.spec.ts:316:1 › S2 360px, doubled text, target sizes, foreground contrast and deep-link availability
```

restored:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:4633) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:4646) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:4646) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:4685) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:4685) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
S2 contrast observations {"screen":"Today","theme":"light","samples":25,"min_ratio":5.358466738754086}
S2 contrast observations {"screen":"Today","theme":"dark","samples":25,"min_ratio":6.339454211981419}
S2 contrast observations {"screen":"Tasks","theme":"light","samples":35,"min_ratio":5.358466738754086}
S2 contrast observations {"screen":"Tasks","theme":"dark","samples":35,"min_ratio":6.6576395847258585}
S2 target observations {"samples":22,"min_width":44,"min_height":44}
S2 contrast observations {"screen":"Detail","theme":"light","samples":19,"min_ratio":5.358466738754086}
S2 contrast observations {"screen":"Detail","theme":"dark","samples":19,"min_ratio":6.530358026876049}
S2 contrast observations {"screen":"Date sheet","theme":"light","samples":5,"min_ratio":5.998700193644534}
S2 contrast observations {"screen":"Date sheet","theme":"dark","samples":5,"min_ratio":6.6576395847258585}
S2 contrast observations {"screen":"Quick sheet","theme":"light","samples":8,"min_ratio":5.998700193644534}
S2 contrast observations {"screen":"Quick sheet","theme":"dark","samples":8,"min_ratio":6.6576395847258585}
  ✓  1 tests/e2e/s2.spec.ts:316:1 › S2 360px, doubled text, target sizes, foreground contrast and deep-link availability (1.9s)

  1 passed (8.8s)
```

### always-undated

Source: `apps/web/src/read/Ledger.tsx`. Test command: `npx vitest run tests/s2.test.ts`.

baseline:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-s2

 ✓ tests/s2.test.ts (4 tests) 200ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  21:28:46
   Duration  461ms (transform 119ms, setup 0ms, collect 73ms, tests 200ms, environment 0ms, prepare 60ms)

```

broken:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-s2

 ❯ tests/s2.test.ts (4 tests | 1 failed) 203ms
   ✓ calendar grouping keeps four precisions, fixed group order and date-only last on its local date 25ms
   ✓ grouping uses owner calendar boundaries rather than browser UTC, including DST and a large synthetic set 58ms
   ✓ reminder presentation follows effective server policy, including disabled, date-only and unknown 1ms
   × Today keeps its undated navigation even when the loaded ledger is empty 118ms
     → expected '<div class="s2-ledger"><header class=…' not to contain 'hidden=""'

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/s2.test.ts > Today keeps its undated navigation even when the loaded ledger is empty
AssertionError: expected '<div class="s2-ledger"><header class=…' not to contain 'hidden=""'

Expected: "hidden="""
Received: "<div class="s2-ledger"><header class="s2-screen-head"><div><p class="s2-date"><svg width="18" height="18" viewBox="0 0 9 9" shape-rendering="crispEdges" aria-hidden="true" focusable="false"><path fill="currentColor" d="M4 0h1v1h-1zM4 1h1v1h-1zM3 2h3v1h-3zM0 3h9v1h-9zM1 4h7v1h-7zM2 5h5v1h-5zM1 6h3v1h-3zM5 6h3v1h-3zM1 7h2v1h-2zM6 7h2v1h-2zM0 8h2v1h-2zM7 8h2v1h-2z"></path></svg>Friday, Nov 6</p><h1>Today</h1></div><button class="s2-icon-button" aria-label="Settings"><svg width="18" height="14" viewBox="0 0 9 7" shape-rendering="crispEdges" aria-hidden="true" focusable="false"><path fill="currentColor" d="M2 0h1v1h-1zM4 0h1v1h-1zM6 0h1v1h-1zM1 1h7v1h-7zM0 2h2v1h-2zM4 2h1v1h-1zM7 2h2v1h-2zM1 3h1v1h-1zM7 3h1v1h-1zM0 4h2v1h-2zM4 4h1v1h-1zM7 4h2v1h-2zM1 5h7v1h-7zM2 6h1v1h-1zM4 6h1v1h-1zM6 6h1v1h-1z"></path></svg></button></header><p id="s2-readonly" class="s2-note">Read-only preview. Changes are not available in this build.</p><div class="s2-chips"><span class="pixel-chip ">0 due today</span><span class="pixel-chip">0 this week</span></div><section aria-labelledby="s2-due-heading"><h2 class="s2-section" id="s2-due-heading">Due today / overdue</h2><div class="s2-empty"><svg width="54" height="54" viewBox="0 0 9 9" shape-rendering="crispEdges" aria-hidden="true" focusable="false"><path fill="currentColor" d="M4 0h1v1h-1zM4 1h1v1h-1zM3 2h3v1h-3zM0 3h9v1h-9zM1 4h7v1h-7zM2 5h5v1h-5zM1 6h3v1h-3zM5 6h3v1h-3zM1 7h2v1h-2zM6 7h2v1h-2zM0 8h2v1h-2zM7 8h2v1h-2z"></path></svg><p>No deadlines today</p></div></section><section><h2 class="s2-section">No date</h2><button hidden="" class="s2-unknown"><strong>0</strong> tasks without a confirmed deadline</button></section></div>"

 ❯ tests/s2.test.ts:135:20
    133|   expect(html).toContain('class="s2-unknown"');
    134|   expect(html).toContain('>0</strong>');
    135|   expect(html).not.toContain('hidden=""');
       |                    ^
    136|   const { contextInfo } = await import('../apps/web/src/read/Ledger');
    137|   expect(contextInfo({ ...rows[0], context_id: 'missing' }, [], 'en'))…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 3 passed (4)
   Start at  21:28:47
   Duration  480ms (transform 123ms, setup 0ms, collect 66ms, tests 203ms, environment 0ms, prepare 66ms)

```

restored:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-s2

 ✓ tests/s2.test.ts (4 tests) 159ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  21:28:48
   Duration  396ms (transform 103ms, setup 0ms, collect 61ms, tests 159ms, environment 0ms, prepare 51ms)

```

### aggregate-pending

Source: `apps/web/src/main.tsx`. Test command: `npx playwright test tests/e2e/s2.spec.ts --grep 'read-only routes'`.

baseline:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:5061) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:5074) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:5074) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:5114) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:5114) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  1 tests/e2e/s2.spec.ts:143:1 › S2 read-only routes, distinct dates, real policy, live clock and modal history (1.2s)

  1 passed (8.9s)
```

broken:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:5223) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:5236) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:5236) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:5276) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:5276) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✘  1 tests/e2e/s2.spec.ts:143:1 › S2 read-only routes, distinct dates, real policy, live clock and modal history (5.7s)


  1) tests/e2e/s2.spec.ts:143:1 › S2 read-only routes, distinct dates, real policy, live clock and modal history

    Error: expect(locator).toHaveText(expected) failed

    Locator:  locator('.main-nav b')
    Expected: "102"
    Received: "100"
    Timeout:  5000ms

    Call log:
      - Expect "toHaveText" with timeout 5000ms
      - waiting for locator('.main-nav b')
        9 × locator resolved to <b>100</b>
          - unexpected value "100"


      147 |     String(pending),
      148 |   );
    > 149 |   await expect(page.locator('.main-nav b')).toHaveText(String(pending));
          |                                             ^
      150 |   const card = article(page, 'Synthetic exact deadline');
      151 |   await expect(card).toBeVisible();
      152 |   await expect(
        at /workspace/scratch/bbff8dae2870/academic-os-s2/tests/e2e/s2.spec.ts:149:45

    Error Context: test-results/s2-S2-read-only-routes-dis-a30ae-ive-clock-and-modal-history/error-context.md

  1 failed
    tests/e2e/s2.spec.ts:143:1 › S2 read-only routes, distinct dates, real policy, live clock and modal history
```

restored:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:5387) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:5400) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:5400) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:5440) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:5440) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  1 tests/e2e/s2.spec.ts:143:1 › S2 read-only routes, distinct dates, real policy, live clock and modal history (1.7s)

  1 passed (9.8s)
```

### undated-filter

Source: `apps/web/src/read/Ledger.tsx`. Test command: `npx playwright test tests/e2e/s2.spec.ts --grep 'keeps partial'`.

baseline:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:5549) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:5562) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:5562) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:5601) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:5601) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  1 tests/e2e/s2.spec.ts:395:1 › S2 keeps partial disclosure until existing bounded pages actually reach unknown tasks (7.1s)

  1 passed (14.7s)
```

broken:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:5711) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:5724) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:5724) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:5765) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:5765) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✘  1 tests/e2e/s2.spec.ts:395:1 › S2 keeps partial disclosure until existing bounded pages actually reach unknown tasks (12.9s)


  1) tests/e2e/s2.spec.ts:395:1 › S2 keeps partial disclosure until existing bounded pages actually reach unknown tasks

    Error: expect(locator).toBeInViewport() failed

    Locator: getByRole('article', { name: 'Synthetic unknown duty', exact: true })
    Expected: in viewport
    Timeout: 5000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeInViewport" with timeout 5000ms
      - waiting for getByRole('article', { name: 'Synthetic unknown duty', exact: true })


      435 |   await page.locator('.s2-unknown').click();
      436 |   await expect(page).toHaveURL(/group=undated/);
    > 437 |   await expect(article(page, 'Synthetic unknown duty')).toBeInViewport();
          |                                                         ^
      438 | });
      439 |
      440 | test('S2 authorization denial clears the read session instead of retaining cached owner data', async ({
        at /workspace/scratch/bbff8dae2870/academic-os-s2/tests/e2e/s2.spec.ts:437:57

    Error Context: test-results/s2-S2-keeps-partial-disclo-473b5-ctually-reach-unknown-tasks/error-context.md

  1 failed
    tests/e2e/s2.spec.ts:395:1 › S2 keeps partial disclosure until existing bounded pages actually reach unknown tasks
```

restored:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:5875) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:5888) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:5888) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:5929) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:5929) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  1 tests/e2e/s2.spec.ts:395:1 › S2 keeps partial disclosure until existing bounded pages actually reach unknown tasks (7.7s)

  1 passed (15.6s)
```

### unavailable-context

Source: `apps/web/src/read/Ledger.tsx`. Test command: `npx vitest run tests/s2.test.ts`.

baseline:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-s2

 ✓ tests/s2.test.ts (4 tests) 173ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  21:30:15
   Duration  453ms (transform 115ms, setup 0ms, collect 72ms, tests 173ms, environment 0ms, prepare 60ms)

```

broken:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-s2

 ❯ tests/s2.test.ts (4 tests | 1 failed) 209ms
   ✓ calendar grouping keeps four precisions, fixed group order and date-only last on its local date 20ms
   ✓ grouping uses owner calendar boundaries rather than browser UTC, including DST and a large synthetic set 58ms
   ✓ reminder presentation follows effective server policy, including disabled, date-only and unknown 1ms
   × Today keeps its undated navigation even when the loaded ledger is empty 129ms
     → expected { name: 'Personal', type: 'unknown' } to deeply equal { name: 'Context unavailable', …(1) }

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/s2.test.ts > Today keeps its undated navigation even when the loaded ledger is empty
AssertionError: expected { name: 'Personal', type: 'unknown' } to deeply equal { name: 'Context unavailable', …(1) }

- Expected
+ Received

  {
-   "name": "Context unavailable",
+   "name": "Personal",
    "type": "unknown",
  }

 ❯ tests/s2.test.ts:137:72
    135|   expect(html).not.toContain('hidden=""');
    136|   const { contextInfo } = await import('../apps/web/src/read/Ledger');
    137|   expect(contextInfo({ ...rows[0], context_id: 'missing' }, [], 'en'))…
       |                                                                        ^
    138|     name: 'Context unavailable',
    139|     type: 'unknown',

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 3 passed (4)
   Start at  21:30:16
   Duration  482ms (transform 122ms, setup 0ms, collect 66ms, tests 209ms, environment 0ms, prepare 66ms)

```

restored:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-s2

 ✓ tests/s2.test.ts (4 tests) 196ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  21:30:18
   Duration  478ms (transform 124ms, setup 0ms, collect 61ms, tests 196ms, environment 0ms, prepare 73ms)

```

### read-auth-clear

Source: `apps/web/src/main.tsx`. Test command: `npx playwright test tests/e2e/s2.spec.ts --grep 'authorization denial'`.

baseline:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:6297) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:6310) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:6310) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:6349) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:6349) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  1 tests/e2e/s2.spec.ts:441:1 › S2 authorization denial clears the read session instead of retaining cached owner data (6.1s)

  1 passed (14.0s)
```

broken:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:6460) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:6473) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:6473) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:6513) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:6513) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✘  1 tests/e2e/s2.spec.ts:441:1 › S2 authorization denial clears the read session instead of retaining cached owner data (5.4s)


  1) tests/e2e/s2.spec.ts:441:1 › S2 authorization denial clears the read session instead of retaining cached owner data

    Error: expect(locator).toBeVisible() failed

    Locator: getByText('Sign in through private access to open your workspace.', { exact: true })
    Expected: visible
    Timeout: 5000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 5000ms
      - waiting for getByText('Sign in through private access to open your workspace.', { exact: true })


      460 |       exact: true,
      461 |     }),
    > 462 |   ).toBeVisible();
          |     ^
      463 |   await expect(page.locator('.main-nav b')).toHaveCount(0);
      464 |   await expect(page.locator('.s2-detail')).toHaveCount(0);
      465 |   await expect
        at /workspace/scratch/bbff8dae2870/academic-os-s2/tests/e2e/s2.spec.ts:462:5

    Error Context: test-results/s2-S2-authorization-denial-90ee0-retaining-cached-owner-data/error-context.md

  1 failed
    tests/e2e/s2.spec.ts:441:1 › S2 authorization denial clears the read session instead of retaining cached owner data
```

restored:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:6622) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:6635) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:6635) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:6675) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:6675) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  1 tests/e2e/s2.spec.ts:441:1 › S2 authorization denial clears the read session instead of retaining cached owner data (6.7s)

  1 passed (13.6s)
```

### exact-time-format

Source: `apps/web/src/read/model.ts`. Test command: `npx vitest run tests/s2.test.ts`.

baseline:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-s2

 ✓ tests/s2.test.ts (4 tests) 175ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  21:31:02
   Duration  444ms (transform 126ms, setup 0ms, collect 73ms, tests 175ms, environment 0ms, prepare 60ms)

```

broken:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-s2

 ❯ tests/s2.test.ts (4 tests | 1 failed) 226ms
   × calendar grouping keeps four precisions, fixed group order and date-only last on its local date 28ms
     → expected 'Nov 6, 2026, 11:59 PM · Asia/Makassar' to contain '23:59'
   ✓ grouping uses owner calendar boundaries rather than browser UTC, including DST and a large synthetic set 55ms
   ✓ reminder presentation follows effective server policy, including disabled, date-only and unknown 1ms
   ✓ Today keeps its undated navigation even when the loaded ledger is empty 142ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/s2.test.ts > calendar grouping keeps four precisions, fixed group order and date-only last on its local date
AssertionError: expected 'Nov 6, 2026, 11:59 PM · Asia/Makassar' to contain '23:59'

Expected: "23:59"
Received: "Nov 6, 2026, 11:59 PM · Asia/Makassar"

 ❯ tests/s2.test.ts:43:21
     41|   expect(groups.done.map((t) => t.title)).toEqual(['Synthetic complete…
     42|   const labels = rows.map((t) => dueLabel(t, 'en'));
     43|   expect(labels[1]).toContain('23:59');
       |                     ^
     44|   expect(labels[2]).toContain('Date only');
     45|   expect(labels[2]).not.toMatch(/00:00|23:59/);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 3 passed (4)
   Start at  21:31:03
   Duration  513ms (transform 136ms, setup 0ms, collect 66ms, tests 226ms, environment 0ms, prepare 68ms)

```

restored:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-s2

 ✓ tests/s2.test.ts (4 tests) 192ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  21:31:04
   Duration  504ms (transform 126ms, setup 0ms, collect 84ms, tests 192ms, environment 0ms, prepare 73ms)

```

### bounded-detail

Source: `apps/web/src/read/read.css`. Test command: `npx playwright test tests/e2e/s2.spec.ts --grep 360px`.

baseline:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:7047) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:7060) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:7060) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:7102) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:7102) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
S2 contrast observations {"screen":"Today","theme":"light","samples":25,"min_ratio":5.358466738754086}
S2 contrast observations {"screen":"Today","theme":"dark","samples":25,"min_ratio":6.339454211981419}
S2 contrast observations {"screen":"Tasks","theme":"light","samples":35,"min_ratio":5.358466738754086}
S2 contrast observations {"screen":"Tasks","theme":"dark","samples":35,"min_ratio":6.6576395847258585}
S2 target observations {"samples":22,"min_width":44,"min_height":44}
S2 contrast observations {"screen":"Detail","theme":"light","samples":19,"min_ratio":5.358466738754086}
S2 contrast observations {"screen":"Detail","theme":"dark","samples":19,"min_ratio":6.530358026876049}
S2 contrast observations {"screen":"Date sheet","theme":"light","samples":5,"min_ratio":5.998700193644534}
S2 contrast observations {"screen":"Date sheet","theme":"dark","samples":5,"min_ratio":6.6576395847258585}
S2 contrast observations {"screen":"Quick sheet","theme":"light","samples":8,"min_ratio":5.998700193644534}
S2 contrast observations {"screen":"Quick sheet","theme":"dark","samples":8,"min_ratio":6.6576395847258585}
  ✓  1 tests/e2e/s2.spec.ts:316:1 › S2 360px, doubled text, target sizes, foreground contrast and deep-link availability (1.8s)

  1 passed (8.3s)
```

broken:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:7208) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:7221) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:7221) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:7260) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:7260) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
S2 contrast observations {"screen":"Today","theme":"light","samples":25,"min_ratio":5.358466738754086}
S2 contrast observations {"screen":"Today","theme":"dark","samples":25,"min_ratio":6.339454211981419}
S2 contrast observations {"screen":"Tasks","theme":"light","samples":35,"min_ratio":5.358466738754086}
S2 contrast observations {"screen":"Tasks","theme":"dark","samples":35,"min_ratio":6.6576395847258585}
S2 target observations {"samples":22,"min_width":44,"min_height":44}
  ✘  1 tests/e2e/s2.spec.ts:316:1 › S2 360px, doubled text, target sizes, foreground contrast and deep-link availability (1.2s)


  1) tests/e2e/s2.spec.ts:316:1 › S2 360px, doubled text, target sizes, foreground contrast and deep-link availability

    Error: expect(received).toBe(expected) // Object.is equality

    Expected: true
    Received: false

      373 |       .locator('.s2-detail')
      374 |       .evaluate((el) => el.getBoundingClientRect().height <= innerHeight),
    > 375 |   ).toBe(true);
          |     ^
      376 |   await auditContrast(page, '.s2-detail', 'Detail');
      377 |   await page.locator('.s2-detail').evaluate((root) => {
      378 |     const nodes = [...root.querySelectorAll<HTMLElement>('*')];
        at /workspace/scratch/bbff8dae2870/academic-os-s2/tests/e2e/s2.spec.ts:375:5

    Error Context: test-results/s2-S2-360px-doubled-text-t-f5c69--and-deep-link-availability/error-context.md

  1 failed
    tests/e2e/s2.spec.ts:316:1 › S2 360px, doubled text, target sizes, foreground contrast and deep-link availability
```

restored:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:7370) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:7383) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:7383) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:7423) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:7423) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
S2 contrast observations {"screen":"Today","theme":"light","samples":25,"min_ratio":5.358466738754086}
S2 contrast observations {"screen":"Today","theme":"dark","samples":25,"min_ratio":6.339454211981419}
S2 contrast observations {"screen":"Tasks","theme":"light","samples":35,"min_ratio":5.358466738754086}
S2 contrast observations {"screen":"Tasks","theme":"dark","samples":35,"min_ratio":6.6576395847258585}
S2 target observations {"samples":22,"min_width":44,"min_height":44}
S2 contrast observations {"screen":"Detail","theme":"light","samples":19,"min_ratio":5.358466738754086}
S2 contrast observations {"screen":"Detail","theme":"dark","samples":19,"min_ratio":6.530358026876049}
S2 contrast observations {"screen":"Date sheet","theme":"light","samples":5,"min_ratio":5.998700193644534}
S2 contrast observations {"screen":"Date sheet","theme":"dark","samples":5,"min_ratio":6.6576395847258585}
S2 contrast observations {"screen":"Quick sheet","theme":"light","samples":8,"min_ratio":5.998700193644534}
S2 contrast observations {"screen":"Quick sheet","theme":"dark","samples":8,"min_ratio":6.6576395847258585}
  ✓  1 tests/e2e/s2.spec.ts:316:1 › S2 360px, doubled text, target sizes, foreground contrast and deep-link availability (1.5s)

  1 passed (7.9s)
```

### toast-hit-testing

Source: `apps/web/src/read/read.css`. Test command: `npx playwright test tests/e2e/s2.spec.ts --grep 'read-only routes'`.

baseline:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:7532) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:7545) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:7545) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:7585) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:7585) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  1 tests/e2e/s2.spec.ts:143:1 › S2 read-only routes, distinct dates, real policy, live clock and modal history (1.5s)

  1 passed (8.5s)
```

broken:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:7694) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:7707) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:7707) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:7746) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:7746) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✘  1 tests/e2e/s2.spec.ts:143:1 › S2 read-only routes, distinct dates, real policy, live clock and modal history (1.2s)


  1) tests/e2e/s2.spec.ts:143:1 › S2 read-only routes, distinct dates, real policy, live clock and modal history

    Error: expect(received).toBe(expected) // Object.is equality

    Expected: true
    Received: false

      244 |         );
      245 |       }),
    > 246 |   ).toBe(true);
          |     ^
      247 |   await page.getByRole('button', { name: 'Add task', exact: true }).click();
      248 |   await expect(page.getByRole('dialog')).toBeVisible();
      249 |   await page.mouse.click(2, 2);
        at /workspace/scratch/bbff8dae2870/academic-os-s2/tests/e2e/s2.spec.ts:246:5

    Error Context: test-results/s2-S2-read-only-routes-dis-a30ae-ive-clock-and-modal-history/error-context.md

  1 failed
    tests/e2e/s2.spec.ts:143:1 › S2 read-only routes, distinct dates, real policy, live clock and modal history
```

restored:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:7857) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:7870) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:7870) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:7911) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:7911) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  1 tests/e2e/s2.spec.ts:143:1 › S2 read-only routes, distinct dates, real policy, live clock and modal history (1.5s)

  1 passed (8.2s)
```

### exact-instant-order

Source: `apps/web/src/read/model.ts`. Test command: `npx vitest run tests/s2.test.ts`.

baseline:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-s2

 ✓ tests/s2.test.ts (4 tests) 196ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  21:32:00
   Duration  483ms (transform 124ms, setup 0ms, collect 72ms, tests 196ms, environment 0ms, prepare 66ms)

```

broken:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-s2

 ❯ tests/s2.test.ts (4 tests | 1 failed) 237ms
   ✓ calendar grouping keeps four precisions, fixed group order and date-only last on its local date 19ms
   × grouping uses owner calendar boundaries rather than browser UTC, including DST and a large synthetic set 77ms
     → expected [ 'later', 'earlier' ] to deeply equal [ 'earlier', 'later' ]
   ✓ reminder presentation follows effective server policy, including disabled, date-only and unknown 1ms
   ✓ Today keeps its undated navigation even when the loaded ledger is empty 139ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/s2.test.ts > grouping uses owner calendar boundaries rather than browser UTC, including DST and a large synthetic set
AssertionError: expected [ 'later', 'earlier' ] to deeply equal [ 'earlier', 'later' ]

- Expected
+ Received

  [
-   "earlier",
    "later",
+   "earlier",
  ]

 ❯ tests/s2.test.ts:80:5
     78|       'America/New_York',
     79|     ).today.map((t) => t.id),
     80|   ).toEqual(['earlier', 'later']);
       |     ^
     81|   const completedUnknown = { ...rows[6], status: 'done' };
     82|   expect(groupTasks([completedUnknown], now, zone).undated).toEqual([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 3 passed (4)
   Start at  21:32:01
   Duration  493ms (transform 148ms, setup 0ms, collect 66ms, tests 237ms, environment 0ms, prepare 56ms)

```

restored:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-s2

 ✓ tests/s2.test.ts (4 tests) 170ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  21:32:02
   Duration  482ms (transform 121ms, setup 0ms, collect 76ms, tests 170ms, environment 0ms, prepare 70ms)

```

### unknown-done-group

Source: `apps/web/src/read/model.ts`. Test command: `npx vitest run tests/s2.test.ts`.

baseline:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-s2

 ✓ tests/s2.test.ts (4 tests) 184ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  21:32:04
   Duration  436ms (transform 113ms, setup 0ms, collect 63ms, tests 184ms, environment 0ms, prepare 57ms)

```

broken:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-s2

 ❯ tests/s2.test.ts (4 tests | 1 failed) 264ms
   ✓ calendar grouping keeps four precisions, fixed group order and date-only last on its local date 17ms
   × grouping uses owner calendar boundaries rather than browser UTC, including DST and a large synthetic set 86ms
     → expected [] to deeply equal [ { …(8) } ]
   ✓ reminder presentation follows effective server policy, including disabled, date-only and unknown 1ms
   ✓ Today keeps its undated navigation even when the loaded ledger is empty 159ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/s2.test.ts > grouping uses owner calendar boundaries rather than browser UTC, including DST and a large synthetic set
AssertionError: expected [] to deeply equal [ { …(8) } ]

- Expected
+ Received

- [
-   {
-     "context": "organization",
-     "context_id": null,
-     "due": {
-       "local_date": null,
-       "local_datetime": null,
-       "precision": "unknown",
-       "timezone": null,
-     },
-     "due_at_utc": null,
-     "id": "6",
-     "status": "done",
-     "title": "Synthetic unknown duty",
-     "version": 1,
-   },
- ]
+ []

 ❯ tests/s2.test.ts:82:61
     80|   ).toEqual(['earlier', 'later']);
     81|   const completedUnknown = { ...rows[6], status: 'done' };
     82|   expect(groupTasks([completedUnknown], now, zone).undated).toEqual([
       |                                                             ^
     83|     completedUnknown,
     84|   ]);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 3 passed (4)
   Start at  21:32:05
   Duration  534ms (transform 166ms, setup 0ms, collect 67ms, tests 264ms, environment 0ms, prepare 60ms)

```

restored:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-s2

 ✓ tests/s2.test.ts (4 tests) 174ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  21:32:06
   Duration  422ms (transform 100ms, setup 0ms, collect 60ms, tests 174ms, environment 0ms, prepare 52ms)

```

### history-page-error

Source: `apps/web/src/read/Ledger.tsx`. Test command: `npx playwright test tests/e2e/s2.spec.ts --grep 'history paging'`.

baseline:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:8544) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:8557) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:8557) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:8597) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:8597) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  1 tests/e2e/s2.spec.ts:503:1 › S2 history paging failure preserves known detail and retries a bounded page (2.4s)

  1 passed (9.9s)
```

broken:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:8709) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:8722) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:8722) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:8764) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:8764) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✘  1 tests/e2e/s2.spec.ts:503:1 › S2 history paging failure preserves known detail and retries a bounded page (7.3s)


  1) tests/e2e/s2.spec.ts:503:1 › S2 history paging failure preserves known detail and retries a bounded page

    Error: expect(locator).toHaveText(expected) failed

    Locator:  getByRole('alert')
    Expected: "Data unavailable"
    Received: "Task unavailable or access denied."
    Timeout:  5000ms

    Call log:
      - Expect "toHaveText" with timeout 5000ms
      - waiting for getByRole('alert')
        9 × locator resolved to <p role="alert">Task unavailable or access denied.</p>
          - unexpected value "Task unavailable or access denied."


      539 |     .getByRole('button', { name: 'Load earlier history', exact: true })
      540 |     .click();
    > 541 |   await expect(page.getByRole('alert')).toHaveText('Data unavailable');
          |                                         ^
      542 |   await expect(
      543 |     page.getByRole('heading', { name: item.title, exact: true }),
      544 |   ).toBeVisible();
        at /workspace/scratch/bbff8dae2870/academic-os-s2/tests/e2e/s2.spec.ts:541:41

    Error Context: test-results/s2-S2-history-paging-failu-a7074--and-retries-a-bounded-page/error-context.md

  1 failed
    tests/e2e/s2.spec.ts:503:1 › S2 history paging failure preserves known detail and retries a bounded page
```

restored:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:8871) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:8884) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:8884) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:8925) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:8925) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  1 tests/e2e/s2.spec.ts:503:1 › S2 history paging failure preserves known detail and retries a bounded page (2.7s)

  1 passed (11.2s)
```

## Synthetic review renders

```bash
node scripts/render_s2.mjs --output-dir /absolute/synthetic/render-output
```

```text
Captured 28 synthetic review renders; browser 141.0.7390.37. No device verdict or pixel-equality claim.
```

## Placeholder scan

```bash
.venv/bin/python scripts/check_placeholders.py
```

```text
PASS: no common private-key/provider-token formats found in project files; configuration examples remain placeholders.
```

## Recorded legacy selector failure (fixed; not an acceptance pass)

```bash
npm run test:e2e
```

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> test:e2e
> playwright test

[WebServer] (node:380) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:393) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:393) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 11 tests using 1 worker

(node:433) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:433) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓   1 tests/e2e/app.spec.ts:2:1 › organization context, task persistence, completion and offline snapshot (3.6s)
  ✓   2 tests/e2e/app.spec.ts:129:1 › 360px navigation and both themes fit the viewport (489ms)
  ✓   3 tests/e2e/app.spec.ts:158:1 › save reminder rules twice with quiet hours (1.8s)
  ✓   4 tests/e2e/app.spec.ts:192:1 › edit task, keep date-only precision and navigate month calendar (1.3s)
  ✘   5 tests/e2e/app.spec.ts:248:1 › correct a proposal before approval (30.0s)
(node:583) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:583) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓   6 tests/e2e/foundation.spec.ts:2:1 › foundation: fonts stay local, theme follows system and override, reduced motion and 200% text (1.1s)
  ✓   7 tests/e2e/foundation.spec.ts:68:1 › foundation: four tabs and secondary workflows remain reachable at 360px (861ms)
  ✓   8 tests/e2e/s2.spec.ts:143:1 › S2 read-only routes, distinct dates, real policy, live clock and modal history (1.6s)
S2 contrast observations {"screen":"Today","theme":"light","samples":25,"min_ratio":5.358466738754086}
S2 contrast observations {"screen":"Today","theme":"dark","samples":25,"min_ratio":6.339454211981419}
S2 contrast observations {"screen":"Tasks","theme":"light","samples":41,"min_ratio":5.358466738754086}
S2 contrast observations {"screen":"Tasks","theme":"dark","samples":41,"min_ratio":6.6576395847258585}
S2 target observations {"samples":26,"min_width":44,"min_height":44}
  ✓   9 tests/e2e/s2.spec.ts:271:1 › S2 360px, doubled text, target sizes, foreground contrast and deep-link availability (1.5s)
  ✓  10 tests/e2e/s2.spec.ts:360:1 › S2 keeps partial disclosure until existing bounded pages actually reach unknown tasks (8.1s)
  ✓  11 tests/e2e/s2.spec.ts:406:1 › S2 authorization denial clears the read session instead of retaining cached owner data (736ms)


  1) tests/e2e/app.spec.ts:248:1 › correct a proposal before approval ──────────────────────────────

    Test timeout of 30000ms exceeded.

    Error: locator.click: Test timeout of 30000ms exceeded.
    Call log:
      - waiting for getByRole('button', { name: 'Review', exact: true })


      175 |   await page.locator('.shell-tools > summary').click();
      176 |   await page.getByRole('button', { name: 'English', exact: true }).click();
    > 177 |   await page.getByRole('button', { name: 'Review', exact: true }).click();
          |                                                                   ^
      178 |   const proposal = page.locator('article.proposal').filter({
      179 |     has: page.getByRole('heading', { name: 'Synthetic proposal for review' }),
      180 |   });
        at /workspace/scratch/bbff8dae2870/academic-os-s2/tests/e2e/app.spec.ts:177:67

    Error Context: test-results/app-correct-a-proposal-before-approval/error-context.md

  1 failed
    tests/e2e/app.spec.ts:248:1 › correct a proposal before approval ───────────────────────────────
  10 passed (59.7s)
```

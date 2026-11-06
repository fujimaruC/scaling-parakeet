# S1 design foundation — actual check output

Synthetic/local checks only; no device/account/provider/push or capture observations.
ANSI terminal color sequences and trailing terminal padding removed for readability; output content otherwise retained.
Exact command variants, setup and limitations are in VERIFICATION-LOG §8.
Planning validation output follows after this file exists.

## npm ci

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

added 170 packages in 16s
npm notice
npm notice New major version of npm available! 11.9.0 -> 12.2.2
npm notice Changelog: https://github.com/npm/cli/releases/tag/v12.2.2
npm notice To update run: npm install -g npm@12.2.2
npm notice
```

## npm run check

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


 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-polish

 ✓ tests/integration/ledger.test.ts (18 tests) 8917ms
   ✓ persistent ledger > processes reminders without collector or AI and cancels old deadline revisions  382ms
   ✓ signed ingestion remains proposal-only and explicit approval is idempotent  525ms
   ✓ title-only edits preserve reminder revision and do not re-alert  321ms
   ✓ snooze retries are idempotent and completed tasks cannot snooze  557ms
   ✓ deadline-change approval requires explicit current target and preserves history  469ms
   ✓ source purge scrubs sole-source tasks, preserves manual edits, and accepts a scoped local wipe acknowledgment  882ms
   ✓ task pagination has no duplicates and applies context/status filters  430ms
   ✓ configurable reminder rules rebuild future intents without changing deadline precision  1961ms
   ✓ quiet hours defer and coalesce reminders without changing deadlines, including daylight-saving boundaries  1242ms
   ✓ device actions require explicit attestations and expiry/retirement never confirm  610ms
   ✓ durable Linux receipt is queued until phone explicitly reports cleanup  318ms
 ✓ tests/foundation.test.ts (2 tests) 10ms

 Test Files  2 passed (2)
      Tests  20 passed (20)
   Start at  19:14:26
   Duration  10.32s (transform 275ms, setup 0ms, collect 873ms, tests 8.93s, environment 0ms, prepare 191ms)

npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> build
> npm run build -w @academic-os/web && npm run build -w @academic-os/worker

npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> build
> vite build

vite v7.3.7 building client environment for production...
transforming...
✓ 40 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.44 kB │ gzip:  0.30 kB
dist/assets/index-ewRyVn0K.css   12.31 kB │ gzip:  3.46 kB
dist/assets/index-DbbapMUt.js   255.54 kB │ gzip: 80.60 kB
✓ built in 919ms
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> build
> wrangler deploy --dry-run --outdir dist

▲ [WARNING] Proxy environment variables detected. We'll use your proxy for fetch requests.



 ⛅️ wrangler 4.158.0
────────────────────
✨ Read 15 files from the assets directory /workspace/scratch/bbff8dae2870/academic-os-polish/apps/web/dist
Total Upload: 426.12 KiB / gzip: 84.01 KiB
Your Worker has access to the following bindings:
Binding                               Resource
env.DB (academic-os)                  D1 Database
env.ASSETS                            Assets
env.OWNER_SUB ("UNCONFIGURED")        Environment Variable
env.ACCESS_TEAM ("UNCONFIGURED")      Environment Variable
env.ACCESS_AUD ("UNCONFIGURED")       Environment Variable

--dry-run: exiting now.
```

## npm run test:e2e

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> test:e2e
> playwright test

[WebServer] (node:360) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:373) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:373) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 7 tests using 1 worker

(node:415) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:415) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  1 tests/e2e/app.spec.ts:2:1 › organization context, task persistence, completion and offline snapshot (1.8s)
  ✓  2 tests/e2e/app.spec.ts:94:1 › 360px navigation and both themes fit the viewport (421ms)
  ✓  3 tests/e2e/app.spec.ts:122:1 › save reminder rules twice with quiet hours (1.3s)
  ✓  4 tests/e2e/app.spec.ts:155:1 › edit task, keep date-only precision and navigate month calendar (1.1s)
  ✓  5 tests/e2e/app.spec.ts:206:1 › correct a proposal before approval (905ms)
  ✓  6 tests/e2e/foundation.spec.ts:2:1 › foundation: fonts stay local, theme follows system and override, reduced motion and 200% text (694ms)
  ✓  7 tests/e2e/foundation.spec.ts:68:1 › foundation: four tabs and secondary workflows remain reachable at 360px (593ms)

  7 passed (12.8s)
```

## npm run test:pwa

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> test:pwa
> npm run build -w @academic-os/web && playwright test --config playwright.production.config.ts

npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> build
> vite build

vite v7.3.7 building client environment for production...
transforming...
✓ 40 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.44 kB │ gzip:  0.30 kB
dist/assets/index-ewRyVn0K.css   12.31 kB │ gzip:  3.46 kB
dist/assets/index-DbbapMUt.js   255.54 kB │ gzip: 80.60 kB
✓ built in 949ms
[WebServer] (node:658) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:671) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:671) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:701) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:701) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  1 tests/production/offline.spec.ts:2:1 › built PWA reloads offline and logout clears its private snapshot (917ms)

  1 passed (6.5s)
```

## Python unittest discovery

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
Ran 33 tests in 1.572s

OK
```

## Native build/lint/JVM (explicit private JDK/SDK/proxy)

```text
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=45371

Welcome to Gradle 8.11.1!

Here are the highlights of this release:
 - Parallel load and store for Configuration Cache
 - Java compilation errors at the end of the build output
 - Consolidated report for warnings and deprecations

For more details see https://docs.gradle.org/8.11.1/release-notes.html

To honour the JVM settings for this build a single-use Daemon process will be forked. For more on this, please refer to https://docs.gradle.org/8.11.1/userguide/gradle_daemon.html#sec:disabling_the_daemon in the Gradle documentation.
Daemon will be stopped at the end of the build
Checking the license for package Android SDK Platform-Tools in /workspace/scratch/bbff8dae2870/polish-tools/sdk/licenses
License for package Android SDK Platform-Tools accepted.
Preparing "Install Android SDK Platform-Tools v.37.0.1".
"Install Android SDK Platform-Tools v.37.0.1" ready.
Installing Android SDK Platform-Tools in /workspace/scratch/bbff8dae2870/polish-tools/sdk/platform-tools
"Install Android SDK Platform-Tools v.37.0.1" complete.
"Install Android SDK Platform-Tools v.37.0.1" finished.
> Task :app:evidenceProvenance
> Task :app:preBuild
> Task :app:preDebugBuild
> Task :app:mergeDebugNativeDebugMetadata NO-SOURCE
> Task :app:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :app:generateDebugResValues
> Task :app:checkDebugAarMetadata
> Task :app:mapDebugSourceSetPaths
> Task :app:generateDebugResources
> Task :app:packageDebugResources
> Task :app:mergeDebugResources
> Task :app:createDebugCompatibleScreenManifests
> Task :app:extractDeepLinksDebug
> Task :app:parseDebugLocalResources
> Task :app:processDebugMainManifest
> Task :app:processDebugManifest
> Task :app:processDebugManifestForPackage
> Task :app:javaPreCompileDebug
> Task :app:mergeDebugShaders
> Task :app:compileDebugShaders NO-SOURCE
> Task :app:generateDebugAssets UP-TO-DATE
> Task :app:mergeDebugAssets
> Task :app:compressDebugAssets
> Task :app:desugarDebugFileDependencies
> Task :app:processDebugResources
> Task :app:checkDebugDuplicateClasses
> Task :app:compileDebugKotlin
> Task :app:compileDebugJavaWithJavac NO-SOURCE
> Task :app:dexBuilderDebug
> Task :app:mergeDebugGlobalSynthetics
> Task :app:processDebugJavaRes
> Task :app:mergeLibDexDebug
> Task :app:mergeDebugJniLibFolders
> Task :app:mergeDebugNativeLibs NO-SOURCE
> Task :app:stripDebugDebugSymbols NO-SOURCE
> Task :app:mergeProjectDexDebug
> Task :app:mergeDebugJavaResource
> Task :app:mergeExtDexDebug
> Task :app:validateSigningDebug
> Task :app:writeDebugAppMetadata
> Task :app:writeDebugSigningConfigVersions

> Task :app:verifyApi28
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=45371

> Task :app:packageDebug
> Task :app:bundleDebugClassesToCompileJar
> Task :app:createDebugApkListingFileRedirect
> Task :app:assembleDebug
> Task :app:preDebugAndroidTestBuild SKIPPED
> Task :app:generateDebugAndroidTestResValues
> Task :app:generateDebugAndroidTestLintModel
> Task :app:extractProguardFiles
> Task :app:generateDebugLintReportModel
> Task :app:preDebugUnitTestBuild
> Task :app:generateDebugUnitTestLintModel
> Task :app:lintAnalyzeDebug
> Task :app:bundleDebugClassesToRuntimeJar
> Task :app:javaPreCompileDebugUnitTest
> Task :app:compileDebugUnitTestKotlin
> Task :app:compileDebugUnitTestJavaWithJavac NO-SOURCE
> Task :app:processDebugUnitTestJavaRes

> Task :app:testQueuePrivacy
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=45371
PASS fingerprint is deterministic only within the keyed installation
PASS missing AES key with queued OR pairing ciphertext never generates
PASS lost dedupe key with queued rows never generates
PASS restart reuses keys and ciphertext; loss remains blocked
PASS legacy format requires explicit owner reset, even when empty
PASS purge acknowledgment follows durable application and stops on failures
Queue privacy policy: 6 tests passed (JVM only; Android Keystore/SQLite/device unverified)

> Task :app:testDebugUnitTest
> Task :app:lintAnalyzeDebugAndroidTest
> Task :app:lintAnalyzeDebugUnitTest

> Task :app:lintReportDebug
Wrote HTML report to file:///workspace/scratch/bbff8dae2870/academic-os-polish/apps/android-companion/app/build/reports/lint-results-debug.html

> Task :app:lintDebug
> Task :app:lint
[Incubating] Problems report is available at: file:///workspace/scratch/bbff8dae2870/academic-os-polish/apps/android-companion/build/reports/problems/problems-report.html

Deprecated Gradle features were used in this build, making it incompatible with Gradle 9.0.

You can use '--warning-mode all' to show the individual deprecation warnings and determine if they come from your own scripts or plugins.

For more on this, please refer to https://docs.gradle.org/8.11.1/userguide/command_line_interface.html#sec:command_line_warnings in the Gradle documentation.

BUILD SUCCESSFUL in 2m 31s
52 actionable tasks: 52 executed
EXIT 0
```

## Native lint report

```text
/workspace/scratch/bbff8dae2870/academic-os-polish/apps/android-companion/app/src/main/java/id/academicos/companion/Transport.kt:21: Warning: Consider using apply() instead; commit writes its data to persistent storage immediately, whereas apply will handle it in the background [ApplySharedPref]
 fun clearPending(){prefs.edit().remove("batch").commit()}
                                                 ~~~~~~~~

   Explanation for issues of type "ApplySharedPref":
   Consider using apply() instead of commit on shared preferences. Whereas
   commit blocks and writes its data to persistent storage immediately, apply
   will handle it in the background.

/workspace/scratch/bbff8dae2870/academic-os-polish/apps/android-companion/app/src/main/java/id/academicos/companion/Transport.kt:27: Warning: Implementing a custom X509TrustManager is error-prone and likely to be insecure. It is likely to disable certificate validation altogether, and is non-trivial to implement correctly without calling Android's default implementation. [CustomX509TrustManager]
  val manager=object:X509TrustManager{
              ~~~~~~

   Explanation for issues of type "CustomX509TrustManager":
   This check looks for custom X509TrustManager implementations.

   https://goo.gle/CustomX509TrustManager

/workspace/scratch/bbff8dae2870/academic-os-polish/apps/android-companion/app/src/main/AndroidManifest.xml:2: Warning: Should explicitly set android:icon, there is no default [MissingApplicationIcon]
<uses-permission android:name="android.permission.INTERNET"/><uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/><application android:allowBackup="false" android:fullBackupContent="false" android:dataExtractionRules="@xml/data_extraction_rules" android:usesCleartextTraffic="false" android:label="Academic OS Capture" android:theme="@android:style/Theme.Material.Light.NoActionBar">
                                                                                                                                       ~~~~~~~~~~~

   Explanation for issues of type "MissingApplicationIcon":
   You should set an icon for the application as whole because there is no
   default. This attribute must be set as a reference to a drawable resource
   containing the image (for example @drawable/icon).

   https://developer.android.com/studio/publish/preparing#publishing-configure

/workspace/scratch/bbff8dae2870/academic-os-polish/apps/android-companion/app/src/main/java/id/academicos/companion/MainActivity.kt:51: Warning: String literal in setText can not be translated. Use Android resources instead. [SetTextI18n]
  val enabled=Switch(this).apply {text="Enable selected test conversation";isChecked=settings.getBoolean("enabled",false);isEnabled=!low};content.addView(enabled)
                                        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

   Explanation for issues of type "SetTextI18n":
   When calling TextView#setText
   * Never call Number#toString() to format numbers; it will not handle
   fraction separators and locale-specific digits properly. Consider using
   String#format with proper format specifications (%d or %f) instead.
   * Do not pass a string literal (e.g. "Hello") to display text. Hardcoded
   text can not be properly translated to other languages. Consider using
   Android resource strings instead.
   * Do not build messages by concatenating text chunks. Such messages can not
   be properly translated.

   https://developer.android.com/guide/topics/resources/localization.html

0 errors, 4 warnings
```

## Foundation fault runner

```text
Declared faults: 4
imprecise-urgency baseline: exit 0
imprecise-urgency broken: exit 1
imprecise-urgency restored: exit 0
frozen-system-theme baseline: exit 0
frozen-system-theme broken: exit 1
frozen-system-theme restored: exit 0
missing-local-fonts baseline: exit 0
missing-local-fonts broken: exit 1
missing-local-fonts restored: exit 0
hidden-secondary-routes baseline: exit 0
hidden-secondary-routes broken: exit 1
hidden-secondary-routes restored: exit 0
PASS: 4 broken runs failed, 4 restored runs passed; source restored.
```

## Foundation browser / review renders

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:32) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:45) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:45) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 2 tests using 1 worker

(node:85) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:85) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  1 tests/e2e/foundation.spec.ts:2:1 › foundation: fonts stay local, theme follows system and override, reduced motion and 200% text (843ms)
  ✓  2 tests/e2e/foundation.spec.ts:68:1 › foundation: four tabs and secondary workflows remain reachable at 360px (621ms)

  2 passed (4.1s)
```

## Production kit content absence check

```text
PASS: development-kit content absent from compiled production JavaScript
```

## Placeholder scan

```text
PASS: no common private-key/provider-token formats found in project files; configuration examples remain placeholders.
```

## Environment

```text
v24.22.1
11.9.0
javac 17.0.20
Python 3.12.14 (main, Aug 25 2026, 14:00:49) [Clang 22.1.3 ]
node --version
npm --version
/workspace/scratch/bbff8dae2870/polish-tools/jdk/bin/javac -version
platforms/android-28
Pkg.Desc=Android SDK Platform 9
Pkg.UserSrc=false
Platform.Version=9
Platform.CodeName=
Pkg.Revision=6
AndroidVersion.ApiLevel=28
Layoutlib.Api=15
Layoutlib.Revision=1
Platform.MinToolsRev=22

platforms/android-35
Pkg.Desc=Android SDK Platform 15
Pkg.UserSrc=false
Platform.Version=15
Platform.CodeName=
Pkg.Revision=2
AndroidVersion.ApiLevel=35
AndroidVersion.ExtensionLevel=13
AndroidVersion.IsBaseSdk=true
Layoutlib.Api=15
Layoutlib.Revision=1
Platform.MinToolsRev=22

build-tools/35.0.0
Pkg.UserSrc=false
Pkg.Revision=35.0.0
#Pkg.Revision=35.0.0 rc4
```

## Initial browser failures (before corrected names/navigation)

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> test:e2e
> playwright test

[WebServer] (node:140) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:153) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:153) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:153) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 7 tests using 1 worker

(node:206) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:206) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✘  1 tests/e2e/app.spec.ts:2:1 › organization context, task persistence, completion and offline snapshot (30.0s)
(node:287) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:287) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  2 tests/e2e/app.spec.ts:95:1 › 360px navigation and both themes fit the viewport (427ms)
  ✘  3 tests/e2e/app.spec.ts:123:1 › save reminder rules twice with quiet hours (30.0s)
(node:382) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:382) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  4 tests/e2e/app.spec.ts:157:1 › edit task, keep date-only precision and navigate month calendar (1.2s)
  ✓  5 tests/e2e/app.spec.ts:208:1 › correct a proposal before approval (933ms)
  ✘  6 tests/e2e/foundation.spec.ts:2:1 › foundation: fonts stay local, theme follows system and override, reduced motion and 200% text (30.0s)
(node:496) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:496) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  7 tests/e2e/foundation.spec.ts:51:1 › foundation: four tabs and secondary workflows remain reachable at 360px (500ms)


  1) tests/e2e/app.spec.ts:2:1 › organization context, task persistence, completion and offline snapshot

    Test timeout of 30000ms exceeded.

    Error: locator.click: Test timeout of 30000ms exceeded.
    Call log:
      - waiting for getByRole('button', { name: 'Settings', exact: true })


       9 |     page.getByRole('heading', { name: 'A little room to remember.' }),
      10 |   ).toBeVisible();
    > 11 |   await page.getByRole('button', { name: 'Settings', exact: true }).click();
         |                                                                     ^
      12 |   await page.getByLabel('Context', { exact: true }).fill('Himpunan');
      13 |   await page
      14 |     .getByRole('combobox', { name: 'Type', exact: true })
        at /workspace/scratch/bbff8dae2870/academic-os-polish/tests/e2e/app.spec.ts:11:69

    Error Context: test-results/app-organization-context-t-e408f-letion-and-offline-snapshot/error-context.md

  2) tests/e2e/app.spec.ts:123:1 › save reminder rules twice with quiet hours ──────────────────────

    Test timeout of 30000ms exceeded.

    Error: locator.click: Test timeout of 30000ms exceeded.
    Call log:
      - waiting for getByRole('button', { name: 'Settings', exact: true })


      91 |   await page.goto('/');
      92 |   await page.getByRole('button', { name: 'English', exact: true }).click();
    > 93 |   await page.getByLabel('Page', { exact: true }).selectOption('settings');
         |                                                                     ^
      94 |   await page.getByLabel('Defer new inbox reminders during quiet hours').check();
      95 |   await page
      96 |     .getByRole('button', { name: 'Save reminder rules', exact: true })
        at /workspace/scratch/bbff8dae2870/academic-os-polish/tests/e2e/app.spec.ts:93:69

    Error Context: test-results/app-save-reminder-rules-twice-with-quiet-hours/error-context.md

  3) tests/e2e/foundation.spec.ts:2:1 › foundation: fonts stay local, theme follows system and override, reduced motion and 200% text

    Test timeout of 30000ms exceeded.

    Error: locator.selectOption: Test timeout of 30000ms exceeded.
    Call log:
      - waiting for getByLabel('Theme', { exact: true })


      13 |   await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
      14 |   await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    > 15 |   await page.getByLabel('Theme', { exact: true }).selectOption('dark');
         |                                                   ^
      16 |   await page.reload();
      17 |   await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      18 |   await page.evaluate(() => document.fonts.ready);
        at /workspace/scratch/bbff8dae2870/academic-os-polish/tests/e2e/foundation.spec.ts:15:51

    Error Context: test-results/foundation-foundation-font-5756b-reduced-motion-and-200-text/error-context.md

  3 failed
    tests/e2e/app.spec.ts:2:1 › organization context, task persistence, completion and offline snapshot
    tests/e2e/app.spec.ts:123:1 › save reminder rules twice with quiet hours ───────────────────────
    tests/e2e/foundation.spec.ts:2:1 › foundation: fonts stay local, theme follows system and override, reduced motion and 200% text
  4 passed (1.7m)
```

## Initial direct Gradle download failure

```text
Downloading https://services.gradle.org/distributions/gradle-8.11.1-bin.zip

Exception in thread "main" java.net.UnknownHostException: services.gradle.org
	at java.base/sun.nio.ch.NioSocketImpl.connect(NioSocketImpl.java:572)
	at java.base/java.net.SocksSocketImpl.connect(SocksSocketImpl.java:327)
	at java.base/java.net.Socket.connect(Socket.java:633)
	at java.base/sun.security.ssl.SSLSocketImpl.connect(SSLSocketImpl.java:304)
	at java.base/sun.net.NetworkClient.doConnect(NetworkClient.java:178)
	at java.base/sun.net.www.http.HttpClient.openServer(HttpClient.java:533)
	at java.base/sun.net.www.http.HttpClient.openServer(HttpClient.java:638)
	at java.base/sun.net.www.protocol.https.HttpsClient.<init>(HttpsClient.java:267)
	at java.base/sun.net.www.protocol.https.HttpsClient.New(HttpsClient.java:381)
	at java.base/sun.net.www.protocol.https.AbstractDelegateHttpsURLConnection.getNewHttpClient(AbstractDelegateHttpsURLConnection.java:196)
	at java.base/sun.net.www.protocol.http.HttpURLConnection.plainConnect0(HttpURLConnection.java:1262)
	at java.base/sun.net.www.protocol.http.HttpURLConnection.plainConnect(HttpURLConnection.java:1148)
	at java.base/sun.net.www.protocol.http.HttpURLConnection.connect(HttpURLConnection.java:1077)
	at java.base/sun.net.www.protocol.https.AbstractDelegateHttpsURLConnection.connect(AbstractDelegateHttpsURLConnection.java:181)
	at java.base/sun.net.www.protocol.http.HttpURLConnection.getInputStream0(HttpURLConnection.java:1717)
	at java.base/sun.net.www.protocol.http.HttpURLConnection.getInputStream(HttpURLConnection.java:1641)
	at java.base/sun.net.www.protocol.https.HttpsURLConnectionImpl.getInputStream(HttpsURLConnectionImpl.java:224)
	at org.gradle.wrapper.Install.forceFetch(SourceFile:2)
	at org.gradle.wrapper.Install$1.call(SourceFile:8)
	at org.gradle.wrapper.GradleWrapperMain.main(SourceFile:67)
```

## frozen-system-theme-baseline.log

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:1069) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:1082) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:1082) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:1121) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:1121) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  1 tests/e2e/foundation.spec.ts:2:1 › foundation: fonts stay local, theme follows system and override, reduced motion and 200% text (856ms)

  1 passed (6.5s)
```

## frozen-system-theme-broken.log

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:1232) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:1245) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:1245) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:1281) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:1281) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✘  1 tests/e2e/foundation.spec.ts:2:1 › foundation: fonts stay local, theme follows system and override, reduced motion and 200% text (5.3s)


  1) tests/e2e/foundation.spec.ts:2:1 › foundation: fonts stay local, theme follows system and override, reduced motion and 200% text

    Error: expect(locator).toHaveAttribute(expected) failed

    Locator:  locator('html')
    Expected: "light"
    Received: "dark"
    Timeout:  5000ms

    Call log:
      - Expect "toHaveAttribute" with timeout 5000ms
      - waiting for locator('html')
        9 × locator resolved to <html lang="id" data-theme="dark">…</html>
          - unexpected value "dark"


      12 |   await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      13 |   await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    > 14 |   await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
         |                                      ^
      15 |   await page.getByLabel('Theme', { exact: true }).selectOption('dark');
      16 |   await page.reload();
      17 |   await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
        at /workspace/scratch/bbff8dae2870/academic-os-polish/tests/e2e/foundation.spec.ts:14:38

    Error Context: test-results/foundation-foundation-font-5756b-reduced-motion-and-200-text/error-context.md

  1 failed
    tests/e2e/foundation.spec.ts:2:1 › foundation: fonts stay local, theme follows system and override, reduced motion and 200% text
```

## frozen-system-theme-restored.log

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:1393) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:1406) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:1406) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:1443) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:1443) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  1 tests/e2e/foundation.spec.ts:2:1 › foundation: fonts stay local, theme follows system and override, reduced motion and 200% text (732ms)

  1 passed (3.3s)
```

## hidden-secondary-routes-baseline.log

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:2047) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:2060) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:2060) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:2101) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:2101) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  1 tests/e2e/foundation.spec.ts:68:1 › foundation: four tabs and secondary workflows remain reachable at 360px (649ms)

  1 passed (3.3s)
```

## hidden-secondary-routes-broken.log

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:2209) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:2222) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:2222) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:2262) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:2262) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✘  1 tests/e2e/foundation.spec.ts:68:1 › foundation: four tabs and secondary workflows remain reachable at 360px (5.4s)


  1) tests/e2e/foundation.spec.ts:68:1 › foundation: four tabs and secondary workflows remain reachable at 360px

    Error: expect(locator).toHaveCount(expected) failed

    Locator:  locator('.mobile-pages option[value="sources"]')
    Expected: 1
    Received: 0
    Timeout:  5000ms

    Call log:
      - Expect "toHaveCount" with timeout 5000ms
      - waiting for locator('.mobile-pages option[value="sources"]')
        9 × locator resolved to 0 elements
          - unexpected value "0"


      83 |     await expect(
      84 |       page.locator(`.mobile-pages option[value="${destination}"]`),
    > 85 |     ).toHaveCount(1);
         |       ^
      86 |     await page.getByLabel('Page', { exact: true }).selectOption(destination);
      87 |     await expect(
      88 |       page.getByRole('heading', {
        at /workspace/scratch/bbff8dae2870/academic-os-polish/tests/e2e/foundation.spec.ts:85:7

    Error Context: test-results/foundation-foundation-four-b0b34-s-remain-reachable-at-360px/error-context.md

  1 failed
    tests/e2e/foundation.spec.ts:68:1 › foundation: four tabs and secondary workflows remain reachable at 360px
```

## hidden-secondary-routes-restored.log

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:2369) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:2382) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:2382) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:2419) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:2419) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  1 tests/e2e/foundation.spec.ts:68:1 › foundation: four tabs and secondary workflows remain reachable at 360px (683ms)

  1 passed (3.5s)
```

## imprecise-urgency-baseline.log

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-polish

 ✓ tests/foundation.test.ts (2 tests) 19ms

 Test Files  1 passed (1)
      Tests  2 passed (2)
   Start at  19:15:09
   Duration  336ms (transform 55ms, setup 0ms, collect 90ms, tests 19ms, environment 0ms, prepare 57ms)
```

## imprecise-urgency-broken.log

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-polish

 ❯ tests/foundation.test.ts (2 tests | 1 failed) 14ms
   ✓ bitmap merges runs, stays decorative and uses supplied cells 7ms
   × urgency respects boundaries and never invents an instant for imprecise dates 6ms
     → expected '<div class="seg urgent" aria-hidden="…' to be '' // Object.is equality

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/foundation.test.ts > urgency respects boundaries and never invents an instant for imprecise dates
AssertionError: expected '<div class="seg urgent" aria-hidden="…' to be '' // Object.is equality

- Expected
+ Received

+ <div class="seg urgent" aria-hidden="true"><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i></div>

 ❯ tests/foundation.test.ts:26:7
     24|         React.createElement(UrgencyBar, { due: 0, now: 0, precision }),
     25|       ),
     26|     ).toBe('');
       |       ^
     27|   expect(
     28|     renderToStaticMarkup(

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 1 passed (2)
   Start at  19:15:10
   Duration  301ms (transform 59ms, setup 0ms, collect 92ms, tests 14ms, environment 0ms, prepare 59ms)
```

## imprecise-urgency-restored.log

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-polish

 ✓ tests/foundation.test.ts (2 tests) 11ms

 Test Files  1 passed (1)
      Tests  2 passed (2)
   Start at  19:15:11
   Duration  258ms (transform 56ms, setup 0ms, collect 80ms, tests 11ms, environment 0ms, prepare 54ms)
```

## missing-local-fonts-baseline.log

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:1556) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:1569) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:1569) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:1609) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:1609) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  1 tests/e2e/foundation.spec.ts:2:1 › foundation: fonts stay local, theme follows system and override, reduced motion and 200% text (645ms)

  1 passed (3.3s)
```

## missing-local-fonts-broken.log

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:1720) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:1733) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:1733) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:1774) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:1774) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✘  1 tests/e2e/foundation.spec.ts:2:1 › foundation: fonts stay local, theme follows system and override, reduced motion and 200% text (418ms)


  1) tests/e2e/foundation.spec.ts:2:1 › foundation: fonts stay local, theme follows system and override, reduced motion and 200% text

    Error: expect(received).toBe(expected) // Object.is equality

    Expected: true
    Received: false

      23 |         document.fonts.check('400 16px Inter'),
      24 |     ),
    > 25 |   ).toBe(true);
         |     ^
      26 |   // Explicit font loads, not fallback existence, are checked too.
      27 |   expect(
      28 |     await page.evaluate(
        at /workspace/scratch/bbff8dae2870/academic-os-polish/tests/e2e/foundation.spec.ts:25:5

    Error Context: test-results/foundation-foundation-font-5756b-reduced-motion-and-200-text/error-context.md

  1 failed
    tests/e2e/foundation.spec.ts:2:1 › foundation: fonts stay local, theme follows system and override, reduced motion and 200% text
```

## missing-local-fonts-restored.log

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:1884) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:1897) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:1897) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:1936) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:1936) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  1 tests/e2e/foundation.spec.ts:2:1 › foundation: fonts stay local, theme follows system and override, reduced motion and 200% text (693ms)

  1 passed (3.3s)
```

## Planning validator (final documentation tree)

```text
PASS: 3 schemas; 5 valid fixtures/date variants; 21 rejection cases; 80 local links; 30 features; 34 test IDs.
This validates planning artifacts only. No application/device/account tests ran.
```

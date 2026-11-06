# Actual retained session output — 2026-11-06

Base: `d0cbb60`. Terminal color escapes and trailing display padding are removed; command output content is otherwise preserved. All data is synthetic. Device/emulator, Android Keystore/SQLite runtime, real peer/network, account/provider/push and release behavior are **unverified**. No push, deployment or paid provisioning occurred.

The workspace reset before an earlier result could be packaged. Source was reconstructed and these outputs were freshly rerun and retained. Earlier discarded-run output is not substituted. Browser E2E/PWA tests were not rerun for this Android slice.

## Dependency install

Command: `npm ci`

Exit: `0`

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

added 170 packages in 18s
npm notice
npm notice New major version of npm available! 11.9.0 -> 12.2.2
npm notice Changelog: https://github.com/npm/cli/releases/tag/v12.2.2
npm notice To update run: npm install -g npm@12.2.2
npm notice
```

## Web/Worker acceptance

Command: `npm run check`

Exit: `0`

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


 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-api28

 ✓ tests/integration/ledger.test.ts (16 tests) 7639ms
   ✓ persistent ledger > processes reminders without collector or AI and cancels old deadline revisions  571ms
   ✓ signed ingestion remains proposal-only and explicit approval is idempotent  671ms
   ✓ snooze retries are idempotent and completed tasks cannot snooze  304ms
   ✓ deadline-change approval requires explicit current target and preserves history  422ms
   ✓ source purge scrubs sole-source tasks, preserves manual edits, and accepts a scoped local wipe acknowledgment  816ms
   ✓ task pagination has no duplicates and applies context/status filters  642ms
   ✓ configurable reminder rules rebuild future intents without changing deadline precision  1694ms
   ✓ quiet hours defer and coalesce reminders without changing deadlines, including daylight-saving boundaries  971ms

 Test Files  1 passed (1)
      Tests  16 passed (16)
   Start at  13:23:41
   Duration  8.74s (transform 194ms, setup 0ms, collect 767ms, tests 7.64s, environment 0ms, prepare 82ms)

npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> build
> npm run build -w @academic-os/web && npm run build -w @academic-os/worker

npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> build
> vite build

vite v7.3.7 building client environment for production...
transforming...
✓ 31 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.44 kB │ gzip:  0.30 kB
dist/assets/index-Bq55Rb2a.css    6.90 kB │ gzip:  2.10 kB
dist/assets/index-FKBlGBWY.js   251.83 kB │ gzip: 79.28 kB
✓ built in 1.31s
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> build
> wrangler deploy --dry-run --outdir dist

▲ [WARNING] Proxy environment variables detected. We'll use your proxy for fetch requests.



 ⛅️ wrangler 4.158.0
────────────────────
✨ Read 8 files from the assets directory /workspace/scratch/bbff8dae2870/academic-os-api28/apps/web/dist
Total Upload: 419.88 KiB / gzip: 82.55 KiB
Your Worker has access to the following bindings:
Binding                               Resource
env.DB (academic-os)                  D1 Database
env.ASSETS                            Assets
env.OWNER_SUB ("UNCONFIGURED")        Environment Variable
env.ACCESS_TEAM ("UNCONFIGURED")      Environment Variable
env.ACCESS_AUD ("UNCONFIGURED")       Environment Variable

--dry-run: exiting now.

Cloudflare collects anonymous telemetry about your usage of Wrangler. Learn more at https://github.com/cloudflare/workers-sdk/tree/main/packages/wrangler/telemetry.md
```

## Planning validation

Command: `.venv/bin/python scripts/validate_planning.py`

Exit: `0`

```text
PASS: 3 schemas; 5 valid fixtures/date variants; 21 rejection cases; 68 local links; 30 features; 34 test IDs.
This validates planning artifacts only. No application/device/account tests ran.
```

## Python acceptance

Command: `.venv/bin/python -m unittest discover -s collectors/local/tests -v`

Exit: `0`

```text
test_encrypted_disposable_restore_parity_and_no_dispatch (test_core.BackupTests.test_encrypted_disposable_restore_parity_and_no_dispatch) ... ok
test_ics_precision_folding_and_recurrence_uncertainty (test_core.CalendarTests.test_ics_precision_folding_and_recurrence_uncertainty) ... ok
test_external_ai_needs_explicit_consent (test_core.CollectorTests.test_external_ai_needs_explicit_consent) ... ok
test_invalid_batch_rolls_back_all_events (test_core.CollectorTests.test_invalid_batch_rolls_back_all_events) ... ok
test_multiline_repeat_and_encryption (test_core.CollectorTests.test_multiline_repeat_and_encryption) ... ok
test_receipt_retry_and_purge_prevents_resurrection (test_core.CollectorTests.test_receipt_retry_and_purge_prevents_resurrection) ... ok
test_reject_unselected_before_parse (test_core.CollectorTests.test_reject_unselected_before_parse) ... ok
test_projection_never_copies_message_payload (test_core.ContractTests.test_projection_never_copies_message_payload) ... ok
test_shared_fixture_and_raw_rejection (test_core.ContractTests.test_shared_fixture_and_raw_rejection) ... ok
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
Ran 19 tests in 2.001s

OK
```

## Android acceptance

Command: `cd apps/android-companion && ./gradlew assembleDebug lint testDebugUnitTest --console=plain --no-daemon`

Exit: `0`

```text
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=44207 -Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=44207
To honour the JVM settings for this build a single-use Daemon process will be forked. For more on this, please refer to https://docs.gradle.org/8.11.1/userguide/gradle_daemon.html#sec:disabling_the_daemon in the Gradle documentation.
Daemon will be stopped at the end of the build
> Task :app:preBuild UP-TO-DATE
> Task :app:preDebugBuild UP-TO-DATE
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
> Task :app:dexBuilderDebug
> Task :app:mergeDebugGlobalSynthetics UP-TO-DATE
> Task :app:processDebugJavaRes UP-TO-DATE
> Task :app:mergeDebugJavaResource UP-TO-DATE
> Task :app:checkDebugDuplicateClasses UP-TO-DATE
> Task :app:mergeExtDexDebug UP-TO-DATE
> Task :app:mergeLibDexDebug UP-TO-DATE
> Task :app:mergeDebugJniLibFolders UP-TO-DATE
> Task :app:mergeDebugNativeLibs NO-SOURCE
> Task :app:stripDebugDebugSymbols NO-SOURCE
> Task :app:validateSigningDebug UP-TO-DATE
> Task :app:writeDebugAppMetadata UP-TO-DATE
> Task :app:writeDebugSigningConfigVersions UP-TO-DATE
> Task :app:mergeProjectDexDebug

> Task :app:verifyApi28
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=44207 -Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=44207

> Task :app:bundleDebugClassesToCompileJar UP-TO-DATE
> Task :app:preDebugAndroidTestBuild SKIPPED
> Task :app:generateDebugAndroidTestResValues UP-TO-DATE
> Task :app:generateDebugAndroidTestLintModel
> Task :app:extractProguardFiles UP-TO-DATE
> Task :app:generateDebugLintReportModel
> Task :app:preDebugUnitTestBuild UP-TO-DATE
> Task :app:generateDebugUnitTestLintModel
> Task :app:bundleDebugClassesToRuntimeJar UP-TO-DATE
> Task :app:compileDebugUnitTestKotlin UP-TO-DATE
> Task :app:javaPreCompileDebugUnitTest UP-TO-DATE
> Task :app:compileDebugUnitTestJavaWithJavac NO-SOURCE
> Task :app:processDebugUnitTestJavaRes UP-TO-DATE

> Task :app:testQueuePrivacy
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=44207 -Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=44207
PASS fingerprint is deterministic only within the keyed installation
PASS missing AES key with queued OR pairing ciphertext never generates
PASS lost dedupe key with queued rows never generates
PASS restart reuses keys and ciphertext; loss remains blocked
PASS legacy format requires explicit owner reset, even when empty
Queue privacy policy: 5 tests passed (JVM only; Android Keystore/SQLite/device unverified)

> Task :app:testDebugUnitTest
> Task :app:packageDebug
> Task :app:createDebugApkListingFileRedirect UP-TO-DATE
> Task :app:assembleDebug
> Task :app:lintAnalyzeDebug
> Task :app:lintAnalyzeDebugAndroidTest
> Task :app:lintAnalyzeDebugUnitTest
> Task :app:lintReportDebug UP-TO-DATE
> Task :app:lintDebug
> Task :app:lint
[Incubating] Problems report is available at: file:///workspace/scratch/bbff8dae2870/academic-os-api28/apps/android-companion/build/reports/problems/problems-report.html

Deprecated Gradle features were used in this build, making it incompatible with Gradle 9.0.

You can use '--warning-mode all' to show the individual deprecation warnings and determine if they come from your own scripts or plugins.

For more on this, please refer to https://docs.gradle.org/8.11.1/userguide/command_line_interface.html#sec:command_line_warnings in the Gradle documentation.

BUILD SUCCESSFUL in 53s
51 actionable tasks: 13 executed, 38 up-to-date
```

## Lint issues

Zero errors; 6 warnings. No warning was suppressed to pass acceptance.

```text
Warning ApplySharedPref: Consider using `apply()` instead; `commit` writes its data to persistent storage immediately, whereas `apply` will handle it in the background
Warning ApplySharedPref: Consider using `apply()` instead; `commit` writes its data to persistent storage immediately, whereas `apply` will handle it in the background
Warning ApplySharedPref: Consider using `apply()` instead; `commit` writes its data to persistent storage immediately, whereas `apply` will handle it in the background
Warning CustomX509TrustManager: Implementing a custom `X509TrustManager` is error-prone and likely to be insecure. It is likely to disable certificate validation altogether, and is non-trivial to implement correctly without calling Android's default implementation.
Warning MissingApplicationIcon: Should explicitly set `android:icon`, there is no default
Warning SetTextI18n: String literal in `setText` can not be translated. Use Android resources instead.
```

## Known-format credential scan

Command: `.venv/bin/python scripts/check_placeholders.py`

Exit: `0`

```text
PASS: no common private-key/provider-token formats found in project files; configuration examples remain placeholders.
```

## Mutation summary

Command: `.venv/bin/python scripts/check_android_mutations.py --output-dir /workspace/scratch/bbff8dae2870/api28-evidence/mutations`

Exit: `0`

```text
unkeyed-fingerprint-broken: exit 1
unkeyed-fingerprint-restored: exit 0
missing-key-regeneration-broken: exit 1
missing-key-regeneration-restored: exit 0
legacy-migration-bypass-broken: exit 1
legacy-migration-bypass-restored: exit 0
inherited-autocloseable-broken: exit 1
inherited-autocloseable-restored: exit 0
newer-android-method-broken: exit 1
newer-android-method-restored: exit 0
host-jdk-method-broken: exit 1
host-jdk-method-restored: exit 0
PASS: 6 mutations failed, 6 restored runs passed; source files restored.
```

## unkeyed-fingerprint — broken

Command: `./gradlew testQueuePrivacy --console=plain --no-daemon`

Exit: `1`

```text
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=43215 -Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=43215
To honour the JVM settings for this build a single-use Daemon process will be forked. For more on this, please refer to https://docs.gradle.org/8.11.1/userguide/gradle_daemon.html#sec:disabling_the_daemon in the Gradle documentation.
Daemon will be stopped at the end of the build
> Task :app:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :app:preBuild UP-TO-DATE
> Task :app:preDebugBuild UP-TO-DATE
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
> Task :app:javaPreCompileDebug UP-TO-DATE
> Task :app:compileDebugKotlin
> Task :app:compileDebugJavaWithJavac NO-SOURCE
> Task :app:bundleDebugClassesToRuntimeJar
> Task :app:bundleDebugClassesToCompileJar
> Task :app:compileDebugUnitTestKotlin

> Task :app:testQueuePrivacy FAILED
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=43215 -Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=43215
Exception in thread "main" java.lang.IllegalStateException: Check failed.
	at id.academicos.companion.QueuePrivacyTest.main$lambda$0(QueuePrivacyTest.kt:36)
	at id.academicos.companion.QueuePrivacyTest.main$test(QueuePrivacyTest.kt:28)
	at id.academicos.companion.QueuePrivacyTest.main(QueuePrivacyTest.kt:29)

FAILURE: Build failed with an exception.

* What went wrong:
Execution failed for task ':app:testQueuePrivacy'.
> Process 'command '/workspace/scratch/bbff8dae2870/toolchain/jdk17/bin/java'' finished with non-zero exit value 1

* Try:
> Run with --stacktrace option to get the stack trace.
> Run with --info or --debug option to get more log output.
> Run with --scan to get full insights.
> Get more help at https://help.gradle.org.

BUILD FAILED in 39s
19 actionable tasks: 5 executed, 14 up-to-date
```

## unkeyed-fingerprint — restored

Command: `./gradlew testQueuePrivacy --console=plain --no-daemon`

Exit: `0`

```text
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=43215 -Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=43215
To honour the JVM settings for this build a single-use Daemon process will be forked. For more on this, please refer to https://docs.gradle.org/8.11.1/userguide/gradle_daemon.html#sec:disabling_the_daemon in the Gradle documentation.
Daemon will be stopped at the end of the build
> Task :app:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :app:preBuild UP-TO-DATE
> Task :app:preDebugBuild UP-TO-DATE
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
> Task :app:javaPreCompileDebug UP-TO-DATE
> Task :app:compileDebugKotlin
> Task :app:compileDebugJavaWithJavac NO-SOURCE
> Task :app:bundleDebugClassesToRuntimeJar
> Task :app:bundleDebugClassesToCompileJar
> Task :app:compileDebugUnitTestKotlin UP-TO-DATE

> Task :app:testQueuePrivacy
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=43215 -Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=43215
PASS fingerprint is deterministic only within the keyed installation
PASS missing AES key with queued OR pairing ciphertext never generates
PASS lost dedupe key with queued rows never generates
PASS restart reuses keys and ciphertext; loss remains blocked
PASS legacy format requires explicit owner reset, even when empty
Queue privacy policy: 5 tests passed (JVM only; Android Keystore/SQLite/device unverified)

BUILD SUCCESSFUL in 25s
19 actionable tasks: 4 executed, 15 up-to-date
```

## missing-key-regeneration — broken

Command: `./gradlew testQueuePrivacy --console=plain --no-daemon`

Exit: `1`

```text
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=43215 -Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=43215
To honour the JVM settings for this build a single-use Daemon process will be forked. For more on this, please refer to https://docs.gradle.org/8.11.1/userguide/gradle_daemon.html#sec:disabling_the_daemon in the Gradle documentation.
Daemon will be stopped at the end of the build
> Task :app:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :app:preBuild UP-TO-DATE
> Task :app:preDebugBuild UP-TO-DATE
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
> Task :app:javaPreCompileDebug UP-TO-DATE
> Task :app:compileDebugKotlin
> Task :app:compileDebugJavaWithJavac NO-SOURCE
> Task :app:bundleDebugClassesToRuntimeJar
> Task :app:bundleDebugClassesToCompileJar
> Task :app:compileDebugUnitTestKotlin UP-TO-DATE

> Task :app:testQueuePrivacy FAILED
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=43215 -Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=43215
PASS fingerprint is deterministic only within the keyed installation
Exception in thread "main" java.lang.IllegalStateException: Expected KEY_MISSING_WIPE_REQUIRED; operation unexpectedly succeeded
	at id.academicos.companion.QueuePrivacyTest.reject(QueuePrivacyTest.kt:24)
	at id.academicos.companion.QueuePrivacyTest.main$lambda$2(QueuePrivacyTest.kt:42)
	at id.academicos.companion.QueuePrivacyTest.main$test(QueuePrivacyTest.kt:28)
	at id.academicos.companion.QueuePrivacyTest.main(QueuePrivacyTest.kt:40)
w: Detected multiple Kotlin daemon sessions at

FAILURE: Build failed with an exception.

* What went wrong:
Execution failed for task ':app:testQueuePrivacy'.
> Process 'command '/workspace/scratch/bbff8dae2870/toolchain/jdk17/bin/java'' finished with non-zero exit value 1

* Try:
> Run with --stacktrace option to get the stack trace.
> Run with --info or --debug option to get more log output.
> Run with --scan to get full insights.
> Get more help at https://help.gradle.org.

BUILD FAILED in 29s
19 actionable tasks: 4 executed, 15 up-to-date
```

## missing-key-regeneration — restored

Command: `./gradlew testQueuePrivacy --console=plain --no-daemon`

Exit: `0`

```text
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=43215 -Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=43215
To honour the JVM settings for this build a single-use Daemon process will be forked. For more on this, please refer to https://docs.gradle.org/8.11.1/userguide/gradle_daemon.html#sec:disabling_the_daemon in the Gradle documentation.
Daemon will be stopped at the end of the build
> Task :app:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :app:preBuild UP-TO-DATE
> Task :app:preDebugBuild UP-TO-DATE
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
> Task :app:javaPreCompileDebug UP-TO-DATE
> Task :app:compileDebugKotlin
> Task :app:compileDebugJavaWithJavac NO-SOURCE
> Task :app:bundleDebugClassesToCompileJar
> Task :app:bundleDebugClassesToRuntimeJar
> Task :app:compileDebugUnitTestKotlin UP-TO-DATE

> Task :app:testQueuePrivacy
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=43215 -Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=43215
PASS fingerprint is deterministic only within the keyed installation
PASS missing AES key with queued OR pairing ciphertext never generates
PASS lost dedupe key with queued rows never generates
PASS restart reuses keys and ciphertext; loss remains blocked
PASS legacy format requires explicit owner reset, even when empty
Queue privacy policy: 5 tests passed (JVM only; Android Keystore/SQLite/device unverified)

BUILD SUCCESSFUL in 36s
19 actionable tasks: 4 executed, 15 up-to-date
```

## legacy-migration-bypass — broken

Command: `./gradlew testQueuePrivacy --console=plain --no-daemon`

Exit: `1`

```text
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=43215 -Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=43215
To honour the JVM settings for this build a single-use Daemon process will be forked. For more on this, please refer to https://docs.gradle.org/8.11.1/userguide/gradle_daemon.html#sec:disabling_the_daemon in the Gradle documentation.
Daemon will be stopped at the end of the build
> Task :app:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :app:preBuild UP-TO-DATE
> Task :app:preDebugBuild UP-TO-DATE
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
> Task :app:javaPreCompileDebug UP-TO-DATE
> Task :app:compileDebugKotlin
> Task :app:compileDebugJavaWithJavac NO-SOURCE
> Task :app:bundleDebugClassesToRuntimeJar
> Task :app:bundleDebugClassesToCompileJar
> Task :app:compileDebugUnitTestKotlin UP-TO-DATE

> Task :app:testQueuePrivacy FAILED
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=43215 -Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=43215
PASS fingerprint is deterministic only within the keyed installation
PASS missing AES key with queued OR pairing ciphertext never generates
PASS lost dedupe key with queued rows never generates
PASS restart reuses keys and ciphertext; loss remains blocked
Exception in thread "main" java.lang.IllegalStateException: Expected LEGACY_QUEUE_WIPE_REQUIRED; operation unexpectedly succeeded
	at id.academicos.companion.QueuePrivacyTest.reject(QueuePrivacyTest.kt:24)
	at id.academicos.companion.QueuePrivacyTest.main$lambda$10(QueuePrivacyTest.kt:67)
	at id.academicos.companion.QueuePrivacyTest.main$test(QueuePrivacyTest.kt:28)
	at id.academicos.companion.QueuePrivacyTest.main(QueuePrivacyTest.kt:66)

FAILURE: Build failed with an exception.

* What went wrong:
Execution failed for task ':app:testQueuePrivacy'.
> Process 'command '/workspace/scratch/bbff8dae2870/toolchain/jdk17/bin/java'' finished with non-zero exit value 1

* Try:
> Run with --stacktrace option to get the stack trace.
> Run with --info or --debug option to get more log output.
> Run with --scan to get full insights.
> Get more help at https://help.gradle.org.

BUILD FAILED in 35s
19 actionable tasks: 4 executed, 15 up-to-date
```

## legacy-migration-bypass — restored

Command: `./gradlew testQueuePrivacy --console=plain --no-daemon`

Exit: `0`

```text
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=43215 -Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=43215
To honour the JVM settings for this build a single-use Daemon process will be forked. For more on this, please refer to https://docs.gradle.org/8.11.1/userguide/gradle_daemon.html#sec:disabling_the_daemon in the Gradle documentation.
Daemon will be stopped at the end of the build
> Task :app:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :app:preBuild UP-TO-DATE
> Task :app:preDebugBuild UP-TO-DATE
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
> Task :app:javaPreCompileDebug UP-TO-DATE
> Task :app:compileDebugKotlin
> Task :app:compileDebugJavaWithJavac NO-SOURCE
> Task :app:bundleDebugClassesToCompileJar
> Task :app:bundleDebugClassesToRuntimeJar
> Task :app:compileDebugUnitTestKotlin UP-TO-DATE

> Task :app:testQueuePrivacy
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=43215 -Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=43215
PASS fingerprint is deterministic only within the keyed installation
PASS missing AES key with queued OR pairing ciphertext never generates
PASS lost dedupe key with queued rows never generates
PASS restart reuses keys and ciphertext; loss remains blocked
PASS legacy format requires explicit owner reset, even when empty
Queue privacy policy: 5 tests passed (JVM only; Android Keystore/SQLite/device unverified)
w: Detected multiple Kotlin daemon sessions at

BUILD SUCCESSFUL in 27s
19 actionable tasks: 4 executed, 15 up-to-date
```

## inherited-autocloseable — broken

Command: `./gradlew verifyApi28 --console=plain --no-daemon`

Exit: `1`

```text
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=43215 -Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=43215
To honour the JVM settings for this build a single-use Daemon process will be forked. For more on this, please refer to https://docs.gradle.org/8.11.1/userguide/gradle_daemon.html#sec:disabling_the_daemon in the Gradle documentation.
Daemon will be stopped at the end of the build

> Task :app:verifyApi28
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=43215 -Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=43215
src/main/java/id/academicos/companion/CaptureService.kt:38:97: error: argument type mismatch: actual type is 'R (of fun <T : Closeable?, R> T.use)', but 'K (of fun <K> WHEN_CALL)' was expected.
   try {executor.execute {try {if(getSharedPreferences("capture",0).getBoolean("enabled",false))Queue(applicationContext).use {it.add(payload)}}catch(_: Exception){health("storage_error")}}} catch(_: java.util.concurrent.RejectedExecutionException){health("queue_overflow")}
                                                                                                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
src/main/java/id/academicos/companion/CaptureService.kt:38:123: error: cannot infer type for this parameter. Specify it explicitly.
   try {executor.execute {try {if(getSharedPreferences("capture",0).getBoolean("enabled",false))Queue(applicationContext).use {it.add(payload)}}catch(_: Exception){health("storage_error")}}} catch(_: java.util.concurrent.RejectedExecutionException){health("queue_overflow")}
                                                                                                                          ^^^
src/main/java/id/academicos/companion/CaptureService.kt:38:123: error: unresolved reference. None of the following candidates is applicable because of a receiver type mismatch:
fun <T : Closeable?, R> T.use(block: (T) -> R): R
    [R|Contract description]
     <
        CallsInPlace(block, EXACTLY_ONCE)
    >
   try {executor.execute {try {if(getSharedPreferences("capture",0).getBoolean("enabled",false))Queue(applicationContext).use {it.add(payload)}}catch(_: Exception){health("storage_error")}}} catch(_: java.util.concurrent.RejectedExecutionException){health("queue_overflow")}
                                                                                                                          ^^^
src/main/java/id/academicos/companion/MainActivity.kt:31:18: error: argument type mismatch: actual type is 'R (of fun <T : Closeable?, R> T.use)', but 'K (of fun <K> TRY_CALL)' was expected.
  val queued=try{Queue(this).use {it.count()}}catch(e:QueueUnavailable){repair(e.code);return}catch(_:Exception){repair("QUEUE_STORAGE_UNAVAILABLE");return}
                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
src/main/java/id/academicos/companion/MainActivity.kt:31:30: error: cannot infer type for this parameter. Specify it explicitly.
  val queued=try{Queue(this).use {it.count()}}catch(e:QueueUnavailable){repair(e.code);return}catch(_:Exception){repair("QUEUE_STORAGE_UNAVAILABLE");return}
                             ^^^
src/main/java/id/academicos/companion/MainActivity.kt:31:30: error: unresolved reference. None of the following candidates is applicable because of a receiver type mismatch:
fun <T : Closeable?, R> T.use(block: (T) -> R): R
    [R|Contract description]
     <
        CallsInPlace(block, EXACTLY_ONCE)
    >
  val queued=try{Queue(this).use {it.count()}}catch(e:QueueUnavailable){repair(e.code);return}catch(_:Exception){repair("QUEUE_STORAGE_UNAVAILABLE");return}
                             ^^^
src/main/java/id/academicos/companion/MainActivity.kt:31:88: error: argument type mismatch: actual type is 'Nothing', but 'K (of fun <K> TRY_CALL)' was expected.
  val queued=try{Queue(this).use {it.count()}}catch(e:QueueUnavailable){repair(e.code);return}catch(_:Exception){repair("QUEUE_STORAGE_UNAVAILABLE");return}
                                                                                       ^^^^^^
src/main/java/id/academicos/companion/MainActivity.kt:31:150: error: argument type mismatch: actual type is 'Nothing', but 'K (of fun <K> TRY_CALL)' was expected.
  val queued=try{Queue(this).use {it.count()}}catch(e:QueueUnavailable){repair(e.code);return}catch(_:Exception){repair("QUEUE_STORAGE_UNAVAILABLE");return}
                                                                                                                                                     ^^^^^^
src/main/java/id/academicos/companion/MainActivity.kt:44:51: error: cannot infer type for this parameter. Specify it explicitly.
  button("Save selected mapping") {if(Queue(this).use {it.count()}>0&&(title.text.toString()!=settings.getString("title","")||group.text.toString()!=settings.getString("group",""))){line("Sync or wipe the old queue before changing conversation mapping");return@button};settings.edit().putString("title",title.text.toString()).putString("group",group.text.toString()).putBoolean("enabled",enabled.isChecked && title.text.isNotBlank() && group.text.isNotBlank()).apply();render()}
                                                  ^^^
src/main/java/id/academicos/companion/MainActivity.kt:44:51: error: unresolved reference. None of the following candidates is applicable because of a receiver type mismatch:
fun <T : Closeable?, R> T.use(block: (T) -> R): R
    [R|Contract description]
     <
        CallsInPlace(block, EXACTLY_ONCE)
    >
  button("Save selected mapping") {if(Queue(this).use {it.count()}>0&&(title.text.toString()!=settings.getString("title","")||group.text.toString()!=settings.getString("group",""))){line("Sync or wipe the old queue before changing conversation mapping");return@button};settings.edit().putString("title",title.text.toString()).putString("group",group.text.toString()).putBoolean("enabled",enabled.isChecked && title.text.isNotBlank() && group.text.isNotBlank()).apply();render()}
                                                  ^^^
src/main/java/id/academicos/companion/MainActivity.kt:44:67: error: 'operator' modifier is required on 'FirNamedFunctionSymbol kotlin/compareTo' in 'compareTo'.
  button("Save selected mapping") {if(Queue(this).use {it.count()}>0&&(title.text.toString()!=settings.getString("title","")||group.text.toString()!=settings.getString("group",""))){line("Sync or wipe the old queue before changing conversation mapping");return@button};settings.edit().putString("title",title.text.toString()).putString("group",group.text.toString()).putBoolean("enabled",enabled.isChecked && title.text.isNotBlank() && group.text.isNotBlank()).apply();render()}
                                                                  ^
src/main/java/id/academicos/companion/MainActivity.kt:53:164: error: cannot infer type for this parameter. Specify it explicitly.
  button("Wipe local queue"){android.app.AlertDialog.Builder(this).setMessage("Delete all queued raw notifications?").setPositiveButton("Delete"){_,_->Queue(this).use {it.wipe()};Transport(this).clearPending();render()}.setNegativeButton("Cancel",null).show()}
                                                                                                                                                                   ^^^
src/main/java/id/academicos/companion/MainActivity.kt:53:164: error: unresolved reference. None of the following candidates is applicable because of a receiver type mismatch:
fun <T : Closeable?, R> T.use(block: (T) -> R): R
    [R|Contract description]
     <
        CallsInPlace(block, EXACTLY_ONCE)
    >
  button("Wipe local queue"){android.app.AlertDialog.Builder(this).setMessage("Delete all queued raw notifications?").setPositiveButton("Delete"){_,_->Queue(this).use {it.wipe()};Transport(this).clearPending();render()}.setNegativeButton("Cancel",null).show()}
                                                                                                                                                                   ^^^
src/main/java/id/academicos/companion/Transport.kt:42:18: error: cannot infer type for this parameter. Specify it explicitly.
  Queue(context).use {queue->require(queue.count()==0){"Sync or wipe the old queue before pairing"};val invitationHash=hex(hash(token.trim().toByteArray(Charsets.UTF_8)));val device=if(prefs.getString("pending_invite",null)==invitationHash)prefs.getString("pending_device",null) ?: UUID.randomUUID().toString() else UUID.randomUUID().toString();check(prefs.edit().putString("pending_invite",invitationHash).putString("pending_device",device).commit());val config=JSONObject().put("endpoint",endpoint.trim()).put("pin",pin.trim());val result=request(config,"/local/v1/pair","POST",JSONObject().put("token",token.trim()).put("device_id",device).toString(),false);require(result.getString("device_id")==device);config.put("device_id",device).put("secret",result.getString("secret")).put("source_id",result.getString("source_id")).put("source_generation",result.getInt("source_generation"));check(prefs.edit().putString("config",queue.seal(config.toString())).remove("pending_device").remove("pending_invite").remove("batch").commit())}
                 ^^^
src/main/java/id/academicos/companion/Transport.kt:42:18: error: unresolved reference. None of the following candidates is applicable because of a receiver type mismatch:
fun <T : Closeable?, R> T.use(block: (T) -> R): R
    [R|Contract description]
     <
        CallsInPlace(block, EXACTLY_ONCE)
    >
  Queue(context).use {queue->require(queue.count()==0){"Sync or wipe the old queue before pairing"};val invitationHash=hex(hash(token.trim().toByteArray(Charsets.UTF_8)));val device=if(prefs.getString("pending_invite",null)==invitationHash)prefs.getString("pending_device",null) ?: UUID.randomUUID().toString() else UUID.randomUUID().toString();check(prefs.edit().putString("pending_invite",invitationHash).putString("pending_device",device).commit());val config=JSONObject().put("endpoint",endpoint.trim()).put("pin",pin.trim());val result=request(config,"/local/v1/pair","POST",JSONObject().put("token",token.trim()).put("device_id",device).toString(),false);require(result.getString("device_id")==device);config.put("device_id",device).put("secret",result.getString("secret")).put("source_id",result.getString("source_id")).put("source_generation",result.getInt("source_generation"));check(prefs.edit().putString("config",queue.seal(config.toString())).remove("pending_device").remove("pending_invite").remove("batch").commit())}
                 ^^^
src/main/java/id/academicos/companion/Transport.kt:46:18: error: cannot infer type for this parameter. Specify it explicitly.
  Queue(context).use {queue->val config=JSONObject(queue.open(prefs.getString("config",null)!!));val status=request(config,"/local/v1/device-status");if(status.getBoolean("revoked")||status.getInt("source_generation")!=config.getInt("source_generation")){queue.wipe();clearPending();request(config,"/local/v1/purge-ack","POST",JSONObject().put("generation",status.getInt("source_generation")).toString());prefs.edit().clear().commit();context.getSharedPreferences("capture",0).edit().putBoolean("enabled",false).commit();return}
                 ^^^
src/main/java/id/academicos/companion/Transport.kt:46:18: error: unresolved reference. None of the following candidates is applicable because of a receiver type mismatch:
fun <T : Closeable?, R> T.use(block: (T) -> R): R
    [R|Contract description]
     <
        CallsInPlace(block, EXACTLY_ONCE)
    >
  Queue(context).use {queue->val config=JSONObject(queue.open(prefs.getString("config",null)!!));val status=request(config,"/local/v1/device-status");if(status.getBoolean("revoked")||status.getInt("source_generation")!=config.getInt("source_generation")){queue.wipe();clearPending();request(config,"/local/v1/purge-ack","POST",JSONObject().put("generation",status.getInt("source_generation")).toString());prefs.edit().clear().commit();context.getSharedPreferences("capture",0).edit().putBoolean("enabled",false).commit();return}
                 ^^^

> Task :app:verifyApi28 FAILED

FAILURE: Build failed with an exception.

* What went wrong:
Execution failed for task ':app:verifyApi28'.
> Process 'command '/workspace/scratch/bbff8dae2870/toolchain/jdk17/bin/java'' finished with non-zero exit value 1

* Try:
> Run with --stacktrace option to get the stack trace.
> Run with --info or --debug option to get more log output.
> Run with --scan to get full insights.
> Get more help at https://help.gradle.org.

BUILD FAILED in 39s
1 actionable task: 1 executed
```

## inherited-autocloseable — restored

Command: `./gradlew verifyApi28 --console=plain --no-daemon`

Exit: `0`

```text
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=43215 -Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=43215
To honour the JVM settings for this build a single-use Daemon process will be forked. For more on this, please refer to https://docs.gradle.org/8.11.1/userguide/gradle_daemon.html#sec:disabling_the_daemon in the Gradle documentation.
Daemon will be stopped at the end of the build

> Task :app:verifyApi28
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=43215 -Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=43215

BUILD SUCCESSFUL in 23s
1 actionable task: 1 executed
```

## newer-android-method — broken

Command: `./gradlew verifyApi28 --console=plain --no-daemon`

Exit: `1`

```text
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=43215 -Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=43215
To honour the JVM settings for this build a single-use Daemon process will be forked. For more on this, please refer to https://docs.gradle.org/8.11.1/userguide/gradle_daemon.html#sec:disabling_the_daemon in the Gradle documentation.
Daemon will be stopped at the end of the build

> Task :app:verifyApi28
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=43215 -Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=43215
src/main/java/id/academicos/companion/Queue.kt:14:41: error: unresolved reference 'display'.
    private fun api30Regression() = app.display
                                        ^^^^^^^

> Task :app:verifyApi28 FAILED

FAILURE: Build failed with an exception.

* What went wrong:
Execution failed for task ':app:verifyApi28'.
> Process 'command '/workspace/scratch/bbff8dae2870/toolchain/jdk17/bin/java'' finished with non-zero exit value 1

* Try:
> Run with --stacktrace option to get the stack trace.
> Run with --info or --debug option to get more log output.
> Run with --scan to get full insights.
> Get more help at https://help.gradle.org.

BUILD FAILED in 19s
1 actionable task: 1 executed
```

## newer-android-method — restored

Command: `./gradlew verifyApi28 --console=plain --no-daemon`

Exit: `0`

```text
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=43215 -Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=43215
To honour the JVM settings for this build a single-use Daemon process will be forked. For more on this, please refer to https://docs.gradle.org/8.11.1/userguide/gradle_daemon.html#sec:disabling_the_daemon in the Gradle documentation.
Daemon will be stopped at the end of the build

> Task :app:verifyApi28
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=43215 -Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=43215

BUILD SUCCESSFUL in 27s
1 actionable task: 1 executed
```

## host-jdk-method — broken

Command: `./gradlew verifyApi28 --console=plain --no-daemon`

Exit: `1`

```text
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=43215 -Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=43215
To honour the JVM settings for this build a single-use Daemon process will be forked. For more on this, please refer to https://docs.gradle.org/8.11.1/userguide/gradle_daemon.html#sec:disabling_the_daemon in the Gradle documentation.
Daemon will be stopped at the end of the build

> Task :app:verifyApi28
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=43215 -Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=43215
src/main/java/id/academicos/companion/Queue.kt:14:61: error: unresolved reference 'mismatch'.
    private fun newerJavaRegression() = java.nio.file.Files.mismatch(java.nio.file.Paths.get("a"), java.nio.file.Paths.get("b"))
                                                            ^^^^^^^^

> Task :app:verifyApi28 FAILED

FAILURE: Build failed with an exception.

* What went wrong:
Execution failed for task ':app:verifyApi28'.
> Process 'command '/workspace/scratch/bbff8dae2870/toolchain/jdk17/bin/java'' finished with non-zero exit value 1

* Try:
> Run with --stacktrace option to get the stack trace.
> Run with --info or --debug option to get more log output.
> Run with --scan to get full insights.
> Get more help at https://help.gradle.org.

BUILD FAILED in 16s
1 actionable task: 1 executed
```

## host-jdk-method — restored

Command: `./gradlew verifyApi28 --console=plain --no-daemon`

Exit: `0`

```text
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=43215 -Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=43215
To honour the JVM settings for this build a single-use Daemon process will be forked. For more on this, please refer to https://docs.gradle.org/8.11.1/userguide/gradle_daemon.html#sec:disabling_the_daemon in the Gradle documentation.
Daemon will be stopped at the end of the build

> Task :app:verifyApi28
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=43215 -Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=43215

BUILD SUCCESSFUL in 21s
1 actionable task: 1 executed
```

## Local toolchain recovery

Java 17.0.20 already contained jdk.compiler/jdk.jartool/jdk.jdeps/jdk.jlink modules but lacked executable launchers. Official Ubuntu JDK download returned HTTP 503; Adoptium API returned HTTP 403. A workspace-local copy of the existing runtime received launcher scripts invoking standard module entry points, then javac compiled and java ran a probe. This is exact tool restoration, not a claim that a full vendor JDK archive was downloaded. The relevant launcher commands were:

```text
java -m jdk.compiler/com.sun.tools.javac.Main
java -m jdk.jartool/sun.tools.jar.Main
java -m jdk.jdeps/com.sun.tools.javap.Main
java -m jdk.jlink/jdk.tools.jlink.internal.Main
java -m jdk.jlink/jdk.tools.jmod.Main
javac 17.0.20
JDK 17 compiler execution verified
```

A private Gradle-user configuration explicitly selected the restored JDK, disabled toolchain auto-detection/download, and was excluded from delivery. Official Android CLI tools 16.0 archive 12266719 passed SHA-1 47e61d3bb57b5e907a74f225a767a767a8b4d7a5. sdkmanager installed platforms 28/35 and build-tools 35.0.0; extracted nested platform roots were normalized after checking API levels in source.properties. Gradle added platform-tools 37.0.1. No adb, device/emulator or actual account/peer was used.

The final source adds no dependency. Five plain-JVM tests use an injected key store and real JCA crypto; they do not execute Android Keystore or SQLite. The standalone test main runs as a JavaExec dependency of testDebugUnitTest, excluded from JUnit discovery. Whole-source API-28 compilation checks surface compatibility, not vendor runtime behavior. No milestone is complete.

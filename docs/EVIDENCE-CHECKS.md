# Evidence slice — actual retained check output

Base 43ddeea. Synthetic/local build checks only. No hardware capture, account, private peer/network, provider or push was tested. Terminal colors/trailing padding removed; output content otherwise preserved.

## npm-ci

Command: `npm ci`

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

added 170 packages in 4s
```

## npm-check

Command: `npm run check`

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


 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-evidence

 ✓ tests/integration/ledger.test.ts (18 tests) 6055ms
   ✓ persistent ledger > processes reminders without collector or AI and cancels old deadline revisions  318ms
   ✓ signed ingestion remains proposal-only and explicit approval is idempotent  384ms
   ✓ source purge scrubs sole-source tasks, preserves manual edits, and accepts a scoped local wipe acknowledgment  641ms
   ✓ configurable reminder rules rebuild future intents without changing deadline precision  1318ms
   ✓ quiet hours defer and coalesce reminders without changing deadlines, including daylight-saving boundaries  695ms
   ✓ device actions require explicit attestations and expiry/retirement never confirm  549ms

 Test Files  1 passed (1)
      Tests  18 passed (18)
   Start at  17:21:01
   Duration  6.73s (transform 124ms, setup 0ms, collect 489ms, tests 6.06s, environment 0ms, prepare 55ms)

npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> build
> npm run build -w @academic-os/web && npm run build -w @academic-os/worker

npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> build
> vite build

vite v7.3.7 building client environment for production...
transforming...
✓ 32 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.44 kB │ gzip:  0.30 kB
dist/assets/index-Bq55Rb2a.css    6.90 kB │ gzip:  2.10 kB
dist/assets/index-8QaOpEuc.js   253.27 kB │ gzip: 79.85 kB
✓ built in 905ms
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> build
> wrangler deploy --dry-run --outdir dist

▲ [WARNING] Proxy environment variables detected. We'll use your proxy for fetch requests.



 ⛅️ wrangler 4.158.0
────────────────────
✨ Read 8 files from the assets directory /workspace/scratch/bbff8dae2870/academic-os-evidence/apps/web/dist
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

## e2e

Command: `npm run test:e2e`

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> test:e2e
> playwright test

[WebServer] (node:320) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:333) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:333) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:333) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 5 tests using 1 worker

(node:387) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:387) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  1 tests/e2e/app.spec.ts:2:1 › organization context, task persistence, completion and offline snapshot (1.7s)
  ✓  2 tests/e2e/app.spec.ts:95:1 › 360px navigation and both themes fit the viewport (439ms)
  ✓  3 tests/e2e/app.spec.ts:123:1 › save reminder rules twice with quiet hours (1.1s)
  ✓  4 tests/e2e/app.spec.ts:157:1 › edit task, keep date-only precision and navigate month calendar (1.1s)
  ✓  5 tests/e2e/app.spec.ts:208:1 › correct a proposal before approval (765ms)

  5 passed (11.1s)
```

## pwa

Command: `npm run test:pwa`

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> test:pwa
> npm run build -w @academic-os/web && playwright test --config playwright.production.config.ts

npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> build
> vite build

vite v7.3.7 building client environment for production...
transforming...
✓ 32 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.44 kB │ gzip:  0.30 kB
dist/assets/index-Bq55Rb2a.css    6.90 kB │ gzip:  2.10 kB
dist/assets/index-8QaOpEuc.js   253.27 kB │ gzip: 79.85 kB
✓ built in 1.04s
[WebServer] (node:590) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
[WebServer] (node:603) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] (node:603) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 1 test using 1 worker

(node:633) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:633) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  1 tests/production/offline.spec.ts:2:1 › built PWA reloads offline and logout clears its private snapshot (898ms)

  1 passed (6.6s)
```

## python

Command: `.venv/bin/python -m unittest discover -s collectors/local/tests -v`

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
Ran 33 tests in 1.595s

OK
```

## planning

Command: `.venv/bin/python scripts/validate_planning.py`

```text
PASS: 3 schemas; 5 valid fixtures/date variants; 21 rejection cases; 71 local links; 30 features; 34 test IDs.
This validates planning artifacts only. No application/device/account tests ran.
```

## placeholders

Command: `.venv/bin/python scripts/check_placeholders.py`

```text
PASS: no common private-key/provider-token formats found in project files; configuration examples remain placeholders.
```

## android

Command: `cd apps/android-companion && ./gradlew assembleDebug lint testDebugUnitTest --no-daemon`

```text
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=33497
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
> Task :app:mergeDebugAssets
> Task :app:desugarDebugFileDependencies UP-TO-DATE
> Task :app:compressDebugAssets
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

> Task :app:verifyApi28
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=33497

> Task :app:bundleDebugClassesToCompileJar UP-TO-DATE
> Task :app:preDebugAndroidTestBuild SKIPPED
> Task :app:generateDebugAndroidTestResValues UP-TO-DATE
> Task :app:generateDebugAndroidTestLintModel UP-TO-DATE
> Task :app:extractProguardFiles UP-TO-DATE
> Task :app:generateDebugLintReportModel
> Task :app:preDebugUnitTestBuild
> Task :app:generateDebugUnitTestLintModel UP-TO-DATE
> Task :app:bundleDebugClassesToRuntimeJar UP-TO-DATE
> Task :app:compileDebugUnitTestKotlin UP-TO-DATE
> Task :app:javaPreCompileDebugUnitTest UP-TO-DATE
> Task :app:compileDebugUnitTestJavaWithJavac NO-SOURCE
> Task :app:processDebugUnitTestJavaRes UP-TO-DATE

> Task :app:testQueuePrivacy
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=33497
PASS fingerprint is deterministic only within the keyed installation
PASS missing AES key with queued OR pairing ciphertext never generates
PASS lost dedupe key with queued rows never generates
PASS restart reuses keys and ciphertext; loss remains blocked
PASS legacy format requires explicit owner reset, even when empty
PASS purge acknowledgment follows durable application and stops on failures
Queue privacy policy: 6 tests passed (JVM only; Android Keystore/SQLite/device unverified)

> Task :app:testDebugUnitTest UP-TO-DATE
> Task :app:packageDebug
> Task :app:createDebugApkListingFileRedirect UP-TO-DATE
> Task :app:assembleDebug
> Task :app:lintAnalyzeDebug
> Task :app:lintAnalyzeDebugAndroidTest UP-TO-DATE
> Task :app:lintAnalyzeDebugUnitTest UP-TO-DATE
> Task :app:lintReportDebug UP-TO-DATE
> Task :app:lintDebug
> Task :app:lint

BUILD SUCCESSFUL in 25s
52 actionable tasks: 9 executed, 43 up-to-date
```

## mutations

Command: `.venv/bin/python scripts/check_evidence_mutations.py --output-dir /workspace/scratch/bbff8dae2870/evidence-checks/mutations`

```text
issued-install baseline exit 0
issued-install broken exit 1
issued-install restored exit 0
historical-activity baseline exit 0
historical-activity broken exit 1
historical-activity restored exit 0
truncated-crash baseline exit 0
truncated-crash broken exit 1
truncated-crash restored exit 0
missing-crash-boundary baseline exit 0
missing-crash-boundary broken exit 1
missing-crash-boundary restored exit 0
dirty-provenance baseline exit 0
dirty-provenance broken exit 1
dirty-provenance restored exit 0
case-without-run baseline exit 0
case-without-run broken exit 1
case-without-run restored exit 0
edited-journal baseline exit 0
edited-journal broken exit 1
edited-journal restored exit 0
replaced-installed-artifact baseline exit 0
replaced-installed-artifact broken exit 1
replaced-installed-artifact restored exit 0
leftover-warm-process baseline exit 0
leftover-warm-process broken exit 1
leftover-warm-process restored exit 0
PASS: 9 faults failed and 9 restored runs passed; sources restored.
```

## provenance

Command: `Read assets/academic-os-build.json from actual built APK; assert clean Git HEAD match`

```text
PASS: clean-build actual APK declaration matches clean Git HEAD e65775873cfcf80fcd6e12b327ee6b4d91e5170d
```

## case-without-run-baseline

```text
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

----------------------------------------------------------------------
Ran 10 tests in 0.010s

OK
```

## case-without-run-broken

```text
test_activity_history_cannot_satisfy_resumed (test_device_evidence.DeviceEvidenceTests.test_activity_history_cannot_satisfy_resumed) ... ok
test_case_cannot_pass_without_real_permission_transition_and_complete_window (test_device_evidence.DeviceEvidenceTests.test_case_cannot_pass_without_real_permission_transition_and_complete_window) ... FAIL
test_crash_window_ignores_old_and_unrelated_but_retains_early_crash (test_device_evidence.DeviceEvidenceTests.test_crash_window_ignores_old_and_unrelated_but_retains_early_crash) ... ok
test_dirty_or_missing_provenance_is_unknown (test_device_evidence.DeviceEvidenceTests.test_dirty_or_missing_provenance_is_unknown) ... ok
test_incomplete_or_ambiguous_stream_is_unknown (test_device_evidence.DeviceEvidenceTests.test_incomplete_or_ambiguous_stream_is_unknown) ... ok
test_install_success_is_not_issued_or_cached (test_device_evidence.DeviceEvidenceTests.test_install_success_is_not_issued_or_cached) ... ok
test_native_crash_and_incomplete_fatal_attribution (test_device_evidence.DeviceEvidenceTests.test_native_crash_and_incomplete_fatal_attribution) ... ok
test_readback_hash_and_embedded_clean_revision (test_device_evidence.DeviceEvidenceTests.test_readback_hash_and_embedded_clean_revision) ... ok
test_run_binds_cold_process_warm_resume_and_installed_identity (test_device_evidence.DeviceEvidenceTests.test_run_binds_cold_process_warm_resume_and_installed_identity) ... ok
test_sealed_cases_reject_edits_truncation_and_finishing_without_beginning (test_device_evidence.DeviceEvidenceTests.test_sealed_cases_reject_edits_truncation_and_finishing_without_beginning) ... ok

======================================================================
FAIL: test_case_cannot_pass_without_real_permission_transition_and_complete_window (test_device_evidence.DeviceEvidenceTests.test_case_cannot_pass_without_real_permission_transition_and_complete_window)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/workspace/scratch/bbff8dae2870/academic-os-evidence/collectors/local/tests/test_device_evidence.py", line 66, in test_case_cannot_pass_without_real_permission_transition_and_complete_window
    self.assertEqual(m.verdict('grant',before,after,0),'UNVERIFIED')
AssertionError: 'PASS' != 'UNVERIFIED'
- PASS
+ UNVERIFIED


----------------------------------------------------------------------
Ran 10 tests in 0.012s

FAILED (failures=1)
```

## case-without-run-restored

```text
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

----------------------------------------------------------------------
Ran 10 tests in 0.011s

OK
```

## dirty-provenance-baseline

```text
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

----------------------------------------------------------------------
Ran 10 tests in 0.011s

OK
```

## dirty-provenance-broken

```text
test_activity_history_cannot_satisfy_resumed (test_device_evidence.DeviceEvidenceTests.test_activity_history_cannot_satisfy_resumed) ... ok
test_case_cannot_pass_without_real_permission_transition_and_complete_window (test_device_evidence.DeviceEvidenceTests.test_case_cannot_pass_without_real_permission_transition_and_complete_window) ... ok
test_crash_window_ignores_old_and_unrelated_but_retains_early_crash (test_device_evidence.DeviceEvidenceTests.test_crash_window_ignores_old_and_unrelated_but_retains_early_crash) ... ok
test_dirty_or_missing_provenance_is_unknown (test_device_evidence.DeviceEvidenceTests.test_dirty_or_missing_provenance_is_unknown) ... FAIL
test_incomplete_or_ambiguous_stream_is_unknown (test_device_evidence.DeviceEvidenceTests.test_incomplete_or_ambiguous_stream_is_unknown) ... ok
test_install_success_is_not_issued_or_cached (test_device_evidence.DeviceEvidenceTests.test_install_success_is_not_issued_or_cached) ... ok
test_native_crash_and_incomplete_fatal_attribution (test_device_evidence.DeviceEvidenceTests.test_native_crash_and_incomplete_fatal_attribution) ... ok
test_readback_hash_and_embedded_clean_revision (test_device_evidence.DeviceEvidenceTests.test_readback_hash_and_embedded_clean_revision) ... ok
test_run_binds_cold_process_warm_resume_and_installed_identity (test_device_evidence.DeviceEvidenceTests.test_run_binds_cold_process_warm_resume_and_installed_identity) ... ok
test_sealed_cases_reject_edits_truncation_and_finishing_without_beginning (test_device_evidence.DeviceEvidenceTests.test_sealed_cases_reject_edits_truncation_and_finishing_without_beginning) ... ok

======================================================================
FAIL: test_dirty_or_missing_provenance_is_unknown (test_device_evidence.DeviceEvidenceTests.test_dirty_or_missing_provenance_is_unknown)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/workspace/scratch/bbff8dae2870/academic-os-evidence/collectors/local/tests/test_device_evidence.py", line 41, in test_dirty_or_missing_provenance_is_unknown
    with patch.object(d,'adb',return_value='package:/data/app/a/base.apk'),patch.object(d,'command',side_effect=cmd):self.assertIsNone(d.installed_artifact()[1])
                                                                                                                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' is not None

----------------------------------------------------------------------
Ran 10 tests in 0.010s

FAILED (failures=1)
```

## dirty-provenance-restored

```text
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

----------------------------------------------------------------------
Ran 10 tests in 0.010s

OK
```

## edited-journal-baseline

```text
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

----------------------------------------------------------------------
Ran 10 tests in 0.011s

OK
```

## edited-journal-broken

```text
test_activity_history_cannot_satisfy_resumed (test_device_evidence.DeviceEvidenceTests.test_activity_history_cannot_satisfy_resumed) ... ok
test_case_cannot_pass_without_real_permission_transition_and_complete_window (test_device_evidence.DeviceEvidenceTests.test_case_cannot_pass_without_real_permission_transition_and_complete_window) ... ok
test_crash_window_ignores_old_and_unrelated_but_retains_early_crash (test_device_evidence.DeviceEvidenceTests.test_crash_window_ignores_old_and_unrelated_but_retains_early_crash) ... ok
test_dirty_or_missing_provenance_is_unknown (test_device_evidence.DeviceEvidenceTests.test_dirty_or_missing_provenance_is_unknown) ... ok
test_incomplete_or_ambiguous_stream_is_unknown (test_device_evidence.DeviceEvidenceTests.test_incomplete_or_ambiguous_stream_is_unknown) ... ok
test_install_success_is_not_issued_or_cached (test_device_evidence.DeviceEvidenceTests.test_install_success_is_not_issued_or_cached) ... ok
test_native_crash_and_incomplete_fatal_attribution (test_device_evidence.DeviceEvidenceTests.test_native_crash_and_incomplete_fatal_attribution) ... ok
test_readback_hash_and_embedded_clean_revision (test_device_evidence.DeviceEvidenceTests.test_readback_hash_and_embedded_clean_revision) ... ok
test_run_binds_cold_process_warm_resume_and_installed_identity (test_device_evidence.DeviceEvidenceTests.test_run_binds_cold_process_warm_resume_and_installed_identity) ... ok
test_sealed_cases_reject_edits_truncation_and_finishing_without_beginning (test_device_evidence.DeviceEvidenceTests.test_sealed_cases_reject_edits_truncation_and_finishing_without_beginning) ... FAIL

======================================================================
FAIL: test_sealed_cases_reject_edits_truncation_and_finishing_without_beginning (test_device_evidence.DeviceEvidenceTests.test_sealed_cases_reject_edits_truncation_and_finishing_without_beginning)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/workspace/scratch/bbff8dae2870/academic-os-evidence/collectors/local/tests/test_device_evidence.py", line 74, in test_sealed_cases_reject_edits_truncation_and_finishing_without_beginning
    with self.assertRaises(ValueError):m.verify(path)
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: ValueError not raised

----------------------------------------------------------------------
Ran 10 tests in 0.009s

FAILED (failures=1)
```

## edited-journal-restored

```text
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

----------------------------------------------------------------------
Ran 10 tests in 0.010s

OK
```

## historical-activity-baseline

```text
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

----------------------------------------------------------------------
Ran 10 tests in 0.011s

OK
```

## historical-activity-broken

```text
test_activity_history_cannot_satisfy_resumed (test_device_evidence.DeviceEvidenceTests.test_activity_history_cannot_satisfy_resumed) ... FAIL
test_case_cannot_pass_without_real_permission_transition_and_complete_window (test_device_evidence.DeviceEvidenceTests.test_case_cannot_pass_without_real_permission_transition_and_complete_window) ... ok
test_crash_window_ignores_old_and_unrelated_but_retains_early_crash (test_device_evidence.DeviceEvidenceTests.test_crash_window_ignores_old_and_unrelated_but_retains_early_crash) ... ok
test_dirty_or_missing_provenance_is_unknown (test_device_evidence.DeviceEvidenceTests.test_dirty_or_missing_provenance_is_unknown) ... ok
test_incomplete_or_ambiguous_stream_is_unknown (test_device_evidence.DeviceEvidenceTests.test_incomplete_or_ambiguous_stream_is_unknown) ... ok
test_install_success_is_not_issued_or_cached (test_device_evidence.DeviceEvidenceTests.test_install_success_is_not_issued_or_cached) ... ok
test_native_crash_and_incomplete_fatal_attribution (test_device_evidence.DeviceEvidenceTests.test_native_crash_and_incomplete_fatal_attribution) ... ok
test_readback_hash_and_embedded_clean_revision (test_device_evidence.DeviceEvidenceTests.test_readback_hash_and_embedded_clean_revision) ... ok
test_run_binds_cold_process_warm_resume_and_installed_identity (test_device_evidence.DeviceEvidenceTests.test_run_binds_cold_process_warm_resume_and_installed_identity) ... ok
test_sealed_cases_reject_edits_truncation_and_finishing_without_beginning (test_device_evidence.DeviceEvidenceTests.test_sealed_cases_reject_edits_truncation_and_finishing_without_beginning) ... ok

======================================================================
FAIL: test_activity_history_cannot_satisfy_resumed (test_device_evidence.DeviceEvidenceTests.test_activity_history_cannot_satisfy_resumed)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/workspace/scratch/bbff8dae2870/academic-os-evidence/collectors/local/tests/test_device_evidence.py", line 13, in test_activity_history_cannot_satisfy_resumed
    self.assertFalse(d.resumed('Hist #0: '+d.COMP))
AssertionError: True is not false

----------------------------------------------------------------------
Ran 10 tests in 0.010s

FAILED (failures=1)
```

## historical-activity-restored

```text
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

----------------------------------------------------------------------
Ran 10 tests in 0.012s

OK
```

## issued-install-baseline

```text
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

----------------------------------------------------------------------
Ran 10 tests in 0.010s

OK
```

## issued-install-broken

```text
test_activity_history_cannot_satisfy_resumed (test_device_evidence.DeviceEvidenceTests.test_activity_history_cannot_satisfy_resumed) ... ok
test_case_cannot_pass_without_real_permission_transition_and_complete_window (test_device_evidence.DeviceEvidenceTests.test_case_cannot_pass_without_real_permission_transition_and_complete_window) ... ok
test_crash_window_ignores_old_and_unrelated_but_retains_early_crash (test_device_evidence.DeviceEvidenceTests.test_crash_window_ignores_old_and_unrelated_but_retains_early_crash) ... ok
test_dirty_or_missing_provenance_is_unknown (test_device_evidence.DeviceEvidenceTests.test_dirty_or_missing_provenance_is_unknown) ... ok
test_incomplete_or_ambiguous_stream_is_unknown (test_device_evidence.DeviceEvidenceTests.test_incomplete_or_ambiguous_stream_is_unknown) ... ok
test_install_success_is_not_issued_or_cached (test_device_evidence.DeviceEvidenceTests.test_install_success_is_not_issued_or_cached) ... FAIL
test_native_crash_and_incomplete_fatal_attribution (test_device_evidence.DeviceEvidenceTests.test_native_crash_and_incomplete_fatal_attribution) ... ok
test_readback_hash_and_embedded_clean_revision (test_device_evidence.DeviceEvidenceTests.test_readback_hash_and_embedded_clean_revision) ... ok
test_run_binds_cold_process_warm_resume_and_installed_identity (test_device_evidence.DeviceEvidenceTests.test_run_binds_cold_process_warm_resume_and_installed_identity) ... ok
test_sealed_cases_reject_edits_truncation_and_finishing_without_beginning (test_device_evidence.DeviceEvidenceTests.test_sealed_cases_reject_edits_truncation_and_finishing_without_beginning) ... ok

======================================================================
FAIL: test_install_success_is_not_issued_or_cached (test_device_evidence.DeviceEvidenceTests.test_install_success_is_not_issued_or_cached)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/workspace/scratch/bbff8dae2870/academic-os-evidence/collectors/local/tests/test_device_evidence.py", line 11, in test_install_success_is_not_issued_or_cached
    with patch.object(d,'command',return_value=(code,text)):self.assertIs(d.install('fixture.apk'),expected)
                                                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: True is not False

----------------------------------------------------------------------
Ran 10 tests in 0.010s

FAILED (failures=1)
```

## issued-install-restored

```text
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

----------------------------------------------------------------------
Ran 10 tests in 0.011s

OK
```

## leftover-warm-process-baseline

```text
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

----------------------------------------------------------------------
Ran 10 tests in 0.015s

OK
```

## leftover-warm-process-broken

```text
test_activity_history_cannot_satisfy_resumed (test_device_evidence.DeviceEvidenceTests.test_activity_history_cannot_satisfy_resumed) ... ok
test_case_cannot_pass_without_real_permission_transition_and_complete_window (test_device_evidence.DeviceEvidenceTests.test_case_cannot_pass_without_real_permission_transition_and_complete_window) ... ok
test_crash_window_ignores_old_and_unrelated_but_retains_early_crash (test_device_evidence.DeviceEvidenceTests.test_crash_window_ignores_old_and_unrelated_but_retains_early_crash) ... ok
test_dirty_or_missing_provenance_is_unknown (test_device_evidence.DeviceEvidenceTests.test_dirty_or_missing_provenance_is_unknown) ... ok
test_incomplete_or_ambiguous_stream_is_unknown (test_device_evidence.DeviceEvidenceTests.test_incomplete_or_ambiguous_stream_is_unknown) ... ok
test_install_success_is_not_issued_or_cached (test_device_evidence.DeviceEvidenceTests.test_install_success_is_not_issued_or_cached) ... ok
test_native_crash_and_incomplete_fatal_attribution (test_device_evidence.DeviceEvidenceTests.test_native_crash_and_incomplete_fatal_attribution) ... ok
test_readback_hash_and_embedded_clean_revision (test_device_evidence.DeviceEvidenceTests.test_readback_hash_and_embedded_clean_revision) ... ok
test_run_binds_cold_process_warm_resume_and_installed_identity (test_device_evidence.DeviceEvidenceTests.test_run_binds_cold_process_warm_resume_and_installed_identity) ... FAIL
test_sealed_cases_reject_edits_truncation_and_finishing_without_beginning (test_device_evidence.DeviceEvidenceTests.test_sealed_cases_reject_edits_truncation_and_finishing_without_beginning) ... ok

======================================================================
FAIL: test_run_binds_cold_process_warm_resume_and_installed_identity (test_device_evidence.DeviceEvidenceTests.test_run_binds_cold_process_warm_resume_and_installed_identity)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/workspace/scratch/bbff8dae2870/academic-os-evidence/collectors/local/tests/test_device_evidence.py", line 59, in test_run_binds_cold_process_warm_resume_and_installed_identity
    self.assertIs(record['reopen_ok'],None if changed_process else True)
AssertionError: True is not None

----------------------------------------------------------------------
Ran 10 tests in 0.013s

FAILED (failures=1)
```

## leftover-warm-process-restored

```text
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

----------------------------------------------------------------------
Ran 10 tests in 0.016s

OK
```

## missing-crash-boundary-baseline

```text
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

----------------------------------------------------------------------
Ran 10 tests in 0.010s

OK
```

## missing-crash-boundary-broken

```text
test_activity_history_cannot_satisfy_resumed (test_device_evidence.DeviceEvidenceTests.test_activity_history_cannot_satisfy_resumed) ... ok
test_case_cannot_pass_without_real_permission_transition_and_complete_window (test_device_evidence.DeviceEvidenceTests.test_case_cannot_pass_without_real_permission_transition_and_complete_window) ... ok
test_crash_window_ignores_old_and_unrelated_but_retains_early_crash (test_device_evidence.DeviceEvidenceTests.test_crash_window_ignores_old_and_unrelated_but_retains_early_crash) ... ok
test_dirty_or_missing_provenance_is_unknown (test_device_evidence.DeviceEvidenceTests.test_dirty_or_missing_provenance_is_unknown) ... ok
test_incomplete_or_ambiguous_stream_is_unknown (test_device_evidence.DeviceEvidenceTests.test_incomplete_or_ambiguous_stream_is_unknown) ... FAIL
test_install_success_is_not_issued_or_cached (test_device_evidence.DeviceEvidenceTests.test_install_success_is_not_issued_or_cached) ... ok
test_native_crash_and_incomplete_fatal_attribution (test_device_evidence.DeviceEvidenceTests.test_native_crash_and_incomplete_fatal_attribution) ... ok
test_readback_hash_and_embedded_clean_revision (test_device_evidence.DeviceEvidenceTests.test_readback_hash_and_embedded_clean_revision) ... ok
test_run_binds_cold_process_warm_resume_and_installed_identity (test_device_evidence.DeviceEvidenceTests.test_run_binds_cold_process_warm_resume_and_installed_identity) ... ok
test_sealed_cases_reject_edits_truncation_and_finishing_without_beginning (test_device_evidence.DeviceEvidenceTests.test_sealed_cases_reject_edits_truncation_and_finishing_without_beginning) ... ok

======================================================================
FAIL: test_incomplete_or_ambiguous_stream_is_unknown (test_device_evidence.DeviceEvidenceTests.test_incomplete_or_ambiguous_stream_is_unknown)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/workspace/scratch/bbff8dae2870/academic-os-evidence/collectors/local/tests/test_device_evidence.py", line 25, in test_incomplete_or_ambiguous_stream_is_unknown
    c=d.CrashWindow();self.assertIsNone(c.result());c.feed(c.token+' START');self.assertIsNone(c.result());c.feed('logcat: dropped events');c.feed(c.token+' END');self.assertIsNone(c.result())
                                                                             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: False is not None

----------------------------------------------------------------------
Ran 10 tests in 0.011s

FAILED (failures=1)
```

## missing-crash-boundary-restored

```text
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

----------------------------------------------------------------------
Ran 10 tests in 0.009s

OK
```

## replaced-installed-artifact-baseline

```text
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

----------------------------------------------------------------------
Ran 10 tests in 0.012s

OK
```

## replaced-installed-artifact-broken

```text
test_activity_history_cannot_satisfy_resumed (test_device_evidence.DeviceEvidenceTests.test_activity_history_cannot_satisfy_resumed) ... ok
test_case_cannot_pass_without_real_permission_transition_and_complete_window (test_device_evidence.DeviceEvidenceTests.test_case_cannot_pass_without_real_permission_transition_and_complete_window) ... ok
test_crash_window_ignores_old_and_unrelated_but_retains_early_crash (test_device_evidence.DeviceEvidenceTests.test_crash_window_ignores_old_and_unrelated_but_retains_early_crash) ... ok
test_dirty_or_missing_provenance_is_unknown (test_device_evidence.DeviceEvidenceTests.test_dirty_or_missing_provenance_is_unknown) ... ok
test_incomplete_or_ambiguous_stream_is_unknown (test_device_evidence.DeviceEvidenceTests.test_incomplete_or_ambiguous_stream_is_unknown) ... ok
test_install_success_is_not_issued_or_cached (test_device_evidence.DeviceEvidenceTests.test_install_success_is_not_issued_or_cached) ... ok
test_native_crash_and_incomplete_fatal_attribution (test_device_evidence.DeviceEvidenceTests.test_native_crash_and_incomplete_fatal_attribution) ... ok
test_readback_hash_and_embedded_clean_revision (test_device_evidence.DeviceEvidenceTests.test_readback_hash_and_embedded_clean_revision) ... ok
test_run_binds_cold_process_warm_resume_and_installed_identity (test_device_evidence.DeviceEvidenceTests.test_run_binds_cold_process_warm_resume_and_installed_identity) ... FAIL
test_sealed_cases_reject_edits_truncation_and_finishing_without_beginning (test_device_evidence.DeviceEvidenceTests.test_sealed_cases_reject_edits_truncation_and_finishing_without_beginning) ... ok

======================================================================
FAIL: test_run_binds_cold_process_warm_resume_and_installed_identity (test_device_evidence.DeviceEvidenceTests.test_run_binds_cold_process_warm_resume_and_installed_identity)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/workspace/scratch/bbff8dae2870/academic-os-evidence/collectors/local/tests/test_device_evidence.py", line 60, in test_run_binds_cold_process_warm_resume_and_installed_identity
    self.assertEqual(record['apk_sha256'],None if changed_apk else 'a'*64)
AssertionError: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' != None

----------------------------------------------------------------------
Ran 10 tests in 0.013s

FAILED (failures=1)
```

## replaced-installed-artifact-restored

```text
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

----------------------------------------------------------------------
Ran 10 tests in 0.013s

OK
```

## truncated-crash-baseline

```text
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

----------------------------------------------------------------------
Ran 10 tests in 0.012s

OK
```

## truncated-crash-broken

```text
test_activity_history_cannot_satisfy_resumed (test_device_evidence.DeviceEvidenceTests.test_activity_history_cannot_satisfy_resumed) ... ok
test_case_cannot_pass_without_real_permission_transition_and_complete_window (test_device_evidence.DeviceEvidenceTests.test_case_cannot_pass_without_real_permission_transition_and_complete_window) ... ok
test_crash_window_ignores_old_and_unrelated_but_retains_early_crash (test_device_evidence.DeviceEvidenceTests.test_crash_window_ignores_old_and_unrelated_but_retains_early_crash) ... FAIL
test_dirty_or_missing_provenance_is_unknown (test_device_evidence.DeviceEvidenceTests.test_dirty_or_missing_provenance_is_unknown) ... ok
test_incomplete_or_ambiguous_stream_is_unknown (test_device_evidence.DeviceEvidenceTests.test_incomplete_or_ambiguous_stream_is_unknown) ... ok
test_install_success_is_not_issued_or_cached (test_device_evidence.DeviceEvidenceTests.test_install_success_is_not_issued_or_cached) ... ok
test_native_crash_and_incomplete_fatal_attribution (test_device_evidence.DeviceEvidenceTests.test_native_crash_and_incomplete_fatal_attribution) ... FAIL
test_readback_hash_and_embedded_clean_revision (test_device_evidence.DeviceEvidenceTests.test_readback_hash_and_embedded_clean_revision) ... ok
test_run_binds_cold_process_warm_resume_and_installed_identity (test_device_evidence.DeviceEvidenceTests.test_run_binds_cold_process_warm_resume_and_installed_identity) ... ok
test_sealed_cases_reject_edits_truncation_and_finishing_without_beginning (test_device_evidence.DeviceEvidenceTests.test_sealed_cases_reject_edits_truncation_and_finishing_without_beginning) ... ok

======================================================================
FAIL: test_crash_window_ignores_old_and_unrelated_but_retains_early_crash (test_device_evidence.DeviceEvidenceTests.test_crash_window_ignores_old_and_unrelated_but_retains_early_crash)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/workspace/scratch/bbff8dae2870/academic-os-evidence/collectors/local/tests/test_device_evidence.py", line 23, in test_crash_window_ignores_old_and_unrelated_but_retains_early_crash
    c.feed(c.token+' END');self.assertIs(c.result(),True)
                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: False is not True

======================================================================
FAIL: test_native_crash_and_incomplete_fatal_attribution (test_device_evidence.DeviceEvidenceTests.test_native_crash_and_incomplete_fatal_attribution)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/workspace/scratch/bbff8dae2870/academic-os-evidence/collectors/local/tests/test_device_evidence.py", line 27, in test_native_crash_and_incomplete_fatal_attribution
    c=d.CrashWindow();c.feed(c.token+' START');c.feed('F/DEBUG( 5): pid: 1, tid: 1 >>> '+d.PKG+' <<<');c.feed(c.token+' END');self.assertIs(c.result(),True)
                                                                                                                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: None is not True

----------------------------------------------------------------------
Ran 10 tests in 0.011s

FAILED (failures=2)
```

## truncated-crash-restored

```text
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

----------------------------------------------------------------------
Ran 10 tests in 0.012s

OK
```

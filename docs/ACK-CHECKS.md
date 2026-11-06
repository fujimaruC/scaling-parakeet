# Acknowledgment slice — actual command output

Base 57947a3. Synthetic tests only. Actual device/account/peer/network/push behavior unverified. Terminal colors and trailing display padding removed; output content otherwise preserved. No device/emulator was run.

## npm-ci

Command: `npm ci`

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

added 170 packages in 15s
npm notice
npm notice New major version of npm available! 11.9.0 -> 12.2.2
npm notice Changelog: https://github.com/npm/cli/releases/tag/v12.2.2
npm notice To update run: npm install -g npm@12.2.2
npm notice
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
Ran 23 tests in 1.427s

OK
```

## planning

Command: `.venv/bin/python scripts/validate_planning.py`

```text
PASS: 3 schemas; 5 valid fixtures/date variants; 21 rejection cases; 67 local links; 30 features; 34 test IDs.
This validates planning artifacts only. No application/device/account tests ran.
```

## android

Command: `cd apps/android-companion && ./gradlew assembleDebug lint testDebugUnitTest --no-daemon`

```text
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=40775
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
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=40775

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
> Task :app:packageDebug
> Task :app:createDebugApkListingFileRedirect UP-TO-DATE
> Task :app:assembleDebug
> Task :app:processDebugUnitTestJavaRes UP-TO-DATE

> Task :app:testQueuePrivacy
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=40775
PASS fingerprint is deterministic only within the keyed installation
PASS missing AES key with queued OR pairing ciphertext never generates
PASS lost dedupe key with queued rows never generates
PASS restart reuses keys and ciphertext; loss remains blocked
PASS legacy format requires explicit owner reset, even when empty
PASS purge acknowledgment follows durable application and stops on failures
Queue privacy policy: 6 tests passed (JVM only; Android Keystore/SQLite/device unverified)

> Task :app:testDebugUnitTest
> Task :app:lintAnalyzeDebug
> Task :app:lintAnalyzeDebugAndroidTest
> Task :app:lintAnalyzeDebugUnitTest

> Task :app:lintReportDebug
Wrote HTML report to file:///workspace/scratch/bbff8dae2870/academic-os-ack/apps/android-companion/app/build/reports/lint-results-debug.html

> Task :app:lintDebug
> Task :app:lint
[Incubating] Problems report is available at: file:///workspace/scratch/bbff8dae2870/academic-os-ack/apps/android-companion/build/reports/problems/problems-report.html

Deprecated Gradle features were used in this build, making it incompatible with Gradle 9.0.

You can use '--warning-mode all' to show the individual deprecation warnings and determine if they come from your own scripts or plugins.

For more on this, please refer to https://docs.gradle.org/8.11.1/userguide/command_line_interface.html#sec:command_line_warnings in the Gradle documentation.

BUILD SUCCESSFUL in 27s
51 actionable tasks: 14 executed, 37 up-to-date
```

## mutations

Command: `.venv/bin/python scripts/check_ack_mutations.py`

```text
cloud-assumed-success broken exit 1
cloud-assumed-success restored exit 0
local-assumed-applied broken exit 1
local-assumed-applied restored exit 0
evidence-fabricated-pass broken exit 1
evidence-fabricated-pass restored exit 0
stale-generation broken exit 1
stale-generation restored exit 0
receipt-without-commit broken exit 1
receipt-without-commit restored exit 0
no-job-purge broken exit 1
no-job-purge restored exit 0
```

## native-summary

Command: `native fault-injection and acceptance runner`

```text
phone-order-broken 1
phone-order-restored 0
android 0
```

## cloud-assumed-success-broken

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> test
> vitest run


 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-ack

 ❯ tests/integration/ledger.test.ts (18 tests | 2 failed) 5872ms
   ✓ persistent ledger > production auth fails closed and forged headers do not authenticate 6ms
   ✓ persistent ledger > rejects cross-origin writes 1ms
   ✓ persistent ledger > stores an organizational duty without a course and preserves unknown dates 166ms
   ✓ persistent ledger > prevents lost edits and audits only a successful CAS 151ms
   ✓ persistent ledger > processes reminders without collector or AI and cancels old deadline revisions  334ms
   ✓ date and projection boundaries > rejects impossible dates and invented times 2ms
   ✓ date and projection boundaries > rejects raw fields and unsupported evidence 3ms
   ✓ signed ingestion remains proposal-only and explicit approval is idempotent  423ms
   ✓ a losing deadline edit cannot schedule its reminders 194ms
   ✓ title-only edits preserve reminder revision and do not re-alert 114ms
   ✓ snooze retries are idempotent and completed tasks cannot snooze 207ms
   ✓ deadline-change approval requires explicit current target and preserves history  310ms
   ✓ source purge scrubs sole-source tasks, preserves manual edits, and accepts a scoped local wipe acknowledgment  612ms
   ✓ task pagination has no duplicates and applies context/status filters 281ms
   ✓ configurable reminder rules rebuild future intents without changing deadline precision  1453ms
   ✓ quiet hours defer and coalesce reminders without changing deadlines, including daylight-saving boundaries  785ms
   × device actions require explicit attestations and expiry/retirement never confirm 218ms
     → expected 'applied' to be 'queued' // Object.is equality
   × durable Linux receipt is queued until phone explicitly reports cleanup 78ms
     → expected 'applied' to be 'queued' // Object.is equality

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/integration/ledger.test.ts > device actions require explicit attestations and expiry/retirement never confirm
AssertionError: expected 'applied' to be 'queued' // Object.is equality

Expected: "queued"
Received: "applied"

 ❯ tests/integration/ledger.test.ts:821:28
    819|   expect(rows).toHaveLength(1);
    820|   expect(rows[0].status).toBe('pending');
    821|   expect(rows[0].progress).toBe('queued');
       |                            ^
    822|   expect(actionView(rows[0], '2099-01-01').status).toBe('expired');
    823|   expect(actionView(rows[0], '2099-01-01').applied_at).toBeNull();

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

 FAIL  tests/integration/ledger.test.ts > durable Linux receipt is queued until phone explicitly reports cleanup
AssertionError: expected 'applied' to be 'queued' // Object.is equality

Expected: "queued"
Received: "applied"

 ❯ tests/integration/ledger.test.ts:871:46
    869|       receipts: [{ device_id: device, batch_id: batch, generation: 1, …
    870|     });
    871|   expect((await send('queued'))[0].progress).toBe('queued');
       |                                              ^
    872|   expect((await send('delivered'))[0].applied_at).toBeNull();
    873|   expect((await send('applied'))[0].status).toBe('confirmed');

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯


 Test Files  1 failed (1)
      Tests  2 failed | 16 passed (18)
   Start at  16:08:30
   Duration  6.58s (transform 124ms, setup 0ms, collect 518ms, tests 5.87s, environment 1ms, prepare 57ms)
```

## evidence-fabricated-pass-broken

```text
F...
======================================================================
FAIL: test_evidence_projection_never_passes_unrun_cases_or_private_extras (test_control.ControlTests.test_evidence_projection_never_passes_unrun_cases_or_private_extras)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/workspace/scratch/bbff8dae2870/academic-os-ack/collectors/local/tests/test_control.py", line 32, in test_evidence_projection_never_passes_unrun_cases_or_private_extras
    self.assertEqual(result['smoke_result'],'unverified');self.assertEqual(result['capture'],'not_run');self.assertFalse(result['launch_stays_open']);self.assertNotIn('private',json.dumps(result))
    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: 'PASS' != 'unverified'
- PASS
+ unverified


----------------------------------------------------------------------
Ran 4 tests in 0.074s

FAILED (failures=1)
```

## local-assumed-applied-broken

```text
..F.
======================================================================
FAIL: test_offline_retry_generations_and_phase_journal (test_control.ControlTests.test_offline_retry_generations_and_phase_journal)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/workspace/scratch/bbff8dae2870/academic-os-ack/collectors/local/tests/test_control.py", line 15, in test_offline_retry_generations_and_phase_journal
    self.assertEqual(store.db.execute('SELECT count(*) FROM device_purge_ack').fetchone()[0],0)
AssertionError: 1 != 0

----------------------------------------------------------------------
Ran 4 tests in 0.075s

FAILED (failures=1)
```

## no-job-purge-broken

```text
.F..
======================================================================
FAIL: test_no_job_poll_wipes_locally_even_if_relay_response_is_lost (test_control.ControlTests.test_no_job_poll_wipes_locally_even_if_relay_response_is_lost)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/workspace/scratch/bbff8dae2870/academic-os-ack/collectors/local/tests/test_control.py", line 48, in test_no_job_poll_wipes_locally_even_if_relay_response_is_lost
    self.assertEqual(store.evidence(),[]);self.assertEqual(store.db.execute('SELECT generation FROM sources').fetchone()[0],2);store.db.close()
    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: Lists differ: [{'id': 'fdb6aa31-4a5f-4a6e-91e9-e7d9602e5[187 chars]e'}}] != []

First list contains 1 additional elements.
First extra element 0:
{'id': 'fdb6aa31-4a5f-4a6e-91e9-e7d9602e5537', 'source_id': '221038f8-bb25-4950-a81f-03e5fa4d4ac9', 'payload': {'source_message_at': '2026-11-05T12:00:00+08:00', 'sender': 'Fiction', 'text': 'synthetic sentinel', 'kind': 'message'}}

+ []
- [{'id': 'fdb6aa31-4a5f-4a6e-91e9-e7d9602e5537',
-   'payload': {'kind': 'message',
-               'sender': 'Fiction',
-               'source_message_at': '2026-11-05T12:00:00+08:00',
-               'text': 'synthetic sentinel'},
-   'source_id': '221038f8-bb25-4950-a81f-03e5fa4d4ac9'}]

----------------------------------------------------------------------
Ran 4 tests in 0.068s

FAILED (failures=1)
```

## phone-order-broken

```text
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=40775
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
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=40775
PASS fingerprint is deterministic only within the keyed installation
PASS missing AES key with queued OR pairing ciphertext never generates
PASS lost dedupe key with queued rows never generates
PASS restart reuses keys and ciphertext; loss remains blocked
PASS legacy format requires explicit owner reset, even when empty
Exception in thread "main" java.lang.IllegalStateException: Check failed.
	at id.academicos.companion.QueuePrivacyTest.main$lambda$19(QueuePrivacyTest.kt:73)
	at id.academicos.companion.QueuePrivacyTest.main$test(QueuePrivacyTest.kt:28)
	at id.academicos.companion.QueuePrivacyTest.main(QueuePrivacyTest.kt:70)

FAILURE: Build failed with an exception.

* What went wrong:
Execution failed for task ':app:testQueuePrivacy'.
> Process 'command '/workspace/scratch/bbff8dae2870/ack-tools/jdk/bin/java'' finished with non-zero exit value 1

* Try:
> Run with --stacktrace option to get the stack trace.
> Run with --info or --debug option to get more log output.
> Run with --scan to get full insights.
> Get more help at https://help.gradle.org.

BUILD FAILED in 21s
19 actionable tasks: 5 executed, 14 up-to-date
```

## receipt-without-commit-broken

```text
...F
======================================================================
FAIL: test_receipt_ack_requires_real_commit_and_survives_restart (test_control.ControlTests.test_receipt_ack_requires_real_commit_and_survives_restart)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/workspace/scratch/bbff8dae2870/academic-os-ack/collectors/local/tests/test_control.py", line 36, in test_receipt_ack_requires_real_commit_and_survives_restart
    with self.assertRaises(Invalid):p.acknowledge_receipt(device,batch,'applied')
         ^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: Invalid not raised

----------------------------------------------------------------------
Ran 4 tests in 0.063s

FAILED (failures=1)
```

## stale-generation-broken

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> test
> vitest run


 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-ack

 ❯ tests/integration/ledger.test.ts (18 tests | 1 failed) 6066ms
   ✓ persistent ledger > production auth fails closed and forged headers do not authenticate 5ms
   ✓ persistent ledger > rejects cross-origin writes 1ms
   ✓ persistent ledger > stores an organizational duty without a course and preserves unknown dates 134ms
   ✓ persistent ledger > prevents lost edits and audits only a successful CAS 137ms
   ✓ persistent ledger > processes reminders without collector or AI and cancels old deadline revisions  300ms
   ✓ date and projection boundaries > rejects impossible dates and invented times 2ms
   ✓ date and projection boundaries > rejects raw fields and unsupported evidence 4ms
   ✓ signed ingestion remains proposal-only and explicit approval is idempotent  403ms
   ✓ a losing deadline edit cannot schedule its reminders 187ms
   ✓ title-only edits preserve reminder revision and do not re-alert 107ms
   ✓ snooze retries are idempotent and completed tasks cannot snooze 193ms
   ✓ deadline-change approval requires explicit current target and preserves history  301ms
   ✓ source purge scrubs sole-source tasks, preserves manual edits, and accepts a scoped local wipe acknowledgment  697ms
   ✓ task pagination has no duplicates and applies context/status filters  310ms
   ✓ configurable reminder rules rebuild future intents without changing deadline precision  1384ms
   ✓ quiet hours defer and coalesce reminders without changing deadlines, including daylight-saving boundaries  691ms
   × device actions require explicit attestations and expiry/retirement never confirm 378ms
     → promise resolved "[ { …(15) } ]" instead of rejecting
   ✓ durable Linux receipt is queued until phone explicitly reports cleanup 269ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/integration/ledger.test.ts > device actions require explicit attestations and expiry/retirement never confirm
AssertionError: promise resolved "[ { …(15) } ]" instead of rejecting

- Expected:
Error {
  "message": "rejected promise",
}

+ Received:
[
  {
    "acknowledgment": "received_only",
    "applied_at": null,
    "created_at": "2026-11-06T09:08:52.170Z",
    "delivered_at": "2026-11-06T09:08:52.300Z",
    "device_id": "fb91804f-ca1f-4d23-a19a-37f16eed4fdb",
    "expires_at": "2026-11-13T09:08:52.170Z",
    "generation": 2,
    "id": "dfaf1a2e5cd683819f5e4ade0c069ff2",
    "kind": "purge",
    "late": false,
    "progress": "delivered",
    "reference": "",
    "retired_at": "2026-11-06T09:08:52.370Z",
    "source_id": "ec29edfd-54af-49e7-a660-af0436aae9d0",
    "status": "retired_unconfirmed",
  },
]

 ❯ tests/integration/ledger.test.ts:842:3
    840|       observations: [{ device_id: device, generation: 1, phase: 'appli…
    841|     }),
    842|   ).rejects.toThrow();
       |   ^
    843|   await relayActions(db, revoked, {
    844|     devices: [],

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 17 passed (18)
   Start at  16:08:46
   Duration  6.74s (transform 113ms, setup 0ms, collect 483ms, tests 6.07s, environment 0ms, prepare 56ms)
```

## cloud-assumed-success-restored

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> test
> vitest run


 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-ack

 ✓ tests/integration/ledger.test.ts (18 tests) 6617ms
   ✓ persistent ledger > processes reminders without collector or AI and cancels old deadline revisions  381ms
   ✓ signed ingestion remains proposal-only and explicit approval is idempotent  437ms
   ✓ deadline-change approval requires explicit current target and preserves history  310ms
   ✓ source purge scrubs sole-source tasks, preserves manual edits, and accepts a scoped local wipe acknowledgment  634ms
   ✓ configurable reminder rules rebuild future intents without changing deadline precision  1632ms
   ✓ quiet hours defer and coalesce reminders without changing deadlines, including daylight-saving boundaries  739ms
   ✓ device actions require explicit attestations and expiry/retirement never confirm  533ms

 Test Files  1 passed (1)
      Tests  18 passed (18)
   Start at  16:08:37
   Duration  7.27s (transform 118ms, setup 0ms, collect 463ms, tests 6.62s, environment 0ms, prepare 56ms)
```

## evidence-fabricated-pass-restored

```text
....
----------------------------------------------------------------------
Ran 4 tests in 0.074s

OK
```

## local-assumed-applied-restored

```text
....
----------------------------------------------------------------------
Ran 4 tests in 0.071s

OK
```

## no-job-purge-restored

```text
....
----------------------------------------------------------------------
Ran 4 tests in 0.068s

OK
```

## phone-order-restored

```text
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=40775
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
Picked up JAVA_TOOL_OPTIONS: -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=40775
PASS fingerprint is deterministic only within the keyed installation
PASS missing AES key with queued OR pairing ciphertext never generates
PASS lost dedupe key with queued rows never generates
PASS restart reuses keys and ciphertext; loss remains blocked
PASS legacy format requires explicit owner reset, even when empty
PASS purge acknowledgment follows durable application and stops on failures
Queue privacy policy: 6 tests passed (JVM only; Android Keystore/SQLite/device unverified)
w: Detected multiple Kotlin daemon sessions at
[Incubating] Problems report is available at: file:///workspace/scratch/bbff8dae2870/academic-os-ack/apps/android-companion/build/reports/problems/problems-report.html

Deprecated Gradle features were used in this build, making it incompatible with Gradle 9.0.

You can use '--warning-mode all' to show the individual deprecation warnings and determine if they come from your own scripts or plugins.

For more on this, please refer to https://docs.gradle.org/8.11.1/userguide/command_line_interface.html#sec:command_line_warnings in the Gradle documentation.

BUILD SUCCESSFUL in 18s
19 actionable tasks: 4 executed, 15 up-to-date
```

## receipt-without-commit-restored

```text
....
----------------------------------------------------------------------
Ran 4 tests in 0.068s

OK
```

## stale-generation-restored

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> test
> vitest run


 RUN  v3.2.7 /workspace/scratch/bbff8dae2870/academic-os-ack

 ✓ tests/integration/ledger.test.ts (18 tests) 6074ms
   ✓ persistent ledger > processes reminders without collector or AI and cancels old deadline revisions  321ms
   ✓ signed ingestion remains proposal-only and explicit approval is idempotent  387ms
   ✓ deadline-change approval requires explicit current target and preserves history  312ms
   ✓ source purge scrubs sole-source tasks, preserves manual edits, and accepts a scoped local wipe acknowledgment  638ms
   ✓ configurable reminder rules rebuild future intents without changing deadline precision  1316ms
   ✓ quiet hours defer and coalesce reminders without changing deadlines, including daylight-saving boundaries  707ms
   ✓ device actions require explicit attestations and expiry/retirement never confirm  497ms

 Test Files  1 passed (1)
      Tests  18 passed (18)
   Start at  16:08:53
   Duration  6.79s (transform 117ms, setup 0ms, collect 534ms, tests 6.07s, environment 0ms, prepare 50ms)
```

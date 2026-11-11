# Verify the complete local implementation

This round-7 source is **unverified**. The owner explicitly requested no builder-run tests. Historical owner verification of the previous tree is in VERIFICATION-LOG §30.
No acceptance, benchmark, mutation, account, provider or device result is claimed.
Do all verification with synthetic data before using personal data or deploying.

## Setup and sequence

Use the existing pinned npm and Python dependencies. Create .venv/install the
existing requirements.lock before npm tests: the encrypted restore integration
invokes the Python backup implementation to prove cross-language Fernet format.
Set AOS_TEST_PYTHON if its executable is elsewhere. The router lifecycle unittest
also needs npm dependencies: it launches a loopback-only real Worker/D1 harness.
No real credentials, existing database, browser profile or external account is
needed for any synthetic test. Run the following sequentially:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r collectors/local/requirements.lock
npm ci
npm run check
npm run test:e2e
npm run test:pwa
.venv/bin/python scripts/validate_planning.py
.venv/bin/python scripts/check_gate_claims.py
.venv/bin/python -m unittest discover -s collectors/local/tests -v
.venv/bin/python scripts/run_fault_suites.py --output-dir /outside/fresh-all-faults
node --import tsx scripts/measure_resources.ts /outside/resources.json
cd apps/android-companion
env ANDROID_HOME=/your/sdk ./gradlew assembleDebug lint testDebugUnitTest --no-daemon -Dorg.gradle.java.home=/your/jdk17
```

Use JDK17, build-tools35.0.0, platforms28 and35. Preserve the owner's signing key;
never uninstall/clear a phone to apply this source. Android source is unchanged.
Keep browser port4173 free and do not run heavy suites concurrently.

## Focused new assertions

```sh
./node_modules/.bin/vitest run tests/integration/d1-restore.test.ts tests/integration/export-selection.test.ts
.venv/bin/python -m unittest discover -s collectors/local/tests -p test_itk.py -v
.venv/bin/python -m unittest discover -s collectors/local/tests -p test_router_pipeline.py -v
.venv/bin/python -m unittest discover -s collectors/local/tests -p test_gate_scopes.py -v
```

The restore fixture includes every allowlisted table, real audit history, a source
tombstone, active future/past/done/archived/unknown/date-only tasks, and excluded
credentials/push/nonces/dispatch records in the exporting database. The Python
backup encrypts the canonical snapshot; Node restores only canonical data into
fresh in-memory Miniflare D1. Review count/digest, FK, tombstone and future-rebuild
assertions. Invalid-key/tamper/schema/column/reference cases must reject.

The router lifecycle starts a local TLS synthetic provider and forwards only
signed sync/status requests to a separate loopback real Worker/Miniflare process.
It proves a D1 proposal commit while canonical tasks remain zero, not merely an
uploader mock return. Fixture keys are generated temporarily and removed; no
provider or cloud account is contacted. Review the429 backoff, malformed output,
5xx unknown/no replay, exhaustion and policy-version refusal assertions.

## Local encrypted D1 restore CLI

Use a full canonical JSON backup, not a selected-table or CSV view. The current
Python backup format is Fernet; keys/archives stay local and separate. Node uses
the standard format with standard crypto primitives and verifies HMAC before
any decryption/database creation. No new dependency.

```sh
node --import tsx scripts/restore_d1.ts --archive /private/canonical.fernet --key /private/backup.key --report /private/new-restore-report.json
```

The key file must be private (0600 on Linux). The command creates only a fresh
in-memory Miniflare database, verifies parity, stages future rebuilds, writes
only a sanitized report and disposes the database. It cannot target an account
or existing database. No cron/dispatch or restored secrets are enabled. Corrupt
input refuses with fixed RESTORE_* codes. Do not print decrypted snapshots/keys.
Reconcile restored source tombstones against current account state before any
real sync; a disposable success does not prove production restore safe.

## ITK UI and CLI

Start the authenticated local service as in docs/18-DEVELOPMENT.md, unlock with
your local token, then open /operations -> ITK Moodle (or /itk directly).

1. Explicitly enroll a new source UUID/generation as itk_lms. An unrelated existing
   generic source is not silently relabelled. Match its cloud source only later.
2. Supply either MoodleSession (optional HASH_MoodleSession), or an explicit
   Firefox profile directory. Confirm local portal access. Cookie/profile values
   are not echoed, persisted in jobs or sent to Worker/AI.
3. Inspect observed courses/items/deadlines/source status. Unknown years and
   unsupported dates remain unknown; markup/session errors are unavailable,
   not a fabricated empty success. Status/grades remain local; activity URLs
   discard session/query secrets before projection.
4. Inspect each structured projection and explicitly confirm queuing. This is
   not canonical task approval. Use the existing source-specific job send path
   with locally configured matching credentials. No sync/provider call happens
   during preview. Duplicate unchanged previews reuse the same staged jobs.
5. Every canonical task still needs explicit owner approval in the task app.

CLI has the same review boundary. It no longer auto-uploads a fresh collection:

```sh
.venv/bin/python scripts/itk_sync.py enroll --data-dir /private/aos --source-id SOURCE_UUID --generation 1
.venv/bin/python scripts/itk_sync.py preview --data-dir /private/aos --source-id SOURCE_UUID --generation 1 --profile /private/firefox-profile
.venv/bin/python scripts/itk_sync.py queue --data-dir /private/aos --source-id SOURCE_UUID --generation 1 --job JOB_UUID --confirm-projection
.venv/bin/python scripts/itk_sync.py send --data-dir /private/aos --source-id SOURCE_UUID --generation 1 --job JOB_UUID
```

Alternatively use --cookie-prompt (getpass), never a cookie on the command line.
Profile/real-session/portal validation belongs to the owner and remains unverified.
The CLI store must be outside the repository. No automatic profile-wide UI scan.

## Export selection and limits

Settings now offers all canonical tables or one allowlisted table. API examples:
`GET /api/v1/export?format=csv&table=tasks` and
`GET /api/v1/export?format=json&table=tasks`.
A selected JSON snapshot has partial:true and cannot be restored as a full backup.
Only a full eleven-table JSON snapshot is a canonical restore input.

Worker EXPORT_MAX_ROWS defaults to100000 total selected rows, configurable from1
to1000000 by the owner. It is not a request override. Count/epoch/schema preflight
happens before response headers. Over-limit requests return clean413
EXPORT_TOO_LARGE with a selection/configuration hint. Unknown/duplicate tables
return422. Malformed limit configuration refuses503. Authorization, source scopes,
Origin and export accounting remain unchanged. Selective CSV keeps formula
neutralization, CRLF and RFC4180 quoting. Row caps do not prove a byte/CPU/billing
limit; arbitrary large rows and real runtime limits still need measurement.

## Gate claims and evidence — owner execution required

Gates3/8 remain unverified in this source because the builder was explicitly told
not to run tests. Section30 records historical passing named tests; it does not
exercise this new guard/promotion path. Do not promote by editing strings alone.
Run this after setup, with no other source edits or test processes in progress:

```sh
.venv/bin/python scripts/promote_local_gates.py --output-dir /outside/fresh-gate-promotion
```

The command first runs six guard faults against promoted claims in private
copies: wrong proof, missing sentence and stale contradiction for each scope.
Each case has baseline -> broken -> restored runs. Clean runs execute the real
D1 and router named proof paths, not mock callbacks. Then it runs both named
proofs again in a fresh proposed document tree. Only after all pass and the
source fingerprint is unchanged does it update STATUS and the two local table
rows. Output, exit codes, actual durations and a promotion report remain in the
private directory. Failed/missing/skipped/zero-test evidence leaves owner docs
unchanged. Interrupted two-file updates fail the ordinary guard on mismatch;
inspect the diff and rerun instead of asserting success. No account action occurs.

Required negative codes are GATE_EVIDENCE_SCOPE, GATE_CLAIM_DRIFT and
GATE_CLAIM_CONTRADICTION with the affected scope key. External provider and
production D1 rows stay unverified; the guard refuses to promote them from any
local proof. After success, review the two-file diff and attach the private proof
logs before committing. Run check_gate_claims.py to reproduce the evidence path.
No milestone or device/account/provider gate is completed by this command.

## Exact fault runner inventory

The following table must match files on disk and scripts/fault_registry.py exactly.
`run_fault_suites.py --list` reports declarations and proposed ceilings without
running tests. Ordinary execution validates this table before starting any suite.
All runners are retained and wired into the single sequential CI fault job.
No measured durations for revised runners are claimed by this builder.

<!-- fault-runners:start -->
| Runner | Declared cases | Hard suite ceiling (seconds) | Prerequisites | This delivery |
|---|---:|---:|---|---|
| scripts/check_contract_mutations.py | 14 | 900 | node,python,chromium | NOT RUN / unmeasured |
| scripts/check_release_mutations.py | 16 | 900 | node | NOT RUN / unmeasured |
| scripts/check_round4_mutations.py | 18 | 900 | node,python,built-assets | NOT RUN / unmeasured |
| scripts/check_round5_mutations.py | 12 | 900 | node,python,chromium | NOT RUN / unmeasured |
| scripts/check_ack_mutations.py | 6 | 600 | node,python | NOT RUN / unmeasured |
| scripts/check_s2_mutations.py | 22 | 1200 | node,python,chromium | NOT RUN / unmeasured |
| scripts/check_evidence_mutations.py | 10 | 600 | python | NOT RUN / unmeasured |
| scripts/check_foundation_mutations.py | 4 | 900 | node,chromium | NOT RUN / unmeasured |
| scripts/check_owner_safety_mutations.py | 7 | 600 | python | NOT RUN / unmeasured |
| scripts/check_android_mutations.py | 6 | 1200 | jdk17,sdk28+35,build-tools35 | NOT RUN / unmeasured |
| scripts/check_native_mutations.py | 10 | 1500 | node,jdk17,sdk28+35,build-tools35 | NOT RUN / unmeasured |
| scripts/check_round6_mutations.py | 15 | 1800 | node,python | NOT RUN / unmeasured |
<!-- fault-runners:end -->

All outputs must be in a new empty directory outside the checkout. The master
command is the recommended one: it also bounds the four inherited runners and
kills their entire process groups on timeout. A timeout is an incomplete failure,
never a killed fault or a reason to raise a ceiling silently. Keep port4173 free.

To isolate a failure without repeating every suite:

```sh
.venv/bin/python scripts/run_fault_suites.py --suite round6 --output-dir /outside/fresh-round6
```

Rewritten runners also support explicit --case NAME subsets, recorded as subsets
in report.json. No subset is wired into CI. Direct Android/native runner calls
accept --java-home and --android-home or their environment variables. The wrapper
uses bare java: the harness explicitly passes -Dorg.gradle.java.home. API28 checks
remain at full strength. No owner signing key or phone is used by these proofs.

The CI job installs existing npm/Python dependencies, Chromium, JDK17, API28/35
and build-tools35.0.0, builds the assets needed by round4, then runs the full
inventory once in sequence. Synthetic logs/reports are retained even on failure.
This workflow has NOT RUN in this delivery. See [runner triage](FAULT-TRIAGE.md)
for decisions, individual command ceilings and coverage gaps.

## Acceptance and honest reporting

The all-suites command above includes the five Part2 runners (contract, release,
round4, round5, round6) plus all seven formerly orphaned runners. They can also be
invoked directly with their --output-dir flags; use distinct outside directories.
Run the full acceptance sequence once, sequentially. Save real stdout and exit
codes. No acceptance/test/build/mutation/benchmark command was run by the builder.
Do not replace historical counts with an estimate, call a timed-out mutation a
survivor killed, or infer a physical/device/account/provider result. Preserve the
existing signing identity. No milestone is complete.

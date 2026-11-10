# Verify the complete local implementation

This source is **unverified**. The owner explicitly requested no builder-run tests.
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
npm ci
npm run check
npm run test:e2e
npm run test:pwa
.venv/bin/python scripts/validate_planning.py
.venv/bin/python scripts/check_gate_claims.py
.venv/bin/python -m unittest discover -s collectors/local/tests -v
.venv/bin/python scripts/check_contract_mutations.py --output-dir /outside/contract
.venv/bin/python scripts/check_release_mutations.py --output-dir /outside/release
.venv/bin/python scripts/check_round4_mutations.py --output-dir /outside/round4
.venv/bin/python scripts/check_round5_mutations.py --output-dir /outside/round5
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

## Gate claims and evidence

The table now covers Gate3 synthetic vs actual-provider evidence and Gate8
local-disposable evidence. They remain unverified here. After executing proofs,
update the scoped STATUS sentence and named-test claim together; the guard
reruns exactly that proof before accepting locally_verified. It rejects missing
required rows, wrong proof targets and stale contradictory claims. A local mock
can never close actual-provider or production-account gates.

Record real stdout/exit codes, environment and unresolved failures. Do not infer
new test totals from the historical suite counts. No milestone is complete.

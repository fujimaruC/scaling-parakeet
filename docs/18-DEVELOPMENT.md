# 18 — Run and verify the implementation baseline

This branch starts the whole-system implementation authorized by the owner on 2026-11-06. It does not represent completed M0–M4. Actual device/account gates and incomplete product features are listed in STATUS.

## Reproducible local checks

Node 24, Python 3.12 and a Python virtual environment were used here. Java 17 **JDK**, Android SDK platforms 28 and 35/build-tools 35.0.0 are required to compile the companion. Java runtime alone is insufficient.

```bash
npm ci
npm run check
python -m venv .venv
.venv/bin/pip install -r collectors/local/requirements.lock
.venv/bin/python scripts/validate_planning.py
.venv/bin/python -m unittest discover -s collectors/local/tests -v
npx playwright install chromium --only-shell
npm run test:e2e
npm run test:pwa
npm run check:secrets
```

`npm run check` runs formatting checks, TypeScript checking, Vitest integration tests, static PWA build and Worker **dry-run** build. `lint` currently checks formatting; a separate semantic ESLint ruleset is not yet configured. These commands do not deploy. D1 integration tests run Miniflare/workerd with a disposable local database. CI configuration is provided but has not run on GitHub during this session.

## Open the synthetic browser application

```bash
npm run dev:synthetic
```

Visit `http://127.0.0.1:4173`. This script serves UI/API on one origin with temporary synthetic state and test-only injected identity. It binds loopback and never bundles into the production Worker. Use fictional data only. The initial database is empty; create academic/organization contexts in Settings, add tasks and test completion. Stop/restart discards this test database. The production Worker always uses verified Cloudflare Access identity and fails closed when unconfigured.

## Linux-local export import

```bash
.venv/bin/pip install -e collectors/local
export ACADEMIC_OS_LOCAL_TOKEN="$(.venv/bin/python -c 'import secrets; print(secrets.token_urlsafe(32))')"
.venv/bin/academic-os-local --data-dir /absolute/private/directory/outside/repo
```

Use the locally generated token at `http://127.0.0.1:8765`. Enroll an explicitly selected source UUID, choose a synthetic text export, and inspect locally decrypted evidence. Keep the data directory outside cloud-sync directories. The UI binds loopback, enforces Host/Origin, uses an HttpOnly SameSite session and does not log raw requests. Local file selection is followed by explicit confirmation. The same UI now connects selected evidence → redacted preview → named provider/route consent → extraction → structured projection review → durable outbound job → cloud proposal. Preview redaction is a heuristic: review the selected material before consenting. Extraction never approves a task. The cloud review inbox requires another explicit owner decision. Jobs are encrypted locally and retries reuse the exact reviewed envelope. Automatic retries run in the separate source-bound job process documented below. Unknown outcomes require explicit recovery; projection review is never automatic. Open `/operations` after login for all-source consent, pause and job state.

The `server.py --receiver` mode runs separately against the same data directory and requires a private bind address plus TLS certificate/key. The companion supports five-minute one-device invitations, exact certificate pinning with hostname verification, source-scoped HMAC batches, immutable encrypted retries, receipt-confirmed cleanup and revoked-source wipe acknowledgment. Synthetic HTTPS transport tests pass; the actual Android 9/private-overlay connection is still unverified. See the setup sequence below.

## Encrypted canonical backup

Download canonical JSON using the PWA Settings export. Then:

```bash
.venv/bin/python -m academic_os.backup encrypt canonical.json canonical.enc --key /private/offline/key
.venv/bin/python -m academic_os.backup restore canonical.enc --key /private/offline/key --database /private/new-disposable.sqlite --migration apps/worker/migrations
```

Encryption uses standard authenticated Fernet encryption. Keys are created exclusively, excluded from archives and must be retained separately. Restore requires a new disposable SQLite database and verifies canonical rows against the export, with no old reminder dispatch intents, push subscriptions or credentials restored. After parity validation, restored active tasks enter a bounded queue to rebuild only future reminder intents. Production D1 restore and deletion reconciliation still need release testing. Raw chat/evidence archives are never part of this cloud-data backup.

## Android probe

```bash
cd apps/android-companion
./gradlew assembleDebug lint testDebugUnitTest --no-daemon
```

Requires a Java 17 compiler and configured Android SDK. The Gradle wrapper is from the official Gradle v8.11.1 repository. Wrapper/SDK downloads need normal network access; use your organization's normal proxy configuration if applicable. The debug APK builds and Android lint completes on Java 17 / SDK 35. Earlier JRE/compiler setup problems were resolved. The APK is a debug build, not a signed production release. Lint still warns about intentional synchronous credential commits, the custom pinned TLS trust manager, missing launcher icon and untranslated native strings; these require release review.

The source probe includes permission/settings screen, low-RAM reporting, explicit metadata inspection, conjunctive title/group mapping, bounded callback queue, AES-GCM Android Keystore encrypted SQLite payloads, backup disabled, reconnect inspection and bounded rebind requests. Capture defaults disabled. Private transfer and periodic platform-job retry are implemented; Android scheduling and manufacturer power behavior still require actual-device tests. Follow the complete matrix in 14-ANDROID-COMPANION on your actual phone before enabling real groups. No phone/emulator was available here.

## Production setup is still gated

Worker auth requires ACCESS_TEAM as the exact `https://<team>.cloudflareaccess.com` issuer, ACCESS_AUD and immutable OWNER_SUB. Configure actual owner-only Access policies and service auth on production/preview, replace the placeholder D1 ID and test positive/negative identity paths. No local developer identity flag exists in the deployed entry point. Do not put source credentials or raw content into static PWA builds. No deployment or paid provisioning occurred.

Do not enable a real 9Router provider route before recording provider/route/source consent. The project has not contacted the owner's router, Moodle, phone or Cloudflare account.

## Configure credentials only on your own machine

`examples/runtime.env.example` contains only nonfunctional placeholders. Do not put real values into this repository, the shared account or screenshots. Keep a local environment file outside the checkout with permissions `0600`, then export its variables into the collector process. Do not upload the local evidence directory or its key. Cloudflare secrets and owner identity belong in your own deployment environment, never Vite public environment variables.

1. Create a WhatsApp source in PWA Settings; use a safe alias and copy its source UUID/generation. Enroll that same source locally. Source-scoped collector key ID/secret are configured only on Linux when production sync is available.
2. Leave AI variables unconfigured for import, preview and local evidence browsing. For extraction, set `AI_BASE_URL`, `AI_MODEL`, `AI_PROVIDER_ID`, `AI_POLICY_VERSION` and `AI_API_KEY` locally. Inspect 9Router's actual upstream route; a loopback URL does not mean local inference. Changing provider/route/model/policy invalidates prior consent.
3. Run the loopback UI above. Select only intended evidence, inspect the redacted preview, approve the disclosed source/provider policy, then extract. Inspect the structured projection before queuing it. Configure `ACADEMIC_OS_API_URL`, `COLLECTOR_SOURCE_ID`, `COLLECTOR_KEY_ID` and `COLLECTOR_HMAC_SECRET` locally to send it. One process credential can send only the matching source; never share a collector credential across sources. Errors display sanitized codes and retain retry state.
4. For the phone, establish your chosen private overlay/network first. No VPN vendor account is configured by this repository. Use a receiver certificate whose subject alternative name matches the private hostname/IP; keep its private key only on Linux. Start the receiver separately:

```bash
.venv/bin/academic-os-local --data-dir /absolute/private/directory/outside/repo --receiver --bind PRIVATE_LINUX_IP --port 8766 --tls-cert /private/receiver.crt --tls-key /private/receiver.key
openssl x509 -in /private/receiver.crt -noout -fingerprint -sha256
```

5. In the authenticated local UI, create a pairing invitation for the enrolled source. Enter the private HTTPS receiver address, independently verified SHA-256 certificate fingerprint and five-minute token in the companion. The invitation is consumed by one device; retrying the same invitation on that device can recover a lost response. No cloud key goes on the phone.
6. Grant notification access explicitly. Inspect a synthetic WhatsApp conversation's title AND group metadata, save its exact mapping and enable collection. Verify queued events, signed transfer, interruption/retry, listener restart and revocation on the actual Android 9 phone. Muted chats, hidden previews, notification aggregation and missing metadata remain coverage limitations. Export import stays available.

## Reminder policy and recovery

PWA Settings edits enabled state, up to five pre-deadline hour offsets and date-only prior-day reminder hour. Dates preserve their original precision and timezone. Policy changes invalidate existing intents and enqueue a bounded rebuild (20 tasks per scheduler tick); new intents are future-only. Owner-timezone quiet hours defer/coalesce new inbox deliveries, including across daylight-saving transitions. Deadlines remain unchanged, so deferred reminders may arrive after a deadline. Existing inbox entries remain visible. Web Push and physical delivery are still pending. In-app notifications support read and one-hour snooze. Briefing counts aggregate the entire ledger; task/calendar/search views disclose when only a page is loaded.

Source purge uses generation tombstones and revokes sync credentials. Linux checks cloud source status before sending a job, erases local source evidence/jobs when revoked, and acknowledges the wipe. Phone checks its Linux status before transfer and wipes its queue before acknowledging. An offline device remains pending; the cloud does not claim a phone wipe it has not verified. Cloud status presently shows phone wipe as `verify_locally`. Manually retained/edited tasks survive purge; sole-source unedited AI tasks are scrubbed when delete mode is selected. Owner-edited retained text must be reviewed separately.

## Queue/API-28 follow-up

Install SDK platforms 28 and 35 plus build-tools 35.0.0. `verifyApi28` checks all Kotlin against Android 9 without host JDK APIs. `testDebugUnitTest` runs six queue-privacy and eight native-policy plain-JVM cases through its `testQueuePrivacy`/`testNativePolicy` prerequisites; these are not Android runtime tests or a JUnit class. No dependency was added.

```bash
cd apps/android-companion
./gradlew assembleDebug lint testDebugUnitTest
cd ../..
.venv/bin/python scripts/check_android_mutations.py --output-dir /absolute/synthetic-check-output
```

Run mutations only in an isolated checkout without concurrent Android builds. Each broken run must fail for the intended reason; each restored run must pass. Files restore in finally. No device/emulator or actual peer/account is used.

V1 queue upgrade requires owner-confirmed reset: untransferred data/pairing are discarded, capture pauses and re-pairing is required. Cancel keeps legacy data blocked and unchanged. Missing keys never regenerate over protected ciphertext. Run [DEVICE-SMOKE](DEVICE-SMOKE.md) first, then the longer matrix in [14](14-ANDROID-COMPANION.md).

## Evidence tooling checks

Run the normal acceptance suites, including npm run test:e2e and npm run test:pwa. Run new fault checks sequentially:

```bash
.venv/bin/python scripts/check_evidence_mutations.py --output-dir /absolute/synthetic-check-output
```

The script declares its full fault list and prints the actual count. It never runs adb or a device. Gradle's preBuild produces assets/academic-os-build.json; only a clean Git checkout can name source_commit, while dirty builds stamp null. Metadata is a build declaration, not independent binary provenance proof. Owner-local adb collection and matrix commands/limits are in DEVICE-SMOKE. Keep generated audit directories and local verification keys outside the repository and cloud backups.

## Pixel-paper S1 foundation

`npm run dev:synthetic` serves the existing synthetic app and `/__kit`. The kit is
DEV-gated; production builds do not expose it. Local fonts/licenses live under
apps/web/public/fonts and are precached; do not add Google Fonts runtime calls.

```bash
.venv/bin/python scripts/check_foundation_mutations.py --output-dir /absolute/synthetic/fault-output
```

Run in an isolated checkout with no concurrent web build/test/edit. Four declared
faults each require a clean baseline, an assertion failure when broken, and a
passing restored run; finally restores bytes, and a lock prevents duplicate runner
instances. The design's next slice is S2, only after owner review of S1. Android
identity/accessibility and large-ledger pagination from the original polish brief
remain open; this foundation does not silently complete them.

## S2 regression checks

```bash
.venv/bin/python scripts/check_s2_mutations.py --output-dir /absolute/synthetic/output
```

Use an isolated Git checkout, with no concurrent app build/test/edit. The runner
prints its actual CASES count and retains every baseline/broken/restored command
output. It restores bytes in finally, locks duplicate runs, isolates Python caches
and requires an assertion failure rather than a setup error. No adb/device call is
made by these tests. S2 UI reads the existing real Worker in the synthetic harness;
its fixtures are confined to tests/fixtures and dev/test code. All S2 add/save/
completion controls are previews/disabled; existing legacy writes elsewhere are
preserved. Do not label them newly implemented S3 features. Stop for owner review
before S3, and run the corrected evidence tool on the real phone separately.

For reproducible synthetic S2 review renders (an isolated temporary Worker, never
an owner/account session):

```bash
node scripts/render_s2.mjs --output-dir /absolute/synthetic/render-output
```

Run without another synthetic server on port 4173. The manifest states the actual
browser, synthetic clock, viewport, reduced-motion setting and captures. Reference
font calls are replaced in memory with the same local fonts; the reference file
is unchanged. These are review images, not approved pixel-equality baselines or
real Android evidence. Do not use this renderer with personal data.

## S3–S7 build-only handoff (2026-11-07)

See [S3-S7-HANDOFF](S3-S7-HANDOFF.md). The current owner requested implementation
and compilation only, with all tests delegated. Do not treat historical S2
readonly assertions, mutation totals or renders as current validation. No new
application dependency. Production assets now stamp the public shell hash map
into sw.js at build time; public/sw.js is a template, not a standalone development
service worker. API responses stay out of Cache Storage. Generate deterministic
public icons with `python3 scripts/generate_pwa_icons.py` if changing the bitmap.

Build without tests:

```bash
npm ci --ignore-scripts
./node_modules/.bin/tsc --noEmit
WRANGLER_SEND_METRICS=false npm run build
```

The last command runs Vite and the existing Worker `wrangler deploy --dry-run`;
it does not deploy. It requires no account credentials. The ZIP includes compiled
web/Worker bundles separately from source. They retain UNCONFIGURED bindings;
production auth/deployment is an owner-local follow-up. Apply all migrations,
including 0006, in a disposable environment before verification. No real data or
credentials belong in that environment. Follow the handoff before real use.


## Bounded durable jobs and multi-source operations

After login, open **Manage all sources and durable job states**. Every row names
its source UUID and displayed generation. Consent is a deliberate checkbox plus
submit against the disclosed route/model/provider/policy; revoke affects only that
row. Generation changes warn and stale forms fail. Existing consent records without
a generation are stale and require reconfirmation. Existing import/sync times are
unavailable until an observation is recorded, never backfilled with today's time.
Pause is local and non-destructive. It does not send phone revocation or erase a
queue; the phone can keep collecting until its own limits. Resume cannot undo a
purge or reconcile a mismatched cloud generation. Manual export remains available
for an enabled explicitly enrolled source.

Run one job process per source with that source's existing credential configured
locally. It shares the private data directory with UI/receiver and is **separate**
from `academic_os.control --watch`:

```sh
COLLECTOR_SOURCE_ID=SOURCE_UUID .venv/bin/python -m academic_os.jobs --data-dir /absolute/private/linux-directory --watch
```

Install the existing collector editable package as above first. The command polls
every five seconds, processes at most one due job per pass and has no worker
thread in an HTTP handler. A process lock serializes requests across UI/job runners;
control polling remains independent. It is not installed as an OS service here.
Laptop off means no processing. Persisted wall-clock due times survive restart;
a backward clock can delay retries, and forward clock movement can make a due
attempt eligible sooner. Neither changes the attempt cap or claims success.

Extraction has at most two total attempts. Sync has at most five. Backoff is
30 seconds doubled per attempt, capped at 900 seconds. Only HTTP429 refusal or
connection-refused/DNS failures before connection can automatically replay an
extraction/upload; a failed read-only source preflight can retry. HTTP4xx other
than429 and validation/consent/generation failures are terminal. HTTP5xx, timeout,
connection reset or death after a durable attempt claim are **unknown**, never
silently replayed. A successful durable local result can close its attempt after
restart. No raw response/error text is stored in the attempt journal.

`/operations` shows ready/waiting/running/complete/failed/exhausted/unknown states,
attempt counts, next epoch time and fixed-code attempt history. Projection review
still requires the owner; only a reviewed immutable envelope becomes eligible for
automatic sync. Canonical task approval remains a separate owner action in the app.
An unknown upload (including a missing/mismatched batch receipt) may be manually retried with the same envelope/idempotency key;
an unknown extraction requires a new deliberate selection/run and can generate
another proposal, never an automatically accepted task. Historical jobs without
scheduling metadata stay manual-only; historical extracting jobs are not replayed.
No request can bypass caps by clicking repeatedly. Terminal jobs remain visible.

The current UI process has one configured provider and one source-scoped cloud
credential. It can manage consent/status for all sources; syncing a different
source needs its separately configured job process, never a shared collector key.
Actual provider/route behavior, installed service operation and production
credentials remain unverified. Local synthetic acceptance cannot close these gates.

```sh
.venv/bin/python scripts/check_gate_claims.py
.venv/bin/python scripts/check_round4_mutations.py --output-dir /absolute/outside/repo/faults
```

A source remains permanently revoked after purge. The operations screen separates
that fact from pending cleanup: Linux/cloud acknowledgment must be explicitly
observed and each known revoked device must report application. Phone-only
application cannot stand in for Linux acknowledgment. `confirmed_known_inventory`
never asserts a complete device inventory. Cloud source status alone cannot
supply these confirmations.

### Recovered round5 handoff

The owner requested a code-only recovery with no application tests or benchmarks.
See [OWNER-VERIFY-ROUND5](OWNER-VERIFY-ROUND5.md). New code and written regressions
are unverified; earlier chat runs must not be reused for this tree. Apply all
migrations including0009 before CSV use. Missing epoch metadata refuses export.

The synthetic seed and interrupted-transfer endpoints exist only in the loopback
`dev-synthetic.ts` harness with SYNTHETIC_FIXTURES=1. Do not deploy that harness.
The production Worker gains no seed/auth/budget bypass. Generic streaming clients
must keep temporary output and rename only after successful body consumption.
JSON remains the lossless encrypted backup input; CSV remains a spreadsheet view.

## Five-scope local delivery verification

See [complete owner sequence](next-scope/OWNER-VERIFY.md). Install the existing
Python requirements into .venv before npm integration tests: the D1 restore
fixture invokes the actual Python backup encryptor. AOS_TEST_PYTHON can select
another executable. The router Python suite also requires installed existing npm
dependencies and starts a loopback-only shared Worker/Miniflare child process.

Local disposable restore (never an account/existing-database target):
`node --import tsx scripts/restore_d1.ts --archive /private/canonical.fernet --key /private/backup.key`.
Optional --report uses exclusive private-file creation; --now fixes an explicit
reference time for future-reminder checks. Do not put archives/keys in the repo.
Standalone synthetic router: `.venv/bin/python scripts/mock_9router.py --port 9191 --scenarios 429,valid`.
It binds loopback, does not call upstream providers, and stores only counters.
Use only synthetic messages. The lifecycle test creates its own temporary TLS
certificate and isolated real Worker receiver; it does not require live secrets.
Current ITK CLI review steps are documented in03-ITK-COLLECTOR and OWNER-VERIFY.

All new application tests/builds/benchmarks are NOT RUN in the builder delivery
at the owner's request. Run sequentially and attach actual output before promoting
claims. Preserve all external device/account/provider/production gates.

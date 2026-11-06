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

Use the locally generated token at `http://127.0.0.1:8765`. Enroll an explicitly selected source UUID, choose a synthetic text export, and inspect locally decrypted evidence. Keep the data directory outside cloud-sync directories. The UI binds loopback, enforces Host/Origin, uses an HttpOnly SameSite session and does not log raw requests. Local file selection is followed by explicit confirmation. The same UI now connects selected evidence → redacted preview → named provider/route consent → extraction → structured projection review → durable outbound job → cloud proposal. Preview redaction is a heuristic: review the selected material before consenting. Extraction never approves a task. The cloud review inbox requires another explicit owner decision. Jobs are encrypted locally and retries reuse the exact reviewed envelope. Retry is user-triggered; a background Linux retry daemon is not implemented.

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
3. Run the loopback UI above. Select only intended evidence, inspect the redacted preview, approve the disclosed source/provider policy, then extract. Inspect the structured projection before queuing it. Configure `ACADEMIC_OS_API_URL`, `COLLECTOR_KEY_ID` and `COLLECTOR_HMAC_SECRET` locally to send it. Errors display sanitized codes and retain retry state.
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

Install SDK platforms 28 and 35 plus build-tools 35.0.0. `verifyApi28` checks all Kotlin against Android 9 without host JDK APIs. `testDebugUnitTest` runs five plain-JVM policy tests through its `testQueuePrivacy` prerequisite; these are not Android runtime tests or a JUnit class. No dependency was added.

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

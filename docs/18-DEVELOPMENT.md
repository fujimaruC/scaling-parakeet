# 18 — Run and verify the implementation baseline

This branch starts the whole-system implementation authorized by the owner on 2026-11-06. It does not represent completed M0–M4. Actual device/account gates and incomplete product features are listed in STATUS.

## Reproducible local checks

Node 24, Python 3.12 and a Python virtual environment were used here. Java 17 **JDK**, Android SDK platform 35/build-tools 35.0.0 are required to compile the companion. Java runtime alone is insufficient.

```bash
npm ci
npm run check
python -m venv .venv
.venv/bin/pip install -r collectors/local/requirements.lock
.venv/bin/python scripts/validate_planning.py
.venv/bin/python -m unittest discover -s collectors/local/tests -v
npx playwright install chromium --only-shell
npm run test:e2e
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

Use the locally generated token at `http://127.0.0.1:8765`. Enroll an explicitly selected source UUID, choose a synthetic text export, and inspect locally decrypted evidence. Keep the data directory outside cloud-sync directories. The UI binds loopback, enforces Host/Origin, uses an HttpOnly SameSite session and does not log raw requests. Local file selection is followed by explicit confirmation. AI/network inference is disabled in this UI; the consent-gated adapter is a separately tested module, not a fully connected extraction workflow yet.

The `server.py --receiver` mode requires a private bind address and TLS certificate/key and accepts only enrolled signed device batches. Pairing enrollment and native transfer integration remain unfinished; do not treat the receipt core as a proven phone connection.

## Encrypted canonical backup

Download canonical JSON using the PWA Settings export. Then:

```bash
.venv/bin/python -m academic_os.backup encrypt canonical.json canonical.enc --key /private/offline/key
.venv/bin/python -m academic_os.backup restore canonical.enc --key /private/offline/key --database /private/new-disposable.sqlite --migration apps/worker/migrations/0001_core.sql
```

Encryption uses standard authenticated Fernet encryption. Keys are created exclusively, excluded from archives and must be retained separately. Restore requires a new disposable SQLite database and verifies canonical rows against the export, with no reminder dispatch intents, push subscriptions or credentials restored. Production D1 restore, reminder re-creation and deletion reconciliation still need release testing. Raw chat/evidence archives are never part of this cloud-data backup.

## Android probe

```bash
cd apps/android-companion
./gradlew assembleDebug --no-daemon
```

Requires a Java 17 compiler and configured Android SDK. The Gradle wrapper is from the official Gradle v8.11.1 repository. Wrapper/SDK downloads need normal network access; use your organization's normal proxy configuration if applicable. Native compilation was attempted here and failed because this runtime provides a JRE without javac; no APK or successful build is claimed.

The source probe includes permission/settings screen, low-RAM reporting, explicit metadata inspection, conjunctive title/group mapping, bounded callback queue, AES-GCM Android Keystore encrypted SQLite payloads, backup disabled, reconnect inspection and bounded rebind requests. Capture defaults disabled. Transfer is explicitly absent in this probe. Follow the complete matrix in 14-ANDROID-COMPANION on your actual phone before enabling real groups. No phone/emulator was available here.

## Production setup is still gated

Worker auth requires ACCESS_TEAM as the exact `https://<team>.cloudflareaccess.com` issuer, ACCESS_AUD and immutable OWNER_SUB. Configure actual owner-only Access policies and service auth on production/preview, replace the placeholder D1 ID and test positive/negative identity paths. No local developer identity flag exists in the deployed entry point. Do not put source credentials or raw content into static PWA builds. No deployment or paid provisioning occurred.

Do not enable a real 9Router provider route before recording provider/route/source consent. The project has not contacted the owner's router, Moodle, phone or Cloudflare account.

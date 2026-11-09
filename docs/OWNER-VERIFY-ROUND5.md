# Owner verification: recovered four-slice delivery

2026-11-10. The owner requested no builder-run tests. This exact tree is
**unverified**. Earlier chat output was lost with the workspace and is not proof
for this reconstruction. No device/account/provider/deployment result is claimed.

## Apply and prepare

Use APPLY.md's exact base and patch in a fresh branch. Keep existing signing
identity and local secret files. Never uninstall/clear phone data to apply this
source update. There is no APK/key in the ZIP and no Android source change.

Use docs/18-DEVELOPMENT.md for the existing Python lockfile/venv setup and pinned
Playwright browser. Install JDK17, SDK platforms28 and35, build-tools35.0.0 only if
missing. gradlew ignores JAVA_HOME; pass org.gradle.java.home explicitly.

Apply migration0009 to local synthetic databases through the existing migration
loader. Review it before any production application. Metadata and its33 triggers
must remain together. JSON/canonical backup still has the same11-table allowlist;
the new epoch table is operational metadata, not a twelfth export table.

## Run sequentially

Keep port4173 free. Do not run Gradle or mutation suites alongside browser runs.
Paths under /absolute/outside must be replaced with a directory outside the repo.
No real data is needed for these checks.

```sh
npm ci
npm run check
npm run test:e2e -- --reporter=json > /absolute/outside/browser-1.raw.txt
npm run test:e2e -- --reporter=json > /absolute/outside/browser-2.raw.txt
npm run test:e2e -- --reporter=json > /absolute/outside/browser-3.raw.txt
npm run test:pwa
.venv/bin/python scripts/validate_planning.py
.venv/bin/python scripts/check_gate_claims.py
.venv/bin/python -m unittest discover -s collectors/local/tests -v
.venv/bin/python scripts/check_contract_mutations.py --output-dir /absolute/outside/contract
.venv/bin/python scripts/check_release_mutations.py --output-dir /absolute/outside/release
.venv/bin/python scripts/check_round4_mutations.py --output-dir /absolute/outside/round4
.venv/bin/python scripts/check_round5_mutations.py --output-dir /absolute/outside/round5
node --import tsx scripts/measure_resources.ts /absolute/outside/resources.json
```

`npm run` writes a lifecycle preamble before the JSON reporter. For clean JSON
files use the existing executable directly for the three browser runs instead:

```sh
./node_modules/.bin/playwright test --reporter=json > /absolute/outside/browser-1.json
./node_modules/.bin/playwright test --reporter=json > /absolute/outside/browser-2.json
./node_modules/.bin/playwright test --reporter=json > /absolute/outside/browser-3.json
node --import tsx scripts/report_browser_margins.ts /absolute/outside/browser-1.json /absolute/outside/browser-2.json /absolute/outside/browser-3.json
node --import tsx scripts/report_accessibility.ts /absolute/outside/browser-3.json
```

Run either three-run variant, not both unnecessarily. The structural report
requires17 scopes × four locale/theme combinations × five rules. Missing/duplicate
observations fail and display UNVERIFIED; no-form label cases are N/A. A green
structural table does not certify real screen readers, clipping or visual contrast.

Android (adapt paths locally):

```sh
cd apps/android-companion
env ANDROID_HOME=/home/riko/Android/Sdk ./gradlew assembleDebug lint testDebugUnitTest --no-daemon -Dorg.gradle.java.home="$HOME/.local/opt/jdk-17.0.21+9"
```

Policy cases run as standalone JVM mains, not Android runtime or JUnit UI tests.
Check actual stdout and lint output. Do not infer a device result from a build.

## Focused checks to inspect

- CSV: byte parity against the independent old writer, all tables including empty,
  jumbo UTF-8 fragmentation, page/batch/chunk bounds, concurrent write/reversal,
  database failure and cancellation. A late200 response failure must create no
  download. Check fixed errors before headers and body completion afterwards.
- Seed margins: use actual reported durations, retain the30s bounds unless measured
  evidence justifies a change. The grouped audit's60s bound is not a measured SLA.
- Accessibility: review every table row, then run the deliberately unlabeled-icon
  mutation and inspect its intended failure/restored pass. Reports alone never
  stand in for a test that did not run.
- Legacy jobs: explicit job/source/generation and checkbox, reviewed projection,
  matching credential, no retry-row creation, one shot even after refusal/unknown,
  restart preserves refusal of a second attempt. Current provider consent gates
  extraction; this action sends only the already reviewed structured projection.
  Canonical approval remains separate. Never manufacture/repair metadata to replay.

Replace the pending resource profile only with real observed output. SQL statement
counts and D1 binding calls are different quantities. Bounded OFFSET results do
not imply bounded scans/billing. Real Cloudflare CPU/rows/stream-abort propagation,
private networking, provider/push, device capture and owner acceptance remain open.

Return sanitized command output and fixed errors. No real chats, exports,
notification text/titles/group keys, credentials or real-message screenshots.

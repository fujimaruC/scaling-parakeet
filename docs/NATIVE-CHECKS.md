# Native implementation checks — 2026-11-08

Base: 6bbfa26. Native application code: d2f24e4. No device, account, provider,
deployment or push test. The actual phone's last notification-access observation
is false and no capture has ever occurred. No milestone is complete.

A workspace restart removed the earlier local directory. A durable INPROGRESS
checkpoint was restored and fixes reconstructed. Only the retained reruns in
this document count. Old transient outputs are not substituted for fresh checks.

## Commands and actual output

See the text files in [native-checks](native-checks/README.md). They are command
output, not synthesized success messages. Browser tests exercise the retained
PWA and local Miniflare data, not Android UI or a production account.

The source uses the existing dependency lockfiles. `npm ci --ignore-scripts`
installed them; no dependency was added. Existing Python requirements were
installed in a fresh virtual environment. No real secrets or data were used.

Android setup restored missing standard JDK launchers (`javac`, `jar`, `javap`,
`jlink`, `jmod`) from the already present JDK 17.0.20 modules in a private copy.
Official Android command-line archive 12266719 was downloaded. `sdkmanager`
installed platforms 28/35, build-tools 35.0.0 and platform-tools. Nested platform
archive directories were normalized after inspecting their layout. Gradle 8.11.1
was selected by the unchanged wrapper. All toolchain/cache/signing files are
excluded from the handoff.

The owner paths were absent here. Actual environment:

```text
ANDROID_HOME=/workspace/scratch/bbff8dae2870/native-toolchain/sdk
JDK=/workspace/scratch/bbff8dae2870/native-toolchain/jdk
GRADLE_USER_HOME=/workspace/scratch/bbff8dae2870/native-toolchain/gradle
Node 24.22.1; npm 11.9.0; Python 3.12.14; OpenJDK 17.0.20
Gradle 8.11.1; Kotlin 2.1.21; AGP 8.9.2
```

The wrapper invokes bare java, so PATH selects JDK 17 too. The captured Android
log prints the exact Gradle command and explicit Java installation properties.
An existing host proxy was passed to Java using its host/port only.

A direct workspace rerun failed deleting generated Kotlin output. Its complete
failure output is retained. Verification was rerun on an unchanged detached
checkout outside the synchronized workspace, using the same SDK/JDK, checks,
source and API-28 rules. No source or check was weakened for that retry.

## Meaningful negative checks

`scripts/check_native_mutations.py` declares ten faults. It validates a baseline,
mutates source, requires the intended failure, restores exact original bytes in
finally, and requires a restored pass. Do not run it beside another build.

```bash
python scripts/check_native_mutations.py \
  --output-dir /tmp/native-mutations \
  --java-home "$HOME/.local/opt/jdk-17.0.21+9" \
  --android-home /home/riko/Android/Sdk
```

Faults: a new helper relying on inherited AutoCloseable; a newer Android method;
a host-JDK-only method; precision collapse; completed undated regrouping; dropping
an uncertain request; collapsing unavailable into empty; pending credential
escalation; device scope bypass; expired snooze receipt replay. Full broken and
restored outputs ship. This is a compiler/policy/API regression demonstration,
not a test of Android runtime behavior or all UI interactions.

The five new standalone JVM policy cases run the actual production policy code.
The six existing QueuePrivacy cases remain. Neither runs Android Keystore,
SQLite, Activities, HTTP on the phone or a real notification listener.

## Accessibility evidence and limits

Implemented: real Buttons/ImageButtons, 48dp minima, sp text, ID/EN resources,
local licensed fonts, explicit light/dark/system themes, content labels/labelFor,
keyboard focus drawables, selected-tab text, native modal panels, scrollable
feedback, decorative context markers with textual context labels, and reduced
motion/haptics. Four due precisions have separate labels and field invariants.

Actual browser 360px/200%/contrast observations in the E2E log apply to the PWA
only. Native TalkBack, focus traversal/return, 200% long-text layout, contrast of
all OS-rendered states, disabled controls, ColorOS lifecycle and visual acceptance
are **unverified**. No screenshot or synthetic test is called a native audit.

## Account and phone gates

BLOCKED: no owner phone is attached; no account, identity-provider session or
production D1 observation is available. Cloudflare path precedence/aliases,
request budgets, migration application, real enrollment/revocation, HTTPS/PATCH
round-trip, APK update signing, native storage/power-loss behavior, actual capture,
transport, provider and push behavior remain unverified. Android 9 AOSP source
inspection lists PATCH in HttpURLConnectionImpl; that is source inspection, not
an OPPO network test:
https://android.googlesource.com/platform/external/okhttp/+/android-9.0.0_r1/okhttp-urlconnection/src/main/java/com/squareup/okhttp/internal/huc/HttpURLConnectionImpl.java

The APK is a debug build with this environment's signing identity. Rebuild with
the owner's original key for an in-place update; do not uninstall to bypass a
signature mismatch. PWA, Linux dual ingestion, privacy and approval rules remain.

## Final retained outcomes

| Actual command | Outcome |
|---|---|
| `npm ci --ignore-scripts` | exit 0; existing lockfile dependencies |
| `npm run check` | exit 0; 36 Vitest tests, formatting, types, PWA build and Worker dry-run |
| `npm run test:e2e` | exit 0; 12 PWA/local synthetic browser tests |
| `npm run test:pwa` | exit 0; 1 built-PWA offline/logout test |
| `.venv/bin/python -m unittest discover -s collectors/local/tests -v` | exit 0; 40 synthetic collector/evidence tests |
| `./gradlew clean assembleDebug lint testDebugUnitTest verifyApi28` with the explicit JDK properties in the log | exit 0; BUILD SUCCESSFUL in 43s; 6 QueuePrivacy and 5 NativePolicy standalone JVM cases |
| `scripts/check_native_mutations.py` with the SDK/JDK paths above | exit 0; 10 intended broken failures and 10 restored passes |
| `.venv/bin/python scripts/check_placeholders.py` | exit 0; common token-format scan, not an exhaustive secret audit |
| SDK `adb devices -l` | exit 0; no attached devices; inventory only |

Final isolated lint: **0 errors, 2 warnings** — ApplySharedPref in existing
Transport credential persistence and CustomX509TrustManager in existing pinned
private-Linux TLS. They remain deliberately: do not replace durable credential
persistence with lossy timing or private pin validation with accept-all TLS to
silence lint. Cloud task HTTPS uses platform verification, not that trust manager.
The earlier direct workspace report also named an empty former v26 icon folder;
the isolated tracked-source build has no such folder and does not emit it.
Compiler API deprecations and Gradle's future-9 compatibility notice remain;
no NewApi/InlinedApi error was suppressed.

The final source changes also keep the undated navigation visible when timezone
settings are unavailable, invalidate write readiness while checking the owner/
source boundary, refetch calendar data after a changed owner timezone, and keep
unknown/approximate archived tasks under Tanpa tanggal. Context markers have text
labels and selected-day contrast/focus handling. These UI paths compiled; actual
native interactions and accessibility remain unverified.

Planning validator, actual output:

```text
PASS: 3 schemas; 5 valid fixtures/date variants; 21 rejection cases; 98 local links; 30 features; 34 test IDs.
This validates planning artifacts only. No application/device/account tests ran.
```

# Release-gap checks, base c4497da

Synthetic/local results only. Full command output is in [release-gap-checks](release-gap-checks/README.md).
The mutation runner declares its actual fault count and stores baseline, broken
assertion failure, and restored pass for every fault in private fixture copies.
It never mutates working sources, calls adb, sends push, or contacts an account.

```sh
npm ci
npm run check
npm run test:e2e
npm run test:pwa
python -m venv .venv
.venv/bin/pip install -r collectors/local/requirements.lock
.venv/bin/python scripts/validate_planning.py
.venv/bin/python -m unittest discover -s collectors/local/tests -v
.venv/bin/python scripts/check_release_mutations.py --output-dir /absolute/local/fault-output
cd apps/android-companion
env ANDROID_HOME=/tmp/aos-android-sdk ./gradlew assembleDebug lint testDebugUnitTest --no-daemon -Dorg.gradle.java.home=/tmp/aos-jdk17
```

Use your installed SDK/JDK17 paths. The wrapper calls bare java; JAVA_HOME alone
is insufficient. This session used OpenJDK17.0.20, Node24.22.1/npm11.9.0,
Python3.12.14, Gradle8.11.1, Kotlin2.1.21 and AGP8.9.2. No dependency declaration
or lockfile changed. No real keys or APK are included in the handoff.

Environment setup: downloaded Google's commandline-tools11076708 archive to
`/tmp/aos-android-sdk`, then ran sdkmanager with `--sdk_root=/tmp/aos-android-sdk`
for `platforms;android-28`, `platforms;android-35`, `build-tools;35.0.0`. Accepted
SDK licenses locally. The system Java runtime lacked javac. Initial apt attempts
failed with setgroups/permission errors; downloaded the matching Ubuntu
openjdk-17-jdk-headless17.0.20 package from the configured Ubuntu snapshot,
extracted it with dpkg-deb into `/tmp/aos-jdk-overlay`, and overlaid its compiler/
JDK tools onto a private copy of the existing matching runtime at `/tmp/aos-jdk17`.
`javac -version` reported17.0.20. Gradle used that explicit property and the
workspace's normal HTTP/HTTPS proxy. Installed Playwright's pinned Chromium
headless shell through `npx playwright install chromium --only-shell`.

Retained development failures are also evidence: the first budget prototype
throttled shared synthetic test windows; browser runs exposed a duplicate History
heading and an unnecessary initial-search debounce under the frozen test clock.
The duplicate heading was corrected, and the existing observed unfiltered root
pages were preserved. Tests now isolate request windows in the non-deployed
synthetic harness, while dedicated integration tests exhaust the production
limits and verify no canonical write. The first mutation baseline lacked copied
JSON schemas; it was a fixture setup error, never counted as a killed fault.

The scope of these checks is finite. Miniflare is a disposable local D1 model;
service-worker push is a synthetic event model; Playwright is pinned desktop
Chromium. No Cloudflare Access/account, physical browser notification, owner
phone/TalkBack, provider, real capture/private network, production migration or
billing check ran. No milestone is complete. Consult VERIFICATION-LOG section20
and RELEASE-GAPS for the owner verification steps and remaining gates.

One experimental browser fault removed an extra component epoch guard, but the
stale-response case still passed: a root refresh already unmounts that history
component. That experiment is **not** counted as a killed fault or a newly fixed
defect. The redundant guard and its unsound fault runner were removed. The
browser race observation remains a regression for the existing isolation, and
its experiment output is retained under development logs. The shipped fault
runner declares only its independently demonstrated implementation faults.

Current observed outcomes:52 Vitest,70 Python,14 JVM;16 declared mutation failures
and16 restored passes. PWA offline1 passed. Browser full suite passed15 earlier,
then14 passed/1 unchanged kit-layout assertion failed in the latest run; the
isolated retry passed1. The latest full suite is not described as clean. Android
assembleDebug/lint/full verifyApi28 pass with0 lint errors and2 unchanged warnings
in Transport.kt (durable commit and pinned trust manager), not suppressed.

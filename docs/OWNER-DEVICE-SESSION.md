# Owner: run the native app and return one safe file

This is the **first native-task-app device run**, not a rerun of the old capture
probe. Nothing in this package certifies a phone/account result. Keep notification
access unchanged and use synthetic tasks only. No milestone is complete.

1. **Get the right signed APK.** Follow [SIGNING-SAFETY](SIGNING-SAFETY.md), with
   your existing private key. Keep that key/password on your Linux machine.
   If the key is unavailable, stop and keep the existing install intact.
2. **Connect just your phone by USB**, unlock it and authorize your own computer.
   From the repository folder, set up the already installed tools:

   ```bash
   export ANDROID_HOME=/home/riko/Android/Sdk
   export PATH="$HOME/.local/opt/jdk-17.0.21+9/bin:$ANDROID_HOME/platform-tools:$PATH"
   mkdir -p "$HOME/academic-os-device-check"
   chmod 700 "$HOME/academic-os-device-check"
   ```

3. **Check before installing.** Substitute your APK's local path:

   ```bash
   python scripts/owner_device_run.py --sdk "$ANDROID_HOME" \
     --apk /private/owner-signed.apk --preflight
   ```

   Continue only with `allowed: true`. An existing install must also have
   `signature_match: true`. `SIGNATURE_MISMATCH`, missing tools or unreadable
   retained package data means stop. No install/reset occurs in this step.
4. **Run in your normal terminal**, not a pipe or an automated agent:

   ```bash
   python scripts/owner_device_run.py --sdk "$ANDROID_HOME" \
     --apk /private/owner-signed.apk --install \
     --output "$HOME/academic-os-device-check/native-run-1.json"
   ```

   Use a new output filename each time. Confirm the in-place install. The tool
   checks signing again, reads back the installed APK, and observes cold launch
   and Home/reopen with a continuous crash window. Allow about a minute for this
   first smoke; later manual cases take longer. It never grants permissions,
   wipes app data, extracts credentials, captures screenshots or sends logs.
5. **Answer y/n/s to the fixed questions.** Answers do not echo. `s` means skip,
   never pass. Try each requested action yourself before answering. No account
   yet? Skip enrollment cases. No test credential actually expired on the server?
   Skip credential expiry. Do not change the phone clock as a substitute.
   If you see a repair/reset prompt or unexplained queue/pairing change, stop;
   do not reset it to make the check pass.
6. **Return only `native-run-1.json`.** It contains booleans, counts, build/artifact
   identity and fixed codes. No messages, titles, group keys, serials, tokens,
   URLs or stack traces are collected. Never attach a general logcat, screenshot,
   APK signing key, HAR, chat export or the old matrix verification key.

If interrupted, the last atomic report remains readable. An unfinished case has
an absent owner result and an error; it cannot become a pass. A missing START or
END marker, ambiguous crash attribution, changed APK/boot or failed readback
blocks further observations. `fatal_exception_observed: false` means no target
fatal was observed in a complete window; null means unknown. The separate
`crash_window_started`/`crash_window_ended` booleans distinguish no window from a
partial or ambiguous one. Positive fatal
observations remain positive even if coverage later fails.

`session_complete` means the recorder finished its questions, **not** that the
app passed. `owner_reported_ok` is your observation, separate from instrumented
fields. Exit 1 reports an owner-observed failure; exit 2 means blocked, skipped or
unverified work. The record has no overall PASS field. A normal/zero exit does not
replace independent account/device review. The file is not a tamper-proof
attestation against an owner/root who can edit the file or tool.

After we read your record, device-discovered defects can be fixed at their cause
with a failing regression. Until a real record exists, native behavior remains
unverified. See [NATIVE-CLOUD-CHECK](NATIVE-CLOUD-CHECK.md) for the separate account
observations; GUI success alone does not prove every server-side denial.

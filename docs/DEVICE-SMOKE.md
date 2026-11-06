# One-minute debug-device smoke check

Run on the owner's actual Android 9 / API 28 phone **after every APK install**, before listener/capture/transport testing. No cloud account is needed. This is a checklist, not evidence of a device run here.

1. **Install the intended build.** Record source commit, APK SHA-256, package version and device API/build. Keep capture paused; do not open real conversations. Stop if install fails.
2. **Launch from the launcher.** Wait five seconds. Confirm the status screen stays open and responsive, with access/low-RAM booleans and queue/gap counts. Crash, close, blank screen or unexpected repair prompt means investigate before continuing. This catches the earlier SQLiteOpenHelper.use launch crash.
3. **Background and reopen.** Press Home and reopen once. Confirm usability and consistent counts.
4. **Check status safely.** Open Notification access settings; return without changing permission. App and system must agree. Ungranted access is a valid smoke result, never a capture pass.
5. **Record PASS/FAIL.** This proves only installation, launch, reopen and permission-status screen usability. It does not verify capture, Keystore, SQLite durability, transport, backups or delivery.

**Repair branch, outside the normal minute:** If legacy/key repair appears, record the fixed code only. Cancel reset once and confirm data remains blocked. Reset only after deciding that untransferred data may be lost. Reset deletes queue, encrypted pairing/batch state and keys; capture pauses and re-pairing is required. Reopen and check queue zero/capture paused. Interrupted reset must remain blocked until retried. Never record complete collection from an empty queue.

Do not automate access grants or copy general logcat, titles/group keys, messages, exports or screenshots. Inspect diagnostics locally and report only a fatal-exception boolean and fixed error class/code; stack traces can contain private values.

## Sanitized record

```text
source_commit=<build string>
apk_sha256=<APK hash, never a message hash>
version=<build string>
device_model=<model>
android_api=<integer>
device_build=<build string>
install_ok=<true|false>
launch_stays_open=<true|false>
reopen_ok=<true|false>
notification_access=<true|false>
low_ram=<true|false>
queue_count=<integer|unavailable>
observed_gap_count=<integer|unavailable>
repair_required=<true|false>
repair_code=<fixed code|none>
owner_reset_performed=<true|false>
fatal_exception_observed=<true|false>
smoke_result=<PASS|FAIL>
capture=unverified
transport=unverified
key_loss_recovery=unverified
backup_exclusion=unverified
```

After smoke passes, run the [actual-device capture matrix](14-ANDROID-COMPANION.md#required-actual-device-matrix) using an owner-controlled synthetic conversation: grant/revoke, selected/unselected/ambiguous mapping, bundles/updates, muted/hidden previews, lock/battery saver, kill/reboot/force-stop, Linux-off queue, interrupted receipt, capacity/expiry/key loss, backup/log sinks and mobile-data transfer. Record each case separately. No device, emulator, real peer or account was tested by the cloud agent here.

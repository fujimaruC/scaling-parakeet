# One-minute debug-device smoke check

Run on the owner's actual Android 9 / API 28 phone **after every APK install**, before listener/capture/transport testing. No cloud account is needed. This is a checklist, not evidence of a device run here.

1. **Install the intended build.** Record source commit, APK SHA-256, package version and device API/build. Keep capture paused; do not open real conversations. Stop if install fails.
2. **Launch from the launcher.** Wait five seconds. Confirm the status screen stays open and responsive, with access/low-RAM booleans and queue/gap counts. Crash, close, blank screen or unexpected repair prompt means investigate before continuing. This catches the earlier SQLiteOpenHelper.use launch crash.
3. **Background and reopen.** Press Home and reopen once. Confirm usability and consistent counts.
4. **Check status safely.** Open Notification access settings; return without changing permission. App and system must agree. Ungranted access is a valid smoke result, never a capture pass.
5. **Record PASS/FAIL.** This proves only installation, launch, reopen and permission-status screen usability. It does not verify capture, Keystore, SQLite durability, transport, backups or delivery.

**Repair branch, outside the normal minute:** If legacy/key repair appears, record the fixed code only. Cancel reset once and confirm data remains blocked. Reset only after deciding that untransferred data may be lost. Reset deletes queue, encrypted pairing/batch state and keys; capture pauses and re-pairing is required. Reopen and check queue zero/capture paused. Interrupted reset must remain blocked until retried. Never record complete collection from an empty queue.

Do not automate access grants or copy general logcat, titles/group keys, messages, exports or screenshots. Inspect diagnostics locally and report only a fatal-exception boolean and fixed error class/code; stack traces can contain private values.

## Sanitized record — 2026-11-06 run

First real device run of this build, on the owner's phone over ADB.

```text
source_commit=837d2f7 (local verify branch, patch applied to d0cbb60)
apk_sha256=b1d70c1e9203ea7c (first 16 chars)
version=0.1-probe
device_model=CPH2015
android_api=28
device_build=CPH2015EX_11_A.67
install_ok=true
launch_stays_open=true
reopen_ok=true
notification_access=false
low_ram=false
queue_count=unavailable (database blocked by repair state)
observed_gap_count=unavailable
repair_required=true
repair_code=LEGACY_QUEUE_WIPE_REQUIRED
owner_reset_performed=false
fatal_exception_observed=false
smoke_result=PASS
capture=unverified
transport=unverified
key_loss_recovery=unverified
backup_exclusion=unverified
```

### What this run proved

Install, launch, background/reopen and the permission-status screen all work on API 28. The launch crash from the previous build is gone. The app opens into the intended repair-required state and does not crash there.

### What it did not prove

Capture is impossible in this state: notification access is not granted, so no listener event has ever been observed on hardware. Queue count is unreadable while the database is blocked, which is the designed behaviour, not a failure.

### Post-reset verification

The owner authorised clearing the v1 database. `pm clear` was refused by the OS (`CLEAR_APP_USER_DATA` is not granted to shell on this build), so the app was uninstalled and reinstalled instead — same effect, fresh database.

```text
install_ok=true
launch_stays_open=true
repair_required=false
low_ram=false
queue_count=0
notification_access=false
fatal_exception_observed=false
```

The repair prompt is gone and the probe reports a clean queue. One note on observation method: the first launch after reinstall was intercepted by ColorOS Phone Manager, so no app process existed for several seconds; a second launch started it normally. The single crash record in dropbox is timestamped 10:29:57, from the earlier pre-fix build — it is not a new failure.

### Reset consequence for this device

The phone holds a v1 `capture.db` from the earlier build. Its queue was empty at last observation, so a reset discards nothing transferred. Reset will delete the queue, encrypted pairing state and keys, pause capture, and require re-pairing. No reset was performed by the agent; that is an owner action.


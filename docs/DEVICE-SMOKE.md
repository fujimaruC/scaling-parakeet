# One-minute debug-device smoke check

Run on the owner's actual Android 9 / API 28 phone **after every APK install**, before listener/capture/transport testing. No cloud account is needed. This is a checklist, not evidence of a device run here.

1. **Install the intended build.** Record source commit, APK SHA-256, package version and device API/build. Keep capture paused; do not open real conversations. Stop if install fails.
2. **Launch from the launcher.** Wait five seconds. Confirm the status screen stays open and responsive, with access/low-RAM booleans and queue/gap counts. Crash, close, blank screen or unexpected repair prompt means investigate before continuing. This catches the earlier SQLiteOpenHelper.use launch crash.
3. **Background and reopen.** Press Home and reopen once. Confirm usability and consistent counts.
4. **Check status safely.** Open Notification access settings; return without changing permission. App and system must agree. Ungranted access is a valid smoke result, never a capture pass.
5. **Record PASS/FAIL.** This proves only installation, launch, reopen and permission-status screen usability. It does not verify capture, Keystore, SQLite durability, transport, backups or delivery.

**Repair branch, outside the normal minute:** If legacy/key repair appears, record the fixed code only. Cancel reset once and confirm data remains blocked. Reset only after deciding that untransferred data may be lost. Reset deletes queue, encrypted pairing/batch state and keys; capture pauses and re-pairing is required. Reopen and check queue zero/capture paused. Interrupted reset must remain blocked until retried. Never record complete collection from an empty queue.

Do not automate access grants or copy general logcat, titles/group keys, messages, exports or screenshots. Inspect diagnostics locally and report only a fatal-exception boolean and fixed error class/code; stack traces can contain private values.

## Automated evidence run — 2026-11-06 (build 4fde0c1)

Produced by `scripts/device_evidence.py --samples 1` against the owner's CPH2015 over ADB. Every field is either an observed value or an explicit null listed under `unavailable`; the tool hard-codes `smoke_result: unverified`.

```json
{"android_api": 28, "device_model": "CPH2015", "device_build": "CPH2015EX_11_A.67",
 "version": "0.1-probe", "launch_stays_open": true, "reopen_ok": true,
 "low_ram": false, "notification_access": false, "queue_count": 0,
 "observed_gap_count": 0, "repair_required": false,
 "fatal_exception_observed": null, "install_ok": null, "apk_sha256": null,
 "source_commit": null, "repair_code": null, "owner_reset_performed": null,
 "smoke_result": "unverified", "capture": "not_run", "transport": "not_run",
 "key_loss_recovery": "not_run", "backup_exclusion": "not_run"}
```

### Tool defect found and fixed during this run

The first run reported `reopen_ok: false` on a working app. Cause: `am start` on an already-running task only raises the window and delivers no new intent, so `onResume` re-renders with the *original* intent and no fresh evidence token is logged. The tool required a new token and therefore reported a false negative.

Controlled test: plain `am start` on a live task emitted **0** tokens; `am start -S` emitted **2**.

Two fixes: force-stop before sample 1 so the first launch is genuinely cold, and for sample 2 accept process-alive plus resumed-activity instead of demanding a fresh token. Both samples now report true.

`fatal_exception_observed`, `install_ok`, `apk_sha256` and `source_commit` remain unchecked nulls. They are checkable but not yet implemented — do not read them as passing.

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


## Local sanitized collection command

On the owner's Linux machine with the intended phone selected in adb, run:

```bash
python scripts/device_evidence.py --samples 1
```

For a matrix session use `--samples 120` (bounded samples about 16 seconds apart, including each probe). The command launches, backgrounds and relaunches the app, using a fresh random token for each launch. Only matching `AOS-EVIDENCE` JSON emissions are projected; old log lines cannot prove a reopen. Output is one JSON record per sample: booleans, counts, bounded build strings, UUID run token, and an explicit unavailable-field list. No raw adb/logcat response is printed or saved. Do not run repeated launch probes during a lifecycle case where relaunching would alter the experiment; collect before/after instead.

The probe observes permission/low-RAM/queue/gap/repair status directly and checks process presence after launch. It does not inspect private notifications, infer install success from package presence, claim no crash from silence, or infer filtering/transport from a count. Source commit/APK hash and fatal-exception inspection are unavailable to this command. `smoke_result` stays unverified; capture, transport, key-loss and backup cases stay not_run. It emits observations, not a fabricated matrix verdict. The owner must still evaluate the matrix's expected behavior; those cases cannot be automatically certified without actually exercising them. Actual adb/device execution of the new command is unverified here.

## Complete evidence probe and sealed matrix journal (43ddeea follow-up)

Capture has **never run on hardware**. The historical access value is false. Nothing in this tooling certifies listener delivery/filtering/transport. If the owner has now granted access, prioritize the actual matrix instead of treating these synthetic checks as device proof.

Build in an isolated clean checkout, using the owner's existing signing identity. Then, on the owner's Linux machine with the intended single adb device selected:

```bash
.venv/bin/python scripts/device_evidence.py --apk /absolute/path/app-debug.apk
.venv/bin/python scripts/capture_matrix.py --apk /absolute/path/app-debug.apk --output /absolute/private/new-matrix-directory
.venv/bin/python scripts/capture_matrix.py --output /absolute/private/new-matrix-directory --verify
```

The output directory must be new and outside the repository. The harness prompts through the fixed cases: begin, perform the synthetic case by hand, finish. It accepts no typed PASS labels. It records per-case before/after permission/artifact observations and a continuous crash window. Only an actual grant/revoke transition with unchanged observed APK and a complete crash-free window is mechanically certifiable as PASS. Other cases remain UNVERIFIED, including selected/unselected filtering and transport: counts and manual Enter cannot prove these. Their execution intervals are recorded for owner review; skipped, interrupted and unsupported checks cannot become passes.

The journal is fsync'd and HMAC-chained with an explicit final seal. Editing/reordering/truncating records or finishing without a begin fails verification. Results are derived during verification, not accepted from editable result labels. Keep local-verification.key private on Linux; do not upload/archive that key. This protects against accidental after-the-fact edits, not a malicious owner/root who can change the tool or access its key. Absolute tamper prevention on an owner-controlled host would require an independent trusted signer/storage, which is outside this private/offline scope. No new dependency was added.

### Meaning of the four formerly-null fields

- `install_ok`: populated only when --apk actually invokes adb install; success requires exit zero, an explicit Success response and a matching installed readback. Failures are not inferred from merely issuing a command. With no install or unavailable readback it stays null.
- `apk_sha256`: SHA-256 of the **installed APK pulled back from pm path**, stable at both ends of the sample. It is an artifact hash, never a message hash. Split packages, changed installs, denied pull or ambiguous paths produce null. An unchanged local build file alone cannot satisfy this.
- `source_commit`: build-declared full revision inside the installed APK asset academic-os-build.json, stamped only from a clean Git checkout. Dirty/no-Git/older APKs remain null. This identifies declared provenance, not an independent reproducible-build/signature attestation. Do not edit source concurrently with a build or trust an APK from an untrusted producer. No current-checkout guess is used by the probe.
- `fatal_exception_observed`: a live, token-bounded logcat stream from before install/start through the end marker. Earlier crashes outside the interval and other identified packages cannot satisfy it. Java fatal PID/package correlation and native fatal evidence are projected into a boolean; raw lines/stack traces never leave memory or enter the journal. No tail-length cap hides early crashes. Missing markers, stream loss, drops, stderr diagnostics or ambiguous fatal attribution produce null, never false. False means no target fatal observed in that complete logging window, not a guarantee that every vendor failure is logged.

Cold start requires a successful force-stop and observed process absence before launch. Warm resume requires the actual resumed-activity field and the same cold-run process or a fresh probe token; an activity mentioned in history cannot satisfy it. Bounded retries accommodate ColorOS's first-launch interception. Uncertain launch observations stay null. install/fatal status is not cached across samples. The app may be force-stopped/relaunched by the standalone smoke probe; the matrix uses passive per-case observations so it does not restart the phone mid-lifecycle case. Scope journal crash windows to the cases actually run, and inspect unavailable values before drawing conclusions. Overall smoke_result remains unverified; the tool does not claim the entire matrix passed.

Device selection is pinned with adb -s for the process lifetime; the serial is kept only in memory and never emitted. Boot identity is checked around lifecycle observations, also only in memory. Missing identity aborts matrix collection; changed/unknown boot identity leaves lifecycle fields null. A disconnected/replaced default adb target cannot silently satisfy a warm-resume check.
